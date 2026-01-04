import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, chats, messages, usageRecords } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { checkRateLimit } from "@/lib/ratelimit";
import { anthropic } from "@/lib/anthropic";
import { AGENT_TOOLS } from "@/lib/agent/tools";
import {
  AGENT_SYSTEM_PROMPT,
  AGENT_MAX_TOKENS,
} from "@/lib/agent/system-prompt";
import { agentChatRequestSchema, DEFAULT_AGENT_MODEL, type ToolName, sanitizeForLog } from "@prophet/shared";
import { error } from "@/types";
import { logger } from "@/lib/logger";
import { calculateCostInCents, type ModelName } from "@/lib/pricing";
import { devLogger } from "@/lib/dev-logger";
import type {
  MessageParam,
  ContentBlockParam,
} from "@anthropic-ai/sdk/resources/messages";

export async function POST(req: Request) {
  try {
    const auth_ = await auth();
    const userId = auth_.userId;
    if (!userId) {
      return NextResponse.json(error("Unauthorized", "UNAUTHORIZED"), {
        status: 401,
      });
    }

    const rateLimitResult = await checkRateLimit(userId, "chat");
    if (!rateLimitResult.success) {
      logger.warn(
        { userId, remaining: rateLimitResult.remaining },
        "Rate limit exceeded for agent chat"
      );
      return NextResponse.json(
        error(
          "Too many requests. Please try again later.",
          "RATE_LIMIT_EXCEEDED"
        ),
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit?.toString() || "",
            "X-RateLimit-Remaining":
              rateLimitResult.remaining?.toString() || "",
            "X-RateLimit-Reset": rateLimitResult.reset?.toString() || "",
          },
        }
      );
    }

    const body = await req.json();
    const validation = agentChatRequestSchema.safeParse(body);

    if (!validation.success) {
      logger.error(
        {
          userId,
          errors: validation.error.format(),
          body: sanitizeForLog(body)
        },
        "Validation failed for agent chat request"
      );
      return NextResponse.json(
        error("Invalid request body", "VALIDATION_ERROR", validation.error.issues),
        { status: 400 }
      );
    }

    const { chatId, userMessage, toolResults, previousContent, image, enableThinking } =
      validation.data;
    const model = (validation.data.model ?? DEFAULT_AGENT_MODEL) as ModelName;

    const [chat, user] = await Promise.all([
      db.query.chats.findFirst({
        where: eq(chats.id, chatId),
      }),
      db.query.users.findFirst({
        where: eq(users.id, userId),
      }),
    ]);

    if (!chat) {
      return NextResponse.json(error("Chat not found", "CHAT_NOT_FOUND"), {
        status: 404,
      });
    }

    if (chat.userId !== userId) {
      return NextResponse.json(error("Forbidden", "FORBIDDEN"), {
        status: 403,
      });
    }

    if (!user) {
      return NextResponse.json(error("User not found", "USER_NOT_FOUND"), {
        status: 404,
      });
    }

    if (user.creditsRemaining < 10) {
      logger.warn(
        { userId, creditsRemaining: user.creditsRemaining },
        "Insufficient balance for agent chat"
      );
      return NextResponse.json(
        error(
          "Insufficient balance. Please upgrade your plan.",
          "INSUFFICIENT_BALANCE",
          { pricingUrl: "/pricing" }
        ),
        { status: 402 }
      );
    }

    const chatMessages = await db.query.messages.findMany({
      where: eq(messages.chatId, chatId),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    });

    const anthropicMessages: MessageParam[] = chatMessages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    if (userMessage) {
      if (image) {
        anthropicMessages.push({
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mediaType,
                data: image.base64,
              },
            },
            {
              type: "text",
              text: userMessage,
            },
          ],
        });
      } else {
        anthropicMessages.push({
          role: "user",
          content: userMessage,
        });
      }
    } else if (toolResults && previousContent) {
      anthropicMessages.push({
        role: "assistant",
        content: previousContent as ContentBlockParam[],
      });
      anthropicMessages.push({
        role: "user",
        content: toolResults.map((tr) => ({
          type: "tool_result" as const,
          tool_use_id: tr.tool_use_id,
          content: tr.content,
          is_error: tr.is_error,
        })),
      });
    } else {
      return NextResponse.json(
        error(
          "Either userMessage or toolResults is required",
          "VALIDATION_ERROR"
        ),
        { status: 400 }
      );
    }

    logger.debug(
      {
        userId,
        chatId,
        model,
        messageCount: anthropicMessages.length,
        hasToolResults: !!toolResults,
      },
      "Starting agent stream"
    );

    // DEV LOGGING: Log request to LLM
    await devLogger.logRequest(model, anthropicMessages, AGENT_SYSTEM_PROMPT, { enableThinking });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullTextResponse = "";
        let inputTokens = 0;
        let outputTokens = 0;
        const contentBlocks: ContentBlockParam[] = [];

        try {
          const anthropicStream = await anthropic.messages.stream({
            model,
            max_tokens: enableThinking ? 16000 : AGENT_MAX_TOKENS,
            system: [
              {
                type: "text",
                text: AGENT_SYSTEM_PROMPT,
                cache_control: { type: "ephemeral" },
              },
            ],
            tools: AGENT_TOOLS,
            messages: anthropicMessages,
            ...(enableThinking && {
              thinking: {
                type: "enabled",
                budget_tokens: 8000,
              },
            }),
          });

          let currentToolUse: {
            id: string;
            name: string;
            input: string;
          } | null = null;

          // Send session_created at the start
          const sessionData = JSON.stringify({
            type: "session_created",
            sessionId: chatId,
          });
          controller.enqueue(encoder.encode(`data: ${sessionData}\n\n`));

          for await (const event of anthropicStream) {
            if (event.type === "message_start") {
              inputTokens = event.message.usage.input_tokens;
            } else if (event.type === "content_block_start") {
              if (event.content_block.type === "tool_use") {
                currentToolUse = {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  input: "",
                };
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                const text = event.delta.text;
                fullTextResponse += text;
                const data = JSON.stringify({
                  type: "content_delta",
                  delta: text,
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              } else if (event.delta.type === "thinking_delta") {
                const data = JSON.stringify({
                  type: "thinking_delta",
                  delta: event.delta.thinking,
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              } else if (
                event.delta.type === "input_json_delta" &&
                currentToolUse
              ) {
                currentToolUse.input += event.delta.partial_json;
              }
            } else if (event.type === "content_block_stop") {
              if (currentToolUse) {
                let parsedInput = {};
                try {
                  // Robust parsing: handle potential hallucinations or malformed JSON
                  const rawInput = currentToolUse.input.trim();
                  parsedInput = rawInput ? JSON.parse(rawInput) : {};
                } catch (e) {
                  logger.warn(
                    {
                      toolUseId: currentToolUse.id,
                      input: currentToolUse.input,
                      error: e instanceof Error ? e.message : String(e),
                    },
                    "Failed to parse tool input, using empty object"
                  );
                }

                contentBlocks.push({
                  type: "tool_use",
                  id: currentToolUse.id,
                  name: currentToolUse.name as ToolName,
                  input: parsedInput,
                });

                const data = JSON.stringify({
                  type: "tool_use",
                  toolUse: {
                    type: "tool_use",
                    id: currentToolUse.id,
                    name: currentToolUse.name,
                    input: parsedInput,
                  },
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                currentToolUse = null;
              } else if (fullTextResponse) {
                contentBlocks.push({
                  type: "text",
                  text: fullTextResponse,
                });
              }
            } else if (event.type === "message_delta") {
              if (event.usage) {
                outputTokens = event.usage.output_tokens;
                const metricsData = JSON.stringify({
                  type: "metrics_update",
                  metrics: {
                    inputTokens,
                    outputTokens,
                    costCents: calculateCostInCents(model, inputTokens, outputTokens),
                  },
                });
                controller.enqueue(encoder.encode(`data: ${metricsData}\n\n`));
              }
            }
          }

          const finalMessage = await anthropicStream.finalMessage();
          const stopReason = finalMessage.stop_reason;

          const costCents = calculateCostInCents(
            model,
            inputTokens,
            outputTokens
          );

          // Save messages to DB
          if (userMessage) {
            await db.insert(messages).values({
              chatId,
              role: "user",
              content: userMessage,
              model: null,
              inputTokens: 0,
              outputTokens: 0,
              costCents: 0,
            });
          }

          // Save assistant message with tool calls if any
          // Only save if there's actual content (text or tool calls)
          const assistantToolCalls = contentBlocks.filter(b => b.type === "tool_use");
          const hasContent = fullTextResponse.trim().length > 0 || assistantToolCalls.length > 0;

          const MAX_CONTEXT_TOKENS = 200000;
          await db.transaction(async (tx) => {
            // Only save assistant message if it has meaningful content
            if (hasContent) {
              await tx.insert(messages).values({
                chatId,
                role: "assistant",
                content: fullTextResponse,
                model,
                inputTokens,
                outputTokens,
                costCents,
                toolCalls: assistantToolCalls.length > 0 ? JSON.stringify(assistantToolCalls) : null,
              });
            }

            await tx
              .update(users)
              .set({
                creditsRemaining: sql`${users.creditsRemaining} - ${costCents}`,
                updatedAt: new Date(),
              })
              .where(eq(users.id, userId));

            await tx.insert(usageRecords).values({
              userId,
              inputTokens,
              outputTokens,
              costCents,
              model,
            });

            const newContextTokens = Math.min(inputTokens + outputTokens, MAX_CONTEXT_TOKENS);
            await tx
              .update(chats)
              .set({
                contextTokens: newContextTokens,
                contextInputTokens: inputTokens,
                contextOutputTokens: outputTokens,
                updatedAt: new Date(),
              })
              .where(eq(chats.id, chatId));
          });

          logger.info(
            {
              userId,
              chatId,
              model,
              costCents,
              inputTokens,
              outputTokens,
              stopReason,
            },
            "Agent stream completed"
          );

          // DEV LOGGING: Log response from LLM
          await devLogger.logResponse(fullTextResponse, { input_tokens: inputTokens, output_tokens: outputTokens });

          const executionCompleteData = JSON.stringify({
            type: "execution_complete",
            finalOutput: fullTextResponse,
            metrics: {
              inputTokens,
              outputTokens,
              costCents,
            },
          });
          controller.enqueue(encoder.encode(`data: ${executionCompleteData}\n\n`));

          const doneData = JSON.stringify({
            type: "done",
            stopReason,
            usage: {
              inputTokens,
              outputTokens,
              costCents,
            },
            contentBlocks,
          });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));

          controller.close();
        } catch (err) {
          logger.error(
            {
              error: err instanceof Error ? err.message : String(err),
              userId,
              chatId,
            },
            "Agent streaming error"
          );

          const errorData = JSON.stringify({
            type: "error",
            error: err instanceof Error ? err.message : "Streaming failed",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));

          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    logger.error(
      { error: err instanceof Error ? err.message : String(err) },
      "Agent chat endpoint error"
    );
    return NextResponse.json(
      error("Internal server error", "INTERNAL_ERROR", err),
      { status: 500 }
    );
  }
}

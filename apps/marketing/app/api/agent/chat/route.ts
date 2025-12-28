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
import { agentChatRequestSchema, DEFAULT_AGENT_MODEL } from "@prophet/shared";
import { error } from "@/types";
import { logger } from "@/lib/logger";
import { calculateCostInCents, type ModelName } from "@/lib/pricing";
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
      return NextResponse.json(
        error(
          "Invalid request body",
          "VALIDATION_ERROR",
          validation.error.issues
        ),
        { status: 400 }
      );
    }

    const { chatId, userMessage, toolResults, previousContent } =
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
        "Insufficient credits for agent chat"
      );
      return NextResponse.json(
        error(
          "Insufficient credits. Please upgrade your plan.",
          "INSUFFICIENT_CREDITS"
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
      anthropicMessages.push({
        role: "user",
        content: userMessage,
      });
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
            max_tokens: AGENT_MAX_TOKENS,
            system: AGENT_SYSTEM_PROMPT,
            tools: AGENT_TOOLS,
            messages: anthropicMessages,
          });

          let currentToolUse: {
            id: string;
            name: string;
            input: string;
          } | null = null;

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
                const data = JSON.stringify({
                  type: "tool_use_start",
                  id: event.content_block.id,
                  name: event.content_block.name,
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                const text = event.delta.text;
                fullTextResponse += text;
                const data = JSON.stringify({
                  type: "content_delta",
                  content: text,
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
                  parsedInput = currentToolUse.input
                    ? JSON.parse(currentToolUse.input)
                    : {};
                } catch {
                  logger.warn(
                    {
                      toolUseId: currentToolUse.id,
                      input: currentToolUse.input,
                    },
                    "Failed to parse tool input"
                  );
                }

                contentBlocks.push({
                  type: "tool_use",
                  id: currentToolUse.id,
                  name: currentToolUse.name,
                  input: parsedInput,
                });

                const data = JSON.stringify({
                  type: "tool_use",
                  id: currentToolUse.id,
                  name: currentToolUse.name,
                  input: parsedInput,
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

          if (stopReason === "end_turn" && fullTextResponse) {
            await db.transaction(async (tx) => {
              await tx.insert(messages).values({
                chatId,
                role: "assistant",
                content: fullTextResponse,
                model,
                inputTokens,
                outputTokens,
                costCents,
              });

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

              await tx
                .update(chats)
                .set({
                  updatedAt: new Date(),
                })
                .where(eq(chats.id, chatId));
            });
          } else if (stopReason === "tool_use") {
            await db.transaction(async (tx) => {
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
            });
          }

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

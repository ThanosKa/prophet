import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, chats, messages, usageRecords } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { checkRateLimit } from "@/lib/ratelimit";
import { anthropic } from "@/lib/anthropic";
import { AGENT_TOOLS } from "@/lib/agent/tools";
import { AGENT_SYSTEM_PROMPT } from "@/lib/agent/system-prompt";
import {
  buildAgentTools,
  buildOutputConfig,
  buildThinkingConfig,
  getAgentMaxTokens,
  shouldUseWebSearch,
  toEchoableContent,
} from "@/lib/agent/web-search";
import {
  agentChatRequestSchema,
  DEFAULT_AGENT_MODEL,
  resolveAgentModel,
  sanitizeForLog,
} from "@prophet/shared";
import { error } from "@/types";
import { logger } from "@/lib/logger";
import {
  calculateCostInCents,
  calculateWebSearchCostInCredits,
  type ModelName,
} from "@/lib/pricing";
import { devLogger } from "@/lib/dev-logger";
import type {
  MessageParam,
  ContentBlockParam,
  ContentBlock,
} from "@anthropic-ai/sdk/resources/messages";

function extractCitations(blocks: ContentBlock[]) {
  const seen = new Set<string>();
  const citations: Array<{ url: string; title: string; citedText: string }> = [];

  for (const block of blocks) {
    if (block.type !== "text" || !block.citations) continue;
    for (const citation of block.citations) {
      if (citation.type !== "web_search_result_location") continue;
      if (seen.has(citation.url)) continue;
      seen.add(citation.url);
      citations.push({
        url: citation.url,
        title: citation.title ?? citation.url,
        citedText: citation.cited_text,
      });
    }
  }

  return citations;
}

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
            "Retry-After": String(Math.ceil((rateLimitResult.reset! - Date.now()) / 1000)),
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

    const {
      chatId,
      userMessage,
      toolResults,
      previousContent,
      image,
      enableThinking,
      enableWebSearch,
    } = validation.data;
    // Installed extensions still send pre-Claude-5 model IDs; everything after this
    // point — the API call, pricing, credit deduction, usage rows — uses the
    // resolved model so cost always matches the model actually invoked.
    const requestedModel = validation.data.model ?? DEFAULT_AGENT_MODEL;
    const model = resolveAgentModel(requestedModel) as ModelName;
    const webSearchEnabled = shouldUseWebSearch(enableWebSearch);

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

    // Build Anthropic messages based on request type
    // IMPORTANT: For continuation turns (toolResults), we DON'T load from DB.
    // The client manages conversation state during the agentic loop.
    // This prevents duplicate assistant messages in the history.
    let anthropicMessages: MessageParam[];
    const isFirstTurn = !!userMessage;
    // A `pause_turn` resume sends previousContent with no tool results — the
    // assistant turn is replayed on its own so the server tool can finish.
    const isContinuationTurn = !!(previousContent && previousContent.length > 0);

    if (isFirstTurn) {
      // First turn: Load existing conversation from DB + append new user message
      const chatMessages = await db.query.messages.findMany({
        where: eq(messages.chatId, chatId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      });

      anthropicMessages = chatMessages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

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
    } else if (isContinuationTurn) {
      // Continuation turn: DON'T load from DB - use client-provided state only.
      // This prevents the bug where we'd have [user, assistant (from DB), assistant (from client)]
      // Instead, the client sends the accumulated previousContent which already has the full context.

      // Load ONLY the original user message from this conversation (before agentic loop)
      const chatMessages = await db.query.messages.findMany({
        where: eq(messages.chatId, chatId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      });

      // Only include messages up to the last USER message (the one that started this loop)
      // Skip any assistant messages that were saved during intermediate turns
      const baseMessages: MessageParam[] = [];
      for (const msg of chatMessages) {
        baseMessages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
      // Remove the last assistant message if it exists (it's duplicated in previousContent)
      if (baseMessages.length > 0 && baseMessages[baseMessages.length - 1].role === "assistant") {
        baseMessages.pop();
      }

      anthropicMessages = baseMessages;

      // Append the current turn's context from client
      anthropicMessages.push({
        role: "assistant",
        content: previousContent as ContentBlockParam[],
      });
      if (toolResults && toolResults.length > 0) {
        anthropicMessages.push({
          role: "user",
          content: toolResults.map((tr) => ({
            type: "tool_result" as const,
            tool_use_id: tr.tool_use_id,
            content: tr.content,
            is_error: tr.is_error,
          })),
        });
      }
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
        requestedModel,
        modelAliased: requestedModel !== model,
        webSearchEnabled,
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

        try {
          const thinkingConfig = buildThinkingConfig(model, enableThinking);
          const outputConfig = buildOutputConfig({ model, enableThinking });

          const anthropicStream = await anthropic.messages.stream({
            model,
            max_tokens: getAgentMaxTokens({ model, enableThinking }),
            system: [
              {
                type: "text",
                text: AGENT_SYSTEM_PROMPT,
                cache_control: { type: "ephemeral" },
              },
            ],
            tools: buildAgentTools(AGENT_TOOLS, webSearchEnabled),
            messages: anthropicMessages,
            ...(thinkingConfig && { thinking: thinkingConfig }),
            ...(outputConfig && { output_config: outputConfig }),
          });

          let currentToolUse: {
            id: string;
            name: string;
            input: string;
            isServerTool: boolean;
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
                  isServerTool: false,
                };
              } else if (event.content_block.type === "server_tool_use") {
                currentToolUse = {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  input: "",
                  isServerTool: true,
                };
              } else if (
                event.content_block.type === "web_search_tool_result"
              ) {
                const result = event.content_block;
                const payload = Array.isArray(result.content)
                  ? {
                      type: "web_search_results",
                      toolUseId: result.tool_use_id,
                      sources: result.content.map((r) => ({
                        url: r.url,
                        title: r.title,
                        pageAge: r.page_age ?? null,
                      })),
                    }
                  : {
                      type: "web_search_error",
                      toolUseId: result.tool_use_id,
                      errorCode: result.content.error_code,
                    };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
                );
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

                if (currentToolUse.isServerTool) {
                  // Anthropic runs this one; the client must never try to execute it.
                  const searchData = JSON.stringify({
                    type: "web_search_start",
                    toolUseId: currentToolUse.id,
                    query:
                      (parsedInput as { query?: string }).query ?? "",
                  });
                  controller.enqueue(
                    encoder.encode(`data: ${searchData}\n\n`)
                  );
                } else {
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
                }
                currentToolUse = null;
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
          const cacheReadTokens = finalMessage.usage.cache_read_input_tokens || 0;
          const cacheCreationTokens = finalMessage.usage.cache_creation_input_tokens || 0;
          const webSearchRequests =
            finalMessage.usage.server_tool_use?.web_search_requests ?? 0;

          // The API's own blocks are authoritative for replay: they carry the
          // encrypted web-search payloads that must round-trip untouched.
          const contentBlocks = toEchoableContent(finalMessage.content);
          const citations = extractCitations(finalMessage.content);

          const costCents = calculateCostInCents(
            model,
            inputTokens,
            outputTokens,
            webSearchRequests
          );
          const webSearchCostCents =
            calculateWebSearchCostInCredits(webSearchRequests);

          // `pause_turn` means Anthropic stopped a long server-tool turn early and
          // the client has to replay the assistant turn, so it is not final either.
          const isFinalTurn =
            stopReason !== "tool_use" && stopReason !== "pause_turn";

          // Save messages to DB only on appropriate turns:
          // - User message: Save on first turn only
          // - Assistant message: Save on FINAL turn only (prevents duplicate assistant messages)
          // - Credits/usage: Always track (for billing accuracy)
          if (isFirstTurn && userMessage) {
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

          const assistantToolCalls = contentBlocks.filter(b => b.type === "tool_use");
          const hasContent = fullTextResponse.trim().length > 0 || assistantToolCalls.length > 0;

          const MAX_CONTEXT_TOKENS = 200000;
          await db.transaction(async (tx) => {
            // Only save assistant message on FINAL turn to prevent duplicate messages
            // During intermediate turns, the client manages conversation state
            if (isFinalTurn && hasContent) {
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

            // Always deduct credits (even on intermediate turns) for accurate billing
            await tx
              .update(users)
              .set({
                creditsRemaining: sql`${users.creditsRemaining} - ${costCents}`,
                updatedAt: new Date(),
              })
              .where(eq(users.id, userId));

            // Always record usage for billing audit trail
            await tx.insert(usageRecords).values({
              userId,
              inputTokens,
              outputTokens,
              costCents,
              model,
            });

            // Update context tokens on final turn only
            if (isFinalTurn) {
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
            }
          });

          logger.info(
            {
              userId,
              chatId,
              model,
              costCents,
              inputTokens,
              outputTokens,
              cacheReadTokens,
              cacheCreationTokens,
              webSearchRequests,
              webSearchCostCents,
              stopReason,
            },
            "Agent stream completed"
          );

          // DEV LOGGING: Log response from LLM
          await devLogger.logResponse(fullTextResponse, {
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cache_read_input_tokens: cacheReadTokens,
            cache_creation_input_tokens: cacheCreationTokens,
          });

          if (citations.length > 0) {
            const citationsData = JSON.stringify({
              type: "citations",
              citations,
            });
            controller.enqueue(encoder.encode(`data: ${citationsData}\n\n`));
          }

          const executionCompleteData = JSON.stringify({
            type: "execution_complete",
            stopReason,
            finalOutput: fullTextResponse,
            metrics: {
              inputTokens,
              outputTokens,
              costCents,
              webSearchRequests,
              webSearchCostCents,
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
              webSearchRequests,
              webSearchCostCents,
            },
            citations,
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

          // Parse error to provide user-friendly messages
          let userFriendlyError = "Something went wrong. Please try again.";
          let errorCode: string | undefined;
          let errorDetails: Record<string, unknown> | undefined;

          if (err instanceof Error) {
            const errMessage = err.message;

            // Handle Anthropic rate limit errors (429)
            if (errMessage.includes("rate_limit_error") || errMessage.startsWith("429")) {
              userFriendlyError = "AI service is temporarily busy. Please wait a moment and try again.";
              errorCode = "ANTHROPIC_RATE_LIMIT";
              // Try to extract retry info from error
              const retryMatch = errMessage.match(/try again later/i);
              if (retryMatch) {
                errorDetails = { retryAfter: 60 };
              }
            }
            // Handle Anthropic overloaded errors (529)
            else if (errMessage.includes("overloaded") || errMessage.startsWith("529")) {
              userFriendlyError = "AI service is experiencing high demand. Please try again in a few minutes.";
              errorCode = "ANTHROPIC_OVERLOADED";
            }
            // Handle authentication errors
            else if (errMessage.includes("authentication") || errMessage.includes("api_key")) {
              userFriendlyError = "Service configuration error. Please contact support.";
              errorCode = "ANTHROPIC_AUTH_ERROR";
            }
            // Handle invalid request errors
            else if (errMessage.includes("invalid_request")) {
              userFriendlyError = "Invalid request. Please try a different message.";
              errorCode = "ANTHROPIC_INVALID_REQUEST";
            }
            // For other errors, use a generic message (don't expose raw error to user)
            else {
              userFriendlyError = "Something went wrong. Please try again.";
              errorCode = "STREAMING_ERROR";
            }
          }

          const errorData = JSON.stringify({
            type: "error",
            error: userFriendlyError,
            code: errorCode,
            details: errorDetails,
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

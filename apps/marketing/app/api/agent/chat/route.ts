import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, chats, messages, usageRecords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/ratelimit";
import { anthropic } from "@/lib/anthropic";
import { AGENT_TOOLS } from "@/lib/agent/tools";
import { AGENT_SYSTEM_PROMPT } from "@/lib/agent/system-prompt";
import {
  buildAgentTools,
  buildOutputConfig,
  buildThinkingConfig,
  getAgentMaxTokens,
  getAgentMinTokens,
  shouldUseWebSearch,
  toEchoableContent,
  WEB_SEARCH_MAX_USES,
} from "@/lib/agent/web-search";
import {
  estimateInputTokens,
  estimateTextTokens,
  planCreditReservation,
  reserveCredits,
  settleCredits,
} from "@/lib/credit-reservation";
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

// A function killed at this limit never settles, so the user forfeits that turn's hold.
export const maxDuration = 300;

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

    const tools = buildAgentTools(AGENT_TOOLS, webSearchEnabled);
    const plan = planCreditReservation({
      model,
      balanceCents: user.creditsRemaining,
      estimatedInputTokens: estimateInputTokens({
        system: AGENT_SYSTEM_PROMPT,
        tools,
        messages: anthropicMessages,
      }),
      maxTokens: getAgentMaxTokens({ model, enableThinking }),
      minTokens: getAgentMinTokens({ model, enableThinking }),
      webSearchMaxUses: webSearchEnabled ? WEB_SEARCH_MAX_USES : 0,
    });

    if (
      !plan.ok ||
      !(await reserveCredits({ db, userId, reserveCents: plan.reserveCents }))
    ) {
      logger.warn(
        {
          userId,
          model,
          creditsRemaining: user.creditsRemaining,
          requiredCents: plan.ok ? plan.reserveCents : plan.requiredCents,
        },
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
    const { reserveCents, maxTokens } = plan;

    const encoder = new TextEncoder();
    const upstream = new AbortController();
    const abortUpstream = () => upstream.abort();
    req.signal.addEventListener("abort", abortUpstream, { once: true });
    let clientConnected = !req.signal.aborted;

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: string) => {
          if (!clientConnected) return;
          try {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          } catch {
            clientConnected = false;
          }
        };
        const close = () => {
          if (!clientConnected) return;
          clientConnected = false;
          controller.close();
        };

        let fullTextResponse = "";
        let streamedOutput = "";
        let inputTokens = 0;
        let outputTokens = 0;
        let webSearchesStarted = 0;
        let usageReported = false;
        let settled = false;

        // Runs on every path that did not reach the billing transaction. Before
        // message_start nothing was billed upstream, so the hold goes back in full.
        // After it, output usage only arrives with the final message_delta, so the
        // streamed text stands in for it; a deliberate disconnect cannot dodge it.
        const settleUnfinishedTurn = async () => {
          outputTokens = Math.max(outputTokens, estimateTextTokens(streamedOutput));
          const actualCents = usageReported
            ? Math.min(
                reserveCents,
                calculateCostInCents(model, inputTokens, outputTokens, webSearchesStarted)
              )
            : 0;
          try {
            await db.transaction(async (tx) => {
              await settleCredits({ db: tx, userId, reserveCents, actualCents });
              if (actualCents > 0) {
                await tx.insert(usageRecords).values({
                  userId,
                  inputTokens,
                  outputTokens,
                  costCents: actualCents,
                  model,
                });
              }
            });
          } catch (settleError) {
            logger.error(
              {
                userId,
                chatId,
                reserveCents,
                actualCents,
                error: settleError instanceof Error ? settleError.message : String(settleError),
              },
              "Failed to settle credit reservation; hold kept"
            );
          }
        };

        try {
          if (!clientConnected) throw new Error("Client disconnected before the stream started");

          const thinkingConfig = buildThinkingConfig(model, enableThinking);
          const outputConfig = buildOutputConfig({ model, enableThinking });

          const anthropicStream = await anthropic.messages.stream({
            model,
            max_tokens: maxTokens,
            system: [
              {
                type: "text",
                text: AGENT_SYSTEM_PROMPT,
                cache_control: { type: "ephemeral" },
              },
            ],
            tools,
            messages: anthropicMessages,
            ...(thinkingConfig && { thinking: thinkingConfig }),
            ...(outputConfig && { output_config: outputConfig }),
          }, { signal: upstream.signal });

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
          send(sessionData);

          for await (const event of anthropicStream) {
            if (event.type === "message_start") {
              inputTokens = event.message.usage.input_tokens;
              usageReported = true;
            } else if (event.type === "content_block_start") {
              if (event.content_block.type === "tool_use") {
                currentToolUse = {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  input: "",
                  isServerTool: false,
                };
              } else if (event.content_block.type === "server_tool_use") {
                webSearchesStarted += 1;
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
                send(JSON.stringify(payload));
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                const text = event.delta.text;
                fullTextResponse += text;
                streamedOutput += text;
                const data = JSON.stringify({
                  type: "content_delta",
                  delta: text,
                });
                send(data);
              } else if (event.delta.type === "thinking_delta") {
                streamedOutput += event.delta.thinking;
                const data = JSON.stringify({
                  type: "thinking_delta",
                  delta: event.delta.thinking,
                });
                send(data);
              } else if (
                event.delta.type === "input_json_delta" &&
                currentToolUse
              ) {
                currentToolUse.input += event.delta.partial_json;
                streamedOutput += event.delta.partial_json;
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
                  send(searchData);
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
                  send(data);
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
                send(metricsData);
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

            await settleCredits({ db: tx, userId, reserveCents, actualCents: costCents });

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
          settled = true;

          if (costCents > reserveCents) {
            logger.warn(
              { userId, chatId, model, reserveCents, costCents, inputTokens },
              "Turn cost exceeded its credit reservation (input estimate miss)"
            );
          }

          logger.info(
            {
              userId,
              chatId,
              model,
              reserveCents,
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
            send(citationsData);
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
          send(executionCompleteData);

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
          send(doneData);

          close();
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
          send(errorData);

          close();
        } finally {
          req.signal.removeEventListener("abort", abortUpstream);
          if (!settled) await settleUnfinishedTurn();
        }
      },
      cancel() {
        clientConnected = false;
        abortUpstream();
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

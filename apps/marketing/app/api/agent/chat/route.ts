import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { keepRequestOpenUntil } from "@/lib/db/request-scope";
import { users, chats, messages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/ratelimit";
import { anthropic } from "@/lib/anthropic";
import { AGENT_TOOLS } from "@/lib/agent/tools";
import { AGENT_SYSTEM_PROMPT } from "@/lib/agent/system-prompt";
import {
  buildAgentTools,
  AGENT_TURN_MAX_TOKENS,
  buildOutputConfig,
  buildThinkingConfig,
  getAgentMinTokens,
  shouldUseWebSearch,
  WEB_SEARCH_MAX_USES,
} from "@/lib/agent/web-search";
import { estimateInputTokens, planCreditReservation } from "@/lib/credit-reservation";
import { parseJsonBody, readBodyWithinLimit } from "@/lib/request-body";
import { takeHold, type PartialTurn } from "@/lib/turn-hold";
import {
  AGENT_ERROR_CODES,
  AGENT_SIZE_LIMITS,
  agentChatRequestSchema,
  DEFAULT_AGENT_MODEL,
  errorMessage,
  resolveAgentModel,
  RUN_SUPERSEDED_MESSAGE,
  sanitizeForLog,
} from "@prophet/shared";
import { describeInsufficientBalance } from "@/lib/agent/insufficient-balance";
import { totalCredits } from "@/lib/credit-balance";
import { buildAgentMessages } from "@/lib/agent/conversation";
import { readRequestKind, toRunRequest } from "@/lib/agent/request-kind";
import { lastTurnReason, withLastTurnNotice } from "@/lib/agent/last-turn";
import {
  openRun,
  resumeRun,
  type HistoryRow,
  type RunRequest,
  type TurnEnding,
} from "@/lib/agent/run-record";
import { error, INTERNAL_ERROR_MESSAGE, SESSION_EXPIRED_MESSAGE } from "@/types";
import { logger } from "@/lib/logger";
import {
  calculateUsageCostInCredits,
  calculateWebSearchCostInCredits,
  type ModelName,
} from "@/lib/pricing";
import { devLogger } from "@/lib/dev-logger";
import {
  closingFrames,
  describeTurnError,
  readTurnStream,
  releasedToolCalls,
} from "@/lib/agent/turn-stream";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

const BALANCE_HELD_RETRY_AFTER_SECONDS = 5;

// Vercel only: a function killed at this limit never settles, so the user forfeits that
// Turn's Hold. Workers ignore it; there a Turn's settlement runs under `waitUntil`
// (`keepRequestOpenUntil`), which survives a hang-up but not an isolate that dies.
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const auth_ = await auth();
    const userId = auth_.userId;
    if (!userId) {
      return NextResponse.json(error(SESSION_EXPIRED_MESSAGE, "UNAUTHORIZED"), {
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

    const bounded = await readBodyWithinLimit({ req, maxBytes: AGENT_SIZE_LIMITS.requestBytes });
    if (bounded.status === "too_large") {
      logger.warn({ userId }, "Agent chat request body over the size limit");
      return NextResponse.json(
        error(
          "This request is too large to send. Start a new chat to continue.",
          AGENT_ERROR_CODES.requestTooLarge
        ),
        { status: 413 }
      );
    }
    const parsed = parseJsonBody(bounded.text);
    if (parsed.status === "invalid") {
      logger.warn({ userId }, "Agent chat request body is not JSON");
      return NextResponse.json(error("Request body must be JSON", "VALIDATION_ERROR"), {
        status: 400,
      });
    }
    const body = parsed.value;
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
      runId,
      previousTurns,
      image,
      enableThinking,
      enableWebSearch,
    } = validation.data;
    // Installed extensions still send legacy model IDs; everything after this
    // point — the API call, pricing, credit deduction, usage rows — uses the
    // resolved model so cost always matches the model actually invoked.
    const requestedModel = validation.data.model ?? DEFAULT_AGENT_MODEL;
    const model = resolveAgentModel(requestedModel) as ModelName;
    const webSearchEnabled = shouldUseWebSearch(enableWebSearch);

    const [chat, user] = await Promise.all([
      db.query.chats.findFirst({
        where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
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

    if (!user) {
      return NextResponse.json(error("User not found", "USER_NOT_FOUND"), {
        status: 404,
      });
    }

    const requestKind = readRequestKind(validation.data);
    if (requestKind.kind === "invalid") {
      return NextResponse.json(
        error(
          "Either userMessage or toolResults is required",
          "VALIDATION_ERROR"
        ),
        { status: 400 }
      );
    }
    const { runTurns } = requestKind;
    const isContinuationTurn = requestKind.kind !== "first";

    // Read without a lock to size the Hold; a first Turn rebuilds its prompt from the
    // read it takes under the chat lock once the Hold is in place.
    const unlockedHistory = await db.query.messages.findMany({
      where: eq(messages.chatId, chatId),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    });
    // A continuation that names its Run goes on only while that Run is the live one,
    // and stops before any Hold once another panel has started a newer Run.
    const resumed =
      requestKind.kind === "run"
        ? resumeRun({ history: unlockedHistory, runId: requestKind.runId })
        : undefined;
    if (resumed === null) {
      logger.info({ userId, chatId, runId }, "Continuation of a superseded Run");
      return NextResponse.json(
        error(RUN_SUPERSEDED_MESSAGE, AGENT_ERROR_CODES.runSuperseded),
        { status: 409 }
      );
    }
    const runHistory: HistoryRow[] = resumed ? resumed.history : unlockedHistory;
    const estimatedMessages = buildAgentMessages({
      history: runHistory,
      userMessage,
      image,
      runTurns,
    });
    const tools = buildAgentTools(AGENT_TOOLS, webSearchEnabled);
    const estimatePrompt = (promptMessages: MessageParam[]) =>
      estimateInputTokens({ system: AGENT_SYSTEM_PROMPT, tools, messages: promptMessages });
    const estimatedPromptTokens = estimatePrompt(estimatedMessages);
    const runEnd = lastTurnReason({
      runTurns,
      hasRunId: runId !== undefined,
      estimatedPromptTokens,
    });
    const estimatedInputTokens = runEnd
      ? estimatePrompt(withLastTurnNotice(estimatedMessages))
      : estimatedPromptTokens;
    // The Hold expects the cache: a `previousTurns` continuation's previous Turn already
    // sent (and cached) this prompt minus its newest Turn, so that prefix is priced as a
    // cache read and the rest, the last-Turn notice included, as a cache write. First
    // Turns and the legacy form write their whole prompt. A miss settles as overage.
    const cachedPrefixTokens =
      isContinuationTurn && previousTurns
        ? estimatePrompt(
            buildAgentMessages({
              history: runHistory,
              userMessage,
              image,
              runTurns: runTurns.slice(0, -1),
            })
          )
        : 0;
    const restTokens = Math.max(0, estimatedInputTokens - cachedPrefixTokens);
    const balanceCents = totalCredits(user);
    const planFor = (option: { model: ModelName; enableThinking: boolean }) =>
      planCreditReservation({
        model: option.model,
        balanceCents,
        cachedPrefixTokens,
        restTokens,
        maxTokens: AGENT_TURN_MAX_TOKENS,
        minTokens: getAgentMinTokens(option.enableThinking),
        webSearchMaxUses: webSearchEnabled ? WEB_SEARCH_MAX_USES : 0,
      });
    const plan = planFor({ model, enableThinking });

    if (!plan.ok) {
      logger.warn(
        {
          userId,
          model,
          balanceCents,
          requiredCents: plan.requiredCents,
        },
        "Insufficient balance for agent chat"
      );
      const { message, details } = describeInsufficientBalance({
        model,
        enableThinking,
        isContinuation: isContinuationTurn,
        tier: user.tier,
        fits: (option) => planFor(option).ok,
      });
      return NextResponse.json(
        error(message, "INSUFFICIENT_BALANCE", details),
        { status: 402 }
      );
    }

    const turnHold = await takeHold({ db, userId, chatId, model, reserveCents: plan.reserveCents });
    if (!turnHold) {
      logger.warn(
        { userId, model, balanceCents, requiredCents: plan.reserveCents },
        "Credit reservation lost a race for the balance"
      );
      return NextResponse.json(
        error(
          "Some of your balance is held by another request that's still running. Try again in a few seconds.",
          "BALANCE_HELD",
          { retryAfter: BALANCE_HELD_RETRY_AFTER_SECONDS }
        ),
        {
          status: 409,
          headers: { "Retry-After": String(BALANCE_HELD_RETRY_AFTER_SECONDS) },
        }
      );
    }
    const { reserveCents, maxTokens } = plan;
    const maxTokensReducedForBalance = maxTokens < AGENT_TURN_MAX_TOKENS;

    let history: HistoryRow[] = runHistory;
    let runRequest: RunRequest;
    // Nothing was sent to Anthropic yet, so a failure from here to the stream gives the
    // whole Hold back. Without this, the outer catch would answer 500 and keep it.
    let anthropicMessages: MessageParam[];
    try {
      if (requestKind.kind === "first") {
        const started = await openRun({ db, chatId, userMessage: requestKind.userMessage });
        history = started.history;
        runRequest = toRunRequest({ kind: requestKind, from: { opened: started.opening } });
      } else {
        runRequest = toRunRequest({
          kind: requestKind,
          from: resumed ? { resumed: resumed.opening } : null,
        });
      }
      const builtMessages = buildAgentMessages({ history, userMessage, image, runTurns });
      anthropicMessages = runEnd ? withLastTurnNotice(builtMessages) : builtMessages;
      // DEV LOGGING: Log request to LLM
      await devLogger.logRequest(model, anthropicMessages, AGENT_SYSTEM_PROMPT, { enableThinking });
    } catch (startError) {
      logger.error(
        { userId, chatId, error: errorMessage(startError) },
        "Failed to start the Turn; returning its hold"
      );
      await turnHold.close({ type: "not_started" });
      return NextResponse.json(error(INTERNAL_ERROR_MESSAGE, "INTERNAL_ERROR"), { status: 500 });
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
        runTurns: runTurns.length,
        runEnd,
      },
      "Starting agent stream"
    );

    const encoder = new TextEncoder();
    const upstream = new AbortController();
    const abortUpstream = () => upstream.abort();
    req.signal.addEventListener("abort", abortUpstream, { once: true });
    let clientConnected = !req.signal.aborted;
    // The client can hang up long before the Turn settles its Hold in the `finally` below.
    let releaseRequestScope = () => {};
    keepRequestOpenUntil(new Promise<void>((resolve) => {
      releaseRequestScope = resolve;
    }));

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
        const failTurn = (err: unknown) => {
          logger.error(
            {
              error: errorMessage(err),
              userId,
              chatId,
            },
            "Agent streaming error"
          );

          send(JSON.stringify(describeTurnError(err)));

          close();
        };

        // A Turn cut off before its stream opens measured nothing, so it is billed nothing.
        let partial: PartialTurn = {
          usageReported: false,
          usage: {
            inputTokens: 0,
            cacheCreationInputTokens: 0,
            cacheReadInputTokens: 0,
            outputTokens: 0,
            webSearchRequests: 0,
          },
          streamedOutput: "",
          text: "",
        };

        try {
          if (!clientConnected) throw new Error("Client disconnected before the stream started");

          const thinkingConfig = buildThinkingConfig(enableThinking);
          const outputConfig = buildOutputConfig(enableThinking);

          const turn = await readTurnStream({
            open: async () =>
              anthropic.messages.stream({
                model,
                max_tokens: maxTokens,
                // Automatic caching moves this breakpoint to the newest block on every
                // request, so each turn of a run reads the prefix the previous turn wrote.
                cache_control: { type: "ephemeral" },
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
              }, { signal: upstream.signal }),
            sessionFrame: {
              type: "session_created",
              sessionId: chatId,
              // The extension names the Run by this id on every continuation.
              ...((runRequest.type === "first" || runRequest.type === "run") && {
                runId: runRequest.opening.id,
              }),
            },
            model,
            send: (frame) => send(JSON.stringify(frame)),
          });
          // From here on, a Turn that fails is settled from what it measured.
          partial = turn.partial;
          if (turn.ended === "cut_short") {
            failTurn(turn.error);
            return;
          }

          const { final } = turn;
          const { stopReason } = final;
          const {
            inputTokens,
            cacheCreationInputTokens,
            cacheReadInputTokens,
            outputTokens,
            webSearchRequests,
          } = final.usage;

          const costCents = calculateUsageCostInCredits(model, final.usage);
          const webSearchCostCents =
            calculateWebSearchCostInCredits(webSearchRequests);

          const isFinalTurn = runEnd !== null || !final.runContinues;

          // A refused Turn's text isn't a reply the user should see again, and the
          // tool calls it held were never released.
          const ending: TurnEnding =
            stopReason === "refusal"
              ? { type: "refused" }
              : {
                  type: "reply",
                  text: final.text,
                  releasedToolCalls: releasedToolCalls({ final, runEnd }),
                };

          // Throws when the billing transaction fails; the `finally` then closes it unfinished.
          await turnHold.close({
            type: "finished",
            request: runRequest,
            ending,
            usage: final.usage,
            isFinalTurn,
          });

          logger.info(
            {
              userId,
              chatId,
              model,
              reserveCents,
              costCents,
              inputTokens,
              outputTokens,
              cacheReadInputTokens,
              cacheCreationInputTokens,
              webSearchRequests,
              webSearchCostCents,
              stopReason,
            },
            "Agent stream completed"
          );

          // DEV LOGGING: Log response from LLM
          await devLogger.logResponse(final.text, {
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cache_read_input_tokens: cacheReadInputTokens,
            cache_creation_input_tokens: cacheCreationInputTokens,
          });

          if (stopReason === "refusal") {
            logger.warn(
              { userId, chatId, model, category: final.refusalCategory },
              "Model declined the request"
            );
          }

          for (const frame of closingFrames({
            final,
            costCents,
            runEnd,
            maxTokensReducedForBalance,
          })) {
            send(JSON.stringify(frame));
          }

          close();
        } catch (err) {
          failTurn(err);
        } finally {
          try {
            req.signal.removeEventListener("abort", abortUpstream);
            // Does nothing once the Turn's finished close has settled the Hold.
            await turnHold.close({ type: "unfinished", request: runRequest, partial });
          } finally {
            releaseRequestScope();
          }
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
      { error: errorMessage(err) },
      "Agent chat endpoint error"
    );
    return NextResponse.json(
      error(INTERNAL_ERROR_MESSAGE, "INTERNAL_ERROR"),
      { status: 500 }
    );
  }
}

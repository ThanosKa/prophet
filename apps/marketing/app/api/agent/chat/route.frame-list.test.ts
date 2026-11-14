/**
 * Characterization test: the full frame list the route sends for each main Turn ending.
 * Installed extension builds parse these frames, so the types, order and field values
 * stay as they are today. Only the Run id, which differs on every request, is matched by shape.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  anthropicTurn,
  createTables,
  frames,
  postAgentChat,
  readUntil,
  resetAs,
  seedUserWithChat,
  streamMock,
  text,
  textBlockEvents,
  toolUse,
  toolUseBlockEvents,
} from "./route-test-harness";

const USER_ID = "user_frame_list";
const CHAT_ID = "5d1f7c3e-8a2b-4c9d-b6e4-7f0a1b2c3d4e";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

beforeAll(createTables);

beforeEach(async () => {
  await resetAs(USER_ID);
  await seedUserWithChat({ userId: USER_ID, chatId: CHAT_ID, credits: 1000 });
});

function post(userMessage: string) {
  return postAgentChat({
    chatId: CHAT_ID,
    model: "claude-haiku-5-5",
    userMessage,
  });
}

const sessionCreated = {
  type: "session_created",
  sessionId: CHAT_ID,
  runId: expect.stringMatching(UUID),
};

/** The usage fields every stub Turn reports: 1,000 input and 50 output tokens. */
const TOKENS = {
  inputTokens: 1000,
  outputTokens: 50,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
};
const metricsUpdate = {
  type: "metrics_update",
  metrics: { ...TOKENS, costCents: 1 },
};
const noSearch = { webSearchRequests: 0, webSearchCostCents: 0 };
const finalMetrics = { ...TOKENS, costCents: 1, ...noSearch };

function executionComplete({
  stopReason,
  finalOutput,
}: {
  stopReason: string;
  finalOutput: string;
}) {
  return {
    type: "execution_complete",
    stopReason,
    finalOutput,
    metrics: finalMetrics,
  };
}

function done({
  stopReason,
  contentBlocks,
  citations = [],
}: {
  stopReason: string;
  contentBlocks: unknown[];
  citations?: unknown[];
}) {
  return {
    type: "done",
    stopReason,
    usage: finalMetrics,
    citations,
    contentBlocks,
    maxTokensReducedForBalance: false,
  };
}

describe("the frame list of POST /api/agent/chat", () => {
  it("plain text", async () => {
    streamMock.mockReturnValueOnce(
      anthropicTurn({
        events: textBlockEvents({ index: 0, value: "Hello there." }),
        stopReason: "end_turn",
        content: [text("Hello there.")],
      }),
    );

    const events = frames(await (await post("Hi")).text());

    expect(events).toEqual([
      sessionCreated,
      { type: "content_delta", delta: "Hello there." },
      metricsUpdate,
      executionComplete({
        stopReason: "end_turn",
        finalOutput: "Hello there.",
      }),
      done({ stopReason: "end_turn", contentBlocks: [text("Hello there.")] }),
    ]);
  });

  it("tool_use", async () => {
    streamMock.mockReturnValueOnce(
      anthropicTurn({
        events: [
          ...textBlockEvents({ index: 0, value: "Opening both tabs." }),
          ...toolUseBlockEvents({
            index: 1,
            id: "toolu_1",
            name: "navigate",
            partialJson: '{"url":"https://a.com"}',
          }),
          ...toolUseBlockEvents({
            index: 2,
            id: "toolu_2",
            name: "take_snapshot",
            partialJson: "",
          }),
        ],
        stopReason: "tool_use",
        content: [
          text("Opening both tabs."),
          toolUse({
            id: "toolu_1",
            name: "navigate",
            input: { url: "https://a.com" },
          }),
          toolUse({ id: "toolu_2", name: "take_snapshot", input: {} }),
        ],
      }),
    );

    const events = frames(await (await post("Open a.com")).text());

    expect(events).toEqual([
      sessionCreated,
      { type: "content_delta", delta: "Opening both tabs." },
      metricsUpdate,
      {
        type: "tool_use",
        toolUse: {
          type: "tool_use",
          id: "toolu_1",
          name: "navigate",
          input: { url: "https://a.com" },
        },
      },
      {
        type: "tool_use",
        toolUse: {
          type: "tool_use",
          id: "toolu_2",
          name: "take_snapshot",
          input: {},
        },
      },
      executionComplete({
        stopReason: "tool_use",
        finalOutput: "Opening both tabs.",
      }),
      done({
        stopReason: "tool_use",
        contentBlocks: [
          text("Opening both tabs."),
          toolUse({
            id: "toolu_1",
            name: "navigate",
            input: { url: "https://a.com" },
          }),
          toolUse({ id: "toolu_2", name: "take_snapshot", input: {} }),
        ],
      }),
    ]);
  });

  it("max_tokens", async () => {
    streamMock.mockReturnValueOnce(
      anthropicTurn({
        events: [
          ...textBlockEvents({ index: 0, value: "Opening the page." }),
          ...toolUseBlockEvents({
            index: 1,
            id: "toolu_1",
            name: "navigate",
            partialJson: '{"url":"https://exa',
          }),
        ],
        stopReason: "max_tokens",
        content: [
          text("Opening the page."),
          toolUse({ id: "toolu_1", name: "navigate", input: {} }),
        ],
      }),
    );

    const events = frames(await (await post("Open example.com")).text());

    expect(events).toEqual([
      sessionCreated,
      { type: "content_delta", delta: "Opening the page." },
      metricsUpdate,
      executionComplete({
        stopReason: "max_tokens",
        finalOutput: "Opening the page.",
      }),
      done({
        stopReason: "max_tokens",
        contentBlocks: [text("Opening the page.")],
      }),
    ]);
  });

  it("refusal", async () => {
    streamMock.mockReturnValueOnce(
      anthropicTurn({
        events: textBlockEvents({
          index: 0,
          value: "Running the exploit now.",
        }),
        stopReason: "refusal",
        content: [text("Running the exploit now.")],
      }),
    );

    const events = frames(await (await post("Hack a.com")).text());

    expect(events).toEqual([
      sessionCreated,
      { type: "content_delta", delta: "Running the exploit now." },
      metricsUpdate,
      {
        type: "error",
        error:
          "Claude declined this request. Try rephrasing it or start a new chat.",
        code: "MODEL_REFUSED",
      },
    ]);
  });

  it("web search", async () => {
    const query = { query: "prophet chrome" };
    const results = [
      {
        type: "web_search_result",
        url: "https://a.com",
        title: "A",
        page_age: "1 day",
        encrypted_content: "enc-a",
      },
      {
        type: "web_search_result",
        url: "https://b.com",
        title: "B",
        page_age: null,
        encrypted_content: "enc-b",
      },
    ];
    const search = {
      type: "server_tool_use",
      id: "srvtoolu_1",
      name: "web_search",
      input: query,
    };
    const result = {
      type: "web_search_tool_result",
      tool_use_id: "srvtoolu_1",
      content: results,
    };
    const answer = {
      type: "text",
      text: "Prophet is a side panel agent.",
      citations: [
        {
          type: "web_search_result_location",
          url: "https://a.com",
          title: "A",
          cited_text: "a side panel agent",
          encrypted_index: "idx",
        },
      ],
    };
    streamMock.mockReturnValueOnce({
      ...anthropicTurn({
        events: [
          {
            type: "content_block_start",
            index: 0,
            content_block: { ...search, input: {} },
          },
          {
            type: "content_block_delta",
            index: 0,
            delta: {
              type: "input_json_delta",
              partial_json: JSON.stringify(query),
            },
          },
          { type: "content_block_stop", index: 0 },
          { type: "content_block_start", index: 1, content_block: result },
          { type: "content_block_stop", index: 1 },
          ...textBlockEvents({
            index: 2,
            value: "Prophet is a side panel agent.",
          }),
        ],
        stopReason: "end_turn",
        content: [search, result, answer],
      }),
    });

    const events = frames(await (await post("What is Prophet?")).text());
    const citations = [
      { url: "https://a.com", title: "A", citedText: "a side panel agent" },
    ];

    expect(events).toEqual([
      sessionCreated,
      {
        type: "web_search_start",
        toolUseId: "srvtoolu_1",
        query: "prophet chrome",
      },
      {
        type: "web_search_results",
        toolUseId: "srvtoolu_1",
        sources: [
          { url: "https://a.com", title: "A", pageAge: "1 day" },
          { url: "https://b.com", title: "B", pageAge: null },
        ],
      },
      { type: "content_delta", delta: "Prophet is a side panel agent." },
      // The Turn has started one search, so its running cost already counts it.
      { type: "metrics_update", metrics: { ...TOKENS, costCents: 2 } },
      { type: "citations", citations },
      executionComplete({
        stopReason: "end_turn",
        finalOutput: "Prophet is a side panel agent.",
      }),
      done({
        stopReason: "end_turn",
        contentBlocks: [search, result, answer],
        citations,
      }),
    ]);
  });

  it("a client that disconnects mid-Turn", async () => {
    streamMock.mockImplementationOnce(
      (_params: unknown, options?: { signal?: AbortSignal }) => ({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "message_start",
            message: { usage: { input_tokens: 1000, output_tokens: 1 } },
          };
          yield* textBlockEvents({ index: 0, value: "Partial answer" });
          await new Promise((_resolve, reject) => {
            options?.signal?.addEventListener("abort", () =>
              reject(new Error("Request was aborted.")),
            );
          });
        },
        finalMessage: () => new Promise(() => {}),
      }),
    );

    const { reader, seen } = await readUntil({
      response: await post("Hi"),
      marker: "content_delta",
    });
    await reader.cancel();

    expect(frames(seen)).toEqual([
      sessionCreated,
      { type: "content_delta", delta: "Partial answer" },
    ]);
  });
});

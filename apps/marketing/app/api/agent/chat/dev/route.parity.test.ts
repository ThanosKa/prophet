/**
 * The dev route (`VITE_USE_DEV_API`) against the production route: the same fake Turns go
 * through both, and their frame lists are compared. The dev route only skips billing.
 */
import { describe, it, expect, beforeAll, vi, afterEach } from "vitest";
import {
  anthropicTurn,
  balance,
  createTables,
  db,
  frames,
  postAgentChat,
  resetAs,
  seedUserWithChat,
  streamMock,
  text,
  textBlockEvents,
  toolUse,
  toolUseBlockEvents,
} from "../route-test-harness";
import { usageRecords } from "@/lib/db/schema";

const { POST: devPost } = await import("./route");

const USER_ID = "user_dev_parity";
const CHAT_ID = "7a1f7c3e-8a2b-4c9d-b6e4-7f0a1b2c3d4e";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CREDITS = 1000;

beforeAll(createTables);
afterEach(() => vi.unstubAllEnvs());

const body = {
  chatId: CHAT_ID,
  model: "claude-haiku-5-5",
  userMessage: "Do the thing",
};

type Turn = () => ReturnType<typeof anthropicTurn>;

async function freshChat() {
  await resetAs(USER_ID);
  await seedUserWithChat({ userId: USER_ID, chatId: CHAT_ID, credits: CREDITS });
}

async function productionFrames(turn: Turn) {
  await freshChat();
  streamMock.mockImplementationOnce(turn);
  return frames(await (await postAgentChat(body)).text());
}

async function devFrames(turn: Turn) {
  await freshChat();
  vi.stubEnv("NODE_ENV", "development");
  streamMock.mockImplementationOnce(turn);
  const response = await devPost(
    new Request("http://localhost:3000/api/agent/chat/dev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return frames(await response.text());
}

const plainText: Turn = () =>
  anthropicTurn({
    events: textBlockEvents({ index: 0, value: "Hello there." }),
    stopReason: "end_turn",
    content: [text("Hello there.")],
  });

const twoToolCalls: Turn = () =>
  anthropicTurn({
    events: [
      ...textBlockEvents({ index: 0, value: "Opening both tabs." }),
      ...toolUseBlockEvents({
        index: 1,
        id: "toolu_1",
        name: "navigate",
        partialJson: '{"url":"https://a.com"}',
      }),
      ...toolUseBlockEvents({ index: 2, id: "toolu_2", name: "take_snapshot", partialJson: "" }),
    ],
    stopReason: "tool_use",
    content: [
      text("Opening both tabs."),
      toolUse({ id: "toolu_1", name: "navigate", input: { url: "https://a.com" } }),
      toolUse({ id: "toolu_2", name: "take_snapshot", input: {} }),
    ],
  });

const webSearch: Turn = () => {
  const query = { query: "prophet chrome" };
  const search = { type: "server_tool_use", id: "srvtoolu_1", name: "web_search", input: query };
  const result = {
    type: "web_search_tool_result",
    tool_use_id: "srvtoolu_1",
    content: [
      {
        type: "web_search_result",
        url: "https://a.com",
        title: "A",
        page_age: "1 day",
        encrypted_content: "enc-a",
      },
    ],
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
  return anthropicTurn({
    events: [
      { type: "content_block_start", index: 0, content_block: { ...search, input: {} } },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "input_json_delta", partial_json: JSON.stringify(query) },
      },
      { type: "content_block_stop", index: 0 },
      { type: "content_block_start", index: 1, content_block: result },
      { type: "content_block_stop", index: 1 },
      ...textBlockEvents({ index: 2, value: "Prophet is a side panel agent." }),
    ],
    stopReason: "end_turn",
    content: [search, result, answer],
  });
};

const invalidRequest = () => {
  throw new Error("400 invalid_request_error: something is off");
};

/** What each route sends for the same Turn today; this records the drift, it does not endorse it. */
const types = (list: Array<{ type: string }>) => list.map((frame) => frame.type);

describe("today's differences between the dev route and production", () => {
  it("the dev route leaves the Run id out of session_created", async () => {
    const [dev] = await devFrames(plainText);
    const [production] = await productionFrames(plainText);

    expect(dev).toEqual({ type: "session_created", sessionId: CHAT_ID });
    expect(production).toMatchObject({ runId: expect.stringMatching(UUID) });
  });

  it("the dev route sends tool calls mid-stream, production after the Turn", async () => {
    expect(types(await devFrames(twoToolCalls))).toEqual([
      "session_created",
      "content_delta",
      "tool_use",
      "tool_use",
      "metrics_update",
      "execution_complete",
      "done",
    ]);
    expect(types(await productionFrames(twoToolCalls))).toEqual([
      "session_created",
      "content_delta",
      "metrics_update",
      "tool_use",
      "tool_use",
      "execution_complete",
      "done",
    ]);
  });

  it("the dev route sends no web search frames and no citations", async () => {
    expect(types(await devFrames(webSearch))).toEqual([
      "session_created",
      "content_delta",
      "metrics_update",
      "execution_complete",
      "done",
    ]);
    expect(types(await productionFrames(webSearch))).toEqual([
      "session_created",
      "web_search_start",
      "web_search_results",
      "content_delta",
      "metrics_update",
      "citations",
      "execution_complete",
      "done",
    ]);
  });

  it("the dev route words an invalid request differently", async () => {
    const [dev] = await devFrames(invalidRequest as unknown as Turn);
    const [production] = await productionFrames(invalidRequest as unknown as Turn);

    expect(dev).toMatchObject({ error: "Invalid request. Please try a different message." });
    expect(production).toMatchObject({
      error: "Claude couldn't process this request. Start a new chat and try again.",
    });
  });
});

describe("the dev route stays free", () => {
  it("answers 403 outside development", async () => {
    await freshChat();
    vi.stubEnv("NODE_ENV", "production");

    const response = await devPost(
      new Request("http://localhost:3000/api/agent/chat/dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(403);
    expect(streamMock).not.toHaveBeenCalled();
  });

  it("takes no Hold and writes no billing rows", async () => {
    await devFrames(twoToolCalls);

    expect(await balance(USER_ID)).toBe(CREDITS);
    expect(await db.select().from(usageRecords)).toEqual([]);
  });
});

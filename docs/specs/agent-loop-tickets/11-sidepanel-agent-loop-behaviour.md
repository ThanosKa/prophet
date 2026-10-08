# 11 · Side panel: agent loop behaviour

Blocked by: 07, 08, 10 · Issues: #4, #5, #14, #15 (extension parts)

## What to build
Test at the side-panel agent loop seam (mocked fetch and background bridge). Lift the SSE test helpers to file scope first.

- **Tool input check (#5).**
  - Before running a tool call, validate its input with that tool's shared input schema.
  - If validation fails, don't run the tool. Record a `tool_result` with `is_error: true` and a message that names each invalid field.
  - Tools without a schema run as today.
- **Last Turn (#4).**
  - On the last allowed Turn, run no tools.
  - A `pause_turn` on the last allowed Turn ends the Run with the Turn-limit notice instead of resuming.
  - When `done` carries `runEnd`, or all Turns are used, show a notice after the reply: the existing Turn-limit notice, or a new Run-budget notice in the user-facing errors module.
- **Run id (#15).**
  - Keep the `runId` from `session_created` and send it on every continuation.
  - On a 409 whose code is `RUN_SUPERSEDED`, end the Run with a notice that the chat continued in another panel. Tell it apart from `BALANCE_HELD` by the code.
- **`pause_turn` (#14).**
  - On `done` with `pause_turn`, append Claude's content as a Turn with no tool results and continue. It counts toward the Turn limit.
  - Don't show that Turn's `execution_complete` as the final answer.
- **Request size.**
  - Before each `fetch`, measure the body in UTF-8 bytes against the shared request limit.
  - If it is over, don't send the request. End the Run with a "this Run has grown too large" notice.
  - The body-less 413 mapping must not mention an image in this case.

## Acceptance criteria
- [ ] Loop test: an invalid input isn't run, and the next request carries the `is_error` result.
- [ ] Loop test: on the last allowed Turn no tool runs, and a `pause_turn` there ends the Run.
- [ ] Loop test: the Turn-limit notice follows the reply when all Turns are used, and the Run-budget notice follows a reply with `runEnd: "run_budget"`.
- [ ] Loop test: `runId` is sent on every continuation, and `RUN_SUPERSEDED` ends the Run with its notice.
- [ ] Loop test: a `pause_turn` continues with `toolResults: []`.
- [ ] Loop test: an over-size request (measured in bytes, with non-ASCII text) isn't sent, and the Run ends with its notice.
- [ ] Hook test (`useAgentChat`): each new notice appears after the reply.

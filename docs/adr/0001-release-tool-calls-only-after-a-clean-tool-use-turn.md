# 0001: Release tool calls only at the end of a clean `tool_use` Turn

Date: 2026-11-10

## Decision

The server holds back every tool call of a Turn and releases them to the extension only when the Turn ends cleanly with the stop reason `tool_use` and is not the Run's last. A Turn that is cut off, refused or ended for any other reason releases nothing, so it never runs a tool in the user's tab.

## Why

Tools act on a real page: they click, type and navigate. A tool call that arrives mid-stream may belong to a Turn that is later cut off or refused, and the user would see an action that the Run never meant to take. Waiting for the clean end means every released tool call comes from a Turn the model finished.

## Cost

A little latency: the first tool starts after the Turn's last token, not when its call is first streamed.

## Rejected alternative

Release each tool call as soon as its input is complete, to "speed things up". It is faster, but it cannot take an action back when the Turn then fails.

# 0002: Accept every request form an installed build sends, and read frames tolerantly

Date: 2026-11-10

## Decision

`POST /api/agent/chat` keeps accepting every request form that an installed extension build has ever sent, for example continuations without `runId` and the old model aliases and Turn limits. The extension, in turn, reads the frames of the stream tolerantly and does not strictly validate them. No request form is removed until there is evidence that the builds sending it are gone.

## Why

Installed extension builds outlive deploys: users update the extension on Chrome's schedule, not ours. A server that refuses an old form breaks those users in the middle of a Run. A strict frame reader would break a new build the moment the server adds a field.

## Cost

The server carries code for old request forms, and the tests must cover one body per build generation. Retiring a form is a product decision that needs evidence first.

## Rejected alternative

Reject old forms and force an update, or validate every frame strictly with a schema. Both turn a routine deploy into an outage for users on older builds.

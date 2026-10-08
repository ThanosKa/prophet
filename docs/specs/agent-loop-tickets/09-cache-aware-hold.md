# 09 · Cache-aware Hold

Blocked by: 08 · Issues: #11

## What to build
See the spec section "Cache-aware Hold (#11)".

- **Split the prompt.** The credit reservation plan prices the estimated prompt in two parts:
  - the cached prefix, at the cache-read rate;
  - the rest, at the cache-write rate.
- **Cached prefix of a continuation.** For a `previousTurns` continuation, the prefix is everything the previous Turn sent: system, tools, the history window, the opening message, and every earlier Turn except the newest. A last Turn keeps `tool_choice` unchanged, so it is priced the same way.
- **First Turns and the legacy form** price the whole prompt at the cache-write rate.
- **Settlement** stays as it is.
- **Long prompts.** Apply Haiku 5.5's long-prompt tier exactly as the pricing module does.
- **Docs.**
  - `GLOSSARY.md`: add **Hold**, worded as in the spec.
  - `.claude/docs/pricing-model.md`: the Reserve step.
  - `.claude/docs/patterns.md`: the cache-aware rule.

## Acceptance criteria
- [ ] Unit tests on the reservation plan:
  - [ ] the prefix is priced at the cache-read rate and the rest at the cache-write rate;
  - [ ] a first Turn is priced at the cache-write rate.
- [ ] Route test: a Sonnet 5.5 continuation with a large cached prefix is allowed at a balance that covers the cached cost, and gets 402 below it.
- [ ] Route test: a cache miss settles above the Hold through the overage path.

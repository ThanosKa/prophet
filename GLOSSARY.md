# Prophet

A Chrome side panel AI agent sold on prepaid credits. These terms describe how a user's message becomes agent work and how that work is billed.

## Agent work

**Run**:
Everything the agent does to answer one user message, until it gives a final answer or pauses.
_Avoid_: Question, task, request

**Turn**:
One call to the model inside a Run. In a Turn the model may write text and call zero, one or several tools.
_Avoid_: Step, tool call, message

**Turn limit**:
The most Turns a Run may take before the agent pauses and waits for the user to say "continue".
_Avoid_: Max steps

**Run budget**:
The estimated prompt size at which a Run's next Turn becomes its last: 90K by the Hold's deliberately high estimate, roughly 50-80K real tokens.
_Avoid_: Context limit, prompt budget

**Run record**:
The single assistant row that holds a Run's text and tool calls, updated after every Turn.
_Avoid_: Assistant message, transcript

**Released tool call**:
A tool call the server lets the extension run: only from a Turn that ended asking for tools and is not the Run's last.
_Avoid_: Emitted tool call, pending tool

**Superseded Run**:
A Run whose chat has started a newer Run; its continuations are refused.
_Avoid_: Stale run, old run

**Continuation**:
A request for the next Turn of a Run, carrying the earlier Turns and their tool results.
_Avoid_: Follow-up, tool response

## Billing

**Credit**:
The unit of a user's prepaid balance, worth one US cent.
_Avoid_: Token, point

**Hold**:
The Credits set aside from a user's balance before a Turn starts, sized to the most the Turn could cost. When the Turn ends, the unused part is returned and anything above it is charged.
_Avoid_: Reservation, pre-auth

**Settlement**:
Closing a Turn's Hold once: the Turn's cost is charged, the unused part of the Hold returned.
_Avoid_: Refund, release, close-out

**Unfinished Turn**:
A Turn ended by Stop, disconnect or error before its final bill arrived; it is settled from what was streamed so far and never above its Hold.
_Avoid_: Aborted turn, failed turn

**Lost Hold**:
A Hold that was taken but never settled, because the server stopped mid-Turn; it is returned by hand.
_Avoid_: Stuck hold, leaked credits

**Margin**:
The percentage Prophet adds on top of Anthropic's cost when converting a Turn's cost into Credits. It applies to every Turn, whichever kind of Credits pays for it.
_Avoid_: Markup, fee

**Minimum charge**:
The fewest Credits a single Turn can cost, however cheap the underlying model call was.
_Avoid_: Floor

**Free grant**:
The one-time Credits a new user receives on sign-up.
_Avoid_: Free tier credits, trial, gift

**Subscription credits**:
Credits that come with a paid plan. They are replaced at every renewal and lapse when the plan ends. A Turn spends them before Purchased credits.
_Avoid_: Monthly credits, included credits

**Purchased credits**:
Credits bought one-time outside a plan. They never expire and survive renewals, plan changes and cancellations.
_Avoid_: Extra credits, top-up, add-on

**Bonus**:
Subscription credits worth more than the plan's price. Prophet's plans give no Bonus: a plan's Subscription credits equal its price.
_Avoid_: Extra value

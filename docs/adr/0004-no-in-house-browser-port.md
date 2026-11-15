# 0004: No in-house browser port; tools reach Chrome through `chrome.*` and `cdpCommander`

Date: 2026-11-10

## Decision

Browser tools call the `chrome.*` APIs and `cdpCommander` (the Chrome DevTools Protocol wrapper) directly. There is no Prophet-owned browser interface between the tools and Chrome. Tests stub `chrome.*` and `cdpCommander`.

## Why

`chrome.*` and the DevTools Protocol are already the seam: they are narrow, documented and stable. A second interface on top would only copy them, and every new Chrome capability would have to be added in two places.

## Cost

Tool tests must stub Chrome's globals and the commander, which is more setup than a purpose-made fake.

## Rejected alternative

An in-house browser port with a real adapter and a fake one. It adds a layer that mirrors Chrome's own, and a fake that can drift from how Chrome behaves.

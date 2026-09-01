# @whoisddd/dsh-approval-notify

English | [中文](README.zh.md)

A minimal browser-only DSH Web GUI plugin that reminds you when a session needs attention or a background session finishes.

The plugin watches the live DSH session list for completion state and the alpha.2 `uiSession.pendingInteractions` feed for approval, question, and plan-review state. It prefers native browser notifications, and falls back to a larger stacked toast panel when native notifications are unavailable. On Windows, granted browser notifications surface through the system notification center.

## What it notifies

| DSH state | Notification title | Notes |
| --- | --- | --- |
| `approval` | Approval request | The session is waiting for an approval decision. |
| `question` | Question request | The session is waiting for a user choice or answer. |
| `plan-review` | Plan review | The session is waiting for plan confirmation. |
| `completed` | Completed | A top-level background session has finished. |
| `completed` on a subagent | Subagent completed | A subagent/background child session has finished. |

## Highlights

- Browser-only; the host half is intentionally empty.
- Watches the live DSH session list and alpha.2 pending-interaction feed; no dependency on `dsh-web-ui-all`.
- Uses only the public `sessions` and `uiSession` Client services; no DOM queries of core page structure.
- Uses native browser notifications first, with `requireInteraction: true`.
- Falls back to a larger right-bottom toast panel when native notifications fail.
- Supports multiple stacked fallback toasts.
- Deduplicates unchanged attention states so the same pending/completed state does not repeat.
- Labels completed subagents separately from completed top-level sessions.
- Unknown future pending-interaction kinds are ignored safely until they have an explicit notification mapping.

## Install

```sh
git clone https://github.com/whoisDDD/dsh-approval-notify.git
cd dsh-approval-notify
pnpm install
pnpm build
dsh plugin --profile web add link:$(pwd)
```

After installation, reload the DSH Web GUI page. The browser may ask for notification permission on first load. If permission is denied or native notification creation fails, the plugin still shows in-page toast reminders.

## Development

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

Useful scripts:

- `pnpm test` — run all Vitest tests.
- `pnpm test:notify` — run the core notification behavior tests.
- `pnpm typecheck` — run TypeScript type checking.
- `pnpm build` — generate `lib/` artifacts.
- `pnpm watch` — rebuild the client bundle during development.

## Notes and limitations

- This plugin does not implement a settings UI yet.
- Notification delivery depends on browser permission and the operating system notification policy.
- Completed-session reminders follow DSH's `completed` summary flag. Approval, question, and plan-review reminders use alpha.2's `uiSession.pendingInteractions` service rather than the removed legacy `SessionSummary.pendingInteraction` field. Top-level sessions and subagents are both notified, but subagents use a distinct title.
- Notification text uses only the session's display label and fixed state wording; unrelated session fields are not included.

## License

BSD-3-Clause.

# @whoisddd/dsh-approval-notify

English | [中文](README.zh.md)

A minimal browser-only DSH Web GUI plugin that reminds you when a session needs attention or a background session finishes.

Version 0.2.0 targets DSH **0.2.1-alpha.1**. It reads labels from `sessions.list` and attention state from the public `uiSession.sessionStatus` observable: `pendingInteraction` for approval/question/plan review and `completionUnread` for background completion. It prefers native browser notifications, and falls back to a larger stacked toast panel when native notifications are unavailable. On Windows, granted browser notifications surface through the system notification center.

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
- Watches the live DSH session list and unified session-status feed; no dependency on `dsh-web-ui-all`.
- Uses only the public `sessions` and `uiSession` Client services; no DOM queries of core page structure.
- Uses native browser notifications first, with `requireInteraction: true`.
- Falls back to a larger right-bottom toast panel when native notifications fail.
- Supports multiple stacked fallback toasts.
- Deduplicates unchanged requests by their opaque key and unread completions by state; another request or a later completion can notify again.
- Does not treat idle historical sessions as newly completed; the main-view session follows DSH's completion acknowledgement policy.
- Keeps deduplication, timers, and toast cleanup independent across Client contexts and reloads.
- Labels completed subagents separately from completed top-level sessions.
- Unknown future pending-interaction kinds are ignored safely until they have an explicit notification mapping.

## Install

```sh
git clone https://github.com/whoisDDD/dsh-approval-notify.git
cd dsh-approval-notify
pnpm install --frozen-lockfile
pnpm build
dsh plugin --profile web add link:$(pwd)
```

After installation, restart `dsh web` and reload the DSH Web GUI page. The browser may ask for notification permission on first load. If permission is denied or native notification creation fails, the plugin still shows in-page toast reminders.

## Development

```sh
pnpm install
pnpm typecheck
pnpm build
pnpm test
```

Useful scripts:

- `pnpm test` — run all Vitest tests (build first after changing source). Includes the shipped bundle against the published DSH UiSession service, with fixture remote events; no provider API calls.
- `pnpm test:notify` — run the core notification behavior tests.
- `pnpm typecheck` — run TypeScript type checking.
- `pnpm build` — generate `lib/` artifacts.
- `pnpm watch` — rebuild the client bundle during development.

## Notes and limitations

- This plugin does not implement a settings UI yet.
- Notification delivery depends on browser permission and the operating system notification policy.
- Requires the DSH 0.2 unified status API. DSH 0.1.2-alpha.2 is no longer supported by this release. The removed `SessionSummary.completed` and `uiSession.pendingInteractions` fields are not used. Completion means DSH reports an unread background stop; it does not certify that the task succeeded.
- Retained subagent rows in `sessions.list.byId` are also observed, even when they are outside the Host catalog `ids`. Unknown metadata is ignored until a label is available.
- Development types and real-service tests are pinned to 0.2.1-alpha.1; other releases require compatibility validation.
- Notification text uses only the session's display label and fixed state wording; unrelated session fields are not included.

## License

BSD-3-Clause.

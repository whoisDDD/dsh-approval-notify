# @whoisDDD/dsh-approval-notify

English | [中文](README.zh.md)

A minimal browser-only DSH Web GUI plugin that reminds you when a session needs attention or a background session finishes.

The plugin watches the live DSH session list, prefers native browser notifications, and falls back to a larger stacked toast panel when native notifications are unavailable. On Windows, granted browser notifications surface through the system notification center.

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
- Watches the live DSH session list; no dependency on `dsh-web-ui-all`.
- Uses native browser notifications first, with `requireInteraction: true`.
- Falls back to a larger right-bottom toast panel when native notifications fail.
- Supports multiple stacked fallback toasts.
- Deduplicates unchanged attention states so the same pending/completed state does not repeat.
- Labels completed subagents separately from completed top-level sessions.

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
- Completed-session reminders follow DSH's `completed` summary flag. Top-level sessions and subagents are both notified, but subagents use a distinct title.

## License

BSD-3-Clause.

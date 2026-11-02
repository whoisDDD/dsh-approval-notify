# @whoisddd/dsh-approval-notify

English | [中文](README.zh.md)

A minimal browser-only DSH Web GUI plugin that reminds you when a session needs attention or a background session finishes.

Version 0.2.1 targets DSH **0.2.1-alpha.1**. It reads labels from `sessions.list` and attention state from the public `uiSession.sessionStatus` observable: `pendingInteraction` for approval/question/plan review and `completionUnread` for background completion. It prefers native browser notifications, and falls back to a larger stacked toast panel when native notifications are unavailable. On Windows, granted browser notifications surface through the system notification center.

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
- Uses the public `sessions`, `uiSession`, and `uiWorkspace` Client services; no DOM queries of core page structure.
- Opens the corresponding session when a native notification or fallback toast is clicked; the toast also supports Enter and Space. Window activation is subject to browser, desktop application, and OS policy.
- Responds to store subscriptions without fixed-interval polling; relies on DSH to publish updates and replay pending requests on reconnect.
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

After installation, restart `dsh web` and reload the DSH Web GUI page. The browser may ask for notification permission on first load. While permission is ungranted, the plugin immediately shows in-page toast reminders, even if the permission prompt never settles. Native notification creation failures also fall back to toast.

### Desktop and Web profiles

DSH Desktop has its own `desktop` profile; installing the plugin into the `web` profile does not automatically change Desktop. In DSH 0.2.1-alpha.1 and 0.2.2-alpha.2, their default directories are `~/.dsh/profiles/desktop` and `~/.dsh/profiles/web`; a `DSH_HOME` set for the desktop process changes the root. Start Desktop at least once to initialize its profile, then fully quit Desktop and its Host before using `dsh plugin --profile desktop add link:<absolute-plugin-path>`. Preserve existing profile backups and make sure the CLI and Desktop use the same user and DSH_HOME. Restart Desktop and verify the startup log and served JavaScript.

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

The startup log is `[approval-notify] loaded (session-navigation, event-driven)`. A native click logs `native notification clicked`, followed by `session navigation requested` after the host navigation call returns. These logs omit session titles and IDs; a returned call does not guarantee that the UI switched or its window gained focus. If the old `loaded` log persists, inspect the actual Host/profile and loaded plugin rather than relying on source-map line numbers alone.

`.gitattributes` keeps TypeScript sources and generated bundles at LF so Windows checkouts do not embed CRLF in source maps. Existing working trees may need affected files checked out again after updating; preserve any local changes first.

## Notes and limitations

- This plugin does not implement a settings UI yet.
- Notification delivery depends on browser permission and the operating system notification policy.
- Notification clicks require the originating page to remain alive; archived or unavailable sessions may not open. Window activation on Windows and Linux browsers and desktop applications requires platform-specific testing.
- Requires the DSH 0.2 unified status API. DSH 0.1.2-alpha.2 is no longer supported by this release. The removed `SessionSummary.completed` and `uiSession.pendingInteractions` fields are not used. Completion means DSH reports an unread background stop; it does not certify that the task succeeded.
- Retained subagent rows in `sessions.list.byId` are also observed, even when they are outside the Host catalog `ids`. Unknown metadata is ignored until a label is available.
- Development types and real-service tests are pinned to 0.2.1-alpha.1; other releases require compatibility validation.
- Notification text uses only the session's display label and fixed state wording; unrelated session fields are not included.

## License

BSD-3-Clause.


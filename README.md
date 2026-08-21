# @whoisDDD/dsh-approval-notify

English | [中文](README.zh.md)

A minimal DSH web GUI plugin for approval, question, plan-review, and completed-session reminders.

It watches the live session list and reacts to `approval`, `question`, `plan-review`, and `completed` states. It tries to show a native browser notification first, which can surface as a Windows system notification when the browser has permission. If the browser notification is unavailable or fails, it falls back to a larger right-bottom stacked toast panel.

## Highlights

- Browser-only, no host-side logic
- Watches the live DSH session list for pending interactions and completed background sessions
- Uses native browser notifications first, toast as fallback
- Different titles for approval, question, plan review, and completed reminders
- Larger toast fallback panel with longer lifetime and multi-toast stacking
- No dependency on `dsh-web-ui-all`

## Install

```sh
git clone https://github.com/whoisDDD/dsh-approval-notify.git
cd dsh-approval-notify
pnpm install
pnpm build
dsh plugin --profile web add link:$(pwd)
```

## License

BSD-3-Clause.

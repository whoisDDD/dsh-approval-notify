# @whoisDDD/dsh-approval-notify

English | [中文](README.zh.md)

A minimal DSH web GUI plugin for approval reminders.

It watches the live session list for `pendingInteraction === 'approval'` and shows a right-bottom toast. If the browser notification permission is available, it can also send a browser notification.

## Highlights

- Browser-only, no host-side logic
- Watches the live DSH session list for approval requests
- Shows a right-bottom toast on the approval edge
- Sends a browser notification when permission is granted
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

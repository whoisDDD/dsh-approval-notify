# @linxin666/dsh-client-ui-approval-notify

English | [中文](README.zh.md)

Minimal DSH web GUI plugin that watches the session list for a new approval request and shows a right-bottom toast. If the browser notification permission is available, it can also send a system notification.

## What it does

- Watches the active DSH session list for `pendingInteraction === 'approval'`.
- Shows a right-bottom toast when a new approval request appears.
- Optionally sends a browser notification when permission is granted.

## What it does not do

- It does not change the DSH approval protocol.
- It does not add any dependencies beyond the DSH client runtime.
- It does not depend on `dsh-web-ui-all`.

## Install

### From the repository

```sh
git clone https://github.com/zhu1090093659/dsh-web-ui.git
cd dsh-web-ui
pnpm install
pnpm -C packages/approval-notify build
dsh plugin --profile web add link:$(pwd)/packages/approval-notify
```

## License

BSD-3-Clause.

# @whoisDDD/dsh-approval-notify

[English](README.md) | 中文

一个最小化的 DSH Web GUI 审批提醒插件。

它会监听会话列表里的 `pendingInteraction === 'approval'`，在右下角弹出 toast；如果浏览器通知权限可用，也会发送浏览器通知。

## 特点

- 纯浏览器侧，不做 host 半区逻辑
- 监听 DSH 当前会话列表里的审批请求
- 审批请求出现时弹出右下角 toast
- 浏览器已授权时发送通知
- 不依赖 `dsh-web-ui-all`

## 安装

```sh
git clone https://github.com/whoisDDD/dsh-approval-notify.git
cd dsh-approval-notify
pnpm install
pnpm build
dsh plugin --profile web add link:$(pwd)
```

## 许可证

BSD-3-Clause。

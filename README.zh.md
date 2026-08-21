# @whoisDDD/dsh-approval-notify

[English](README.md) | 中文

一个最小化的 DSH Web GUI 审批、提问、计划审核和后台完成提醒插件。

它会监听会话列表里的 `approval`、`question`、`plan-review` 和 `completed` 状态。插件会优先尝试浏览器原生通知；浏览器获得通知权限后，这条路径可以触发 Windows 系统通知。如果浏览器通知不可用或创建失败，再回退为更大的、会堆叠的右下角 toast 提醒面板。

## 特点

- 纯浏览器侧，不做 host 半区逻辑
- 监听 DSH 当前会话列表里的 pending interaction 和后台完成状态
- 优先浏览器原生通知，失败后回退 toast
- 审批、提问、计划审核、已完成使用不同标题
- 更大的 toast 提醒面板，保留时间更长，支持多条堆叠
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

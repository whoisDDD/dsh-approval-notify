# @linxin666/dsh-client-ui-approval-notify

[English](README.md) | 中文

最小化的 DSH Web GUI 插件：监听会话列表里的审批请求，在右下角弹出 toast；如果浏览器通知权限可用，也会发送系统通知。

## 它做什么

- 监听 DSH 当前会话列表中 `pendingInteraction === 'approval'` 的变化。
- 当新的审批请求出现时，显示右下角 toast。
- 如果浏览器已授权通知，也会尝试发送系统通知。

## 它不做什么

- 不修改 DSH 的审批协议。
- 不引入除 DSH client runtime 之外的新依赖。
- 不依赖 `dsh-web-ui-all`。

## 安装

### 从仓库安装

```sh
git clone https://github.com/zhu1090093659/dsh-web-ui.git
cd dsh-web-ui
pnpm install
pnpm -C packages/approval-notify build
dsh plugin --profile web add link:$(pwd)/packages/approval-notify
```

## 许可证

BSD-3-Clause。

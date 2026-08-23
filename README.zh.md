# @whoisddd/dsh-approval-notify

[English](README.md) | 中文

一个最小化、纯浏览器侧的 DSH Web GUI 提醒插件：当会话需要处理，或后台会话完成时提醒你。

插件监听 DSH 实时会话列表，优先使用浏览器原生通知；如果浏览器通知不可用或创建失败，则回退为更大的右下角堆叠 toast。浏览器通知获得授权后，在 Windows 上会进入系统通知中心。

## 会提醒哪些状态

| DSH 状态 | 通知标题 | 说明 |
| --- | --- | --- |
| `approval` | 审批请求 | 会话正在等待审批决定。 |
| `question` | 提问请求 | 会话正在等待用户选择或回答。 |
| `plan-review` | 计划审核 | 会话正在等待计划确认。 |
| `completed` | 已完成 | 顶层后台会话已完成。 |
| 子代理的 `completed` | 子代理已完成 | 子代理/后台子会话已完成。 |

## 特点

- 纯浏览器侧；host 半区故意保持空实现。
- 监听 DSH 实时会话列表，不依赖 `dsh-web-ui-all`。
- 优先浏览器原生通知，并设置 `requireInteraction: true`。
- 浏览器通知失败时回退为更大的右下角 toast 面板。
- 支持多条 fallback toast 堆叠显示。
- 对未变化的待处理/已完成状态去重，避免同一状态重复提醒。
- 子代理完成与顶层会话完成使用不同标题，便于区分。

## 安装

```sh
git clone https://github.com/whoisDDD/dsh-approval-notify.git
cd dsh-approval-notify
pnpm install
pnpm build
dsh plugin --profile web add link:$(pwd)
```

安装后刷新 DSH Web GUI 页面。首次加载时浏览器可能会请求通知权限；如果权限被拒绝，或浏览器原生通知创建失败，插件仍会显示页面内 toast 提醒。

## 开发

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

常用脚本：

- `pnpm test`：运行全部 Vitest 测试。
- `pnpm test:notify`：运行核心通知行为测试。
- `pnpm typecheck`：运行 TypeScript 类型检查。
- `pnpm build`：生成 `lib/` 产物。
- `pnpm watch`：开发时监听并重建客户端 bundle。

## 说明与限制

- 插件目前还没有设置面板。
- 通知是否能进入系统通知中心，取决于浏览器权限和操作系统通知策略。
- 已完成提醒基于 DSH 的 `completed` summary 标记。顶层会话和子代理都会提醒，但子代理使用独立标题。

## 许可证

BSD-3-Clause。

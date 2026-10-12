# @whoisddd/dsh-approval-notify

[English](README.md) | 中文

纯浏览器侧 DSH Web 通知插件：提醒审批、提问、计划审核，以及未读的后台会话完成事件。

## 兼容性与通知语义

0.2.0 以 **DSH 0.2.1-alpha.1** 为适配目标。会话标签来自公开的 `sessions.list`；通知状态来自 `uiSession.sessionStatus`：

| 状态 | 通知 | 触发条件 |
| --- | --- | --- |
| `pendingInteraction.kind = approval` | 审批请求 | 等待审批决定 |
| `pendingInteraction.kind = question` | 提问请求 | 等待用户选择或回答 |
| `pendingInteraction.kind = plan-review` | 计划审核 | 等待计划确认 |
| `completionUnread = true` | 已完成 / 子代理已完成 | 后台会话停止且尚未确认 |

- 不再读取已移除的 `uiSession.pendingInteractions` 或 `SessionSummary.completed`。此版本不兼容旧的 DSH 0.1.2-alpha.2。
- 完成提醒遵循 DSH 的未读策略：不会因打开页面就把历史闲置会话当成刚完成；正在主视图查看的会话由 DSH 自动确认。提醒表示后台会话停止，不保证任务成功。
- 优先浏览器原生通知，设置 `requireInteraction: true`；未授权、不支持或创建失败时使用右下角堆叠 toast。Windows 原生通知取决于浏览器与系统通知策略。
- 相同请求 key 和未变化的完成状态不会重复提示；新请求、确认后再次完成可以重新提示。
- 观察 `byId` 中的子代理，即使它不在 Host 会话目录的 `ids` 中；子代理有独立通知标题。
- 未知交互类型安全忽略。通知内容仅包含会话标题和固定状态文字，常见密钥形态会脱敏。
- 订阅、去重记录、定时器与 toast 按客户端上下文独立管理；卸载不会删除其他上下文的 toast。
- 开发类型和真实服务测试固定为 0.2.1-alpha.1；其他版本需另行验证。

## 安装

```sh
git clone https://github.com/whoisDDD/dsh-approval-notify.git
cd dsh-approval-notify
pnpm install --frozen-lockfile
pnpm build
dsh plugin --profile web add link:$(pwd)
```

安装后重启 `dsh web` 并刷新页面。首次加载可能请求通知权限；未获得原生通知权限时，toast 仍可使用。Host 半端为空，不注册网络接口。

## 开发与验证

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
```

- `pnpm test`：核心状态、浏览器通知/降级、生命周期、生成 bundle 与实际发布的 UiSession 服务集成测试；修改源码后先构建。
- `pnpm test:notify`：核心通知行为测试。
- `pnpm watch`：开发期间重建 bundle。

真实服务集成测试使用 fixture 远程事件，不请求模型 API，不读取真实凭据；它不等同于操作系统通知中心的人工验证。

## 限制

尚无设置界面。通知能否送达取决于浏览器权限、浏览器对后台标签的限制及系统通知策略。

## 许可证

BSD-3-Clause。

# Changelog

All notable changes to this project are documented here. / 本项目的所有重要变更均记录于此。

## [0.2.0] — 2026-10-12

### Changed / 变更

- Migrated to DSH 0.2.1-alpha.1's unified `uiSession.sessionStatus` (`pendingInteraction`, `completionUnread`, `running`), replacing removed `pendingInteractions` and `SessionSummary.completed` fields.
- 适配 DSH 0.2.1-alpha.1 统一状态源；完成提示遵循未读后台停止语义，避免历史闲置会话误报。
- Include retained subagent metadata in `byId` even outside catalog `ids`; keep request-key deduplication, pending-request precedence, unknown-kind handling, and redacted labels.
- 覆盖目录之外的保留子代理；保留请求 key 去重、交互优先级、未知类型安全处理和标题脱敏。

### Fixed / 修复

- Keep notification state and timers per Client context; unloading one context only removes its own toasts. Prevent late asynchronous notification delivery after disposal.
- 通知状态、定时器按上下文独立管理，卸载只清理自己的 toast；卸载后异步权限响应不会触发提醒。
- Catch synchronous notification-permission failures. Show toast immediately while permission is ungranted, even when the permission prompt never settles; native delivery resumes for later alerts after permission is granted.
- 实际测试发现权限请求不结束会卡住提醒；改为未授权时立即 toast 降级，不再等待权限弹窗返回。
- Added delivery diagnostics with fixed notification titles only, without session labels or credentials.
- 捕获权限请求同步异常，保留 toast 降级。
- Updated pinned DSH development dependencies and lockfile; added missing `unrun` build-config loader and published-service test dependencies; regenerated shipped bundles/declarations.
- 更新固定开发依赖、锁文件、构建配置加载依赖与发布产物。

### Verification / 验证

- Passed 34 tests, typecheck and build. Local DSH 0.2.1-alpha.1 daily Web profile was installed and tested with real model calls. The user confirmed receiving native question, approval and background-completion notifications.
- 34 项测试、类型检查和构建通过；已安装到本机日常 Web profile，真实模型触发提问、审批与后台完成事件，用户确认三类系统通知实际送达。
- Added unified-status core/browser tests and shipped-bundle integration with the published UiSession service using fixture pending domains and remote running events; added CI for typecheck, build, tests and artifact consistency.
- 新增统一状态、浏览器行为和实际发布 UiSession 服务集成测试，以及类型检查、构建、测试与产物一致性 CI。

## DSH `0.1.2-alpha.2` compatibility update — 2026-09-01
## DSH `0.1.2-alpha.2` 兼容性更新 — 2026-09-01

### Fixed / 修复

- Replaced the removed `@deepseek-ai/dsh-client-runtime` type/runtime contract with alpha.2's `@deepseek-ai/dsh-api-session-controller/client` and `@deepseek-ai/dsh-client-ui-session/client` services.
- 将已移除的 `@deepseek-ai/dsh-client-runtime` 类型/运行时契约替换为 alpha.2 的 `@deepseek-ai/dsh-api-session-controller/client` 和 `@deepseek-ai/dsh-client-ui-session/client` 服务。

- Restored approval, question, and plan-review notifications by reading `uiSession.pendingInteractions`; completed-session notifications continue to use `SessionSummary.completed`.
- 改为读取 `uiSession.pendingInteractions`，恢复审批、提问和计划审核通知；完成会话通知继续使用 `SessionSummary.completed`。

- Declared the actual Client services (`sessions`, `uiSession`) and their module-graph providers in `dsh.client` metadata.
- 在 `dsh.client` 元数据中声明实际使用的 Client 服务（`sessions`、`uiSession`）及其模块图提供方。

- Preserved native notification delivery, toast fallback, stacked reminders, subagent completion notices, and disposal cleanup.
- 保留浏览器原生通知、toast 降级、多条提醒堆叠、子代理完成提示以及插件销毁清理逻辑。

- Added request-key deduplication, safe handling of unknown interaction kinds, asynchronous disposal guards, and notification text redaction for common secret-shaped values.
- 增加基于请求 key 的去重、未知 interaction kind 的安全处理、异步销毁保护，以及常见密钥形态通知文本的脱敏。

### Verification / 验证

- Added alpha.2 contract, lifecycle, fallback, deduplication, and sensitive-content tests.
- 增加 alpha.2 契约、生命周期、降级、去重和敏感内容测试。

- Verified the generated `./client` bundle, TypeScript declarations, entrypoint syntax, and diff whitespace.
- 已验证生成的 `./client` bundle、TypeScript 类型声明、入口语法和 diff 空白格式。

## Unreleased / 未发布

### Added / 新增

- Native browser notifications for DSH attention states, with Windows system notification support when the browser has permission.
- DSH 需要处理的状态支持浏览器原生通知；获得浏览器授权后，Windows 支持系统通知中心提示。

- Stacked right-bottom toast fallback when native notifications are unavailable or fail.
- 浏览器原生通知不可用或创建失败时，提供右下角堆叠 toast 降级。

- Reminder coverage for `approval`, `question`, `plan-review`, and `completed` session states.
- 覆盖 `approval`、`question`、`plan-review` 和 `completed` 会话状态提醒。

- Distinct completed titles for top-level sessions (`已完成`) and subagents (`子代理已完成`).
- 顶层会话（`已完成`）和子代理（`子代理已完成`）使用不同的完成通知标题。

- Browser integration tests covering native notification delivery, toast fallback, stacked toasts, and deduplication.
- 增加覆盖原生通知、toast 降级、toast 堆叠和去重的浏览器集成测试。

- Core notification behavior tests.
- 增加核心通知行为测试。

### Changed / 变更

- Expanded the package from approval-only reminders to broader session attention reminders.
- 将插件从仅支持审批提醒扩展为更广泛的会话处理提醒。

- Updated README documentation in English and Chinese.
- 更新中英文 README 文档。

### Notes / 说明

- The plugin remains browser-only; the host half intentionally does nothing.
- 插件仍然是纯浏览器侧插件；host 半区有意保持空实现。

- There is no settings UI yet.
- 当前还没有设置面板。

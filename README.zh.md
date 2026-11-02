# @whoisddd/dsh-approval-notify

[English](README.md) | 中文

纯浏览器侧 DSH Web 通知插件：提醒审批、提问、计划审核，以及未读的后台会话完成事件。

## 兼容性与通知语义

0.2.1 以 **DSH 0.2.1-alpha.1** 为适配目标。会话标签来自公开的 `sessions.list`；通知状态来自 `uiSession.sessionStatus`：

| 状态 | 通知 | 触发条件 |
| --- | --- | --- |
| `pendingInteraction.kind = approval` | 审批请求 | 等待审批决定 |
| `pendingInteraction.kind = question` | 提问请求 | 等待用户选择或回答 |
| `pendingInteraction.kind = plan-review` | 计划审核 | 等待计划确认 |
| `completionUnread = true` | 已完成 / 子代理已完成 | 后台会话停止且尚未确认 |

- 不再读取已移除的 `uiSession.pendingInteractions` 或 `SessionSummary.completed`。此版本不兼容旧的 DSH 0.1.2-alpha.2。
- 完成提醒遵循 DSH 的未读策略：不会因打开页面就把历史闲置会话当成刚完成；正在主视图查看的会话由 DSH 自动确认。提醒表示后台会话停止，不保证任务成功。
- 优先浏览器原生通知，设置 `requireInteraction: true`；未授权、不支持或创建失败时使用右下角堆叠 toast。Windows 原生通知取决于浏览器与系统通知策略。
- 点击原生通知或备用 toast 可通过 DSH 的 `uiWorkspace.openSession` 打开对应会话；toast 也支持键盘 Enter 或空格。网页尝试激活原窗口，是否成功由浏览器、桌面应用和操作系统决定。通知产生的页面必须仍然存活；已归档或不可用的会话可能无法打开。
- 使用状态订阅驱动检查，不再进行 1.5 秒固定轮询。通知仍依赖 DSH 正确发布状态及断线重连后的请求重放。
- 相同请求 key 和未变化的完成状态不会重复提示；新请求、确认后再次完成可以重新提示。
- 观察 `byId` 中的子代理，即使它不在 Host 会话目录的 `ids` 中；子代理有独立通知标题。
- 未知交互类型安全忽略。通知内容仅包含会话标题和固定状态文字，常见密钥形态会脱敏。
- 订阅、去重记录、定时器与 toast 按客户端上下文独立管理；卸载不会删除其他上下文的 toast。
- 开发类型和发布版 UiSession 服务测试固定为 0.2.1-alpha.1；其他版本需另行验证。

## 安装

```sh
git clone https://github.com/whoisDDD/dsh-approval-notify.git
cd dsh-approval-notify
pnpm install --frozen-lockfile
pnpm build
dsh plugin --profile web add link:$(pwd)
```

安装后重启 `dsh web` 并刷新页面。首次加载可能请求通知权限；未获得原生通知权限时立即显示 toast，即使权限弹窗一直未返回也不会阻塞提醒。Host 半端为空，不注册网络接口。

### 桌面端与 Web 的 profile

DSH 官方桌面端使用独立的 `desktop` profile；桌面界面使用 Web 技术并不意味着它读取 `web` profile。只在 `web` 中安装或更换本插件，不会自动更改桌面端的插件配置。对于 DSH 0.2.1-alpha.1 和 0.2.2-alpha.2，默认目录分别是 `~/.dsh/profiles/desktop` 与 `~/.dsh/profiles/web`；若桌面进程设置了 `DSH_HOME`，则以该进程的实际值为准。

安装到桌面端前，先至少启动一次桌面应用初始化 profile，并完全退出应用及其 Host。在插件目录中，Windows PowerShell 下例如：

```powershell
$pluginPath = (Get-Location).Path
dsh plugin --profile desktop add "link:$pluginPath"
```

这是修改桌面 profile 的安装操作。保留现有 profile 备份，检查所用 DSH CLI 的版本、用户及 `DSH_HOME` 与桌面进程一致；不要在仍有任务运行时强制结束 Host。安装后重启桌面端，以启动日志和实际收到的 JavaScript 确认版本。

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

运行版本排查：启用插件后，控制台应显示 `[approval-notify] loaded (session-navigation, event-driven)`；点击系统通知后应显示 `native notification clicked`，导航接口调用返回后显示 `session navigation requested`。这些日志不包含会话标题或 ID；最后一条只表示调用已发出，不保证页面已切换或窗口已置顶。若仍看到旧版 `loaded` 日志，应检查实际运行的 Host/profile 和它加载的插件，而不是仅凭源码映射行号判断。

仓库通过 `.gitattributes` 固定 TypeScript 源码和构建产物为 LF，避免 Windows 的 CRLF 被写入 source map。已有工作区在拉取更新后应先确认无本地修改，再按 Git 换行规则重新检出受影响文件；不要直接覆盖未提交的修改。

## 限制

尚无设置界面。通知能否送达取决于浏览器权限、浏览器对后台标签的限制及系统通知策略。

- 在 Windows 10 22H2、DSH Desktop 0.2.1-rc.5 的一次实机测试中，点击提问通知可切换到对应会话；窗口最小化时未自动恢复，手动恢复后会话已切换。窗口激活行为取决于宿主和操作系统，不保证所有场景均可唤起窗口。
- 此次实机测试未完成审批、计划审核、toast 降级、后台完成提醒及断线重连的回归；Linux 和浏览器窗口激活尚未实机验证。自动审查若在请求出现后立即处理，请求可能来不及产生提醒。

## 许可证

BSD-3-Clause。


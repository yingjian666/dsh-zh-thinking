# dsh-zh-thinking

⭐ **如果这个插件帮到了你，欢迎点个 [Star](https://github.com/yingjian666/dsh-zh-thinking) 支持一下** —— 一个星标就是对作者最直接的鼓励。

让 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 里 Agent 的**内部思考过程**——思维链（chain-of-thought）、逐步规划、工具调用前后的推理、自我审查——始终使用**简体中文**的宿主插件（host plugin）。

> **声明**：本项目参考 / 灵感来自 [wodongx123/dsh-language-control](https://github.com/wodongx123/dsh-language-control)（其 npm 包为 `@deepseek-ai/dsh-language-control`），在其「让 Agent 用中文思考」的思路基础上**独立重写**，并解决了本地目录挂载时的依赖加载问题。两者的关系与差异见下文「[与原插件的关系](#与原插件的关系)」。

---

## 为什么会有这个插件

DeepSeek 这类推理模型，其「思考」由同一份系统提示词（system prompt）驱动。当工具返回英文内容（例如网页抓取、文档、报错信息）时，Agent 的思维链容易发生**语言漂移（language drift）**——思考逐步切到英文，导致后续推理与最终回答的语言不稳定。

本插件在启动时向系统提示词注册一段「必须用简体中文思考」的规则，让模型的内部思考保持中文，而最终回答是否默认中文则交给模型自身判断（可保留英文专有名词、代码标识符等）。

## 与原插件的关系

| 维度 | 原插件 `@deepseek-ai/dsh-language-control` | 本插件 `dsh-zh-thinking` |
|---|---|---|
| 注入机制 | `systemPrompt.section()`，order `-200`（最顶部） | `systemPrompt.section()`，order `20`（persona 之后） |
| 外部依赖 | 有 peer 依赖（`@deepseek-ai/cordis`、`@deepseek-ai/dsh-host-webserver`） | **零外部依赖**，只依赖 cordis 运行时注入的 `ctx` |
| 设置面板 | 有（HTTP 路由 + 客户端注入可视化面板） | 无（极简，见[配置](#配置)） |
| 安装方式 | 必须经 npm（`dsh plugin add @deepseek-ai/dsh-language-control`） | 任意目录 `link:` 本地挂载或 GitHub 安装即可，无需发布 npm（DSH 4.1+ 的安装注意事项见[兼容性](#兼容性)） |

**相对原插件主要优化 / 解决的问题：**

1. **零外部依赖，规避「本地目录挂载崩溃」**。当插件通过 `link:` 从 profile / app 的 `node_modules` 树之外的目录挂载时，Node 无法解析插件自身 `import` 的 npm 包（如 `schemastery`），会导致整棵插件树加载失败（fatal plugin-tree load failure）。本插件不 `import` 任何第三方包，只使用宿主运行时提供的服务，因此从任意路径挂载都能正常加载。
2. **不依赖 npm 发布**。原插件必须先从 npm 安装（且易因包名带不带 `@deepseek-ai/` scope 而装错）；本插件 `git clone` 后即可本地 `link:` 挂载。
3. **极简、易读易审**。单文件、几十行代码，无 HTTP 路由、无客户端面板，行为一目了然。

## 功能特性

- 中文思考强制：链式推理、规划、工具调用推理、内部思考全部要求使用简体中文
- 注入位置固定在 persona 之后，稳定可预期
- 生命周期自动回收：插件卸载 / 上下文停止时干净地移除注册的 section
- 零依赖、零配置、即装即用

## 兼容性

| DSH 内核（`@deepseek-ai/dsh-system-prompt`） | 状态 |
|---|---|
| `0.1.1-rc.1` … `0.1.5.x` | 兼容（最初的目标版本） |
| `0.1.6-alpha.1`（DSH Desktop 4.1.0） | **兼容，已在真实内核上实测** |

`section({ name, order, text })` 的契约在 `0.1.6-alpha.1` 上没有变化；`package.json` 的 `peerDependencies` 与 `dsh.compatibility.runtime` 已声明为 `>=0.1.1-rc.1 <0.2.0`。仓库自带一个真实内核冒烟测试：

```sh
node test/kernel-smoke.mjs "<DSH 的 node_modules 绝对路径>"
# Windows 默认值：C:\Program Files\DeepSeek Harness Desktop\resources\app.asar.unpacked\node_modules
```

它会加载真实的 `@deepseek-ai/cordis` + `@deepseek-ai/dsh-system-prompt`，挂载本插件并断言 `language:zh-thinking` 段出现在 `assemble()` 结果中。

### 为什么 peer 依赖标了 `optional`

Desktop 4.1 的兼容性诊断（`desktop-plugins.lock.json` / 启动日志的 `[plugins] compatibility diagnostic`）会用**应用侧**的模块锚点去解析插件的 `peerDependencies`。`@deepseek-ai/cordis`、`@deepseek-ai/dsh-system-prompt` 这类随 Desktop 一起打包的核心包在它的解析链上取不到版本，于是只要把它们声明成**必需** peer，就会被判成：

```json
{ "status": "incompatible", "reasons": [
  { "code": "peer-missing", "subject": "@deepseek-ai/cordis", "required": "^4.0.1" },
  { "code": "peer-missing", "subject": "@deepseek-ai/dsh-system-prompt", "required": "^0.1.1-rc.1 || ^0.1.5-alpha.1 || ^0.1.6-alpha.1" }
] }
```

标成 `optional` 后：解析得到版本时仍按 semver 范围判定；解析不到时跳过该项，兼容性证据改由 `dsh.compatibility.runtime` 提供（本插件声明为 `>=0.1.1-rc.1 <0.2.0`，对 `0.1.6-alpha.1` 判定通过）。插件真正的运行时契约由 cordis 的 `inject = ["systemPrompt"]` 强制，不会因为标了 optional 而失效。

## 安装

本插件未发布到 npm，请用「本地目录」或「GitHub」方式安装。

### DSH Desktop 4.1+ / 内核 0.1.6-alpha.1

新版 Desktop 把用户主目录从 `~/.dsh` 迁移到了 `~/.dsh-community`，并且**旧插件恢复只接受精确 npm 版本或带 commit 的 GitHub 来源**：`link:` 本地目录不会自动恢复，插件会在恢复列表里显示为 `failed`（`failureCategory: legacy-source-unsupported`，错误「旧插件来源不是精确 NPM 版本或受支持的 GitHub 来源」）。也就是说，这类插件在升级后**掉线是迁移策略导致的，不是代码不兼容**，重新挂载即可。

`desktop` profile 由 Electron 独占管理，官方 CLI 会直接拒绝：

```text
error: profile "desktop" is managed exclusively by the Electron application
```

所以 Desktop 用户请走 GUI 重新安装：

1. 打开 **设置 → 插件 → 从其他来源安装**；
2. 来源填本仓库目录（如 `H:\个人聊天文件\dsh-zh-thinking`）或先打成 `.tgz`；
3. 按提示确认该来源为**全权访问**（本地代码由你本人审计），确认安装；
4. **重启 DSH**（宿主插件在启动时挂载）。

Desktop 内置「插件市场」通道只接受 npm 包（`name@version`），本地目录 / GitHub 不在其中。

非 `desktop` 的 profile（`web` / `tui` / 自建 profile）才可以用 CLI：

```sh
# 本地目录
dsh plugin --profile <name> add link:<克隆后的绝对路径>

# 或 GitHub（本仓库已提交可直接加载的 lib/，无需构建）
dsh plugin --profile <name> add github:yingjian666/dsh-zh-thinking
```

`dsh plugin` 是 pnpm 的薄封装：它在 profile 目录里执行安装，并把声明了 `dsh.bundle` 的依赖自动追加到 `dsh.profile.bundles`。

> ⚠️ Windows 上路径含中文或空格时，`dsh plugin ... add link:<路径>` 会因为中间经过一次 `cmd.exe` 解析而在 profile 的 `package.json` 里记成乱码 spec（`node_modules` 链接本身通常是对的）。遇到这种情况请改用 GUI 通道。

启用后**重载 / 重启 DSH**。随后新开一段需要思考的对话，观察思考块是否全程中文即可验证。

> **在「梁神模式」等两阶段锚定 preset 下**：首轮（锚定阶段）`tool-bootstrap` 会把提示词过滤成只剩 persona 段，本插件的段落同样会被过滤掉，晋升（promotion）后自动恢复——这是 preset 的锚定行为，不是插件失效。用普通「标准模式」会话即可直接验证。

### 旧版 DSH（3.x 及更早）

在 GUI 的 Plugin Manager 里选择「从本地目录 / 本地文件夹添加」，指向仓库目录即可。

## 工作原理

DSH 把每条请求的系统提示词由一个 `systemPrompt` 注册表拼装。本插件在启动时调用 `ctx.systemPrompt.section(...)`，往提示词里插入一段「必须用简体中文思考」的规则（放在 persona 之后）。DeepSeek 推理模型的思考由同一份系统提示词驱动，因此该规则会作用到它的内部思考。

| 层 | 机制 |
|---|---|
| 注入时机 | `systemPrompt.section()`，随 `assemble()` 重新求值 |
| 注入位置 | order `20`，persona 段（order `0`）之后 |
| 宿主服务 | 仅 `ctx.systemPrompt`、`ctx.logger`、`ctx.effect` |

## 配置

当前版本为**零配置、固定行为**：始终注入中文思考规则，且不额外强制最终回答使用中文。

代码中预留了 `enabled` 与 `forceOutputZh` 两个开关的读取接口（`config?.enabled`、`config?.forceOutputZh`），但**尚未**定义配置 schema / 设置面板，因此暂不可在 GUI 中修改。若后续需要可配置化，请留意：引入 schema 类依赖（如 `schemastery`）会重新触发本地目录挂载时的依赖解析问题，需一并处理安装方式。

## 许可证 / 致谢

[MIT](./LICENSE) · Copyright (c) 2026 yingjian666

灵感与「中文思考」思路参考自 [wodongx123/dsh-language-control](https://github.com/wodongx123/dsh-language-control)（MIT License，Copyright (c) 2026 wodongx123），特此致谢。

# dsh-zh-thinking

⭐ **如果这个插件帮到了你，欢迎点个 [Star](https://github.com/yingjian666/dsh-zh-thinking) 支持一下** —— 一个星标就是对作者最直接的鼓励。

> **项目状态**：这是一次个人学习性质的尝试，作者**不承诺持续维护**。
> 如果将来 DSH 内核升级导致它失效，欢迎自行 fork 修改——
> 逻辑只有一个文件 `lib/index.js`，做的事就是往系统提示词里注册一段「用简体中文思考」的要求。

让 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 里 Agent 的**内部思考过程**——思维链（chain-of-thought）、逐步规划、工具调用前后的推理、自我审查——始终使用**简体中文**的宿主插件（host plugin）。

> **声明**：本项目参考 / 灵感来自 [wodongx123/dsh-language-control](https://github.com/wodongx123/dsh-language-control)（其 npm 包为 `@deepseek-ai/dsh-language-control`），在其「让 Agent 用中文思考」的思路基础上**独立重写**，并解决了本地目录挂载时的依赖加载问题。两者的关系与差异见下文「[与原插件的关系](#与原插件的关系)」。

---

## 快速安装（DSH Desktop 4.1+）

**设置 → 插件 → 从其他来源安装**：

| 字段 | 填什么 |
|---|---|
| 插件来源 | `github:yingjian666/dsh-zh-thinking` |
| 高级选项 | ✅ 勾选「这是来自本地、Git 或其他外部来源的高级插件」 |

确认该来源为**全权访问** → 安装 → **重启 DSH**。

不需要 npm 账号，也不需要手工建目录链接。

> 连不上 GitHub？直接下载[打包好的 `.tgz`](https://github.com/yingjian666/dsh-zh-thinking/releases/latest) 再填文件路径即可（**同样要勾选那个复选框**）。细节见[安装](#安装)。

## 为什么会有这个插件

DeepSeek 这类推理模型，其「思考」由同一份系统提示词（system prompt）驱动。当工具返回英文内容（例如网页抓取、文档、报错信息）时，Agent 的思维链容易发生**语言漂移（language drift）**——思考逐步切到英文，导致后续推理与最终回答的语言不稳定。

本插件在启动时向系统提示词注册一段「必须用简体中文思考」的规则，让模型的内部思考保持中文，而最终回答是否默认中文则交给模型自身判断（可保留英文专有名词、代码标识符等）。

## 与原插件的关系

| 维度 | 原插件 `@deepseek-ai/dsh-language-control` | 本插件 `dsh-zh-thinking` |
|---|---|---|
| 注入机制 | `systemPrompt.section()`，order `-200`（最顶部） | `systemPrompt.section()`，order `20`（persona 之后） |
| 外部依赖 | 有 peer 依赖（`@deepseek-ai/cordis`、`@deepseek-ai/dsh-host-webserver`） | **零外部依赖**，只依赖 cordis 运行时注入的 `ctx` |
| 设置面板 | 有（HTTP 路由 + 客户端注入可视化面板） | 无（极简，见[配置](#配置)） |
| 安装方式 | 必须经 npm（`dsh plugin add @deepseek-ai/dsh-language-control`） | GitHub / 本地目录 / `.tgz` 均可，**无需发布 npm** |

**相对原插件主要优化 / 解决的问题：**

1. **零外部依赖，规避「本地目录挂载崩溃」**。当插件通过 `link:` 从 profile / app 的 `node_modules` 树之外的目录挂载时，Node 无法解析插件自身 `import` 的 npm 包（如 `schemastery`），会导致整棵插件树加载失败（fatal plugin-tree load failure）。本插件不 `import` 任何第三方包，只使用宿主运行时提供的服务，因此从任意路径挂载都能正常加载。
2. **不依赖 npm 发布**。原插件必须先从 npm 安装（且易因包名带不带 `@deepseek-ai/` scope 而装错）；本插件 `git clone` 后即可本地挂载，或直接从 GitHub 安装。
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

插件未发布到 npm。下面方式 1 / 2 都**不需要 npm 账号**，也不用手工建目录链接。

装完都要**重启 DSH**（宿主插件在启动时挂载），然后新开一个普通「标准模式」会话验证：思考块应全程简体中文。

> **在「梁神模式」等两阶段锚定 preset 下**：首轮（锚定阶段）`tool-bootstrap` 会把提示词过滤成只剩 persona 段，本插件的段落同样被过滤，晋升（promotion）后自动恢复——这是 preset 的锚定行为，不是插件失效。用普通「标准模式」会话验证即可。

### 1. DSH Desktop 4.1+：一条 spec + 一个勾选（推荐）

**设置 → 插件 → 从其他来源安装**：

| 字段 | 填什么 |
|---|---|
| 插件来源 | `github:yingjian666/dsh-zh-thinking` |
| 高级选项 | ✅ 勾选「这是来自本地、Git 或其他外部来源的高级插件」 |

按提示确认该来源为**全权访问**（外部代码由你本人审计），确认安装，然后重启 DSH。

- **那个勾选是必需的**：不勾时走的是 npm registry 通道，只认 `包名@版本`；勾上才走 full-access 外部来源通道，它接受 `github:` / `gitlab:` / `git+https:` / 本地目录 / `.tgz` / 裸包名。
- 想锁定到确定的版本，把 commit 写进 spec：
  `github:yingjian666/dsh-zh-thinking#584a1c8970a47f3843d3aac3ba5cb63d10cec3fe`
  带 40 位 commit 的形式还能在 DSH 下次迁移主目录时被「旧插件恢复」**自动接回**；裸 `owner/repo` 不行。
- 这一步需要能访问 GitHub；网络不通请用方式 2。

### 2. 离线 / 连不上 GitHub：下载打包好的 `.tgz`

不想装 git、也不想 clone 仓库的话，直接下载打好的包：

**https://github.com/yingjian666/dsh-zh-thinking/releases/latest/download/dsh-zh-thinking-0.1.1.tgz**

然后：**设置 → 插件 → 从其他来源安装** → 填这个 `.tgz` 的**绝对路径** → ✅ 勾选那个复选框 → 确认全权访问 → 重启 DSH。这条路完全不碰 npm 服务器。

`package.json` 的 `files` 白名单决定产物内容（`lib/`、`cordis.patch.yml`、README、LICENSE、package.json；测试不会被打包），所以想自己从源码打包也可以：

```sh
npm pack          # 或使用随 DSH 附带的 pnpm pack
# → dsh-zh-thinking-0.1.1.tgz
```

> 每个 Release 页面附有该 `.tgz` 的 SHA-256；下载后可用 `Get-FileHash <文件> -Algorithm SHA256`（Windows）或 `shasum -a 256 <文件>` 校验。

### 3. 其他 profile（`web` / `tui` / 自建）：用 CLI

`desktop` profile 由 Electron 独占管理，官方 CLI 会直接拒绝：

```text
error: profile "desktop" is managed exclusively by the Electron application
```

其余 profile 可以照常：

```sh
dsh plugin --profile <name> add github:yingjian666/dsh-zh-thinking
dsh plugin --profile <name> add link:<克隆后的绝对路径>
```

`dsh plugin` 是 pnpm 的薄封装：它在 profile 目录里执行安装，并把声明了 `dsh.bundle` 的依赖自动追加到 `dsh.profile.bundles`。

> ⚠️ Windows 上路径含中文或空格时，`dsh plugin ... add link:<路径>` 会因为中间经过一次 `cmd.exe` 解析而在 profile 的 `package.json` 里记成乱码 spec（`node_modules` 链接本身通常是对的）。遇到这种情况请改用 GUI 通道。

### 为什么「从哪装」很重要

DSH Desktop 4.0 → 4.1 把用户主目录从 `~/.dsh` 迁移到了 `~/.dsh-community`。迁移时的「旧插件恢复」只接受**精确 npm 版本**或**带 commit 的 GitHub 来源**——因为自动恢复必须能仅凭一个 spec 字符串把内容重新取回来：

| 安装来源 | 要 npm 账号 | 要联网 | DSH 迁移主目录时 |
|---|---|---|---|
| `github:…#<40 位 commit>` | ❌ | ✅ GitHub | ✅ 自动接回 |
| 本地目录 `link:` | ❌ | ❌ | ❌ 掉线，需重装 |
| 本地 `.tgz` | ❌ | ❌ | ❌ 掉线，需重装 |
| `包名@版本`（npm） | ✅ | ✅ registry | ✅ 自动接回 |

本地目录 / `.tgz` 装的插件在迁移后会被标记为 `failed`（`failureCategory: legacy-source-unsupported`，错误「旧插件来源不是精确 NPM 版本或受支持的 GitHub 来源」）——那是**来源不可寻址**，不是插件代码不兼容。

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

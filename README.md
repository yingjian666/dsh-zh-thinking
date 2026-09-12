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
| 安装方式 | 必须经 npm（`dsh plugin add @deepseek-ai/dsh-language-control`） | 任意目录 `link:` 本地挂载即可，无需发布 npm |

**相对原插件主要优化 / 解决的问题：**

1. **零外部依赖，规避「本地目录挂载崩溃」**。当插件通过 `link:` 从 profile / app 的 `node_modules` 树之外的目录挂载时，Node 无法解析插件自身 `import` 的 npm 包（如 `schemastery`），会导致整棵插件树加载失败（fatal plugin-tree load failure）。本插件不 `import` 任何第三方包，只使用宿主运行时提供的服务，因此从任意路径挂载都能正常加载。
2. **不依赖 npm 发布**。原插件必须先从 npm 安装（且易因包名带不带 `@deepseek-ai/` scope 而装错）；本插件 `git clone` 后即可本地 `link:` 挂载。
3. **极简、易读易审**。单文件、几十行代码，无 HTTP 路由、无客户端面板，行为一目了然。

## 功能特性

- 中文思考强制：链式推理、规划、工具调用推理、内部思考全部要求使用简体中文
- 注入位置固定在 persona 之后，稳定可预期
- 生命周期自动回收：插件卸载 / 上下文停止时干净地移除注册的 section
- 零依赖、零配置、即装即用

## 安装

本插件未发布到 npm，请用「本地目录」方式安装。

```sh
# 1. 克隆仓库
git clone https://github.com/yingjian666/dsh-zh-thinking.git

# 2. 以本地目录方式挂载（把 <路径> 换成克隆后的绝对路径）
dsh plugin --profile desktop add link:<克隆后的绝对路径>
```

或在 GUI 的 Plugin Manager 里选择「从本地目录 / 本地文件夹添加」，指向仓库目录。

启用后**重载 / 重启 DSH**（宿主插件在启动时挂载）。随后新开一段需要思考的对话，观察思考块是否全程中文即可验证。

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

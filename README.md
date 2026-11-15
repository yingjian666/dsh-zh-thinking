# dsh-zh-thinking

⭐ **如果这个插件帮到了你，欢迎点个 [Star](https://github.com/yingjian666/dsh-zh-thinking) 支持一下** —— 一个星标就是对作者最直接的鼓励。

> **项目状态**：这是一次个人学习性质的尝试，作者**不承诺持续维护**。
> 如果将来 DSH 内核升级导致它失效，欢迎自行 fork 修改——
> 逻辑只有一个文件 `lib/index.js`，做的事就是往系统提示词里注册一段「用简体中文思考」的要求。
>
> 📝 **历次「内核升级导致失效」的原因与修法都记在 [CHANGELOG.md](./CHANGELOG.md)**，
> 包括 0.2.0 那次被静默禁用的完整分析 —— 如果你的插件也遇到同样症状，可以直接对照。

让 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 里 Agent 的**内部思考过程**——思维链（chain-of-thought）、逐步规划、工具调用前后的推理、自我审查——始终使用**简体中文**的宿主插件（host plugin）。

> **声明**：本项目参考 / 灵感来自 [wodongx123/dsh-language-control](https://github.com/wodongx123/dsh-language-control)（其 `package.json` 声明了包名 `@deepseek-ai/dsh-language-control`，但**从未发布到 npm**，只能从 GitHub 安装），在其「让 Agent 用中文思考」的思路基础上**独立重写**，实现方式与原插件不同。两者的区别见下文「[与原插件的区别](#与原插件的区别)」。

---

## 装之前：建议先看一眼代码（约 3 分钟）

这不是客套话。装一个第三方插件，真正的风险不是"它可能有 bug"，而是"**你没法确认它没干别的**"。

所以建议你在装之前花几分钟看一眼：

1. 打开 [`lib/index.js`](./lib/index.js) —— **全文 73 行，不压缩、不混淆**
2. 你会看到它只做一件事：调用 `ctx.systemPrompt.section()`，往系统提示词里插入一段固定的中文段落
3. 没有网络请求、没有文件读写、没有子进程、没有 `eval`、没有动态 `import`

> 💡 **不需要用 AI 来审查。** 这 73 行里一半是注释，剩下的逻辑连十分钟都用不上 —— 用眼睛扫一遍就够了，**不消耗任何 token**。

DSH 的「从其他来源安装」会要求你确认该来源为**全权访问**。这个确认是有意义的：它等于把判断权交给你——所以先看一眼，再决定要不要给。

（顺带一提，这也是本插件坚持**零依赖**的原因：依赖越少，你要审的东西越少。）

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

## 与原插件的区别

本插件在 [wodongx123/dsh-language-control](https://github.com/wodongx123/dsh-language-control) 的思路基础上独立重写。两者做的事情相同，实现方式不同：

| 维度 | 原插件 | 本插件 |
|---|---|---|
| 注入机制 | `systemPrompt.section()` order `-200`（最顶部），另加一个 `systemPrompt.context()` 段 | 仅 `systemPrompt.section()`，order `20`（persona 之后） |
| 每轮系统提示注入 | 约 110 字 | 约 167 字 |
| 额外动态上下文 | 有：一段 `[Language Monitor]` 英文提示，作为运行时上下文在内容变化时插入一条 user 消息 | 无 |
| 外部依赖 | 2 个 peer 依赖（`@deepseek-ai/cordis`、`@deepseek-ai/dsh-host-webserver`） | 无 |
| 服务注入 | `['webServer', 'systemPrompt']` | `['systemPrompt']` |
| 设置面板 | 有（HTTP 路由 + 客户端面板，可在运行时改提示词文本） | 无（固定文本，改文本需改代码） |
| 客户端代码 | 有 `lib/client.js`（约 9.7KB） | 无 |
| 安装方式 | 从 GitHub 安装 | GitHub / 本地目录 / `.tgz` |
| npm 包名 | `@deepseek-ai/dsh-language-control`（未发布） | `dsh-zh-thinking`（未发布） |

几条差异各自的事实含义：

- **注入位置**：原插件在最顶部（order `-200`），本插件在 persona 之后（order `20`）。两者都在系统提示词内，区别只是相对位置。
- **字数**：本插件每轮多约 57 字，因为额外写明了「允许保留英文专有名词、代码标识符、用户原文」这些边界条件。如果你更在意每轮成本，可以自行删减 `GUIDANCE_ZH`。
- **依赖**：原插件声明了 `@deepseek-ai/dsh-host-webserver` 这个 peer。当插件通过 `link:` 从 `node_modules` 树之外的目录挂载时，Node 可能解析不到插件自身 `import` 的包，导致整棵插件树加载失败。本插件不 `import` 任何第三方包。
- **服务注入**：原插件 inject 了 `webServer`，在没有 Web 组件的 composition（如 `dsh-tui`、headless）里不会加载；本插件只 inject `systemPrompt`。
- **可配置性**：原插件有设置面板，能在运行时改提示词；本插件是固定文本。

## 功能特性

- 中文思考强制：链式推理、规划、工具调用推理、内部思考全部要求使用简体中文
- 注入位置固定在 persona 之后，稳定可预期
- 生命周期自动回收：插件卸载 / 上下文停止时干净地移除注册的 section
- 零依赖、零配置、即装即用

## ⚠️ 关于「思维链复读」：不是本插件导致的，但建议降低思考档位

> 如果你在长会话里看到模型反复输出同一句短话（「做。」「好。」「（输出。）」连续几十上百次），
> 或者**思考了很久却没有任何回复、界面却显示「已完成」**——这是模型侧的已知问题。
> 就目前能拿到的证据看，**它不是本插件造成的**。但本插件可能让它的表现更明显。
> 这一节把话说清楚，也给出缓解办法。

### 现象长什么样

两种都有，用户侧的体验完全不同：

| 形态 | 表现 | 用户感受 |
|---|---|---|
| **复读** | 思维链里同一句短话重复几十到几万次，正文可能正常 | 参数白烧，但至少还有回答 |
| **空完成** | 思维链写满，正文和工具调用都是空的，`finish_reason` 却是 `stop` | **界面显示「已完成」，但什么都没有** |

第二种尤其隐蔽：客户端收到的是"正常结束"，所以它照实显示「已完成」，没有任何报错。

### 为什么说不像本插件导致的

三条，按证据强度排：

1. **代码层面做不到。** 本插件全文 73 行，只做一件事：调用 `ctx.systemPrompt.section()` 往系统提示词里插入一段固定文本。它**不参与生成**、不接触 token 流、不修改采样参数、不影响终止条件。它连"模型正在生成"这件事都感知不到。
2. **时间线对不上。** 该问题最早的公开报告是 [DeepSeek-V3 #1550](https://github.com/deepseek-ai/DeepSeek-V3/issues/1550)（**2026-08-07**），发生在 DeepSeek **网页版**——连 DSH 都没有，更没有任何插件。本插件首次提交是 **2026-09-06**，晚了一个月。
3. **换语言也复现。** [deepseek-recipe #24](https://github.com/deepseek-ai/deepseek-recipe/issues/24) 记录了纯英文环境的同类现象（`Writing.` / `Go.` / `OK.`），说明它与「中文」这个设定无关。

官方仓库里还有一批同源报告：[#1587](https://github.com/deepseek-ai/DeepSeek-V3/issues/1587)、[#1630](https://github.com/deepseek-ai/DeepSeek-V3/issues/1630)、[#1673](https://github.com/deepseek-ai/DeepSeek-V3/issues/1673)、[#1680](https://github.com/deepseek-ai/DeepSeek-V3/issues/1680)。截至本版本发布，**它们全部仍是 open**。

### 但本插件确实可能是「加重因素」

这一点必须诚实说。

第三方项目 [`walksls/dsh-degeneration-kit`](https://github.com/walksls/dsh-degeneration-kit) 统计了 493 个会话日志，把复读分成两型：

| | **A 型 · 同一句死磕** | **B 型 · 短句轮换** |
|---|---|---|
| 重复次数 | 10³–10⁴ | 20–200 |
| 典型样子 | 「做」×1024、「好」×10848 | `Let me write it.` → `Go.` → `Now.` |
| 出现场景 | **只在「强制中文思考」的模式里见过**（其它 31 个会话：0 例） | 与中文无关 |

作者自己也标注了：**分不清是「中文」的锅还是「那套格式约束」的锅**，别把相关当因果。

所以本插件的准确定位是：

> **它不制造复读，但可能让本来就会发生的复读，更容易以「中文短句死磕」这种最重的形态出现。**

如果你正在被这个问题困扰，**停用本插件不一定能解决**（先看上面三条证据），但确实值得作为一个变量排除掉。

### 建议：把思考档位降到 `low`

这是目前**成本最低、最可能有效**的一条。原理很直白：思考预算给得越大，模型越有"空间"在原地打转；`low` 档会在更早的时候被迫收尾。

| 档位 | 说明 |
|---|---|
| `off` | 关闭思考（部分任务会明显变笨） |
| **`low`** | **推荐用于长会话 / 高工具调用密度的任务** |
| `high` | DSH 默认值。思考更充分，但复读风险最高 |
| `max` | 不建议用于长会话 |

改法（二选一）：

**GUI**：设置 → 模型 → 把「思考强度 / Reasoning effort」调成 `low`。

**配置**（`cordis.patch.yml`）：

```yaml
- id: agent-default-model
  config:
    provider: deepseek-official
    model: deepseek-flash
    reasoningEffort: low    # 原来是 high
```

> `reasoningEffort` 的合法值只有 `off` / `low` / `high` / `max` 四档（**没有 medium**）。

### 另外两条经验

1. **压缩上下文只能暂时缓解。** 它压的是"输入长度"，而病灶在"模型自己的输出"——压完几轮就会重新长回来。有人的实测数据：一个会话压缩了 86 次，复读依然反复出现。
2. **分支对话也不是万能。** 分支会**原样继承**分叉点之前的全部历史，包括已经产生的复读痕迹。要分就趁早分，别等复读开始后再分。

**真正有效的是「开新会话」** —— 把任务简报（做到哪、卡在哪、下一步）写成一小段带过去。这比跟复读缠斗划算得多。

### 如果你决定不用本插件

当前版本没有做配置 schema，所以没有 GUI 开关。移除方式：

- GUI 安装的：设置 → 插件 → 卸载
- `link:` 本地安装的：从 profile 的 `package.json` 里删掉依赖和 `dsh.profile.bundles` 里对应的条目
- 或者直接删掉 `node_modules` 里的链接并重启

**移除后请留意**：如果复读依旧发生，就说明与本插件无关；如果明显好转，欢迎到 [Issues](https://github.com/yingjian666/dsh-zh-thinking/issues) 反馈——那会是很有价值的数据。

## 关于 token 成本：一次实测

**起因**：有用户反馈「强制中文思考会比英文思考消耗更多 token」，这和一些「中文更省」的说法正好相反。

**方法**：同一个会话、同一个模型（`deepseek-flash`）、相近的上下文规模（约 41 万 token），用同一个问题各跑一次，只改系统提示里的思考语言要求。两次都是 `tools=0`，即输出里不含工具调用。

问题：**「解释一下内存泄漏的原理，200 字以内」**

| | 英文思考 | 中文思考 |
|---|---|---|
| `outputTokens` | **1,043** | **485** |
| 思维链字数 | 3,275 字 | 616 字 |
| 正文（给用户的回答） | 278 字 | 259 字 |
| 字符/token | 3.41 | 1.80 |

两次**正文长度几乎一样**（278 vs 259 字），说明回答质量相近，差异全在思考部分。

**这一次，中文思考消耗的 token 约为英文的 46%。**

另一组对照（都是「分析日志」类任务）：

| | 英文思考 | 中文思考 |
|---|---|---|
| 思维链字数 | 7,715 字 | 2,593 字 |
| `outputTokens` | 2,740 | 1,597 |

英文写了 **3 倍**的字，花了 **1.7 倍**的 token —— 方向一致。

### 但这些数字不能直接推广

1. **差异主要来自「思考长度」，不是分词器效率。** 英文那轮写了 3,275 字，中文只写 616 字 —— 英文思考天然更啰嗦（`Let me think step by step...` 那套铺垫）。换个模型、换个任务，这个比例会变。
2. **样本很小。** 第一组只有一轮，而且英文那轮混入了一些「这是对照实验」的元思考，偏高。
3. **中文从来不是纯中文。** 本机 59 个会话的长期统计显示：中文思维链约 **1.9 字符/token**，但其中中文字符只占约 **35%** —— 无论怎么限制，技术任务的思维链里英文（函数名、路径、报错）都占大头。

**换句话说**：「中文更省」这个方向在这台机器上成立，但具体省多少取决于任务类型和模型当时的啰嗦程度，**不是一个可以写死的百分比**。

## 兼容性

| DSH 内核（`@deepseek-ai/dsh-system-prompt`） | 状态 |
|---|---|
| `0.1.1-rc.1` … `0.1.5.x` | 兼容（最初的目标版本） |
| `0.1.6-alpha.1` / `0.1.6-alpha.2` | **兼容，已在真实内核上实测** |
| **`0.2.0-rc.2`（Desktop 5.0.0）** | **兼容，已在真实内核上实测** |

`section({ name, order, text })` 的契约从 `0.1.1-rc.1` 一路到 `0.2.0-rc.2` **没有变化过**，所以插件的实现代码从来没有因为内核升级改过。真正需要维护的只有 `package.json` 里的两个版本声明：

- `peerDependencies["@deepseek-ai/dsh-system-prompt"]` → `">=0.1.6-alpha.1"`（**只写下限，不写上界**）
- `dsh.compatibility.runtime` → `">=0.1.1-rc.1 <0.3.0-0"`

### ⚠️ 为什么 peer 范围千万别写 `^`

这是 0.2.0 上真实踩到的坑：

```jsonc
// ✗ 这样写，内核一升到 0.2.0 的预发布版，插件就会被静默禁用
"@deepseek-ai/dsh-system-prompt": "^0.1.6-alpha.1"
```

`^0.1.6-alpha.1` 在 semver 里展开成的上界**不是** `<0.2.0`，而是 **`<0.2.0-0`** —— 那个 `-0` 把 `0.2.0-rc.1`、`0.2.0-rc.2` 这类**所有 `0.2.0` 的预发布版全部排除**掉了。

而 DSH 0.2.0 新增了一道 **profile 兼容性预检**（`dsh-app-boot` 的 `prepareProfileEntries`）：加载 profile 之前逐行检查，`peerDependencies` 里任何 `@deepseek-ai/dsh-*` 范围不满足当前 runtime 的**行会被直接 `disabled = true`**，只在 stderr 打一行 `disabling profile plugin ...`。结果就是——**插件装得好好的、界面还显示 compatible，但就是不生效**。

而且这里有**两套判定口径不一致**，这正是它难排查的原因：

| 判定方 | 依据 | 对 `0.2.0-rc.2` 的结论 |
|---|---|---|
| Desktop 界面 / `desktop-plugins.lock.json` | `dsh.compatibility.runtime`，上界 `<0.2.0`（无 `-0`） | compatible |
| **运行时预检（真正决定是否加载）** | `peerDependencies` 的 range | **incompatible → 静默禁用** |

还有两个容易踩的点：

- `peerDependenciesMeta.optional: true` **对运行时预检无效** —— 它只读 `peerDependencies` 的 range，不看 optional 标记。
- 完全**不声明任何 `dsh-*` peer**（只留 `dsh.compatibility.runtime`）也永远不会被预检拦下；本插件选择保留 `>=0.1.6-alpha.1` 这种写法，兼顾"最低内核版本"的语义。

### 如果插件在 0.2.x 上不生效，怎么恢复

把 `peerDependencies` 里的 `dsh-system-prompt` 改成 `">=0.1.6-alpha.1"`（或直接删掉这一项），然后**重启 DSH** —— `link:` 安装是实时的，不需要重装。GitHub / npm 安装的则要等包含此修复的新版本，重新安装一次。

仓库自带一个真实内核冒烟测试：

```sh
node test/kernel-smoke.mjs "<DSH 的 node_modules 绝对路径>"
# Windows 默认值：C:\Program Files\DeepSeek Harness Desktop\resources\app.asar.unpacked\node_modules
```

它会加载真实的 `@deepseek-ai/cordis` + `@deepseek-ai/dsh-system-prompt`，挂载本插件并断言 `language:zh-thinking` 段出现在 `assemble()` 结果中。

### 为什么 peer 依赖标了 `optional`（以及它解决不了什么）

这一节说的是 **Desktop 界面 / `desktop-plugins.lock.json` 那一套判定**，和上面运行时预检是两码事。

Desktop 4.1 的兼容性诊断会用**应用侧**的模块锚点去解析插件的 `peerDependencies`。`@deepseek-ai/cordis`、`@deepseek-ai/dsh-system-prompt` 这类随 Desktop 一起打包的核心包在它的解析链上取不到版本，于是只要把它们声明成**必需** peer，就会被判成：

```json
{ "status": "incompatible", "reasons": [
  { "code": "peer-missing", "subject": "@deepseek-ai/cordis", "required": "^4.0.1" },
  { "code": "peer-missing", "subject": "@deepseek-ai/dsh-system-prompt", "required": ">=0.1.6-alpha.1" }
] }
```

标成 `optional` 后：解析得到版本时仍按 semver 范围判定；解析不到时跳过该项，兼容性证据改由 `dsh.compatibility.runtime` 提供。插件真正的运行时契约由 cordis 的 `inject = ["systemPrompt"]` 强制，不会因为标了 optional 而失效。

> ⚠️ 但要记住：**`optional` 只影响 Desktop 这一套诊断，对运行时预检没有任何作用**（预检只读 `peerDependencies` 的 range）。所以 range 本身仍然必须写对 —— 见上面「为什么 peer 范围千万别写 `^`」那一节。

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

**https://github.com/yingjian666/dsh-zh-thinking/releases/latest/download/dsh-zh-thinking-0.1.3.tgz**

然后：**设置 → 插件 → 从其他来源安装** → 填这个 `.tgz` 的**绝对路径** → ✅ 勾选那个复选框 → 确认全权访问 → 重启 DSH。这条路完全不碰 npm 服务器。

`package.json` 的 `files` 白名单决定产物内容（`lib/`、`cordis.patch.yml`、README、LICENSE、package.json；测试不会被打包），所以想自己从源码打包也可以：

```sh
npm pack          # 或使用随 DSH 附带的 pnpm pack
# → dsh-zh-thinking-0.1.3.tgz
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

### 遇到版本门禁 / 构建门禁怎么绕过（0.2.x 实测）

如果安装时报 `Plugin dsh-zh-thinking@0.1.1 is incompatible with dsh 0.2.0-rc.2`（0.1.1 及更早的版本会遇到），官方提供了**确切版本豁免**：

```sh
dsh plugin --profile desktop allow-version dsh-zh-thinking@0.1.1 --dsh-version 0.2.0-rc.2 --accept-risk
```

两条实测经验（来自 [issue #1](https://github.com/yingjian666/dsh-zh-thinking/issues/1) 报告者的验证）：

1. **豁免之后必须重新执行一次 `add`** —— 只"按原命令重试"或"重启 dsh"都会因为回滚逻辑再次被拒：
   ```sh
   dsh plugin --profile desktop add github:yingjian666/dsh-zh-thinking
   ```
2. 从 **git 来源**安装时还可能撞上 pnpm 的构建门禁（git 依赖默认要跑 `prepare`）。**pnpm 11.7.0 实际接受的键名是 `onlyBuiltDependencies`**（写在 profile 的 `pnpm-workspace.yaml` 里），而 DSH 的提示文案里写的是 `allowBuilds` —— 以 pnpm 实际打印的提示为准：

   ```yaml
   onlyBuiltDependencies:
     - dsh-zh-thinking
   ```

> 本插件 **0.1.2 起已放宽版本声明**，正常安装不再需要这些绕过步骤；上面两条留作以后遇到同类插件时的参考。

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

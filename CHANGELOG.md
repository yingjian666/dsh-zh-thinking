# 更新历史（Changelog）

版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)，记录方式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

> 这个插件是一次个人学习性质的尝试，不承诺持续维护（见 [README](./README.md)）。
> 但**每一次内核升级导致它失效的原因与修法都会记在这里** —— 因为同一个坑很可能被别的插件作者踩到。

---

## [Unreleased]

### 文档

- **README 开头新增「官方已修复『全局约束失效』」的说明。**
  起因是社区用户反馈：DSH 内核 `dsh-v0.2.2-rc.1`（2026-11-04）的更新说明里承认并修复了一个 bug ——
  **「全局与项目 AGENTS.md 分别使用 maxBytes 预算，避免项目指令挤掉全局指令」**（@ZiyaZhang）。
  在此之前，两边共用一份字节预算，项目内容一多就会把全局那段挤掉；症状就是「全局中文约束时灵时不灵、思考链又变回英文」。
  因此，对于「在全局 AGENTS.md 里写一句『用简体中文思考』」这一用法，**升级到 `0.2.2-rc.1` 及以上后不再需要本插件**。
- README 兼容性表补入 `0.2.1-rc.2`（Desktop 5.1.0，已在真实内核上实测）与 `0.2.2-rc.x`（契约未变，预期兼容，未实测）。

### 修复

- **补充 `dsh.compatibility.desktop` 声明，消除 Desktop 扩展坞的「无法确认兼容性」提示。**
  现象：在 Desktop 里安装/更新本插件时，弹出「无法确认兼容性 —— 这个插件没有声明与当前 DeepSeek Harness Desktop 的兼容范围」。
  原因：Desktop 的 Extension Dock 靠 `dsh.compatibility.desktop` 判断插件适配的 Desktop 版本范围；本插件此前只声明了 `runtime`（内核范围），因此状态被判为「未知」。
  修法：在 `package.json` 中补上 `"desktop": ">=4.1.0 <6.0.0"`（4.1.0 是实测起点，6.0.0 是跨大版本提醒）。
  该声明按官方文档只是**兼容性证据，不是权限授予**，不会扩大插件权限。

## [0.1.3] — 2026-11-15

### 文档

- **README 新增「⚠️ 关于『思维链复读』」一节**，正面交代 2026 年中以来模型侧出现的复读 / 空完成现象与本插件的关系：
  - 用三条证据说明**不是本插件导致的**：代码层面不参与生成；最早的公开报告（2026-08-07，网页版）早于本插件首次提交（2026-09-06）；纯英文环境同样复现；
  - **诚实补充反证**：第三方统计（`walksls/dsh-degeneration-kit`，493 个会话）显示「同一句死磕」型复读只在「强制中文思考」的模式里观察到，因此本插件**可能是加重因素之一**；
  - 给出低成本缓解建议：把 `reasoningEffort` 从 `high` 降到 `low`，附 GUI 与配置文件两种改法；
  - 说明为什么**压缩上下文**和**分支对话**只能暂时缓解，以及正确做法是开新会话；
  - 给出移除本插件的完整步骤，并请移除后反馈是否好转。

### 加固

- `section()` 返回值的清理改为**先判断类型再调用**。
  原实现用 `disposeSection?.()`：可选调用只保护 `null` / `undefined`，
  如果某个宿主代次让 `section()` 返回了非函数的对象，这里会抛 `TypeError`。
  当前内核返回的是 cordis effect disposer，行为不变。

### 测试

- 新增 `test/edge-cases.mjs`：在真实内核上验证配置边界（`enabled` 为 `null` / `0` / `"false"` 时的行为）、
  重复挂载、`forceOutputZh` 的类型严格性，以及注入文本的首尾空白。
  已知缺口：`ctx.dispose()` 在 cordis 4 的 `Context` 上并不存在，因此「卸载后 section 是否释放」一项**未能有效验证**。

## [0.1.2] — 2026-10-01

### 修复

- **在 DSH 内核 `0.2.0-rc.2`（DSH Desktop 5.0.0）上被静默禁用、中文思考失效的问题。**

  **症状**：插件装得好好的，`desktop-plugins.lock.json` 也显示 `compatible`，但提示词里就是不出现中文思考段——没有任何报错。

  **根因（两层叠加）**：

  1. `peerDependencies["@deepseek-ai/dsh-system-prompt"]` 原本写的是 `^0.1.6-alpha.1`。
     semver 把 `^` 展开成的上界**不是** `<0.2.0`，而是 **`<0.2.0-0`** —— 那个 `-0` 排除了
     **所有 `0.2.0` 的预发布版**。所以对 `0.2.0-rc.2` 判定为不满足，**连 `includePrerelease: true` 都不成立**。
  2. DSH 0.2.0 新增了一道 **profile 兼容性预检**（`@deepseek-ai/dsh-app-boot` 的 `prepareProfileEntries`）：
     加载 profile 前逐行检查，`@deepseek-ai/dsh-*` peer 不满足当前 runtime 的行会被**直接 `disabled = true`**，
     只在 stderr 留一行 `disabling profile plugin ...`。于是插件"加载了但没生效"。

  两套判定口径不一致，是这个 bug 难排查的关键：Desktop 界面用的是 `dsh.compatibility.runtime`，
  上界写成 `<0.2.0`（**没有** `-0`），所以它一直显示 compatible。
  完整分析见 README 的「为什么 peer 范围千万别写 `^`」一节。

  **修法**：

  - peer 改为 `">=0.1.6-alpha.1"`（**只写下限、不写上界**）→ 以后内核升级不会再被静默禁用；
  - `dsh.compatibility.runtime` 放宽为 `">=0.1.1-rc.1 <0.3.0-0"`（保留"跨大版本时提醒一次"的能力）。

### 文档

- README 兼容性矩阵补入 `0.2.0-rc.2`；
- README 新增「为什么 peer 范围千万别写 `^`」与「如果插件在 0.2.x 上不生效，怎么恢复」；
- README 补录 [issue #1](https://github.com/yingjian666/dsh-zh-thinking/issues/1) 报告者实测的两条经验：
  `allow-version` 豁免之后**必须重新执行一次 `add`**；pnpm 11.7.0 实际接受的键名是
  **`onlyBuiltDependencies`**（而 DSH 提示文案里写的是 `allowBuilds`）。

### 验证

- 对着真实 `0.2.0-rc.2` 内核跑 `test/kernel-smoke.mjs`：挂载成功，`language:zh-thinking` 正常进入 `assemble()`；
- 用内核自己的判定逻辑（`evaluatePluginCompatibility`）复算：结果 compatible，该行不再被禁用；
- 真机重启后确认：会话的 system prompt 重新带上该段，运行时日志中无 `disabling profile plugin`。

---

## [0.1.1] — 2026-09-16

### 修复

- **在 DSH Desktop 4.1.0（内核 `0.1.6-alpha.1`）上被兼容性诊断误报为 `incompatible` 的问题。**
  core peer 声明为必需时，Desktop 的应用侧解析链取不到版本，会报 `peer-missing`。
  → 把 core peer 标为 `optional`（`peerDependenciesMeta`），并新增
  `dsh.compatibility.runtime: ">=0.1.1-rc.1 <0.2.0"` 作为兼容性证据。

### 新增

- `test/kernel-smoke.mjs`：对着真实内核挂载插件并断言 section 进入 `assemble()`；
- 提示词 section 的注册收进单个 `ctx.effect`，随插件上下文一起释放。

### 文档

- README 重写安装章节：DSH 4.1+ 走 GUI「从其他来源安装」+ 高级选项里的全权访问；
- 发布 `v0.1.1` Release，附 `dsh-zh-thinking-0.1.1.tgz` 预打包文件。

---

## [0.1.0] — 2026-09-09 ~ 09-12

### 新增

- 首个版本：零依赖宿主插件，通过 `ctx.systemPrompt.section()` 注入
  「必须用简体中文思考」的规则（order `20`，紧随 persona 之后）；
- `cordis.patch.yml` 声明 profile 插入行；`package.json` 声明 `dsh.bundle.patch`。

> 0.1.0 没有单独发 Release，`v0.1.1` Release 里的 `.tgz` 是 0.1.1 的构建。

---

## 相关链接

- [README](./README.md) — 安装方式与完整说明
- [Releases](https://github.com/yingjian666/dsh-zh-thinking/releases) — 每个版本的发布页与预打包 `.tgz`
- [Issues](https://github.com/yingjian666/dsh-zh-thinking/issues) — 问题报告
  （[#1](https://github.com/yingjian666/dsh-zh-thinking/issues/1) 就是这次 0.2.0 失效的报告）

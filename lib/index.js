/**
 * dsh-zh-thinking — a DEPENDENCY-FREE host plugin.
 *
 * Forces the agent's internal chain-of-thought / reasoning / planning /
 * tool-invocation deliberation to stay in Simplified Chinese by registering
 * a system-prompt section through the systemPrompt service.
 *
 * No external imports on purpose: this plugin may be mounted from a folder
 * outside the profile/app node_modules tree, where package deps such as
 * schemastery are not resolvable (that caused a fatal plugin-tree load
 * failure before). It only relies on the cordis runtime and services.
 *
 * Verified against the current DSH kernel (`@deepseek-ai/dsh-system-prompt`
 * 0.1.6-alpha.1 / Desktop 4.1.0): `section()` keeps its
 * `{ name, order, text }` contract and the returned disposer is the section's
 * own effect disposer, so it must be released when this plugin unloads.
 */

/** Stable cordis plugin name (also used as the roster row id). */
export const name = "zh-thinking";

/** The system-prompt registry must be up before we register a section. */
export const inject = ["systemPrompt"];

/** Section order: right after the persona band (persona order is 0). */
const SECTION_ORDER = 20;
/** Section name is stable so edits re-insert under the same key. */
const SECTION_NAME = "language:zh-thinking";

/** Model-facing rule: every internal deliberation must be Simplified Chinese. */
const GUIDANCE_ZH =
	"语言要求（本机已安装 dsh-zh-thinking 插件）：" +
	"你的全部内部思考（chain-of-thought / 思维链）、逐步规划、工具调用前后的推理、自我审查与自我纠正，" +
	"都必须使用简体中文撰写，禁止以英文或其它语言进行内部思考。" +
	"最终回答中如需保留英文专有名词、代码标识符或用户原文，允许原样保留；除此之外的表达一律为简体中文。";

/** Optional rule: also default the final answer to Chinese. */
const OUTPUT_ZH_LINE = "同时，最终回复默认使用简体中文（除非用户明确要求使用其它语言）。";

/**
 * Mount the plugin: register a system-prompt section instructing Chinese
 * reasoning, and dispose it cleanly when the context stops.
 * @param ctx - host plugin context carrying the systemPrompt service.
 * @param config - resolved plugin config (undefined when schema-less).
 */
export function apply(ctx, config) {
	const cfg = {
		enabled: config?.enabled !== false,
		forceOutputZh: config?.forceOutputZh === true
	};
	ctx.effect(() => {
		if (!cfg.enabled) return;
		const text = GUIDANCE_ZH + (cfg.forceOutputZh ? "\n\n" + OUTPUT_ZH_LINE : "");
		let disposeSection;
		try {
			disposeSection = ctx.systemPrompt.section({
				name: SECTION_NAME,
				order: SECTION_ORDER,
				text
			});
		} catch (error) {
			ctx.logger?.warn?.(
				"dsh-zh-thinking: register section failed: " +
					(error instanceof Error ? error.message : String(error))
			);
			return;
		}
		return () => {
			disposeSection?.();
			disposeSection = undefined;
		};
	}, "dsh-zh-thinking: language section");
}

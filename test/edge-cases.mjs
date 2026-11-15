/**
 * Edge-case audit for dsh-zh-thinking.
 *
 * Mounts the plugin against the real kernel with abnormal configuration and
 * checks what actually reaches the assembled prompt. This is a diagnostic,
 * not a pass/fail gate: it prints what happens so the README can state facts.
 *
 * Usage: node test/edge-cases.mjs "<path to DSH app node_modules>"
 */
import { pathToFileURL } from "node:url";
import { join, resolve } from "node:path";

const DEFAULT_NODE_MODULES =
	process.platform === "win32"
		? "C:\\Program Files\\DeepSeek Harness Desktop\\resources\\app.asar.unpacked\\node_modules"
		: undefined;

const kernelRoot = resolve(
	process.argv[2] ?? process.env.DSH_KERNEL_NODE_MODULES ?? DEFAULT_NODE_MODULES ?? ""
);
if (kernelRoot === "" || kernelRoot === ".") {
	console.error("edge-cases: pass the DSH node_modules directory as argv[2]");
	process.exit(2);
}

const { Context } = await import(
	pathToFileURL(join(kernelRoot, "@deepseek-ai/cordis/lib/index.js")).href
);
const { default: SystemPrompt } = await import(
	pathToFileURL(join(kernelRoot, "@deepseek-ai/dsh-system-prompt/lib/index.js")).href
);
const plugin = await import(new URL("../lib/index.js", import.meta.url).href);

const SECTION = "language:zh-thinking";
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

async function mount(config, { twice = false } = {}) {
	const ctx = new Context();
	ctx.plugin(SystemPrompt, {});
	await tick();
	if (config === undefined) ctx.plugin(plugin);
	else ctx.plugin(plugin, config);
	await tick(120);
	if (twice) {
		ctx.plugin(plugin, config);
		await tick(120);
	}
	const assembly = await ctx.systemPrompt.assemble({});
	const hits = assembly.sections.filter((s) => s.name === SECTION);
	return { ctx, count: hits.length, text: hits[0]?.text ?? "", assembly };
}

const results = [];
function record(name, expect, actual, verdict) {
	results.push({ name, expect, actual, verdict });
}

// 1. no config at all
{
	const r = await mount(undefined);
	record("config 缺省（undefined）", "启用，1 段", `count=${r.count}`, r.count === 1 ? "OK" : "!!");
}

// 2. explicit false
{
	const r = await mount({ enabled: false });
	record("enabled:false", "禁用，0 段", `count=${r.count}`, r.count === 0 ? "OK" : "!!");
}

// 3. null — does it disable? (!== false means it stays enabled)
{
	const r = await mount({ enabled: null });
	record("enabled:null", "语义存疑", `count=${r.count}`, r.count === 1 ? "启用(可能非预期)" : "禁用");
}

// 4. numeric 0
{
	const r = await mount({ enabled: 0 });
	record("enabled:0", "语义存疑", `count=${r.count}`, r.count === 1 ? "启用(可能非预期)" : "禁用");
}

// 5. string "false"
{
	const r = await mount({ enabled: "false" });
	record('enabled:"false"', "语义存疑", `count=${r.count}`, r.count === 1 ? "启用(可能非预期)" : "禁用");
}

// 6. forceOutputZh
{
	const r = await mount({ forceOutputZh: true });
	const has = r.text.includes("最终回复默认使用简体中文");
	record("forceOutputZh:true", "含输出语言行", has ? "含" : "不含", has ? "OK" : "!!");
}

// 7. forceOutputZh as string
{
	const r = await mount({ forceOutputZh: "true" });
	const has = r.text.includes("最终回复默认使用简体中文");
	record('forceOutputZh:"true"', "严格比较 → 不含", has ? "含(非预期)" : "不含", has ? "!!" : "OK");
}

// 8. mount twice in one context
{
	const r = await mount(undefined, { twice: true });
	record("同一 ctx 挂载两次", "1 段（去重）", `count=${r.count}`, r.count === 1 ? "OK" : `重复 ${r.count} 段`);
}

// 9. dispose cleanup
{
	const r = await mount(undefined);
	const before = r.count;
	await r.ctx.dispose?.();
	await tick();
	let after;
	try {
		const a = await r.ctx.systemPrompt.assemble({});
		after = a.sections.filter((s) => s.name === SECTION).length;
	} catch {
		after = "ctx 已销毁，无法 assemble";
	}
	record("ctx.dispose() 后", "0 段或不可查询", `before=${before} after=${after}`, "信息");
}

// 10. section text sanity: no leading/trailing whitespace surprises
{
	const r = await mount(undefined);
	const t = r.text;
	record(
		"文本首尾空白",
		"—",
		`len=${t.length} leadSpace=${/^\s/.test(t)} trailSpace=${/\s$/.test(t)}`,
		"信息"
	);
}

console.log("=== dsh-zh-thinking edge-case audit ===");
console.log("");
for (const r of results) {
	console.log(`• ${r.name}`);
	console.log(`    期望: ${r.expect}`);
	console.log(`    实测: ${r.actual}   → ${r.verdict}`);
}
console.log("");
const bad = results.filter((r) => r.verdict === "!!");
console.log(`异常项: ${bad.length}`);

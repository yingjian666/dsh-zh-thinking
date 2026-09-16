/**
 * Kernel smoke test — proves this plugin still mounts against a real DSH
 * system-prompt registry, instead of only against the package it was written
 * for.
 *
 * It loads `@deepseek-ai/cordis` + `@deepseek-ai/dsh-system-prompt` from an
 * installed DSH runtime, mounts this plugin exactly the way the plugin tree
 * does, assembles a prompt, and asserts the Chinese-thinking section is there.
 *
 * Usage (Node 22+/24+):
 *   node test/kernel-smoke.mjs "<path to DSH app node_modules>"
 *
 * or point DSH_KERNEL_NODE_MODULES at it. On Windows the packaged Desktop
 * runtime lives at:
 *   C:\Program Files\DeepSeek Harness Desktop\resources\app.asar.unpacked\node_modules
 *
 * Exit code 0 = compatible, 1 = the section never reached the assembly.
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
	console.error("kernel-smoke: pass the DSH node_modules directory as argv[2] or DSH_KERNEL_NODE_MODULES");
	process.exit(2);
}

const { Context } = await import(
	pathToFileURL(join(kernelRoot, "@deepseek-ai/cordis/lib/index.js")).href
);
const { default: SystemPrompt } = await import(
	pathToFileURL(join(kernelRoot, "@deepseek-ai/dsh-system-prompt/lib/index.js")).href
);
const plugin = await import(new URL("../lib/index.js", import.meta.url).href);

const ctx = new Context();
ctx.plugin(SystemPrompt, {});
await new Promise((ready) => setTimeout(ready, 50));

ctx.plugin(plugin);
await new Promise((ready) => setTimeout(ready, 100));

const assembly = await ctx.systemPrompt.assemble({});
const sections = assembly.sections.filter((section) => section.name === "language:zh-thinking");

if (sections.length !== 1 || typeof sections[0].text !== "string" || sections[0].text.length === 0) {
	console.error("kernel-smoke: FAILED — language:zh-thinking did not reach the assembly");
	console.error("sections:", assembly.sections.map((section) => section.name).join(" | "));
	process.exit(1);
}

console.log("kernel-smoke: OK");
console.log("sections:", assembly.sections.map((section) => section.name).join(" | "));
console.log("section text:", sections[0].text);

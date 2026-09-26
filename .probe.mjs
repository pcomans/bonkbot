import { Sandbox } from "@vercel/sandbox";
const sbx = await Sandbox.get({ name: "bonkbot-computer" });
const r = await sbx.runCommand("bash", ["-lc", process.argv[2]]);
console.log(`[exit ${r.exitCode}]\n${await r.stdout()}${await r.stderr()}`);

// Prepares bonkbot's computer for a fresh demo take: uploads Leadbox (the demo
// CRM) and serves it on the computer, removes the Leadbox login and any login
// request, clears Leadbox's data, and leaves the browser on a blank page.
// Run from the project root: node demo/reset.mjs (with .env.local loaded).
import { Sandbox } from "@vercel/sandbox";
import { readFileSync } from "node:fs";

const c = await Sandbox.get({ name: "bonkbot-computer" });
await c.writeFiles([{ path: "/workspace/leadbox/index.html", content: readFileSync(new URL("./leadbox/index.html", import.meta.url)) }]);
const step = async (label, cmd) => {
  const r = await c.runCommand("bash", ["-lc", cmd]);
  console.log(`${label} [${r.exitCode}]`, (await r.stdout()).trim().slice(0, 200));
};
// Anchored, so pkill matches the server's command line but not this shell's.
await step("server", "pkill -f '^python3 -m http.server 8765'; cd /workspace/leadbox && setsid -f python3 -m http.server 8765 --bind 127.0.0.1 </dev/null >/dev/null 2>&1; sleep 1; curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8765/");
await step("login", "command agent-browser auth list | grep -q '^  leadbox ' && command agent-browser auth delete leadbox --json >/dev/null; echo '[]' > /workspace/.bonkbot/login-requests.json; echo ok");
await step("browser", "agent-browser open http://127.0.0.1:8765/ >/dev/null && agent-browser eval 'localStorage.clear(); 1' >/dev/null && agent-browser open about:blank >/dev/null && agent-browser get url");

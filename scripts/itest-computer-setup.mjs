// Integration test: runs the computer setup on a throwaway Vercel Sandbox and
// checks the browser, recorder, and stop/resume behavior. Deletes the sandbox.
// Run: set -a; . ./.env.local; set +a; node --experimental-strip-types scripts/itest-computer-setup.mjs

import { Sandbox } from "@vercel/sandbox";
import { SETUP_SCRIPT, FRAME_META_PATH, FRAME_PATH } from "../agent/lib/computer-setup.ts";
const tpl = (await Sandbox.list({ limit: 20 })).sandboxes.find((s) => s.name.startsWith("eve-sbx-tpl-vercel-"));
const snapshotId = (await Sandbox.get({ name: tpl.name })).currentSnapshotId;
const NAME = "bonkbot-setup-test";
let sbx = await Sandbox.create({ name: NAME, persistent: true, timeout: 20 * 60_000, source: { type: "snapshot", snapshotId } });
const run = async (label, c) => { const t = Date.now(); const r = await sbx.runCommand("bash", ["-lc", c]); console.log(`--- ${label} [exit ${r.exitCode}, ${((Date.now()-t)/1000).toFixed(1)}s]\n${(await r.stdout()).slice(-400)}${(await r.stderr()).slice(-400)}`); };
const frames = `stat -c '%Y %s' ${FRAME_PATH}; sleep 3; stat -c '%Y %s' ${FRAME_PATH}; pgrep -c -f '^/bin/bash /usr/local/bin/bonkbot-recorder'`;
try {
  await run("setup", SETUP_SCRIPT + " >/dev/null 2>&1");
  await run("open (must return promptly)", "agent-browser open https://example.com");
  await run("frames refresh", "sleep 3; " + frames);
  await run("frame metadata", `cat ${FRAME_META_PATH}; sleep 6; echo; cat ${FRAME_META_PATH}; echo; date +%s`);
  await run("forced setup rerun, then the recorder comes back", `rm /workspace/.bonkbot/setup-v*; (${SETUP_SCRIPT}) >/dev/null 2>&1; agent-browser get title; sleep 1; pgrep -c -f '^/bin/bash /usr/local/bin/bonkbot-recorder'`);
  await run("second call does not start another recorder", "agent-browser get title; pgrep -c -f '^/bin/bash /usr/local/bin/bonkbot-recorder'");
  await sbx.stop({ blocking: true });
  sbx = await Sandbox.get({ name: NAME });
  await run("after resume: recorder gone", "pgrep -c -f '^/bin/bash /usr/local/bin/bonkbot-recorder' || echo none");
  await run("after resume: browser + recorder back", "agent-browser open https://example.org && sleep 4 && " + frames);
} finally {
  await (await Sandbox.get({ name: NAME })).delete();
  console.log("deleted test sandbox");
}

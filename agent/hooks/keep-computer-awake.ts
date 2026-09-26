import { Sandbox } from "@vercel/sandbox";
import { defineHook } from "eve/hooks";
import { createKeepAlive, extensionNeeded } from "../lib/keep-alive";
import { COMPUTER_NAME } from "../lib/computer";

// While bonkbot is active, keep at least this much time before the computer
// stops; once activity ends it idles out after about this long.
const MIN_REMAINING_MS = 20 * 60_000;

const keepAlive = createKeepAlive({
  intervalMs: 60_000,
  async extend() {
    // `get` does not resume a stopped computer; only extend a running one.
    const computer = await Sandbox.get({ name: COMPUTER_NAME });
    if (computer.status !== "running") return;
    const extension = extensionNeeded({ expiresAt: computer.expiresAt, now: Date.now(), minRemainingMs: MIN_REMAINING_MS });
    if (extension > 0) await computer.extendTimeout(extension);
  },
});

export default defineHook({
  events: {
    async "action.result"() {
      await keepAlive().catch((error) => console.warn("keep-computer-awake:", error));
    },
  },
});

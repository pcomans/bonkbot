import { Sandbox } from "@vercel/sandbox";
import { defineSandbox } from "eve/sandbox";
import { defineSandboxProvider } from "eve/sandbox/provider";
import { VercelSandbox } from "eve/sandbox/vercel";
import { provisionComputer } from "./lib/computer-setup";
import { createSharedComputer, type InnerImplementation } from "./lib/shared-computer";

const COMPUTER_NAME = "bonkbot-computer";
const COMPUTER_TIMEOUT_MS = 30 * 60_000;

// eve does not export its Vercel implementation, but every environment carries
// it under this registered symbol. Pinned to the installed eve version.
const PROVIDER_RUNTIME = Symbol.for("eve.sandbox-provider-runtime");

const SharedVercelComputer = defineSandboxProvider({
  name: "bonkbot-shared-vercel",
  environment() {
    const vercel = VercelSandbox.environment() as unknown as Record<symbol, { implementation: InnerImplementation } | undefined>;
    const inner = vercel[PROVIDER_RUNTIME]?.implementation;
    if (!inner) throw new Error("eve's Vercel sandbox implementation moved; update agent/sandbox.ts.");

    return createSharedComputer({
      name: COMPUTER_NAME,
      inner,
      async ensureComputer({ name, snapshotId }) {
        const base = { name, persistent: true, timeout: COMPUTER_TIMEOUT_MS };
        await Sandbox.getOrCreate(snapshotId ? { ...base, source: { type: "snapshot", snapshotId } } : base);
      },
      provision: provisionComputer,
    });
  },
});

export const environment = SharedVercelComputer.environment();
export default defineSandbox(() => environment.open());

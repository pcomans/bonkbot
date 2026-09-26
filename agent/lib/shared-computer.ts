import type {
  SandboxPreparedArtifact,
  SandboxProviderHandle,
  SandboxProviderImplementation,
} from "eve/sandbox/provider";

/**
 * eve's built-in Vercel provider implementation. Its session state is
 * `{ sandboxName, version: 3 }`, and `resume` reattaches to that named sandbox.
 */
export type InnerImplementation = SandboxProviderImplementation<
  object | undefined,
  SandboxPreparedArtifact,
  SandboxPreparedArtifact
>;

export type EnsureComputer = (input: { name: string; snapshotId: string | undefined }) => Promise<void>;

type SessionState = { sandboxName: string; version: 3 };

/**
 * Wraps eve's session-owned Vercel sandbox so every session shares one named,
 * persistent sandbox: the bot's computer. Sessions come and go; the computer
 * is never stopped or deleted by them and idles out on its own timeout.
 */
export function createSharedComputer({
  name,
  inner,
  ensureComputer,
}: {
  name: string;
  inner: InnerImplementation;
  ensureComputer: EnsureComputer;
}): SandboxProviderImplementation<object | undefined, SandboxPreparedArtifact, SessionState> {
  const state: SessionState = { sandboxName: name, version: 3 };

  async function attach(
    context: Parameters<InnerImplementation["resume"]>[0],
    artifact: Readonly<SandboxPreparedArtifact>,
  ): Promise<SandboxProviderHandle> {
    await ensureComputer({ name, snapshotId: snapshotIdOf(artifact) });
    const handle = await inner.resume(context, artifact, state);
    return {
      sandbox: handle.sandbox,
      async onSessionStop() {},
      async onSessionDelete() {},
      async onRuntimeShutdown() {},
    };
  }

  return {
    prepare: (context) => inner.prepare(context),
    async start(context, _options, artifact) {
      return { handle: await attach(context, artifact), state };
    },
    resume: (context, artifact) => attach(context, artifact),
  };
}

function snapshotIdOf(artifact: Readonly<SandboxPreparedArtifact>): string | undefined {
  if (artifact && typeof artifact === "object" && !Array.isArray(artifact)) {
    const { snapshotId } = artifact as { snapshotId?: unknown };
    if (typeof snapshotId === "string") return snapshotId;
  }
  return undefined;
}

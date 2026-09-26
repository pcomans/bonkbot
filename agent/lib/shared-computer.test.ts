import { describe, expect, it, vi } from "vitest";
import { createSharedComputer, type InnerImplementation } from "./shared-computer";

const ctx = (sessionId: string) =>
  ({ session: { id: sessionId } }) as Parameters<InnerImplementation["start"]>[0];

function fakeInner() {
  const sandbox = { run: vi.fn() };
  const inner = {
    prepare: vi.fn(async () => ({ snapshotId: "snap_1" })),
    start: vi.fn(),
    resume: vi.fn(async () => ({
      sandbox,
      onRuntimeShutdown: vi.fn(async () => {}),
      onSessionDelete: vi.fn(async () => {}),
      onSessionStop: vi.fn(async () => {}),
    })),
  } as unknown as InnerImplementation & {
    prepare: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
  };
  return { inner, sandbox };
}

describe("createSharedComputer", () => {
  it("delegates prepare to the inner provider", async () => {
    const { inner } = fakeInner();
    const computer = createSharedComputer({ name: "bonkbot-computer", inner, ensureComputer: vi.fn() });

    const artifact = await computer.prepare({} as never);

    expect(artifact).toEqual({ snapshotId: "snap_1" });
  });

  it("points every session at the same named sandbox", async () => {
    const { inner, sandbox } = fakeInner();
    const ensureComputer = vi.fn(async () => {});
    const computer = createSharedComputer({ name: "bonkbot-computer", inner, ensureComputer });
    const artifact = { snapshotId: "snap_1" };

    const a = await computer.start(ctx("session-a"), undefined, artifact);
    const b = await computer.start(ctx("session-b"), undefined, artifact);

    expect(a.state).toEqual({ sandboxName: "bonkbot-computer", version: 3 });
    expect(b.state).toEqual(a.state);
    expect(a.handle.sandbox).toBe(sandbox);
    expect(inner.start).not.toHaveBeenCalled();
    expect(inner.resume).toHaveBeenCalledWith(ctx("session-a"), artifact, a.state);
    expect(ensureComputer).toHaveBeenCalledWith({ name: "bonkbot-computer", snapshotId: "snap_1" });
  });

  it("ensures the computer exists before resuming", async () => {
    const { inner } = fakeInner();
    const calls: string[] = [];
    const ensureComputer = vi.fn(async () => void calls.push("ensure"));
    inner.resume.mockImplementationOnce(async () => {
      calls.push("resume");
      return { sandbox: {}, onRuntimeShutdown: vi.fn(), onSessionDelete: vi.fn(), onSessionStop: vi.fn() };
    });
    const computer = createSharedComputer({ name: "bonkbot-computer", inner, ensureComputer });

    await computer.resume(ctx("s"), {}, { sandboxName: "bonkbot-computer", version: 3 });

    expect(calls).toEqual(["ensure", "resume"]);
    expect(ensureComputer).toHaveBeenCalledWith({ name: "bonkbot-computer", snapshotId: undefined });
  });

  it("never stops or deletes the shared computer when a session ends", async () => {
    const { inner } = fakeInner();
    const computer = createSharedComputer({ name: "bonkbot-computer", inner, ensureComputer: vi.fn() });
    const { handle } = await computer.start(ctx("s"), undefined, { snapshotId: "snap_1" });
    const innerHandle = await inner.resume.mock.results[0]!.value;

    await handle.onSessionStop();
    await handle.onSessionDelete();
    await handle.onRuntimeShutdown();

    expect(innerHandle.onSessionStop).not.toHaveBeenCalled();
    expect(innerHandle.onSessionDelete).not.toHaveBeenCalled();
    expect(innerHandle.onRuntimeShutdown).not.toHaveBeenCalled();
  });

  it("provisions the computer with the attached sandbox", async () => {
    const { inner, sandbox } = fakeInner();
    const provision = vi.fn(async () => {});
    const computer = createSharedComputer({ name: "bonkbot-computer", inner, ensureComputer: vi.fn(), provision });

    await computer.start(ctx("s"), undefined, { snapshotId: "snap_1" });

    expect(provision).toHaveBeenCalledWith(sandbox);
  });

  it("ensures and provisions only once per process", async () => {
    const { inner } = fakeInner();
    const ensureComputer = vi.fn(async () => {});
    const provision = vi.fn(async () => {});
    const computer = createSharedComputer({ name: "bonkbot-computer", inner, ensureComputer, provision });
    const state = { sandboxName: "bonkbot-computer", version: 3 } as const;

    await computer.start(ctx("a"), undefined, {});
    await computer.resume(ctx("a"), {}, state);
    await computer.resume(ctx("b"), {}, state);

    expect(ensureComputer).toHaveBeenCalledTimes(1);
    expect(provision).toHaveBeenCalledTimes(1);
    expect(inner.resume).toHaveBeenCalledTimes(3);
  });

  it("retries ensure and provision after a failed attach", async () => {
    const { inner } = fakeInner();
    const ensureComputer = vi.fn(async () => {});
    const provision = vi.fn().mockRejectedValueOnce(new Error("apt down")).mockResolvedValue(undefined);
    const computer = createSharedComputer({ name: "bonkbot-computer", inner, ensureComputer, provision });

    await expect(computer.start(ctx("a"), undefined, {})).rejects.toThrow("apt down");
    await computer.start(ctx("a"), undefined, {});

    expect(ensureComputer).toHaveBeenCalledTimes(2);
    expect(provision).toHaveBeenCalledTimes(2);
  });
});

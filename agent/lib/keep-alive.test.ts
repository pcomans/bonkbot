import { describe, expect, it, vi } from "vitest";
import { createKeepAlive, extensionNeeded } from "./keep-alive";

describe("createKeepAlive", () => {
  it("extends immediately, then at most once per interval", async () => {
    let now = 0;
    const extend = vi.fn(async () => {});
    const keepAlive = createKeepAlive({ extend, intervalMs: 5 * 60_000, now: () => now });

    await keepAlive();
    now = 4 * 60_000;
    await keepAlive();
    now = 5 * 60_000;
    await keepAlive();

    expect(extend).toHaveBeenCalledTimes(2);
  });

  it("retries on the next call when an extension fails", async () => {
    const extend = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValue(undefined);
    const keepAlive = createKeepAlive({ extend, intervalMs: 60_000, now: () => 0 });

    await expect(keepAlive()).rejects.toThrow("network");
    await keepAlive();

    expect(extend).toHaveBeenCalledTimes(2);
  });
});

describe("extensionNeeded", () => {
  const min = 60_000;

  it("tops the remaining time up to the minimum", () => {
    expect(extensionNeeded({ expiresAt: new Date(12 * min), now: 0, minRemainingMs: 20 * min })).toBe(8 * min);
  });

  it("does nothing while enough time remains", () => {
    expect(extensionNeeded({ expiresAt: new Date(25 * min), now: 0, minRemainingMs: 20 * min })).toBe(0);
  });

  it("does nothing when the expiry is unknown", () => {
    expect(extensionNeeded({ expiresAt: undefined, now: 0, minRemainingMs: 20 * min })).toBe(0);
  });
});

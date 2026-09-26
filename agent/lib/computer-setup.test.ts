import { describe, expect, it, vi } from "vitest";
import { FRAME_PATH, SETUP_SCRIPT, provisionComputer } from "./computer-setup";

function fakeSandbox(result: { exitCode: number; stdout?: string; stderr?: string }) {
  return { run: vi.fn(async () => ({ stdout: "", stderr: "", ...result })) };
}

describe("provisionComputer", () => {
  it("runs the setup script on the computer", async () => {
    const sandbox = fakeSandbox({ exitCode: 0 });

    await provisionComputer(sandbox as never);

    expect(sandbox.run).toHaveBeenCalledWith(expect.objectContaining({ command: SETUP_SCRIPT }));
  });

  it("fails with the script output when setup fails", async () => {
    const sandbox = fakeSandbox({ exitCode: 1, stderr: "E: unable to locate package" });

    await expect(provisionComputer(sandbox as never)).rejects.toThrow("unable to locate package");
  });
});

describe("SETUP_SCRIPT", () => {
  it("is guarded by a versioned marker so it only runs once per version", () => {
    expect(SETUP_SCRIPT).toMatch(/\/workspace\/\.bonkbot\/setup-v\d+/);
  });

  it("points agent-browser at a persistent profile on the computer", () => {
    expect(SETUP_SCRIPT).toContain("AGENT_BROWSER_PROFILE=/workspace/.browser-profile");
  });

  it("clears Chrome's stale profile lock after the computer resumes on a new VM", () => {
    expect(SETUP_SCRIPT).toMatch(/pgrep[^\n]*\|\|[^\n]*rm -f[^\n]*Singleton/);
  });

  it("installs a recorder that captures the browser every 2.5 seconds", () => {
    expect(SETUP_SCRIPT).toContain("/usr/local/bin/bonkbot-recorder");
    expect(SETUP_SCRIPT).toContain(FRAME_PATH);
    expect(SETUP_SCRIPT).toMatch(/sleep 2\.5/);
  });

  it("starts the recorder detached on every agent-browser call; a lock keeps it single", () => {
    // `setsid -f` returns immediately; backgrounding with `&` would keep the
    // caller's stdout open and hang the command until the recorder exits.
    expect(SETUP_SCRIPT).toMatch(/\n  setsid -f \/usr\/local\/bin\/bonkbot-recorder <\/dev\/null >\/dev\/null 2>&1\n/);
    expect(SETUP_SCRIPT).toContain("flock -n 9 || exit 0");
    // Matching by name also hits any shell whose command line mentions it.
    expect(SETUP_SCRIPT).not.toContain("pgrep -f bonkbot-recorder");
  });

  it("detects the browser by Chrome's exact profile flag", () => {
    expect(SETUP_SCRIPT).toContain('pgrep -f -- "--user-data-dir=$AGENT_BROWSER_PROFILE"');
    expect(SETUP_SCRIPT).not.toContain('pgrep -f "$AGENT_BROWSER_PROFILE"');
  });
});

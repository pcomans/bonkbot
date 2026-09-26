import { describe, expect, it, vi } from "vitest";
import { SCREENSHOT_COMMAND, SCREENSHOT_PATH, captureScreenshot } from "./screenshot";

function fakeSandbox({ exitCode = 0, bytes = new Uint8Array([0xff, 0xd8, 0xff]) as Uint8Array | null } = {}) {
  return {
    run: vi.fn(async () => ({ exitCode, stdout: "", stderr: exitCode ? "no browser open" : "" })),
    readBinaryFile: vi.fn(async () => bytes),
  };
}

describe("captureScreenshot", () => {
  it("screenshots the browser as a JPEG and returns it base64-encoded", async () => {
    const sandbox = fakeSandbox();

    const shot = await captureScreenshot(sandbox as never);

    expect(sandbox.run).toHaveBeenCalledWith(expect.objectContaining({ command: SCREENSHOT_COMMAND }));
    expect(sandbox.readBinaryFile).toHaveBeenCalledWith({ path: SCREENSHOT_PATH });
    expect(shot).toEqual({ mediaType: "image/jpeg", base64: Buffer.from([0xff, 0xd8, 0xff]).toString("base64") });
  });

  it("does not launch a browser when none is running", () => {
    expect(SCREENSHOT_COMMAND).toMatch(/^pgrep -f -- "--user-data-dir=\$AGENT_BROWSER_PROFILE" >\/dev\/null &&/);
  });

  it("returns null when there is no browser to capture", async () => {
    expect(await captureScreenshot(fakeSandbox({ exitCode: 1 }) as never)).toBeNull();
    expect(await captureScreenshot(fakeSandbox({ bytes: null }) as never)).toBeNull();
  });
});

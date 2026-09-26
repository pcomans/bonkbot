import type { SandboxSession } from "eve/sandbox";

export const SCREENSHOT_PATH = "/tmp/bonkbot-screen.jpg";

// Only capture a browser that is already running; a bare `agent-browser
// screenshot` would launch one on about:blank.
export const SCREENSHOT_COMMAND = `pgrep -f -- "--user-data-dir=$AGENT_BROWSER_PROFILE" >/dev/null && agent-browser screenshot ${SCREENSHOT_PATH} --screenshot-format jpeg --screenshot-quality 60 >/dev/null`;

export type Screenshot = { mediaType: "image/jpeg"; base64: string };

export async function captureScreenshot(
  sandbox: Pick<SandboxSession, "run" | "readBinaryFile">,
): Promise<Screenshot | null> {
  const result = await sandbox.run({ command: SCREENSHOT_COMMAND });
  if (result.exitCode !== 0) return null;
  const bytes = await sandbox.readBinaryFile({ path: SCREENSHOT_PATH });
  if (!bytes) return null;
  return { mediaType: "image/jpeg", base64: Buffer.from(bytes).toString("base64") };
}

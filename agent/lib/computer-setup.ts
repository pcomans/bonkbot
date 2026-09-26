import type { SandboxSession } from "eve/sandbox";

const SETUP_VERSION = 2;
const AGENT_BROWSER_VERSION = "0.38.1";

/** Latest frame of the browser, refreshed every 2.5s by the recorder. */
export const FRAME_PATH = "/tmp/bonkbot-frame.jpg";

/**
 * One-time setup for the bot's computer. The computer outlives deployments,
 * so bump SETUP_VERSION to re-run it after changing this script.
 */
export const SETUP_SCRIPT = `set -euo pipefail
marker=/workspace/.bonkbot/setup-v${SETUP_VERSION}
[ -f "$marker" ] && exit 0
sudo npm install -g --allow-scripts=agent-browser agent-browser@${AGENT_BROWSER_VERSION}
agent-browser install --with-deps
sudo tee /usr/local/bin/bonkbot-recorder >/dev/null <<'RECORDER'
#!/bin/bash
# Captures the browser every 2.5s while one is open. Processes do not survive
# a stop/resume; the agent-browser wrapper starts this on every call and the
# lock makes extra copies exit immediately.
exec 9>/tmp/bonkbot-recorder.lock
flock -n 9 || exit 0
while true; do
  if pgrep -f -- "--user-data-dir=$AGENT_BROWSER_PROFILE" >/dev/null; then
    command agent-browser screenshot ${FRAME_PATH}.tmp.jpg --screenshot-format jpeg --screenshot-quality 60 >/dev/null 2>&1 9>&- \\
      && mv -f ${FRAME_PATH}.tmp.jpg ${FRAME_PATH}
  fi
  sleep 2.5
done
RECORDER
sudo chmod +x /usr/local/bin/bonkbot-recorder
sudo tee /etc/profile.d/bonkbot.sh >/dev/null <<'PROFILE'
export AGENT_BROWSER_PROFILE=/workspace/.browser-profile
agent-browser() {
  # After a stop/resume the computer boots on a new VM, and Chrome refuses the
  # profile lock the old hostname left behind. Clear it when no Chrome owns it.
  pgrep -f -- "--user-data-dir=$AGENT_BROWSER_PROFILE" >/dev/null || rm -f "$AGENT_BROWSER_PROFILE"/Singleton{Lock,Cookie,Socket}
  setsid -f /usr/local/bin/bonkbot-recorder </dev/null >/dev/null 2>&1
  command agent-browser "$@"
}
export -f agent-browser
PROFILE
mkdir -p "$(dirname "$marker")" && touch "$marker"`;

export async function provisionComputer(sandbox: Pick<SandboxSession, "run">): Promise<void> {
  const result = await sandbox.run({ command: SETUP_SCRIPT });
  if (result.exitCode !== 0) {
    throw new Error(`Computer setup failed (exit ${result.exitCode}): ${result.stderr || result.stdout}`);
  }
}

import { Sandbox } from "@vercel/sandbox";
import { COMPUTER_NAME } from "@/agent/lib/computer";
import { createLogins } from "@/agent/lib/logins";

/** Logins on bonkbot's computer, from the web app. Resumes a sleeping computer. */
export async function computerLogins() {
  const computer = await Sandbox.get({ name: COMPUTER_NAME });
  return createLogins(async (command, env) => {
    const result = await computer.runCommand({ cmd: "bash", args: ["-lc", command], env });
    return { exitCode: result.exitCode, stdout: await result.stdout(), stderr: await result.stderr() };
  });
}

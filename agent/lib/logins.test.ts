import { describe, expect, it, vi } from "vitest";
import { LOGIN_REQUESTS_PATH, createLogins, toProfileName } from "./logins";

type Call = { command: string; env?: Record<string, string> };

/** Fake computer: an agent-browser auth store plus the login-requests file. */
function fakeComputer({ saved = [] as { name: string; url: string; username: string }[], requests = [] as object[] } = {}) {
  let requestsFile = JSON.stringify(requests);
  const profiles = [...saved];
  const calls: Call[] = [];
  const ok = (data: unknown) => ({ exitCode: 0, stdout: JSON.stringify({ success: true, data, error: null }), stderr: "" });

  const run = vi.fn(async (command: string, env: Record<string, string> = {}) => {
    calls.push({ command, env });
    if (command.startsWith("cat ")) return { exitCode: 0, stdout: requestsFile, stderr: "" };
    if (command.includes("> " + LOGIN_REQUESTS_PATH)) {
      requestsFile = env.DATA;
      return { exitCode: 0, stdout: "", stderr: "" };
    }
    if (command.startsWith("agent-browser auth list")) return ok({ profiles });
    if (command.includes("agent-browser auth save")) {
      profiles.push({ name: env.NAME, url: env.URL, username: env.USERNAME });
      return ok({ saved: env.NAME });
    }
    if (command.startsWith("agent-browser auth delete")) {
      profiles.splice(profiles.findIndex((p) => p.name === env.NAME), 1);
      return ok({ deleted: env.NAME });
    }
    if (command.startsWith("agent-browser auth login")) return ok({ loggedIn: true, name: env.NAME });
    throw new Error(`unexpected command: ${command}`);
  });

  return { run, calls, profiles, requests: () => JSON.parse(requestsFile) };
}

describe("toProfileName", () => {
  it("turns a site name into an agent-browser profile name", () => {
    expect(toProfileName("Amazon.com")).toBe("amazon-com");
    expect(toProfileName("  My Bank (US) ")).toBe("my-bank-us");
  });
});

describe("logins", () => {
  it("records a request for a login the user has not saved yet", async () => {
    const computer = fakeComputer();
    const logins = createLogins(computer.run);

    const login = await logins.requestLogin({ name: "Amazon.com", url: "https://www.amazon.com/signin" });

    expect(login).toEqual({ name: "amazon-com", url: "https://www.amazon.com/signin", filled: false });
    expect(computer.requests()).toEqual([{ name: "amazon-com", url: "https://www.amazon.com/signin" }]);
  });

  it("does not re-request a login that is already saved or requested", async () => {
    const computer = fakeComputer({ saved: [{ name: "github", url: "https://github.com/login", username: "me" }] });
    const logins = createLogins(computer.run);

    expect(await logins.requestLogin({ name: "GitHub", url: "https://github.com/login" })).toMatchObject({ filled: true });
    await logins.requestLogin({ name: "Amazon.com", url: "https://amazon.com" });
    await logins.requestLogin({ name: "amazon.com", url: "https://amazon.com" });
    expect(computer.requests()).toHaveLength(1);
  });

  it("lists saved logins and open requests", async () => {
    const computer = fakeComputer({
      saved: [{ name: "github", url: "https://github.com/login", username: "me" }],
      requests: [{ name: "amazon-com", url: "https://amazon.com" }],
    });

    expect(await createLogins(computer.run).listLogins()).toEqual([
      { name: "amazon-com", url: "https://amazon.com", filled: false },
      { name: "github", url: "https://github.com/login", filled: true, username: "me" },
    ]);
  });

  it("saves credentials with the password on stdin via env, never in the command", async () => {
    const computer = fakeComputer({ requests: [{ name: "amazon-com", url: "https://amazon.com" }] });

    await createLogins(computer.run).saveLogin({
      name: "amazon-com",
      url: "https://amazon.com",
      username: "me@example.com",
      password: "hunter2",
    });

    const save = computer.calls.find((call) => call.command.includes("auth save"));
    expect(save?.command).toBe(
      'printf %s "$PASSWORD" | agent-browser auth save "$NAME" --url "$URL" --username "$USERNAME" --password-stdin --json',
    );
    expect(save?.command).not.toContain("hunter2");
    expect(save?.env).toMatchObject({ NAME: "amazon-com", PASSWORD: "hunter2", USERNAME: "me@example.com" });
    expect(computer.requests()).toEqual([]);
  });

  it("signs in by profile name and reports agent-browser failures", async () => {
    const computer = fakeComputer();
    const logins = createLogins(computer.run);

    expect(await logins.signIn({ name: "Amazon.com" })).toBe('Signed in with the "amazon-com" login.');
    expect(computer.calls.at(-1)).toEqual({ command: 'agent-browser auth login "$NAME" --json', env: { NAME: "amazon-com" } });

    await logins.signIn({ name: "amazon-com", noNavigate: true });
    expect(computer.calls.at(-1)?.command).toBe('agent-browser auth login "$NAME" --no-navigate --json');

    computer.run.mockResolvedValueOnce({
      exitCode: 1,
      stdout: JSON.stringify({ success: false, data: null, error: "Profile 'x' not found" }),
      stderr: "",
    });
    await expect(logins.signIn({ name: "x" })).rejects.toThrow("Profile 'x' not found");
  });

  it("deletes a saved login and any open request for it", async () => {
    const computer = fakeComputer({
      saved: [{ name: "github", url: "https://github.com/login", username: "me" }],
      requests: [{ name: "github", url: "https://github.com/login" }],
    });

    await createLogins(computer.run).deleteLogin("github");

    expect(computer.profiles).toEqual([]);
    expect(computer.requests()).toEqual([]);
  });
});

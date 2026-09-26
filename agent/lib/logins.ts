/** Runs a shell command on bonkbot's computer (login shell, so agent-browser is on PATH). */
export type RunOnComputer = (
  command: string,
  env?: Record<string, string>,
) => Promise<{ exitCode: number; stdout: string; stderr: string }>;

/** Logins bonkbot asked for that the user has not saved yet. */
export const LOGIN_REQUESTS_PATH = "/workspace/.bonkbot/login-requests.json";

export type Login = { name: string; url: string; filled: boolean; username?: string };

type Request = { name: string; url: string };
type Profile = { name: string; url: string; username: string };

/** agent-browser profile names must match /^[a-zA-Z0-9_-]+$/. */
export function toProfileName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * bonkbot's logins, stored in agent-browser's encrypted auth vault on the
 * computer. bonkbot requests a login, the user saves it at /vault, and
 * `agent-browser auth login` finds the form and signs in without the model
 * ever seeing the password.
 */
export function createLogins(run: RunOnComputer) {
  async function authJson<T>(command: string, env: Record<string, string> = {}): Promise<T> {
    const result = await run(command, env);
    let parsed: { success?: boolean; data?: T; error?: string | null } = {};
    try {
      parsed = JSON.parse(result.stdout);
    } catch {}
    if (result.exitCode !== 0 || !parsed.success) {
      throw new Error(parsed.error || result.stderr.trim() || `agent-browser exited with ${result.exitCode}`);
    }
    return parsed.data as T;
  }

  const listProfiles = async () =>
    (await authJson<{ profiles: Profile[] }>("agent-browser auth list --json")).profiles;

  async function readRequests(): Promise<Request[]> {
    const result = await run(`cat ${LOGIN_REQUESTS_PATH} 2>/dev/null`);
    try {
      return result.exitCode === 0 && result.stdout.trim() ? JSON.parse(result.stdout) : [];
    } catch {
      return [];
    }
  }

  async function writeRequests(requests: Request[]): Promise<void> {
    const result = await run(`mkdir -p "$(dirname ${LOGIN_REQUESTS_PATH})" && printf %s "$DATA" > ${LOGIN_REQUESTS_PATH}`, {
      DATA: JSON.stringify(requests),
    });
    if (result.exitCode !== 0) throw new Error(`Could not save login requests: ${result.stderr.trim()}`);
  }

  return {
    async requestLogin({ name, url }: { name: string; url: string }): Promise<Login> {
      const profileName = toProfileName(name);
      const saved = (await listProfiles()).find((profile) => profile.name === profileName);
      if (saved) return { name: saved.name, url: saved.url, filled: true };
      const requests = await readRequests();
      if (!requests.some((request) => request.name === profileName)) {
        await writeRequests([...requests, { name: profileName, url }]);
      }
      return { name: profileName, url, filled: false };
    },

    async listLogins(): Promise<Login[]> {
      const [profiles, requests] = await Promise.all([listProfiles(), readRequests()]);
      const savedNames = new Set(profiles.map((profile) => profile.name));
      return [
        ...requests
          .filter((request) => !savedNames.has(request.name))
          .map((request) => ({ ...request, filled: false })),
        ...profiles.map((profile) => ({ ...profile, filled: true })),
      ];
    },

    async saveLogin({ name, url, username, password }: Request & { username: string; password: string }) {
      const profileName = toProfileName(name);
      await authJson(
        'printf %s "$PASSWORD" | agent-browser auth save "$NAME" --url "$URL" --username "$USERNAME" --password-stdin --json',
        { NAME: profileName, URL: url, USERNAME: username, PASSWORD: password },
      );
      await writeRequests((await readRequests()).filter((request) => request.name !== profileName));
    },

    async deleteLogin(name: string): Promise<void> {
      const profileName = toProfileName(name);
      if ((await listProfiles()).some((profile) => profile.name === profileName)) {
        await authJson('agent-browser auth delete "$NAME" --json', { NAME: profileName });
      }
      await writeRequests((await readRequests()).filter((request) => request.name !== profileName));
    },

    async signIn({ name, noNavigate = false }: { name: string; noNavigate?: boolean }): Promise<string> {
      const profileName = toProfileName(name);
      await authJson(`agent-browser auth login "$NAME"${noNavigate ? " --no-navigate" : ""} --json`, {
        NAME: profileName,
      });
      // auth login returns right after clicking submit; let the resulting
      // navigation start and finish so the reported page is where it landed.
      await run("sleep 1; agent-browser wait --load load");
      const [url, title] = await Promise.all([run("agent-browser get url"), run("agent-browser get title")]);
      return `Submitted the "${profileName}" login. The browser is now on "${title.stdout.trim()}" (${url.stdout.trim()}).`;
    },
  };
}

export type Logins = ReturnType<typeof createLogins>;

/** Logins on the computer, from inside an eve tool. */
export function loginsOn(sandbox: { run(options: { command: string; env?: Record<string, string> }): PromiseLike<{ exitCode: number; stdout: string; stderr: string }> }) {
  return createLogins(async (command, env) => await sandbox.run({ command, env }));
}

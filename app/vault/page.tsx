import { ArrowLeftIcon, KeyRoundIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { appAccessAllowed } from "@/agent/lib/access";
import type { Login } from "@/agent/lib/logins";
import { computerLogins } from "@/app/_lib/computer-logins";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteLogin, saveLogin } from "./actions";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  if (!appAccessAllowed()) notFound();
  let logins: Login[];
  try {
    logins = await (await computerLogins()).listLogins();
  } catch {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl items-center justify-center px-4 text-center text-muted-foreground text-sm">
        bonkbot&apos;s computer isn&apos;t set up yet. Send bonkbot a message first.
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3">
        <Button asChild size="icon" variant="ghost">
          <Link aria-label="Back to chat" href="/">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
        <h1 className="font-medium text-2xl tracking-tight">Logins</h1>
      </div>
      <p className="text-muted-foreground text-sm">
        bonkbot adds a login here when it needs to sign in somewhere. Fill in the username and password and it can
        sign in on its own. Logins are stored encrypted on bonkbot&apos;s computer, and bonkbot never sees the passwords.
      </p>

      {logins.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center text-muted-foreground text-sm">
          <KeyRoundIcon className="size-5" />
          No logins yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {logins
            .toSorted((a, b) => Number(a.filled) - Number(b.filled) || a.name.localeCompare(b.name))
            .map((login) => (
              <li className="rounded-xl border bg-card p-4" key={login.name}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{login.name}</p>
                    <a className="truncate text-muted-foreground text-xs hover:underline" href={login.url} rel="noreferrer" target="_blank">
                      {login.url}
                    </a>
                  </div>
                  {login.filled ? (
                    <Badge variant="secondary">Saved{login.username ? ` · ${login.username}` : ""}</Badge>
                  ) : (
                    <Badge>Needs your login</Badge>
                  )}
                </div>
                <form action={saveLogin.bind(null, login.name, login.url)} className="flex flex-col gap-2 sm:flex-row">
                  <Input autoComplete="off" name="username" placeholder={login.filled ? "New username" : "Username or email"} required />
                  <Input autoComplete="new-password" name="password" placeholder={login.filled ? "New password" : "Password"} required type="password" />
                  <Button type="submit">{login.filled ? "Replace" : "Save"}</Button>
                </form>
                <form action={deleteLogin.bind(null, login.name)} className="mt-2">
                  <Button className="h-auto px-0 text-muted-foreground text-xs" type="submit" variant="link">
                    Delete login
                  </Button>
                </form>
              </li>
            ))}
        </ul>
      )}
    </main>
  );
}

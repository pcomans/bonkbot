"use server";

import { revalidatePath } from "next/cache";
import { appAccessAllowed } from "@/agent/lib/access";
import { computerLogins } from "@/app/_lib/computer-logins";

function assertAllowed() {
  if (!appAccessAllowed()) throw new Error("Logins are not available on this deployment.");
}

export async function saveLogin(name: string, url: string, form: FormData): Promise<void> {
  assertAllowed();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!username || !password) throw new Error("Enter both a username and a password.");
  await (await computerLogins()).saveLogin({ name, url, username, password });
  revalidatePath("/vault");
}

export async function deleteLogin(name: string): Promise<void> {
  assertAllowed();
  await (await computerLogins()).deleteLogin(name);
  revalidatePath("/vault");
}

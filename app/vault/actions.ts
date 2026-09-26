"use server";

import { revalidatePath } from "next/cache";
import { computerLogins } from "@/app/_lib/computer-logins";

// Local-only until the app has real auth, like the chat's placeholder auth.
function assertLocal() {
  if (process.env.NODE_ENV === "production") throw new Error("The vault is only available locally for now.");
}

export async function saveLogin(name: string, url: string, form: FormData): Promise<void> {
  assertLocal();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!username || !password) throw new Error("Enter both a username and a password.");
  await (await computerLogins()).saveLogin({ name, url, username, password });
  revalidatePath("/vault");
}

export async function deleteLogin(name: string): Promise<void> {
  assertLocal();
  await (await computerLogins()).deleteLogin(name);
  revalidatePath("/vault");
}

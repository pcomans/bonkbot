import { Sandbox } from "@vercel/sandbox";
import { COMPUTER_NAME } from "@/agent/lib/computer";
import { screenResponse } from "@/app/_lib/computer-screen";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  // Frames can show logged-in pages. Like the chat's placeholder auth, this is
  // local-only until the app has real auth.
  if (process.env.NODE_ENV === "production") return new Response("Unauthorized", { status: 401 });

  const computer = await Sandbox.get({ name: COMPUTER_NAME }).catch(() => null);
  return screenResponse(computer);
}

import { Sandbox } from "@vercel/sandbox";
import { appAccessAllowed } from "@/agent/lib/access";
import { COMPUTER_NAME } from "@/agent/lib/computer";
import { screenResponse } from "@/app/_lib/computer-screen";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  // Frames can show logged-in pages; see appAccessAllowed.
  if (!appAccessAllowed()) return new Response("Unauthorized", { status: 401 });

  const computer = await Sandbox.get({ name: COMPUTER_NAME }).catch(() => null);
  return screenResponse(computer);
}

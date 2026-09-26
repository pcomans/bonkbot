import { FRAME_PATH } from "@/agent/lib/computer-setup";

type Computer = {
  status: string;
  readFileToBuffer(file: { path: string }): Promise<Buffer | null>;
};

export type ScreenState = "asleep" | "no-browser";

/**
 * Serves the recorder's latest browser frame. A stopped computer is reported
 * as asleep without touching it, because any file read would resume it.
 */
export async function screenResponse(computer: Computer | null): Promise<Response> {
  if (computer?.status !== "running") return empty("asleep");
  const frame = await computer.readFileToBuffer({ path: FRAME_PATH });
  if (!frame) return empty("no-browser");
  return new Response(new Uint8Array(frame), {
    headers: { "content-type": "image/jpeg", "cache-control": "no-store" },
  });
}

function empty(state: ScreenState): Response {
  return new Response(null, {
    status: 204,
    headers: { "x-computer-state": state, "cache-control": "no-store" },
  });
}

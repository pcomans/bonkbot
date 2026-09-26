import { FRAME_META_PATH, FRAME_PATH } from "@/agent/lib/computer-setup";

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
  const [frame, meta] = await Promise.all([
    computer.readFileToBuffer({ path: FRAME_PATH }),
    computer.readFileToBuffer({ path: FRAME_META_PATH }).then(parseMeta, () => null),
  ]);
  if (!frame) return empty("no-browser");
  const headers = new Headers({ "content-type": "image/jpeg", "cache-control": "no-store" });
  if (meta) {
    headers.set("x-frame-url", encodeURIComponent(meta.url));
    headers.set("x-frame-changed-at", String(meta.changedAt));
  }
  return new Response(new Uint8Array(frame), { headers });
}

function parseMeta(buffer: Buffer | null): { url: string; changedAt: number } | null {
  try {
    const meta = JSON.parse(buffer?.toString() ?? "");
    return typeof meta.url === "string" && typeof meta.changedAt === "number" ? meta : null;
  } catch {
    return null;
  }
}

function empty(state: ScreenState): Response {
  return new Response(null, {
    status: 204,
    headers: { "x-computer-state": state, "cache-control": "no-store" },
  });
}

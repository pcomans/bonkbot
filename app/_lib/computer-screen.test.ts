import { describe, expect, it, vi } from "vitest";
import { FRAME_META_PATH, FRAME_PATH } from "@/agent/lib/computer-setup";
import { screenResponse } from "./computer-screen";

const META = { url: "https://example.com/", changedAt: 1790000000 };

function fakeComputer(
  status: string,
  frame: Buffer | null = Buffer.from([0xff, 0xd8]),
  meta: string | null = JSON.stringify(META),
) {
  return {
    status,
    readFileToBuffer: vi.fn(async ({ path }: { path: string }) =>
      path === FRAME_PATH ? frame : meta === null ? null : Buffer.from(meta),
    ),
  };
}

describe("screenResponse", () => {
  it("serves the latest recorded frame as an uncached JPEG", async () => {
    const computer = fakeComputer("running");

    const response = await screenResponse(computer);

    expect(computer.readFileToBuffer).toHaveBeenCalledWith({ path: FRAME_PATH });
    expect(computer.readFileToBuffer).toHaveBeenCalledWith({ path: FRAME_META_PATH });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(Buffer.from([0xff, 0xd8]));
  });

  it("reports a sleeping computer without reading from it, so it stays asleep", async () => {
    const computer = fakeComputer("stopped");

    const response = await screenResponse(computer);

    expect(computer.readFileToBuffer).not.toHaveBeenCalled();
    expect(response.status).toBe(204);
    expect(response.headers.get("x-computer-state")).toBe("asleep");
  });

  it("reports when no browser frame has been recorded yet", async () => {
    const response = await screenResponse(fakeComputer("running", null));

    expect(response.status).toBe(204);
    expect(response.headers.get("x-computer-state")).toBe("no-browser");
  });

  it("reports a computer that does not exist yet as asleep", async () => {
    const response = await screenResponse(null);

    expect(response.status).toBe(204);
    expect(response.headers.get("x-computer-state")).toBe("asleep");
  });

  it("passes along the page URL and when the frame last changed", async () => {
    const response = await screenResponse(fakeComputer("running"));

    expect(decodeURIComponent(response.headers.get("x-frame-url") ?? "")).toBe("https://example.com/");
    expect(response.headers.get("x-frame-changed-at")).toBe("1790000000");
  });

  it("still serves the frame when its metadata is missing or malformed", async () => {
    for (const meta of [null, "not json"]) {
      const response = await screenResponse(fakeComputer("running", undefined, meta));
      expect(response.status).toBe(200);
      expect(response.headers.get("x-frame-url")).toBeNull();
    }
  });

  it("percent-encodes the URL so non-ASCII pages cannot break the header", async () => {
    const meta = JSON.stringify({ url: "https://例え.jp/ページ", changedAt: 1 });

    const response = await screenResponse(fakeComputer("running", undefined, meta));

    expect(decodeURIComponent(response.headers.get("x-frame-url") ?? "")).toBe("https://例え.jp/ページ");
  });
});

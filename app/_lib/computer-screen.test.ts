import { describe, expect, it, vi } from "vitest";
import { FRAME_PATH } from "@/agent/lib/computer-setup";
import { screenResponse } from "./computer-screen";

function fakeComputer(status: string, frame: Buffer | null = Buffer.from([0xff, 0xd8])) {
  return { status, readFileToBuffer: vi.fn(async () => frame) };
}

describe("screenResponse", () => {
  it("serves the latest recorded frame as an uncached JPEG", async () => {
    const computer = fakeComputer("running");

    const response = await screenResponse(computer);

    expect(computer.readFileToBuffer).toHaveBeenCalledWith({ path: FRAME_PATH });
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
});

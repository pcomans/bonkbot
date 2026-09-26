import { describe, expect, it } from "vitest";
import { MAX_ATTACHMENT_BYTES, attachmentBytes, attachmentsTooLarge } from "./attachment-limits";

const dataUrl = (bytes: number) => `data:image/png;base64,${"A".repeat(Math.ceil(bytes / 3) * 4)}`;

describe("attachment limits", () => {
  it("measures the decoded size of data URLs", () => {
    expect(attachmentBytes([dataUrl(3000), dataUrl(300)])).toBe(3300);
  });

  it("keeps a message's attachments under Vercel's 4.5 MB request limit", () => {
    expect(MAX_ATTACHMENT_BYTES * (4 / 3)).toBeLessThan(4.5 * 1024 * 1024);
    expect(attachmentsTooLarge([dataUrl(MAX_ATTACHMENT_BYTES - 3)])).toBe(false);
    expect(attachmentsTooLarge([dataUrl(MAX_ATTACHMENT_BYTES / 2), dataUrl(MAX_ATTACHMENT_BYTES / 2 + 3)])).toBe(true);
  });
});

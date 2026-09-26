/**
 * Attachments travel base64-encoded inside the message request, and Vercel
 * Functions accept request bodies up to 4.5 MB. Base64 adds a third, so keep a
 * message's files to 3 MB in total.
 */
export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

/** Decoded size of base64 data URLs, in bytes. */
export function attachmentBytes(dataUrls: readonly string[]): number {
  return dataUrls.reduce((total, url) => {
    const base64 = url.slice(url.indexOf(",") + 1);
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    return total + (base64.length * 3) / 4 - padding;
  }, 0);
}

export function attachmentsTooLarge(dataUrls: readonly string[]): boolean {
  return attachmentBytes(dataUrls) > MAX_ATTACHMENT_BYTES;
}

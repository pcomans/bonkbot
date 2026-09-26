/**
 * Vercel Sandbox timeouts count wall-clock time since the computer resumed,
 * not idle time. Extending on activity keeps it up while the bot works; once
 * activity stops, it idles out on its own.
 */
export function createKeepAlive({
  extend,
  intervalMs,
  now = Date.now,
}: {
  extend: () => Promise<void>;
  intervalMs: number;
  now?: () => number;
}): () => Promise<void> {
  let lastExtendedAt: number | null = null;

  return async () => {
    const at = now();
    if (lastExtendedAt !== null && at - lastExtendedAt < intervalMs) return;
    lastExtendedAt = at;
    try {
      await extend();
    } catch (error) {
      lastExtendedAt = null;
      throw error;
    }
  };
}

/** How much to extend so at least `minRemainingMs` is left before expiry. */
export function extensionNeeded({
  expiresAt,
  now,
  minRemainingMs,
}: {
  expiresAt: Date | undefined;
  now: number;
  minRemainingMs: number;
}): number {
  if (!expiresAt) return 0;
  return Math.max(0, minRemainingMs - (expiresAt.getTime() - now));
}

/**
 * Whether the web app (chat, Screen, Logins) may serve this request.
 *
 * The app has no login of its own. It relies on Vercel Deployment Protection
 * (Vercel Authentication, "All Deployments") to admit only the owner, so a
 * production deployment opens only when explicitly marked as protected with
 * BONKBOT_DEPLOYMENT_PROTECTED=1. Anything else fails closed.
 */
export function appAccessAllowed(env: Record<string, string | undefined> = process.env): boolean {
  if (env.NODE_ENV !== "production") return true;
  return env.BONKBOT_DEPLOYMENT_PROTECTED === "1";
}

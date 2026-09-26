import { eveChannel } from "eve/channels/eve";
import { localDev, none, placeholderAuth, vercelOidc } from "eve/channels/auth";
import { appAccessAllowed } from "../lib/access";

export default eveChannel({
  auth: [
    // Lets the eve TUI and your Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
    // The browser chat has no login of its own: behind Vercel Deployment
    // Protection (BONKBOT_DEPLOYMENT_PROTECTED=1) only the owner reaches it.
    // Otherwise the placeholder keeps production browser requests out.
    appAccessAllowed() ? none() : placeholderAuth(),
  ],
});

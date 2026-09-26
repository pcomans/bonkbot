import { defineTool } from "eve/tools";
import { z } from "zod";
import { loginsOn } from "../lib/logins";

export default defineTool({
  description:
    "Sign in to a site in your browser with a saved login. It opens the login page, finds the form, fills it, and submits; you never see the password. If you already navigated to the sign-in form yourself (e.g. after clicking through a consent screen), set noNavigate.",
  inputSchema: z.object({
    login: z.string().describe('Name of the saved login, e.g. "amazon-com".'),
    noNavigate: z.boolean().default(false).describe("Use the page that is already open instead of navigating to the login URL."),
  }),
  async execute({ login, noNavigate }, ctx) {
    return await loginsOn(await ctx.getSandbox()).signIn({ name: login, noNavigate });
  },
});

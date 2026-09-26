import { defineTool } from "eve/tools";
import { z } from "zod";
import { loginsOn } from "../lib/logins";

export default defineTool({
  description:
    'Ask the user for a login you need, e.g. for "Amazon.com". It appears at /vault for them to fill in; tell them so. If the login is already saved, use sign_in instead.',
  inputSchema: z.object({
    name: z.string().min(1).describe('Site name, e.g. "Amazon.com".'),
    url: z.string().url().describe("The site's sign-in page."),
  }),
  async execute(input, ctx) {
    const login = await loginsOn(await ctx.getSandbox()).requestLogin(input);
    return {
      ...login,
      next: login.filled
        ? `Already saved. Use sign_in with "${login.name}".`
        : "Ask the user to fill in this login at /vault, then use sign_in.",
    };
  },
});

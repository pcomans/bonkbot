import { defineTool } from "eve/tools";
import { z } from "zod";
import { loginsOn } from "../lib/logins";

export default defineTool({
  description: "List your saved logins and the ones still waiting for the user to fill in. Never shows passwords.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    return await loginsOn(await ctx.getSandbox()).listLogins();
  },
});

import { defineTool, toolOutput, toolOutputPart } from "eve/tools";
import { z } from "zod";
import { captureScreenshot } from "../lib/screenshot";

export default defineTool({
  description:
    "See the current page in your computer's browser. Use it when the accessibility snapshot is not enough, e.g. to check layout, images, or captchas.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const shot = await captureScreenshot(await ctx.getSandbox());
    return shot ?? { error: "No browser is open. Open a page with `agent-browser open <url>` first." };
  },
  toModelOutput(output) {
    if ("error" in output) return toolOutput.text(output.error);
    return toolOutput.content([
      toolOutputPart.text("Current browser page:"),
      toolOutputPart.file(output.base64, { mediaType: output.mediaType }),
    ]);
  },
});

// Records the bonkbot "CSV → CRM" demo against the local app (pnpm dev on :3000).
import { chromium } from "playwright";
import path from "node:path";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const APP = "http://localhost:3000";
const PROMPT =
  "Here are 5 new contacts. Please sign in to our CRM, Leadbox, at http://127.0.0.1:8765 and add each one as a lead. Tell me when they're all in.";
const DEMO_LOGIN = { username: "demo@leadbox.test", password: "bonk-demo-2026" };

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const pause = (page, s) => page.waitForTimeout(s * 1000);

/** Waits until the session has finished `turns` turns, reading eve's event stream. */
async function waitForTurns(sessionId, turns, minutes) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), minutes * 60_000);
  try {
    const response = await fetch(`${APP}/eve/v1/session/${sessionId}/stream`, { signal: controller.signal });
    const decoder = new TextDecoder();
    let buffer = "";
    let finished = 0;
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const type = JSON.parse(line).type;
        if (type === "turn.completed" || type === "turn.failed" || type === "turn.cancelled") {
          finished += 1;
          log(`turn ${finished} ${type}`);
          if (finished >= turns) return;
        }
      }
    }
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: path.join(DIR, "video"), size: { width: 1440, height: 900 } },
});
await context.addInitScript(() => {
  try {
    localStorage.setItem("bonkbot:screen-open", "1");
  } catch {}
  // On Logins, show only the Leadbox entry, so other saved logins (and their
  // usernames) never appear in the video. A stylesheet rule instead of DOM
  // edits, so React's hydration still matches the server HTML.
  if (location.pathname === "/vault") {
    // Init scripts run before <html> exists; add the rule as soon as <head>
    // is parsed, which is before any of the list is rendered.
    const addRule = () => {
      if (!document.head) return false;
      const style = document.createElement("style");
      style.textContent = 'main li:not(:has(a[href*="127.0.0.1:8765"])) { display: none !important; }';
      document.head.appendChild(style);
      return true;
    };
    if (!addRule()) {
      const observer = new MutationObserver(() => addRule() && observer.disconnect());
      observer.observe(document, { childList: true, subtree: true });
    }
  }
});
const page = await context.newPage();
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") log(`console.${m.type()}:`, m.text().slice(0, 300)); });
page.on("pageerror", (e) => log("pageerror:", e.message.slice(0, 300)));
page.on("requestfailed", (r) => log("requestfailed:", r.url().slice(0, 120), r.failure()?.errorText));

try {
  await page.goto(APP);
  await pause(page, 3);

  // Attach the CSV and ask.
  await page.locator('input[type="file"]').setInputFiles(path.join(DIR, "new-leads.csv"));
  await pause(page, 1.5);
  await page.locator("textarea").click();
  await page.keyboard.type(PROMPT, { delay: 22 });
  await pause(page, 1);
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/s\/wrun_/, { timeout: 60_000 });
  const sessionUrl = page.url();
  const sessionId = sessionUrl.split("/s/")[1];
  log("session", sessionId);
  await waitForTurns(sessionId, 1, 5);
  await pause(page, 4);

  // Save the login bonkbot asked for.
  await page.getByRole("link", { name: "Logins" }).click();
  await page.waitForURL("**/vault");
  await pause(page, 2);
  const card = page.locator("main li", { hasText: /leadbox/i });
  await card.getByPlaceholder(/username/i).click();
  await page.keyboard.type(DEMO_LOGIN.username, { delay: 40 });
  await card.getByPlaceholder(/password/i).click();
  await page.keyboard.type(DEMO_LOGIN.password, { delay: 40 });
  await pause(page, 0.8);
  await card.getByRole("button", { name: "Save" }).click();
  await card.getByText(/Saved/).waitFor({ timeout: 60_000 });
  await pause(page, 2.5);

  // Back to the chat, and let bonkbot do the work.
  await page.goto(sessionUrl);
  await pause(page, 3);
  await page.locator("textarea").click();
  await page.keyboard.type("Done, I saved the login.", { delay: 40 });
  await pause(page, 0.8);
  await page.keyboard.press("Enter");
  await waitForTurns(sessionId, 2, 10);
  await pause(page, 6);
  log("done");
} catch (error) {
  log("FAILED", error.message);
  await page.screenshot({ path: path.join(DIR, "failure.png") });
  process.exitCode = 1;
} finally {
  const video = page.video();
  await context.close();
  await browser.close();
  log("video", await video?.path());
}

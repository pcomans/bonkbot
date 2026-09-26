---
description: Use whenever a task needs a website — browsing, searching, reading pages, filling forms, or doing anything in a web app.
---

# Using your browser

Your computer has a Chrome browser driven by the `agent-browser` CLI. Run it through `bash`. The browser stays open between commands and its profile (cookies, logins) persists on your computer, so a site you signed into stays signed in.

## Loop

1. `agent-browser open <url>` to navigate.
2. `agent-browser snapshot -i` to list interactive elements with refs like `@e3`.
3. Act on refs: `agent-browser click @e3`, `agent-browser fill @e4 "text"`, `agent-browser press Enter`, `agent-browser select @e5 "Option"`.
4. Snapshot again after every page change; refs go stale when the page changes.

## Reading

- `agent-browser get text @e1` for one element, `agent-browser read` for the whole page as markdown.
- `agent-browser get url` / `agent-browser get title` to confirm where you are.
- Call the `browser_screenshot` tool when you need to see the page visually. Call it only after the navigation or action has finished, never in parallel with it, or you will see the previous page.

## Tips

- Chain related steps in one `bash` call: `agent-browser open example.com && agent-browser snapshot -i`.
- `agent-browser wait --text "Welcome"` or `agent-browser wait @e2` before acting on slow pages.
- A click that fails because something covers the element usually means a cookie banner or modal: dismiss it, snapshot, retry.
- `agent-browser tab list` / `agent-browser tab new <url>` for multiple tabs.
- Run `agent-browser --help` for anything not covered here.

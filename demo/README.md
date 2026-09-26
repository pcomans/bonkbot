# Demo: CSV → CRM

A recorded demo of bonkbot entering five contacts from a CSV into a CRM. It shows attachments, a login request filled in under Logins, `sign_in`, form filling in the browser, and the live Screen panel.

The CRM is **Leadbox** (`leadbox/index.html`), a fictional single-page app served on bonkbot's own computer at `http://127.0.0.1:8765`. Its demo account is `demo@leadbox.test` / `bonk-demo-2026`.

## Record a take

```bash
pnpm dev                                          # the web app on :3000
set -a; . ./.env.local; set +a; node demo/reset.mjs
node demo/record.mjs                              # writes demo/video/*.webm
```

`record.mjs` needs Playwright with Chromium (`npm i -g playwright && npx playwright install chromium`, or run it from a folder that has it). It records a 1440×900 window, waits on bonkbot's event stream for each turn, and on the Logins page hides every login except Leadbox so no other saved usernames appear.

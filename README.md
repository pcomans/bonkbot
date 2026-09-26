<p align="center"><img src="public/bonkbot.png" alt="bonkbot" width="160"></p>

# bonkbot

An AI teammate with its own persistent computer, in the spirit of xAI's Grok Bot, built on [eve](https://eve.dev) and Vercel.

- **Its own computer.** Every conversation shares one persistent [Vercel Sandbox](https://vercel.com/docs/sandbox) (`bonkbot-computer`). Files, installed programs, and browser logins survive between chats and across the computer sleeping and waking.
- **A real browser.** Chrome driven by [`agent-browser`](https://github.com/vercel-labs/agent-browser), with a persistent profile.
- **Watch it work.** The Screen panel in the web chat shows bonkbot's browser, refreshed every 2.5 seconds, plus the page URL and whether it has gone idle.
- **Logins.** bonkbot asks for a login when it needs one; you fill it in under Logins (`/vault`). Logins are stored in agent-browser's encrypted auth vault on the computer, and `sign_in` fills the form without the model ever seeing the password.

## How it works

| Piece | Where |
| --- | --- |
| Agent loop, durability, web chat | eve (`agent/`, `app/`) on Vercel Workflow |
| One computer shared by all sessions | `agent/sandbox.ts`, `agent/lib/shared-computer.ts`: wraps eve's session-owned Vercel sandbox so every session attaches to one named, persistent sandbox |
| One-time computer setup | `agent/lib/computer-setup.ts`: installs agent-browser and Chrome, the screen recorder, and a wrapper that fixes Chrome's profile lock after a resume |
| Keeping it awake while working | `agent/hooks/keep-computer-awake.ts`: Sandbox timeouts are wall-clock, so activity tops the remaining time up to 20 minutes |
| Screen view | `app/api/computer/screen/route.ts` serves the latest frame without waking a sleeping computer |
| Logins | `agent/lib/logins.ts`, `agent/tools/{create_login,list_logins,sign_in}.ts`, `app/vault/` |

## Run it locally

Requires Node 24+, pnpm, and a Vercel account (for Sandbox and AI Gateway).

```bash
pnpm install
pnpm exec eve link   # links a Vercel project and pulls credentials into .env.local
pnpm dev             # web chat at http://localhost:3000
```

The first message creates bonkbot's computer and sets it up (about a minute).

```bash
pnpm test            # unit tests
pnpm typecheck
```

`scripts/itest-computer-setup.mjs` runs the computer setup against a throwaway sandbox and checks the browser, the recorder, and stop/resume behavior.

## Status

A proof of concept. The web chat, Screen view, and Logins page are local-only: they have no auth yet, so don't deploy them publicly. Not yet built: approvals, taking over the screen, 2FA and CAPTCHAs, memory, learned skills, schedules, and multiple bots.

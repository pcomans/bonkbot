# User stories

Status: **Done**, **In progress**, or **Planned**.

## Chat with bonkbot in the browser — Done

As a bonkbot user, I want to chat with bonkbot in a web page so that I can hand it tasks without installing anything.

**Acceptance criteria**

- The web chat shows my messages, bonkbot's replies, and the tools it used.
- I can stop bonkbot mid-task and start a new chat.
- Chats survive a page reload: each chat has its own URL.

**Where it lives:** `app/`, `agent/` (eve web channel).

## bonkbot has its own computer — Done

As a bonkbot user, I want bonkbot to have one computer that it keeps between chats so that its files, installed programs, and browser logins are still there next time.

**Acceptance criteria**

- Every chat uses the same computer, not a fresh one per chat.
- Files, programs, and logins survive the computer going to sleep and waking up.
- Ending or deleting a chat never stops or deletes the computer.

**Where it lives:** `agent/sandbox.ts`, `agent/lib/shared-computer.ts`, `agent/lib/computer-setup.ts`.

## bonkbot can use a real browser — Done

As a bonkbot user, I want bonkbot to browse websites in a real browser so that it can do things on sites that have no API.

**Acceptance criteria**

- bonkbot can open pages, read them, click, type, and fill forms.
- bonkbot can look at a screenshot of the page when the text isn't enough.
- The browser keeps its cookies and logins across chats.

**Where it lives:** `agent/skills/browser/`, `agent/tools/browser_screenshot.ts`, `agent/lib/computer-setup.ts`.

## Watch bonkbot work — Done

As a bonkbot user, I want to see bonkbot's browser while it works so that I know what it is doing.

**Acceptance criteria**

- A Screen panel in the chat shows bonkbot's browser, refreshed every 2.5 seconds.
- The panel shows the page's URL, and says "idle" when the picture hasn't changed for 30 seconds.
- When the computer is asleep, the panel says so instead of waking it up.
- The panel never covers the chat box, on any screen size.

**Where it lives:** `app/_components/computer-screen.tsx`, `app/api/computer/screen/route.ts`, the recorder in `agent/lib/computer-setup.ts`.

## Give bonkbot logins without sharing passwords in chat — Done

As a bonkbot user, I want bonkbot to ask for a login when it needs one and let me fill it in on a separate page so that it can sign in to sites without me pasting passwords into the chat.

**Acceptance criteria**

- When bonkbot needs a login it doesn't have, it adds a request and points me to Logins (`/vault`).
- On Logins I can save, replace, and delete a username and password; saved passwords are never shown again.
- bonkbot signs in with a saved login without seeing the password, and reports which page it ended on.
- bonkbot never asks for a password in chat.

**Where it lives:** `agent/lib/logins.ts`, `agent/tools/{create_login,list_logins,sign_in}.ts`, `app/vault/`.

## Don't pay for an idle computer — Done

As a bonkbot user, I want bonkbot's computer to sleep when nobody is using it so that I only pay while it works.

**Acceptance criteria**

- The computer wakes up when bonkbot needs it and stops about 20 minutes after bonkbot's last action.
- The computer stays awake while bonkbot is in the middle of a task, even a long one.
- Looking at the Screen panel doesn't wake the computer.

**Where it lives:** `agent/hooks/keep-computer-awake.ts`, `agent/lib/keep-alive.ts`.

## Only I can use my deployed bonkbot — Done

As a bonkbot user, I want my deployed bonkbot to be reachable only by me so that nobody else can use it or see its screen and logins.

**Acceptance criteria**

- Every URL of the deployment, including production, requires my Vercel login.
- If protection is missing or misconfigured, the chat, Screen, and Logins stay locked.

**Where it lives:** Vercel Deployment Protection ("All Deployments"), `agent/lib/access.ts`.

## Attach images and files in the chat — In progress

As a bonkbot user, I want to attach images and other files in the chat so that bonkbot can look at them and use them on its computer, for example to upload a photo to a website or edit a spreadsheet.

**Acceptance criteria**

- The chat box has an attach button, and pasting or dropping a file also attaches it.
- bonkbot can see the content of attached images and PDFs.
- bonkbot knows where each attached file is on its computer and can use it with `bash` or `agent-browser upload`.
- Files too large to show the model directly still land on the computer and bonkbot can work with them there.

**Where it stands**

- eve already saves every uploaded file on bonkbot's computer at `/workspace/attachments/<id>/<filename>`. Because the computer is shared and persistent, files stay there across chats.
- Images up to 3 MB and PDFs up to 20 MB are shown to the model directly, but the model is not told their path on the computer. Larger files and other types are passed as a path only, without their content.
- The web chat sends files as message parts, but the composer has no attach button; only paste and drop are wired up, and neither has been tested.

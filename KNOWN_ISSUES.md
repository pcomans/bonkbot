# Known issues

## A message sent while bonkbot is working shows up below its reply

If you send a message while bonkbot is still working on a turn, the web chat steers the running turn (`turnPolicy: "steer"` in `app/_components/agent-chat.tsx`) instead of starting a new one. eve's React hook renders one assistant bubble per turn, and that bubble was already on screen above your message. Everything bonkbot does after reading your message is appended to that same bubble, so your message ends up at the bottom, below the reply to it.

eve's durable history is in the right order; only the rendering is off.

**Possible fixes**

- Split the assistant bubble where the steering message arrived, so bonkbot's reply continues in a new bubble below it. Keeps steering, but the hook does not expose where in the turn the message landed, so this means rebuilding that from the event stream.
- Send mid-turn messages with `turnPolicy: "queue"` so they start a new turn once the current one ends. Always ordered correctly, but bonkbot can no longer react mid-task.

## Sending too many attachments clears the typed message

If a message's attachments add up to more than 3 MB, the chat refuses to send it and keeps the files so you can remove one, but the text you typed is cleared. The chat box component resets the text field before handing the message over, so it can't be restored from outside.

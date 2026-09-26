# User stories

## Attach images and files in the chat

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

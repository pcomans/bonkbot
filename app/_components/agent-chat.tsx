"use client";

import type { UserContent } from "ai";
import { useEveAgent } from "eve/react";
import { AlertCircleIcon, BrainIcon, FileIcon, KeyRoundIcon, PaperclipIcon, PlusIcon, SquareIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationTopFade,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AgentMessage } from "./agent-message";
import { BonkbotIdle, BonkbotLogo } from "./bonkbot-art";
import { ComputerScreen, ScreenToggle } from "./computer-screen";
import { WEB_CHAT_AGENT } from "@/app/eve-agent";
import { MAX_ATTACHMENT_BYTES, attachmentsTooLarge } from "@/app/_lib/attachment-limits";

const DEFAULT_AGENT_NAME = "bonkbot";
const SCREEN_OPEN_KEY = "bonkbot:screen-open";
const AGENT_NAME = WEB_CHAT_AGENT ?? DEFAULT_AGENT_NAME;

export function AgentChat({
  sessionId,
  sessionless = false,
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
}) {
  const [cancellationError, setCancellationError] = useState<string>();
  const [attachmentError, setAttachmentError] = useState<string>();
  const [hasInputText, setHasInputText] = useState(false);
  const [screenOpen, setScreenOpen] = useScreenOpen();
  const agent = useEveAgent({
    agent: WEB_CHAT_AGENT,
    initialSession:
      sessionId === undefined
        ? undefined
        : {
            sessionId,
            streamIndex: 0,
          },
    resume: sessionId !== undefined,
    onSessionChange(session) {
      if (sessionId === undefined && session !== undefined) {
        // Next patches window.history to navigate, which would detach the active stream.
        History.prototype.replaceState.call(
          window.history,
          window.history.state,
          "",
          `/s/${encodeURIComponent(session.sessionId)}`,
        );
      }
    },
  });

  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const isResuming = agent.status === "resuming";
  const isEmpty = agent.data.messages.length === 0;
  const lastMessage = agent.data.messages.at(-1);
  const isPendingAssistantShell =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.every((part) => part.type === "step-start");
  const showPendingThinking =
    isBusy &&
    (agent.status === "submitted" || lastMessage?.role !== "assistant" || isPendingAssistantShell);
  const turnFailure = isBusy || isResuming ? undefined : getLatestTurnFailure(agent.events);
  const errorMessage = cancellationError ?? agent.error?.message ?? turnFailure;
  const hasConversationContent = sessionless || !isEmpty || errorMessage !== undefined;
  const showConversationLayout = isResuming || hasConversationContent;
  const activeSessionId = sessionId ?? agent.session?.sessionId;

  const requestCancellation = () => {
    setCancellationError(undefined);
    void agent.cancel().catch((error: unknown) => {
      setCancellationError(toErrorMessage(error));
    });
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if ((text.length === 0 && message.files.length === 0) || isResuming) return;

    if (attachmentsTooLarge(message.files.map((file) => file.url))) {
      setAttachmentError(TOO_LARGE);
      // Throwing keeps the attachments in the composer so one can be removed.
      throw new Error(TOO_LARGE);
    }
    setAttachmentError(undefined);
    setHasInputText(false);
    setCancellationError(undefined);
    const options = isBusy ? { turnPolicy: "steer" as const } : undefined;

    // send() resolves when bonkbot's turn ends; don't wait for it, so the
    // composer clears right away. Send errors surface through agent.error.
    if (message.files.length === 0) {
      void agent.send(text, options);
      return;
    }

    const parts: UserContent = [];
    if (text.length > 0) {
      parts.push({ text, type: "text" });
    }
    for (const file of message.files) {
      parts.push({
        data: file.url,
        filename: file.filename,
        mediaType: file.mediaType,
        type: "file",
      });
    }

    void agent.send(parts, options);
  };

  const composer = (
    <PromptInput
      maxFileSize={MAX_ATTACHMENT_BYTES}
      multiple
      onError={(error) => setAttachmentError(error.code === "max_file_size" ? FILE_TOO_LARGE : error.message)}
      onSubmit={handleSubmit}
    >
      <PendingAttachments error={attachmentError} onChange={() => setAttachmentError(undefined)} />
      <PromptInputTextarea
        disabled={isResuming}
        onChange={(event) => setHasInputText(event.currentTarget.value.trim().length > 0)}
        placeholder="Send a message…"
      />
      <AttachButton disabled={isResuming} />
      <ComposerAction
        hasInputText={hasInputText}
        isBusy={isBusy}
        isResuming={isResuming}
        onCancel={requestCancellation}
      />
    </PromptInput>
  );

  return (
    <main
      className={cn(
        "flex h-dvh flex-col overflow-hidden bg-background text-foreground",
        // Make room for the screen panel on large screens instead of covering the chat.
        screenOpen && "lg:pr-[504px]",
      )}
    >
      {showConversationLayout ? (
        <ChatHeader canStartNewChat={activeSessionId !== undefined} screenOpen={screenOpen} />
      ) : null}
      <div className="fixed top-3 left-6 z-30 flex gap-1">
        <ScreenToggle onToggle={() => setScreenOpen(!screenOpen)} open={screenOpen} />
        <Button asChild size="sm" variant="ghost">
          <a aria-label="Logins" href="/vault">
            <KeyRoundIcon className="size-4" />
            <span className="hidden font-normal text-sm sm:inline">Logins</span>
          </a>
        </Button>
      </div>
      <ComputerScreen onClose={() => setScreenOpen(false)} open={screenOpen} />

      {showConversationLayout ? (
        <Conversation
          className="min-h-0 flex-1"
          initial={sessionId === undefined ? undefined : false}
          resize={activeSessionId === undefined ? "smooth" : "instant"}
          scrollRestorationKey={
            isEmpty || activeSessionId === undefined
              ? undefined
              : `eve:web-chat-scroll:${activeSessionId}`
          }
        >
          <ConversationTopFade className="top-14" />
          <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 pt-20 pb-36 sm:px-6">
            {agent.data.messages.map((message, index) =>
              showPendingThinking &&
              isPendingAssistantShell &&
              message.id === lastMessage.id ? null : (
                <AgentMessage
                  canRespond={!isBusy && !isResuming}
                  isStreaming={
                    agent.status === "streaming" && index === agent.data.messages.length - 1
                  }
                  key={message.id}
                  message={message}
                  onInputResponses={(inputResponses) => {
                    setCancellationError(undefined);
                    return agent.respond(inputResponses);
                  }}
                />
              ),
            )}
            {showPendingThinking ? <PendingThinking /> : null}
            {errorMessage ? <ErrorMessage message={errorMessage} /> : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      ) : null}

      <div
        className={cn(
          "mx-auto w-full px-4 sm:px-6",
          showConversationLayout
            ? cn(
                "fixed right-0 bottom-0 left-0 z-20 max-w-3xl bg-gradient-to-t from-background via-background to-transparent pt-4 pb-6",
                screenOpen && "lg:right-[504px]",
              )
            : "flex max-w-xl flex-1 flex-col items-center justify-center gap-8 pb-[10vh]",
        )}
      >
        {showConversationLayout ? null : (
          <div className="flex flex-col items-center gap-3 text-center">
            <BonkbotIdle className="size-40" />
            <h1 className="font-medium text-5xl tracking-tighter">{AGENT_NAME}</h1>
            <p className="text-lg text-muted-foreground">Knock out some tasks!</p>
          </div>
        )}
        <div className="w-full">{composer}</div>
      </div>
    </main>
  );
}

const FILE_TOO_LARGE = "Files can be up to 3 MB.";
const TOO_LARGE = "Attachments can be up to 3 MB per message in total. Remove one and try again.";

function AttachButton({ disabled }: { readonly disabled: boolean }) {
  const attachments = usePromptInputAttachments();
  return (
    <PromptInputButton
      aria-label="Attach files"
      className="absolute right-12 bottom-2.5"
      disabled={disabled}
      onClick={() => attachments.openFileDialog()}
      tooltip="Attach files"
    >
      <PaperclipIcon className="size-4" />
    </PromptInputButton>
  );
}

/** Files attached to the message being written, each removable before sending. */
function PendingAttachments({ error, onChange }: { readonly error?: string; readonly onChange: () => void }) {
  const attachments = usePromptInputAttachments();
  const count = attachments.files.length;
  // A newly attached file means the user acted on the error.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only react to the count
  useEffect(() => {
    if (count > 0) onChange();
  }, [count]);
  if (count === 0 && !error) return null;

  return (
    <PromptInputHeader className="flex-wrap gap-2">
      {attachments.files.map((file) => (
        <span className="flex max-w-48 items-center gap-2 rounded-md border bg-background p-1 pr-1.5 text-xs" key={file.id}>
          {file.mediaType?.startsWith("image/") && file.url ? (
            // biome-ignore lint/performance/noImgElement: local blob preview
            <img alt="" className="size-8 shrink-0 rounded-sm object-cover" src={file.url} />
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
              <FileIcon className="size-4" />
            </span>
          )}
          <span className="min-w-0 truncate">{file.filename ?? "Attachment"}</span>
          <button
            aria-label={`Remove ${file.filename ?? "attachment"}`}
            className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => {
              attachments.remove(file.id);
              onChange();
            }}
            type="button"
          >
            <XIcon className="size-3.5" />
          </button>
        </span>
      ))}
      {error ? (
        <p className="w-full text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </PromptInputHeader>
  );
}

function ComposerAction({
  hasInputText,
  isBusy,
  isResuming,
  onCancel,
}: {
  readonly hasInputText: boolean;
  readonly isBusy: boolean;
  readonly isResuming: boolean;
  readonly onCancel: () => void;
}) {
  const attachments = usePromptInputAttachments();
  const canSubmit = hasInputText || attachments.files.length > 0;

  if (!isBusy || canSubmit) {
    return <PromptInputSubmit disabled={isResuming} />;
  }

  return (
    <PromptInputButton
      aria-label="Stop"
      className="absolute right-2.5 bottom-2.5"
      onClick={onCancel}
      variant="outline"
    >
      <SquareIcon className="size-3 fill-current" />
    </PromptInputButton>
  );
}

function ErrorMessage({ message }: { readonly message: string }) {
  return (
    <Message className="max-w-full" from="assistant">
      <MessageContent>
        <div
          className="flex w-full items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm"
          role="alert"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium">Request failed</p>
            <p className="mt-0.5 text-muted-foreground">{message}</p>
          </div>
        </div>
      </MessageContent>
    </Message>
  );
}

function ChatHeader({
  canStartNewChat,
  screenOpen,
}: {
  readonly canStartNewChat: boolean;
  readonly screenOpen: boolean;
}) {
  return (
    <header
      className={cn(
        "pointer-events-none fixed top-0 right-0 left-0 z-20 h-14",
        screenOpen && "lg:right-[504px]",
      )}
    >
      <div className="relative mx-auto flex h-full w-full max-w-3xl items-center justify-center bg-background px-24">
        <span className="flex items-center gap-2 truncate text-muted-foreground text-sm">
          <BonkbotLogo className="size-6" />
          {AGENT_NAME}
        </span>
        {canStartNewChat ? (
          <Button
            aria-label="Start a new chat"
            className="pointer-events-auto fixed top-3 right-6 pr-4"
            onClick={() => window.location.assign("/s")}
            size="sm"
            type="button"
            variant="ghost"
          >
            <PlusIcon className="size-4" />
            <span className="hidden font-normal text-sm sm:inline">New chat</span>
          </Button>
        ) : null}
      </div>
    </header>
  );
}

/** Whether the screen panel is open, remembered per browser. */
function useScreenOpen(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(SCREEN_OPEN_KEY) === "1");
    } catch {}
  }, []);
  const update = (next: boolean) => {
    setOpen(next);
    try {
      window.localStorage.setItem(SCREEN_OPEN_KEY, next ? "1" : "0");
    } catch {}
  };
  return [open, update];
}

function PendingThinking() {
  return (
    <Message aria-live="polite" from="assistant">
      <MessageContent>
        <div className="mb-4 flex w-full items-center gap-2 text-muted-foreground text-sm">
          <BrainIcon className="size-4" />
          <Shimmer duration={1}>Thinking</Shimmer>
        </div>
      </MessageContent>
    </Message>
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to cancel the response.";
}

function getLatestTurnFailure(
  events: ReturnType<typeof useEveAgent>["events"],
): string | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];

    if (event.type === "turn.failed") {
      return event.data.code === "MODEL_CALL_FAILED"
        ? "The model is temporarily unavailable. Please try again."
        : event.data.message;
    }

    if (event.type === "turn.completed" || event.type === "turn.cancelled") {
      return undefined;
    }

    if (event.type === "message.received") {
      return undefined;
    }
  }

  return undefined;
}

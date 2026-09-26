"use client";

import { MonitorIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BonkbotIdle } from "./bonkbot-art";

const POLL_MS = 2500;
/** A browser whose picture has not changed for this long is shown as idle. */
const IDLE_AFTER_MS = 30_000;

type Screen =
  | { state: "loading" | "asleep" | "no-browser" | "error" }
  | { state: "live"; src: string; pageUrl?: string; changedAt?: number };

const MESSAGES: Record<Exclude<Screen["state"], "live">, string> = {
  loading: "Connecting to the computer…",
  asleep: "bonkbot's computer is asleep. It wakes up when bonkbot needs it.",
  "no-browser": "No browser open yet.",
  error: "Could not reach the computer.",
};

/** Polls the computer's latest browser frame while visible. */
function useComputerScreen(enabled: boolean): Screen {
  const [screen, setScreen] = useState<Screen>({ state: "loading" });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (document.visibilityState === "visible") {
        try {
          const response = await fetch("/api/computer/screen", { cache: "no-store" });
          const next: Screen | null =
            response.status === 200
              ? await decodedFrame(await response.blob(), response.headers)
              : { state: response.headers.get("x-computer-state") === "no-browser" ? "no-browser" : "asleep" };
          if (next && cancelled && next.state === "live") URL.revokeObjectURL(next.src);
          // A frame that fails to decode keeps the previous picture on screen.
          if (next && !cancelled) {
            setScreen((previous) => {
              if (previous.state === "live") URL.revokeObjectURL(previous.src);
              return next;
            });
          }
        } catch {
          if (!cancelled) setScreen({ state: "error" });
        }
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    };

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled]);

  return screen;
}

/** Decodes a frame fully before showing it, so a bad frame never renders as broken. */
async function decodedFrame(blob: Blob, headers: Headers): Promise<Screen | null> {
  const src = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = src;
    await image.decode();
  } catch {
    URL.revokeObjectURL(src);
    return null;
  }
  return {
    state: "live",
    src,
    pageUrl: decodeHeader(headers.get("x-frame-url")),
    changedAt: Number(headers.get("x-frame-changed-at")) * 1000 || undefined,
  };
}

function decodeHeader(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

export function ComputerScreen({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const screen = useComputerScreen(open);
  if (!open) return null;
  const idleFor =
    screen.state === "live" && screen.changedAt !== undefined ? Date.now() - screen.changedAt : 0;
  const idle = idleFor > IDLE_AFTER_MS;

  return (
    <aside
      aria-label="bonkbot's screen"
      className="fixed inset-x-4 top-16 z-30 overflow-hidden rounded-xl border bg-background shadow-lg lg:inset-x-auto lg:right-6 lg:w-[480px]"
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              screen.state === "live" && !idle ? "bg-green-500" : "bg-muted-foreground/40",
            )}
          />
          <span className="font-medium">Screen</span>
          <span className="text-muted-foreground">
            {screen.state === "live" ? (idle ? `idle · no change for ${formatDuration(idleFor)}` : "live") : ""}
          </span>
        </div>
        <Button aria-label="Close screen" onClick={onClose} size="icon" variant="ghost">
          <XIcon className="size-4" />
        </Button>
      </div>
      <div className="flex aspect-video items-center justify-center bg-background">
        {screen.state === "live" ? (
          // biome-ignore lint/performance/noImgElement: blob URL frames
          <img
            alt="bonkbot's browser"
            className={cn("size-full object-contain transition-opacity", idle && "opacity-50")}
            src={screen.src}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            {screen.state === "asleep" ? <BonkbotIdle className="size-28" /> : null}
            <p className="text-muted-foreground text-sm">{MESSAGES[screen.state]}</p>
          </div>
        )}
      </div>
      {screen.state === "live" && screen.pageUrl ? (
        <p className="truncate border-t px-3 py-1.5 font-mono text-muted-foreground text-xs" title={screen.pageUrl}>
          {screen.pageUrl}
        </p>
      ) : null}
    </aside>
  );
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  return minutes < 1 ? `${Math.floor(ms / 1000)}s` : minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h`;
}

export function ScreenToggle({ open, onToggle }: { readonly open: boolean; readonly onToggle: () => void }) {
  return (
    <Button
      aria-label={open ? "Hide screen" : "Show screen"}
      aria-pressed={open}
      className="pointer-events-auto"
      onClick={onToggle}
      size="sm"
      type="button"
      variant={open ? "secondary" : "ghost"}
    >
      <MonitorIcon className="size-4" />
      <span className="hidden font-normal text-sm sm:inline">Screen</span>
    </Button>
  );
}

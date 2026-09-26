"use client";

import { MonitorIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const POLL_MS = 2500;

type Screen = { state: "loading" | "asleep" | "no-browser" | "error" } | { state: "live"; url: string };

const MESSAGES: Record<Exclude<Screen["state"], "live">, string> = {
  loading: "Connecting to the computer…",
  asleep: "The computer is asleep. It wakes up when bonkbot needs it.",
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
          const next: Screen =
            response.status === 200
              ? { state: "live", url: URL.createObjectURL(await response.blob()) }
              : { state: response.headers.get("x-computer-state") === "no-browser" ? "no-browser" : "asleep" };
          if (!cancelled) {
            setScreen((previous) => {
              if (previous.state === "live") URL.revokeObjectURL(previous.url);
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

export function ComputerScreen({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const screen = useComputerScreen(open);
  if (!open) return null;

  return (
    <aside
      aria-label="bonkbot's screen"
      className="fixed inset-x-4 top-16 z-30 overflow-hidden rounded-xl border bg-background shadow-lg lg:inset-x-auto lg:right-6 lg:w-[480px]"
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              "size-2 rounded-full",
              screen.state === "live" ? "bg-green-500" : "bg-muted-foreground/40",
            )}
          />
          <span className="font-medium">Screen</span>
          <span className="text-muted-foreground">{screen.state === "live" ? "live · every 2.5s" : ""}</span>
        </div>
        <Button aria-label="Close screen" onClick={onClose} size="icon" variant="ghost">
          <XIcon className="size-4" />
        </Button>
      </div>
      <div className="flex aspect-video items-center justify-center bg-muted/40">
        {screen.state === "live" ? (
          // biome-ignore lint/performance/noImgElement: blob URL frames
          <img alt="bonkbot's browser" className="size-full object-contain" src={screen.url} />
        ) : (
          <p className="px-6 text-center text-muted-foreground text-sm">{MESSAGES[screen.state]}</p>
        )}
      </div>
    </aside>
  );
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

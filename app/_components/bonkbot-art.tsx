import { cn } from "@/lib/utils";

// The idle video has the page background (#f5f5f5) baked in, so it blends in
// without mix-blend-mode, which browsers apply unreliably to video.

export function BonkbotLogo({ className }: { readonly className?: string }) {
  // biome-ignore lint/performance/noImgElement: small static logo
  return <img alt="" className={className} src="/bonkbot.png" />;
}

/** bonkbot idling: a silent loop, or the static logo for reduced motion. */
export function BonkbotIdle({ className }: { readonly className?: string }) {
  return (
    <>
      <video
        aria-hidden
        autoPlay
        className={cn("motion-reduce:hidden", className)}
        loop
        muted
        playsInline
        poster="/bonkbot.png"
      >
        <source src="/bonkbot-idle.webm?v=3" type="video/webm" />
        <source src="/bonkbot-idle.mp4?v=2" type="video/mp4" />
      </video>
      <BonkbotLogo className={cn("hidden motion-reduce:block", className)} />
    </>
  );
}

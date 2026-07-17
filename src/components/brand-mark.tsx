import { cn } from "@/lib/utils";

/**
 * The Clovior wordmark: a small solid forest-green glyph before the name set in the
 * display face, tight tracking, near-black. Replaces the old letter-tile "logo" —
 * understated and confident rather than the generic gradient square. Pure presentation.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span aria-hidden className="size-2.5 shrink-0 rounded-[2px] bg-primary" />
      <span className="font-display text-[15px] font-bold tracking-[-0.04em] text-foreground">
        Clovior
      </span>
    </span>
  );
}

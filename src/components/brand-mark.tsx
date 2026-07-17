import { cn } from "@/lib/utils";

/**
 * The Clovior wordmark: a small solid indigo glyph before the name set in the display
 * face, tight tracking, near-white. Replaces the old letter-tile "logo" — understated
 * and confident rather than the generic gradient square. Pure presentation.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-[3px] bg-primary"
      />
      <span className="font-display text-[15px] font-extrabold tracking-[-0.04em] text-[#f0f0f8]">
        Clovior
      </span>
    </span>
  );
}

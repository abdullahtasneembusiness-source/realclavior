import { cn } from "@/lib/utils";

/**
 * The Clovior brand mark: a geometric four-square "clover" glyph (Clovior → clover)
 * beside the wordmark in the display face. Three squares in the deep forest accent and
 * one in mint — three things done, one in motion, which is the product's whole story.
 * The same glyph drives the favicon (src/app/icon.tsx) and the OG share card.
 */
export function BrandGlyph({
  className,
  square,
}: {
  className?: string;
  /** Tailwind size class for each square, e.g. "size-[9px]". */
  square?: string;
}) {
  const sq = square ?? "size-[9px]";
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 grid-cols-2 gap-[2.5px]", className)}
    >
      <span className={cn(sq, "rounded-[2.5px] bg-primary")} />
      <span className={cn(sq, "rounded-[2.5px] bg-clovior-mint")} />
      <span className={cn(sq, "rounded-[2.5px] bg-primary")} />
      <span className={cn(sq, "rounded-[2.5px] bg-primary")} />
    </span>
  );
}

export function BrandMark({
  className,
  large,
}: {
  className?: string;
  /** Larger lockup for the landing header/footer, where the brand leads. */
  large?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center", large ? "gap-2.5" : "gap-2", className)}>
      <BrandGlyph square={large ? "size-[10px]" : "size-[7px]"} />
      <span
        className={cn(
          "font-display font-bold tracking-[-0.04em] text-foreground",
          large ? "text-[19px]" : "text-[15px]",
        )}
      >
        Clovior
      </span>
    </span>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { MEMBER_COLORS } from "@/lib/colors";
import { updateAvatarColor } from "./actions";

export function ColorPicker({
  workspaceId,
  initialColor,
}: {
  workspaceId: string;
  initialColor: string | null;
}) {
  const [color, setColor] = useState(initialColor ?? MEMBER_COLORS[0]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(next: string) {
    setError(null);
    setColor(next);
    startTransition(async () => {
      const result = await updateAvatarColor(workspaceId, next);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {MEMBER_COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            aria-label={`Use color ${swatch}`}
            onClick={() => pick(swatch)}
            disabled={isPending}
            className={cn(
              "flex size-8 items-center justify-center rounded-full transition-transform hover:scale-110 disabled:pointer-events-none",
              color === swatch &&
                "ring-2 ring-foreground ring-offset-2 ring-offset-background",
            )}
            style={{ backgroundColor: swatch }}
          >
            {color === swatch ? (
              isPending ? (
                <Loader2 className="size-3.5 animate-spin text-white" />
              ) : (
                <Check className="size-3.5 text-white" />
              )
            ) : null}
          </button>
        ))}
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

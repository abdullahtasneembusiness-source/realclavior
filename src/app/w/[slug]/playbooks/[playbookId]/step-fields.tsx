"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * The title / detail / link / requires-proof fields shared by the "add step" inline
 * form and the "edit step" dialog, so both stay identical. `idPrefix` keeps element
 * ids unique when several instances render on the same page.
 */
export function StepFields({
  idPrefix,
  defaultTitle = "",
  defaultDetail = "",
  defaultLinkUrl = "",
  defaultRequiresProof = false,
}: {
  idPrefix: string;
  defaultTitle?: string;
  defaultDetail?: string;
  defaultLinkUrl?: string;
  defaultRequiresProof?: boolean;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-title`}>Step</Label>
        <Input
          id={`${idPrefix}-title`}
          name="title"
          placeholder="e.g. Upload the final cut to the shared drive"
          required
          maxLength={140}
          defaultValue={defaultTitle}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-detail`}>
          Detail <span className="text-muted-foreground">(optional)</span>
        </Label>
        <textarea
          id={`${idPrefix}-detail`}
          name="detail"
          rows={2}
          maxLength={2000}
          defaultValue={defaultDetail}
          placeholder="Anything the operator needs to get this right."
          className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-link`}>
          Link <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id={`${idPrefix}-link`}
          name="linkUrl"
          type="url"
          inputMode="url"
          placeholder="https://…"
          defaultValue={defaultLinkUrl}
        />
      </div>

      <label
        htmlFor={`${idPrefix}-proof`}
        className="flex items-center gap-2.5 text-sm"
      >
        <input
          id={`${idPrefix}-proof`}
          name="requiresProof"
          type="checkbox"
          defaultChecked={defaultRequiresProof}
          className="size-4 rounded border-input accent-primary"
        />
        <span>
          Require proof
          <span className="ml-1 text-muted-foreground">
            — the operator must attach a link or file to complete this step
          </span>
        </span>
      </label>
    </>
  );
}

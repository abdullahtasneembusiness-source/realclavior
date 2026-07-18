"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Clock, Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberAvatar } from "@/components/member-avatar";
import { addLaunchItem, removeLaunchItem, type LaunchState } from "../actions";
import { dayLabel } from "../launch-format";
import type { LaunchItemView } from "@/types/db";

const initialState: LaunchState = {};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export interface PlaybookOption {
  id: string;
  name: string;
  ownerMembershipId: string | null;
}
export interface MemberOption {
  id: string;
  name: string;
  color: string | null;
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} data-testid="add-item-submit">
      {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add item
    </Button>
  );
}

function ItemRow({
  workspaceId,
  launchId,
  item,
}: {
  workspaceId: string;
  launchId: string;
  item: LaunchItemView;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <div
      data-testid={`launch-item-${item.id}`}
      className="flex items-center gap-3 px-4 py-3"
    >
      <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
        {dayLabel(item.offset_days)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.playbookName}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <MemberAvatar
            name={item.ownerName ?? "Unassigned"}
            color={item.ownerColor}
            size="sm"
          />
          {item.ownerName ?? "Unassigned"}
          {item.due_time ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> {item.due_time.slice(0, 5)}
            </span>
          ) : null}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Remove item"
        data-testid={`remove-item-${item.id}`}
        disabled={isPending}
        className="text-muted-foreground hover:text-destructive"
        onClick={() =>
          startTransition(async () => {
            await removeLaunchItem(workspaceId, launchId, item.id);
          })
        }
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
      </Button>
    </div>
  );
}

export function LaunchBuilder({
  workspaceId,
  launchId,
  items,
  playbooks,
  members,
}: {
  workspaceId: string;
  launchId: string;
  items: LaunchItemView[];
  playbooks: PlaybookOption[];
  members: MemberOption[];
}) {
  const bound = addLaunchItem.bind(null, workspaceId, launchId);
  const [state, formAction] = useFormState(bound, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const lastSuccess = useRef<string | undefined>(undefined);

  const [playbookId, setPlaybookId] = useState(playbooks[0]?.id ?? "");
  const [ownerId, setOwnerId] = useState(
    playbooks[0]?.ownerMembershipId ?? members[0]?.id ?? "",
  );

  // When the chosen playbook changes, default the owner to that playbook's usual owner
  // (still overridable for this launch).
  function onPlaybookChange(id: string) {
    setPlaybookId(id);
    const pb = playbooks.find((p) => p.id === id);
    if (pb?.ownerMembershipId) setOwnerId(pb.ownerMembershipId);
  }

  useEffect(() => {
    if (state.success && state.success !== lastSuccess.current) {
      lastSuccess.current = state.success;
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">Items</h2>

      {items.length > 0 ? (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              workspaceId={workspaceId}
              launchId={launchId}
              item={item}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
          No items yet. Add the first playbook below — pick who runs it and
          which day it lands on.
        </p>
      )}

      {playbooks.length > 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <form
              ref={formRef}
              action={formAction}
              className="flex flex-col gap-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="item-playbook">Playbook</Label>
                  <select
                    id="item-playbook"
                    name="playbookId"
                    value={playbookId}
                    onChange={(e) => onPlaybookChange(e.target.value)}
                    className={selectClass}
                  >
                    {playbooks.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="item-owner">Owner</Label>
                  <select
                    id="item-owner"
                    name="membershipId"
                    value={ownerId}
                    onChange={(e) => setOwnerId(e.target.value)}
                    className={selectClass}
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="item-offset">Day (offset from start)</Label>
                  <Input
                    id="item-offset"
                    name="offsetDays"
                    type="number"
                    defaultValue={0}
                    min={-60}
                    max={365}
                    inputMode="numeric"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="item-time">
                    Due time{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input id="item-time" name="dueTime" type="time" />
                </div>
              </div>

              {state.error ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.error}
                </p>
              ) : null}

              <div className="flex justify-end">
                <AddButton />
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Create a playbook first — a launch is made of playbooks.
        </p>
      )}
    </section>
  );
}

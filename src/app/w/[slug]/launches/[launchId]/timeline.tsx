import { MemberAvatar } from "@/components/member-avatar";
import { dayLabel } from "../launch-format";
import type { LaunchItemView } from "@/types/db";

/**
 * Owner rows × day columns — a founder should be able to glance at this and know what
 * happens on any day of the launch, and who's on the hook. Only days that actually have
 * items become columns, so it stays compact regardless of how spread out the offsets are.
 */
export function LaunchTimeline({ items }: { items: LaunchItemView[] }) {
  if (items.length === 0) return null;

  const days = Array.from(new Set(items.map((i) => i.offset_days))).sort(
    (a, b) => a - b,
  );

  // Preserve owner order by first appearance.
  const ownerOrder: string[] = [];
  const byOwner = new Map<string, LaunchItemView[]>();
  for (const item of items) {
    const key = item.membership_id ?? "unassigned";
    if (!byOwner.has(key)) {
      byOwner.set(key, []);
      ownerOrder.push(key);
    }
    byOwner.get(key)!.push(item);
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">Timeline</h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <div
          data-testid="launch-timeline"
          className="grid min-w-max"
          style={{
            gridTemplateColumns: `minmax(9rem, auto) repeat(${days.length}, minmax(9rem, 1fr))`,
          }}
        >
          {/* Header */}
          <div className="border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
            Owner
          </div>
          {days.map((d) => (
            <div
              key={d}
              className="border-b border-l border-border px-3 py-2 text-xs font-medium text-primary"
            >
              {dayLabel(d)}
            </div>
          ))}

          {/* Rows */}
          {ownerOrder.map((ownerKey) => {
            const ownerItems = byOwner.get(ownerKey)!;
            const owner = ownerItems[0];
            return (
              <div key={ownerKey} className="contents">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm">
                  <MemberAvatar
                    name={owner.ownerName ?? "Unassigned"}
                    color={owner.ownerColor}
                    size="sm"
                  />
                  <span className="truncate">
                    {owner.ownerName ?? "Unassigned"}
                  </span>
                </div>
                {days.map((d) => {
                  const cell = ownerItems.filter((i) => i.offset_days === d);
                  return (
                    <div
                      key={d}
                      className="flex flex-col gap-1.5 border-b border-l border-border p-2"
                    >
                      {cell.map((i) => (
                        <div
                          key={i.id}
                          className="bg-primary/10 rounded-md px-2 py-1.5 text-xs font-medium text-foreground"
                        >
                          {i.playbookName}
                          {i.due_time ? (
                            <span className="ml-1 text-muted-foreground">
                              {i.due_time.slice(0, 5)}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import type { NavItem } from "./nav-config";
import { NavLink } from "./nav-link";
import { UserMenu } from "./user-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { BrandMark } from "@/components/brand-mark";
import type { WorkspaceSummary } from "@/lib/workspace";

export function SidebarContent({
  workspaceId,
  workspace,
  allWorkspaces,
  navItems,
  displayName,
  email,
  color,
  onNavigate,
}: {
  workspaceId: string;
  workspace: WorkspaceSummary;
  allWorkspaces: WorkspaceSummary[];
  navItems: NavItem[];
  displayName: string;
  email: string | null;
  color: string | null;
  onNavigate?: () => void;
}) {
  // Collapse consecutive items into their section groups. Items without a group
  // (operator nav) fall into a single header-less group and render as a flat list.
  const groups: { name: string | null; items: NavItem[] }[] = [];
  for (const item of navItems) {
    const name = item.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.name === name) {
      last.items.push(item);
    } else {
      groups.push({ name, items: [item] });
    }
  }

  return (
    <div className="flex h-full flex-col p-3">
      <div className="mb-3 px-2 pt-1">
        <BrandMark />
      </div>
      <div className="mb-5">
        <WorkspaceSwitcher current={workspace} workspaces={allWorkspaces} />
      </div>

      <nav className="flex flex-1 flex-col gap-6">
        {groups.map((group, i) => (
          <div key={group.name ?? i} className="flex flex-col gap-0.5">
            {group.name ? (
              <p className="section-label mb-1.5 px-2.5">{group.name}</p>
            ) : null}
            {group.items.map((item) => (
              <NavLink
                key={item.label}
                item={item}
                workspaceId={workspaceId}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-border pt-3">
        <UserMenu
          workspaceId={workspaceId}
          displayName={displayName}
          email={email}
          color={color}
        />
      </div>
    </div>
  );
}

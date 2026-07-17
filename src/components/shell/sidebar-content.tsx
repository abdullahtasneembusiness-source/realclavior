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
  return (
    <div className="flex h-full flex-col gap-1 p-3">
      <div className="mb-1 px-1 pt-1">
        <BrandMark />
      </div>
      <div className="mb-2">
        <WorkspaceSwitcher current={workspace} workspaces={allWorkspaces} />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            item={item}
            workspaceId={workspaceId}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="mt-auto border-t border-border pt-2">
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

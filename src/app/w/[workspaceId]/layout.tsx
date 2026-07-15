import { AppShell } from "@/components/shell/app-shell";
import { requireWorkspaceContext } from "@/lib/workspace";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { workspaceId: string };
}) {
  const ctx = await requireWorkspaceContext(params.workspaceId);

  return <AppShell ctx={ctx}>{children}</AppShell>;
}

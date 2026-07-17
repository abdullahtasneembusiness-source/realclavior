import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireWorkspaceContext } from "@/lib/workspace";
import { ColorPicker } from "./color-picker";
import { NameForm } from "./name-form";

export default async function SettingsPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ctx = await requireWorkspaceContext(params.workspaceId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your profile in {ctx.workspace.name}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <NameForm initialName={ctx.fullName ?? ""} />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Avatar color</span>
            <ColorPicker
              workspaceId={ctx.workspace.id}
              initialColor={ctx.membership.color}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

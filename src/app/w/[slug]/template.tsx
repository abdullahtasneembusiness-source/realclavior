/**
 * Workspace page transition. A template remounts on every navigation between the
 * routes below it, so each page's content plays the page-in animation (fade + 6px
 * rise, 240ms — see globals.css) as it arrives. The shell around it stays put; only
 * the content moves. Reduced-motion users get an instant swap.
 */
export default function WorkspaceTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="animate-page-in">{children}</div>;
}

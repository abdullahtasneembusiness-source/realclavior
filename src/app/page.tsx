import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="border-clovior-violet/30 bg-clovior-violet/10 rounded-full border px-3 py-1 text-xs font-medium text-clovior-violet">
        Team Brain · Playbooks · Feedback Memory
      </span>
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
        Your team, running without you.
      </h1>
      <p className="max-w-md text-muted-foreground">
        The operating system for the team behind the info business.
      </p>
      <Button size="lg">Get started</Button>
    </main>
  );
}

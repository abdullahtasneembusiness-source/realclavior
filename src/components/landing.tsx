import Link from "next/link";

import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

/**
 * Signed-out marketing landing page. Fully static and public — no data fetching,
 * no client JS. The root route (src/app/page.tsx) renders this for logged-out
 * visitors and redirects everyone else into the app.
 */

/** A framed placeholder for a real product screenshot dropped into /public/landing. */
function Screenshot({
  filename,
  aspect = "aspect-[16/10]",
  className,
}: {
  filename: string;
  aspect?: string;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-[10px] border border-border bg-card shadow-[0_1px_2px_rgba(22,21,15,0.04),0_18px_40px_-24px_rgba(22,21,15,0.22)]",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-full items-center justify-center bg-[radial-gradient(circle_at_1px_1px,rgba(22,21,15,0.06)_1px,transparent_0)] [background-size:16px_16px]",
          aspect,
        )}
      >
        <div className="text-center">
          <span className="section-label">Screenshot</span>
          <p className="mt-1.5 font-mono text-xs text-muted-foreground">
            /landing/{filename}
          </p>
        </div>
      </div>
    </figure>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="section-label">{children}</p>;
}

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <BrandMark />
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Log in
          </Link>
          <Button asChild size="sm">
            <Link href="/login">Start free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

const FEATURES = [
  {
    name: "Playbooks",
    body: "Living checklists, always current. Never a dead Notion doc again.",
    filename: "playbooks.png",
  },
  {
    name: "Command View",
    body: "See if your team is moving in three seconds. No chasing.",
    filename: "command-view-2.png",
  },
  {
    name: "Team Brain",
    body: "Your standards, saved once, so a new hire onboards without you.",
    filename: "brain.png",
  },
  {
    name: "Launches",
    body: "Spin up a launch's fifty moving pieces in one click.",
    filename: "launches.png",
  },
  {
    name: "Goals",
    body: "Every task connected to what actually matters this quarter.",
    filename: "goals.png",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Describe how you work.",
    body: "Paste a Loom transcript or just talk it out. Clovior turns it into a step-by-step playbook.",
  },
  {
    n: "02",
    title: "Hand it off.",
    body: "Assign it once. It runs on schedule, as a checklist your operator follows.",
  },
  {
    n: "03",
    title: "Review and move on.",
    body: "Approve in a tap. Correct once, and it sticks forever.",
  },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        {/* SECTION 1 — HERO */}
        <section className="flex flex-col items-center pt-16 text-center sm:pt-24">
          <Kicker>Clovior</Kicker>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
            Your team can&apos;t move without you.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Clovior gives your operators playbooks that run themselves, feedback
            that sticks, and one place where nothing waits on you. Even if
            everything currently lives in your head.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login">Start free</Link>
            </Button>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              See how it works
            </a>
          </div>
          <p className="section-label mt-5">
            No credit card. First playbook live in 5 minutes.
          </p>

          <div className="mt-14 w-full sm:mt-16">
            <Screenshot filename="command-view.png" aspect="aspect-[16/9]" />
          </div>
        </section>

        {/* SECTION 2 — RECOGNITION */}
        <section className="mx-auto max-w-3xl py-24 sm:py-32">
          <Kicker>The problem</Kicker>
          <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
            You&apos;re the bottleneck. And you built it by accident.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Every task runs through your head. You re-explain the same things
            every week. You gave feedback once and it didn&apos;t stick, so now
            you&apos;re fixing the same mistake again. You can&apos;t tell
            who&apos;s stuck without asking, which feels like micromanaging. And
            every time an operator leaves, you rebuild from zero.
          </p>
          <p className="mt-8 font-display text-2xl font-medium leading-snug tracking-[-0.02em] text-foreground sm:text-[1.75rem]">
            You didn&apos;t fail at delegating because you&apos;re bad at it. You
            failed because no tool was built for how you actually run a team.
          </p>
        </section>

        {/* SECTION 3 — THE MECHANISM */}
        <section
          id="how-it-works"
          className="scroll-mt-20 border-y border-border py-24 sm:py-32"
        >
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <Kicker>How it works</Kicker>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] sm:text-4xl lg:text-5xl">
                Feedback that never has to be repeated.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                The first time you correct an operator, Clovior saves it to that
                playbook. Permanently. Every future time they run it, your
                correction is the first thing they see. The mistake doesn&apos;t
                come back. Your team gets sharper without you saying a word.
              </p>
            </div>
            <div className="relative">
              {/* Amber is the signature Feedback Memory color — used only here. */}
              <div className="bg-clovior-amber/12 absolute -inset-3 -z-10 rounded-2xl" />
              <Screenshot filename="feedback-memory.png" aspect="aspect-[4/3]" />
            </div>
          </div>
        </section>

        {/* SECTION 4 — THREE STEPS */}
        <section className="py-24 sm:py-32">
          <Kicker>Set up in minutes</Kicker>
          <div className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step) => (
              <div key={step.n} className="flex flex-col gap-3">
                <span className="font-mono text-2xl font-semibold tabular-nums text-primary">
                  {step.n}
                </span>
                <h3 className="text-lg font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 5 — THE FULL PICTURE */}
        <section className="border-t border-border py-24 sm:py-32">
          <Kicker>Everything in one place</Kicker>
          <div className="mt-14 flex flex-col gap-20">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.name}
                className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16"
              >
                <div className={cn(i % 2 === 1 && "lg:order-2")}>
                  <h3 className="text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
                    {feature.name}
                  </h3>
                  <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </div>
                <div className={cn(i % 2 === 1 && "lg:order-1")}>
                  <Screenshot filename={feature.filename} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 6 — OBJECTION PRE-HANDLE */}
        <section className="mx-auto max-w-3xl border-t border-border py-24 sm:py-32">
          <Kicker>&ldquo;I already have Notion&rdquo;</Kicker>
          <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
            Notion is where you build a system. Clovior is the system.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            In Notion you build it yourself, then watch it rot into a ghost town.
            Clovior is built for one job: running the people behind an info
            business. You&apos;re not configuring databases. You hand off work,
            and it stays handed off.
          </p>
        </section>

        {/* SECTION 7 — FINAL CTA */}
        <section className="flex flex-col items-center border-t border-border py-24 text-center sm:py-32">
          <h2 className="max-w-2xl text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
            Stop being the thing your team waits on.
          </h2>
          <Button asChild size="lg" className="mt-8">
            <Link href="/login">Start free</Link>
          </Button>
          <p className="section-label mt-5">
            No card. Your first playbook live in 5 minutes.
          </p>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-5 py-8 sm:flex-row sm:items-center sm:px-8">
          <BrandMark />
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
            <span className="font-mono text-xs">© 2026 Clovior</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

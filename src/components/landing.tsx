import Link from "next/link";

import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";
import { CommandViewMock } from "@/components/landing-mocks";
import {
  BrainDemo,
  FeedbackMemoryDemo,
  GoalsDemo,
  LaunchDemo,
  LiveFeedDemo,
  PlaybookRunDemo,
} from "@/components/landing-demos";

/**
 * Signed-out marketing landing page — product-led, terse, "Linear-tier".
 *
 * Every section is anchored by product UI rather than copy; total word count is roughly
 * half the previous page. No urgency mechanics, no emotional pitch — the audience
 * (successful info-business founders) trusts restraint and real product surfaces.
 *
 * The product visuals are live: looping pure-CSS demo scenes (landing-demos.tsx) — a
 * cursor working through a run, a correction pinning to Feedback Memory, the feed
 * streaming in. Reduced-motion users see each scene's completed state instead.
 */

/** Browser-style frame around product UI: hairline border, soft shadow, dot chrome. */
function Frame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-[10px] border border-border bg-background shadow-[0_1px_2px_rgba(22,21,15,0.04),0_24px_48px_-24px_rgba(22,21,15,0.25)]",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-border bg-card px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </figure>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="section-label">{children}</p>;
}

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <BrandMark large />
        <nav
          aria-label="Landing sections"
          className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex"
        >
          <a href="#product" className="transition-colors hover:text-foreground">
            Product
          </a>
          <a
            href="#how-it-works"
            className="transition-colors hover:text-foreground"
          >
            How it works
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Log in
          </Link>
          <Button asChild size="sm" className="active:translate-y-px">
            <Link href="/login">Start free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/** Bento tile: cropped product UI filling most of the tile, short title, one line. */
function Tile({
  title,
  line,
  mock,
  large,
}: {
  title: string;
  line: string;
  mock: React.ReactNode;
  large?: boolean;
}) {
  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden rounded-[10px] border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-[0_1px_2px_rgba(22,21,15,0.04),0_16px_32px_-20px_rgba(22,21,15,0.22)]",
        large && "sm:col-span-2",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden border-b border-border bg-background",
          large ? "h-52 sm:h-56" : "h-48 sm:h-52",
        )}
      >
        <div className="pointer-events-none absolute inset-x-4 top-4 sm:inset-x-6 sm:top-5">
          {mock}
        </div>
      </div>
      <div className="px-5 py-4">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
          {line}
        </p>
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Describe how you work.",
    line: "Paste a Loom transcript or type it out. Clovior turns it into a playbook.",
  },
  {
    n: "02",
    title: "Hand it off.",
    line: "Runs on schedule as a checklist your operator follows.",
  },
  {
    n: "03",
    title: "Review and move on.",
    line: "Approve in a tap. Corrections stick.",
  },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        {/* 1 — HERO: terse copy, the product screenshot is the visual. */}
        <section className="flex flex-col items-center pt-12 text-center sm:pt-16">
          <Kicker>For founders running remote teams</Kicker>
          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
            Hand off work. It stays handed off.
          </h1>
          <p className="mt-4 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
            Playbooks your operators run like checklists. Corrections that
            stick. One view of everything, without chasing anyone.
          </p>
          <div className="mt-6 flex items-center gap-5">
            <Button asChild size="lg" className="active:translate-y-px">
              <Link href="/login">Start free</Link>
            </Button>
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Log in
            </Link>
          </div>
          <p className="section-label mt-4">Free in early access</p>

          {/* Hero visual: Command View, one-time fade-up, overlapping the hairline. */}
          <div className="animate-hero-in relative z-10 mx-auto -mb-10 mt-10 w-full max-w-4xl text-left sm:-mb-14 sm:mt-12">
            <Frame>
              <CommandViewMock />
            </Frame>
          </div>
        </section>

        {/* 2 — ONE-LINE PROBLEM STRIP */}
        <section className="border-t border-border pb-14 pt-24 sm:pb-16 sm:pt-32">
          <Reveal>
            <p className="mx-auto max-w-3xl text-balance text-center font-display text-xl font-medium leading-snug tracking-[-0.02em] sm:text-2xl">
              Every task runs through you. Feedback doesn&apos;t stick. You
              can&apos;t see who&apos;s stuck without asking.{" "}
              <span className="text-muted-foreground">
                Clovior is the layer that fixes this.
              </span>
            </p>
          </Reveal>
        </section>

        {/* 3 — FEEDBACK MEMORY: the one deep-dive. Amber is reserved for this. */}
        <section className="border-t border-border py-14 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <Reveal>
              <Kicker>The core mechanism</Kicker>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
                Correct once. It sticks.
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                The first time you correct an operator, Clovior pins it to that
                playbook. Every future run, they see it before they start, so
                the same mistake doesn&apos;t come back.
              </p>
            </Reveal>
            <Reveal className="relative">
              <div className="bg-clovior-amber/12 absolute -inset-3 -z-10 rounded-2xl" />
              <Frame>
                <FeedbackMemoryDemo />
              </Frame>
            </Reveal>
          </div>
        </section>

        {/* 4 — BENTO GRID: dense, product-filled tiles. */}
        <section
          id="product"
          className="scroll-mt-16 border-t border-border py-14 sm:py-20"
        >
          <Reveal>
            <Kicker>The rest of the system</Kicker>
          </Reveal>
          <Reveal>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Tile
                large
                title="Playbooks"
                line="Living checklists. Never a dead doc again."
                mock={<PlaybookRunDemo />}
              />
              <Tile
                title="Command View"
                line="Is the team moving? Three seconds."
                mock={<LiveFeedDemo />}
              />
              <Tile
                title="Team Brain"
                line="Your standards, saved once. New hires onboard themselves."
                mock={<BrainDemo />}
              />
              <Tile
                title="Launches"
                line="Fifty moving pieces. One click."
                mock={<LaunchDemo />}
              />
              <Tile
                title="Goals"
                line="Every task tied to what matters this quarter."
                mock={<GoalsDemo />}
              />
            </div>
          </Reveal>
        </section>

        {/* 5 — HOW IT STARTS: compressed horizontal 3-step. */}
        <section
          id="how-it-works"
          className="scroll-mt-16 border-t border-border py-14 sm:py-20"
        >
          <Reveal>
            <Kicker>How it starts</Kicker>
            <div className="mt-6 grid gap-8 sm:grid-cols-3 sm:gap-6">
              {STEPS.map((step) => (
                <div key={step.n} className="flex flex-col gap-2">
                  <span className="font-mono text-xl font-semibold tabular-nums text-primary">
                    {step.n}
                  </span>
                  <h3 className="text-base font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.line}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* 6 — THE NOTION LINE */}
        <section className="border-t border-border py-14 text-center sm:py-20">
          <Reveal>
            <Kicker>Already have Notion?</Kicker>
            <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
              Notion is where you build a system. Clovior is the system.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
              No databases to configure, no setup to maintain. The structure for
              running an operator team is already built.
            </p>
          </Reveal>
        </section>

        {/* 7 — FINAL CTA: quiet close. */}
        <section className="flex flex-col items-center border-t border-border py-16 text-center sm:py-24">
          <Reveal className="flex flex-col items-center">
            <h2 className="max-w-2xl text-balance text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
              See it with your own team.
            </h2>
            <Button asChild size="lg" className="mt-6 active:translate-y-px">
              <Link href="/login">Start free</Link>
            </Button>
            <p className="section-label mt-4">Free in early access</p>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-6 sm:px-8">
          <BrandMark large />
          <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <span className="font-mono text-xs">© 2026 Clovior</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

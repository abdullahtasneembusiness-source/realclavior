import type { ManualSectionKey } from "@/types/db";

/** The six guided sections, in display order, with the heading each renders under. */
export const MANUAL_SECTIONS: {
  key: ManualSectionKey;
  heading: string;
  hint: string;
}[] = [
  {
    key: "communication",
    heading: "How I communicate",
    hint: "Preferred channels, tone, how direct I am, how I give feedback.",
  },
  {
    key: "delivery",
    heading: "How I like work delivered",
    hint: "Format, level of detail, always-do / never-do.",
  },
  {
    key: "response_time",
    heading: "My response-time expectations",
    hint: "How fast I expect replies, what 'urgent' means, what can wait.",
  },
  {
    key: "dealbreakers",
    heading: "My dealbreakers",
    hint: "What genuinely frustrates me, the mistakes that erode trust fastest.",
  },
  {
    key: "trust",
    heading: "How to earn my trust",
    hint: "What makes me confident to hand off more, what ownership looks like.",
  },
  {
    key: "standard",
    heading: "What good looks like",
    hint: "My actual standard, in my words, for the work my team does.",
  },
];

export const MANUAL_HEADINGS: Record<ManualSectionKey, string> =
  Object.fromEntries(MANUAL_SECTIONS.map((s) => [s.key, s.heading])) as Record<
    ManualSectionKey,
    string
  >;

/**
 * The AI interview — plain, one-at-a-time questions mapped to the six sections. The
 * founder answers casually; a single Claude call synthesizes clean sections from the
 * lot, so there's no need for one question per section.
 */
export const INTERVIEW_QUESTIONS: { section: ManualSectionKey; q: string }[] = [
  {
    section: "communication",
    q: "When an operator messes something up, do you want to hear it bluntly or gently — and where (DM, comment, call)?",
  },
  {
    section: "communication",
    q: "How do you like to be kept in the loop — constant updates, or only when something needs you?",
  },
  {
    section: "delivery",
    q: "When someone hands you finished work, what makes you think 'yes, this is exactly right'?",
  },
  {
    section: "delivery",
    q: "Is there anything you always want done a certain way, or never want to see?",
  },
  {
    section: "response_time",
    q: "How fast do you expect a reply during the workday, and what counts as actually urgent?",
  },
  {
    section: "dealbreakers",
    q: "What's the fastest way an operator loses your trust?",
  },
  {
    section: "trust",
    q: "What does taking real ownership look like to you — what makes you comfortable handing off more?",
  },
  {
    section: "standard",
    q: "In your own words, what does great work look like on your team?",
  },
];

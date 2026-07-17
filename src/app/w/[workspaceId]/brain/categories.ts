import type { BrainCategory } from "@/types/db";

/** Human labels for each Brain category. */
export const CATEGORY_LABELS: Record<BrainCategory, string> = {
  voice: "Voice",
  standards: "Standards",
  tools: "Tools",
  contacts: "Contacts",
  preferences: "Preferences",
  other: "Other",
  corrections: "Corrections",
};

/** Categories a person can author into — "corrections" is a derived, read-only view. */
export const EDITABLE_CATEGORIES: BrainCategory[] = [
  "voice",
  "standards",
  "tools",
  "contacts",
  "preferences",
  "other",
];

/**
 * Avatar colors assigned to memberships. Drawn from the brand palette plus a few
 * complementary hues so a team of up to ~8 operators each gets a distinct circle.
 */
export const MEMBER_COLORS = [
  "#5B4BE0", // indigo (brand)
  "#F77C6A", // coral
  "#3DD68C", // mint
  "#F7C76A", // amber
  "#6AB8F7", // sky
  "#C76AF7", // orchid
  "#F76AB8", // rose
  "#6AF7C7", // aqua
] as const;

/** Deterministically pick a color from a seed (e.g. an email or name). */
export function pickMemberColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
}

/** Random color, used when a color isn't seeded from stable input. */
export function randomMemberColor(): string {
  return MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)];
}

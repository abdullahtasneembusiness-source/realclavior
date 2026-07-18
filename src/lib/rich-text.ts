/**
 * Helpers for Brain entry bodies, which hold lightweight rich text (HTML produced
 * by the Tiptap editor). These run on both server and client, so they use plain
 * string work rather than the DOM — good enough for search matching and card
 * previews, where we only need the readable text, not a faithful render.
 */

const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#039;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(
      /&(amp|lt|gt|quot|#0?39|apos|nbsp);/g,
      (match) => NAMED_ENTITIES[match] ?? match,
    );
}

/** True when the stored body is HTML (new entries) vs. a legacy plain-text note. */
export function looksLikeHtml(body: string): boolean {
  return /<[a-z][\s\S]*>/i.test(body);
}

/** Strips formatting from a rich body down to readable, whitespace-collapsed text. */
export function htmlToText(body: string | null | undefined): string {
  if (!body) return "";
  const withBreaks = body
    // Block boundaries become spaces so words don't run together.
    .replace(/<\/(p|h[1-6]|li|div|br)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(withBreaks).replace(/\s+/g, " ").trim();
}

/** A short plain-text preview for list cards. Returns { text, truncated }. */
export function excerpt(
  body: string | null | undefined,
  max = 220,
): { text: string; truncated: boolean } {
  const text = htmlToText(body);
  if (text.length <= max) return { text, truncated: false };
  return { text: text.slice(0, max).trimEnd() + "…", truncated: true };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Normalizes a stored body into HTML the editor/viewer can render. New entries are
 * already HTML; legacy plain-text notes are wrapped into paragraphs with their line
 * breaks preserved so nothing regresses.
 */
export function toRenderableHtml(body: string | null | undefined): string {
  if (!body) return "";
  if (looksLikeHtml(body)) return body;
  const paragraphs = body
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`);
  return paragraphs.join("");
}

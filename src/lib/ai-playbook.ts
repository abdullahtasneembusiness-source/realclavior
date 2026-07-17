import { z } from "zod";

import type { PlaybookDraft } from "@/types/db";

/**
 * AI playbook generation (Phase 2b). Turns a founder's messy, free-form description
 * ("how I want my VA to upload weekly content") into a clean, ordered, editable
 * playbook draft — the single biggest lever on setup friction, which is this
 * product's main adoption risk.
 *
 * The model is forced to answer through a tool call (`save_playbook_draft`) so we get
 * structured JSON we can parse reliably, rather than fishing clean JSON out of prose.
 * Everything the model returns is treated as untrusted and re-validated with zod and
 * hard length/count caps before it reaches the database.
 *
 * `ANTHROPIC_BASE_URL` lets this point at a gateway/proxy (or, in the E2E suite, a
 * deterministic mock) instead of the public API — it defaults to the real endpoint.
 */

export type GenerateResult =
  | { ok: true; draft: PlaybookDraft }
  | { ok: false; code: "not_configured" | "failed" };

export function aiPlaybookAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const MAX_STEPS = 30;

const toolInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  confidence: z.enum(["high", "low"]).catch("high"),
  note: z.string().trim().max(400).nullish(),
  steps: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(140),
        detail: z.string().trim().max(2000).nullish(),
        requires_proof: z.boolean().nullish(),
      }),
    )
    .max(MAX_STEPS),
});

const SYSTEM_PROMPT = `You turn a founder's rough description of a task into a clean, runnable playbook for a team member (an "operator" — a VA, editor, or assistant) to follow.

Rules:
- Extract a short, clear playbook name (a noun phrase, e.g. "Publish a weekly YouTube video").
- Break the process into an ordered sequence of concrete steps.
- Each step title is a short imperative, action-first, 5-8 words max: "Export video at 1080p", never "The video should be exported at 1080p".
- Each step detail is 1-2 plain sentences with anything the operator needs to get it right. Keep it tight. No corporate language, no filler, no restating the title.
- Set requires_proof true for any step that produces a verifiable artifact or an outward action — uploading, publishing, sending, scheduling — where a founder would want to see a link or file as proof it was done.
- Match a direct, plain, human voice. No fluff.
- If the description is too vague to draft a real process (e.g. "do the thing with the videos"), do NOT invent a specific fake process. Instead set confidence to "low", add a short note saying what you'd need to know, and return at most a couple of generic placeholder steps.
- Always answer by calling the save_playbook_draft tool. Never write prose.`;

const TOOL = {
  name: "save_playbook_draft",
  description:
    "Save the drafted playbook. Always call this exactly once with the full draft.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description: "Short, clear playbook name (a noun phrase).",
      },
      confidence: {
        type: "string",
        enum: ["high", "low"],
        description:
          "'low' when the input was too vague to draft a real process.",
      },
      note: {
        type: "string",
        description:
          "Optional short note to the founder — used mainly to explain a low-confidence draft.",
      },
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Imperative, action-first, 5-8 words max.",
            },
            detail: {
              type: "string",
              description: "1-2 plain sentences. May be empty.",
            },
            requires_proof: {
              type: "boolean",
              description:
                "True if the step needs visual proof (upload/publish/send).",
            },
          },
          required: ["title"],
        },
      },
    },
    required: ["name", "confidence", "steps"],
  },
};

interface AnthropicContentBlock {
  type: string;
  name?: string;
  input?: unknown;
}

/**
 * Calls the model and returns a validated, capped draft. Any failure — missing key,
 * network/timeout, non-200, malformed tool output — collapses to a single
 * `{ ok: false }` so the caller can show one clear "try again" state and never hang.
 */
export async function generatePlaybookDraft(
  description: string,
): Promise<GenerateResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, code: "not_configured" };

  const baseUrl = (
    process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"
  ).replace(/\/$/, "");
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

  // Cap the request so a giant paste can't run up cost or latency.
  const input = description.trim().slice(0, 8000);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        tools: [TOOL],
        tool_choice: { type: "tool", name: TOOL.name },
        messages: [{ role: "user", content: input }],
      }),
    });

    if (!res.ok) return { ok: false, code: "failed" };

    const data = (await res.json()) as { content?: AnthropicContentBlock[] };
    const toolUse = data.content?.find(
      (block) => block.type === "tool_use" && block.name === TOOL.name,
    );
    if (!toolUse) return { ok: false, code: "failed" };

    const parsed = toolInputSchema.safeParse(toolUse.input);
    if (!parsed.success) return { ok: false, code: "failed" };

    const steps = parsed.data.steps.map((s) => ({
      title: s.title,
      detail: s.detail?.trim() ?? "",
      requiresProof: s.requires_proof ?? false,
    }));

    // No usable steps means the model couldn't draft a real process — present that
    // honestly as a low-confidence result rather than an empty "success".
    const confidence =
      steps.length === 0 ? "low" : (parsed.data.confidence ?? "high");

    return {
      ok: true,
      draft: {
        name: parsed.data.name,
        confidence,
        note: parsed.data.note?.trim() || null,
        steps,
      },
    };
  } catch {
    return { ok: false, code: "failed" };
  } finally {
    clearTimeout(timeout);
  }
}

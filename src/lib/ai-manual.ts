import { z } from "zod";

import type { ManualSectionKey } from "@/types/db";

/**
 * AI synthesis for the Founder's Manual (Addition A). Takes a founder's casual,
 * one-line answers to a short interview and writes them up into six clean sections in
 * the founder's own voice — the showcase creation path, since nobody fills in six
 * thoughtful sections cold.
 *
 * Same shape as ai-playbook: the model is forced through a tool call so we get reliable
 * keyed JSON, everything it returns is re-validated, and ANTHROPIC_BASE_URL lets the
 * E2E suite point this at a deterministic mock.
 */

export type ManualDraft = Record<ManualSectionKey, string>;

export type GenerateManualResult =
  | { ok: true; sections: ManualDraft }
  | { ok: false; code: "not_configured" | "failed" };

export function aiManualAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const sectionText = z.string().trim().max(3000).nullish();
const toolInputSchema = z.object({
  communication: sectionText,
  delivery: sectionText,
  response_time: sectionText,
  dealbreakers: sectionText,
  trust: sectionText,
  standard: sectionText,
});

const SYSTEM_PROMPT = `You write a founder's "user manual" — a short document that tells their team how the founder thinks and expects to be worked with. You'll get a founder's casual, off-the-cuff answers to a few questions. Turn them into six clean sections, each a few sentences, in the founder's own plain, direct voice.

Rules:
- Write in first person, as the founder ("I..."). Plain and human. No corporate language, no filler, no hedging.
- Keep each section tight — a few sentences, not an essay. If an answer was thin, write what you can honestly infer and keep it short; don't pad.
- The six sections: communication (how I communicate + give feedback), delivery (how I like work delivered), response_time (my response-time expectations), dealbreakers (what erodes my trust fastest), trust (how to earn my trust / what ownership looks like), standard (what good looks like to me).
- Always answer by calling the save_founder_manual tool. Never write prose outside it.`;

const TOOL = {
  name: "save_founder_manual",
  description: "Save the drafted founder's manual. Call this exactly once.",
  input_schema: {
    type: "object" as const,
    properties: {
      communication: { type: "string" },
      delivery: { type: "string" },
      response_time: { type: "string" },
      dealbreakers: { type: "string" },
      trust: { type: "string" },
      standard: { type: "string" },
    },
    required: [
      "communication",
      "delivery",
      "response_time",
      "dealbreakers",
      "trust",
      "standard",
    ],
  },
};

interface AnthropicContentBlock {
  type: string;
  name?: string;
  input?: unknown;
}

export async function generateFounderManual(
  qa: { q: string; a: string }[],
): Promise<GenerateManualResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, code: "not_configured" };

  const baseUrl = (
    process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"
  ).replace(/\/$/, "");
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

  const transcript = qa
    .map((p) => `Q: ${p.q}\nA: ${p.a.trim().slice(0, 1000)}`)
    .join("\n\n")
    .slice(0, 8000);

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
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        tools: [TOOL],
        tool_choice: { type: "tool", name: TOOL.name },
        messages: [{ role: "user", content: transcript }],
      }),
    });
    if (!res.ok) return { ok: false, code: "failed" };

    const data = (await res.json()) as { content?: AnthropicContentBlock[] };
    const toolUse = data.content?.find(
      (b) => b.type === "tool_use" && b.name === TOOL.name,
    );
    if (!toolUse) return { ok: false, code: "failed" };

    const parsed = toolInputSchema.safeParse(toolUse.input);
    if (!parsed.success) return { ok: false, code: "failed" };

    return {
      ok: true,
      sections: {
        communication: parsed.data.communication?.trim() ?? "",
        delivery: parsed.data.delivery?.trim() ?? "",
        response_time: parsed.data.response_time?.trim() ?? "",
        dealbreakers: parsed.data.dealbreakers?.trim() ?? "",
        trust: parsed.data.trust?.trim() ?? "",
        standard: parsed.data.standard?.trim() ?? "",
      },
    };
  } catch {
    return { ok: false, code: "failed" };
  } finally {
    clearTimeout(timeout);
  }
}

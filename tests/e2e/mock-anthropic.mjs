// Deterministic stand-in for the Anthropic Messages API, used only by the E2E suite
// (the app points ANTHROPIC_BASE_URL here — see playwright.config.ts). It returns a
// fixed tool_use payload shaped exactly like a real `save_playbook_draft` call, so the
// whole generate → edit → save flow can be exercised in a real browser without a key,
// a network call, or nondeterministic model output.
//
// It branches on the description so every path is testable:
//   - contains "boom"   → HTTP 500 (simulates an upstream failure)
//   - contains "vague"  → a low-confidence draft with a note
//   - otherwise         → a solid multi-step draft

import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 8899);

const HIGH_CONFIDENCE = {
  name: "Publish the weekly podcast episode",
  confidence: "high",
  note: null,
  steps: [
    {
      title: "Export the final audio",
      detail: "Bounce the edited episode to WAV at the studio setting.",
      requires_proof: false,
    },
    {
      title: "Upload to the podcast host",
      detail: "Create a new episode in the host and upload the file.",
      requires_proof: true,
    },
    {
      title: "Schedule the release",
      detail: "Set it to publish at 6am on release day.",
      requires_proof: true,
    },
  ],
};

const LOW_CONFIDENCE = {
  name: "Untitled task",
  confidence: "low",
  note: "Tell me what the videos are and where they need to go.",
  steps: [{ title: "Clarify the task", detail: "", requires_proof: false }],
};

function draftFor(description) {
  return /vague/i.test(description) ? LOW_CONFIDENCE : HIGH_CONFIDENCE;
}

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200).end("ok");
    return;
  }

  if (req.method === "POST" && req.url === "/v1/messages") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      let description = "";
      try {
        const parsed = JSON.parse(body);
        const first = parsed.messages?.[0]?.content;
        description = typeof first === "string" ? first : "";
      } catch {
        // fall through with empty description
      }

      if (/boom/i.test(description)) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: "simulated failure" } }));
        return;
      }

      const payload = {
        id: "msg_mock",
        type: "message",
        role: "assistant",
        model: "mock-claude",
        stop_reason: "tool_use",
        content: [
          {
            type: "tool_use",
            id: "toolu_mock",
            name: "save_playbook_draft",
            input: draftFor(description),
          },
        ],
        usage: { input_tokens: 1, output_tokens: 1 },
      };

      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(payload));
    });
    return;
  }

  res.writeHead(404).end("not found");
});

server.listen(port, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log(`mock-anthropic listening on http://127.0.0.1:${port}`);
});

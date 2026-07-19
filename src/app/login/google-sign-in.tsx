"use client";

import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { completeGoogleSignIn } from "./actions";

/**
 * "Continue with Google" via Google Identity Services (the rendered GIS button), NOT the
 * OAuth redirect. The whole handshake happens on our own domain: Google returns an ID
 * token to this page, and we exchange it for a Supabase session with signInWithIdToken.
 * Because there's no redirect through the Supabase project URL, Google's account chooser
 * shows "clovior.com" instead of "<project-ref>.supabase.co".
 *
 * Security: a single-use nonce is generated per mount. Google receives the SHA-256 hash
 * (embedded in the ID token); signInWithIdToken receives the raw value and Supabase
 * verifies the two match, so a token can't be replayed.
 *
 * Renders nothing until NEXT_PUBLIC_GOOGLE_CLIENT_ID is set, so the button simply doesn't
 * appear until Google is configured — magic-link sign-in is unaffected either way.
 */

interface CredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    nonce?: string;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      logo_alignment?: "left" | "center";
      width?: number;
    },
  ): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GSI_SRC = "https://accounts.google.com/gsi/client";
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

let scriptPromise: Promise<void> | null = null;
function loadGsiScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("gsi_load_failed")),
      );
      return;
    }
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("gsi_load_failed"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { raw, hashed };
}

export function GoogleSignIn() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    async function handleCredential(response: CredentialResponse, rawNonce: string) {
      if (!response.credential) {
        setError("Google didn't return a sign-in token. Please try again.");
        return;
      }
      setPending(true);
      setError(null);
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
        nonce: rawNonce,
      });
      if (signInError) {
        // eslint-disable-next-line no-console
        console.error(`[login] signInWithIdToken failed: ${signInError.message}`);
        setPending(false);
        setError("Google sign-in failed. Please try again.");
        return;
      }
      // Session cookies are set; hand off to the server to link invites and route.
      await completeGoogleSignIn();
    }

    async function setup() {
      try {
        const { raw, hashed } = await makeNonce();
        await loadGsiScript();
        if (cancelled || !window.google || !buttonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID!,
          nonce: hashed,
          ux_mode: "popup",
          callback: (response) => handleCredential(response, raw),
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "center",
          width: Math.min(buttonRef.current.clientWidth || 320, 400),
        });
      } catch {
        if (!cancelled) setError("Couldn't load Google sign-in.");
      }
    }

    setup();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!CLIENT_ID) return null;

  return (
    <div className="flex flex-col gap-2">
      <div ref={buttonRef} className="flex min-h-[40px] w-full justify-center" />
      {pending ? (
        <p className="text-center text-xs text-muted-foreground">
          Signing you in…
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

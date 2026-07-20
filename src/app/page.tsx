import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Landing } from "@/components/landing";

const TITLE = "Clovior — Hand off work. It stays handed off.";
const DESCRIPTION =
  "Playbooks your operators run like checklists. Corrections that stick. One view of everything, without chasing anyone.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "Clovior",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

/** Structured data so search engines list Clovior as a software product. */
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Clovior",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: DESCRIPTION,
  url: "https://clovior.com",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

/**
 * Root route. Logged-out visitors see the public marketing landing page; anyone
 * signed in is sent into the app (which resolves their workspace / Command View).
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Landing />
    </>
  );
}

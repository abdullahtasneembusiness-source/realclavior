import type { Metadata } from "next";

import { LegalPage, Placeholder } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — Clovior",
  description: "The terms that govern your use of Clovior.",
};

/**
 * Public Terms of Service. Plain-language, good-faith terms for a small SaaS in early
 * access — NOT a substitute for lawyer-reviewed documents. Real-world details the owner
 * must supply (legal entity, contact email, governing-law jurisdiction) are marked with
 * <Placeholder>. No guarantees or certifications are invented.
 */
export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Clovior
        (&ldquo;Clovior,&rdquo; &ldquo;the service&rdquo;), operated by{" "}
        <Placeholder>legal company name, e.g. AB Commerce Group LLC</Placeholder>{" "}
        (&ldquo;the Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). Please read
        them carefully.
      </p>

      <h2>Acceptance of terms</h2>
      <p>
        By creating an account or using Clovior, you agree to these Terms and to our{" "}
        <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use the
        service.
      </p>

      <h2>Description of the service</h2>
      <p>
        Clovior is software that helps founders manage their internal team — creating
        playbooks, handing off task runs, giving feedback, tracking goals, and keeping
        shared team knowledge in one place. We may add, change, or remove features over
        time.
      </p>

      <h2>Accounts and responsibilities</h2>
      <p>
        You are responsible for your account and for keeping your login secure. You are
        responsible for the team members you invite and the access you grant them, and
        for the content you and your team put into the service. You agree that the
        information you provide is accurate and that you have the right to add any team
        member information you enter.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use Clovior for any illegal purpose or in violation of any law;</li>
        <li>
          abuse, disrupt, or overload the service, or interfere with anyone else&apos;s
          use of it;
        </li>
        <li>
          attempt to breach or circumvent the security of the service or gain
          unauthorized access to any account, data, or system.
        </li>
      </ul>

      <h2>Content ownership</h2>
      <p>
        You own the content you create in Clovior. You grant the Company a limited
        license to store, process, and display that content solely to provide and
        operate the service for you — including sending it to the providers described
        in our <a href="/privacy">Privacy Policy</a> (for example, hosting and, for AI
        features, the AI provider). We claim no ownership of your content.
      </p>

      <h2>Third-party services</h2>
      <p>
        Clovior relies on third-party providers such as Supabase, Vercel, and Anthropic
        to operate. Their availability and performance are outside our control, and we
        do not guarantee that these providers — or the service itself — will always be
        available or uninterrupted.
      </p>

      <h2>Payment terms</h2>
      <p>
        Clovior is currently free during early access. If we introduce paid plans, the
        applicable pricing and payment terms will be provided at that time, and any paid
        features will be clearly identified before you are charged.
      </p>

      <h2>Disclaimers</h2>
      <p>
        The service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo;
        without warranties of any kind, whether express or implied, to the fullest
        extent permitted by law. We do not warrant that the service will be error-free,
        secure, or uninterrupted.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, the Company will not be liable for any
        indirect, incidental, special, consequential, or punitive damages, or for any
        loss of data, profits, or revenue, arising out of or related to your use of the
        service. To the extent liability cannot be excluded, it is limited to the amount
        you paid us (if any) for the service in the twelve months before the claim.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using Clovior and close your account at any time. We may suspend or
        terminate access if these Terms are violated or if needed to protect the service
        or its users. On termination, your right to use the service ends; you may request
        deletion of your data as described in our{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws of{" "}
        <Placeholder>governing-law jurisdiction, e.g. the State of ___, USA</Placeholder>
        , without regard to its conflict-of-laws rules.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these Terms from time to time. When we do, we will revise the
        &ldquo;Last updated&rdquo; date at the top of this page. Your continued use of
        Clovior after an update means you accept the revised Terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms? Contact us at{" "}
        <Placeholder>contact email, e.g. support@clovior.com</Placeholder>.
      </p>
    </LegalPage>
  );
}

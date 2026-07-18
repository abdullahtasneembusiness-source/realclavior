import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — Clovior",
  description:
    "How Clovior collects, uses, stores, and protects your information.",
};

/**
 * Public Privacy Policy. Plain-language, good-faith description of Clovior's actual data
 * practices — NOT a substitute for lawyer-reviewed documents. No compliance
 * certifications are claimed; the page describes only what is actually done.
 */
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This Privacy Policy explains what information Clovior (&ldquo;Clovior,&rdquo;
        &ldquo;we,&rdquo; &ldquo;us&rdquo;) collects, how we use it, and the choices
        you have. Clovior is software that helps founders run their internal team —
        playbooks, task runs, feedback, goals, and shared team knowledge. We&apos;ve
        written this in plain language on purpose.
      </p>

      <h2>Who we are and how to contact us</h2>
      <p>
        Clovior is operated by AB Commerce Group LLC (&ldquo;the Company&rdquo;). If you
        have any question about this policy or your data, contact us at{" "}
        <a href="mailto:support@clovior.com">support@clovior.com</a>.
      </p>

      <h2>What information we collect</h2>
      <ul>
        <li>
          <strong>Account information.</strong> Your name and email address when you
          create an account or sign in.
        </li>
        <li>
          <strong>Content you create.</strong> Everything you enter into the app —
          playbooks, task runs, feedback notes, brain entries, goals, launches, and
          related content.
        </li>
        <li>
          <strong>Team member information you add.</strong> Details you provide about
          the operators and teammates you invite, such as their name, email, and role.
        </li>
        <li>
          <strong>Technical and log data.</strong> Basic technical information created
          automatically when you use the service (for example, log and device data)
          needed to operate and secure it.
        </li>
      </ul>

      <h2>How we use your information</h2>
      <p>
        We use your information to provide and operate the service — to run your
        workspace, deliver its features, keep your account secure, and support you.
        We do not sell your personal information, and we do not use your content to
        advertise to you.
      </p>

      <h2>Third parties and subprocessors we use</h2>
      <p>
        We rely on a small number of trusted service providers to run Clovior. They
        process data only to provide their service to us:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — database, authentication, and data storage.
        </li>
        <li>
          <strong>Vercel</strong> — application hosting.
        </li>
        <li>
          <strong>Anthropic (Claude API)</strong> — powers AI features, such as
          generating a playbook from text you provide or distilling feedback. When you
          use an AI feature, the text you submit for that feature is sent to Anthropic
          to generate a response.
        </li>
        <li>
          <strong>Resend</strong> — transactional email such as invites and
          notifications, where enabled.
        </li>
        <li>
          <strong>Stripe</strong> — used for payment processing where applicable, if
          and when paid plans are enabled.
        </li>
      </ul>

      <h2>How we store and protect your data</h2>
      <p>
        Your data is stored with our hosting and database providers (Supabase and
        Vercel). We use reasonable security measures to protect it. However, no method
        of transmission or storage is 100% secure, and we cannot guarantee absolute
        security.
      </p>

      <h2>Data retention and deletion</h2>
      <p>
        We keep your information for as long as your account is active or as needed to
        provide the service. You can request deletion of your data by contacting us at{" "}
        <a href="mailto:support@clovior.com">support@clovior.com</a>. We
        may retain limited information where required for legal, security, or
        record-keeping reasons.
      </p>

      <h2>Cookies</h2>
      <p>
        Clovior uses essential cookies to keep you signed in and maintain your session.
        These are required for the app to work. We do not currently run third-party
        advertising trackers.
      </p>

      <h2>Children</h2>
      <p>
        Clovior is not directed to children under 13, and we do not knowingly collect
        personal information from children under 13. If you believe a child has provided
        us information, contact us and we will remove it.
      </p>

      <h2>Your rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal
        information. To exercise any of these, contact us at{" "}
        <a href="mailto:support@clovior.com">support@clovior.com</a>.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. When we do, we will revise
        the &ldquo;Last updated&rdquo; date at the top of this page. Continued use of
        Clovior after an update means you accept the revised policy.
      </p>
    </LegalPage>
  );
}

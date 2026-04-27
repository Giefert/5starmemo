import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Tusavor',
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, sans-serif', color: '#1a1a1a', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Effective date: April 26, 2026</p>

      <p>
        Tusavor (&quot;we&quot;, &quot;us&quot;) operates the Tusavor mobile application and web dashboard
        (collectively, the &quot;Service&quot;). This policy explains what personal information we collect,
        why we collect it, and your rights under Quebec&apos;s <em>Act respecting the protection of
        personal information in the private sector</em> (Law 25).
      </p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li><strong>Account information</strong> — email address and a hashed password when you register.</li>
        <li><strong>Study data</strong> — card review history, scores, session timestamps, and spaced-repetition scheduling data generated as you use the Service.</li>
        <li><strong>Uploaded images</strong> — photos you upload through the management dashboard are stored in Cloudflare R2 object storage.</li>
      </ul>
      <p>We do not collect analytics, device identifiers, or location data. We do not use tracking cookies.</p>

      <h2>2. How We Use Your Information</h2>
      <p>Your information is used solely to operate the Service: authenticating your account, scheduling reviews using the FSRS algorithm, and displaying your study content. We do not sell, rent, or share your personal information with third parties.</p>

      <h2>3. Where Your Data Is Stored</h2>
      <p>All personal data is stored on servers located in <strong>Beauharnois, Quebec, Canada</strong> (OVH). Uploaded images are stored via Cloudflare R2 with edge caching. No personal data is transferred outside of Canada.</p>

      <h2>4. Data Retention</h2>
      <p>We retain your data for as long as your account is active. If you delete your account, all personal data — including study history, review records, and account information — is permanently deleted immediately. Uploaded images associated with shared decks may be retained separately as they are not personal data.</p>

      <h2>5. Your Rights</h2>
      <p>Under Quebec Law 25, you have the right to:</p>
      <ul>
        <li><strong>Access</strong> your personal information — use the &quot;Export My Data&quot; feature in the app&apos;s Settings screen to download a copy of all your data.</li>
        <li><strong>Rectify</strong> inaccurate information — contact us to correct any errors.</li>
        <li><strong>Delete</strong> your account and all associated data — use the &quot;Delete Account&quot; option in the app&apos;s Settings screen. Deletion is immediate and irreversible.</li>
        <li><strong>Withdraw consent</strong> — you may stop using the Service and delete your account at any time.</li>
      </ul>

      <h2>6. Security</h2>
      <p>Passwords are hashed using bcrypt. All connections use TLS encryption. API access is authenticated via JWT tokens. Database access is restricted to application services only.</p>

      <h2>7. Children</h2>
      <p>The Service is not directed at children under 14. We do not knowingly collect information from children under 14.</p>

      <h2>8. Changes to This Policy</h2>
      <p>We may update this policy from time to time. Material changes will be communicated through the Service. Continued use after changes constitutes acceptance.</p>

      <h2>9. Contact</h2>
      <p>
        For questions about this policy or to exercise your privacy rights, contact us at:{' '}
        <a href="mailto:privacy@tusavor.com" style={{ color: '#007AFF' }}>privacy@tusavor.com</a>
      </p>

      <h2>10. Person Responsible for Personal Information</h2>
      <p>As required by Law 25, we have designated a person responsible for the protection of personal information. Inquiries can be directed to the contact above.</p>
    </main>
  );
}

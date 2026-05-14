// Single source of truth for the Tusavor privacy policy.
// Rendered by web-dashboard/src/app/privacy/page.tsx and mobile-app/screens/SettingsScreen.tsx.

export const PRIVACY_POLICY_EFFECTIVE_DATE = 'April 26, 2026';

export const PRIVACY_POLICY_MARKDOWN = `Tusavor ("we", "us") operates the Tusavor mobile application and web dashboard (collectively, the "Service"). This policy explains what personal information we collect, why we collect it, and your rights under Quebec's *Act respecting the protection of personal information in the private sector* (Law 25).

## 1. Information We Collect

- **Account information** — email address and a hashed password when you register.
- **Study data** — card review history, scores, session timestamps, and spaced-repetition scheduling data generated as you use the Service.
- **Uploaded images** — photos you upload through the management dashboard are stored in Cloudflare R2 object storage.

We do not collect analytics, device identifiers, or location data. We do not use tracking cookies.

## 2. How We Use Your Information

Your information is used solely to operate the Service: authenticating your account, scheduling reviews using the FSRS algorithm, and displaying your study content. We do not sell, rent, or share your personal information with third parties.

## 3. Where Your Data Is Stored

All personal data is stored on servers located in **Beauharnois, Quebec, Canada** (OVH). Uploaded images are stored via Cloudflare R2 with edge caching. No personal data is transferred outside of Canada.

## 4. Data Retention

We retain your data for as long as your account is active. If you delete your account, all personal data — including study history, review records, and account information — is permanently deleted immediately. Uploaded images associated with shared decks may be retained separately as they are not personal data.

## 5. Your Rights

Under Quebec Law 25, you have the right to:

- **Access** your personal information — use the "Export My Data" feature in the app's Settings screen to download a copy of all your data.
- **Rectify** inaccurate information — contact us to correct any errors.
- **Delete** your account and all associated data — use the "Delete Account" option in the app's Settings screen. Deletion is immediate and irreversible.
- **Withdraw consent** — you may stop using the Service and delete your account at any time.

## 6. Security

Passwords are hashed using bcrypt. All connections use TLS encryption. API access is authenticated via JWT tokens. Database access is restricted to application services only.

## 7. Children

The Service is not directed at children under 14. We do not knowingly collect information from children under 14.

## 8. Changes to This Policy

We may update this policy from time to time. Material changes will be communicated through the Service. Continued use after changes constitutes acceptance.

## 9. Contact

For questions about this policy or to exercise your privacy rights, contact us at: [privacy@tusavor.com](mailto:privacy@tusavor.com)

## 10. Person Responsible for Personal Information

As required by Law 25, we have designated a person responsible for the protection of personal information. Inquiries can be directed to the contact above.
`;

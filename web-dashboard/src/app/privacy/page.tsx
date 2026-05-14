import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import {
  PRIVACY_POLICY_EFFECTIVE_DATE,
  PRIVACY_POLICY_MARKDOWN,
} from '../../../../shared/legal/privacy';

export const metadata: Metadata = {
  title: 'Privacy Policy — Tusavor',
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, sans-serif', color: '#1a1a1a', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Effective date: {PRIVACY_POLICY_EFFECTIVE_DATE}</p>
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a href={href} style={{ color: '#007AFF' }}>{children}</a>
          ),
        }}
      >
        {PRIVACY_POLICY_MARKDOWN}
      </ReactMarkdown>
    </main>
  );
}

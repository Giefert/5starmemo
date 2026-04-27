'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

// NOTE: This dark "Carte" ribbon header replaces the previous white shell.
// We're keeping the existing /dashboard/* routes (deck editor, glossary) on this
// shared layout for now. Once the redesigned dashboard is verified end-to-end,
// the old white-shell pages should be migrated to the same Carte system and any
// remaining bridging styles below can be removed entirely.

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Decks' },
    { href: '/dashboard/glossary', label: 'Glossary' },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname.startsWith('/dashboard/decks');
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-ink">
      <header
        className="flex items-center justify-between border-b border-bg-hair bg-ink"
        style={{ padding: '18px 36px' }}
      >
        <div className="flex items-center" style={{ gap: 28 }}>
          <Link href="/dashboard" className="flex items-baseline" style={{ gap: 8 }}>
            <span
              className="font-serif text-paper"
              style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em' }}
            >
              Tusavor
            </span>
            <span
              className="uppercase text-on-dark-mute"
              style={{ fontSize: 10, letterSpacing: '0.2em' }}
            >
              / Admin
            </span>
          </Link>
          <nav className="flex" style={{ gap: 20, fontSize: 13 }}>
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? 'text-paper' : 'text-on-dark-mute hover:text-paper'}
                  style={
                    active
                      ? {
                          borderBottom: '2px solid var(--color-amber)',
                          paddingBottom: 16,
                          marginBottom: -17,
                        }
                      : undefined
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div
          className="flex items-center text-on-dark-mute"
          style={{ gap: 14, fontSize: 12 }}
        >
          <span>{user?.username ?? 'admin'}</span>
          <span>·</span>
          <button
            type="button"
            onClick={logout}
            className="hover:text-paper"
            style={{ cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </ProtectedRoute>
  );
}

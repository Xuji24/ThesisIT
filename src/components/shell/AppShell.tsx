import Link from 'next/link';
import { getSessionProfile } from '@/lib/auth/getSessionProfile';

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();

  return (
    <div className="min-h-full flex flex-col bg-surface-page">
      <header className="sticky top-0 z-20 border-b border-line-hairline bg-surface-card">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/" className="text-base font-heading font-bold tracking-tight text-ink-primary shrink-0">
              ThesisIT
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-full text-sm font-medium text-ink-secondary hover:text-ink-primary hover:bg-surface-sunken transition-colors"
              >
                Workspace
              </Link>
              <Link
                href="/analytics"
                className="px-3 py-1.5 rounded-full text-sm font-medium text-ink-secondary hover:text-ink-primary hover:bg-surface-sunken transition-colors"
              >
                Analytics
              </Link>
              {profile?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded-full text-sm font-medium text-ink-secondary hover:text-ink-primary hover:bg-surface-sunken transition-colors"
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {profile ? (
              <>
                <span className="hidden md:block text-xs text-ink-muted truncate max-w-[180px]" title={profile.email}>
                  {profile.email}
                </span>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-full text-sm font-medium text-ink-secondary hover:text-ink-primary hover:bg-surface-sunken transition-colors"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="px-4 py-1.5 rounded-full text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0">{children}</div>
    </div>
  );
}

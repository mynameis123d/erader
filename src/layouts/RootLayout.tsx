import { Outlet, Link, useLocation } from 'react-router-dom';
import { useThemeStore } from '@/state/themeStore';
import { IconButton } from '@/components/ui/IconButton';

export function RootLayout() {
  const location = useLocation();
  const { theme, toggleTheme } = useThemeStore();

  const isReader = location.pathname.startsWith('/reader');

  if (isReader) {
    return <Outlet />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className="surface flex flex-col border-r scrollbar-thin overflow-y-auto"
        style={{ width: 'var(--sidebar-width)' }}
      >
        <div className="p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h1 className="text-2xl font-bold">
            <span style={{ color: 'var(--color-accent)' }}>E</span>
            Reader
          </h1>
          <p className="text-sm text-muted mt-1">Your digital library</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink to="/library" active={location.pathname === '/library'}>
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            Library
          </NavLink>

          <NavLink to="/settings" active={location.pathname === '/settings'}>
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Settings
          </NavLink>
        </nav>

        <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Theme</span>
            <IconButton
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              )}
            </IconButton>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header
          className="surface-elevated border-b flex items-center justify-between px-6"
          style={{
            height: 'var(--topbar-height)',
            borderColor: 'var(--color-border)',
          }}
        >
          <h2 className="text-lg font-semibold">
            {location.pathname === '/library'
              ? 'Library'
              : location.pathname === '/settings'
              ? 'Settings'
              : 'EReader'}
          </h2>

          <div className="flex items-center gap-2">
            <IconButton title="Search">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </IconButton>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

interface NavLinkProps {
  to: string;
  active?: boolean;
  children: React.ReactNode;
}

function NavLink({ to, active, children }: NavLinkProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors no-underline"
      style={{
        backgroundColor: active ? 'var(--color-accent-soft)' : 'transparent',
        color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
      }}
    >
      {children}
    </Link>
  );
}

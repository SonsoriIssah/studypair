import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const baseNavItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'grid_view', end: true },
  { to: '/browse', label: 'Find Tutors', icon: 'search' },
  { to: '/requests', label: 'Requests', icon: 'chat_bubble' },
  { to: '/tutor', label: 'Tutor', icon: 'school' },
  { to: '/notifications', label: 'Alerts', icon: 'notifications' },
];

function AvatarCircle({ avatarUrl, initials }: { avatarUrl: string | null | undefined; initials: string }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-container text-label-sm font-bold text-on-primary-container">
      {initials}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const navItems = user?.is_admin
    ? [...baseNavItems, { to: '/admin', label: 'Admin', icon: 'admin_panel_settings' }]
    : baseNavItems;

  const initials = (user?.full_name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // No separate "role" in the data model — any user can both request
  // tutoring and tutor others. This just reflects which side of the app
  // (student vs. tutor pages) the current route belongs to.
  const isTutorView = location.pathname.startsWith('/tutor');
  const viewLabel = isTutorView ? 'Tutor' : 'Student';
  const switchTo = isTutorView ? '/dashboard' : '/tutor';

  return (
    <div className="min-h-screen bg-background text-on-background">
      {/* Mobile TopAppBar */}
      <header className="fixed top-0 left-0 z-50 flex h-16 w-full items-center justify-between bg-surface px-container-margin py-space-sm shadow-sm md:hidden">
        <div className="flex items-center gap-2">
          <Icon name="school" className="text-primary text-2xl" filled />
          <h1 className="text-headline-md-mobile font-bold text-primary">StudyPair</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/profile" title="Edit profile" className="flex overflow-hidden rounded-full">
            <AvatarCircle avatarUrl={user?.avatar_data_url} initials={initials} />
          </Link>
          <button
            onClick={() => setConfirmingLogout(true)}
            className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low"
            title="Sign out"
          >
            <Icon name="logout" className="text-[20px]" />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col border-r border-outline-variant bg-surface md:flex">
        <div className="flex items-center gap-2 px-space-lg py-space-lg">
          <Icon name="school" className="text-primary text-2xl" filled />
          <h1 className="text-headline-md font-bold text-primary">StudyPair</h1>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-space-md">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-space-md py-space-sm text-label-md font-label-md transition-colors ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`
              }
            >
              <Icon name={item.icon} className="text-[20px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-space-sm border-t border-outline-variant p-space-md">
          <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest px-space-md py-space-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Viewing as
              </span>
              <span className="text-label-md font-bold text-on-surface">{viewLabel}</span>
            </div>
            <Link to={switchTo} className="text-label-sm font-bold text-primary hover:underline">
              Switch
            </Link>
          </div>

          <Link
            to="/profile"
            title="Edit profile"
            className="flex items-center gap-space-sm rounded-lg px-space-sm py-space-sm transition-colors hover:bg-surface-container-low"
          >
            <AvatarCircle avatarUrl={user?.avatar_data_url} initials={initials} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-label-md font-label-md text-on-surface">{user?.full_name}</span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">{viewLabel}</span>
            </div>
          </Link>

          <button
            onClick={() => setConfirmingLogout(true)}
            className="flex items-center gap-3 rounded-lg px-space-md py-space-sm text-label-md font-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            <Icon name="logout" className="text-[20px]" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="mx-auto max-w-5xl px-container-margin pb-24 pt-16 md:ml-64 md:max-w-none md:px-8 md:pb-8 md:pt-8">
        <Outlet />
      </main>

      {/* BottomNavBar (mobile only) — CSS grid so all items always fit without horizontal scrolling */}
      <nav
        className="fixed bottom-0 left-0 z-50 grid w-full items-center border-t border-outline-variant bg-surface px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-lg md:hidden"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 transition-all duration-150 ${
                isActive ? 'text-primary' : 'text-on-surface-variant'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} filled={isActive} className="text-[22px]" />
                <span
                  className={`w-full truncate text-center text-[10px] leading-tight ${
                    isActive ? 'font-bold' : 'font-label-sm'
                  }`}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sign-out confirmation */}
      {confirmingLogout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg shadow-2xl">
            <h3 className="mb-space-xs text-headline-md font-headline-md text-on-surface">Sign out?</h3>
            <p className="mb-space-lg text-body-md font-body-md text-on-surface-variant">
              You'll need to sign in again to access your account.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmingLogout(false)}
                className="flex-1 rounded-xl bg-surface-container-high px-4 py-3 text-label-md font-label-md text-on-surface transition-colors hover:bg-surface-container-highest"
              >
                Cancel
              </button>
              <button
                onClick={logout}
                className="flex-1 rounded-xl bg-error px-4 py-3 text-label-md font-label-md text-on-error transition-opacity hover:opacity-90"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

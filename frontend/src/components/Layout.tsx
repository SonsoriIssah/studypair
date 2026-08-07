import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const baseNavItems: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/requests', label: 'Requests', icon: 'chat_bubble' },
  { to: '/tutor', label: 'Tutor', icon: 'dashboard' },
  { to: '/notifications', label: 'Alerts', icon: 'notifications' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navItems = user?.is_admin
    ? [...baseNavItems, { to: '/admin', label: 'Admin', icon: 'admin_panel_settings' }]
    : baseNavItems;

  const initials = (user?.full_name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background text-on-background pb-24 pt-16 md:pb-0 md:pt-20">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 z-50 flex h-16 w-full items-center justify-between bg-surface px-container-margin py-space-sm shadow-sm md:h-20">
        <div className="flex items-center gap-2">
          <Icon name="school" className="text-primary text-2xl" filled />
          <h1 className="text-headline-md-mobile md:text-headline-md font-bold text-primary">StudyPair</h1>
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-full px-4 py-2 text-label-md font-label-md transition-colors ${
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

        <div className="flex items-center gap-3">
          <div
            className="hidden h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-primary-container text-label-sm font-bold text-on-primary-container sm:flex"
            title={user?.full_name}
          >
            {initials}
          </div>
          <button
            onClick={logout}
            className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low"
            title="Sign out"
          >
            <Icon name="logout" className="text-[20px]" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-container-margin md:px-8">
        <Outlet />
      </main>

      {/* BottomNavBar (mobile only) */}
      <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around gap-1 overflow-x-auto rounded-t-xl border-t border-outline-variant bg-surface px-2 pb-6 pt-2 shadow-lg scrollbar-hide md:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-shrink-0 flex-col items-center justify-center rounded-full px-4 py-1 transition-all duration-150 ${
                isActive
                  ? 'scale-90 bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} filled={isActive} />
                <span className={`text-label-sm font-label-sm mt-1 ${isActive ? 'font-bold' : ''}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

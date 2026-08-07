import { LogOut, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const studentLinks = [
  { to: '/', label: 'Browse Tutors' },
  { to: '/requests', label: 'My Requests' },
  { to: '/applications', label: 'Course Applications' },
  { to: '/notifications', label: 'Notifications' },
];

const tutorLinks = [{ to: '/tutor', label: 'Tutor Dashboard' }];

export default function Layout() {
  const { user, logout } = useAuth();

  const links = [...studentLinks, ...tutorLinks, ...(user?.is_admin ? [{ to: '/admin', label: 'Admin' }] : [])];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 font-semibold text-teal-700">
            <Users size={20} />
            StudyPair
          </div>
          <nav className="hidden gap-1 md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{user?.full_name}</span>
            <button
              onClick={logout}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                  isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { adminListCourseApplications, adminListUsers, ApiError } from '../lib/api';
import type { CourseApplication, User } from '../types';

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [openApplications, setOpenApplications] = useState<CourseApplication[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminListUsers(), adminListCourseApplications('open')])
      .then(([u, a]) => {
        setUsers(u);
        setOpenApplications(a);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load admin data.'))
      .finally(() => setLoading(false));
  }, []);

  // Demand by course: how many open applications share a course name,
  // so the dev team can see what's most requested at a glance.
  const demandByCourse = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of openApplications) {
      counts.set(a.course_name, (counts.get(a.course_name) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [openApplications]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <div className="mt-space-lg grid grid-cols-1 gap-gutter pb-space-xl md:grid-cols-12">
      {error && <p className="md:col-span-12 text-body-sm font-body-sm text-error">{error}</p>}

      {/* Unmatched demand */}
      <section className="flex flex-col gap-space-md md:col-span-4">
        <div className="mb-space-xs flex items-center justify-between">
          <h2 className="text-headline-md font-headline-md text-on-background">Unmatched Requests</h2>
          {demandByCourse.length > 0 && (
            <span className="rounded-full bg-error-container px-2 py-1 text-label-sm font-label-sm text-on-error-container">
              Requires Attention
            </span>
          )}
        </div>
        <div className="divide-y divide-surface-container-high overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          {demandByCourse.map(([course, count]) => (
            <div
              key={course}
              className="group flex items-center justify-between p-space-md transition-colors hover:bg-surface-container-low"
            >
              <div className="flex flex-col gap-1">
                <span className="text-body-md font-body-md font-semibold text-on-surface">{course}</span>
                <span className="text-body-sm font-body-sm text-on-surface-variant">
                  {count} open application{count === 1 ? '' : 's'}
                </span>
              </div>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-label-md font-label-md font-bold ${
                  count >= 5
                    ? 'bg-tertiary-container text-on-tertiary-container'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {count}
              </div>
            </div>
          ))}
          {!loading && demandByCourse.length === 0 && (
            <p className="p-space-md text-body-sm font-body-sm text-outline">No open applications right now.</p>
          )}
        </div>
      </section>

      {/* User directory */}
      <section className="mt-space-lg flex flex-col gap-space-md md:col-span-8 md:mt-0">
        <div className="mb-space-xs flex flex-col justify-between gap-space-sm md:flex-row md:items-center">
          <h2 className="text-headline-md font-headline-md text-on-background">User Directory</h2>
          <div className="relative w-full md:w-64">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by name or email…"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-4 text-body-sm font-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="p-space-md text-label-md font-label-md font-semibold text-on-surface-variant">User</th>
                <th className="p-space-md text-label-md font-label-md font-semibold text-on-surface-variant">Contact</th>
                <th className="p-space-md text-label-md font-label-md font-semibold text-on-surface-variant">Level</th>
                <th className="p-space-md text-label-md font-label-md font-semibold text-on-surface-variant">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-surface-container-lowest/50">
                  <td className="p-space-md">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-label-md font-bold ${
                          u.is_admin
                            ? 'bg-tertiary-container text-on-tertiary-container'
                            : 'bg-primary-container text-on-primary-container'
                        }`}
                      >
                        {initials(u.full_name)}
                      </div>
                      <span className="text-body-md font-body-md font-medium text-on-surface">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="p-space-md text-body-sm font-body-sm text-on-surface-variant">{u.email}</td>
                  <td className="p-space-md text-body-sm font-body-sm text-on-surface-variant">{u.level ?? '—'}</td>
                  <td className="p-space-md">
                    {u.is_admin && (
                      <span className="inline-flex items-center rounded-full bg-tertiary-container px-2 py-0.5 text-label-sm font-label-sm text-on-tertiary-container">
                        Admin
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-space-md text-center text-body-sm font-body-sm text-outline">
                    No users match that search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-low p-space-sm text-label-sm font-label-sm text-on-surface-variant">
            <span>
              Showing {filteredUsers.length} of {users.length} users
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

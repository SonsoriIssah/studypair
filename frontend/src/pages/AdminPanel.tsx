import { useEffect, useState } from 'react';
import { adminListCourseApplications, adminListUsers } from '../lib/api';
import type { CourseApplication, User } from '../types';

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [openApplications, setOpenApplications] = useState<CourseApplication[]>([]);

  useEffect(() => {
    adminListUsers().then(setUsers);
    adminListCourseApplications('open').then(setOpenApplications);
  }, []);

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-semibold text-slate-900">Admin</h1>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Users ({users.length})</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Level</th>
                <th className="px-4 py-2 font-medium">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2">{u.full_name}</td>
                  <td className="px-4 py-2 text-slate-500">{u.email}</td>
                  <td className="px-4 py-2">{u.level ?? '—'}</td>
                  <td className="px-4 py-2">{u.is_admin ? 'Yes' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Open course applications ({openApplications.length})</h2>
        <div className="space-y-2">
          {openApplications.map((a) => (
            <div key={a.id} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">
              {a.course_name}
            </div>
          ))}
          {openApplications.length === 0 && <p className="text-sm text-slate-400">None open.</p>}
        </div>
      </section>
    </div>
  );
}

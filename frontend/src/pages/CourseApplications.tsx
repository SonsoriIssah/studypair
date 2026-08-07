import { FormEvent, useEffect, useState } from 'react';
import { ApiError, createCourseApplication, listMyCourseApplications, withdrawCourseApplication } from '../lib/api';
import type { CourseApplication } from '../types';

const statusStyles: Record<string, string> = {
  open: 'bg-amber-50 text-amber-700',
  fulfilled: 'bg-green-50 text-green-700',
  expired: 'bg-slate-100 text-slate-500',
  withdrawn: 'bg-slate-100 text-slate-500',
};

export default function CourseApplications() {
  const [applications, setApplications] = useState<CourseApplication[]>([]);
  const [courseName, setCourseName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setApplications(await listMyCourseApplications());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load applications.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;
    setSubmitting(true);
    try {
      await createCourseApplication(courseName.trim());
      setCourseName('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not apply.');
    } finally {
      setSubmitting(false);
    }
  };

  const withdraw = async (id: string) => {
    try {
      await withdrawCourseApplication(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not withdraw.');
    }
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Course applications</h1>
      <p className="mb-6 text-sm text-slate-500">
        Can't find a tutor for a course? Apply here and we'll notify tutors who add it.
      </p>

      <form onSubmit={submit} className="mb-8 flex max-w-md gap-2">
        <input
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          placeholder="Course name, e.g. Linear Algebra"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <button
          disabled={submitting}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
        >
          Apply
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="space-y-2">
        {applications.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
          >
            <div>
              <p className="font-medium text-slate-800">{a.course_name}</p>
              <p className="text-xs text-slate-400">
                Applied {new Date(a.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[a.status]}`}>
                {a.status}
              </span>
              {a.status === 'open' && (
                <button
                  onClick={() => withdraw(a.id)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Withdraw
                </button>
              )}
            </div>
          </div>
        ))}
        {applications.length === 0 && <p className="text-sm text-slate-400">No applications yet.</p>}
      </div>
    </div>
  );
}

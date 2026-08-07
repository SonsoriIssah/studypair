import { FormEvent, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { ApiError, createCourseApplication, listMyCourseApplications, withdrawCourseApplication } from '../lib/api';
import type { CourseApplication, CourseApplicationStatus } from '../types';

const statusStyle: Record<CourseApplicationStatus, string> = {
  open: 'bg-[#fef3c7] text-[#d97706]',
  fulfilled: 'bg-[#dcfce7] text-[#166534]',
  expired: 'bg-surface-container-high text-on-surface-variant',
  withdrawn: 'bg-surface-container-high text-on-surface-variant',
};

const statusLabel: Record<CourseApplicationStatus, string> = {
  open: 'Pending Tutor',
  fulfilled: 'Fulfilled',
  expired: 'Expired',
  withdrawn: 'Withdrawn',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

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
    setError(null);
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
    <div className="mt-space-lg pb-space-lg">
      <div className="mb-space-lg flex items-center gap-3">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">My Course Applications</h1>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg max-w-2xl">
        Can't find a tutor for a course? Apply here — once a tutor is available, you'll be notified immediately.
      </p>

      <form onSubmit={submit} className="mb-space-xl flex max-w-md gap-2">
        <input
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          placeholder="Course name, e.g. Linear Algebra"
          className="h-12 flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-space-md text-body-md font-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          disabled={submitting}
          className="rounded-xl bg-primary px-6 text-label-md font-label-md text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          Apply
        </button>
      </form>

      {error && <p className="mb-space-md text-body-sm font-body-sm text-error">{error}</p>}

      <div className="space-y-space-lg">
        {applications.map((a) => (
          <div
            key={a.id}
            className={`relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md shadow-[0_4px_16px_rgba(53,37,205,0.05)] ${
              a.status !== 'open' ? 'opacity-75' : ''
            }`}
          >
            {a.status === 'open' && <div className="absolute bottom-0 left-0 top-0 w-1 bg-primary" />}
            <div className="flex flex-col justify-between gap-space-md md:flex-row md:items-center">
              <div className={`flex-1 ${a.status === 'open' ? 'pl-3' : ''}`}>
                <div className="mb-1 flex items-center gap-3">
                  <h2 className="font-headline-md text-headline-md text-on-surface">{a.course_name}</h2>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-label-sm font-label-sm ${statusStyle[a.status]}`}>
                    {statusLabel[a.status]}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                  <Icon name="calendar_today" className="text-[16px]" />
                  Applied: {formatDate(a.created_at)}
                </p>
              </div>
              <div className={a.status === 'open' ? 'pl-3 md:pl-0' : 'md:text-right'}>
                {a.status === 'open' && (
                  <button
                    onClick={() => withdraw(a.id)}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-error-container px-4 py-2 text-label-md font-label-md text-error transition-colors hover:bg-opacity-90 md:w-auto"
                  >
                    <Icon name="cancel" className="mr-2 text-[18px]" />
                    Withdraw Application
                  </button>
                )}
                {a.status === 'fulfilled' && (
                  <button
                    disabled
                    className="inline-flex w-full items-center justify-center rounded-lg bg-surface-container-high px-4 py-2 text-label-md font-label-md text-on-surface md:w-auto"
                  >
                    <Icon name="check_circle" className="mr-2 text-[18px]" />
                    Matched
                  </button>
                )}
                {(a.status === 'expired' || a.status === 'withdrawn') && (
                  <button
                    onClick={() => {
                      setCourseName(a.course_name);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-surface-container text-on-surface-variant px-4 py-2 text-label-md font-label-md transition-colors hover:bg-surface-container-high md:w-auto"
                  >
                    <Icon name="refresh" className="mr-2 text-[18px]" />
                    Re-Apply
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {applications.length === 0 && (
          <p className="text-body-sm font-body-sm text-outline">No applications yet.</p>
        )}
      </div>
    </div>
  );
}

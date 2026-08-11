import { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { ApiError, cancelMyRequest, listMyRequests } from '../lib/api';
import type { MatchRequestStatus, OutgoingMatchRequest } from '../types';

const filters: { label: string; value: MatchRequestStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Expired', value: 'expired' },
  { label: 'Cancelled', value: 'cancelled' },
];

const statusBadge: Record<MatchRequestStatus, string> = {
  pending: 'text-amber-700 bg-amber-100',
  accepted: 'text-green-700 bg-green-100',
  rejected: 'text-on-surface-variant bg-surface-container-high',
  expired: 'text-on-surface-variant bg-surface-container-high',
  cancelled: 'text-on-surface-variant bg-surface-container-high',
};

const statusIcon: Record<MatchRequestStatus, string> = {
  pending: 'code',
  accepted: 'calculate',
  rejected: 'science',
  expired: 'menu_book',
  cancelled: 'block',
};

const avatarIcon: Record<MatchRequestStatus, string> = {
  pending: 'person',
  accepted: 'person',
  rejected: 'person_off',
  expired: 'timer_off',
  cancelled: 'person_off',
};

const scheduleIcon: Record<MatchRequestStatus, string> = {
  pending: 'schedule',
  accepted: 'schedule',
  rejected: 'event_busy',
  expired: 'history',
  cancelled: 'event_busy',
};

const blurClass: Partial<Record<MatchRequestStatus, string>> = {
  pending: 'bg-amber-50',
  accepted: 'bg-green-50',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function MyRequests() {
  const [requests, setRequests] = useState<OutgoingMatchRequest[]>([]);
  const [filter, setFilter] = useState<MatchRequestStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setRequests(await listMyRequests());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = async (id: string) => {
    try {
      await cancelMyRequest(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel.');
    }
  };

  const visible = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  return (
    <div className="py-space-lg md:pt-space-xl">
      <div className="mb-space-lg">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-on-background mb-space-sm">
          My Requests
        </h1>
        <p className="text-body-md font-body-md text-on-surface-variant">
          Track the status of your tutoring sessions.
        </p>
      </div>

      <div className="mb-space-lg flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-label-md font-label-md transition-colors ${
              filter === f.value
                ? 'bg-primary text-on-primary'
                : 'border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-body-sm font-body-sm text-outline">Loading…</p>}
      {error && <p className="text-body-sm font-body-sm text-error">{error}</p>}

      {!loading && visible.length === 0 && (
        <p className="text-body-sm font-body-sm text-outline">No requests here.</p>
      )}

      <div className="grid grid-cols-1 gap-space-lg md:grid-cols-2">
        {visible.map((r) => {
          const isActive = r.status === 'pending' || r.status === 'accepted';
          const blur = blurClass[r.status];
          return (
            <div
              key={r.id}
              className={`group relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-space-lg shadow-[0_4px_16px_rgba(53,37,205,0.05)] transition-all duration-300 hover:shadow-[0_8px_24px_rgba(53,37,205,0.1)] ${
                r.status === 'accepted' ? 'border-l-4 border-l-secondary' : ''
              } ${!isActive ? 'opacity-75' : ''}`}
            >
              {blur && (
                <div
                  className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-60 blur-3xl ${blur}`}
                />
              )}

              <div className="relative z-10 mb-space-sm flex items-start justify-between">
                <div>
                  <span
                    className={`mb-2 inline-block rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusBadge[r.status]}`}
                  >
                    {r.status}
                  </span>
                  <h3 className="text-headline-md font-headline-md text-on-background">{r.course.course_name}</h3>
                </div>
                <Icon
                  name={statusIcon[r.status]}
                  className="text-outline-variant transition-colors group-hover:text-primary"
                />
              </div>

              <div className="relative z-10 mb-space-md flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant ${
                    !isActive ? 'opacity-50' : ''
                  }`}
                >
                  <Icon name={avatarIcon[r.status]} className="text-[20px]" />
                </div>
                <div>
                  <p className="text-body-sm font-body-sm font-medium text-on-background">{r.tutor.full_name}</p>
                  <p className="text-label-sm font-label-sm text-on-surface-variant flex items-center gap-1">
                    <Icon name={scheduleIcon[r.status]} className="text-[14px]" />
                    {r.slot.day_of_week} {r.slot.start_time.slice(0, 5)} · {formatDate(r.created_at)}
                  </p>
                </div>
              </div>

              {r.status === 'pending' && (
                <div className="relative z-10 flex justify-end border-t border-surface-container pt-space-sm">
                  <button
                    onClick={() => cancel(r.id)}
                    className="flex items-center gap-1 rounded-lg bg-error-container px-4 py-2 text-label-md font-label-md text-error transition-colors hover:bg-red-100"
                  >
                    <Icon name="cancel" className="text-[16px]" />
                    Cancel Request
                  </button>
                </div>
              )}

              {r.status === 'accepted' && (
                <div className="relative z-10 flex items-center justify-between border-t border-surface-container pt-space-sm">
                  <span className="text-label-sm font-label-sm text-on-surface-variant">
                    {r.slot.is_bulk ? 'Group Session' : 'One-on-One Session'}
                  </span>
                  <button
                    onClick={() => cancel(r.id)}
                    disabled={r.slot.is_bulk}
                    title={r.slot.is_bulk ? 'Group bookings are confirmed immediately and cannot be cancelled here.' : undefined}
                    className="rounded-lg bg-primary-container px-4 py-2 text-label-md font-label-md text-on-primary-container transition-colors hover:bg-surface-tint hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary-container disabled:hover:text-on-primary-container"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

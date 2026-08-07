import { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { acceptRequest, ApiError, listIncomingRequests, rejectRequest } from '../lib/api';
import type { IncomingMatchRequest } from '../types';

type Tab = 'oneOnOne' | 'group';

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function TutorRequests() {
  const [requests, setRequests] = useState<IncomingMatchRequest[]>([]);
  const [tab, setTab] = useState<Tab>('oneOnOne');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // "all" so we can show both the pending one-on-ones awaiting a
      // decision and the already-accepted group bookings that can still
      // be rejected (bulk slots auto-accept on request, so they never sit
      // pending — there's nothing to "accept" for those).
      setRequests(await listIncomingRequests('all'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const respond = async (id: string, action: 'accept' | 'reject') => {
    setActing(id);
    try {
      await (action === 'accept' ? acceptRequest(id) : rejectRequest(id));
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not respond.');
    } finally {
      setActing(null);
    }
  };

  const oneOnOne = requests.filter((r) => !r.slot.is_bulk && r.status === 'pending');
  const group = requests.filter((r) => r.slot.is_bulk && r.status === 'accepted');
  const visible = tab === 'oneOnOne' ? oneOnOne : group;

  return (
    <div className="flex flex-col gap-space-lg py-space-lg md:py-space-xl">
      <div className="flex flex-col gap-space-sm">
        <h2 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-on-surface">
          Incoming Requests
        </h2>
        <p className="text-body-md font-body-md text-on-surface-variant max-w-2xl">
          Review and manage your pending study sessions. Accept requests quickly to confirm your schedule.
        </p>

        <div className="mt-space-md flex gap-4 overflow-x-auto border-b border-outline-variant pb-2 scrollbar-hide">
          <button
            onClick={() => setTab('oneOnOne')}
            className={`relative px-2 py-1 text-label-md font-label-md transition-all ${
              tab === 'oneOnOne'
                ? "font-bold text-primary after:absolute after:bottom-[-9px] after:left-0 after:h-[3px] after:w-full after:rounded-t-full after:bg-primary after:content-['']"
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            One-on-one Requests
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-error-container text-[10px] font-bold text-on-error-container">
              {oneOnOne.length}
            </span>
          </button>
          <button
            onClick={() => setTab('group')}
            className={`relative px-2 py-1 text-label-md font-label-md transition-all ${
              tab === 'group'
                ? "font-bold text-primary after:absolute after:bottom-[-9px] after:left-0 after:h-[3px] after:w-full after:rounded-t-full after:bg-primary after:content-['']"
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Group Sessions
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-container-high text-[10px] font-bold text-on-surface-variant">
              {group.length}
            </span>
          </button>
        </div>
      </div>

      {error && <p className="text-body-sm font-body-sm text-error">{error}</p>}
      {loading && <p className="text-body-sm font-body-sm text-outline">Loading…</p>}

      <div className="grid grid-cols-1 gap-space-lg md:grid-cols-2 lg:grid-cols-3">
        {visible.map((r) => (
          <article
            key={r.id}
            className={`flex flex-col gap-space-md rounded-xl border border-outline-variant bg-surface-container-lowest/85 p-space-md shadow-[0_4px_6px_-1px_rgba(53,37,205,0.05),0_2px_4px_-1px_rgba(53,37,205,0.03)] backdrop-blur transition-transform duration-200 hover:-translate-y-1 ${
              !r.slot.is_bulk ? 'border-l-4 border-l-primary' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-container text-label-md font-bold text-on-primary-container">
                  {initials(r.student.full_name)}
                </div>
                <div>
                  <h3 className="text-headline-md font-headline-md text-on-surface">{r.student.full_name}</h3>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">
                    {r.course.course_name} · Level {r.student.level ?? '—'}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-label-sm font-label-sm ${
                  r.status === 'pending'
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                    : 'bg-secondary-container/30 text-on-secondary-container'
                }`}
              >
                <Icon name={r.status === 'pending' ? 'schedule' : 'check_circle'} className="text-[14px]" />
                {r.status === 'pending' ? 'Pending' : 'Confirmed'}
              </span>
            </div>

            <div className="rounded-lg bg-surface-container-low p-3 text-body-sm font-body-sm text-on-surface">
              <div className="flex items-center gap-2">
                <Icon name="calendar_today" className="text-[18px] text-primary" />
                <span className="font-medium">
                  {r.slot.day_of_week}, {r.slot.start_time.slice(0, 5)} - {r.slot.end_time.slice(0, 5)}
                </span>
              </div>
              {r.slot.is_bulk && (
                <p className="mt-2 flex items-center gap-1 text-on-surface-variant">
                  <Icon name="group" className="text-[14px]" />
                  {r.slot.current_students} of {r.slot.max_students} seats filled
                </p>
              )}
            </div>

            <div className="mt-auto flex gap-3 pt-2">
              {r.status === 'pending' ? (
                <>
                  <button
                    disabled={acting === r.id}
                    onClick={() => respond(r.id, 'accept')}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-label-md font-label-md text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:opacity-60"
                  >
                    <Icon name="check" className="text-[20px]" />
                    Accept
                  </button>
                  <button
                    disabled={acting === r.id}
                    onClick={() => respond(r.id, 'reject')}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-surface-container-highest py-3 text-label-md font-label-md text-on-surface transition-colors hover:bg-surface-dim disabled:opacity-60"
                  >
                    <Icon name="close" className="text-[20px]" />
                    Reject
                  </button>
                </>
              ) : (
                <button
                  disabled={acting === r.id}
                  onClick={() => respond(r.id, 'reject')}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-surface-container-highest py-3 text-label-md font-label-md text-on-surface transition-colors hover:bg-surface-dim disabled:opacity-60"
                >
                  <Icon name="person_remove" className="text-[20px]" />
                  Remove from session
                </button>
              )}
            </div>
          </article>
        ))}
        {!loading && visible.length === 0 && (
          <p className="text-body-sm font-body-sm text-outline">
            {tab === 'oneOnOne' ? 'No pending requests.' : 'No one has booked a group session yet.'}
          </p>
        )}
      </div>
    </div>
  );
}

import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { ApiError, browseTutors, createMatchRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Course, Slot, TutorBrowseItem } from '../types';

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function SlotChip({
  slot,
  course,
  pending,
  onRequest,
}: {
  slot: Slot;
  course: Course;
  pending: boolean;
  onRequest: (course: Course, slot: Slot) => void;
}) {
  const time = `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`;

  if (slot.is_bulk) {
    return (
      <button
        disabled={pending}
        onClick={() => onRequest(course, slot)}
        className="flex min-w-[100px] flex-shrink-0 flex-col items-center rounded-lg bg-secondary-container px-3 py-2 text-on-secondary-container transition-all hover:brightness-95 disabled:opacity-50"
      >
        <span className="text-label-sm font-label-sm font-bold">{slot.day_of_week}</span>
        <span className="text-body-sm font-body-sm mb-1">{time}</span>
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide opacity-80">
          <Icon name="group" className="text-[12px]" />
          {slot.current_students} of {slot.max_students} spots
        </span>
      </button>
    );
  }

  return (
    <button
      disabled={pending}
      onClick={() => onRequest(course, slot)}
      className="flex min-w-[80px] flex-shrink-0 flex-col items-center rounded-lg border border-primary px-3 py-2 text-primary transition-colors hover:bg-primary hover:text-on-primary disabled:opacity-50"
    >
      <span className="text-label-sm font-label-sm font-bold">{slot.day_of_week}</span>
      <span className="text-body-sm font-body-sm">{time}</span>
    </button>
  );
}

export default function BrowseTutors() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tutors, setTutors] = useState<TutorBrowseItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);

  const load = async (course?: string) => {
    setLoading(true);
    setError(null);
    try {
      setTutors(await browseTutors(course));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load tutors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    load(query || undefined);
  };

  const request = async (course: Course, slot: Slot, tutorName: string) => {
    setPendingSlot(slot.id);
    try {
      const result = await createMatchRequest({ course_id: course.id, slot_id: slot.id });
      navigate('/request-confirmation', {
        state: {
          status: result.status,
          tutorName,
          courseName: course.course_name,
          dayOfWeek: slot.day_of_week,
          startTime: slot.start_time,
          endTime: slot.end_time,
          isBulk: slot.is_bulk,
        },
      });
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : 'Could not send request.');
      setTimeout(() => setToast(null), 4000);
    } finally {
      setPendingSlot(null);
    }
  };

  return (
    <div className="pt-4">
      <div className="mb-space-xl">
        <div className="relative mx-auto mb-space-sm w-full max-w-2xl">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Icon name="search" className="text-outline" />
          </div>
          <form onSubmit={onSearch}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses (e.g. CS101)"
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-4 pl-12 pr-4 text-body-md font-body-md text-on-surface shadow-sm placeholder:text-outline-variant focus:border-primary focus:ring-2 focus:ring-primary"
            />
          </form>
        </div>
        <div className="mx-auto flex max-w-2xl items-center justify-between px-2">
          <p className="text-label-md font-label-md text-on-surface-variant">
            Showing tutors for your level {user?.level ? `(${user.level})` : ''}
          </p>
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-2 py-1 text-label-sm font-label-sm text-on-surface">
              <span className="block h-2 w-2 rounded-full bg-primary" /> 1-on-1
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-2 py-1 text-label-sm font-label-sm text-on-surface">
              <span className="block h-2 w-2 rounded-full bg-secondary" /> Group
            </span>
          </div>
        </div>
      </div>

      {toast && (
        <div className="mb-space-md rounded-lg bg-inverse-surface px-4 py-2 text-body-sm font-body-sm text-inverse-on-surface">
          {toast}
        </div>
      )}

      {loading && <p className="text-body-sm font-body-sm text-outline">Loading tutors…</p>}
      {error && <p className="text-body-sm font-body-sm text-error">{error}</p>}

      <div className="mb-space-xl grid grid-cols-1 gap-space-lg md:grid-cols-2 lg:grid-cols-3">
        {tutors.map((tutor) => (
          <article
            key={tutor.id}
            className="flex flex-col rounded-xl border border-outline-variant border-l-4 border-l-primary bg-surface-container-lowest p-space-md shadow-[0_4px_6px_-1px_rgba(53,37,205,0.05),0_2px_4px_-1px_rgba(53,37,205,0.03)] transition-transform duration-200 hover:-translate-y-1"
          >
            <div className="mb-space-md flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary-container text-label-md font-bold text-on-primary-container">
                {initials(tutor.full_name)}
              </div>
              <div>
                <h2 className="text-headline-md font-headline-md text-on-surface mb-1">{tutor.full_name}</h2>
                <p className="text-body-sm font-body-sm text-on-surface-variant line-clamp-2">
                  {tutor.courses.map((c) => c.course_name).join(', ')}
                </p>
              </div>
            </div>

            <div className="mt-auto">
              <h3 className="mb-2 text-label-sm font-label-sm uppercase tracking-wider text-outline">
                Available Sessions
              </h3>
              <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {tutor.available_slots.map((slot) => (
                  <SlotChip
                    key={slot.id}
                    slot={slot}
                    course={tutor.courses[0]}
                    pending={pendingSlot === slot.id}
                    onRequest={(course, s) => request(course, s, tutor.full_name)}
                  />
                ))}
                {tutor.available_slots.length === 0 && (
                  <p className="text-body-sm font-body-sm text-outline">No open slots right now.</p>
                )}
              </div>
            </div>
          </article>
        ))}

        {!loading && !error && tutors.length === 0 && (
          <article className="col-span-1 flex min-h-[250px] flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-bright p-space-lg text-center shadow-sm md:col-span-2 lg:col-span-1">
            <Icon name="search_off" className="mb-4 text-4xl text-outline" />
            <h3 className="text-headline-md font-headline-md text-on-surface mb-2">No tutors found</h3>
            <p className="text-body-md font-body-md text-on-surface-variant mb-6 max-w-[220px]">
              No tutors are currently listed for this course at your level.
            </p>
            <Link
              to="/applications"
              className="w-full max-w-[220px] rounded-full bg-primary px-6 py-3 text-label-md font-label-md text-on-primary shadow-sm transition-colors hover:bg-primary-container"
            >
              Apply for this course
            </Link>
          </article>
        )}
      </div>
    </div>
  );
}

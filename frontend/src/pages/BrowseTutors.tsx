import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { ApiError, browseTutors, createMatchRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Course, Slot, TutorBrowseItem } from '../types';

const ANY_SUBJECT = 'Any Subject';

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
  const [subject, setSubject] = useState(ANY_SUBJECT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);

  // Fetched once, unfiltered — there's no course catalog to seed a subject
  // list from, so "Subject" options are just the distinct course names
  // tutors have actually added, and both filters run client-side over this.
  useEffect(() => {
    setLoading(true);
    setError(null);
    browseTutors()
      .then(setTutors)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load tutors.'))
      .finally(() => setLoading(false));
  }, []);

  const subjectOptions = useMemo(() => {
    const names = new Set<string>();
    tutors.forEach((t) => t.courses.forEach((c) => names.add(c.course_name)));
    return [ANY_SUBJECT, ...Array.from(names).sort()];
  }, [tutors]);

  const filteredTutors = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tutors.filter((t) => {
      const matchesSubject = subject === ANY_SUBJECT || t.courses.some((c) => c.course_name === subject);
      const matchesQuery =
        !q ||
        t.full_name.toLowerCase().includes(q) ||
        t.courses.some((c) => c.course_name.toLowerCase().includes(q));
      return matchesSubject && matchesQuery;
    });
  }, [tutors, query, subject]);

  const clearAll = () => {
    setQuery('');
    setSubject(ANY_SUBJECT);
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
    <div className="pb-space-xl">
      {/* Page header band */}
      <div className="-mx-container-margin mb-space-xl border-b border-outline-variant bg-surface-container-low px-container-margin py-space-xl md:-mx-8 md:px-8">
        <div className="mx-auto max-w-4xl text-center md:mx-0 md:text-left">
          <h1 className="mb-space-sm text-headline-lg-mobile font-headline-lg-mobile text-on-surface md:text-headline-xl md:font-headline-xl">
            Find your perfect tutor
          </h1>
          <p className="mx-auto mb-space-lg max-w-2xl text-body-md font-body-md text-on-surface-variant md:mx-0 md:text-body-lg md:font-body-lg">
            Browse peer tutors at your level and book a session that fits your schedule.
          </p>
          <div className="relative mx-auto max-w-2xl md:mx-0">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Icon name="search" className="text-outline" />
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by tutor name or course..."
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-4 pl-12 pr-4 text-body-md font-body-md text-on-surface shadow-sm transition-all placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-space-lg flex flex-col gap-space-md rounded-lg border border-outline-variant bg-surface p-space-md shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-space-md md:flex-row md:items-center md:gap-space-lg">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-label-md font-label-md text-on-surface-variant">
              <Icon name="book" className="text-[18px]" /> Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-md border-outline-variant bg-surface-container-lowest text-body-sm font-body-sm text-on-surface focus:border-primary focus:ring-primary"
            >
              {subjectOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {subjectOptions.length === 1 && (
              <p className="text-body-sm font-body-sm text-on-surface-variant">No courses posted yet.</p>
            )}
          </div>

          <div className="flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant">
            <Icon name="school" className="text-[18px]" />
            {user?.level
              ? `Matched to your level (${user.level})`
              : 'Complete your profile to see tutors at your level.'}
          </div>
        </div>

        <button
          onClick={clearAll}
          className="self-start text-label-sm font-label-sm text-primary underline hover:text-primary/80 md:self-auto"
        >
          Clear All
        </button>
      </div>

      {/* Results */}
      <section>
          <div className="mb-space-md flex items-end justify-between">
            <span className="text-body-md font-body-md text-on-surface-variant">
              {loading ? 'Loading…' : `Showing ${filteredTutors.length} tutor${filteredTutors.length === 1 ? '' : 's'}`}
            </span>
            <div className="hidden gap-2 sm:flex">
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-2 py-1 text-label-sm font-label-sm text-on-surface">
                <span className="block h-2 w-2 rounded-full bg-primary" /> 1-on-1
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-2 py-1 text-label-sm font-label-sm text-on-surface">
                <span className="block h-2 w-2 rounded-full bg-secondary" /> Group
              </span>
            </div>
          </div>

          {toast && (
            <div className="mb-space-md rounded-lg bg-inverse-surface px-4 py-2 text-body-sm font-body-sm text-inverse-on-surface">
              {toast}
            </div>
          )}

          {error && <p className="text-body-sm font-body-sm text-error">{error}</p>}

          <div className="grid grid-cols-1 gap-space-lg md:grid-cols-2 lg:grid-cols-3">
            {filteredTutors.map((tutor) => {
              const [firstCourse, ...restCourses] = tutor.courses;
              return (
                <article
                  key={tutor.id}
                  className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-space-lg shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="absolute left-0 top-0 h-full w-1 bg-primary opacity-0 transition-opacity group-hover:opacity-100" />

                  <div className="mb-space-md flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-headline-md font-headline-md font-bold text-on-surface">
                      {initials(tutor.full_name)}
                    </div>
                    <div>
                      <h3 className="text-headline-md font-headline-md text-on-surface">{tutor.full_name}</h3>
                      {firstCourse && (
                        <div className="mt-1 inline-block rounded-full border border-outline-variant bg-surface-container-low px-2 py-0.5 text-label-sm font-label-sm text-on-surface-variant">
                          Level {firstCourse.level}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-space-md flex flex-wrap gap-2">
                    {tutor.courses.slice(0, 2).map((c) => (
                      <span
                        key={c.id}
                        className="rounded-full bg-surface-container px-2.5 py-1 text-label-sm font-label-sm text-on-surface"
                      >
                        {c.course_name}
                      </span>
                    ))}
                    {restCourses.length > 1 && (
                      <span className="rounded-full bg-surface-container px-2.5 py-1 text-label-sm font-label-sm text-on-surface">
                        +{restCourses.length - 1} more
                      </span>
                    )}
                  </div>

                  <div className="mb-space-md h-px w-full bg-outline-variant/30" />

                  <div className="mt-auto">
                    <h4 className="mb-2 text-label-sm font-label-sm uppercase tracking-wider text-outline">
                      Available Sessions
                    </h4>
                    <div className="scrollbar-hide flex flex-nowrap gap-2 overflow-x-auto pb-2">
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
              );
            })}

            {!loading && !error && filteredTutors.length === 0 && (
              <article className="col-span-1 flex min-h-[250px] flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-bright p-space-lg text-center shadow-sm md:col-span-2 lg:col-span-1">
                <Icon name="search_off" className="mb-4 text-4xl text-outline" />
                <h3 className="text-headline-md font-headline-md text-on-surface mb-2">No tutors found</h3>
                <p className="text-body-md font-body-md text-on-surface-variant mb-6 max-w-[220px]">
                  {tutors.length === 0
                    ? 'No tutors are currently listed at your level.'
                    : 'Try a different search or clear your filters.'}
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
      </section>
    </div>
  );
}

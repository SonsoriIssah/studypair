import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import {
  addAvailabilitySlot,
  addCourse,
  ApiError,
  deleteAvailabilitySlot,
  deleteCourse,
  listMyAvailability,
  listMyCourses,
} from '../lib/api';
import { DAYS_OF_WEEK, DayOfWeek, LEVEL_CHOICES, type Course, type Slot } from '../types';

const dayButtons: DayOfWeek[] = DAYS_OF_WEEK;

export default function TutorDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [courseName, setCourseName] = useState('');
  const [courseLevel, setCourseLevel] = useState<number>(LEVEL_CHOICES[0]);
  const [addingCourse, setAddingCourse] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [day, setDay] = useState<DayOfWeek>(DAYS_OF_WEEK[0]);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('11:00');
  const [maxStudents, setMaxStudents] = useState(1);
  const [savingSlot, setSavingSlot] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([listMyCourses(), listMyAvailability()]);
      setCourses(c);
      setSlots(s);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitCourse = async (e: FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;
    setAddingCourse(true);
    setError(null);
    try {
      await addCourse({ course_name: courseName.trim(), level: courseLevel });
      setCourseName('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add course.');
    } finally {
      setAddingCourse(false);
    }
  };

  const removeCourse = async (id: string) => {
    try {
      await deleteCourse(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove course.');
    }
  };

  const submitSlot = async (e: FormEvent) => {
    e.preventDefault();
    setSavingSlot(true);
    setError(null);
    try {
      await addAvailabilitySlot({
        day_of_week: day,
        start_time: `${start}:00`,
        end_time: `${end}:00`,
        max_students: maxStudents,
      });
      setModalOpen(false);
      setMaxStudents(1);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add slot.');
    } finally {
      setSavingSlot(false);
    }
  };

  const removeSlot = async (id: string) => {
    try {
      await deleteAvailabilitySlot(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove slot.');
    }
  };

  return (
    <div className="py-space-xl">
      <div className="mb-space-xl flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Tutor Dashboard</h2>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1">
            Manage your courses and availability.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/tutor/requests"
            className="flex items-center gap-2 rounded-lg bg-primary-container/20 px-4 py-2 text-label-md font-label-md text-primary transition-colors hover:bg-primary-container/30"
          >
            <Icon name="inbox" className="text-sm" />
            Incoming Requests
          </Link>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-label-md font-label-md text-on-primary shadow-sm transition-opacity hover:opacity-90"
          >
            <Icon name="add_circle" className="text-sm" />
            Add Availability
          </button>
        </div>
      </div>

      {error && <p className="mb-space-md text-body-sm font-body-sm text-error">{error}</p>}
      {loading && <p className="text-body-sm font-body-sm text-outline">Loading…</p>}

      <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
        {/* My Courses */}
        <section className="flex flex-col gap-space-md md:col-span-5">
          <h3 className="text-headline-md font-headline-md text-on-surface flex items-center gap-2">
            <Icon name="book" filled className="text-primary" />
            My Courses
          </h3>

          <form onSubmit={submitCourse} className="flex flex-wrap items-center gap-2">
            <input
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="Course name"
              className="h-10 min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-sm font-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <select
              value={courseLevel}
              onChange={(e) => setCourseLevel(Number(e.target.value))}
              className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 text-body-sm font-body-sm text-on-surface"
            >
              {LEVEL_CHOICES.map((l) => (
                <option key={l} value={l}>
                  Level {l}
                </option>
              ))}
            </select>
            <button
              disabled={addingCourse}
              className="h-10 rounded-lg bg-primary px-4 text-label-md font-label-md text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              Add
            </button>
          </form>
          <p className="-mt-2 text-label-sm font-label-sm text-outline">
            Adding a course notifies students with a matching open application.
          </p>

          {courses.map((c) => (
            <div
              key={c.id}
              className="elevation-1 group flex items-center justify-between rounded-xl p-space-md transition-colors hover:border-primary"
            >
              <div>
                <h4 className="text-body-lg font-headline-md text-on-surface">{c.course_name}</h4>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded bg-surface-container-high px-2 py-0.5 text-label-sm font-label-sm text-on-surface-variant">
                    Level {c.level}
                  </span>
                </div>
              </div>
              <button
                onClick={() => removeCourse(c.id)}
                className="rounded-full p-2 text-outline-variant transition-colors hover:bg-error-container hover:text-error"
                title="Remove course"
              >
                <Icon name="delete" />
              </button>
            </div>
          ))}
          {!loading && courses.length === 0 && (
            <p className="text-body-sm font-body-sm text-outline">You haven't listed any courses yet.</p>
          )}
        </section>

        {/* Weekly Availability */}
        <section className="mt-8 flex flex-col gap-space-md md:col-span-7 md:mt-0">
          <h3 className="text-headline-md font-headline-md text-on-surface flex items-center gap-2">
            <Icon name="calendar_month" filled className="text-primary" />
            Weekly Availability
          </h3>
          <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
            {slots.map((s) => (
              <div
                key={s.id}
                className={`elevation-1 group relative overflow-hidden rounded-xl p-space-md ${
                  s.is_bulk ? 'bg-pattern-dots' : 'border-l-4 border-l-primary'
                }`}
              >
                <div className="relative z-10 mb-4 flex items-start justify-between">
                  <div>
                    <h4 className="text-body-lg font-headline-md text-on-surface">{s.day_of_week}</h4>
                    <p className="text-body-md font-body-md text-on-surface-variant">
                      {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Icon name={s.is_bulk ? 'groups' : 'person'} className={s.is_bulk ? 'text-secondary' : 'text-primary'} />
                    <button
                      onClick={() => removeSlot(s.id)}
                      className="rounded-full p-1 text-outline-variant opacity-0 transition-opacity hover:bg-error-container hover:text-error group-hover:opacity-100"
                      title="Remove slot"
                    >
                      <Icon name="delete" className="text-[18px]" />
                    </button>
                  </div>
                </div>
                <div className="relative z-10 flex items-center gap-2">
                  <span
                    className={`flex items-center gap-1 rounded-full px-2 py-1 text-label-sm font-label-sm ${
                      s.is_bulk ? 'bg-secondary-container/20 text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    <Icon name="group" className="text-[14px]" />
                    Capacity: {s.max_students}
                    {s.is_bulk ? ` (${s.current_students} booked)` : ''}
                  </span>
                  <span className={`text-label-sm font-label-sm ${s.is_bulk ? 'text-secondary' : 'text-primary'}`}>
                    {s.is_bulk ? 'Group Session' : 'One-on-One'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {!loading && slots.length === 0 && (
            <div className="elevation-1 mt-4 flex flex-col items-center justify-center rounded-xl border-dashed p-space-xl text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
                <Icon name="event_busy" className="text-3xl text-on-surface-variant" />
              </div>
              <h4 className="text-headline-md font-headline-md text-on-surface mb-2">No Availability Set</h4>
              <p className="text-body-md font-body-md text-on-surface-variant mb-6 max-w-sm">
                Add a weekly slot so students can book sessions with you.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="rounded-xl bg-primary px-6 py-3 text-label-md font-label-md text-on-primary"
              >
                Add Availability
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Add Availability modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/40 p-4 backdrop-blur-sm">
          <div className="relative flex w-full max-w-md flex-col gap-space-md rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-headline-md font-headline-md text-on-surface">Add Availability</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
              >
                <Icon name="close" />
              </button>
            </div>
            <form onSubmit={submitSlot} className="flex flex-col gap-space-md">
              <div>
                <label className="mb-2 block text-label-md font-label-md text-on-surface-variant">Day of Week</label>
                <div className="grid grid-cols-7 gap-1">
                  {dayButtons.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDay(d)}
                      className={`rounded-lg py-2 text-center text-body-sm font-label-md transition-colors ${
                        day === d
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
                      }`}
                    >
                      {d[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-label-md font-label-md text-on-surface-variant">Start Time</label>
                  <input
                    type="time"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-label-md font-label-md text-on-surface-variant">End Time</label>
                  <input
                    type="time"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-label-md font-label-md text-on-surface-variant">Max Students</label>
                <div className="flex h-14 items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-2">
                  <button
                    type="button"
                    onClick={() => setMaxStudents((v) => Math.max(1, v - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  >
                    <Icon name="remove" />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-headline-md font-headline-md text-on-surface">{maxStudents}</span>
                    <span className={`text-label-sm font-label-sm ${maxStudents === 1 ? 'text-primary' : 'text-secondary'}`}>
                      {maxStudents === 1 ? 'One-on-one' : 'Group session'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMaxStudents((v) => Math.min(50, v + 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  >
                    <Icon name="add" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex gap-3 border-t border-outline-variant/30 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl bg-primary-container/10 px-4 py-3 text-label-md font-label-md text-primary transition-colors hover:bg-primary-container/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSlot || start >= end}
                  className="flex-1 rounded-xl bg-primary px-4 py-3 text-label-md font-label-md text-on-primary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {savingSlot ? 'Saving…' : 'Save Slot'}
                </button>
              </div>
              {start >= end && (
                <p className="text-body-sm font-body-sm text-error">Start time must be before end time.</p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import {
  acceptRequest,
  addAvailabilitySlot,
  addCourse,
  ApiError,
  deleteAvailabilitySlot,
  deleteCourse,
  listIncomingRequests,
  listMyAvailability,
  listMyCourses,
  rejectRequest,
  updateAvailabilitySlot,
} from '../lib/api';
import { DAYS_OF_WEEK, DayOfWeek, LEVEL_CHOICES, type Course, type IncomingMatchRequest, type Slot } from '../types';

const dayButtons: DayOfWeek[] = DAYS_OF_WEEK;
type Tab = 'requests' | 'courses' | 'availability' | 'group';

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function StatCard({
  icon,
  iconClass,
  label,
  value,
}: {
  icon: string;
  iconClass: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-space-md rounded-xl border border-outline-variant bg-surface-container-lowest p-space-lg shadow-sm">
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${iconClass}`}>
        <Icon name={icon} filled />
      </div>
      <div>
        <p className="mb-1 text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">
          {label}
        </p>
        <p className="text-headline-lg font-headline-lg text-on-surface">{value}</p>
      </div>
    </div>
  );
}

function RequestCard({
  request,
  acting,
  onRespond,
}: {
  request: IncomingMatchRequest;
  acting: boolean;
  onRespond: (id: string, action: 'accept' | 'reject') => void;
}) {
  return (
    <article
      className={`flex flex-col gap-space-md rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md shadow-sm ${
        !request.slot.is_bulk ? 'border-l-4 border-l-primary' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-container text-label-md font-bold text-on-primary-container">
            {initials(request.student.full_name)}
          </div>
          <div>
            <h3 className="text-headline-md font-headline-md text-on-surface">{request.student.full_name}</h3>
            <p className="text-body-sm font-body-sm text-on-surface-variant">
              {request.course.course_name} &middot; Level {request.student.level ?? '—'}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-label-sm font-label-sm ${
            request.status === 'pending'
              ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
              : 'bg-secondary-container/30 text-on-secondary-container'
          }`}
        >
          <Icon name={request.status === 'pending' ? 'schedule' : 'check_circle'} className="text-[14px]" />
          {request.status === 'pending' ? 'Pending' : 'Confirmed'}
        </span>
      </div>

      <div className="rounded-lg bg-surface-container-low p-3 text-body-sm font-body-sm text-on-surface">
        <div className="flex items-center gap-2">
          <Icon name="calendar_today" className="text-[18px] text-primary" />
          <span className="font-medium">
            {request.slot.day_of_week}, {request.slot.start_time.slice(0, 5)} - {request.slot.end_time.slice(0, 5)}
          </span>
        </div>
        {request.slot.is_bulk && (
          <p className="mt-2 flex items-center gap-1 text-on-surface-variant">
            <Icon name="group" className="text-[14px]" />
            {request.slot.current_students} of {request.slot.max_students} seats filled
          </p>
        )}
      </div>

      <div className="mt-auto flex gap-3">
        {request.status === 'pending' ? (
          <>
            <button
              disabled={acting}
              onClick={() => onRespond(request.id, 'accept')}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-label-md font-label-md text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:opacity-60"
            >
              <Icon name="check" className="text-[20px]" />
              Accept
            </button>
            <button
              disabled={acting}
              onClick={() => onRespond(request.id, 'reject')}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-surface-container-highest py-2.5 text-label-md font-label-md text-on-surface transition-colors hover:bg-surface-dim disabled:opacity-60"
            >
              <Icon name="close" className="text-[20px]" />
              Reject
            </button>
          </>
        ) : (
          <button
            disabled={acting}
            onClick={() => onRespond(request.id, 'reject')}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-surface-container-highest py-2.5 text-label-md font-label-md text-on-surface transition-colors hover:bg-surface-dim disabled:opacity-60"
          >
            <Icon name="person_remove" className="text-[20px]" />
            Remove from session
          </button>
        )}
      </div>
    </article>
  );
}

export default function TutorDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [requests, setRequests] = useState<IncomingMatchRequest[]>([]);
  const [tab, setTab] = useState<Tab>('requests');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const [courseName, setCourseName] = useState('');
  const [courseLevel, setCourseLevel] = useState<number>(LEVEL_CHOICES[0]);
  const [addingCourse, setAddingCourse] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [day, setDay] = useState<DayOfWeek>(DAYS_OF_WEEK[0]);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('11:00');
  const [maxStudents, setMaxStudents] = useState(1);
  const [savingSlot, setSavingSlot] = useState(false);

  const openAddModal = () => {
    setEditingSlotId(null);
    setDay(DAYS_OF_WEEK[0]);
    setStart('09:00');
    setEnd('11:00');
    setMaxStudents(1);
    setModalOpen(true);
  };

  const openEditModal = (slot: Slot) => {
    setEditingSlotId(slot.id);
    setDay(slot.day_of_week);
    setStart(slot.start_time.slice(0, 5));
    setEnd(slot.end_time.slice(0, 5));
    setMaxStudents(slot.max_students);
    setModalOpen(true);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [c, s, r] = await Promise.all([listMyCourses(), listMyAvailability(), listIncomingRequests('all')]);
      setCourses(c);
      setSlots(s);
      setRequests(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const oneOnOne = requests.filter((r) => !r.slot.is_bulk && r.status === 'pending');
  const groupSessions = requests.filter((r) => r.slot.is_bulk && r.status === 'accepted');
  const activeStudents = new Set(
    requests.filter((r) => r.status === 'accepted').map((r) => r.student.id)
  ).size;

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
      const payload = {
        day_of_week: day,
        start_time: `${start}:00`,
        end_time: `${end}:00`,
        max_students: maxStudents,
      };
      if (editingSlotId) {
        await updateAvailabilitySlot(editingSlotId, payload);
      } else {
        await addAvailabilitySlot(payload);
      }
      setModalOpen(false);
      setEditingSlotId(null);
      setMaxStudents(1);
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : `Could not ${editingSlotId ? 'update' : 'add'} slot.`
      );
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

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'requests', label: 'Requests', count: oneOnOne.length },
    { key: 'courses', label: 'My Courses', count: courses.length },
    { key: 'availability', label: 'Availability', count: slots.length },
    { key: 'group', label: 'Group Sessions', count: groupSessions.length },
  ];

  return (
    <div className="py-space-xl">
      <header className="mb-space-xl flex flex-col items-start justify-between gap-space-md md:flex-row md:items-end">
        <div>
          <h1 className="mb-space-xs text-headline-xl font-headline-xl text-on-surface">Tutor Dashboard</h1>
          <p className="text-body-lg font-body-lg text-on-surface-variant">
            Manage your courses, availability, and student requests.
          </p>
        </div>
        <button
          onClick={() => setTab('courses')}
          className="w-full rounded-lg border border-primary-fixed bg-primary-fixed/20 px-space-md py-space-sm text-label-md font-label-md text-primary transition-colors hover:bg-primary-fixed/30 md:w-auto"
        >
          Add a Course
        </button>
      </header>

      {error && <p className="mb-space-md text-body-sm font-body-sm text-error">{error}</p>}

      <div className="mb-space-xl grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="menu_book" iconClass="bg-primary-fixed text-primary" label="Courses Taught" value={courses.length} />
        <StatCard
          icon="event_available"
          iconClass="bg-secondary-container text-on-secondary-container"
          label="Open Slots"
          value={slots.length}
        />
        <StatCard
          icon="hourglass_empty"
          iconClass="bg-error-container text-on-error-container"
          label="Pending Requests"
          value={oneOnOne.length}
        />
        <StatCard
          icon="groups"
          iconClass="bg-tertiary-fixed text-on-tertiary-fixed"
          label="Active Students"
          value={activeStudents}
        />
      </div>

      <div className="flex min-h-[400px] flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="scrollbar-hide flex overflow-x-auto border-b border-outline-variant">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap px-space-lg py-space-md text-label-md font-label-md transition-colors ${
                tab === t.key
                  ? 'border-b-2 border-primary bg-primary-fixed/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        <div className="flex-grow p-space-lg">
          {loading && <p className="text-body-sm font-body-sm text-outline">Loading…</p>}

          {!loading && tab === 'requests' && (
            <>
              {oneOnOne.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center p-space-xl text-center">
                  <Icon name="inbox" className="mb-space-lg text-6xl text-outline-variant" />
                  <h3 className="mb-space-sm text-headline-md font-headline-md text-on-surface">
                    No pending requests
                  </h3>
                  <p className="max-w-md text-body-md font-body-md text-on-surface-variant">
                    You're all caught up. New one-on-one requests will show up here for your approval.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-space-md md:grid-cols-2 lg:grid-cols-3">
                    {oneOnOne.map((r) => (
                      <RequestCard key={r.id} request={r} acting={acting === r.id} onRespond={respond} />
                    ))}
                  </div>
                  <Link to="/tutor/requests" className="mt-space-md inline-block text-label-md font-label-md text-primary hover:underline">
                    View all requests &rarr;
                  </Link>
                </>
              )}
            </>
          )}

          {!loading && tab === 'group' && (
            <>
              {groupSessions.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center p-space-xl text-center">
                  <Icon name="groups" className="mb-space-lg text-6xl text-outline-variant" />
                  <h3 className="mb-space-sm text-headline-md font-headline-md text-on-surface">
                    No group sessions yet
                  </h3>
                  <p className="max-w-md text-body-md font-body-md text-on-surface-variant">
                    Students who book a group slot will show up here.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-space-md md:grid-cols-2 lg:grid-cols-3">
                    {groupSessions.map((r) => (
                      <RequestCard key={r.id} request={r} acting={acting === r.id} onRespond={respond} />
                    ))}
                  </div>
                  <Link to="/tutor/requests" className="mt-space-md inline-block text-label-md font-label-md text-primary hover:underline">
                    Manage group sessions &rarr;
                  </Link>
                </>
              )}
            </>
          )}

          {!loading && tab === 'courses' && (
            <div className="flex flex-col gap-space-md">
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

              <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                {courses.map((c) => (
                  <div
                    key={c.id}
                    className="group flex items-center justify-between rounded-xl border border-outline-variant p-space-md transition-colors hover:border-primary"
                  >
                    <div>
                      <h4 className="text-body-lg font-headline-md text-on-surface">{c.course_name}</h4>
                      <span className="mt-1 inline-block rounded bg-surface-container-high px-2 py-0.5 text-label-sm font-label-sm text-on-surface-variant">
                        Level {c.level}
                      </span>
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
              </div>
              {courses.length === 0 && (
                <p className="text-body-sm font-body-sm text-outline">You haven't listed any courses yet.</p>
              )}
            </div>
          )}

          {!loading && tab === 'availability' && (
            <div className="flex flex-col gap-space-md">
              <button
                onClick={openAddModal}
                className="flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2 text-label-md font-label-md text-on-primary shadow-sm transition-opacity hover:opacity-90"
              >
                <Icon name="add_circle" className="text-sm" />
                Add Availability
              </button>

              <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                {slots.map((s) => (
                  <div
                    key={s.id}
                    className={`group relative overflow-hidden rounded-xl border border-outline-variant p-space-md ${
                      s.is_bulk ? '' : 'border-l-4 border-l-primary'
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
                          onClick={() => openEditModal(s)}
                          className="rounded-full p-1 text-outline-variant opacity-0 transition-opacity hover:bg-primary-container hover:text-primary group-hover:opacity-100"
                          title="Edit slot"
                        >
                          <Icon name="edit" className="text-[18px]" />
                        </button>
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
              {slots.length === 0 && (
                <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant p-space-xl text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
                    <Icon name="event_busy" className="text-3xl text-on-surface-variant" />
                  </div>
                  <h4 className="mb-2 text-headline-md font-headline-md text-on-surface">No Availability Set</h4>
                  <p className="mb-6 max-w-sm text-body-md font-body-md text-on-surface-variant">
                    Add a weekly slot so students can book sessions with you.
                  </p>
                  <button
                    onClick={openAddModal}
                    className="rounded-xl bg-primary px-6 py-3 text-label-md font-label-md text-on-primary"
                  >
                    Add Availability
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Availability modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/40 p-4 backdrop-blur-sm">
          <div className="relative flex w-full max-w-md flex-col gap-space-md rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-headline-md font-headline-md text-on-surface">
                {editingSlotId ? 'Edit Availability' : 'Add Availability'}
              </h3>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setEditingSlotId(null);
                }}
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
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={50}
                      value={maxStudents}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isNaN(n)) setMaxStudents(n);
                      }}
                      onBlur={() => setMaxStudents((v) => Math.min(50, Math.max(1, v || 1)))}
                      className="w-14 border-0 bg-transparent text-center text-headline-md font-headline-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
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
                  onClick={() => {
                    setModalOpen(false);
                    setEditingSlotId(null);
                  }}
                  className="flex-1 rounded-xl bg-primary-container/10 px-4 py-3 text-label-md font-label-md text-primary transition-colors hover:bg-primary-container/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSlot || start >= end}
                  className="flex-1 rounded-xl bg-primary px-4 py-3 text-label-md font-label-md text-on-primary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {savingSlot ? 'Saving…' : editingSlotId ? 'Save Changes' : 'Save Slot'}
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

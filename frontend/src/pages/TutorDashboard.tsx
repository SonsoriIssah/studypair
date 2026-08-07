import { FormEvent, useEffect, useState } from 'react';
import {
  acceptRequest,
  addAvailabilitySlot,
  addCourse,
  ApiError,
  listIncomingRequests,
  rejectRequest,
} from '../lib/api';
import { DAYS_OF_WEEK, IncomingMatchRequest, LEVEL_CHOICES } from '../types';

export default function TutorDashboard() {
  const [requests, setRequests] = useState<IncomingMatchRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [courseName, setCourseName] = useState('');
  const [courseLevel, setCourseLevel] = useState<number>(LEVEL_CHOICES[0]);

  const [day, setDay] = useState(DAYS_OF_WEEK[0]);
  const [start, setStart] = useState('14:00');
  const [end, setEnd] = useState('15:00');
  const [maxStudents, setMaxStudents] = useState(1);

  const loadRequests = async () => {
    try {
      setRequests(await listIncomingRequests('pending'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load requests.');
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const submitCourse = async (e: FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;
    try {
      await addCourse({ course_name: courseName.trim(), level: courseLevel });
      setCourseName('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add course.');
    }
  };

  const submitSlot = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await addAvailabilitySlot({
        day_of_week: day,
        start_time: `${start}:00`,
        end_time: `${end}:00`,
        max_students: maxStudents,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add slot.');
    }
  };

  const respond = async (id: string, action: 'accept' | 'reject') => {
    try {
      await (action === 'accept' ? acceptRequest(id) : rejectRequest(id));
      loadRequests();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not respond.');
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-6 text-xl font-semibold text-slate-900">Tutor dashboard</h1>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Add a course you teach</h2>
        <form onSubmit={submitCourse} className="flex flex-wrap items-center gap-2">
          <input
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="Course name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <select
            value={courseLevel}
            onChange={(e) => setCourseLevel(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {LEVEL_CHOICES.map((l) => (
              <option key={l} value={l}>
                Level {l}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
            Add course
          </button>
        </form>
        <p className="mt-1 text-xs text-slate-400">
          Adding a course automatically notifies students with a matching open application.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Add availability</h2>
        <form onSubmit={submitSlot} className="flex flex-wrap items-center gap-2">
          <select value={day} onChange={(e) => setDay(e.target.value as typeof day)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {DAYS_OF_WEEK.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <span className="text-slate-400">to</span>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Max students
            <input
              type="number"
              min={1}
              max={50}
              value={maxStudents}
              onChange={(e) => setMaxStudents(Number(e.target.value))}
              className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
            Add slot
          </button>
        </form>
        <p className="mt-1 text-xs text-slate-400">1 = one-on-one (needs your approval). More = group, auto-accepts until full.</p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Incoming requests awaiting your response</h2>
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">{r.student.full_name}</p>
                <p className="text-slate-500">
                  {r.course.course_name} · {r.slot.day_of_week} {r.slot.start_time.slice(0, 5)}–{r.slot.end_time.slice(0, 5)}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => respond(r.id, 'accept')} className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                  Accept
                </button>
                <button onClick={() => respond(r.id, 'reject')} className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-50">
                  Reject
                </button>
              </div>
            </div>
          ))}
          {requests.length === 0 && <p className="text-sm text-slate-400">Nothing pending.</p>}
        </div>
      </section>
    </div>
  );
}

import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiError, browseTutors, createMatchRequest } from '../lib/api';
import type { Course, Slot, TutorBrowseItem } from '../types';

export default function BrowseTutors() {
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
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(query || undefined);
  };

  const request = async (course: Course, slot: Slot) => {
    setPendingSlot(slot.id);
    try {
      const result = await createMatchRequest({ course_id: course.id, slot_id: slot.id });
      setToast(
        result.status === 'accepted'
          ? "You're in! Your seat is confirmed."
          : 'Request sent — awaiting the tutor\'s approval.'
      );
      load(query || undefined);
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : 'Could not send request.');
    } finally {
      setPendingSlot(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Browse tutors</h1>
          <p className="text-sm text-slate-500">Showing tutors teaching at your level.</p>
        </div>
      </div>

      <form onSubmit={onSearch} className="mb-6 flex max-w-md gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by course, e.g. Calculus"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
          Search
        </button>
      </form>

      {toast && (
        <div className="mb-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">{toast}</div>
      )}

      {loading && <p className="text-sm text-slate-400">Loading tutors…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && tutors.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-slate-500">No tutors found for that course at your level.</p>
          <p className="mt-1 text-sm text-slate-400">
            Try the Course Applications page to request it.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tutors.map((tutor) => (
          <div key={tutor.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">{tutor.full_name}</h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {tutor.courses.map((c) => (
                <span key={c.id} className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700">
                  {c.course_name}
                </span>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              {tutor.available_slots.map((slot) => {
                const course = tutor.courses[0]; // browse endpoint doesn't map slot->course explicitly
                return (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium text-slate-700">
                        {slot.day_of_week} {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                      </span>
                      <div className="text-xs text-slate-500">
                        {slot.is_bulk
                          ? `Group session · ${slot.current_students}/${slot.max_students} spots filled`
                          : '1-on-1 · needs tutor approval'}
                      </div>
                    </div>
                    <button
                      disabled={pendingSlot === slot.id}
                      onClick={() => request(course, slot)}
                      className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-teal-700 ring-1 ring-teal-600 hover:bg-teal-50 disabled:opacity-50"
                    >
                      {pendingSlot === slot.id ? 'Requesting…' : 'Request'}
                    </button>
                  </div>
                );
              })}
              {tutor.available_slots.length === 0 && (
                <p className="text-xs text-slate-400">No open slots right now.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

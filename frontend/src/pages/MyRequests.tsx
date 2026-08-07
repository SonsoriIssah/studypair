import { useEffect, useState } from 'react';
import { ApiError, cancelMyRequest, listMyRequests } from '../lib/api';
import type { OutgoingMatchRequest } from '../types';

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  accepted: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  expired: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-slate-100 text-slate-500',
};

export default function MyRequests() {
  const [requests, setRequests] = useState<OutgoingMatchRequest[]>([]);
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

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">My requests</h1>
      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Tutor</th>
              <th className="px-4 py-2 font-medium">Course</th>
              <th className="px-4 py-2 font-medium">Slot</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">{r.tutor.full_name}</td>
                <td className="px-4 py-3">{r.course.course_name}</td>
                <td className="px-4 py-3 text-slate-500">
                  {r.slot.day_of_week} {r.slot.start_time.slice(0, 5)}–{r.slot.end_time.slice(0, 5)}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[r.status]}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {(r.status === 'pending' || r.status === 'accepted') && (
                    <button
                      onClick={() => cancel(r.id)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && requests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { listNotifications, markNotificationRead } from '../lib/api';
import type { Notification } from '../types';

export default function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);

  const load = async () => setItems(await listNotifications());

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    load();
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Notifications</h1>
      <div className="space-y-2">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => !n.read && markRead(n.id)}
            className={`block w-full rounded-lg border px-4 py-3 text-left text-sm ${
              n.read ? 'border-slate-100 bg-white text-slate-500' : 'border-teal-100 bg-teal-50 text-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p>{n.message}</p>
              {!n.read && <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-teal-600" />}
            </div>
            <p className="mt-1 text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
          </button>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-400">No notifications.</p>}
      </div>
    </div>
  );
}

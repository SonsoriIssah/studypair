import { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { ApiError, listNotifications, markNotificationRead } from '../lib/api';
import type { Notification } from '../types';

function formatTime(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setItems(await listNotifications());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load notifications.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markNotificationRead(id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not mark as read.');
      load();
    }
  };

  return (
    <div className="py-space-lg">
      <div className="mb-space-lg">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-on-surface">
          Notifications
        </h1>
      </div>

      {error && <p className="mb-space-md text-body-sm font-body-sm text-error">{error}</p>}

      <div className="flex flex-col gap-space-lg">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => !n.read && markRead(n.id)}
            className={`relative flex items-start gap-space-md overflow-hidden rounded-xl border border-outline-variant p-space-md text-left shadow-sm transition-all duration-200 ${
              n.read ? 'bg-surface-container-lowest' : 'border-l-4 border-l-primary bg-[#eef2ff]'
            }`}
          >
            {!n.read && (
              <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary opacity-5 blur-xl" />
            )}
            <div
              className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                n.read ? 'bg-surface-container-high text-on-surface-variant' : 'bg-primary-container text-on-primary-container'
              }`}
            >
              <Icon name={n.read ? 'forum' : 'check_circle'} filled={!n.read} />
            </div>
            <div className="relative z-10 flex-1">
              <div className="mb-1 flex items-start justify-between">
                <p className={`text-label-md font-label-md text-on-surface ${n.read ? 'font-medium opacity-80' : 'font-semibold'}`}>
                  StudyPair
                </p>
                <span className="text-label-sm font-label-sm text-on-surface-variant">{formatTime(n.created_at)}</span>
              </div>
              <p className={`text-body-sm font-body-sm text-on-surface-variant ${n.read ? 'opacity-80' : ''}`}>
                {n.message}
              </p>
            </div>
            {!n.read && <div className="relative z-10 mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
          </button>
        ))}
        {items.length === 0 && <p className="text-body-sm font-body-sm text-outline">No notifications.</p>}
      </div>
    </div>
  );
}

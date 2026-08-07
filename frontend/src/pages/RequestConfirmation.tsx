import { Link, Navigate, useLocation } from 'react-router-dom';
import Icon from '../components/Icon';

interface ConfirmationState {
  status: 'pending' | 'accepted';
  tutorName: string;
  courseName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isBulk: boolean;
}

export default function RequestConfirmation() {
  const location = useLocation();
  const state = location.state as ConfirmationState | null;

  // Only reachable by navigating here from a successful booking — a direct
  // visit has nothing to show, so bounce back to browsing.
  if (!state) return <Navigate to="/" replace />;

  const time = `${state.dayOfWeek}, ${state.startTime.slice(0, 5)} - ${state.endTime.slice(0, 5)}`;
  const accepted = state.status === 'accepted';

  return (
    <div className="flex min-h-[calc(100vh-160px)] w-full flex-1 flex-col items-center justify-center py-space-lg md:py-space-xl">
      <div className="w-full max-w-md">
        <div
          className={`relative flex flex-col items-center overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-space-lg text-center shadow-sm ${
            accepted ? 'bg-pattern-group' : ''
          }`}
        >
          {!accepted && <div className="absolute bottom-0 left-0 top-0 w-1 bg-primary" />}

          <div
            className={`mb-space-sm flex h-16 w-16 items-center justify-center rounded-full ${
              accepted ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-low text-primary'
            }`}
          >
            <Icon name={accepted ? 'check_circle' : 'pending'} filled className="text-3xl" />
          </div>

          <h2 className="text-headline-md font-headline-md text-on-surface mb-2">
            {accepted ? "You're in!" : 'Request sent — waiting for tutor approval'}
          </h2>

          <div className="mb-space-lg w-full rounded-lg bg-surface-container p-space-md text-left">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-body-sm font-body-sm text-on-surface-variant">Course</span>
              <span className="text-label-md font-label-md text-on-surface">{state.courseName}</span>
            </div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-body-sm font-body-sm text-on-surface-variant">
                {accepted ? 'Group Leader' : 'Tutor'}
              </span>
              <span className="text-label-md font-label-md text-on-surface">{state.tutorName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body-sm font-body-sm text-on-surface-variant">Time</span>
              <span className="text-label-md font-label-md text-on-surface">{time}</span>
            </div>
            {state.isBulk && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-body-sm font-body-sm text-on-surface-variant">Session type</span>
                <span className="text-label-md font-label-md text-on-surface">Group session</span>
              </div>
            )}
          </div>

          <Link
            to={accepted ? '/requests' : '/'}
            className="w-full rounded-lg bg-primary py-3 text-label-md font-label-md text-on-primary transition-opacity hover:opacity-90"
          >
            {accepted ? 'View My Requests' : 'Done'}
          </Link>
        </div>
      </div>
    </div>
  );
}

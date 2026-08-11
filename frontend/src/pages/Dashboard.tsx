import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { ApiError, listMyCourseApplications, listMyRequests, listNotifications } from "../lib/api";
import type { CourseApplication, Notification, OutgoingMatchRequest } from "../types";

type Tab = "requests" | "applications" | "notifications";

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(iso: string) {
    const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return formatDate(iso);
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
        <div className="flex items-center gap-space-md rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md shadow-[0_4px_24px_rgba(79,70,229,0.05)] transition-transform duration-200 hover:-translate-y-1">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconClass}`}>
                <Icon name={icon} />
            </div>
            <div>
                <p className="text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">
                    {label}
                </p>
                <p className="text-headline-lg font-headline-lg text-on-surface">{value}</p>
            </div>
        </div>
    );
}

function EmptyState({
    icon,
    title,
    body,
    ctaLabel,
    onCta,
}: {
    icon: string;
    title: string;
    body: string;
    ctaLabel?: string;
    onCta?: () => void;
}) {
    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-space-xl text-center">
            <div className="mb-space-lg flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-low text-outline-variant">
                <Icon name={icon} className="text-[48px]" />
            </div>
            <h3 className="mb-space-sm text-headline-md font-headline-md text-on-surface">{title}</h3>
            <p className="mx-auto mb-space-lg max-w-md text-body-md font-body-md text-on-surface-variant">
                {body}
            </p>
            {ctaLabel && onCta && (
                <button
                    onClick={onCta}
                    className="rounded-lg bg-primary px-space-lg py-space-sm text-label-md font-label-md text-on-primary shadow-[0_4px_12px_rgba(79,70,229,0.2)] transition-colors hover:opacity-90"
                >
                    {ctaLabel}
                </button>
            )}
        </div>
    );
}

const requestStatusStyle: Record<string, string> = {
    accepted: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
};

const applicationStatusStyle: Record<string, string> = {
    open: "bg-amber-100 text-amber-700",
    fulfilled: "bg-green-100 text-green-700",
};

export default function Dashboard() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<OutgoingMatchRequest[]>([]);
    const [applications, setApplications] = useState<CourseApplication[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [tab, setTab] = useState<Tab>("requests");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([listMyRequests(), listMyCourseApplications(), listNotifications()])
            .then(([r, a, n]) => {
                setRequests(r);
                setApplications(a);
                setNotifications(n);
            })
            .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load your dashboard."))
            .finally(() => setLoading(false));
    }, []);

    const accepted = requests.filter((r) => r.status === "accepted");
    const pending = requests.filter((r) => r.status === "pending");
    const coursesRequested = new Set(requests.map((r) => r.course.id)).size;
    const tutorsMatched = new Set(accepted.map((r) => r.tutor.id)).size;

    return (
        <div className="flex flex-col gap-space-xl py-space-lg md:pt-space-xl">
            <div className="flex flex-col items-start justify-between gap-space-md md:flex-row md:items-center">
                <div>
                    <h1 className="mb-space-xs text-headline-xl font-headline-xl text-on-background">
                        Student Dashboard
                    </h1>
                    <p className="text-body-lg font-body-lg text-on-surface-variant">
                        Manage your tutoring requests and sessions.
                    </p>
                </div>
                <button
                    onClick={() => navigate("/browse")}
                    className="rounded-lg bg-primary px-space-md py-space-sm text-label-md font-label-md text-on-primary shadow-[0_4px_12px_rgba(79,70,229,0.2)] transition-colors hover:opacity-90"
                >
                    Find a Tutor
                </button>
            </div>

            <div className="grid grid-cols-1 gap-space-md md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    icon="menu_book"
                    iconClass="bg-primary-container/20 text-primary"
                    label="Courses Requested"
                    value={coursesRequested}
                />
                <StatCard
                    icon="check_circle"
                    iconClass="bg-secondary-container/20 text-secondary"
                    label="Accepted"
                    value={accepted.length}
                />
                <StatCard
                    icon="hourglass_empty"
                    iconClass="bg-tertiary-container/10 text-tertiary"
                    label="Pending"
                    value={pending.length}
                />
                <StatCard
                    icon="star"
                    iconClass="bg-inverse-primary/20 text-primary"
                    label="Tutors Matched"
                    value={tutorsMatched}
                />
            </div>

            <div className="flex flex-col gap-space-md">
                <div className="flex w-max gap-space-sm rounded-lg border border-outline-variant bg-surface-container-low p-space-xs">
                    <button
                        onClick={() => setTab("requests")}
                        className={`rounded-md px-space-md py-space-xs text-label-md font-label-md transition-colors ${
                            tab === "requests"
                                ? "bg-surface-container-lowest font-semibold text-on-surface shadow-sm"
                                : "text-on-surface-variant hover:text-on-surface"
                        }`}
                    >
                        My Requests ({requests.length})
                    </button>
                    <button
                        onClick={() => setTab("applications")}
                        className={`rounded-md px-space-md py-space-xs text-label-md font-label-md transition-colors ${
                            tab === "applications"
                                ? "bg-surface-container-lowest font-semibold text-on-surface shadow-sm"
                                : "text-on-surface-variant hover:text-on-surface"
                        }`}
                    >
                        Course Applications ({applications.length})
                    </button>
                    <button
                        onClick={() => setTab("notifications")}
                        className={`rounded-md px-space-md py-space-xs text-label-md font-label-md transition-colors ${
                            tab === "notifications"
                                ? "bg-surface-container-lowest font-semibold text-on-surface shadow-sm"
                                : "text-on-surface-variant hover:text-on-surface"
                        }`}
                    >
                        Notifications
                    </button>
                </div>

                {loading && <p className="text-body-sm font-body-sm text-outline">Loading…</p>}
                {error && <p className="text-body-sm font-body-sm text-error">{error}</p>}

                {!loading && !error && tab === "requests" && (
                    <>
                        {requests.length === 0 ? (
                            <EmptyState
                                icon="calendar_today"
                                title="No requests yet"
                                body="You haven't requested a tutor yet. Browse available tutors to get started."
                                ctaLabel="Browse Tutors"
                                onCta={() => navigate("/browse")}
                            />
                        ) : (
                            <>
                                <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
                                    {requests.map((r) => (
                                        <div
                                            key={r.id}
                                            className="rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md shadow-[0_4px_16px_rgba(53,37,205,0.05)]"
                                        >
                                            <div className="mb-space-sm flex items-start justify-between">
                                                <span
                                                    className={`inline-block rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                                        requestStatusStyle[r.status] ??
                                                        "bg-surface-container-high text-on-surface-variant"
                                                    }`}
                                                >
                                                    {r.status}
                                                </span>
                                                <Icon name="schedule" className="text-outline-variant" />
                                            </div>
                                            <h3 className="mb-space-xs text-headline-md font-headline-md text-on-surface">
                                                {r.course.course_name}
                                            </h3>
                                            <p className="text-body-sm font-body-sm text-on-surface-variant">
                                                with {r.tutor.full_name} &middot; {r.slot.day_of_week}{" "}
                                                {r.slot.start_time.slice(0, 5)} &middot; {formatDate(r.created_at)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                <Link to="/requests" className="text-label-md font-label-md text-primary hover:underline">
                                    Manage all requests &rarr;
                                </Link>
                            </>
                        )}
                    </>
                )}

                {!loading && !error && tab === "applications" && (
                    <>
                        {applications.length === 0 ? (
                            <EmptyState
                                icon="assignment"
                                title="No course applications yet"
                                body="Can't find a tutor for a course? Apply and we'll notify you once one's available."
                                ctaLabel="Apply for a Course"
                                onCta={() => navigate("/applications")}
                            />
                        ) : (
                            <>
                                <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
                                    {applications.map((a) => (
                                        <div
                                            key={a.id}
                                            className="rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md shadow-[0_4px_16px_rgba(53,37,205,0.05)]"
                                        >
                                            <div className="mb-space-sm flex items-start justify-between">
                                                <span
                                                    className={`inline-block rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                                        applicationStatusStyle[a.status] ??
                                                        "bg-surface-container-high text-on-surface-variant"
                                                    }`}
                                                >
                                                    {a.status}
                                                </span>
                                                <Icon name="assignment" className="text-outline-variant" />
                                            </div>
                                            <h3 className="mb-space-xs text-headline-md font-headline-md text-on-surface">
                                                {a.course_name}
                                            </h3>
                                            <p className="text-body-sm font-body-sm text-on-surface-variant">
                                                Applied {formatDate(a.created_at)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                <Link to="/applications" className="text-label-md font-label-md text-primary hover:underline">
                                    Manage all applications &rarr;
                                </Link>
                            </>
                        )}
                    </>
                )}

                {!loading && !error && tab === "notifications" && (
                    <>
                        {notifications.length === 0 ? (
                            <EmptyState
                                icon="notifications"
                                title="You're all caught up"
                                body="No notifications right now — we'll let you know when something changes."
                            />
                        ) : (
                            <>
                                <div className="flex flex-col gap-space-sm">
                                    {notifications.slice(0, 6).map((n) => (
                                        <div
                                            key={n.id}
                                            className={`flex items-start gap-space-md rounded-xl border border-outline-variant p-space-md ${
                                                n.read ? "bg-surface-container-lowest" : "border-l-4 border-l-primary bg-[#eef2ff]"
                                            }`}
                                        >
                                            <div
                                                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                                                    n.read
                                                        ? "bg-surface-container-high text-on-surface-variant"
                                                        : "bg-primary-container text-on-primary-container"
                                                }`}
                                            >
                                                <Icon name={n.read ? "forum" : "check_circle"} filled={!n.read} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="mb-1 flex items-start justify-between gap-space-sm">
                                                    <p className="text-label-md font-label-md text-on-surface">StudyPair</p>
                                                    <span className="whitespace-nowrap text-label-sm font-label-sm text-on-surface-variant">
                                                        {formatTime(n.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-body-sm font-body-sm text-on-surface-variant">{n.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Link to="/notifications" className="text-label-md font-label-md text-primary hover:underline">
                                    View all notifications &rarr;
                                </Link>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

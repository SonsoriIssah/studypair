import type {
    Course,
    CourseAddResult,
    CourseApplication,
    IncomingMatchRequest,
    Notification,
    OutgoingMatchRequest,
    Slot,
    TutorBrowseItem,
    User,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

// The token lives in memory + sessionStorage. sessionStorage (not
// localStorage) so a stolen/XSS-read token doesn't outlive the tab, and
// isn't silently shared across every tab on the machine. It's still
// JS-readable, which is the inherent tradeoff of a Bearer-token SPA (vs. an
// httpOnly cookie) — see AuthContext.tsx for why we're on this scheme
// rather than a cookie-based one.
const TOKEN_KEY = "studypair_token";

export function getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
    sessionStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

    if (res.status === 204) return undefined as T;

    let body: unknown = null;
    const text = await res.text();
    if (text) {
        try {
            body = JSON.parse(text);
        } catch {
            body = text;
        }
    }

    if (!res.ok) {
        if (res.status === 401) clearToken();
        const detail =
            body && typeof body === "object" && "detail" in body
                ? String((body as { detail: unknown }).detail)
                : `Request failed (${res.status})`;
        throw new ApiError(res.status, detail);
    }

    return body as T;
}

// ---- Auth ----
export const startGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
};
export const fetchMe = () => request<User>("/auth/me");
export const deleteAccount = () => request<void>("/auth/me", { method: "DELETE" });
export const loginWithEmail = async (email: string, password: string) => {
    const response = await request<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
    return response.access_token;
};
export const registerWithEmail = async (
    email: string,
    password: string,
    confirmPassword: string,
    full_name: string
) => {
    // No token — the account can't sign in until the emailed code is
    // confirmed via verifyEmail below.
    const response = await request<{ email: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
            email,
            password,
            confirm_password: confirmPassword,
            full_name,
        }),
    });
    return response.email;
};
export const verifyEmail = async (email: string, code: string) => {
    const response = await request<{ access_token: string }>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email, code }),
    });
    return response.access_token;
};
export const resendVerificationCode = (email: string) =>
    request<void>("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
    });
export const uploadAvatar = (dataUrl: string) =>
    request<User>("/auth/me/avatar", {
        method: "POST",
        body: JSON.stringify({ data_url: dataUrl }),
    });

export const completeProfile = (payload: {
    phone_number: string;
    level: number;
    university_id: string;
    full_name?: string;
}) =>
    request<User>("/auth/complete-profile", {
        method: "POST",
        body: JSON.stringify(payload),
    });

// ---- Student: browsing & requests ----
export const browseTutors = (course?: string) =>
    request<TutorBrowseItem[]>(
        `/students/tutors${course ? `?course=${encodeURIComponent(course)}` : ""}`
    );

export const createMatchRequest = (payload: {
    course_id: string;
    slot_id: string;
}) =>
    request<OutgoingMatchRequest>("/students/requests", {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const listMyRequests = (status: string = "all") =>
    request<OutgoingMatchRequest[]>(`/students/me/requests?status=${status}`);

export const cancelMyRequest = (requestId: string) =>
    request(`/students/me/requests/${requestId}/cancel`, { method: "POST" });

// ---- Student: course applications ----
export const createCourseApplication = (courseName: string) =>
    request<CourseApplication>("/students/course-applications", {
        method: "POST",
        body: JSON.stringify({ course_name: courseName }),
    });

export const listMyCourseApplications = () =>
    request<CourseApplication[]>("/students/me/course-applications");

export const withdrawCourseApplication = (applicationId: string) =>
    request(`/students/me/course-applications/${applicationId}/withdraw`, {
        method: "POST",
    });

// ---- Notifications (student-facing) ----
export const listNotifications = () =>
    request<Notification[]>("/students/me/notifications");
export const markNotificationRead = (notificationId: string) =>
    request<Notification>(`/students/me/notifications/${notificationId}/read`, {
        method: "PATCH",
    });

// ---- Tutor: courses & availability ----
export const listCourseNames = (level: number) =>
    request<string[]>(`/tutors/course-names?level=${level}`);

export const listMyCourses = () => request<Course[]>("/tutors/me/courses");

export const addCourse = (payload: { course_name: string; level: number }) =>
    request<CourseAddResult>("/tutors/me/courses", {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const deleteCourse = (courseId: string) =>
    request(`/tutors/me/courses/${courseId}`, { method: "DELETE" });

export const listMyAvailability = () => request<Slot[]>("/tutors/me/availability");

export const addAvailabilitySlot = (payload: {
    day_of_week: string;
    start_time: string;
    end_time: string;
    max_students: number;
}) =>
    request<Slot>("/tutors/me/availability", {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const updateAvailabilitySlot = (
    slotId: string,
    payload: Partial<{
        day_of_week: string;
        start_time: string;
        end_time: string;
        max_students: number;
    }>
) =>
    request<Slot>(`/tutors/me/availability/${slotId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });

export const deleteAvailabilitySlot = (slotId: string) =>
    request(`/tutors/me/availability/${slotId}`, { method: "DELETE" });

// ---- Tutor: incoming requests ----
export const listIncomingRequests = (status: string = "pending") =>
    request<IncomingMatchRequest[]>(`/tutors/me/requests?status=${status}`);

export const acceptRequest = (requestId: string) =>
    request(`/tutors/me/requests/${requestId}/accept`, { method: "POST" });

export const rejectRequest = (requestId: string) =>
    request(`/tutors/me/requests/${requestId}/reject`, { method: "POST" });

// ---- Admin ----
export const adminListUsers = () => request<User[]>("/admin/users");
export const adminListCourseApplications = (status: string = "open") =>
    request<CourseApplication[]>(`/admin/course-applications?status=${status}`);

export type { Course };

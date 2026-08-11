// These types mirror the backend's Pydantic schemas field-for-field
// (see backend/app/schemas/*.py). Keep them in sync — the backend is the
// source of truth for shape and naming.

export const LEVEL_CHOICES = [100, 200, 300, 400] as const;
export type Level = (typeof LEVEL_CHOICES)[number];

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export const DAYS_OF_WEEK: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export type MatchRequestStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
export type CourseApplicationStatus = 'open' | 'fulfilled' | 'expired' | 'withdrawn';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  university_id: string | null;
  avatar_data_url: string | null;
  level: Level | null;
  profile_completed: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface Course {
  id: string;
  course_name: string;
  level: number;
}

export interface Slot {
  id: string;
  day_of_week: DayOfWeek;
  start_time: string; // "HH:MM:SS"
  end_time: string;
  max_students: number;
  current_students: number;
  seats_available: number;
  is_full: boolean;
  is_bulk: boolean; // max_students > 1 -> auto-accept, no tutor approval
}

// GET /students/tutors
export interface TutorBrowseItem {
  id: string;
  full_name: string;
  courses: Course[];
  available_slots: Slot[];
}

// Shared shape of a match request's counterpart user
export interface RequestingStudent {
  id: string;
  full_name: string;
  email: string;
  level: number | null;
}

export interface RequestedTutor {
  id: string;
  full_name: string;
  email: string;
}

// GET /students/me/requests
export interface OutgoingMatchRequest {
  id: string;
  status: MatchRequestStatus;
  created_at: string;
  responded_at: string | null;
  tutor: RequestedTutor;
  course: Course;
  slot: Slot;
}

// GET /tutors/me/requests
export interface IncomingMatchRequest {
  id: string;
  status: MatchRequestStatus;
  created_at: string;
  responded_at: string | null;
  student: RequestingStudent;
  course: Course;
  slot: Slot;
}

export interface CourseApplication {
  id: string;
  student_id: string;
  course_name: string;
  status: CourseApplicationStatus;
  created_at: string;
  expires_at: string;
}

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface CourseAddResult {
  course: Course;
  fulfilled_applications: number;
  students_notified: number;
}

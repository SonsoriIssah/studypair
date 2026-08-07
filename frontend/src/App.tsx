import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import AdminPanel from './pages/AdminPanel';
import AuthCallback from './pages/AuthCallback';
import BrowseTutors from './pages/BrowseTutors';
import CompleteProfile from './pages/CompleteProfile';
import CourseApplications from './pages/CourseApplications';
import Login from './pages/Login';
import MyRequests from './pages/MyRequests';
import Notifications from './pages/Notifications';
import TutorDashboard from './pages/TutorDashboard';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<BrowseTutors />} />
            <Route path="/requests" element={<MyRequests />} />
            <Route path="/applications" element={<CourseApplications />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/tutor" element={<TutorDashboard />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

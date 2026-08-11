import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import AdminPanel from './pages/AdminPanel';
import AuthCallback from './pages/AuthCallback';
import BrowseTutors from './pages/BrowseTutors';
import CompleteProfile from './pages/CompleteProfile';
import CourseApplications from './pages/CourseApplications';
import Dashboard from './pages/Dashboard';
import EditProfile from './pages/EditProfile';
import Landing from './pages/Landing';
import Login from './pages/Login';
import MyRequests from './pages/MyRequests';
import Notifications from './pages/Notifications';
import RequestConfirmation from './pages/RequestConfirmation';
import TutorDashboard from './pages/TutorDashboard';
import TutorRequests from './pages/TutorRequests';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<EditProfile />} />
            <Route path="/browse" element={<BrowseTutors />} />
            <Route path="/request-confirmation" element={<RequestConfirmation />} />
            <Route path="/requests" element={<MyRequests />} />
            <Route path="/applications" element={<CourseApplications />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/tutor" element={<TutorDashboard />} />
            <Route path="/tutor/requests" element={<TutorRequests />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

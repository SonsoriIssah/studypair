import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
    const { user, isLoading, isAuthenticated } = useAuth();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center text-slate-400">
                Loading…
            </div>
        );
    }

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    // Backend blocks browse/request endpoints with a 409 until profile_completed
    // is set, so route there first rather than letting API calls fail.
    if (user && !user.profile_completed)
        return <Navigate to="/complete-profile" replace />;

    return <Outlet />;
}

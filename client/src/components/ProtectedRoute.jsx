import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { token, loading, user } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!token) return <Navigate to="/login" replace />;
  if (
    Array.isArray(allowedRoles) &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user?.role)
  ) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

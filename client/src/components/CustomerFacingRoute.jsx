import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

export default function CustomerFacingRoute() {
  const { loading, user } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (user?.role === "admin") {
    return <Navigate to="/staff" replace />;
  }

  return <Outlet />;
}

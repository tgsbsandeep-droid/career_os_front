import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getCachedUser, getDashboardPath, hasRole, isSessionReady, needsRoleSelection, subscribeToUser } from "../services/auth";
import type { User } from "@supabase/supabase-js";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(getCachedUser);
  const [loading, setLoading] = useState(!isSessionReady());

  useEffect(() => {
    return subscribeToUser((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7fbf9]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#146c45]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (needsRoleSelection(user)) {
    return <Navigate to="/select-role" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(user, allowedRoles)) {
    return <Navigate to={getDashboardPath(user)} replace />;
  }

  return <Outlet />;
}

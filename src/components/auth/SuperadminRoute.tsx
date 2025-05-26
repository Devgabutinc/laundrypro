import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface SuperadminRouteProps {
  children: React.ReactNode;
}

const SuperadminRoute: React.FC<SuperadminRouteProps> = ({ children }) => {
  const { session, loading, profile } = useAuth();

  if (loading) {
    return <div className="min-h-screen grid place-items-center">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile || profile.role !== "superadmin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default SuperadminRoute; 
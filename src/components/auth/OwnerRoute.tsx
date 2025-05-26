import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface OwnerRouteProps {
  children: React.ReactNode;
}

const OwnerRoute: React.FC<OwnerRouteProps> = ({ children }) => {
  const { session, loading, profile } = useAuth();

  if (loading) {
    return <div className="min-h-screen grid place-items-center">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile || profile.role !== "owner") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default OwnerRoute; 
import { Navigate } from "react-router-dom";

// Employer role is merged with Recruiter — redirect to the unified recruiter dashboard.
export default function EmployerDashboard() {
  return <Navigate to="/recruiter/dashboard" replace />;
}

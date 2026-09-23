import { useEffect } from "react";
import {
  BrowserRouter,
  Outlet,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";
import AuthCallback from "./pages/auth/AuthCallback";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import SelectRole from "./pages/auth/SelectRole";
import CandidateDashboard from "./pages/candidate/Dashboard";
import CareerCoach from "./pages/candidate/CareerCoach";
import Courses from "./pages/candidate/Courses";
import Applications from "./pages/candidate/Applications";
import Jobs from "./pages/candidate/Jobs";
import JobDetails from "./pages/candidate/JobDetails";
import CourseDetails from "./pages/candidate/CourseDetails";
import Profile from "./pages/candidate/Profile";
import ResumeOptimizer from "./pages/candidate/ResumeOptimizer";
import InterviewPractice from "./pages/candidate/InterviewPractice";
import OfflineTraining from "./pages/candidate/OfflineTraining";
import Events from "./pages/candidate/Events";
import MentorBooking from "./pages/candidate/MentorBooking";
import Certificates from "./pages/candidate/Certificates";
import Saved from "./pages/candidate/Saved";
import Assistant from "./pages/candidate/Assistant";
import AcademyDashboard from "./pages/roles/TutorDashboard";
import RecruiterDashboard from "./pages/roles/RecruiterDashboard";
import EmployerDashboard from "./pages/roles/EmployerDashboard";
import CandidateMenu from "./components/CandidateMenu";
import AdminDashboard from "./pages/roles/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function CandidateLayout() {
  return (
    <>
      <CandidateMenu />
      <Outlet />
    </>
  );
}

// Fire-and-forget warm-up ping so Render free-tier wakes up before the user
// needs the API. Errors are intentionally swallowed.
const API_BASE = String(import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "")
  || (import.meta.env.PROD ? "https://career-os-back.onrender.com" : "");

function useWarmUpBackend() {
  useEffect(() => {
    if (!API_BASE) return;
    fetch(`${API_BASE}/api/health`, { method: "GET" }).catch(() => {/* ignore */});
  }, []);
}

export default function App() {
  useWarmUpBackend();
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/select-role" element={<SelectRole />} />

        {/* Candidate protected routes */}
        <Route element={<ProtectedRoute allowedRoles={["candidate", "training_institute", "college"]} />}>
          <Route path="/candidate" element={<CandidateLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<CandidateDashboard />} />
            <Route path="career-coach" element={<CareerCoach />} />
            <Route path="resume-optimizer" element={<ResumeOptimizer />} />
            <Route path="interview-practice" element={<InterviewPractice />} />
            <Route path="events" element={<Events />} />
            <Route path="mentors" element={<MentorBooking />} />
            <Route path="offline-training" element={<OfflineTraining />} />
            <Route path="courses" element={<Courses />} />
            <Route path="courses/:courseId" element={<CourseDetails />} />
            <Route path="profile" element={<Profile />} />
            <Route path="applications" element={<Applications />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="jobs/:jobId" element={<JobDetails />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="saved" element={<Saved />} />
            <Route path="assistant" element={<Assistant />} />
          </Route>
        </Route>

        {/* Academy protected routes */}
        <Route element={<ProtectedRoute allowedRoles={["academy"]} />}>
          <Route path="/academy/dashboard"    element={<AcademyDashboard view="dashboard" />} />
          <Route path="/academy/profile"      element={<AcademyDashboard view="profile" />} />
          <Route path="/academy/courses"      element={<AcademyDashboard view="courses" />} />
          <Route path="/academy/offline"      element={<AcademyDashboard view="offline" />} />
          <Route path="/academy/students"     element={<AcademyDashboard view="students" />} />
          <Route path="/academy/attendance"   element={<AcademyDashboard view="attendance" />} />
          <Route path="/academy/quizzes"      element={<AcademyDashboard view="quizzes" />} />
          <Route path="/academy/assignments"  element={<AcademyDashboard view="assignments" />} />
          <Route path="/academy/certificates" element={<AcademyDashboard view="certificates" />} />
          <Route path="/academy/ai-content"   element={<AcademyDashboard view="ai-content" />} />
          <Route path="/academy/analytics"    element={<AcademyDashboard view="analytics" />} />
        </Route>

        {/* Recruiter + Employer protected routes (employer is merged into recruiter) */}
        <Route element={<ProtectedRoute allowedRoles={["recruiter", "employer"]} />}>
          <Route path="/recruiter/dashboard"  element={<RecruiterDashboard view="dashboard" />} />
          <Route path="/recruiter/profile"    element={<RecruiterDashboard view="profile" />} />
          <Route path="/recruiter/jobs"       element={<RecruiterDashboard view="jobs" />} />
          <Route path="/recruiter/search"     element={<RecruiterDashboard view="search" />} />
          <Route path="/recruiter/resumes"    element={<RecruiterDashboard view="resumes" />} />
          <Route path="/recruiter/matching"   element={<RecruiterDashboard view="matching" />} />
          <Route path="/recruiter/interviews" element={<RecruiterDashboard view="interviews" />} />
          <Route path="/recruiter/offers"     element={<RecruiterDashboard view="offers" />} />
          <Route path="/recruiter/pipeline"   element={<RecruiterDashboard view="pipeline" />} />
          <Route path="/recruiter/campus"     element={<Navigate to="/recruiter/dashboard" replace />} />
          <Route path="/recruiter/bulk"       element={<RecruiterDashboard view="bulk" />} />
          <Route path="/recruiter/analytics"  element={<RecruiterDashboard view="analytics" />} />
          <Route path="/employer/dashboard"   element={<EmployerDashboard />} />
        </Route>

        {/* Admin protected routes */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

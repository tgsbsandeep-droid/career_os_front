import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Outlet,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

// Small structural components needed on every render — keep as static imports.
import CandidateMenu from "./components/CandidateMenu";
import ProtectedRoute from "./components/ProtectedRoute";
// Tiny redirect shim — no meaningful bundle cost.
import EmployerDashboard from "./pages/roles/EmployerDashboard";

// ---------------------------------------------------------------------------
// Route-level code splitting: each page is loaded only when first navigated to.
// This keeps the initial bundle (landing page + login) small for anonymous users.
// ---------------------------------------------------------------------------
const LandingPage        = lazy(() => import("./pages/LandingPage"));
const Register           = lazy(() => import("./pages/auth/Register"));
const Login              = lazy(() => import("./pages/auth/Login"));
const AuthCallback       = lazy(() => import("./pages/auth/AuthCallback"));
const ForgotPassword     = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword      = lazy(() => import("./pages/auth/ResetPassword"));
const SelectRole         = lazy(() => import("./pages/auth/SelectRole"));
const CandidateDashboard = lazy(() => import("./pages/candidate/Dashboard"));
const CareerCoach        = lazy(() => import("./pages/candidate/CareerCoach"));
const Courses            = lazy(() => import("./pages/candidate/Courses"));
const Applications       = lazy(() => import("./pages/candidate/Applications"));
const Jobs               = lazy(() => import("./pages/candidate/Jobs"));
const JobDetails         = lazy(() => import("./pages/candidate/JobDetails"));
const CourseDetails      = lazy(() => import("./pages/candidate/CourseDetails"));
const Profile            = lazy(() => import("./pages/candidate/Profile"));
const ResumeOptimizer    = lazy(() => import("./pages/candidate/ResumeOptimizer"));
const InterviewPractice  = lazy(() => import("./pages/candidate/InterviewPractice"));
const OfflineTraining    = lazy(() => import("./pages/candidate/OfflineTraining"));
const Events             = lazy(() => import("./pages/candidate/Events"));
const MentorBooking      = lazy(() => import("./pages/candidate/MentorBooking"));
const Certificates       = lazy(() => import("./pages/candidate/Certificates"));
const Saved              = lazy(() => import("./pages/candidate/Saved"));
const Assistant          = lazy(() => import("./pages/candidate/Assistant"));
const AcademyDashboard   = lazy(() => import("./pages/roles/TutorDashboard"));
const RecruiterDashboard = lazy(() => import("./pages/roles/RecruiterDashboard"));
const AdminDashboard     = lazy(() => import("./pages/roles/AdminDashboard"));

/**
 * Detects when Supabase redirects back to the root URL with OAuth tokens.
 * This happens when the Supabase dashboard "Site URL" or redirect allow-list
 * is set to the bare origin (e.g. https://career-os-front.pages.dev) instead
 * of the full callback path (/auth/callback).
 *
 * With implicit flow:  /#access_token=...
 * With PKCE flow:      /?code=...
 *
 * In both cases we forward to /auth/callback preserving the search + hash so
 * AuthCallback can finish the sign-in.
 */
function OAuthRootRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
    const search = new URLSearchParams(location.search);
    const hasOAuthHash =
      hash.has("access_token") || hash.has("error") || hash.has("error_description");
    const hasOAuthCode = search.has("code") || search.has("error");

    if (hasOAuthHash || hasOAuthCode) {
      navigate("/auth/callback" + location.search + location.hash, { replace: true });
    }
  }, [navigate, location]);

  return null; // render nothing — LandingPage is rendered by the parent route
}

function RootRoute() {
  return (
    <>
      <OAuthRootRedirect />
      <LandingPage />
    </>
  );
}

function CandidateLayout() {
  return (
    <>
      <CandidateMenu />
      <Outlet />
    </>
  );
}

// Fire-and-forget warm-up ping so Render free-tier wakes up before the user
// needs the API. Retries up to 4 times with 8s gaps to handle cold starts.
// Errors are intentionally swallowed.
const API_BASE = String(import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "")
  || (import.meta.env.PROD ? "https://career-os-back.onrender.com" : "");

async function pingBackend(retries = 4, delayMs = 8000) {
  if (!API_BASE) return;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${API_BASE}/api/health`, { method: "GET", keepalive: true });
      if (res.ok) return; // backend is awake
    } catch { /* ignore network errors */ }
    if (i < retries - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
}

function useWarmUpBackend() {
  useEffect(() => { void pingBackend(); }, []);
}

// Minimal full-page spinner shown while a lazy chunk is loading.
function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7fbf9]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#146c45] border-t-transparent" />
    </div>
  );
}

export default function App() {
  useWarmUpBackend();
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<RootRoute />} />
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
      </Suspense>
    </BrowserRouter>
  );
}

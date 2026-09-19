import { useEffect, useState } from "react";
import {
  Award,
  Bookmark,
  Briefcase,
  BookOpen,
  MessageSquare,
  Target,
  UserCheck,
  ArrowRight,
  TrendingUp,
  Zap,
  Bell,
} from "lucide-react";
import { Link } from "react-router-dom";
import SkillRecommendations from "../../components/SkillRecommendations";
import { supabase } from "../../services/api";
import { apiRequest } from "../../services/api";

interface Enrollment {
  id: string;
  progress_pct?: number;
  courses?: { title: string; level?: string };
}

interface Application {
  id: string;
  status: string;
  created_at: string;
  jobs?: { title: string; company_name?: string };
}

interface Notification {
  id: string;
  message: string;
  created_at: string;
  type?: string;
}

const colorMap: Record<string, { bg: string; icon: string; badge: string }> = {
  emerald: { bg: "bg-[#eaf6f0]", icon: "text-[#146c45]", badge: "bg-[#d4ede2] text-[#146c45]" },
  blue:    { bg: "bg-blue-50",   icon: "text-blue-600",   badge: "bg-blue-100 text-blue-700" },
  violet:  { bg: "bg-violet-50", icon: "text-violet-600", badge: "bg-violet-100 text-violet-700" },
  amber:   { bg: "bg-amber-50",  icon: "text-amber-600",  badge: "bg-amber-100 text-amber-700" },
};

const activityColors: Record<string, string> = {
  application:   "bg-violet-500",
  enrollment:    "bg-blue-500",
  status_change: "bg-[#146c45]",
  default:       "bg-amber-500",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CandidateDashboard() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [jobCount, setJobCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user) {
        setUserId(user.id);
        setUserName(user.user_metadata?.full_name ?? "");
      } else {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    async function fetchData() {
      setLoading(true);
      try {
        const [enrollRes, appRes, notifRes, jobRes] = await Promise.allSettled([
          apiRequest<{ enrollments: Enrollment[] }>(`/api/candidate/${userId}/enrollments`),
          apiRequest<{ applications: Application[] }>(`/api/candidate/${userId}/applications`),
          apiRequest<{ notifications: Notification[] }>(`/api/notifications`),
          apiRequest<{ jobs: unknown[] }>(`/api/jobs`),
        ]);

        if (enrollRes.status === "fulfilled") setEnrollments(enrollRes.value.enrollments ?? []);
        if (appRes.status === "fulfilled") setApplications(appRes.value.applications ?? []);
        if (notifRes.status === "fulfilled") setNotifications(notifRes.value.notifications ?? []);
        if (jobRes.status === "fulfilled") setJobCount((jobRes.value.jobs ?? []).length);
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [userId]);

  const profileFields = userName ? 1 : 0;
  const profileStrength = Math.min(100, 40 + profileFields * 20 + (enrollments.length > 0 ? 20 : 0) + (applications.length > 0 ? 20 : 0));

  const stats = [
    {
      title: "Profile strength",
      value: `${profileStrength}%`,
      change: "Update profile",
      positive: true,
      icon: UserCheck,
      color: "emerald",
      href: "/candidate/profile",
    },
    {
      title: "Enrolled courses",
      value: String(enrollments.length),
      change: `${enrollments.filter(e => (e.progress_pct ?? 0) > 0 && (e.progress_pct ?? 0) < 100).length} in progress`,
      positive: true,
      icon: BookOpen,
      color: "blue",
      href: "/candidate/courses",
    },
    {
      title: "Applications",
      value: String(applications.length),
      change: `${applications.filter(a => a.status === "shortlisted" || a.status === "interview").length} active`,
      positive: true,
      icon: Briefcase,
      color: "violet",
      href: "/candidate/applications",
    },
    {
      title: "Job matches",
      value: String(jobCount),
      change: "Browse all",
      positive: true,
      icon: Target,
      color: "amber",
      href: "/candidate/jobs",
    },
  ];

  const inProgressCourses = enrollments
    .filter(e => (e.progress_pct ?? 0) < 100)
    .slice(0, 3);

  return (
    <main id="main" className="min-h-screen bg-[#f7fbf9]">
      <a href="#main" className="skip-link">Skip to content</a>
      <div className="mx-auto max-w-[1180px] space-y-8 px-5 py-8">

        {/* Hero header */}
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">{greeting.toUpperCase()}</p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">
              {userName ? `Welcome back, ${userName.split(" ")[0]}!` : "Build your next career move."}
            </h1>
            <p className="mt-2 max-w-xl text-[15px] leading-7 text-[#5b6b64]">
              Learn skills, discover opportunities and get personalized career guidance.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/candidate/profile"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d5e3dc] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#1d332a] shadow-sm transition duration-200 hover:border-[#b7cec3]"
            >
              <UserCheck size={16} />
              Complete profile
            </Link>
            <Link
              to="/candidate/jobs"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#146c45] px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] transition duration-200 hover:bg-[#0f5a39] active:scale-[0.98]"
            >
              <Target size={16} />
              Browse jobs
            </Link>
          </div>
        </section>

        {/* Stats grid */}
        {loading ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Loading dashboard stats">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="ui-skeleton h-[148px] rounded-[22px]" />
            ))}
          </section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              const colors = colorMap[stat.color];
              return (
                <Link
                  key={stat.title}
                  to={stat.href}
                  className="group rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] transition duration-200 hover:-translate-y-1 hover:border-[#cfe6db] hover:shadow-[0_18px_40px_-24px_rgba(18,50,36,0.32)]"
                >
                  <div className="flex items-start justify-between">
                    <div className={`rounded-xl p-2.5 ${colors.bg}`}>
                      <Icon size={20} className={colors.icon} />
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colors.badge}`}>
                      {stat.change}
                    </span>
                  </div>
                  <p className="mt-4 font-[family-name:var(--font-display)] text-[30px] font-semibold leading-none text-[#12241c]">{stat.value}</p>
                  <p className="mt-1.5 text-[13px] text-[#5b6b64] transition duration-200 group-hover:text-[#146c45]">{stat.title}</p>
                </Link>
              );
            })}
          </section>
        )}

        {/* Skill recommendations */}
        <SkillRecommendations />

        {/* Main content grid */}
        <section className="grid gap-6 xl:grid-cols-3">

          {/* Course progress */}
          <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] xl:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#12241c]">Continue learning</h2>
                <p className="mt-0.5 text-[13px] text-[#5b6b64]">Pick up where you left off.</p>
              </div>
              <Link
                to="/candidate/courses"
                className="flex items-center gap-1 text-[13px] font-semibold text-[#146c45] hover:text-[#0f5a39]"
              >
                View all <ArrowRight size={15} />
              </Link>
            </div>

            <div className="mt-6 space-y-5">
              {inProgressCourses.length === 0 ? (
                <p className="text-[13px] text-[#7a8b84]">No courses in progress. Browse courses to get started.</p>
              ) : (
                inProgressCourses.map((enrollment) => (
                  <div key={enrollment.id}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[14px] font-medium text-[#12241c]">
                          {enrollment.courses?.title ?? "Course"}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#7a8b84]">
                          {enrollment.courses?.level ?? ""}
                        </p>
                      </div>
                      <span className="text-[14px] font-semibold text-[#12241c]">
                        {enrollment.progress_pct ?? 0}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eef3f0]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#146c45] to-[#157a62] transition-all duration-500"
                        style={{ width: `${enrollment.progress_pct ?? 0}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/candidate/courses"
                className="inline-flex items-center gap-2 rounded-full bg-[#146c45] px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] transition hover:bg-[#0f5a39]"
              >
                Browse courses
              </Link>
              <Link
                to="/candidate/applications"
                className="inline-flex items-center gap-2 rounded-full border border-[#d5e3dc] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#1d332a] shadow-sm transition hover:border-[#b7cec3]"
              >
                View applications
              </Link>
              <Link
                to="/candidate/saved"
                className="inline-flex items-center gap-2 rounded-full border border-[#d5e3dc] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#1d332a] shadow-sm transition hover:border-[#b7cec3]"
              >
                <Bookmark size={15} /> Saved
              </Link>
              <Link
                to="/candidate/certificates"
                className="inline-flex items-center gap-2 rounded-full border border-[#d5e3dc] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#1d332a] shadow-sm transition hover:border-[#b7cec3]"
              >
                <Award size={15} /> Certificates
              </Link>
            </div>
          </div>

          {/* AI Career Coach CTA */}
          <div className="flex flex-col justify-between rounded-[22px] bg-gradient-to-br from-[#0b2a1c] via-[#0f3d28] to-[#0b5c3a] p-6 text-white shadow-[0_18px_40px_-28px_rgba(18,50,36,0.45)]">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a8f5a]/20">
                <Zap size={20} className="text-[#2aa36a]" />
              </div>
              <p className="mt-4 text-[12px] font-semibold tracking-[0.12em] text-[#2aa36a]">AI CAREER COACH</p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-[20px] font-semibold leading-snug">
                Your personalized career roadmap
              </h2>
              <p className="mt-3 text-[13px] leading-6 text-white/70">
                Get AI-powered advice on skill gaps, job strategy, and your next career move.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                to="/candidate/assistant"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#146c45] px-4 py-3 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] transition hover:bg-[#1a8f5a]"
              >
                <MessageSquare size={16} />
                Ask AI assistant
              </Link>
              <Link
                to="/candidate/career-coach"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-white/15"
              >
                <TrendingUp size={16} />
                Analyze my career
              </Link>
            </div>
          </div>
        </section>

        {/* Recent notifications */}
        <section className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-[#5b6b64]" />
              <h2 className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#12241c]">Recent activity</h2>
            </div>
            <Link
              to="/candidate/applications"
              className="flex items-center gap-1 text-[13px] font-semibold text-[#146c45] hover:text-[#0f5a39]"
            >
              View all <ArrowRight size={15} />
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {notifications.length === 0 ? (
              <p className="text-[13px] text-[#7a8b84]">No recent activity yet.</p>
            ) : (
              notifications.slice(0, 5).map((notif) => (
                <div key={notif.id} className="flex items-start gap-3">
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${activityColors[notif.type ?? "default"] ?? activityColors.default}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#3d4d46]">{notif.message}</p>
                    <p className="mt-0.5 text-[12px] text-[#7a8b84]">{timeAgo(notif.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </main>
  );
}

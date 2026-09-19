import {
  CheckCircle2,
  LogOut,
  Shield,
  UserRound,
  BookOpen,
  Briefcase,
  Users,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, supabase } from "../../services/api";

type User = { id: string; full_name: string; role: string; status: string };
type ModeratedItem = { id: string; title: string; status: string; company_name?: string };
type Stats = { totalUsers: number; candidates: number; academies: number; recruiters: number; courses: number; jobs: number; applications: number };

const userStatusColors: Record<string, string> = {
  active:    "bg-[#d4ede2] text-[#146c45]",
  pending:   "bg-amber-100 text-amber-700",
  suspended: "bg-red-100 text-red-600",
};

const roleColors: Record<string, string> = {
  candidate: "bg-blue-100 text-blue-700",
  academy:   "bg-violet-100 text-violet-700",
  recruiter: "bg-amber-100 text-amber-700",
  employer:  "bg-[#d4ede2] text-[#146c45]",
  admin:     "bg-red-100 text-red-700",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const accountRef = useRef<HTMLDivElement>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<ModeratedItem[]>([]);
  const [jobs, setJobs] = useState<ModeratedItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) { navigate("/login", { replace: true }); return; }
      void Promise.all([
        apiRequest<{ users: User[] }>("/api/admin/users"),
        apiRequest<{ courses: ModeratedItem[] }>("/api/admin/courses"),
        apiRequest<{ jobs: ModeratedItem[] }>("/api/admin/jobs"),
        apiRequest<{ stats: Stats }>("/api/admin/stats"),
      ]).then(([usersRes, coursesRes, jobsRes, statsRes]) => {
        setUsers(usersRes.users);
        setCourses(coursesRes.courses);
        setJobs(jobsRes.jobs);
        setStats(statsRes.stats);
      }).catch((err: Error) => setMessage({ text: err.message, type: "error" }));
    });
  }, [navigate]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function updateUser(id: string, status: string) {
    try {
      await apiRequest(`/api/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setUsers((curr) => curr.map((u) => u.id === id ? { ...u, status } : u));
      setMessage({ text: "User status updated.", type: "success" });
    } catch (err) { setMessage({ text: (err as Error).message, type: "error" }); }
  }

  async function updateItem(kind: "courses" | "jobs", id: string, status: string) {
    try {
      await apiRequest(`/api/admin/${kind}/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      const setter = kind === "courses" ? setCourses : setJobs;
      setter((curr) => curr.map((item) => item.id === id ? { ...item, status } : item));
      setMessage({ text: `${kind === "courses" ? "Course" : "Job"} status updated.`, type: "success" });
    } catch (err) { setMessage({ text: (err as Error).message, type: "error" }); }
  }

  async function logout() { await supabase.auth.signOut(); navigate("/login", { replace: true }); }

  const statCards = stats ? [
    { label: "Total users",   value: stats.totalUsers,   icon: <Users size={20} />,    color: "bg-[#eef3f0] text-[#5b6b64]" },
    { label: "Candidates",    value: stats.candidates,   icon: <UserRound size={20} />, color: "bg-blue-50 text-blue-600" },
    { label: "Academies",     value: stats.academies,    icon: <BookOpen size={20} />,  color: "bg-violet-50 text-violet-600" },
    { label: "Recruiters",    value: stats.recruiters,   icon: <Briefcase size={20} />, color: "bg-amber-50 text-amber-600" },
    { label: "Courses",       value: stats.courses,      icon: <BookOpen size={20} />,  color: "bg-[#eaf6f0] text-[#146c45]" },
    { label: "Jobs",          value: stats.jobs,         icon: <Briefcase size={20} />, color: "bg-blue-50 text-blue-600" },
    { label: "Applications",  value: stats.applications, icon: <TrendingUp size={20} />,color: "bg-violet-50 text-violet-600" },
  ] : [];

  return (
    <main id="main" className="min-h-dvh bg-[#f7fbf9]">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-[#e4eee9] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-3 px-5">
          <Link to="/admin/dashboard" className="flex min-w-0 shrink-0 items-center gap-2.5">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#1a8f5a] to-[#0b5c3a] text-white shadow-[0_8px_20px_-8px_rgba(11,92,58,0.7)]">
              <Shield size={15} className="text-white" />
            </span>
            <span className="font-[family-name:var(--font-display)] text-[20px] font-semibold tracking-tight text-[#12241c]">
              Career<span className="text-[#178a5a]">OS</span>
              <span className="ml-2 hidden rounded-full bg-[#eaf6f0] px-2 py-0.5 text-[11px] font-semibold tracking-[0.08em] text-[#146c45] sm:inline">Admin</span>
            </span>
          </Link>
          <div className="relative" ref={accountRef}>
            <button
              type="button"
              aria-label="Account menu"
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              onClick={() => setAccountOpen((open) => !open)}
              className={`grid h-11 w-11 place-items-center rounded-full transition duration-200 ${
                accountOpen ? "bg-[#146c45] text-white" : "bg-[#eaf6f0] text-[#146c45] hover:bg-[#d4ede2]"
              }`}
            >
              <UserRound size={16} />
            </button>
            {accountOpen && (
              <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-[#e4eee9] bg-white p-1.5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.28)]">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setAccountOpen(false); void logout(); }}
                  className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium text-[#3d4d46] transition duration-200 hover:bg-red-50 hover:text-red-700"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] space-y-6 px-5 py-8">

        {/* Hero */}
        <div>
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">PLATFORM OVERSIGHT</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">
            Monitor and moderate activity.
          </h1>
          <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Review users, courses, and jobs from one place.</p>
        </div>

        {/* Message */}
        {message && (
          <div role="alert" className={`flex items-center gap-2 rounded-[22px] border px-4 py-3 text-[13px] font-medium ${
            message.type === "success"
              ? "border-[#cfe6db] bg-[#eaf6f0] text-[#146c45]"
              : "border-red-200 bg-red-50 text-red-700"
          }`}>
            {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {message.text}
          </div>
        )}

        {/* Stats grid */}
        {statCards.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map(({ label, value, icon, color }) => (
              <div key={label} className="rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] transition duration-200 hover:-translate-y-1 hover:border-[#cfe6db] hover:shadow-[0_18px_40px_-24px_rgba(18,50,36,0.32)]">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>{icon}</div>
                <p className="mt-4 font-[family-name:var(--font-display)] text-[30px] font-semibold leading-none text-[#12241c]">{value}</p>
                <p className="mt-1.5 text-[13px] text-[#5b6b64]">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Users + Content moderation */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Users */}
          <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef3f0]">
                <UserRound size={17} className="text-[#5b6b64]" />
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Users ({users.length})</h2>
            </div>
            <div className="space-y-2">
              {users.length === 0 && <p className="text-[13px] text-[#7a8b84]">No users found.</p>}
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#eef3f0] p-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#12241c]">{user.full_name || "Unnamed user"}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${roleColors[user.role] ?? "bg-[#eef3f0] text-[#5b6b64]"}`}>
                        {user.role}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${userStatusColors[user.status] ?? "bg-[#eef3f0] text-[#5b6b64]"}`}>
                        {user.status}
                      </span>
                    </div>
                  </div>
                  <select
                    value={user.status}
                    onChange={(e) => void updateUser(user.id, e.target.value)}
                    className="shrink-0 rounded-lg border border-[#e4eee9] bg-[#f7fbf9] px-2 py-1.5 text-[11px] font-medium text-[#3d4d46] outline-none focus:border-[#146c45]"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Courses + Jobs */}
          <div className="space-y-6 lg:col-span-2">

            {/* Courses */}
            <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                  <BookOpen size={17} className="text-violet-700" />
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Courses ({courses.length})</h2>
              </div>
              <div className="space-y-2">
                {courses.length === 0 && <p className="text-[13px] text-[#7a8b84]">No courses to moderate.</p>}
                {courses.map((course) => (
                  <div key={course.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#eef3f0] p-3">
                    <p className="min-w-0 truncate text-[13px] font-semibold text-[#12241c]">{course.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        course.status === "published" ? "bg-[#d4ede2] text-[#146c45]" :
                        course.status === "archived"  ? "bg-[#eef3f0] text-[#5b6b64]" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {course.status}
                      </span>
                      <select
                        value={course.status}
                        onChange={(e) => void updateItem("courses", course.id, e.target.value)}
                        className="rounded-lg border border-[#e4eee9] bg-[#f7fbf9] px-2 py-1.5 text-[11px] font-medium text-[#3d4d46] outline-none focus:border-violet-400"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Jobs */}
            <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
                  <Briefcase size={17} className="text-blue-700" />
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Jobs ({jobs.length})</h2>
              </div>
              <div className="space-y-2">
                {jobs.length === 0 && <p className="text-[13px] text-[#7a8b84]">No jobs to moderate.</p>}
                {jobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#eef3f0] p-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[#12241c]">{job.title}</p>
                      {job.company_name && <p className="text-[12px] text-[#5b6b64]">{job.company_name}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        job.status === "open"   ? "bg-[#d4ede2] text-[#146c45]" :
                        job.status === "closed" ? "bg-[#eef3f0] text-[#5b6b64]" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {job.status}
                      </span>
                      <select
                        value={job.status}
                        onChange={(e) => void updateItem("jobs", job.id, e.target.value)}
                        className="rounded-lg border border-[#e4eee9] bg-[#f7fbf9] px-2 py-1.5 text-[11px] font-medium text-[#3d4d46] outline-none focus:border-blue-400"
                      >
                        <option value="draft">Draft</option>
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="flex items-center gap-2 rounded-[22px] border border-[#cfe6db] bg-[#eaf6f0] px-4 py-3 text-[13px] text-[#146c45]">
          <CheckCircle2 size={16} />
          Moderation changes are applied immediately across the platform.
        </div>

      </div>
    </main>
  );
}

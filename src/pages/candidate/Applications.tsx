import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MapPin,
  Sparkles,
  Briefcase,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Video,
  Phone,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, supabase } from "../../services/api";
import { formatSalaryRange } from "../../utils/salary";

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  Applied:        { color: "bg-blue-100 text-blue-700",     icon: <Clock size={13} /> },
  "Under review": { color: "bg-amber-100 text-amber-700",   icon: <AlertCircle size={13} /> },
  Interview:      { color: "bg-violet-100 text-violet-700", icon: <Sparkles size={13} /> },
  Offer:          { color: "bg-[#d4ede2] text-[#146c45]",   icon: <CheckCircle2 size={13} /> },
  Withdrawn:      { color: "bg-[#eef3f0] text-[#5b6b64]",  icon: <XCircle size={13} /> },
  shortlisted:    { color: "bg-violet-100 text-violet-700", icon: <Sparkles size={13} /> },
  hired:          { color: "bg-[#d4ede2] text-[#146c45]",   icon: <CheckCircle2 size={13} /> },
  rejected:       { color: "bg-red-100 text-red-600",       icon: <XCircle size={13} /> },
  applied:        { color: "bg-blue-100 text-blue-700",     icon: <Clock size={13} /> },
  interview:      { color: "bg-violet-100 text-violet-700", icon: <Sparkles size={13} /> },
};

type Application = {
  id: number | string;
  role: string;
  company: string;
  location: string;
  status: string;
  updated: string;
  jobId?: string;
  description: string;
  employmentType: string;
  skills: string[];
  salaryRange: string;
};

type ApiApplication = {
  id: string;
  status: string;
  created_at: string;
  updated_at?: string;
  job?: {
    id?: string;
    title?: string;
    company_name?: string;
    location?: string;
    description?: string;
    employment_type?: string;
    skills?: string[];
    salary_range?: string;
  } | null;
};

type Job = {
  id: string;
  title: string;
  company_name: string;
  location: string;
  description?: string;
  employment_type?: string;
  skills?: string[];
  salary_range?: string;
};

type Interview = {
  id: string;
  application_id?: string;
  job_id?: string;
  scheduled_at?: string;
  date?: string;
  time?: string;
  mode?: string;
  notes?: string;
  status?: string;
  jobTitle?: string;
};

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

function interviewFor(app: Application, interviews: Interview[]) {
  const byApplication = interviews.find((row) => String(row.application_id ?? "") === String(app.id) && row.status !== "cancelled");
  if (byApplication) return byApplication;
  if (!app.jobId) return undefined;
  return interviews.find((row) => String(row.job_id ?? "") === String(app.jobId) && row.status !== "cancelled");
}

function formatInterviewWhen(interview: Interview) {
  if (interview.scheduled_at) {
    const stamp = new Date(interview.scheduled_at);
    if (!Number.isNaN(stamp.getTime())) {
      return stamp.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
    }
  }
  const date = interview.date || "";
  const time = interview.time || "";
  return [date, time].filter(Boolean).join(" · ") || "To be confirmed";
}

function formatInterviewMode(mode?: string) {
  const value = String(mode ?? "").toLowerCase();
  if (value === "phone") return "Phone";
  if (value === "onsite") return "Onsite";
  return "Video";
}

export default function Applications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [recommendations, setRecommendations] = useState<{ job: Job; match: number }[]>([]);
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { setLoading(false); return; }
      void Promise.all([
        apiRequest<{ applications: ApiApplication[] }>(`/api/candidate/${data.user.id}/applications`),
        apiRequest<{ jobs: (Job & { match_score?: number })[] }>("/api/jobs/recommended").catch(() => ({ jobs: [] })),
        apiRequest<{ interviews: Interview[] }>("/api/hiring/mine/interviews").catch(() => ({ interviews: [] })),
      ]).then(([appRes, recRes, interviewRes]) => {
        setApplications(appRes.applications.map((r) => ({
          id: r.id,
          role: r.job?.title ?? "Job application",
          company: (r.job?.company_name && r.job.company_name !== "Company") ? r.job.company_name : "",
          location: r.job?.location ?? "Not specified",
          status: r.status,
          updated: r.updated_at ?? r.created_at,
          jobId: r.job?.id,
          description: r.job?.description ?? "No description provided.",
          employmentType: r.job?.employment_type ?? "Not specified",
          skills: r.job?.skills ?? [],
          salaryRange: r.job?.salary_range ?? "",
        })));
        setRecommendations((recRes.jobs ?? []).slice(0, 3).map((job) => ({ job, match: job.match_score ?? 0 })));
        setInterviews(interviewRes.interviews ?? []);
      }).catch(() => undefined).finally(() => setLoading(false));
    });
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    applications.forEach((a) => { counts[a.status] = (counts[a.status] ?? 0) + 1; });
    return counts;
  }, [applications]);

  return (
    <main className="min-h-screen bg-[#f7fbf9]">
      <div className="mx-auto max-w-[1180px] px-5 py-8 space-y-8">

        {/* Header */}
        <div>
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">MY APPLICATIONS</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">My applications</h1>
          <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Track every application and stay on top of your pipeline.</p>
        </div>

        {/* Status summary pills */}
        {!loading && applications.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-[#d5e3dc] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#5b6b64] shadow-sm">
              {applications.length} total
            </span>
            {Object.entries(statusCounts).map(([status, count]) => {
              const cfg = statusConfig[status] ?? { color: "bg-[#eef3f0] text-[#5b6b64]", icon: null };
              return (
                <span key={status} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ${cfg.color}`}>
                  {cfg.icon}
                  {count} {status}
                </span>
              );
            })}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#eef3f0]" />
                  <div className="space-y-2">
                    <div className="h-4 w-40 rounded bg-[#eef3f0]" />
                    <div className="h-3 w-24 rounded bg-[#eef3f0]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && applications.length === 0 && (
          <div className="rounded-[22px] border border-white bg-white p-12 text-center shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <Briefcase size={36} className="mx-auto text-[#c9d6cf]" />
            <p className="mt-3 font-semibold text-[#12241c]">No applications yet</p>
            <p className="mt-1 text-[13px] text-[#7a8b84]">Start applying to jobs to track them here.</p>
            <Link
              to="/candidate/jobs"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#146c45] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] hover:bg-[#0f5a39] transition"
            >
              Browse jobs
            </Link>
          </div>
        )}

        {/* Application cards */}
        {!loading && applications.length > 0 && (
          <div className="space-y-4">
            {applications.map((app) => {
              const isExpanded = expandedId === app.id;
              const cfg = statusConfig[app.status] ?? { color: "bg-[#eef3f0] text-[#5b6b64]", icon: null };
              const interview = interviewFor(app, interviews);
              const showInterview = Boolean(interview) && String(app.status).toLowerCase() === "interview";
              const ModeIcon = interview?.mode === "phone" ? Phone : interview?.mode === "onsite" ? Building2 : Video;

              return (
                <article key={app.id} className="overflow-hidden rounded-[22px] border border-white bg-white shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] transition hover:border-[#cfe6db] hover:shadow-[0_18px_40px_-28px_rgba(18,50,36,0.28)]">
                  {/* Card header */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedId((curr) => curr === app.id ? null : app.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedId((curr) => curr === app.id ? null : app.id); } }}
                    className="cursor-pointer p-5 outline-none"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef3f0]">
                          <Building2 size={18} className="text-[#5b6b64]" />
                        </div>
                        <div>
                          <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">
                            {app.jobId ? (
                              <Link
                                to={`/candidate/jobs/${app.jobId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="cursor-pointer underline-offset-2 transition duration-200 hover:text-[#146c45] hover:underline"
                              >
                                {app.role}
                              </Link>
                            ) : app.role}
                          </h2>
                          <p className="mt-0.5 text-[13px] text-[#5b6b64]">{app.company}</p>
                          <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#7a8b84]">
                            <MapPin size={12} />
                            {app.location}
                            <span className="mx-1">·</span>
                            <Clock size={12} />
                            {formatDate(app.updated)}
                          </div>
                          {showInterview && interview && (
                            <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#146c45]">
                              <ModeIcon size={13} />
                              {formatInterviewWhen(interview)} · {formatInterviewMode(interview.mode)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Status badge */}
                        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ${cfg.color}`}>
                          {cfg.icon}
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>


                        <span className="rounded-lg bg-[#eef3f0] p-1.5 text-[#5b6b64]">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-[#eef3f0] bg-[#f7fbf9]/60 px-5 pb-6 pt-5">
                      {showInterview && interview && (
                        <div className="mb-5 rounded-2xl border border-[#d4ede2] bg-white p-4">
                          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#157a4f]">INTERVIEW DETAILS</p>
                          <p className="mt-1 font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#12241c]">
                            {formatInterviewWhen(interview)}
                          </p>
                          <div className="mt-3 grid gap-2 text-[13px] text-[#3d4d46] sm:grid-cols-2">
                            <p className="flex items-center gap-2"><ModeIcon size={14} className="text-[#146c45]" />{formatInterviewMode(interview.mode)}</p>
                            <p className="flex items-center gap-2"><Clock size={14} className="text-[#146c45]" />{interview.status === "completed" ? "Completed" : interview.status === "cancelled" ? "Cancelled" : "Scheduled"}</p>
                          </div>
                          {interview.notes && (
                            <p className="mt-3 whitespace-pre-wrap text-[13px] leading-6 text-[#5b6b64]">{interview.notes}</p>
                          )}
                        </div>
                      )}
                      <div className="grid gap-6 lg:grid-cols-[1fr_200px]">
                        <div>
                          <h3 className="text-[13px] font-semibold text-[#12241c]">About this role</h3>
                          <p className="mt-2 whitespace-pre-line text-[13px] leading-6 text-[#5b6b64]">{app.description}</p>
                          {app.skills.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {app.skills.map((skill) => (
                                <span key={skill} className="rounded-full bg-[#d4ede2] px-2.5 py-1 text-[12px] font-semibold text-[#146c45]">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="space-y-3 text-[13px]">
                          <div className="flex items-center gap-2 text-[#5b6b64]">
                            <Briefcase size={14} className="text-[#7a8b84]" />
                            {app.employmentType}
                          </div>
                          {app.salaryRange && (
                            <div className="flex items-center gap-2 text-[#5b6b64]">
                              <DollarSign size={14} className="text-[#7a8b84]" />
                              {formatSalaryRange(app.salaryRange)}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[#5b6b64]">
                            <MapPin size={14} className="text-[#7a8b84]" />
                            {app.location}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <section className="rounded-[22px] bg-gradient-to-br from-[#0b2a1c] via-[#0f3d28] to-[#0b5c3a] p-6 text-white shadow-[0_18px_40px_-28px_rgba(18,50,36,0.45)]">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[#2aa36a]" />
              <h2 className="font-[family-name:var(--font-display)] text-[16px] font-semibold">Recommended for you</h2>
            </div>
            <p className="mt-1 text-[13px] text-white/70">
              Roles matched to your profile and the skills from jobs you've applied to.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map(({ job, match }) => (
                <Link
                  key={job.id}
                  to={`/candidate/jobs/${job.id}`}
                  className="group rounded-xl bg-white/10 p-4 transition hover:bg-white/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-[13px] leading-snug">{job.title}</p>
                    <span className="shrink-0 rounded-full bg-[#2aa36a]/20 px-2 py-0.5 text-[11px] font-bold text-[#2aa36a]">
                      {match}%
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] text-white/60">
                    {job.company_name && job.company_name !== "Company" ? `${job.company_name} · ` : ""}{job.location}
                  </p>
                  <p className="mt-2 text-[12px] text-white/40">{job.skills?.slice(0, 3).join(" · ") || "Skills not listed"}</p>
                  <p className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-[#2aa36a] group-hover:text-[#4dc98a]">
                    View role <ExternalLink size={12} />
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

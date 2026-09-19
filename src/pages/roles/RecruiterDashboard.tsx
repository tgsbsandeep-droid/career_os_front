import {
  BriefcaseBusiness,
  Circle,
  Save,
  Search,
  Sparkles,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  Plus,
  ExternalLink,
  Trash2,
  BarChart3,
  TrendingUp,
  Target,
  Loader2,
  GraduationCap,
  FileText,
  Building2,
  Video,
  Phone,
  X,
  Mail,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest, supabase } from "../../services/api";
import RoleMenu from "../../components/RoleMenu";
import RecruiterProfileForm, {
  emptyRecruiterProfile,
  recruiterProfileChecklist,
  recruiterProfileFromApi,
  type RecruiterProfile,
} from "../../components/RecruiterProfileForm";
import { formatSalaryRange } from "../../utils/salary";

type View =
  | "dashboard"
  | "profile"
  | "jobs"
  | "search"
  | "resumes"
  | "matching"
  | "interviews"
  | "offers"
  | "pipeline"
  | "analytics"
  | "campus"
  | "bulk";

type Job = {
  id: string;
  title: string;
  description: string;
  company_name: string;
  location: string;
  employment_type: string;
  experience_level: string;
  skills: string[];
  salary_range: string;
  status: "open" | "closed" | "draft";
};
type CandidateProfile = {
  full_name?: string;
  education?: string;
  skills?: string[];
  bio?: string;
  experience?: string[] | string;
  location?: string;
  contact_email?: string;
  resume_url?: string | null;
  avatar_url?: string | null;
};
type Candidate = CandidateProfile | null;
type Applicant = {
  id: string;
  candidate_id: string;
  job_id?: string;
  status: string;
  resume_url: string | null;
  cover_letter?: string | null;
  notes?: string | null;
  created_at?: string;
  candidate: Candidate;
};
type JobForm = Omit<Job, "id"> & { id?: string };
type Analytics = {
  total_jobs: number;
  open_jobs: number;
  total_applicants: number;
  hired: number;
  pipeline: Record<string, number>;
  per_job: { id: string; title: string; status: string; applicants: number }[];
};
type Interview = {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  date: string;
  time: string;
  mode: "video" | "phone" | "onsite";
  notes: string;
  status: "scheduled" | "completed" | "cancelled";
};
type Offer = {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  salary: string;
  joiningDate: string;
  status: "draft" | "sent" | "accepted" | "declined";
};
type CampusDrive = {
  id: string;
  college: string;
  city: string;
  date: string;
  roles: string;
  slots: number;
  status: "upcoming" | "completed" | "cancelled";
};
type MatchRow = { id: string; score: number; summary: string; strengths: string[]; gaps: string[] };
type SkillMatch = {
  id: string;
  full_name: string;
  location: string;
  education: string;
  skills: string[];
  match_score: number;
  strengths: string[];
  gaps: string[];
  already_applied: boolean;
};

const emptyJob: JobForm = {
  title: "",
  description: "",
  company_name: "",
  location: "Remote",
  employment_type: "Full-time",
  experience_level: "mid",
  skills: [],
  salary_range: "",
  status: "draft",
};
function normalizeSkillName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function skillKey(value: string) {
  return normalizeSkillName(value).toLowerCase();
}

function uniqueSkills(values: string[]) {
  const seen = new Set<string>();
  const skills: string[] = [];
  for (const raw of values) {
    const skill = normalizeSkillName(raw);
    if (!skill) continue;
    const key = skillKey(skill);
    if (seen.has(key)) continue;
    seen.add(key);
    skills.push(skill);
  }
  return skills;
}

const ROLE_SKILL_GROUPS: Array<{ match: RegExp; skills: string[] }> = [
  { match: /graphic|visual design|brand design|illustrat/i, skills: ["Figma", "Adobe Photoshop", "Adobe Illustrator", "Branding", "Typography", "Layout"] },
  { match: /product design|ui\/ux|ux design|ui design/i, skills: ["Figma", "UI Design", "User Research", "Prototyping", "Wireframing", "Design Systems"] },
  { match: /\bdesign/i, skills: ["Figma", "UI Design", "Adobe Photoshop", "Branding", "Prototyping"] },
  { match: /full.?stack|fullstack/i, skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "REST APIs", "Git"] },
  { match: /front.?end|frontend|javascript|react developer/i, skills: ["JavaScript", "TypeScript", "React", "HTML", "CSS", "Next.js"] },
  { match: /back.?end|backend|node\.js|java engineer|python engineer/i, skills: ["Node.js", "PostgreSQL", "REST APIs", "TypeScript", "System Design"] },
  { match: /data analyst|analytics|business analyst/i, skills: ["SQL", "Excel", "Tableau", "Python", "Power BI", "Statistics"] },
  { match: /data scientist|machine learning|\bml\b/i, skills: ["Python", "SQL", "Machine Learning", "Pandas", "Statistics"] },
  { match: /devops|sre|cloud|platform engineer/i, skills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux", "Terraform"] },
  { match: /product manager|product owner/i, skills: ["Product Strategy", "Roadmapping", "User Research", "SQL", "Agile", "Communication"] },
  { match: /market/i, skills: ["Digital Marketing", "SEO", "Content Writing", "Campaign Management", "Analytics"] },
  { match: /sales|account executive|business development/i, skills: ["Sales", "CRM", "Negotiation", "Communication", "Pipeline Management"] },
  { match: /\bhr\b|recruiter|talent/i, skills: ["Recruiting", "Sourcing", "Interviewing", "Communication", "ATS"] },
  { match: /android|ios|mobile/i, skills: ["Kotlin", "Swift", "React Native", "Mobile UI", "REST APIs"] },
  { match: /\bqa\b|tester|sdet|quality/i, skills: ["Manual Testing", "Automation Testing", "Selenium", "API Testing", "Bug Tracking"] },
  { match: /content|copywriter|writer/i, skills: ["Content Writing", "SEO", "Editing", "Research", "Communication"] },
  { match: /finance|account/i, skills: ["Accounting", "Excel", "Financial Analysis", "GST", "Tally"] },
  { match: /intern/i, skills: ["Communication", "Microsoft Office", "Research", "Collaboration"] },
];

function suggestSkillsForTitle(title: string) {
  const text = title.trim();
  if (!text) return [];
  const matched: string[] = [];
  for (const group of ROLE_SKILL_GROUPS) {
    if (group.match.test(text)) matched.push(...group.skills);
  }
  return uniqueSkills(matched).slice(0, 12);
}
const pipelineStages = ["applied", "shortlisted", "interview", "hired", "rejected"];
const analyticsPipelineStages = [
  { key: "applied", label: "Applied", statuses: ["applied"] },
  { key: "shortlisted", label: "Shortlisted", statuses: ["shortlisted"] },
  { key: "interview", label: "Interviewed", statuses: ["interview"] },
  { key: "hired", label: "Hired", statuses: ["hired"] },
] as const;
const experienceLevels = [
  { value: "entry", label: "Entry level" },
  { value: "mid", label: "Mid level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "executive", label: "Executive" },
];
const employmentTypes = ["Full-time", "Part-time", "Contract", "Internship", "Freelance"];

const stageConfig: Record<string, { color: string; bar: string; icon: ReactNode }> = {
  applied:     { color: "bg-blue-100 text-blue-700",     bar: "bg-blue-400",   icon: <Clock size={12} /> },
  shortlisted: { color: "bg-violet-100 text-violet-700", bar: "bg-violet-400", icon: <Sparkles size={12} /> },
  interview:   { color: "bg-amber-100 text-amber-700",   bar: "bg-amber-400",  icon: <AlertCircle size={12} /> },
  hired:       { color: "bg-[#d4ede2] text-[#146c45]",   bar: "bg-[#146c45]",  icon: <CheckCircle2 size={12} /> },
  rejected:    { color: "bg-red-100 text-red-600",       bar: "bg-red-400",    icon: <XCircle size={12} /> },
};

const inputClass = "w-full rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[14px] text-[#12241c] placeholder-[#7a8b84] outline-none transition focus:border-[#146c45] focus:bg-white focus:ring-2 focus:ring-[#146c45]/10";

function normalizeJob(item: Job): Job {
  const raw = item as Job & { job_type?: string; status?: string };
  const typeMap: Record<string, string> = { full_time: "Full-time", part_time: "Part-time", contract: "Contract", internship: "Internship", freelance: "Freelance" };
  return {
    ...item,
    skills: item.skills ?? [],
    company_name: item.company_name ?? "",
    salary_range: item.salary_range ?? "",
    experience_level: item.experience_level ?? "mid",
    employment_type: item.employment_type || typeMap[raw.job_type ?? ""] || "Full-time",
    status: raw.status === "closed" ? "closed" : raw.status === "draft" ? "draft" : "open",
  };
}

function candidateName(applicant: Applicant) {
  return applicant.candidate?.full_name || `Candidate ${applicant.candidate_id.slice(0, 8)}`;
}

function applicantsInAnalyticsStage<T extends Applicant>(applicants: T[], statuses: readonly string[]) {
  return applicants.filter((item) => statuses.includes(item.status));
}

function asExperienceList(value: CandidateProfile["experience"]) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function parseApplicationNotes(raw: string) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let expectedCtc = "";
  let noticePeriod = "";
  const rest: string[] = [];
  for (const line of lines) {
    const ctc = line.match(/^Expected CTC:\s*(.+)$/i);
    if (ctc) { expectedCtc = ctc[1].trim(); continue; }
    const notice = line.match(/^Notice period:\s*(.+)$/i);
    if (notice) { noticePeriod = notice[1].trim(); continue; }
    rest.push(line);
  }
  return { expectedCtc, noticePeriod, extra: rest.join("\n") };
}

function applicantCoverLetter(applicant: Applicant) {
  return String(applicant.cover_letter ?? "").trim();
}

function applicantNotes(applicant: Applicant) {
  const cover = applicantCoverLetter(applicant);
  const raw = String(applicant.notes ?? "").trim();
  if (!raw) return "";
  return raw === cover ? "" : raw;
}

function formatAppliedAt(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function normalizeInterview(row: Record<string, unknown>): Interview {
  const mode = row.mode === "phone" || row.mode === "onsite" ? row.mode : "video";
  const status = row.status === "completed" || row.status === "cancelled" ? row.status : "scheduled";
  return {
    id: String(row.id ?? ""),
    applicationId: String(row.application_id ?? row.applicationId ?? ""),
    candidateId: String(row.candidate_id ?? row.candidateId ?? ""),
    candidateName: String(row.candidateName ?? "Candidate"),
    jobId: String(row.job_id ?? row.jobId ?? ""),
    jobTitle: String(row.jobTitle ?? "Role"),
    date: String(row.date ?? ""),
    time: String(row.time ?? ""),
    mode,
    notes: String(row.notes ?? ""),
    status,
  };
}

function normalizeOffer(row: Record<string, unknown>): Offer {
  const status = row.status === "sent" || row.status === "accepted" || row.status === "declined" ? row.status : "draft";
  return {
    id: String(row.id ?? ""),
    applicationId: String(row.application_id ?? row.applicationId ?? ""),
    candidateId: String(row.candidate_id ?? row.candidateId ?? ""),
    candidateName: String(row.candidateName ?? "Candidate"),
    jobId: String(row.job_id ?? row.jobId ?? ""),
    jobTitle: String(row.jobTitle ?? "Role"),
    salary: String(row.salary ?? ""),
    joiningDate: String(row.joiningDate ?? row.joining_date ?? ""),
    status,
  };
}

function parseMatches(text: string): MatchRow[] {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as { matches?: MatchRow[] };
  return Array.isArray(parsed.matches) ? parsed.matches : [];
}

export default function RecruiterDashboard({ view = "dashboard" }: { view?: View }) {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<RecruiterProfile>(emptyRecruiterProfile);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [job, setJob] = useState<JobForm>(emptyJob);
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [savingJob, setSavingJob] = useState<"draft" | "open" | null>(null);
  const [applicantsByJob, setApplicantsByJob] = useState<Record<string, Applicant[]>>({});
  const [matchesByJob, setMatchesByJob] = useState<Record<string, SkillMatch[]>>({});
  const [loadingMatchesId, setLoadingMatchesId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [jdLoading, setJdLoading] = useState(false);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [drives, setDrives] = useState<CampusDrive[]>([
    { id: "demo-drive", college: "NIT Trichy", city: "Tiruchirappalli", date: "2026-10-18", roles: "SDE intern, Analyst", slots: 40, status: "upcoming" },
  ]);

  async function refreshAnalytics(id: string) {
    const res = await apiRequest<{ analytics: Analytics }>(`/api/recruiters/${id}/analytics`);
    setAnalytics(res.analytics);
  }

  async function refreshApplicants(jobList: Job[]) {
    const failures: string[] = [];
    const entries = await Promise.all(
      jobList.map(async (item) => {
        try {
          const res = await apiRequest<{ applicants: Applicant[] }>(`/api/jobs/${item.id}/applicants`);
          return [item.id, res.applicants ?? []] as const;
        } catch {
          failures.push(item.title || item.id);
          return [item.id, [] as Applicant[]] as const;
        }
      })
    );
    setApplicantsByJob(Object.fromEntries(entries));
    if (failures.length) {
      setMessage({
        text: `Could not load applicants for: ${failures.slice(0, 3).join(", ")}${failures.length > 3 ? "…" : ""}`,
        type: "error",
      });
    }
  }

  async function loadMatches(jobId: string) {
    if (!jobId) return;
    setLoadingMatchesId(jobId);
    try {
      const res = await apiRequest<{ matches: SkillMatch[] }>(`/api/jobs/${jobId}/matches`);
      setMatchesByJob((curr) => ({ ...curr, [jobId]: res.matches ?? [] }));
    } catch {
      setMatchesByJob((curr) => ({ ...curr, [jobId]: curr[jobId] ?? [] }));
    } finally {
      setLoadingMatchesId((curr) => (curr === jobId ? null : curr));
    }
  }

  useEffect(() => {
    if (selectedJobId) void loadMatches(selectedJobId);
  }, [selectedJobId]);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) { navigate("/login", { replace: true }); return; }
      setUserId(user.id);
      void Promise.all([
        apiRequest<{ profile: Parameters<typeof recruiterProfileFromApi>[0] }>(`/api/recruiters/${user.id}/profile`),
        apiRequest<{ jobs: Job[] }>("/api/jobs/mine"),
        apiRequest<{ analytics: Analytics }>(`/api/recruiters/${user.id}/analytics`),
        apiRequest<{ interviews: Record<string, unknown>[] }>("/api/hiring/interviews").catch(() => ({ interviews: [] as Record<string, unknown>[] })),
        apiRequest<{ offers: Record<string, unknown>[] }>("/api/hiring/offers").catch(() => ({ offers: [] as Record<string, unknown>[] })),
      ]).then(async ([profileRes, jobsRes, analyticsRes, interviewsRes, offersRes]) => {
        if (profileRes.profile) setProfile(recruiterProfileFromApi(profileRes.profile));
        const loaded = (jobsRes.jobs ?? []).map(normalizeJob);
        setJobs(loaded);
        setAnalytics(analyticsRes.analytics);
        setInterviews((interviewsRes.interviews ?? []).map(normalizeInterview));
        setOffers((offersRes.offers ?? []).map(normalizeOffer));
        await refreshApplicants(loaded);
      }).catch((err: Error) => setMessage({ text: err.message, type: "error" }));
    });
  }, [navigate]);

  function openNewJobForm() {
    setJob({ ...emptyJob, company_name: profile.company_name });
    setJobFormOpen(true);
  }

  function openJobForm(item: Job) {
    setJob(item);
    setSelectedJobId(item.id);
    setJobFormOpen(true);
  }

  function closeJobForm() {
    setJobFormOpen(false);
    setJob(emptyJob);
  }

  async function saveJob(status: "draft" | "open") {
    if (!job.title.trim()) {
      setMessage({ text: "Add a job title first.", type: "error" });
      return;
    }
    if (status === "open" && !job.description.trim()) {
      setMessage({ text: "Add a description before publishing.", type: "error" });
      return;
    }
    setSavingJob(status);
    try {
      const editing = Boolean(job.id);
      const payload = { ...job, status, company_name: job.company_name || profile.company_name };
      const res = await apiRequest<{ job: Job }>(editing ? `/api/jobs/${job.id}` : "/api/jobs", { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) });
      const saved = normalizeJob(res.job);
      setJobs((curr) => editing ? curr.map((j) => j.id === saved.id ? saved : j) : [saved, ...curr]);
      setJob(saved);
      setSelectedJobId(saved.id);
      setJobFormOpen(false);
      void loadMatches(saved.id);
      setMessage({
        text: status === "draft"
          ? "Draft saved. Matching candidates will appear after you add skills and publish."
          : saved.skills.length
            ? "Job published. Suggested candidates with matching skills are below."
            : "Job published. Add required skills to get matching candidate suggestions.",
        type: "success",
      });
      void refreshAnalytics(userId);
      if (!editing) void refreshApplicants([saved, ...jobs]);
    } catch (err) { setMessage({ text: (err as Error).message, type: "error" }); }
    finally { setSavingJob(null); }
  }

  async function deleteJob(jobId: string) {
    if (!confirm("Delete this job? This cannot be undone.")) return;
    setDeletingId(jobId);
    try {
      await apiRequest(`/api/jobs/${jobId}`, { method: "DELETE" });
      setJobs((curr) => curr.filter((j) => j.id !== jobId));
      setApplicantsByJob((curr) => {
        const next = { ...curr };
        delete next[jobId];
        return next;
      });
      setMatchesByJob((curr) => {
        const next = { ...curr };
        delete next[jobId];
        return next;
      });
      if (selectedJobId === jobId) setSelectedJobId("");
      if (job.id === jobId) {
        setJob(emptyJob);
        setJobFormOpen(false);
      }
      setMessage({ text: "Job deleted.", type: "success" });
      void refreshAnalytics(userId);
    } catch (err) { setMessage({ text: (err as Error).message, type: "error" }); }
    finally { setDeletingId(null); }
  }

  async function updateStatus(applicationId: string, status: string, jobId?: string) {
    try {
      await apiRequest(`/api/applications/${applicationId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setApplicantsByJob((curr) => {
        const next = { ...curr };
        for (const key of Object.keys(next)) {
          if (jobId && key !== jobId) continue;
          next[key] = next[key].map((a) => a.id === applicationId ? { ...a, status } : a);
        }
        return next;
      });
      void refreshAnalytics(userId);
    } catch (err) { setMessage({ text: (err as Error).message, type: "error" }); }
  }

  async function inviteCandidate(jobId: string, candidateId: string, status: "shortlisted" | "interview") {
    const res = await apiRequest<{ application: Applicant }>(`/api/jobs/${jobId}/invite`, {
      method: "POST",
      body: JSON.stringify({
        candidate_id: candidateId,
        status,
        notes: status === "interview" ? "Recruiter requested interview" : "Recruiter requested screening",
      }),
    });
    const application = res.application;
    if (!application?.id) throw new Error("Invite did not return an application.");
    setApplicantsByJob((curr) => {
      const current = curr[jobId] ?? [];
      const nextRow = { ...application, job_id: application.job_id ?? jobId, status: application.status || status };
      const exists = current.some((row) => row.id === nextRow.id || row.candidate_id === candidateId);
      return {
        ...curr,
        [jobId]: exists
          ? current.map((row) => (row.id === nextRow.id || row.candidate_id === candidateId ? { ...row, ...nextRow } : row))
          : [nextRow, ...current],
      };
    });
    setMatchesByJob((curr) => ({
      ...curr,
      [jobId]: (curr[jobId] ?? []).map((row) => row.id === candidateId ? { ...row, already_applied: true } : row),
    }));
    void refreshAnalytics(userId);
    setMessage({
      text: status === "interview" ? "Interview requested. The candidate is now in your pipeline." : "Screening requested. The candidate is now shortlisted.",
      type: "success",
    });
    return application;
  }

  async function generateJobDescription() {
    if (!job.title.trim()) { setMessage({ text: "Add a job title first.", type: "error" }); return; }
    setJdLoading(true);
    try {
      const res = await apiRequest<{ result: string }>("/api/ai/job-description", {
        method: "POST",
        body: JSON.stringify({
          title: job.title,
          company_name: profile.company_name || job.company_name,
          location: job.location,
          employment_type: job.employment_type,
          experience_level: job.experience_level,
          skills: job.skills,
          salary_range: job.salary_range,
        }),
      });
      setJob((curr) => ({ ...curr, description: res.result ?? curr.description }));
      setMessage({ text: "AI job description drafted. Review and save.", type: "success" });
    } catch (err) { setMessage({ text: (err as Error).message, type: "error" }); }
    finally { setJdLoading(false); }
  }

  async function logout() { await supabase.auth.signOut(); navigate("/login", { replace: true }); }

  const allApplicants = useMemo(
    () => jobs.flatMap((j) => (applicantsByJob[j.id] ?? []).map((a) => ({ ...a, job_id: a.job_id ?? j.id, jobTitle: j.title }))),
    [jobs, applicantsByJob]
  );
  const openJobs = jobs.filter((j) => j.status === "open").length;

  return (
    <main id="main" className="min-h-dvh bg-[#f7fbf9]">
      <a href="#main" className="skip-link">Skip to content</a>
      <RoleMenu
        homeTo="/recruiter/dashboard"
        brand="Recruiter"
        logo={
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#1a8f5a] to-[#0b5c3a] text-white shadow-[0_8px_20px_-8px_rgba(11,92,58,0.7)]">
            <BriefcaseBusiness size={15} className="text-white" />
          </span>
        }
        onLogout={() => void logout()}
        profileTo="/recruiter/profile"
        profileLabel="Company profile"
        primary={[
          { to: "/recruiter/dashboard", icon: <BarChart3 size={16} />,         label: "ATS" },
          { to: "/recruiter/jobs",      icon: <BriefcaseBusiness size={16} />, label: "Jobs" },
          { to: "/recruiter/pipeline",  icon: <Target size={16} />,            label: "Pipeline" },
          { to: "/recruiter/analytics", icon: <TrendingUp size={16} />,        label: "Analytics" },
        ]}
        groups={[
          {
            id: "talent",
            label: "Talent",
            items: [
              { to: "/recruiter/search",     icon: <Users size={16} />,    label: "Candidate search" },
              { to: "/recruiter/resumes",    icon: <FileText size={16} />, label: "Resume search" },
              { to: "/recruiter/matching",   icon: <Sparkles size={16} />, label: "AI matching" },
              { to: "/recruiter/interviews", icon: <Video size={16} />,    label: "Interviews" },
              { to: "/recruiter/offers",     icon: <DollarSign size={16} />, label: "Offers" },
              { to: "/recruiter/bulk",       icon: <Target size={16} />,   label: "Bulk hiring" },
            ],
          },
        ]}
      />

      <div className="mx-auto max-w-[1180px] space-y-6 px-5 py-8">
        {message && (
          <div role="alert" className={`flex items-center gap-2 rounded-[22px] border px-4 py-3 text-[13px] font-medium ${
            message.type === "success" ? "border-[#cfe6db] bg-[#eaf6f0] text-[#146c45]" : "border-red-200 bg-red-50 text-red-700"
          }`}>
            {message.type === "success" && <CheckCircle2 size={16} />}
            {message.text}
          </div>
        )}

        {view === "dashboard" && (
          <Overview
            jobs={jobs}
            openJobs={openJobs}
            allApplicants={allApplicants}
            interviews={interviews}
            offers={offers}
            onOpenJob={(item) => { openJobForm(item); navigate("/recruiter/jobs"); }}
          />
        )}
        {view === "profile" && (
          <ProfileView
            userId={userId}
            profile={profile}
            onChange={setProfile}
            onMessage={(text, type = "success") => setMessage({ text, type })}
          />
        )}
        {view === "jobs" && (
          <JobsView
            jobs={jobs}
            job={job}
            setJob={setJob}
            jobFormOpen={jobFormOpen}
            onOpenNew={openNewJobForm}
            onOpenJob={openJobForm}
            onCloseForm={closeJobForm}
            applicantsByJob={applicantsByJob}
            matchesByJob={matchesByJob}
            loadingMatchesId={loadingMatchesId}
            selectedJobId={selectedJobId}
            setSelectedJobId={setSelectedJobId}
            deletingId={deletingId}
            jdLoading={jdLoading}
            savingJob={savingJob}
            saveJob={saveJob}
            deleteJob={deleteJob}
            generateJobDescription={generateJobDescription}
            updateStatus={updateStatus}
            inviteCandidate={inviteCandidate}
          />
        )}
        {(view === "search" || view === "resumes") && (
          <SearchView mode={view} jobs={jobs} applicants={allApplicants} onUpdateStatus={updateStatus} />
        )}
        {view === "matching" && <MatchingView jobs={jobs} applicantsByJob={applicantsByJob} onMessage={setMessage} />}
        {view === "interviews" && (
          <InterviewsView
            applicants={allApplicants}
            interviews={interviews}
            setInterviews={setInterviews}
            onMessage={setMessage}
            onScheduled={(applicationId) => void updateStatus(applicationId, "interview")}
          />
        )}
        {view === "offers" && (
          <OffersView
            applicants={allApplicants}
            offers={offers}
            setOffers={setOffers}
            onMessage={setMessage}
            onAccepted={(applicationId) => void updateStatus(applicationId, "hired")}
          />
        )}
        {view === "campus" && <CampusView drives={drives} setDrives={setDrives} />}
        {view === "bulk" && <BulkView applicants={allApplicants} jobs={jobs} onUpdateStatus={updateStatus} onMessage={setMessage} />}
        {view === "pipeline" && (
          <PipelineView jobs={jobs} applicants={allApplicants} onUpdateStatus={updateStatus} />
        )}
        {view === "analytics" && (
          <AnalyticsView
            analytics={analytics}
            jobs={jobs}
            allApplicants={allApplicants}
            interviews={interviews}
            offers={offers}
          />
        )}
      </div>
    </main>
  );
}

function Overview({ jobs, openJobs, allApplicants, interviews, offers, onOpenJob }: {
  jobs: Job[];
  openJobs: number;
  allApplicants: (Applicant & { jobTitle: string })[];
  interviews: Interview[];
  offers: Offer[];
  onOpenJob: (job: Job) => void;
}) {
  const needsReview = allApplicants.filter((item) => item.status === "applied");
  const shortlisted = allApplicants.filter((item) => item.status === "shortlisted");
  const upcomingInterviews = interviews.filter((item) => item.status === "scheduled");
  const pendingOffers = offers.filter((item) => item.status === "draft" || item.status === "sent");
  const openJobList = jobs.filter((item) => item.status === "open");
  const applicantsByJob = jobs.reduce<Record<string, number>>((acc, job) => {
    acc[job.id] = allApplicants.filter((item) => item.job_id === job.id).length;
    return acc;
  }, {});

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">ATS WORK QUEUE</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Today’s hiring work</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#5b6b64]">Review new applicants, run interviews, and send offers. Conversion rates and drop-off live in Analytics.</p>
        </div>
        <Link to="/recruiter/analytics" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#146c45] hover:text-[#0f5a39]">
          <TrendingUp size={15} /> View analytics
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric icon={<Clock size={20} />} label="Needs review" value={needsReview.length} color="amber" />
        <Metric icon={<Sparkles size={20} />} label="Shortlisted" value={shortlisted.length} color="violet" />
        <Metric icon={<Video size={20} />} label="Interviews booked" value={upcomingInterviews.length} color="blue" />
        <Metric icon={<DollarSign size={20} />} label="Offers in play" value={pendingOffers.length} color="emerald" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Needs review">
          {needsReview.length ? needsReview.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                const job = jobs.find((row) => row.id === item.job_id);
                if (job) onOpenJob(job);
              }}
              className="mb-3 flex w-full items-center justify-between rounded-xl bg-[#f7fbf9] p-3 text-left transition hover:bg-[#eaf6f0]"
            >
              <div>
                <p className="text-[13px] font-semibold text-[#12241c]">{candidateName(item)}</p>
                <p className="text-[12px] text-[#5b6b64]">{item.jobTitle}</p>
              </div>
              <span className="text-[12px] font-semibold text-[#146c45]">Review →</span>
            </button>
          )) : <Empty text="No new applications waiting. Shortlisted candidates and interviews appear below." />}
          {needsReview.length > 0 && (
            <Link to="/recruiter/search" className="mt-1 inline-flex text-[12px] font-semibold text-[#146c45]">Open candidate inbox →</Link>
          )}
        </Panel>
        <Panel title="Upcoming interviews">
          {upcomingInterviews.length ? upcomingInterviews.slice(0, 6).map((item) => (
            <div key={item.id} className="mb-3 flex items-center justify-between rounded-xl bg-[#f7fbf9] p-3">
              <div>
                <p className="text-[13px] font-semibold text-[#12241c]">{item.candidateName}</p>
                <p className="text-[12px] text-[#5b6b64]">{item.jobTitle} · {item.date} {item.time} · {item.mode}</p>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">{item.mode}</span>
            </div>
          )) : <Empty text="No interviews scheduled. Book them from a shortlisted applicant." />}
          <Link to="/recruiter/interviews" className="mt-1 inline-flex text-[12px] font-semibold text-[#146c45]">Manage interviews →</Link>
        </Panel>
      </div>
      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <Panel title="Offers to action">
          {pendingOffers.length ? pendingOffers.slice(0, 5).map((item) => (
            <div key={item.id} className="mb-3 flex items-center justify-between rounded-xl bg-[#f7fbf9] p-3">
              <div>
                <p className="text-[13px] font-semibold text-[#12241c]">{item.candidateName}</p>
                <p className="text-[12px] text-[#5b6b64]">{item.jobTitle}{item.salary ? ` · ${item.salary}` : ""}</p>
              </div>
              <span className="rounded-full bg-[#eaf6f0] px-2.5 py-1 text-[11px] font-semibold text-[#146c45]">{item.status}</span>
            </div>
          )) : <Empty text="No draft or sent offers yet." />}
          <Link to="/recruiter/offers" className="mt-1 inline-flex text-[12px] font-semibold text-[#146c45]">Manage offers →</Link>
        </Panel>
        <Panel title={`Open roles (${openJobs})`}>
          {openJobList.length ? openJobList.map((item) => (
            <button key={item.id} type="button" onClick={() => onOpenJob(item)} className="mb-3 flex w-full items-center justify-between rounded-xl border border-[#eef3f0] p-4 text-left hover:border-[#cfe6db] hover:bg-[#f7fbf9] transition">
              <div>
                <p className="text-[14px] font-semibold text-[#12241c]">{item.title}</p>
                <p className="mt-0.5 text-[12px] text-[#5b6b64]">{item.location} · {item.employment_type}{item.salary_range ? ` · ${formatSalaryRange(item.salary_range)}` : ""}</p>
              </div>
              <span className="text-[12px] font-semibold text-[#146c45]">{applicantsByJob[item.id] ?? 0} in pipeline →</span>
            </button>
          )) : <Empty text="Post a job from Jobs to start reviewing applicants here." />}
        </Panel>
      </div>
    </>
  );
}

function ProfileView({ userId, profile, onChange, onMessage }: {
  userId: string;
  profile: RecruiterProfile;
  onChange: (value: RecruiterProfile) => void;
  onMessage: (value: string, type?: "success" | "error") => void;
}) {
  const checklist = recruiterProfileChecklist(profile);
  const complete = checklist.filter((item) => item.done).length;
  return (
    <>
      <div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">COMPANY PROFILE</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Build trust with candidates</h1>
        <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Share a complete company profile so people can judge fit before they apply.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <RecruiterProfileForm userId={userId} profile={profile} onChange={onChange} onMessage={onMessage} />
        <div className="space-y-4 lg:sticky lg:top-24 self-start">
          <Panel title="Profile checklist">
            <p className="mb-4 text-[12px] text-[#5b6b64]">{complete} of {checklist.length} complete</p>
            {checklist.map((item) => <Checklist key={item.text} done={item.done} text={item.text} />)}
          </Panel>
        </div>
      </div>
    </>
  );
}

function jobStatusLabel(status: Job["status"]) {
  if (status === "draft") return "Draft";
  if (status === "closed") return "Closed";
  return "Open";
}

function JobsView({ jobs, job, setJob, jobFormOpen, onOpenNew, onOpenJob, onCloseForm, applicantsByJob, matchesByJob, loadingMatchesId, selectedJobId, setSelectedJobId, deletingId, jdLoading, savingJob, saveJob, deleteJob, generateJobDescription, updateStatus, inviteCandidate }: {
  jobs: Job[];
  job: JobForm;
  setJob: (value: JobForm) => void;
  jobFormOpen: boolean;
  onOpenNew: () => void;
  onOpenJob: (item: Job) => void;
  onCloseForm: () => void;
  applicantsByJob: Record<string, Applicant[]>;
  matchesByJob: Record<string, SkillMatch[]>;
  loadingMatchesId: string | null;
  selectedJobId: string;
  setSelectedJobId: (id: string) => void;
  deletingId: string | null;
  jdLoading: boolean;
  savingJob: "draft" | "open" | null;
  saveJob: (status: "draft" | "open") => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  generateJobDescription: () => Promise<void>;
  updateStatus: (applicationId: string, status: string, jobId?: string) => Promise<void>;
  inviteCandidate: (jobId: string, candidateId: string, status: "shortlisted" | "interview") => Promise<Applicant>;
}) {
  const [customSkill, setCustomSkill] = useState("");
  const [aiSkills, setAiSkills] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const applicants = applicantsByJob[selectedJobId] ?? [];
  const matches = matchesByJob[selectedJobId] ?? [];
  const selectedJob = jobs.find((j) => j.id === selectedJobId);
  const busy = Boolean(savingJob);
  const loadingMatches = loadingMatchesId === selectedJobId;
  const titleSkills = useMemo(() => suggestSkillsForTitle(job.title), [job.title]);
  const suggestionPool = useMemo(
    () => uniqueSkills([...titleSkills, ...aiSkills, ...job.skills]),
    [titleSkills, aiSkills, job.skills],
  );

  useEffect(() => {
    setAiSkills([]);
    setCustomSkill("");
  }, [job.id]);

  function setJobSkills(skills: string[]) {
    setJob({ ...job, skills: uniqueSkills(skills) });
  }

  function toggleSkill(skill: string) {
    const next = job.skills.some((item) => skillKey(item) === skillKey(skill))
      ? job.skills.filter((item) => skillKey(item) !== skillKey(skill))
      : [...job.skills, skill];
    setJobSkills(next);
  }

  function addCustomSkill() {
    const skill = normalizeSkillName(customSkill);
    if (!skill) return;
    setJobSkills([...job.skills, skill]);
    setCustomSkill("");
  }

  async function suggestSkillsFromRole() {
    if (!job.title.trim()) return;
    setSkillsLoading(true);
    try {
      const res = await apiRequest<{ skills?: string[] }>("/api/ai/job-skills", {
        method: "POST",
        body: JSON.stringify({
          title: job.title,
          description: job.description,
          experience_level: job.experience_level,
          employment_type: job.employment_type,
        }),
      });
      setAiSkills(uniqueSkills(res.skills ?? []));
    } catch {
      setAiSkills([]);
    } finally {
      setSkillsLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">JOBS</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Post and manage roles</h1>
          <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Open the form to draft or publish a role, then move applicants through the ATS.</p>
        </div>
        {!jobFormOpen && (
          <button type="button" onClick={onOpenNew} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#146c45] px-5 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] hover:bg-[#0f5a39] transition">
            <Plus size={16} /> Post a job
          </button>
        )}
      </div>
      {jobFormOpen && (
        <form onSubmit={(e) => { e.preventDefault(); void saveJob("open"); }} className="space-y-4 rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">{job.id ? "Edit job" : "Post a job"}</h2>
            <button type="button" onClick={onCloseForm} className="text-[13px] font-medium text-[#5b6b64] hover:text-[#12241c]">Cancel</button>
          </div>
          <input required value={job.title} onChange={(e) => setJob({ ...job, title: e.target.value })} placeholder="Job title" className={inputClass} />
          <div className="flex items-center justify-between gap-3">
            <label className="text-[13px] font-medium text-[#3d4d46]">Description</label>
            <button type="button" onClick={() => void generateJobDescription()} disabled={jdLoading || busy} className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf6f0] px-3 py-1.5 text-[12px] font-semibold text-[#146c45] hover:bg-[#d4ede2] disabled:opacity-50">
              {jdLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {jdLoading ? "Writing…" : "Generate with AI"}
            </button>
          </div>
          <textarea value={job.description} onChange={(e) => setJob({ ...job, description: e.target.value })} placeholder="Job description (required to publish)" className={`${inputClass} min-h-32 resize-y`} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a8b84]" />
              <input value={job.location} onChange={(e) => setJob({ ...job, location: e.target.value })} placeholder="Location" className={`${inputClass} pl-9`} />
            </div>
            <select value={job.employment_type} onChange={(e) => setJob({ ...job, employment_type: e.target.value })} className={inputClass}>
              {employmentTypes.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select value={job.experience_level} onChange={(e) => setJob({ ...job, experience_level: e.target.value })} className={inputClass}>
              {experienceLevels.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <div className="relative">
              <DollarSign size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a8b84]" />
              <input value={job.salary_range} onChange={(e) => setJob({ ...job, salary_range: e.target.value })} placeholder="Salary range (shown in each viewer’s currency)" className={`${inputClass} pl-9`} />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label className="text-[13px] font-medium text-[#3d4d46]">Skills required</label>
              <button
                type="button"
                onClick={() => void suggestSkillsFromRole()}
                disabled={skillsLoading || busy || !job.title.trim()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf6f0] px-3 py-1.5 text-[12px] font-semibold text-[#146c45] hover:bg-[#d4ede2] disabled:opacity-50"
              >
                {skillsLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {skillsLoading ? "Suggesting…" : "Suggest for this role"}
              </button>
            </div>
            {job.skills.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <span key={skill} className="inline-flex items-center gap-1.5 rounded-full border border-[#146c45] bg-[#146c45] px-3 py-1.5 text-[12px] font-medium text-white">
                    {skill}
                    <button type="button" title={`Remove ${skill}`} onClick={() => toggleSkill(skill)} className="rounded-full hover:text-[#d4ede2]">
                      <Trash2 size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="mb-2 text-[12px] text-[#5b6b64]">
              {job.title.trim()
                ? "Tap a suggested skill for this title, or type any extra skill."
                : "Add a job title to see role-specific suggestions, or type any skill."}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestionPool.filter((skill) => !job.skills.some((item) => skillKey(item) === skillKey(skill))).map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#e4eee9] bg-[#f7fbf9] px-3 py-1.5 text-[12px] font-medium text-[#5b6b64] hover:border-[#cfe6db] hover:bg-[#eaf6f0] hover:text-[#146c45]"
                >
                  <Plus size={12} />
                  {skill}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSkill(); } }}
                placeholder="Add another skill…"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={addCustomSkill}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-2.5 text-[13px] font-medium text-[#3d4d46] hover:border-[#cfe6db] hover:bg-[#eaf6f0]"
              >
                <Plus size={15} />
                Add
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" disabled={busy} onClick={() => void saveJob("draft")} className="flex w-full items-center justify-center gap-2 rounded-full border border-[#d5e3dc] bg-white px-4 py-3 text-[14px] font-semibold text-[#1d332a] hover:border-[#b7cec3] disabled:opacity-50 transition">
              {savingJob === "draft" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save as draft
            </button>
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#146c45] px-4 py-3 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] hover:bg-[#0f5a39] disabled:opacity-50 transition">
              {savingJob === "open" ? <Loader2 size={16} className="animate-spin" /> : <BriefcaseBusiness size={16} />}
              {job.id && job.status !== "draft" ? "Update and publish" : "Publish"}
            </button>
          </div>
        </form>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Posted jobs</h2>
          {jobs.length === 0 && <Empty text="No jobs yet. Use Post a job to create a draft or publish a role." />}
          <div className="space-y-2">
            {jobs.map((item) => (
              <div key={item.id} className={`group flex items-center justify-between rounded-xl border p-3.5 ${selectedJobId === item.id ? "border-[#146c45] bg-[#eaf6f0]" : "border-[#eef3f0]"}`}>
                <button type="button" className="flex-1 text-left" onClick={() => setSelectedJobId(item.id)}>
                  <p className="text-[13px] font-semibold text-[#12241c]">{item.title || "Untitled draft"}</p>
                  <p className="mt-1 text-[12px] text-[#5b6b64]">{jobStatusLabel(item.status)} · {item.location}{item.salary_range ? ` · ${formatSalaryRange(item.salary_range)}` : ""} · {applicantsByJob[item.id]?.length ?? 0} applicants</p>
                </button>
                <div className="ml-2 flex items-center">
                  <button type="button" onClick={() => onOpenJob(item)} className="rounded-lg px-2 py-1 text-[12px] font-semibold text-[#146c45] hover:bg-[#eaf6f0]">
                    Edit
                  </button>
                  <button type="button" onClick={() => void deleteJob(item.id)} disabled={deletingId === item.id} className="rounded-lg p-1.5 text-[#c9d6cf] hover:bg-red-50 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <Panel title={selectedJob ? `Suggested for ${selectedJob.title}` : "Suggested candidates"}>
            {!selectedJobId && <Empty text="Select a posted job to see candidates with matching skills." />}
            {selectedJobId && !(selectedJob?.skills.length) && <Empty text="Add required skills to this job to get matching candidate suggestions." />}
            {selectedJobId && Boolean(selectedJob?.skills.length) && loadingMatches && (
              <p className="flex items-center gap-2 text-[13px] text-[#5b6b64]"><Loader2 size={14} className="animate-spin" /> Finding candidates with matching skills…</p>
            )}
            {selectedJobId && Boolean(selectedJob?.skills.length) && !loadingMatches && matches.length === 0 && (
              <Empty text="No candidates with overlapping skills yet. Suggestions appear as people add those skills to their profile." />
            )}
            <div className="space-y-3">
              {matches.map((match) => (
                <SuggestedMatchCard
                  key={match.id}
                  match={match}
                  job={selectedJob}
                  applicant={applicants.find((row) => row.candidate_id === match.id)}
                  onInvite={inviteCandidate}
                />
              ))}
            </div>
          </Panel>
          <Panel title={selectedJob ? `Pipeline · ${selectedJob.title}` : "Hiring pipeline"}>
            {!selectedJobId && <Empty text="Select a posted job to see Applied → Hired for that role." />}
            {selectedJobId && applicants.length === 0 && <Empty text="No applicants yet. Open a suggested candidate above to request screening or an interview." />}
            {selectedJobId && applicants.length > 0 && (
              <AnalyticsPipelineBoard
                applicants={applicants}
                onStatus={(applicationId, status) => void updateStatus(applicationId, status, selectedJobId)}
              />
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function tomorrowDate() {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

function SuggestedMatchCard({ match, job, applicant, onInvite }: {
  match: SkillMatch;
  job?: Job;
  applicant?: Applicant;
  onInvite: (jobId: string, candidateId: string, status: "shortlisted" | "interview") => Promise<Applicant>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"shortlisted" | "interview" | null>(null);
  const [error, setError] = useState("");
  const [interview, setInterview] = useState({ date: tomorrowDate(), time: "10:00", mode: "video" as Interview["mode"] });
  const inPipeline = match.already_applied || Boolean(applicant);
  const pipelineStatus = applicant?.status ?? (inPipeline ? "applied" : "");
  const jobReady = job?.status === "open";
  const canScreen = Boolean(job?.id) && jobReady && pipelineStatus !== "shortlisted" && pipelineStatus !== "interview" && pipelineStatus !== "hired";
  const canInterview = Boolean(job?.id) && jobReady && pipelineStatus !== "interview" && pipelineStatus !== "hired" && pipelineStatus !== "rejected";

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  async function request(status: "shortlisted" | "interview") {
    if (!job?.id) return;
    if (status === "interview" && !interview.date) {
      setError("Choose an interview date.");
      return;
    }
    setBusy(status);
    setError("");
    try {
      const application = await onInvite(job.id, match.id, status);
      if (status === "interview") {
        try {
          await apiRequest("/api/hiring/interviews", {
            method: "POST",
            body: JSON.stringify({
              application_id: application.id,
              date: interview.date,
              time: interview.time,
              mode: interview.mode,
              notes: "Requested from suggested match",
            }),
          });
        } catch {
          /* pipeline invite already succeeded */
        }
      }
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <article className="rounded-xl border border-[#eef3f0] bg-[#f7fbf9] p-4">
        <button
          type="button"
          onClick={() => { setError(""); setOpen(true); }}
          className="w-full rounded-lg text-left transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#146c45]/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold text-[#12241c]">{match.full_name}</p>
              <p className="mt-0.5 text-[12px] text-[#5b6b64]">{match.education || match.location || "Skill match from the talent pool"}</p>
            </div>
            <div className="flex items-center gap-2">
              {inPipeline && <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">{pipelineStatus || "Applied"}</span>}
              <span className="rounded-full bg-[#eaf6f0] px-2.5 py-1 text-[12px] font-semibold text-[#146c45]">{match.match_score}%</span>
            </div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e4eee9]"><div className="h-full rounded-full bg-[#146c45]" style={{ width: `${match.match_score}%` }} /></div>
          {(match.strengths.length > 0 || match.gaps.length > 0) && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 text-[12px]">
              <div>
                <p className="font-semibold text-[#146c45]">Matching skills</p>
                <p className="mt-1 text-[#5b6b64]">{match.strengths.join(" · ") || "—"}</p>
              </div>
              <div>
                <p className="font-semibold text-amber-700">Missing</p>
                <p className="mt-1 text-[#5b6b64]">{match.gaps.join(" · ") || "—"}</p>
              </div>
            </div>
          )}
          <span className="mt-3 inline-flex text-[12px] font-semibold text-[#146c45]">View profile · request screening →</span>
        </button>
      </article>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button type="button" aria-label="Close suggested candidate" className="absolute inset-0 bg-[#12241c]/40" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-full max-w-[440px] flex-col border-l border-[#e4eee9] bg-white shadow-[0_24px_60px_-20px_rgba(18,50,36,0.35)]">
            <div className="flex items-start justify-between gap-3 border-b border-[#e4eee9] px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-[#157a4f]">SUGGESTED CANDIDATE</p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-[22px] font-semibold text-[#12241c]">{match.full_name}</h2>
                <p className="mt-1 text-[13px] text-[#5b6b64]">
                  {[job?.title, match.location].filter(Boolean).join(" · ") || "Skill match"}
                  {` · ${match.match_score}% match`}
                </p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-xl text-[#5b6b64] hover:bg-[#f0f7f3] hover:text-[#12241c]">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#eaf6f0] px-2.5 py-1 text-[11px] font-semibold text-[#146c45]">{match.match_score}% skill match</span>
                {inPipeline && <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">{pipelineStatus || "In pipeline"}</span>}
              </div>
              <div className="grid gap-2 text-[13px] text-[#3d4d46]">
                {match.education && (
                  <p className="flex items-start gap-2"><GraduationCap size={15} className="mt-0.5 shrink-0 text-[#146c45]" />{match.education}</p>
                )}
                {match.location && (
                  <p className="flex items-start gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-[#146c45]" />{match.location}</p>
                )}
              </div>
              {match.skills.length > 0 && (
                <section>
                  <h3 className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8b84]">SKILLS</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {match.skills.map((skill) => (
                      <span key={skill} className="rounded-full border border-[#e4eee9] bg-[#f7fbf9] px-2.5 py-1 text-[12px] text-[#3d4d46]">{skill}</span>
                    ))}
                  </div>
                </section>
              )}
              <div className="grid gap-3 sm:grid-cols-2 text-[13px]">
                <section>
                  <h3 className="text-[12px] font-semibold tracking-[0.08em] text-[#146c45]">MATCHING</h3>
                  <p className="mt-1.5 text-[#3d4d46]">{match.strengths.join(" · ") || "—"}</p>
                </section>
                <section>
                  <h3 className="text-[12px] font-semibold tracking-[0.08em] text-amber-700">MISSING</h3>
                  <p className="mt-1.5 text-[#3d4d46]">{match.gaps.join(" · ") || "—"}</p>
                </section>
              </div>
              {applicant?.candidate?.bio && (
                <section>
                  <h3 className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8b84]">BIO</h3>
                  <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-6 text-[#3d4d46]">{applicant.candidate.bio}</p>
                </section>
              )}
              <section className="rounded-2xl border border-[#e4eee9] bg-[#f7fbf9] p-4">
                <h3 className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8b84]">REQUEST INTERVIEW</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input type="date" value={interview.date} onChange={(e) => setInterview({ ...interview, date: e.target.value })} className={inputClass} />
                  <input type="time" value={interview.time} onChange={(e) => setInterview({ ...interview, time: e.target.value })} className={inputClass} />
                  <select value={interview.mode} onChange={(e) => setInterview({ ...interview, mode: e.target.value as Interview["mode"] })} className={`${inputClass} sm:col-span-2`}>
                    <option value="video">Video</option>
                    <option value="phone">Phone</option>
                    <option value="onsite">Onsite</option>
                  </select>
                </div>
              </section>
              {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>}
              {!jobReady && <p className="text-[13px] text-[#5b6b64]">Publish this job before requesting screening or an interview.</p>}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={!canScreen || busy !== null}
                  onClick={() => void request("shortlisted")}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0f5a39] disabled:opacity-50"
                >
                  {busy === "shortlisted" ? <Loader2 size={15} className="animate-spin" /> : null}
                  {pipelineStatus === "shortlisted" ? "Already in screening" : "Request screening"}
                </button>
                <button
                  type="button"
                  disabled={!canInterview || busy !== null}
                  onClick={() => void request("interview")}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#146c45] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#146c45] hover:bg-[#eaf6f0] disabled:opacity-50"
                >
                  {busy === "interview" ? <Loader2 size={15} className="animate-spin" /> : <Video size={15} />}
                  {pipelineStatus === "interview" ? "Interview already requested" : "Request interview"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function SearchView({ mode, jobs, applicants, onUpdateStatus }: {
  mode: "search" | "resumes";
  jobs: Job[];
  applicants: (Applicant & { jobTitle: string })[];
  onUpdateStatus: (applicationId: string, status: string, jobId?: string) => Promise<void>;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const requestedStage = searchParams.get("stage") ?? "";
  const stageFilter = pipelineStages.includes(requestedStage) ? requestedStage : "all";
  const q = query.trim().toLowerCase();
  const filtered = applicants.filter((a) => {
    if (mode === "resumes" && !(a.resume_url || a.candidate?.resume_url)) return false;
    if (jobFilter !== "all" && (a.job_id ?? "") !== jobFilter) return false;
    if (stageFilter !== "all" && a.status !== stageFilter) return false;
    if (!q) return true;
    const hay = [
      candidateName(a),
      a.candidate?.education ?? "",
      a.candidate?.bio ?? "",
      a.candidate?.location ?? "",
      a.jobTitle,
      ...(a.candidate?.skills ?? []),
      ...asExperienceList(a.candidate?.experience),
    ].join(" ").toLowerCase();
    return hay.includes(q);
  });

  return (
    <>
      <div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">{mode === "resumes" ? "RESUME SEARCH" : "CANDIDATE SEARCH"}</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">
          {mode === "resumes" ? "Find resumes in your pipeline" : "Search applicants"}
        </h1>
        <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">
          {mode === "resumes" ? "Filter applicants who attached a resume, then open the file." : "Search across name, skills, education, and experience from people who applied to your jobs."}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8b84]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={mode === "resumes" ? "Search resumes by skill or education…" : "Search candidates…"} className={`${inputClass} pl-9`} />
        </div>
        <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className="rounded-xl border border-[#e4eee9] bg-white px-4 py-3 text-[13px] outline-none focus:border-[#146c45]">
          <option value="all">All jobs</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <select
          value={stageFilter}
          onChange={(e) => {
            const next = new URLSearchParams(searchParams);
            if (e.target.value === "all") next.delete("stage");
            else next.set("stage", e.target.value);
            setSearchParams(next, { replace: true });
          }}
          className="rounded-xl border border-[#e4eee9] bg-white px-4 py-3 text-[13px] outline-none focus:border-[#146c45]"
        >
          <option value="all">All stages</option>
          {pipelineStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
        </select>
      </div>
      <p className="text-[13px] text-[#5b6b64]">{filtered.length} result{filtered.length === 1 ? "" : "s"}</p>
      {filtered.length === 0 ? <Empty text="No matching candidates in your applicant pool." /> : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <ApplicantCard key={a.id} applicant={a} subtitle={a.jobTitle} onStatus={(status) => void onUpdateStatus(a.id, status, a.job_id)} />
          ))}
        </div>
      )}
    </>
  );
}

function MatchingView({ jobs, applicantsByJob, onMessage }: {
  jobs: Job[];
  applicantsByJob: Record<string, Applicant[]>;
  onMessage: (value: { text: string; type: "success" | "error" }) => void;
}) {
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const job = jobs.find((j) => j.id === jobId);
  const applicants = applicantsByJob[jobId] ?? [];

  async function runMatch() {
    if (!job) return;
    if (!applicants.length) { onMessage({ text: "No applicants on this job to match.", type: "error" }); return; }
    setLoading(true);
    try {
      const res = await apiRequest<{ result: string }>("/api/ai/match-candidates", {
        method: "POST",
        body: JSON.stringify({
          job: { title: job.title, description: job.description, skills: job.skills, experience_level: job.experience_level },
          candidates: applicants.slice(0, 20).map((a) => ({
            id: a.id,
            full_name: candidateName(a),
            skills: a.candidate?.skills ?? [],
            education: a.candidate?.education ?? "",
            bio: a.candidate?.bio ?? "",
            experience: asExperienceList(a.candidate?.experience),
          })),
        }),
      });
      setMatches(parseMatches(res.result ?? ""));
    } catch (err) {
      onMessage({ text: (err as Error).message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">AI MATCHING</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Rank applicants for a role</h1>
        <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Gemini scores up to 20 applicants against the selected job.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <select value={jobId} onChange={(e) => { setJobId(e.target.value); setMatches([]); }} className={inputClass + " max-w-sm"}>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          {jobs.length === 0 && <option value="">No jobs yet</option>}
        </select>
        <button type="button" onClick={() => void runMatch()} disabled={loading || !job} className="inline-flex items-center gap-2 rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white hover:bg-[#0f5a39] disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? "Scoring…" : "Run AI match"}
        </button>
      </div>
      {matches.length === 0 ? <Empty text="Run matching to see ranked strengths and gaps." /> : (
        <div className="space-y-3">
          {matches.map((m) => {
            const applicant = applicants.find((a) => a.id === m.id);
            return (
              <div key={m.id} className="rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#12241c]">{applicant ? candidateName(applicant) : m.id}</p>
                    <p className="mt-1 text-[13px] text-[#5b6b64]">{m.summary}</p>
                  </div>
                  <span className="rounded-full bg-[#eaf6f0] px-3 py-1 text-[13px] font-semibold text-[#146c45]">{m.score}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eef3f0]"><div className="h-full rounded-full bg-[#146c45]" style={{ width: `${Math.max(0, Math.min(100, m.score))}%` }} /></div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 text-[12px]">
                  <div>
                    <p className="font-semibold text-[#146c45]">Strengths</p>
                    <p className="mt-1 text-[#5b6b64]">{(m.strengths ?? []).join(" · ") || "—"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-700">Gaps</p>
                    <p className="mt-1 text-[#5b6b64]">{(m.gaps ?? []).join(" · ") || "—"}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function InterviewsView({ applicants, interviews, setInterviews, onMessage, onScheduled }: {
  applicants: (Applicant & { jobTitle: string })[];
  interviews: Interview[];
  setInterviews: React.Dispatch<React.SetStateAction<Interview[]>>;
  onMessage: (msg: { text: string; type: "success" | "error" }) => void;
  onScheduled: (applicationId: string) => void;
}) {
  const [form, setForm] = useState({ applicantId: "", date: "", time: "10:00", mode: "video" as Interview["mode"], notes: "" });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function add() {
    if (!form.applicantId || !form.date) {
      onMessage({ text: "Select an applicant and date.", type: "error" });
      return;
    }
    setSaving(true);
    try {
      const res = await apiRequest<{ interview: Record<string, unknown> }>("/api/hiring/interviews", {
        method: "POST",
        body: JSON.stringify({
          application_id: form.applicantId,
          date: form.date,
          time: form.time,
          mode: form.mode,
          notes: form.notes,
        }),
      });
      setInterviews((prev) => [normalizeInterview(res.interview), ...prev]);
      onScheduled(form.applicantId);
      setForm({ applicantId: "", date: "", time: "10:00", mode: "video", notes: "" });
      onMessage({ text: "Interview scheduled.", type: "success" });
    } catch (err) {
      onMessage({ text: (err as Error).message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, status: Interview["status"]) {
    setBusyId(id);
    try {
      const res = await apiRequest<{ interview: Record<string, unknown> }>(`/api/hiring/interviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setInterviews((prev) => prev.map((x) => (x.id === id ? normalizeInterview(res.interview) : x)));
    } catch (err) {
      onMessage({ text: (err as Error).message, type: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await apiRequest(`/api/hiring/interviews/${id}`, { method: "DELETE" });
      setInterviews((prev) => prev.filter((x) => x.id !== id));
      onMessage({ text: "Interview removed.", type: "success" });
    } catch (err) {
      onMessage({ text: (err as Error).message, type: "error" });
    } finally {
      setBusyId(null);
    }
  }
  const modeIcon = { video: <Video size={16} className="text-violet-600" />, phone: <Phone size={16} className="text-blue-600" />, onsite: <Building2 size={16} className="text-[#146c45]" /> };
  return (
    <>
      <div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">INTERVIEWS</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Schedule interviews</h1>
        <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Book video, phone, or onsite loops with pipeline candidates.</p>
      </div>
      <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <select value={form.applicantId} onChange={(e) => setForm({ ...form, applicantId: e.target.value })} className={inputClass}>
            <option value="">Select applicant</option>
            {applicants.map((a) => <option key={a.id} value={a.id}>{candidateName(a)} · {a.jobTitle}</option>)}
          </select>
          <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as Interview["mode"] })} className={inputClass}>
            <option value="video">Video</option>
            <option value="phone">Phone</option>
            <option value="onsite">Onsite</option>
          </select>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className={inputClass} />
        </div>
        <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes (panel, round, link)" className={inputClass} />
        <button type="button" onClick={() => void add()} disabled={saving} className="rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white hover:bg-[#0f5a39] disabled:opacity-60">{saving ? "Scheduling…" : "Schedule interview"}</button>
      </div>
      <div className="space-y-3">
        {interviews.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf6f0]">{modeIcon[item.mode]}</div>
              <div>
                <p className="font-semibold text-[#12241c]">{item.candidateName}</p>
                <p className="text-[12px] text-[#5b6b64]">{item.jobTitle} · {item.date} {item.time} · {item.mode}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select value={item.status} disabled={busyId === item.id} onChange={(e) => void changeStatus(item.id, e.target.value as Interview["status"])} className="rounded-lg border border-[#e4eee9] px-2 py-1.5 text-[12px]">
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button type="button" disabled={busyId === item.id} onClick={() => void remove(item.id)} className="rounded-lg p-1.5 text-[#7a8b84] hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {interviews.length === 0 && <Empty text="No interviews scheduled yet." />}
      </div>
    </>
  );
}

function OffersView({ applicants, offers, setOffers, onMessage, onAccepted }: {
  applicants: (Applicant & { jobTitle: string })[];
  offers: Offer[];
  setOffers: React.Dispatch<React.SetStateAction<Offer[]>>;
  onMessage: (msg: { text: string; type: "success" | "error" }) => void;
  onAccepted: (applicationId: string) => void;
}) {
  const [form, setForm] = useState({ applicantId: "", salary: "", joiningDate: "" });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function add() {
    if (!form.applicantId || !form.salary.trim()) {
      onMessage({ text: "Select an applicant and enter compensation.", type: "error" });
      return;
    }
    setSaving(true);
    try {
      const res = await apiRequest<{ offer: Record<string, unknown> }>("/api/hiring/offers", {
        method: "POST",
        body: JSON.stringify({
          application_id: form.applicantId,
          salary: form.salary.trim(),
          joining_date: form.joiningDate,
        }),
      });
      setOffers((prev) => [normalizeOffer(res.offer), ...prev]);
      setForm({ applicantId: "", salary: "", joiningDate: "" });
      onMessage({ text: "Offer drafted.", type: "success" });
    } catch (err) {
      onMessage({ text: (err as Error).message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(item: Offer, status: Offer["status"]) {
    setBusyId(item.id);
    try {
      const res = await apiRequest<{ offer: Record<string, unknown> }>(`/api/hiring/offers/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const next = normalizeOffer(res.offer);
      setOffers((prev) => prev.map((x) => (x.id === item.id ? next : x)));
      if (next.status === "accepted" && next.applicationId) onAccepted(next.applicationId);
      onMessage({ text: `Offer ${next.status}.`, type: "success" });
    } catch (err) {
      onMessage({ text: (err as Error).message, type: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await apiRequest(`/api/hiring/offers/${id}`, { method: "DELETE" });
      setOffers((prev) => prev.filter((x) => x.id !== id));
      onMessage({ text: "Offer removed.", type: "success" });
    } catch (err) {
      onMessage({ text: (err as Error).message, type: "error" });
    } finally {
      setBusyId(null);
    }
  }
  const colors: Record<Offer["status"], string> = {
    draft: "bg-[#eef3f0] text-[#5b6b64]",
    sent: "bg-blue-100 text-blue-700",
    accepted: "bg-[#d4ede2] text-[#146c45]",
    declined: "bg-red-100 text-red-700",
  };
  return (
    <>
      <div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">OFFERS</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Manage offers</h1>
        <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Draft compensation, send, and track accept / decline.</p>
      </div>
      <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <select value={form.applicantId} onChange={(e) => setForm({ ...form, applicantId: e.target.value })} className={inputClass}>
            <option value="">Select applicant</option>
            {applicants.map((a) => <option key={a.id} value={a.id}>{candidateName(a)} · {a.jobTitle}</option>)}
          </select>
          <input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="CTC / stipend" className={inputClass} />
          <input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} className={inputClass} />
        </div>
        <button type="button" onClick={() => void add()} disabled={saving} className="rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white hover:bg-[#0f5a39] disabled:opacity-60">{saving ? "Saving…" : "Create offer"}</button>
      </div>
      <div className="space-y-3">
        {offers.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <div>
              <p className="font-semibold text-[#12241c]">{item.candidateName}</p>
              <p className="text-[12px] text-[#5b6b64]">{item.jobTitle} · {formatSalaryRange(item.salary) || item.salary}{item.joiningDate ? ` · join ${item.joiningDate}` : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${colors[item.status]}`}>{item.status}</span>
              <select value={item.status} disabled={busyId === item.id || item.status === "accepted"} onChange={(e) => void changeStatus(item, e.target.value as Offer["status"])} className="rounded-lg border border-[#e4eee9] px-2 py-1.5 text-[12px]">
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
              </select>
              <button type="button" disabled={busyId === item.id || item.status === "accepted"} onClick={() => void remove(item.id)} className="rounded-lg p-1.5 text-[#7a8b84] hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {offers.length === 0 && <Empty text="No offers yet. Create one from a shortlisted applicant." />}
      </div>
    </>
  );
}

function CampusView({ drives, setDrives }: { drives: CampusDrive[]; setDrives: React.Dispatch<React.SetStateAction<CampusDrive[]>> }) {
  const [form, setForm] = useState({ college: "", city: "", date: "", roles: "", slots: 30 });
  const colors: Record<CampusDrive["status"], string> = {
    upcoming: "bg-blue-100 text-blue-700",
    completed: "bg-[#d4ede2] text-[#146c45]",
    cancelled: "bg-red-100 text-red-700",
  };
  function add() {
    if (!form.college || !form.date) return;
    setDrives((prev) => [{ ...form, id: crypto.randomUUID(), status: "upcoming" }, ...prev]);
    setForm({ college: "", city: "", date: "", roles: "", slots: 30 });
  }
  return (
    <>
      <div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">CAMPUS HIRING</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Campus drives</h1>
        <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Plan college visits, roles, and intake slots.</p>
      </div>
      <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} placeholder="College / university" className={inputClass} />
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className={inputClass} />
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          <input type="number" min={1} value={form.slots} onChange={(e) => setForm({ ...form, slots: Number(e.target.value) })} placeholder="Slots" className={inputClass} />
        </div>
        <input value={form.roles} onChange={(e) => setForm({ ...form, roles: e.target.value })} placeholder="Roles (e.g. SDE intern, Analyst)" className={inputClass} />
        <button type="button" onClick={add} className="inline-flex items-center gap-2 rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white hover:bg-[#0f5a39]"><Plus size={16} /> Add drive</button>
      </div>
      <div className="space-y-3">
        {drives.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-4 rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50"><GraduationCap size={18} className="text-amber-600" /></div>
              <div>
                <p className="font-semibold text-[#12241c]">{d.college}</p>
                <p className="text-[12px] text-[#5b6b64]">{d.city || "Campus"} · {d.date} · {d.slots} slots · {d.roles}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${colors[d.status]}`}>{d.status}</span>
              <select value={d.status} onChange={(e) => setDrives((prev) => prev.map((x) => x.id === d.id ? { ...x, status: e.target.value as CampusDrive["status"] } : x))} className="rounded-lg border border-[#e4eee9] px-2 py-1.5 text-[12px]">
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button type="button" onClick={() => setDrives((prev) => prev.filter((x) => x.id !== d.id))} className="rounded-lg p-1.5 text-[#7a8b84] hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function BulkView({ applicants, jobs, onUpdateStatus, onMessage }: {
  applicants: (Applicant & { jobTitle: string })[];
  jobs: Job[];
  onUpdateStatus: (applicationId: string, status: string, jobId?: string) => Promise<void>;
  onMessage: (value: { text: string; type: "success" | "error" }) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("shortlisted");
  const [jobFilter, setJobFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const rows = jobFilter === "all" ? applicants : applicants.filter((a) => a.job_id === jobFilter);
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  async function apply() {
    if (!selected.size) return;
    setBusy(true);
    try {
      const chosen = rows.filter((a) => selected.has(a.id));
      await Promise.all(chosen.map((a) => onUpdateStatus(a.id, status, a.job_id)));
      setSelected(new Set());
      onMessage({ text: `Updated ${chosen.length} applicant${chosen.length === 1 ? "" : "s"} to ${status}.`, type: "success" });
    } catch (err) {
      onMessage({ text: (err as Error).message, type: "error" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">BULK HIRING</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Update many applicants at once</h1>
        <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Select a cohort and move them to the same pipeline stage.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className="rounded-xl border border-[#e4eee9] bg-white px-4 py-2.5 text-[13px]">
          <option value="all">All jobs</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-[#e4eee9] bg-white px-4 py-2.5 text-[13px]">
          {pipelineStages.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="button" onClick={() => void apply()} disabled={busy || selected.size === 0} className="rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50">
          {busy ? "Updating…" : `Apply to ${selected.size} selected`}
        </button>
      </div>
      {rows.length === 0 ? <Empty text="No applicants to bulk-update." /> : (
        <div className="rounded-[22px] border border-white bg-white shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#eef3f0] bg-[#f7fbf9]">
                <th className="px-5 py-3.5 text-left">
                  <input type="checkbox" checked={rows.length > 0 && rows.every((r) => selected.has(r.id))} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
                </th>
                <th className="px-5 py-3.5 text-left font-semibold text-[#5b6b64]">Candidate</th>
                <th className="px-5 py-3.5 text-left font-semibold text-[#5b6b64]">Job</th>
                <th className="px-5 py-3.5 text-left font-semibold text-[#5b6b64]">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-[#eef3f0] last:border-0">
                  <td className="px-5 py-3"><input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} /></td>
                  <td className="px-5 py-3 font-semibold text-[#12241c]">{candidateName(a)}</td>
                  <td className="px-5 py-3 text-[#5b6b64]">{a.jobTitle}</td>
                  <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${stageConfig[a.status]?.color ?? "bg-[#eef3f0] text-[#5b6b64]"}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function pct(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function analyticsConversionFunnel<T extends Applicant>(applicants: T[]) {
  const applied = applicants.length;
  return [
    { key: "applied", label: "Applied", value: applied, color: "bg-blue-400" },
    { key: "shortlisted", label: "Shortlisted", value: applicants.filter((item) => ["shortlisted", "interview", "hired"].includes(item.status)).length, color: "bg-violet-400" },
    { key: "interview", label: "Interviewed", value: applicants.filter((item) => ["interview", "hired"].includes(item.status)).length, color: "bg-amber-400" },
    { key: "hired", label: "Hired", value: applicants.filter((item) => item.status === "hired").length, color: "bg-[#146c45]" },
  ] as const;
}

function ConversionFunnel({ applicants }: { applicants: Applicant[] }) {
  const funnel = analyticsConversionFunnel(applicants);
  const applied = funnel[0]?.value ?? 0;
  const widest = Math.max(...funnel.map((step) => step.value), 1);

  return (
    <div>
      {applied === 0 && (
        <p className="mb-4 text-[13px] text-[#5b6b64]">Funnel data appears after candidates apply or you invite them from a job.</p>
      )}
      {funnel.map((step, index) => {
        const prev = index === 0 ? applied : funnel[index - 1].value;
        const keep = pct(step.value, prev);
        return (
          <div key={step.key} className="mb-4 last:mb-0">
            <div className="mb-1 flex items-center justify-between text-[13px]">
              <span className="font-semibold text-[#12241c]">{step.label}</span>
              <span className="text-[#5b6b64]">{step.value}{index > 0 ? ` · ${keep}% of previous` : " in pipeline"}</span>
            </div>
            <div className="h-3 rounded-full bg-[#f0f7f3]">
              <div className={`h-3 rounded-full ${step.color}`} style={{ width: `${Math.max(6, Math.round((step.value / widest) * 100))}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AnalyticsPipelineBoard({
  applicants,
  showJobTitle,
  onStatus,
}: {
  applicants: (Applicant & { jobTitle?: string })[];
  showJobTitle?: boolean;
  onStatus: (applicationId: string, status: string) => void;
}) {
  const funnel = analyticsConversionFunnel(applicants);
  const applied = funnel[0]?.value ?? 0;
  const widest = Math.max(...funnel.map((step) => step.value), 1);
  const rejected = applicants.filter((item) => item.status === "rejected").length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        {funnel.map((step, index) => {
          const prev = index === 0 ? applied : funnel[index - 1].value;
          const keep = pct(step.value, prev);
          return (
            <div key={step.key} className="rounded-xl bg-[#f7fbf9] px-3 py-3">
              <p className="text-[11px] font-semibold tracking-[0.08em] text-[#7a8b84]">{step.label.toUpperCase()}</p>
              <p className="mt-1 text-[22px] font-semibold text-[#12241c]">{step.value}</p>
              <p className="text-[11px] text-[#5b6b64]">{index === 0 ? "in pipeline" : `${keep}% of previous`}</p>
              <div className="mt-2 h-1.5 rounded-full bg-white">
                <div className={`h-1.5 rounded-full ${step.color}`} style={{ width: `${Math.max(8, Math.round((step.value / widest) * 100))}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {rejected > 0 && (
        <p className="text-[12px] text-[#5b6b64]">{rejected} rejected {rejected === 1 ? "candidate is" : "candidates are"} outside this funnel.</p>
      )}
      <div className="grid gap-3 lg:grid-cols-4">
        {analyticsPipelineStages.map((stage) => {
          const rows = applicantsInAnalyticsStage(applicants, stage.statuses);
          const cfg = stageConfig[stage.key];
          return (
            <section key={stage.key} id={stage.key} className="rounded-2xl border border-[#eef3f0] bg-[#f7fbf9] p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.color}`}>
                  {cfg.icon}
                  {stage.label}
                </span>
                <span className="text-[12px] font-semibold text-[#5b6b64]">{rows.length}</span>
              </div>
              {rows.length === 0 ? (
                <p className="px-1 py-6 text-center text-[12px] text-[#7a8b84]">No one at this stage</p>
              ) : (
                <div className="space-y-2">
                  {rows.map((applicant) => (
                    <div key={applicant.id} className="rounded-xl border border-white bg-white p-3">
                      <p className="truncate text-[13px] font-semibold text-[#12241c]">{candidateName(applicant)}</p>
                      {showJobTitle && applicant.jobTitle ? (
                        <p className="mt-0.5 truncate text-[11px] text-[#5b6b64]">{applicant.jobTitle}</p>
                      ) : null}
                      <select
                        value={applicant.status}
                        onChange={(event) => onStatus(applicant.id, event.target.value)}
                        className="mt-2 w-full rounded-lg border border-[#e4eee9] bg-[#f7fbf9] px-2 py-1.5 text-[11px] font-medium outline-none focus:border-[#146c45]"
                      >
                        {pipelineStages.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function PipelineView({
  jobs,
  applicants,
  onUpdateStatus,
}: {
  jobs: Job[];
  applicants: (Applicant & { jobTitle: string })[];
  onUpdateStatus: (applicationId: string, status: string, jobId?: string) => Promise<void>;
}) {
  const [jobFilter, setJobFilter] = useState("all");
  const rows = jobFilter === "all" ? applicants : applicants.filter((item) => (item.job_id ?? "") === jobFilter);
  const selectedJob = jobs.find((job) => job.id === jobFilter);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">HIRING PIPELINE</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Applied to hired</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#5b6b64]">
            The same conversion funnel Analytics maps: Applied → Shortlisted → Interviewed → Hired. Company profile stays under the account menu; screening profiles stay in Candidate search.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <Link to="/recruiter/analytics" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#146c45] hover:text-[#0f5a39]">
            <TrendingUp size={15} /> View analytics
          </Link>
          <select
            value={jobFilter}
            onChange={(event) => setJobFilter(event.target.value)}
            className="rounded-xl border border-[#e4eee9] bg-white px-4 py-3 text-[13px] outline-none focus:border-[#146c45]"
          >
            <option value="all">All jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>{job.title || "Untitled draft"}</option>
            ))}
          </select>
        </div>
      </div>
      <Panel title={selectedJob ? `Conversion funnel · ${selectedJob.title}` : "Conversion funnel"}>
        <ConversionFunnel applicants={rows} />
      </Panel>
      <AnalyticsPipelineBoard
        applicants={rows}
        showJobTitle={jobFilter === "all"}
        onStatus={(applicationId, status) => {
          const row = rows.find((item) => item.id === applicationId);
          void onUpdateStatus(applicationId, status, row?.job_id);
        }}
      />
    </>
  );
}

function AnalyticsView({
  analytics,
  jobs,
  allApplicants,
  interviews,
  offers,
}: {
  analytics: Analytics | null;
  jobs: Job[];
  allApplicants: (Applicant & { jobTitle: string })[];
  interviews: Interview[];
  offers: Offer[];
}) {
  const applied = allApplicants.length;
  const shortlisted = allApplicants.filter((item) => ["shortlisted", "interview", "hired"].includes(item.status)).length;
  const interviewed = allApplicants.filter((item) => ["interview", "hired"].includes(item.status)).length;
  const hired = analytics?.hired ?? allApplicants.filter((item) => item.status === "hired").length;
  const rejected = allApplicants.filter((item) => item.status === "rejected").length;
  const offerSent = offers.filter((item) => item.status === "sent" || item.status === "accepted").length;
  const offerAccepted = offers.filter((item) => item.status === "accepted").length;
  const hireRate = pct(hired, applied);
  const screenRate = pct(shortlisted, applied);
  const interviewRate = pct(interviewed, shortlisted || applied);
  const offerAcceptRate = pct(offerAccepted, offerSent);
  const rejectRate = pct(rejected, applied);

  const perJob = jobs.map((job) => {
    const rows = allApplicants.filter((item) => item.job_id === job.id);
    const jobHired = rows.filter((item) => item.status === "hired").length;
    return {
      id: job.id,
      title: job.title,
      status: job.status,
      applicants: rows.length || analytics?.per_job.find((item) => item.id === job.id)?.applicants || 0,
      hired: jobHired,
      conversion: pct(jobHired, rows.length),
    };
  }).sort((a, b) => b.applicants - a.applicants);

  const scheduledInterviews = interviews.filter((item) => item.status === "scheduled").length;
  const completedInterviews = interviews.filter((item) => item.status === "completed").length;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">HIRING ANALYTICS</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Where the pipeline converts</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#5b6b64]">Rates, drop-off, and role-level yield. Day-to-day screening stays on ATS.</p>
        </div>
        <Link to="/recruiter/dashboard" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#146c45] hover:text-[#0f5a39]">
          <BarChart3 size={15} /> Back to ATS
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric icon={<TrendingUp size={20} />} label="Hire rate" value={`${hireRate}%`} color="emerald" />
        <Metric icon={<Sparkles size={20} />} label="Screen-to-shortlist" value={`${screenRate}%`} color="violet" />
        <Metric icon={<Video size={20} />} label="Shortlist-to-interview" value={`${interviewRate}%`} color="blue" />
        <Metric icon={<DollarSign size={20} />} label="Offer accept rate" value={offerSent ? `${offerAcceptRate}%` : "—"} color="amber" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <Panel title="Conversion funnel">
          <ConversionFunnel applicants={allApplicants} />
        </Panel>
        <Panel title="Outcome mix">
          <div className="space-y-3 text-[13px]">
            <div className="flex items-center justify-between rounded-xl bg-[#f7fbf9] px-4 py-3">
              <span className="text-[#5b6b64]">Applicants</span>
              <span className="font-semibold text-[#12241c]">{applied}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#f7fbf9] px-4 py-3">
              <span className="text-[#5b6b64]">Rejected</span>
              <span className="font-semibold text-[#12241c]">{rejected} ({rejectRate}%)</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#f7fbf9] px-4 py-3">
              <span className="text-[#5b6b64]">Interviews scheduled / done</span>
              <span className="font-semibold text-[#12241c]">{scheduledInterviews} / {completedInterviews}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#f7fbf9] px-4 py-3">
              <span className="text-[#5b6b64]">Offers sent / accepted</span>
              <span className="font-semibold text-[#12241c]">{offerSent} / {offerAccepted}</span>
            </div>
          </div>
        </Panel>
      </div>
      <Panel title="Yield by role">
        {perJob.length === 0 && <Empty text="Post a job to see conversion by role." />}
        {perJob.map((item) => (
          <div key={item.id} className="mb-2 flex items-center justify-between rounded-xl border border-[#eef3f0] px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold text-[#12241c]">{item.title}</p>
              <p className="text-[11px] text-[#7a8b84]">{item.status} · {item.applicants} applicants · {item.hired} hired</p>
            </div>
            <span className="rounded-full bg-[#eaf6f0] px-3 py-1 text-[12px] font-semibold text-[#146c45]">{item.conversion}% hire</span>
          </div>
        ))}
      </Panel>
    </>
  );
}

function ApplicantCard({ applicant, subtitle, onStatus }: { applicant: Applicant; subtitle?: string; onStatus: (status: string) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = stageConfig[applicant.status] ?? { color: "bg-[#eef3f0] text-[#5b6b64]", bar: "", icon: null };
  const resume = applicant.resume_url || applicant.candidate?.resume_url;
  const skills = applicant.candidate?.skills ?? [];
  const experience = asExperienceList(applicant.candidate?.experience);
  const coverLetter = applicantCoverLetter(applicant);
  const parsedNotes = parseApplicationNotes(applicantNotes(applicant));
  const appliedAt = formatAppliedAt(applicant.created_at);
  const email = applicant.candidate?.contact_email?.trim() ?? "";

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <article className="rounded-[22px] border border-white bg-white p-4 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-w-0 flex-1 rounded-xl p-1 text-left transition hover:bg-[#f7fbf9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#146c45]/30"
          >
            <div className="flex items-start gap-3">
              {applicant.candidate?.avatar_url ? (
                <img src={applicant.candidate.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf6f0] text-[13px] font-bold text-[#146c45]">
                  {(candidateName(applicant)[0] ?? "?").toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[#12241c]">{candidateName(applicant)}</p>
            <p className="mt-0.5 text-[12px] text-[#5b6b64]">{subtitle || applicant.candidate?.education || applicant.candidate?.location || "Profile incomplete"}</p>
            {skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {skills.slice(0, 6).map((skill) => (
                  <span key={skill} className="rounded-full border border-[#e4eee9] bg-[#f7fbf9] px-2 py-0.5 text-[11px] text-[#5b6b64]">{skill}</span>
                ))}
              </div>
            )}
            <span className="mt-2 inline-flex text-[12px] font-semibold text-[#146c45]">View screening details →</span>
              </div>
            </div>
          </button>
          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.color}`}>{cfg.icon}{applicant.status}</span>
            <select value={applicant.status} onChange={(e) => onStatus(e.target.value)} className="rounded-lg border border-[#e4eee9] bg-[#f7fbf9] px-2 py-1.5 text-[11px] font-medium outline-none focus:border-[#146c45]">
              {pipelineStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
            </select>
          </div>
        </div>
        {resume && (
          <a href={resume} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#146c45] hover:underline">
            <ExternalLink size={12} /> Preview resume
          </a>
        )}
      </article>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button type="button" aria-label="Close candidate details" className="absolute inset-0 bg-[#12241c]/40" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-full max-w-[440px] flex-col border-l border-[#e4eee9] bg-white shadow-[0_24px_60px_-20px_rgba(18,50,36,0.35)]">
            <div className="flex items-start justify-between gap-3 border-b border-[#e4eee9] px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                {applicant.candidate?.avatar_url ? (
                  <img src={applicant.candidate.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#eaf6f0] text-[15px] font-bold text-[#146c45]">
                    {(candidateName(applicant)[0] ?? "?").toUpperCase()}
                  </div>
                )}
                <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-[#157a4f]">SCREENING PROFILE</p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-[22px] font-semibold text-[#12241c]">{candidateName(applicant)}</h2>
                <p className="mt-1 text-[13px] text-[#5b6b64]">
                  {[subtitle, applicant.candidate?.location].filter(Boolean).join(" · ") || "Applicant"}
                  {appliedAt ? ` · Applied ${appliedAt}` : ""}
                </p>
                </div>
              </div>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-xl text-[#5b6b64] hover:bg-[#f0f7f3] hover:text-[#12241c]">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.color}`}>{cfg.icon}{applicant.status}</span>
                <select value={applicant.status} onChange={(e) => onStatus(e.target.value)} className="rounded-lg border border-[#e4eee9] bg-[#f7fbf9] px-2 py-1.5 text-[11px] font-medium outline-none focus:border-[#146c45]">
                  {pipelineStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                </select>
              </div>
              <div className="grid gap-2 text-[13px] text-[#3d4d46]">
                {applicant.candidate?.education && (
                  <p className="flex items-start gap-2"><GraduationCap size={15} className="mt-0.5 shrink-0 text-[#146c45]" />{applicant.candidate.education}</p>
                )}
                {applicant.candidate?.location && (
                  <p className="flex items-start gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-[#146c45]" />{applicant.candidate.location}</p>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="flex items-start gap-2 font-medium text-[#146c45] hover:underline">
                    <Mail size={15} className="mt-0.5 shrink-0" />{email}
                  </a>
                )}
                {parsedNotes.expectedCtc && (
                  <p className="flex items-start gap-2"><DollarSign size={15} className="mt-0.5 shrink-0 text-[#146c45]" />Expected CTC: {formatSalaryRange(parsedNotes.expectedCtc) || parsedNotes.expectedCtc}</p>
                )}
                {parsedNotes.noticePeriod && (
                  <p className="flex items-start gap-2"><Clock size={15} className="mt-0.5 shrink-0 text-[#146c45]" />Notice: {parsedNotes.noticePeriod}</p>
                )}
              </div>
              {applicant.candidate?.bio && (
                <section>
                  <h3 className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8b84]">BIO</h3>
                  <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-6 text-[#3d4d46]">{applicant.candidate.bio}</p>
                </section>
              )}
              {skills.length > 0 && (
                <section>
                  <h3 className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8b84]">SKILLS</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <span key={skill} className="rounded-full border border-[#e4eee9] bg-[#f7fbf9] px-2.5 py-1 text-[12px] text-[#3d4d46]">{skill}</span>
                    ))}
                  </div>
                </section>
              )}
              {experience.length > 0 && (
                <section>
                  <h3 className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8b84]">EXPERIENCE</h3>
                  <ul className="mt-2 space-y-1.5 text-[14px] leading-6 text-[#3d4d46]">
                    {experience.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </section>
              )}
              {coverLetter && (
                <section>
                  <h3 className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8b84]">COVER NOTE</h3>
                  <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-6 text-[#3d4d46]">{coverLetter}</p>
                </section>
              )}
              {parsedNotes.extra && (
                <section>
                  <h3 className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8b84]">APPLICATION NOTES</h3>
                  <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-6 text-[#3d4d46]">{parsedNotes.extra}</p>
                </section>
              )}
              {resume && (
                <a href={resume} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0f5a39]">
                  <ExternalLink size={14} /> Open resume
                </a>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">{title}</h2>
      {children}
    </section>
  );
}

function Metric({ icon, label, value, color }: { icon: ReactNode; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    violet: "bg-violet-50 text-violet-600",
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-[#eaf6f0] text-[#146c45]",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}>{icon}</div>
      <p className="mt-4 font-[family-name:var(--font-display)] text-[30px] font-semibold leading-none text-[#12241c]">{value}</p>
      <p className="mt-1.5 text-[13px] text-[#5b6b64]">{label}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl bg-[#f7fbf9] p-4 text-[13px] text-[#7a8b84]">{text}</p>;
}

function Checklist({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5 text-[13px]">
      {done
        ? <CheckCircle2 size={17} className="shrink-0 text-[#146c45]" />
        : <Circle size={17} className="shrink-0 text-[#c9d6cf]" />
      }
      <span className={done ? "text-[#12241c]" : "text-[#7a8b84]"}>{text}</span>
    </div>
  );
}

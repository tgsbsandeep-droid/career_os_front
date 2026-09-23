import { useEffect, useMemo, useState } from "react";
import { apiRequest, supabase } from "../../services/api";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bookmark,
  BookmarkCheck,
  Search,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  CheckCircle2,
  Loader2,
  SlidersHorizontal,
  Building2,
  Sparkles,
  X,
} from "lucide-react";
import JobApplyModal, { type ApplyPrefill, type JobApplicationPayload } from "../../components/JobApplyModal";
import { formatSalaryRange, salaryFilterLabel } from "../../utils/salary";

type ApiJob = {
  id: string;
  title: string;
  company_name: string;
  location: string;
  employment_type: string;
  skills: string[];
  salary_range?: string;
  description?: string;
  match_score?: number;
  strengths?: string[];
  gaps?: string[];
};
type CandidateApplication = { job_id: string };
type CandidateProfile = {
  full_name?: string;
  contact_email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  resume_url?: string;
};
type ScoredJob = ApiJob & { match_score: number; strengths: string[]; gaps: string[] };
type PageMeta = { total: number; limit: number; offset: number; hasMore: boolean };

const PAGE_SIZE = 50;

const EMPLOYMENT_TYPES = ["All", "Full-time", "Part-time", "Contract", "Internship", "Freelance"];
const SALARY_FILTERS = [
  { value: "all", label: "Any salary" },
  { value: "0-5", label: "Up to 5 LPA" },
  { value: "5-10", label: "5–10 LPA" },
  { value: "10-20", label: "10–20 LPA" },
  { value: "20+", label: "20 LPA+" },
];

function asText(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

function asSkillList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => asText(item).trim()).filter(Boolean);
  const text = asText(value).trim();
  if (!text) return [];
  return text.split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
}

function formatJobSnippet(value: unknown) {
  return asText(value)
    .replace(/\r\n/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s*-{3,}\s*/g, " ")
    .replace(/\*\*([^*]+):\*\*/g, "$1: ")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSkill(value: unknown) {
  return asText(value).toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
}

function skillOverlap(candidateSkills: string[], jobSkills: string[]) {
  const required = [...new Set((jobSkills ?? []).map(normalizeSkill).filter(Boolean))];
  const profile = (candidateSkills ?? []).map(normalizeSkill).filter(Boolean);
  const strengths = required.filter((skill) => profile.some((item) => item.includes(skill) || skill.includes(item)));
  const gaps = required.filter((skill) => !strengths.includes(skill));
  const score = required.length ? Math.round((strengths.length / required.length) * 100) : 0;
  return { score, strengths: strengths.slice(0, 6), gaps: gaps.slice(0, 6) };
}

function salaryNumbers(range: unknown) {
  return (asText(range).replace(/,/g, "").match(/\d+(\.\d+)?/g) ?? []).map(Number);
}

function matchesSalary(range: unknown, filter: string) {
  if (filter === "all") return true;
  const nums = salaryNumbers(range);
  if (!nums.length) return false;
  const max = Math.max(...nums);
  const lpa = max > 1000 ? max / 100000 : max;
  if (filter === "0-5") return lpa <= 5;
  if (filter === "5-10") return lpa > 5 && lpa <= 10;
  if (filter === "10-20") return lpa > 10 && lpa <= 20;
  return lpa > 20;
}

function scoreJob(job: ApiJob, candidateSkills: string[]): ScoredJob {
  const skills = asSkillList(job.skills);
  const overlap = skillOverlap(candidateSkills, skills);
  return {
    ...job,
    title: asText(job.title),
    skills,
    company_name: asText(job.company_name) === "Company" ? "" : asText(job.company_name),
    location: asText(job.location),
    employment_type: asText(job.employment_type) || "Full-time",
    salary_range: asText(job.salary_range),
    description: formatJobSnippet(job.description),
    match_score: job.match_score ?? overlap.score,
    strengths: job.strengths ?? overlap.strengths,
    gaps: job.gaps ?? overlap.gaps,
  };
}

export default function Jobs() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [skillsFromCoach] = useState<string[]>(() => {
    const s = searchParams.get("skills");
    return s ? s.split(",").map((x) => x.trim()).filter(Boolean) : [];
  });
  const [typeFilter, setTypeFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [salaryFilter, setSalaryFilter] = useState("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minMatch, setMinMatch] = useState(0);
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [candidateSkills, setCandidateSkills] = useState<string[]>([]);
  const [appliedJobs, setAppliedJobs] = useState(new Set<string>());
  const [savedJobs, setSavedJobs] = useState(new Set<string>());
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyJob, setApplyJob] = useState<ApiJob | null>(null);
  const [applyPrefill, setApplyPrefill] = useState<ApplyPrefill | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      apiRequest<{ jobs: ApiJob[]; page?: PageMeta }>(`/api/jobs?limit=${PAGE_SIZE}&offset=0`),
      supabase.auth.getUser(),
    ]).then(async ([jobsResponse, userResponse]) => {
      setJobs(jobsResponse.jobs);
      setHasMore(Boolean(jobsResponse.page?.hasMore));
      const user = userResponse.data.user;
      if (user) {
        setUserId(user.id);
        const [applicationsResponse, savedResponse, profileResponse] = await Promise.all([
          apiRequest<{ applications: CandidateApplication[] }>(`/api/candidate/${user.id}/applications`),
          apiRequest<{ saved_jobs: { job_id: string }[] }>(`/api/candidate/${user.id}/saved-jobs`).catch(() => ({ saved_jobs: [] })),
          apiRequest<{ profile: (CandidateProfile & { skills?: string[] }) | null }>(`/api/candidate/${user.id}/profile`).catch(() => ({ profile: null })),
        ]);
        setAppliedJobs(new Set(applicationsResponse.applications.map((a) => a.job_id)));
        setSavedJobs(new Set((savedResponse.saved_jobs ?? []).map((row) => row.job_id)));
        setCandidateSkills(profileResponse.profile?.skills ?? []);
        setApplyPrefill({
          full_name: profileResponse.profile?.full_name || user.user_metadata?.full_name || "",
          contact_email: profileResponse.profile?.contact_email || user.email || "",
          phone: profileResponse.profile?.phone || "",
          location: profileResponse.profile?.location || "",
          linkedin_url: profileResponse.profile?.linkedin_url || "",
          resume_url: profileResponse.profile?.resume_url || "",
        });
      }
    }).catch(() => setJobs([])).finally(() => setLoading(false));
  }, []);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setApplyError(null);
    try {
      const response = await apiRequest<{ jobs: ApiJob[]; page?: PageMeta }>(`/api/jobs?limit=${PAGE_SIZE}&offset=${jobs.length}`);
      setJobs((current) => {
        const seen = new Set(current.map((job) => job.id));
        return [...current, ...response.jobs.filter((job) => !seen.has(job.id))];
      });
      setHasMore(Boolean(response.page?.hasMore));
    } catch (error) {
      setApplyError((error as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  async function toggleSave(jobId: string) {
    if (!userId) return;
    setSavingId(jobId);
    setApplyError(null);
    const isSaved = savedJobs.has(jobId);
    try {
      await apiRequest(`/api/candidate/${userId}/saved-jobs/${jobId}`, { method: isSaved ? "DELETE" : "POST" });
      setSavedJobs((curr) => {
        const next = new Set(curr);
        if (isSaved) next.delete(jobId);
        else next.add(jobId);
        return next;
      });
    } catch (error) {
      setApplyError((error as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  function openApply(job: ApiJob) {
    setApplyError(null);
    setApplyJob(job);
  }

  async function submitApplication(payload: JobApplicationPayload) {
    if (!applyJob) return;
    setApplyingId(applyJob.id);
    setApplyError(null);
    try {
      if (userId) {
        await apiRequest(`/api/candidate/${userId}/profile`, {
          method: "PUT",
          body: JSON.stringify({
            full_name: payload.full_name,
            contact_email: payload.contact_email,
            phone: payload.phone,
            location: payload.location,
            linkedin_url: payload.linkedin_url || null,
            resume_url: payload.resume_url || null,
          }),
        }).catch(() => null);
      }
      await apiRequest(`/api/jobs/${applyJob.id}/apply`, {
        method: "POST",
        body: JSON.stringify({
          resume_url: payload.resume_url || null,
          cover_letter: payload.cover_letter,
          notes: payload.notes || null,
          full_name: payload.full_name,
          contact_email: payload.contact_email,
          phone: payload.phone,
          location: payload.location,
          linkedin_url: payload.linkedin_url || null,
        }),
      });
      setAppliedJobs((current) => new Set(current).add(applyJob.id));
      setApplyPrefill({
        full_name: payload.full_name,
        contact_email: payload.contact_email,
        phone: payload.phone,
        location: payload.location,
        linkedin_url: payload.linkedin_url,
        resume_url: payload.resume_url,
      });
      setApplyJob(null);
    } catch (error) {
      setApplyError((error as Error).message);
    } finally {
      setApplyingId(null);
    }
  }

  const isRecommendedMode = skillsFromCoach.length > 0 || (searchParams.get("q") ?? "") !== "";
  const matchingSkills = skillsFromCoach.length ? skillsFromCoach : candidateSkills;
  const locations = useMemo(
    () => ["All", ...[...new Set(jobs.map((job) => asText(job.location)).filter(Boolean))].sort((a, b) => a.localeCompare(b))],
    [jobs],
  );

  const filtered = jobs
    .map((job) => scoreJob(job, matchingSkills))
    .filter((job) => {
      const haystack = `${job.title} ${job.company_name} ${job.location} ${job.skills.join(" ")} ${job.description ?? ""}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query.toLowerCase());
      const matchesType = typeFilter === "All" || job.employment_type === typeFilter;
      const matchesLocation = locationFilter === "All" || job.location === locationFilter;
      const matchesRemote = !remoteOnly || /remote|hybrid/i.test(job.location) || /remote|hybrid/i.test(job.employment_type);
      const matchesPay = matchesSalary(job.salary_range ?? "", salaryFilter);
      const matchesFloor = job.match_score >= minMatch;
      const matchesSkills = skillsFromCoach.length === 0 || job.skills.some((s) =>
        skillsFromCoach.some((sk) => asText(s).toLowerCase().includes(asText(sk).toLowerCase()) || asText(sk).toLowerCase().includes(asText(s).toLowerCase()))
      ) || asText(job.title).toLowerCase().includes((searchParams.get("q") ?? "").toLowerCase());
      return matchesQuery && matchesType && matchesLocation && matchesRemote && matchesPay && matchesFloor && matchesSkills;
    })
    .sort((a, b) => b.match_score - a.match_score || a.title.localeCompare(b.title));

  return (
    <main className="min-h-screen bg-[#f7fbf9]">
      <div className="mx-auto max-w-[1180px] px-5 py-8">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">JOB MATCHES</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Find your next role</h1>
          <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">
            {loading ? "Loading opportunities…" : `${filtered.length} job${filtered.length !== 1 ? "s" : ""} ranked by skill match`}
          </p>
        </div>

        {/* Recommendation banner — shown when arriving from CareerCoach */}
        {isRecommendedMode && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-[#cfe6db] bg-[#eaf6f0] px-5 py-3.5">
            <div className="flex items-center gap-2.5 text-[13px] font-medium text-[#146c45]">
              <Sparkles size={15} className="shrink-0" />
              Showing jobs matched to <strong className="font-semibold">{searchParams.get("q") ?? "your target role"}</strong>
              {skillsFromCoach.length > 0 && (
                <span className="hidden sm:inline text-[#5b6b64]">
                  · skills: {skillsFromCoach.slice(0, 4).join(", ")}
                </span>
              )}
            </div>
            <Link to="/candidate/jobs" className="flex items-center gap-1 rounded-full border border-[#cfe6db] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5b6b64] hover:bg-[#f7fbf9] transition">
              <X size={12} /> Clear
            </Link>
          </div>
        )}

        {/* Search + filter bar */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a8b84]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by role, company, location, or skill…"
                className="w-full rounded-xl border border-[#e4eee9] bg-white py-3 pl-10 pr-4 text-[14px] text-[#12241c] placeholder-[#7a8b84] shadow-sm outline-none transition focus:border-[#146c45] focus:ring-2 focus:ring-[#146c45]/10"
              />
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} className="shrink-0 text-[#7a8b84]" />
              <div className="flex gap-1.5 overflow-x-auto">
                {EMPLOYMENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTypeFilter(type)}
                    className={`shrink-0 rounded-full px-3 py-2 text-[12px] font-semibold transition ${
                      typeFilter === type
                        ? "bg-[#146c45] text-white shadow-[0_4px_12px_-6px_rgba(20,108,69,0.8)]"
                        : "border border-[#d5e3dc] bg-white text-[#5b6b64] hover:border-[#b7cec3] hover:text-[#12241c]"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="rounded-full border border-[#d5e3dc] bg-white px-3 py-2 text-[12px] font-semibold text-[#5b6b64] outline-none focus:border-[#146c45]"
            >
              {locations.map((location) => (
                <option key={location} value={location}>{location === "All" ? "Any location" : location}</option>
              ))}
            </select>
            <select
              value={salaryFilter}
              onChange={(e) => setSalaryFilter(e.target.value)}
              className="rounded-full border border-[#d5e3dc] bg-white px-3 py-2 text-[12px] font-semibold text-[#5b6b64] outline-none focus:border-[#146c45]"
            >
              {SALARY_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{salaryFilterLabel(option.value)}</option>
              ))}
            </select>
            <select
              value={String(minMatch)}
              onChange={(e) => setMinMatch(Number(e.target.value))}
              className="rounded-full border border-[#d5e3dc] bg-white px-3 py-2 text-[12px] font-semibold text-[#5b6b64] outline-none focus:border-[#146c45]"
            >
              <option value="0">Any match</option>
              <option value="25">25%+ match</option>
              <option value="50">50%+ match</option>
              <option value="75">75%+ match</option>
            </select>
            <button
              type="button"
              onClick={() => setRemoteOnly((curr) => !curr)}
              className={`rounded-full px-3 py-2 text-[12px] font-semibold transition ${
                remoteOnly
                  ? "bg-[#146c45] text-white"
                  : "border border-[#d5e3dc] bg-white text-[#5b6b64] hover:border-[#b7cec3] hover:text-[#12241c]"
              }`}
            >
              Remote / hybrid
            </button>
          </div>
        </div>

        {/* Error */}
        {applyError && (
          <div className="mb-4 rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {applyError}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
                <div className="h-5 w-1/3 rounded-lg bg-[#eef3f0]" />
                <div className="mt-2 h-4 w-1/4 rounded-lg bg-[#eef3f0]" />
                <div className="mt-4 flex gap-2">
                  <div className="h-6 w-20 rounded-full bg-[#eef3f0]" />
                  <div className="h-6 w-24 rounded-full bg-[#eef3f0]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Job cards */}
        {!loading && (
          <div className="space-y-4">
            {filtered.length === 0 && (
              <div className="rounded-[22px] border border-white bg-white p-12 text-center shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
                <Search size={32} className="mx-auto text-[#c9d6cf]" />
                <p className="mt-3 font-semibold text-[#12241c]">No jobs found</p>
                <p className="mt-1 text-[13px] text-[#7a8b84]">Try adjusting your search or filters.</p>
              </div>
            )}

            {filtered.map((job) => {
              const isApplied = appliedJobs.has(job.id);
              const isApplying = applyingId === job.id;
              const isSaved = savedJobs.has(job.id);
              const isSaving = savingId === job.id;

              return (
                <article
                  key={job.id}
                  className="group rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] transition hover:border-[#cfe6db] hover:shadow-[0_18px_40px_-28px_rgba(18,50,36,0.28)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef3f0]">
                          <Building2 size={18} className="text-[#5b6b64]" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-[family-name:var(--font-display)] text-[17px] font-semibold text-[#12241c]">
                            <Link
                              to={`/candidate/jobs/${job.id}`}
                              className="cursor-pointer underline-offset-2 transition duration-200 hover:text-[#146c45] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#146c45]/20 rounded-sm"
                            >
                              {job.title}
                            </Link>
                          </h2>
                          {job.company_name && (
                            <p className="text-[13px] text-[#5b6b64]">{job.company_name}</p>
                          )}
                        </div>
                        <span className="ml-auto rounded-full bg-[#eaf6f0] px-2.5 py-1 text-[11px] font-bold text-[#146c45]">
                          {job.match_score}% match
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3 text-[13px] text-[#5b6b64]">
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-[#7a8b84]" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} className="text-[#7a8b84]" />
                          {job.employment_type}
                        </span>
                        {job.salary_range && (
                          <span className="flex items-center gap-1.5">
                            <DollarSign size={14} className="text-[#7a8b84]" />
                            {formatSalaryRange(job.salary_range)}
                          </span>
                        )}
                      </div>

                      {(job.skills ?? []).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(job.skills ?? []).slice(0, 6).map((skill) => {
                            const skillLabel = asText(skill);
                            const isStrength = (job.strengths ?? []).some((item) => {
                              const strength = asText(item).toLowerCase();
                              const label = skillLabel.toLowerCase();
                              return label.includes(strength) || strength.includes(label);
                            });
                            return (
                              <span
                                key={skillLabel}
                                className={`rounded-full border px-2.5 py-1 text-[12px] font-medium ${
                                  isStrength
                                    ? "border-[#cfe6db] bg-[#eaf6f0] text-[#146c45]"
                                    : "border-[#e4eee9] bg-[#f7fbf9] text-[#5b6b64]"
                                }`}
                              >
                                {skillLabel}
                              </span>
                            );
                          })}
                          {(job.skills ?? []).length > 6 && (
                            <span className="rounded-full border border-[#e4eee9] bg-[#f7fbf9] px-2.5 py-1 text-[12px] font-medium text-[#7a8b84]">
                              +{(job.skills ?? []).length - 6} more
                            </span>
                          )}
                        </div>
                      )}
                      {(job.strengths.length > 0 || job.gaps.length > 0) && (
                        <div className="mt-3 grid gap-2 text-[12px] sm:grid-cols-2">
                          {job.strengths.length > 0 && (
                            <p className="text-[#146c45]"><span className="font-semibold">Strengths:</span> {job.strengths.join(" · ")}</p>
                          )}
                          {job.gaps.length > 0 && (
                            <p className="text-amber-700"><span className="font-semibold">Gaps:</span> {job.gaps.join(" · ")}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Apply + save */}
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        disabled={!userId || isSaving}
                        onClick={() => void toggleSave(job.id)}
                        title={isSaved ? "Remove from saved" : "Save job"}
                        className={`grid h-10 w-10 place-items-center rounded-full border transition ${
                          isSaved
                            ? "border-[#cfe6db] bg-[#eaf6f0] text-[#146c45]"
                            : "border-[#d5e3dc] bg-white text-[#7a8b84] hover:border-[#b7cec3] hover:text-[#146c45]"
                        } disabled:opacity-60`}
                      >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                      </button>
                      {isApplied ? (
                        <div className="flex items-center gap-2 rounded-full bg-[#eaf6f0] px-4 py-2.5 text-[13px] font-semibold text-[#146c45]">
                          <CheckCircle2 size={16} />
                          Applied
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isApplying}
                          onClick={() => openApply(job)}
                          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[#146c45] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] transition duration-200 hover:bg-[#0f5a39] disabled:opacity-60"
                        >
                          {isApplying ? (
                            <>
                              <Loader2 size={15} className="animate-spin" />
                              Applying…
                            </>
                          ) : (
                            <>
                              <Briefcase size={15} />
                              Apply now
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {formatJobSnippet(job.description) && (
                    <p className="mt-4 line-clamp-2 text-[13px] leading-relaxed text-[#5b6b64] border-t border-[#eef3f0] pt-4">
                      {formatJobSnippet(job.description)}
                    </p>
                  )}
                </article>
              );
            })}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                  className="inline-flex items-center gap-2 rounded-full border border-[#cfe6db] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#146c45] shadow-sm transition hover:bg-[#eaf6f0] disabled:opacity-60"
                >
                  {loadingMore ? <Loader2 size={15} className="animate-spin" /> : null}
                  {loadingMore ? "Loading…" : "Load more jobs"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {applyJob && (
        <JobApplyModal
          job={{ id: applyJob.id, title: applyJob.title, company_name: applyJob.company_name }}
          prefill={applyPrefill}
          submitting={applyingId === applyJob.id}
          error={applyError}
          onClose={() => {
            if (applyingId !== applyJob.id) setApplyJob(null);
          }}
          onSubmit={(payload) => void submitApplication(payload)}
        />
      )}
    </main>
  );
}

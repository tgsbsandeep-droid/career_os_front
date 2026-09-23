import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronLeft,
  Clock,
  DollarSign,
  Loader2,
  MapPin,
} from "lucide-react";
import { apiRequest, supabase } from "../../services/api";
import JobApplyModal, { type ApplyPrefill, type JobApplicationPayload } from "../../components/JobApplyModal";
import { formatSalaryRange } from "../../utils/salary";

type ApiJob = {
  id: string;
  title: string;
  company_name: string;
  location: string;
  employment_type: string;
  experience_level?: string;
  skills: string[];
  salary_range?: string;
  description?: string;
  status?: string;
};

type CandidateProfile = {
  full_name?: string;
  contact_email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  resume_url?: string;
};

const EXPERIENCE_LABELS: Record<string, string> = {
  entry: "Entry level",
  mid: "Mid-level",
  senior: "Senior",
  lead: "Lead",
  executive: "Executive",
};

function experienceLabel(value?: string) {
  const key = String(value ?? "").toLowerCase();
  if (!key) return "";
  return EXPERIENCE_LABELS[key] ?? value ?? "";
}

function asText(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

function asSkillList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => asText(item).trim()).filter(Boolean);
  const text = asText(value).trim();
  if (!text) return [];
  return text.split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
}

function formatJobDescription(value: unknown) {
  return asText(value)
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\s*-{3,}\s*/g, "\n\n")
    .replace(/\*\*([^*]+):\*\*/g, "\n$1: ")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function JobDescription({ text }: { text: unknown }) {
  const formatted = formatJobDescription(text);
  if (!formatted) {
    return <p className="text-[15px] leading-7 text-[#5b6b64]">No description provided.</p>;
  }
  const lines = formatted.split("\n");
  return (
    <div className="space-y-3 text-[15px] leading-7 text-[#3d4d46]">
      {lines.map((line, index) => {
        const content = asText(line);
        if (!content.trim()) return <div key={index} className="h-2" />;
        const labeled = content.match(/^([A-Za-z][A-Za-z /]{1,28}):\s*(.*)$/);
        if (labeled) {
          return (
            <p key={index}>
              <span className="font-semibold text-[#12241c]">{labeled[1]}: </span>
              {asText(labeled[2])}
            </p>
          );
        }
        return <p key={index} className="whitespace-pre-wrap">{content}</p>;
      })}
    </div>
  );
}

export default function JobDetails() {
  const { jobId } = useParams();
  const [job, setJob] = useState<ApiJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<ApplyPrefill | null>(null);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      setError("Job not found");
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ job: jobRow }, userResponse] = await Promise.all([
          apiRequest<{ job: ApiJob }>(`/api/jobs/${jobId}`),
          supabase.auth.getUser(),
        ]);
        if (cancelled) return;
        setJob({
          ...jobRow,
          title: asText(jobRow.title),
          company_name: asText(jobRow.company_name) === "Company" ? "" : asText(jobRow.company_name),
          location: asText(jobRow.location),
          employment_type: asText(jobRow.employment_type) || "Full-time",
          experience_level: asText(jobRow.experience_level),
          skills: asSkillList(jobRow.skills),
          salary_range: asText(jobRow.salary_range),
          description: formatJobDescription(jobRow.description),
        });
        const user = userResponse.data.user;
        if (!user) return;
        setUserId(user.id);
        const [applicationsResponse, savedResponse, profileResponse] = await Promise.all([
          apiRequest<{ applications: { job_id: string }[] }>(`/api/candidate/${user.id}/applications`).catch(() => ({ applications: [] })),
          apiRequest<{ saved_jobs: { job_id: string }[] }>(`/api/candidate/${user.id}/saved-jobs`).catch(() => ({ saved_jobs: [] })),
          apiRequest<{ profile: CandidateProfile | null }>(`/api/candidate/${user.id}/profile`).catch(() => ({ profile: null })),
        ]);
        if (cancelled) return;
        setApplied(applicationsResponse.applications.some((row) => row.job_id === jobId));
        setSaved((savedResponse.saved_jobs ?? []).some((row) => row.job_id === jobId));
        const profile = profileResponse.profile;
        setPrefill({
          full_name: asText(profile?.full_name || user.user_metadata?.full_name),
          contact_email: asText(profile?.contact_email || user.email),
          phone: asText(profile?.phone),
          location: asText(profile?.location),
          linkedin_url: asText(profile?.linkedin_url),
          resume_url: asText(profile?.resume_url),
        });
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "Job not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function toggleSave() {
    if (!userId || !job) return;
    setSaving(true);
    setError(null);
    try {
      await apiRequest(`/api/candidate/${userId}/saved-jobs/${job.id}`, { method: saved ? "DELETE" : "POST" });
      setSaved((curr) => !curr);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitApplication(payload: JobApplicationPayload) {
    if (!job) return;
    setSubmitting(true);
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
      await apiRequest(`/api/jobs/${job.id}/apply`, {
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
      setApplied(true);
      setApplyOpen(false);
    } catch (err) {
      setApplyError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const level = experienceLabel(job?.experience_level);

  return (
    <main className="min-h-screen bg-[#f7fbf9]">
      <div className="mx-auto max-w-[860px] px-5 py-8">
        <Link
          to="/candidate/jobs"
          className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-[#146c45] transition duration-200 hover:text-[#0f5a39]"
        >
          <ChevronLeft size={16} /> Back to jobs
        </Link>

        {loading && (
          <div className="mt-8 rounded-[22px] border border-white bg-white p-8 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <div className="h-6 w-1/2 animate-pulse rounded-lg bg-[#eef3f0]" />
            <div className="mt-3 h-4 w-1/3 animate-pulse rounded-lg bg-[#eef3f0]" />
            <div className="mt-6 h-24 animate-pulse rounded-lg bg-[#eef3f0]" />
          </div>
        )}

        {!loading && error && !job && (
          <div className="mt-8 rounded-[22px] border border-red-200 bg-red-50 px-5 py-4 text-[14px] text-red-700">{error}</div>
        )}

        {!loading && job && (
          <article className="mt-6 rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#eef3f0]">
                  <Building2 size={20} className="text-[#5b6b64]" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-[family-name:var(--font-display)] text-[28px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">
                    {job.title}
                  </h1>
                  {job.company_name && (
                    <p className="mt-1 text-[15px] text-[#5b6b64]">{job.company_name}</p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={!userId || saving}
                  onClick={() => void toggleSave()}
                  title={saved ? "Remove from saved" : "Save job"}
                  aria-label={saved ? "Remove from saved" : "Save job"}
                  className={`grid h-11 w-11 cursor-pointer place-items-center rounded-full border transition duration-200 ${
                    saved
                      ? "border-[#cfe6db] bg-[#eaf6f0] text-[#146c45]"
                      : "border-[#d5e3dc] bg-white text-[#7a8b84] hover:border-[#b7cec3] hover:text-[#146c45]"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                </button>
                {applied ? (
                  <div className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#eaf6f0] px-5 text-[13px] font-semibold text-[#146c45]">
                    <CheckCircle2 size={16} /> Applied
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setApplyError(null);
                      setApplyOpen(true);
                    }}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[#146c45] px-5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] transition duration-200 hover:bg-[#0f5a39]"
                  >
                    <Briefcase size={15} /> Apply now
                  </button>
                )}
              </div>
            </div>

            {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>}

            <div className="mt-5 flex flex-wrap gap-3 text-[13px] text-[#5b6b64]">
              {job.location && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f7fbf9] px-3 py-1.5">
                  <MapPin size={14} className="text-[#7a8b84]" /> {job.location}
                </span>
              )}
              {job.employment_type && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f7fbf9] px-3 py-1.5">
                  <Clock size={14} className="text-[#7a8b84]" /> {job.employment_type}
                </span>
              )}
              {level && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f7fbf9] px-3 py-1.5">
                  {level}
                </span>
              )}
              {job.salary_range && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f7fbf9] px-3 py-1.5">
                  <DollarSign size={14} className="text-[#7a8b84]" /> {formatSalaryRange(job.salary_range)}
                </span>
              )}
            </div>

            {(job.skills ?? []).length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {(job.skills ?? []).map((skill) => (
                  <span key={skill} className="rounded-full border border-[#cfe6db] bg-[#eaf6f0] px-2.5 py-1 text-[12px] font-medium text-[#146c45]">
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {job.description && (
              <div className="mt-8 border-t border-[#eef3f0] pt-6">
                <p className="mb-4 text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">JOB DETAILS</p>
                <JobDescription text={job.description} />
              </div>
            )}
          </article>
        )}
      </div>

      {applyOpen && job && (
        <JobApplyModal
          job={{ id: job.id, title: job.title, company_name: job.company_name }}
          prefill={prefill}
          submitting={submitting}
          error={applyError}
          onClose={() => {
            if (!submitting) setApplyOpen(false);
          }}
          onSubmit={(payload) => void submitApplication(payload)}
        />
      )}
    </main>
  );
}

import { useEffect, useState } from "react";
import {
  Bookmark,
  BookmarkX,
  BookOpen,
  Briefcase,
  Building2,
  Clock,
  Loader2,
  MapPin,
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest, supabase } from "../../services/api";
import { formatSalaryRange } from "../../utils/salary";

type SavedJobRow = {
  id: string;
  job_id: string;
  created_at?: string;
  jobs?: {
    id?: string;
    title?: string;
    company_name?: string;
    location?: string;
    employment_type?: string;
    skills?: string[];
    salary_range?: string;
  } | null;
};

type SavedCourseRow = {
  id: string;
  course_id: string;
  created_at?: string;
  courses?: {
    id?: string;
    title?: string;
    provider?: string;
    instructor_name?: string;
    level?: string;
    duration?: string;
    certificate?: boolean;
  } | null;
};

export default function Saved() {
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<"jobs" | "courses">("jobs");
  const [jobs, setJobs] = useState<SavedJobRow[]>([]);
  const [courses, setCourses] = useState<SavedCourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      try {
        const [jobsRes, coursesRes] = await Promise.all([
          apiRequest<{ saved_jobs: SavedJobRow[] }>(`/api/candidate/${user.id}/saved-jobs`),
          apiRequest<{ saved_courses: SavedCourseRow[] }>(`/api/candidate/${user.id}/saved-courses`),
        ]);
        setJobs(jobsRes.saved_jobs ?? []);
        setCourses(coursesRes.saved_courses ?? []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  async function unsaveJob(jobId: string) {
    if (!userId) return;
    setBusyId(jobId);
    try {
      await apiRequest(`/api/candidate/${userId}/saved-jobs/${jobId}`, { method: "DELETE" });
      setJobs((curr) => curr.filter((row) => row.job_id !== jobId));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function unsaveCourse(courseId: string) {
    if (!userId) return;
    setBusyId(courseId);
    try {
      await apiRequest(`/api/candidate/${userId}/saved-courses/${courseId}`, { method: "DELETE" });
      setCourses((curr) => curr.filter((row) => row.course_id !== courseId));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7fbf9]">
      <div className="mx-auto max-w-[1180px] px-5 py-8 space-y-6">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">LIBRARY</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">
            Saved content
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#5b6b64]">
            Jobs and courses you bookmarked so you can come back to them later.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("jobs")}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
              tab === "jobs" ? "bg-[#146c45] text-white" : "border border-[#d5e3dc] bg-white text-[#5b6b64]"
            }`}
          >
            Jobs ({jobs.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("courses")}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
              tab === "courses" ? "bg-[#146c45] text-white" : "border border-[#d5e3dc] bg-white text-[#5b6b64]"
            }`}
          >
            Courses ({courses.length})
          </button>
        </div>

        {error && (
          <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-[#146c45]" />
          </div>
        ) : tab === "jobs" ? (
          jobs.length === 0 ? (
            <div className="rounded-[22px] border border-white bg-white p-12 text-center shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
              <Bookmark size={32} className="mx-auto text-[#c9d6cf]" />
              <p className="mt-3 font-semibold text-[#12241c]">No saved jobs</p>
              <p className="mt-1 text-[13px] text-[#7a8b84]">Bookmark a listing from Jobs to keep it here.</p>
              <Link to="/candidate/jobs" className="mt-4 inline-flex rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0f5a39]">
                Browse jobs
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((row) => {
                const job = row.jobs;
                return (
                  <article key={row.id} className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef3f0]">
                            <Building2 size={18} className="text-[#5b6b64]" />
                          </div>
                          <div>
                            <h2 className="font-[family-name:var(--font-display)] text-[17px] font-semibold text-[#12241c]">
                              <Link
                                to={`/candidate/jobs/${row.job_id}`}
                                className="cursor-pointer underline-offset-2 transition duration-200 hover:text-[#146c45] hover:underline"
                              >
                                {job?.title ?? "Job"}
                              </Link>
                            </h2>
                            <p className="text-[13px] text-[#5b6b64]">{job?.company_name ?? "Company"}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3 text-[13px] text-[#5b6b64]">
                          {job?.location && <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{job.location}</span>}
                          {job?.employment_type && <span className="inline-flex items-center gap-1.5"><Clock size={14} />{job.employment_type}</span>}
                          {job?.salary_range && <span>{formatSalaryRange(job.salary_range)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={`/candidate/jobs/${row.job_id}`} className="rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0f5a39]">
                          <span className="inline-flex items-center gap-2"><Briefcase size={14} /> View job</span>
                        </Link>
                        <button
                          type="button"
                          disabled={busyId === row.job_id}
                          onClick={() => void unsaveJob(row.job_id)}
                          className="inline-flex items-center gap-2 rounded-full border border-[#d5e3dc] px-4 py-2.5 text-[13px] font-semibold text-[#5b6b64] hover:border-red-200 hover:text-red-600 disabled:opacity-60"
                        >
                          {busyId === row.job_id ? <Loader2 size={14} className="animate-spin" /> : <BookmarkX size={14} />}
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : courses.length === 0 ? (
          <div className="rounded-[22px] border border-white bg-white p-12 text-center shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <BookOpen size={32} className="mx-auto text-[#c9d6cf]" />
            <p className="mt-3 font-semibold text-[#12241c]">No saved courses</p>
            <p className="mt-1 text-[13px] text-[#7a8b84]">Bookmark a course from the catalog to keep it here.</p>
            <Link to="/candidate/courses" className="mt-4 inline-flex rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0f5a39]">
              Browse courses
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {courses.map((row) => {
              const course = row.courses;
              return (
                <article key={row.id} className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-[#157a4f]">{course?.level ?? "COURSE"}</p>
                  <h2 className="mt-1 font-[family-name:var(--font-display)] text-[17px] font-semibold text-[#12241c]">{course?.title ?? "Course"}</h2>
                  <p className="mt-1 text-[13px] text-[#5b6b64]">{course?.instructor_name ?? course?.provider ?? "CareerOS"}</p>
                  <p className="mt-2 text-[13px] text-[#7a8b84]">{course?.duration ?? ""}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <Link to={`/candidate/courses/${row.course_id}`} className="rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0f5a39]">
                      Open course
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === row.course_id}
                      onClick={() => void unsaveCourse(row.course_id)}
                      className="inline-flex items-center gap-2 rounded-full border border-[#d5e3dc] px-4 py-2.5 text-[13px] font-semibold text-[#5b6b64] hover:border-red-200 hover:text-red-600 disabled:opacity-60"
                    >
                      {busyId === row.course_id ? <Loader2 size={14} className="animate-spin" /> : <BookmarkX size={14} />}
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

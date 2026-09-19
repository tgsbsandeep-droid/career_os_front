import { BriefcaseBusiness, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, supabase } from "../services/api";

type Job = { id: string; title: string; company_name: string; location: string; skills?: string[]; match_score?: number; strengths?: string[]; gaps?: string[] };
type Course = { id: string; title: string; provider: string; level: string; description?: string; skills?: string[] };

function matches(candidateSkills: string[], searchableText: string[]) {
  return candidateSkills.length > 0 && searchableText.some((value) => candidateSkills.some((skill) => value.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(value.toLowerCase())));
}

export default function SkillRecommendations() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const [profileResponse, jobsResponse, recommendedResponse, coursesResponse] = await Promise.allSettled([
        apiRequest<{ profile: { skills?: string[] } | null }>(`/api/candidate/${data.user.id}/profile`),
        apiRequest<{ jobs: Job[] }>("/api/jobs"),
        apiRequest<{ jobs: Job[] }>("/api/jobs/recommended"),
        apiRequest<{ courses: Course[] }>("/api/courses"),
      ]);
      const skills = profileResponse.status === "fulfilled" ? profileResponse.value.profile?.skills ?? [] : [];
      const jobRecords = jobsResponse.status === "fulfilled" ? jobsResponse.value.jobs : [];
      const recommendedJobs = recommendedResponse.status === "fulfilled" ? recommendedResponse.value.jobs : [];
      const courseRecords = coursesResponse.status === "fulfilled" ? coursesResponse.value.courses : [];
      const matchedJobs = (recommendedJobs.length ? recommendedJobs : jobRecords.filter((job) => matches(skills, job.skills ?? []))).slice(0, 3);
      const matchedCourses = courseRecords.filter((course) => matches(skills, [...(course.skills ?? []), course.title, course.description ?? ""])).slice(0, 3);
      setJobs(matchedJobs);
      setCourses(matchedCourses);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <section className="rounded-2xl border bg-white p-6 text-sm text-slate-500">Finding opportunities for your skills...</section>;
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-center gap-2">
          <BriefcaseBusiness size={19} className="text-emerald-600" />
          <h2 className="text-xl font-semibold">Jobs for your skills</h2>
        </div>
        <div className="mt-4 space-y-3">
          {jobs.length ? jobs.map((job) => (
            <Link key={job.id} to={`/candidate/jobs/${job.id}`} className="block rounded-xl border p-4 hover:border-emerald-300">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{job.title}</p>
                {typeof job.match_score === "number" && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{job.match_score}%</span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">{job.company_name} · {job.location}</p>
              <p className="mt-2 text-xs text-slate-600">{(job.strengths?.length ? job.strengths : job.skills)?.join(" · ") || "Open opportunity"}</p>
            </Link>
          )) : <p className="text-sm text-slate-500">No matching jobs yet. Add skills to your profile to improve recommendations.</p>}
        </div>
      </div>
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-center gap-2">
          <BookOpen size={19} className="text-emerald-600" />
          <h2 className="text-xl font-semibold">Courses for your skills</h2>
        </div>
        <div className="mt-4 space-y-3">
          {courses.length ? courses.map((course) => (
            <Link key={course.id} to="/candidate/courses" className="block rounded-xl border p-4 hover:border-emerald-300">
              <p className="font-semibold">{course.title}</p>
              <p className="mt-1 text-sm text-slate-500">{course.provider} · {course.level}</p>
            </Link>
          )) : <p className="text-sm text-slate-500">No published courses are available yet.</p>}
        </div>
      </div>
    </section>
  );
}

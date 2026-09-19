type Student = {
  id: string;
  candidate_id: string;
  progress: number;
  profile: {
    full_name?: string;
    education?: string;
    skills?: string[];
    experience?: string[];
    resume_url?: string | null;
  } | null;
};

export default function TutorStudentDetails({ students }: { students: Student[] }) {
  if (!students.length) return null;

  return (
    <section className="rounded-2xl border bg-white p-6 lg:col-span-3">
      <h2 className="text-xl font-semibold">Enrolled student details</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {students.map((student) => (
          <article key={student.id} className="rounded-xl bg-slate-50 p-4">
            <p className="font-semibold">{student.profile?.full_name || `Candidate ${student.candidate_id.slice(0, 8)}`}</p>
            <p className="mt-1 text-sm text-slate-600">Progress: {student.progress}%</p>
            <p className="mt-2 text-sm text-slate-600">{student.profile?.education ?? "Education not provided"}</p>
            <p className="mt-1 text-sm text-slate-600">{student.profile?.skills?.join(" · ") || "Skills not provided"}</p>
            <p className="mt-1 text-sm text-slate-600">{student.profile?.experience?.join(" · ") || "Experience not provided"}</p>
            {student.profile?.resume_url && <a href={student.profile.resume_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-emerald-700 hover:underline">View resume</a>}
          </article>
        ))}
      </div>
    </section>
  );
}

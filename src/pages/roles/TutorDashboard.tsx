import {
  BarChart3,
  BookOpen,
  Plus,
  Users,
  TrendingUp,
  Video,
  PlayCircle,
  CheckCircle2,
  Circle,
  Star,
  Award,
  DollarSign,
  Eye,
  Clock,
  Target,
  Zap,
  MapPin,
  Trash2,
  HelpCircle,
  ClipboardList,
  BadgeCheck,
  Sparkles,
  Loader2,
  UserCheck,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiRequest, supabase } from "../../services/api";
import RoleMenu from "../../components/RoleMenu";
import AcademyProfileForm, { academyProfileFromApi, emptyAcademyProfile, type AcademyProfile } from "../../components/TutorProfileForm";
import ImageUpload from "../../components/ImageUpload";
import CourseModuleEditor, { CourseModule } from "../../components/CourseModuleEditor";
import LiveBatchEditor, { LiveBatch } from "../../components/LiveBatchEditor";

type View = "dashboard" | "profile" | "courses" | "students" | "analytics" | "offline" | "quizzes" | "assignments" | "certificates" | "ai-content" | "attendance";
type Student = { id: string; candidate_id: string; progress: number; profile: { full_name?: string; skills?: string[]; contact_email?: string } | null };
type Course = {
  id: string; title: string; description: string; syllabus: string; skills: string[];
  thumbnail_url?: string | null; provider: string; level: string; duration: string;
  status: "draft" | "published"; modules: CourseModule[]; delivery_type: "self_paced" | "live";
  live_batches?: LiveBatch[]; price?: number; is_free?: boolean; certificate?: boolean;
  what_you_learn?: string[]; requirements?: string[];
  rating?: number; review_count?: number;
};
type CourseForm = Omit<Course, "id" | "thumbnail_url"> & { id?: string; thumbnail_url: string };

const emptyCourse: CourseForm = {
  title: "", description: "", syllabus: "", skills: [], thumbnail_url: "", provider: "",
  level: "Beginner", duration: "", status: "draft", modules: [], delivery_type: "self_paced",
  live_batches: [], price: 0, is_free: true, certificate: false, what_you_learn: [], requirements: [],
};
const skillSuggestions = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "SQL", "AWS",
  "Docker", "Data analysis", "UI/UX design", "Communication", "Leadership", "Project management",
];

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

const COURSE_SKILL_GROUPS: Array<{ match: RegExp; skills: string[] }> = [
  { match: /react|frontend|front.?end|javascript/i, skills: ["JavaScript", "TypeScript", "React", "HTML", "CSS", "Next.js"] },
  { match: /node|backend|back.?end|api/i, skills: ["Node.js", "TypeScript", "REST APIs", "PostgreSQL", "Express"] },
  { match: /full.?stack|fullstack/i, skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "REST APIs", "Git"] },
  { match: /python/i, skills: ["Python", "Pandas", "NumPy", "SQL", "Git"] },
  { match: /data|analytics|sql|tableau|power bi/i, skills: ["SQL", "Excel", "Tableau", "Python", "Power BI", "Statistics"] },
  { match: /aws|cloud|devops|docker|kubernetes/i, skills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux", "Terraform"] },
  { match: /ui|ux|figma|design/i, skills: ["Figma", "UI Design", "User Research", "Prototyping", "Wireframing", "Design Systems"] },
  { match: /communicat|leadership|soft skill|interview/i, skills: ["Communication", "Leadership", "Presentation", "Stakeholder Management"] },
  { match: /java\b/i, skills: ["Java", "Spring", "SQL", "REST APIs", "Git"] },
  { match: /product|agile|scrum/i, skills: ["Product Strategy", "Agile", "Roadmapping", "User Research", "Communication"] },
];

function suggestSkillsForTitle(title: string) {
  const text = title.trim();
  if (!text) return skillSuggestions.slice(0, 8);
  const matched: string[] = [];
  for (const group of COURSE_SKILL_GROUPS) {
    if (group.match.test(text)) matched.push(...group.skills);
  }
  return uniqueSkills(matched.length ? matched : skillSuggestions).slice(0, 12);
}

function courseFee(item: Pick<Course, "is_free" | "price">) {
  const price = Number(item.price ?? 0);
  const paid = item.is_free === false && Number.isFinite(price) && price > 0;
  return { is_free: !paid, price: paid ? price : 0 };
}

function normalizeCourse(item: Course): Course {
  return {
    ...item,
    skills: item.skills ?? [], modules: item.modules ?? [],
    live_batches: item.live_batches ?? [], delivery_type: item.delivery_type ?? "self_paced",
    what_you_learn: item.what_you_learn ?? [], requirements: item.requirements ?? [],
    ...courseFee(item),
  };
}

function courseWritePayload(course: CourseForm, status: "draft" | "published") {
  const pricing = courseFee(course);
  return {
    title: course.title,
    description: course.description,
    syllabus: course.syllabus,
    skills: course.skills ?? [],
    thumbnail_url: course.thumbnail_url || null,
    modules: course.delivery_type === "live" ? [] : course.modules ?? [],
    delivery_type: course.delivery_type,
    provider: course.provider,
    level: course.level,
    duration: course.duration,
    status,
    certificate: course.certificate !== false,
    is_free: pricing.is_free,
    price: pricing.price,
  };
}

function progressFor(students: Student[]) {
  return students.length ? Math.round(students.reduce((sum, s) => sum + s.progress, 0) / students.length) : 0;
}

export default function TutorDashboard({ view = "dashboard" }: { view?: View }) {
  const navigate = useNavigate();
  const location = useLocation();
  const editCourseId = (location.state as { editCourseId?: string } | null)?.editCourseId;
  const [userId, setUserId]       = useState("");
  const [profile, setProfile]     = useState<AcademyProfile>(emptyAcademyProfile);
  const [courses, setCourses]     = useState<Course[]>([]);
  const [course, setCourse]       = useState(emptyCourse);
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [studentsByCourse, setStudentsByCourse] = useState<Record<string, Student[]>>({});
  const [message, setMessage]     = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) { navigate("/login", { replace: true }); return; }
      setUserId(user.id);
      void Promise.all([
        apiRequest<{ profile: Parameters<typeof academyProfileFromApi>[0] }>(`/api/academies/${user.id}/profile`),
        apiRequest<{ courses: Course[] }>("/api/courses/mine"),
      ]).then(async ([profileRes, courseRes]) => {
        if (profileRes.profile) setProfile(academyProfileFromApi(profileRes.profile));
        const loaded = courseRes.courses.map(normalizeCourse);
        setCourses(loaded);
        if (editCourseId) {
          const match = loaded.find((item) => item.id === editCourseId);
          if (match) {
            setCourse({ ...match, thumbnail_url: match.thumbnail_url ?? "" });
            setCourseFormOpen(true);
          }
        }
        const entries = await Promise.all(
          loaded.map(async (c) => [c.id, (await apiRequest<{ students: Student[] }>(`/api/courses/${c.id}/students`)).students] as const)
        );
        setStudentsByCourse(Object.fromEntries(entries));
      }).catch((err: Error) => setMessage({ text: err.message, type: "error" }));
    });
  }, [navigate]);

  async function saveCourse(event: React.FormEvent) {
    event.preventDefault();
    const editing = Boolean(course.id);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const status = submitter instanceof HTMLButtonElement && submitter.value === "published" ? "published" : "draft";
    try {
      const res = await apiRequest<{ course: Course }>(
        editing ? `/api/courses/${course.id}` : "/api/courses",
        { method: editing ? "PUT" : "POST", body: JSON.stringify(courseWritePayload(course, status)) }
      );
      const saved = normalizeCourse(res.course);
      setCourses((curr) => editing ? curr.map((c) => c.id === saved.id ? saved : c) : [saved, ...curr]);
      setCourse(emptyCourse);
      setCourseFormOpen(false);
      setMessage({ text: saved.status === "published" ? "Course published successfully!" : "Course saved as draft.", type: "success" });
    } catch (err) {
      setMessage({ text: (err as Error).message, type: "error" });
    }
  }

  function openNewCourse() {
    setCourse(emptyCourse);
    setCourseFormOpen(true);
  }

  function openCourse(item: Course) {
    setCourse({ ...normalizeCourse(item), thumbnail_url: item.thumbnail_url ?? "" });
    setCourseFormOpen(true);
  }

  function closeCourseForm() {
    setCourseFormOpen(false);
    setCourse(emptyCourse);
  }

  async function deleteCourse(item: Pick<Course, "id" | "title">) {
    if (!item.id) return;
    const label = item.title?.trim() || "this course";
    if (!window.confirm(`Delete ${label}? Learners will lose access and live batches will be removed.`)) return;
    try {
      await apiRequest(`/api/courses/${item.id}`, { method: "DELETE" });
      setCourses((curr) => curr.filter((course) => course.id !== item.id));
      setStudentsByCourse((curr) => {
        const next = { ...curr };
        delete next[item.id];
        return next;
      });
      if (course.id === item.id) closeCourseForm();
      setMessage({ text: "Course deleted.", type: "success" });
    } catch (err) {
      setMessage({ text: (err as Error).message, type: "error" });
    }
  }

  async function logout() { await supabase.auth.signOut(); navigate("/login", { replace: true }); }

  const publishedCourses = courses.filter((c) => c.status === "published");
  const allStudents      = Object.values(studentsByCourse).flat();
  const uniqueStudents   = new Set(allStudents.map((s) => s.candidate_id)).size;
  const averageProgress  = allStudents.length ? Math.round(allStudents.reduce((sum, s) => sum + s.progress, 0) / allStudents.length) : 0;
  const totalRevenue     = courses.reduce((sum, c) => sum + ((c.price ?? 0) * (studentsByCourse[c.id]?.length ?? 0)), 0);

  return (
    <main id="main" className="min-h-dvh bg-[#f7fbf9]">
      <a href="#main" className="skip-link">Skip to content</a>
      <RoleMenu
        homeTo="/academy/dashboard"
        brand="Academy"
        onLogout={() => void logout()}
        profileTo="/academy/profile"
        primary={[
          { to: "/academy/dashboard", icon: <BarChart3 size={16} />, label: "Home" },
          { to: "/academy/courses",   icon: <BookOpen size={16} />,  label: "Courses" },
          { to: "/academy/students",  icon: <Users size={16} />,     label: "Learners" },
        ]}
        groups={[
          {
            id: "classroom",
            label: "Classroom",
            icon: <ClipboardList size={16} />,
            items: [
              { to: "/academy/attendance",   icon: <UserCheck size={16} />,     label: "Attendance" },
              { to: "/academy/quizzes",      icon: <HelpCircle size={16} />,    label: "Quizzes" },
              { to: "/academy/assignments",  icon: <ClipboardList size={16} />, label: "Assignments" },
              { to: "/academy/certificates", icon: <BadgeCheck size={16} />,    label: "Certificates" },
              { to: "/academy/offline",      icon: <MapPin size={16} />,        label: "Offline" },
              { to: "/academy/ai-content",   icon: <Sparkles size={16} />,      label: "AI content" },
              { to: "/academy/analytics",    icon: <TrendingUp size={16} />,    label: "Analytics" },
            ],
          },
        ]}
      />

      <div className="mx-auto max-w-[1180px] space-y-6 px-5 py-8">
        {message && (
          <div className={`flex items-center gap-2 rounded-[22px] border px-4 py-3 text-[13px] font-medium ${
            message.type === "success"
              ? "border-[#cfe6db] bg-[#eaf6f0] text-[#146c45]"
              : "border-red-200 bg-red-50 text-red-700"
          }`}>
            {message.type === "success" && <CheckCircle2 size={16} />}
            {message.text}
          </div>
        )}

        {view === "dashboard" && (
          <Overview
            courses={publishedCourses}
            studentsByCourse={studentsByCourse}
            uniqueStudents={uniqueStudents}
            averageProgress={averageProgress}
            totalRevenue={totalRevenue}
            navigate={navigate}
            onEdit={(item) => navigate("/academy/courses", { state: { editCourseId: item.id } })}
          />
        )}
        {view === "profile" && (
          <ProfileView userId={userId} profile={profile} onChange={setProfile} onMessage={(text, type = "success") => setMessage({ text, type })} />
        )}
        {view === "courses" && (
          <CoursesView
            courses={courses}
            course={course}
            setCourse={setCourse}
            courseFormOpen={courseFormOpen}
            onOpenNew={openNewCourse}
            onOpenCourse={openCourse}
            onCloseForm={closeCourseForm}
            onDeleteCourse={deleteCourse}
            userId={userId}
            saveCourse={saveCourse}
            studentsByCourse={studentsByCourse}
          />
        )}
        {view === "students" && (
          <StudentsView courses={courses} studentsByCourse={studentsByCourse} />
        )}
        {view === "analytics" && (
          <AnalyticsView
            courses={courses}
            studentsByCourse={studentsByCourse}
            uniqueStudents={uniqueStudents}
            averageProgress={averageProgress}
            totalRevenue={totalRevenue}
          />
        )}
        {view === "offline"       && <OfflineTrainingView courses={courses} />}
        {view === "quizzes"       && <QuizBuilderView courses={courses} />}
        {view === "assignments"   && <AssignmentsView courses={courses} />}
        {view === "certificates"  && <CertificatesView courses={courses} studentsByCourse={studentsByCourse} />}
        {view === "ai-content"    && <AIContentView />}
        {view === "attendance"    && <AttendanceView courses={courses} studentsByCourse={studentsByCourse} />}
      </div>
    </main>
  );
}

/* ─── Overview ─── */
function Overview({ courses, studentsByCourse, uniqueStudents, averageProgress, totalRevenue, navigate, onEdit }: {
  courses: Course[];
  studentsByCourse: Record<string, Student[]>;
  uniqueStudents: number;
  averageProgress: number;
  totalRevenue: number;
  navigate: (path: string) => void;
  onEdit: (course: Course) => void;
}) {
  return (
    <>
      <div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">ACADEMY DASHBOARD</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">
          Your teaching at a glance
        </h1>
        <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Monitor course reach, learner progress, and published programs.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<BookOpen size={20} />}    label="Published courses"  value={courses.length}          color="violet" />
        <Metric icon={<Users size={20} />}        label="Students enrolled"  value={uniqueStudents}           color="blue" />
        <Metric icon={<TrendingUp size={20} />}   label="Avg. progress"      value={`${averageProgress}%`}   color="emerald" />
        <Metric icon={<DollarSign size={20} />}   label="Est. revenue"       value={`₹${totalRevenue.toLocaleString()}`} color="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <Panel
          title="Published courses"
          action={
            <button type="button" onClick={() => navigate("/academy/courses")} className="text-[13px] font-semibold text-[#146c45] hover:text-[#0f5a39]">
              Manage courses
            </button>
          }
        >
          {courses.length ? courses.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => { onEdit(item); navigate("/academy/courses"); }}
              className="mb-3 flex w-full items-center justify-between rounded-xl border border-[#eef3f0] p-4 text-left transition hover:border-[#cfe6db] hover:bg-[#f7fbf9]"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.delivery_type === "live" ? "bg-violet-100" : "bg-[#eaf6f0]"}`}>
                  {item.delivery_type === "live" ? <Video size={16} className="text-violet-600" /> : <PlayCircle size={16} className="text-[#146c45]" />}
                </div>
                <div>
                  <p className="font-semibold text-[#12241c] text-[14px]">{item.title}</p>
                  <p className="mt-0.5 text-[12px] text-[#5b6b64]">
                    {studentsByCourse[item.id]?.length ?? 0} enrolled · {item.delivery_type === "live" ? "Live" : "Self-paced"}
                    {item.rating !== undefined && ` · ★ ${item.rating.toFixed(1)}`}
                  </p>
                </div>
              </div>
              <span className="text-[12px] font-semibold text-[#146c45]">Open →</span>
            </button>
          )) : <Empty text="Publish your first course to see it here." />}
        </Panel>

        <Panel title="Learner progress">
          {courses.length ? courses.map((item) => (
            <div key={item.id} className="mb-4">
              <div className="flex justify-between text-[13px]">
                <span className="font-medium text-[#12241c] truncate max-w-[160px]">{item.title}</span>
                <span className="text-[#5b6b64] shrink-0">{progressFor(studentsByCourse[item.id] ?? [])}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eef3f0]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#146c45] to-[#157a62] transition-all"
                  style={{ width: `${progressFor(studentsByCourse[item.id] ?? [])}%` }}
                />
              </div>
            </div>
          )) : <Empty text="Progress will appear as candidates enrol." />}
        </Panel>
      </div>
    </>
  );
}

/* ─── Students view ─── */
function StudentsView({ courses, studentsByCourse }: {
  courses: Course[];
  studentsByCourse: Record<string, Student[]>;
}) {
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");

  const allStudentRows = courses.flatMap((c) =>
    (studentsByCourse[c.id] ?? []).map((s) => ({ course: c, student: s }))
  );

  const filtered = allStudentRows.filter(({ course, student }) => {
    const name = student.profile?.full_name?.toLowerCase() ?? "";
    const matchesSearch = !search || name.includes(search.toLowerCase());
    const matchesCourse = filterCourse === "all" || course.id === filterCourse;
    return matchesSearch && matchesCourse;
  });

  return (
    <>
      <div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">STUDENT MANAGEMENT</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">
          Your learners
        </h1>
        <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">
          {filtered.length} student{filtered.length !== 1 ? "s" : ""} across {courses.length} course{courses.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students…"
          className="rounded-xl border border-[#e4eee9] bg-white px-4 py-2.5 text-[13px] text-[#12241c] placeholder-[#7a8b84] outline-none focus:border-[#146c45] shadow-sm"
        />
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="rounded-xl border border-[#e4eee9] bg-white px-4 py-2.5 text-[13px] text-[#3d4d46] outline-none focus:border-[#146c45] shadow-sm"
        >
          <option value="all">All courses</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[22px] border border-white bg-white p-12 text-center shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
          <Users size={36} className="mx-auto text-[#c9d6cf]" />
          <p className="mt-3 font-semibold text-[#12241c]">No students found</p>
          <p className="mt-1 text-[13px] text-[#7a8b84]">Students will appear here once they enrol in your courses.</p>
        </div>
      ) : (
        <div className="rounded-[22px] border border-white bg-white shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#eef3f0] bg-[#f7fbf9]">
                <th className="px-5 py-3.5 text-left font-semibold text-[#5b6b64]">Student</th>
                <th className="px-5 py-3.5 text-left font-semibold text-[#5b6b64]">Course</th>
                <th className="px-5 py-3.5 text-left font-semibold text-[#5b6b64]">Progress</th>
                <th className="px-5 py-3.5 text-left font-semibold text-[#5b6b64]">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ course, student }) => (
                <tr key={`${course.id}-${student.id}`} className="border-b border-[#eef3f0] last:border-0 hover:bg-[#f7fbf9] transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eaf6f0] text-[13px] font-bold text-[#146c45]">
                        {(student.profile?.full_name ?? "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[#12241c]">{student.profile?.full_name ?? `Student ${student.candidate_id.slice(0, 8)}`}</p>
                        {student.profile?.contact_email && (
                          <p className="text-[11px] text-[#7a8b84]">{student.profile.contact_email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-[#12241c] max-w-[180px] truncate">{course.title}</p>
                    <p className="text-[11px] text-[#7a8b84]">{course.delivery_type === "live" ? "Live" : "Self-paced"}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 overflow-hidden rounded-full bg-[#eef3f0]">
                        <div className="h-full rounded-full bg-[#146c45]" style={{ width: `${student.progress}%` }} />
                      </div>
                      <span className="font-semibold text-[#12241c]">{student.progress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      student.progress === 100
                        ? "bg-[#d4ede2] text-[#146c45]"
                        : student.progress > 0
                          ? "bg-blue-100 text-blue-700"
                          : "bg-[#eef3f0] text-[#5b6b64]"
                    }`}>
                      {student.progress === 100 ? "Completed" : student.progress > 0 ? "In progress" : "Not started"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ─── Analytics view ─── */
function AnalyticsView({ courses, studentsByCourse, uniqueStudents, averageProgress, totalRevenue }: {
  courses: Course[];
  studentsByCourse: Record<string, Student[]>;
  uniqueStudents: number;
  averageProgress: number;
  totalRevenue: number;
}) {
  const publishedCourses = courses.filter((c) => c.status === "published");
  const draftCourses     = courses.filter((c) => c.status === "draft");
  const completedStudents = Object.values(studentsByCourse).flat().filter((s) => s.progress === 100).length;

  return (
    <>
      <div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">ANALYTICS</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">
          Performance overview
        </h1>
        <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Track your course performance, revenue, and learner outcomes.</p>
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<BookOpen size={20} />}    label="Total courses"       value={courses.length}                    color="violet" />
        <Metric icon={<Users size={20} />}        label="Total students"      value={uniqueStudents}                    color="blue" />
        <Metric icon={<Award size={20} />}        label="Completions"         value={completedStudents}                 color="emerald" />
        <Metric icon={<DollarSign size={20} />}   label="Est. revenue"        value={`₹${totalRevenue.toLocaleString()}`} color="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Course performance table */}
        <Panel title="Course performance">
          {publishedCourses.length === 0 ? (
            <Empty text="Publish courses to see performance data." />
          ) : (
            <div className="space-y-3">
              {publishedCourses.map((c) => {
                const students = studentsByCourse[c.id] ?? [];
                const avg = progressFor(students);
                const completed = students.filter((s) => s.progress === 100).length;
                const revenue = (c.price ?? 0) * students.length;
                return (
                  <div key={c.id} className="rounded-xl border border-[#eef3f0] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-[#12241c] text-[13px] max-w-[200px] truncate">{c.title}</p>
                      {c.rating !== undefined && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          <span className="text-[12px] font-semibold text-amber-600">{c.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-[#f7fbf9] p-2">
                        <p className="font-semibold text-[#12241c]">{students.length}</p>
                        <p className="text-[11px] text-[#7a8b84]">Students</p>
                      </div>
                      <div className="rounded-lg bg-[#f7fbf9] p-2">
                        <p className="font-semibold text-[#12241c]">{avg}%</p>
                        <p className="text-[11px] text-[#7a8b84]">Avg progress</p>
                      </div>
                      <div className="rounded-lg bg-[#f7fbf9] p-2">
                        <p className="font-semibold text-[#12241c]">{completed}</p>
                        <p className="text-[11px] text-[#7a8b84]">Completed</p>
                      </div>
                    </div>
                    {revenue > 0 && (
                      <p className="mt-2 text-[12px] font-semibold text-[#146c45]">₹{revenue.toLocaleString()} revenue</p>
                    )}
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eef3f0]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#146c45] to-[#157a62]" style={{ width: `${avg}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Summary stats */}
        <div className="space-y-4">
          <Panel title="Content breakdown">
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-[#f7fbf9] px-4 py-3">
                <div className="flex items-center gap-2 text-[13px] text-[#5b6b64]">
                  <PlayCircle size={15} className="text-[#146c45]" /> Self-paced courses
                </div>
                <span className="font-semibold text-[#12241c]">{courses.filter((c) => c.delivery_type === "self_paced").length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#f7fbf9] px-4 py-3">
                <div className="flex items-center gap-2 text-[13px] text-[#5b6b64]">
                  <Video size={15} className="text-violet-600" /> Live courses
                </div>
                <span className="font-semibold text-[#12241c]">{courses.filter((c) => c.delivery_type === "live").length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#f7fbf9] px-4 py-3">
                <div className="flex items-center gap-2 text-[13px] text-[#5b6b64]">
                  <Eye size={15} className="text-blue-600" /> Published
                </div>
                <span className="font-semibold text-[#12241c]">{publishedCourses.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#f7fbf9] px-4 py-3">
                <div className="flex items-center gap-2 text-[13px] text-[#5b6b64]">
                  <Clock size={15} className="text-amber-600" /> Drafts
                </div>
                <span className="font-semibold text-[#12241c]">{draftCourses.length}</span>
              </div>
            </div>
          </Panel>

          <Panel title="Learner outcomes">
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-[#f7fbf9] px-4 py-3">
                <div className="flex items-center gap-2 text-[13px] text-[#5b6b64]">
                  <Target size={15} className="text-[#146c45]" /> Avg. progress
                </div>
                <span className="font-semibold text-[#12241c]">{averageProgress}%</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#f7fbf9] px-4 py-3">
                <div className="flex items-center gap-2 text-[13px] text-[#5b6b64]">
                  <Award size={15} className="text-amber-500" /> Completions
                </div>
                <span className="font-semibold text-[#12241c]">{completedStudents}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#f7fbf9] px-4 py-3">
                <div className="flex items-center gap-2 text-[13px] text-[#5b6b64]">
                  <Zap size={15} className="text-violet-600" /> In progress
                </div>
                <span className="font-semibold text-[#12241c]">
                  {Object.values(studentsByCourse).flat().filter((s) => s.progress > 0 && s.progress < 100).length}
                </span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ─── Profile view ─── */
function ProfileView({ userId, profile, onChange, onMessage }: {
  userId: string;
  profile: AcademyProfile;
  onChange: (value: AcademyProfile) => void;
  onMessage: (value: string, type?: "success" | "error") => void;
}) {
  const checklist = [
    { done: Boolean(profile.display_name.trim()), text: "Display name" },
    { done: Boolean(profile.headline.trim()), text: "Headline" },
    { done: Boolean(profile.bio.trim()), text: "Professional bio" },
    { done: Boolean(profile.avatar_url), text: "Profile photo" },
    { done: Boolean(profile.location.trim()), text: "Location" },
    { done: Boolean(profile.preferred_teaching_mode), text: "Teaching mode" },
    { done: profile.languages.length > 0, text: "Languages" },
    { done: Boolean(profile.teaching_experience_years), text: "Years teaching" },
    { done: profile.expertise.length > 0, text: "Areas of expertise" },
    { done: profile.qualifications.length > 0, text: "Qualifications" },
    { done: profile.teaching_history.some((entry) => entry.role || entry.organization), text: "Teaching history" },
  ];
  const complete = checklist.filter((item) => item.done).length;
  return (
    <>
      <div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">PROFESSIONAL PROFILE</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Build trust with learners</h1>
        <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Share a complete teaching profile so learners can judge fit before they enrol.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <AcademyProfileForm userId={userId} profile={profile} onChange={onChange} onMessage={onMessage} />
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

/* ─── Courses view ─── */
function CoursesView({ courses, course, setCourse, courseFormOpen, onOpenNew, onOpenCourse, onCloseForm, onDeleteCourse, userId, saveCourse, studentsByCourse }: {
  courses: Course[];
  course: CourseForm;
  setCourse: (value: CourseForm) => void;
  courseFormOpen: boolean;
  onOpenNew: () => void;
  onOpenCourse: (item: Course) => void;
  onCloseForm: () => void;
  onDeleteCourse: (item: Pick<Course, "id" | "title">) => Promise<void>;
  userId: string;
  saveCourse: (event: React.FormEvent) => Promise<void>;
  studentsByCourse: Record<string, Student[]>;
}) {
  const inputCls = "w-full rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[14px] text-[#12241c] placeholder-[#7a8b84] outline-none transition focus:border-[#146c45] focus:bg-white focus:ring-2 focus:ring-[#146c45]/10";
  const published = courses.filter((item) => item.status === "published");
  const drafts = courses.filter((item) => item.status !== "published");
  const selectedStudents = course.id ? (studentsByCourse[course.id] ?? []) : [];
  const [customSkill, setCustomSkill] = useState("");
  const [aiSkills, setAiSkills] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const titleSkills = useMemo(() => suggestSkillsForTitle(course.title), [course.title]);
  const suggestionPool = useMemo(
    () => uniqueSkills([...titleSkills, ...aiSkills, ...course.skills]),
    [titleSkills, aiSkills, course.skills],
  );

  useEffect(() => {
    setAiSkills([]);
    setCustomSkill("");
  }, [course.id]);

  function setCourseSkills(skills: string[]) {
    setCourse({ ...course, skills: uniqueSkills(skills) });
  }

  function toggleSkill(skill: string) {
    const next = course.skills.some((item) => skillKey(item) === skillKey(skill))
      ? course.skills.filter((item) => skillKey(item) !== skillKey(skill))
      : [...course.skills, skill];
    setCourseSkills(next);
  }

  function addCustomSkill() {
    const skill = normalizeSkillName(customSkill);
    if (!skill) return;
    setCourseSkills([...course.skills, skill]);
    setCustomSkill("");
  }

  async function suggestSkillsFromCourse() {
    if (!course.title.trim()) return;
    setSkillsLoading(true);
    try {
      const res = await apiRequest<{ skills?: string[] }>("/api/ai/job-skills", {
        method: "POST",
        body: JSON.stringify({
          title: course.title,
          description: course.description,
          experience_level: course.level,
          employment_type: course.delivery_type === "live" ? "Contract" : "Full-time",
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
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">COURSE MANAGEMENT</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Publish learning programs</h1>
          <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Create courses, manage enrolments, and track learner progress.</p>
        </div>
        {!courseFormOpen && (
          <button
            type="button"
            onClick={onOpenNew}
            className="inline-flex items-center gap-2 rounded-full bg-[#146c45] px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] hover:bg-[#0f5a39] transition"
          >
            <Plus size={16} />
            New course
          </button>
        )}
      </div>

      {courseFormOpen ? (
      <div className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
        <form onSubmit={(e) => void saveCourse(e)} className="space-y-4 rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#12241c]">{course.id ? "Edit course" : "Create new course"}</h2>
            <button type="button" onClick={onCloseForm} className="text-[13px] font-medium text-[#5b6b64] hover:text-[#12241c]">Cancel</button>
          </div>

          <input required value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} placeholder="Course title" className={inputCls} />
          <textarea required value={course.description} onChange={(e) => setCourse({ ...course, description: e.target.value })} placeholder="Description" className={`${inputCls} min-h-24 resize-y`} />
          <textarea value={course.syllabus} onChange={(e) => setCourse({ ...course, syllabus: e.target.value })} placeholder="Syllabus (optional)" className={`${inputCls} min-h-20 resize-y`} />

          <div className="grid gap-3 sm:grid-cols-3">
            <select value={course.level} onChange={(e) => setCourse({ ...course, level: e.target.value })} className={inputCls}>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
              <option>All levels</option>
            </select>
            <input value={course.duration} onChange={(e) => setCourse({ ...course, duration: e.target.value })} placeholder="Duration (e.g. 8h)" className={inputCls} />
            <input value={course.provider} onChange={(e) => setCourse({ ...course, provider: e.target.value })} placeholder="Provider name" className={inputCls} />
          </div>

          {/* Pricing */}
          <div className="rounded-xl border border-[#eef3f0] p-4 space-y-3">
            <h3 className="text-[13px] font-semibold text-[#12241c]">Pricing</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={course.is_free ?? true}
                onChange={(e) => setCourse({ ...course, is_free: e.target.checked, price: e.target.checked ? 0 : course.price })}
                className="rounded border-[#cfe6db] text-[#146c45]"
              />
              <span className="text-[13px] text-[#3d4d46]">Free course</span>
            </label>
            {!course.is_free && (
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-[#5b6b64]">₹</span>
                <input
                  type="number"
                  min="0"
                  value={course.price ?? 0}
                  onChange={(e) => setCourse({ ...course, price: Number(e.target.value) })}
                  placeholder="Price in INR"
                  className={inputCls}
                />
              </div>
            )}
          </div>

          {/* Certificate */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={course.certificate ?? false}
              onChange={(e) => setCourse({ ...course, certificate: e.target.checked })}
              className="rounded border-[#cfe6db] text-[#146c45]"
            />
            <span className="text-[13px] text-[#3d4d46]">Award certificate on completion</span>
          </label>

          <ImageUpload userId={userId} bucket="course-thumbnails" value={course.thumbnail_url} onChange={(thumbnail_url) => setCourse({ ...course, thumbnail_url })} label="Course thumbnail" />

          <select value={course.delivery_type} onChange={(e) => setCourse({ ...course, delivery_type: e.target.value as Course["delivery_type"] })} className={inputCls}>
            <option value="self_paced">Self-paced online course</option>
            <option value="live">Live training with batches</option>
          </select>

          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label className="text-[13px] font-medium text-[#3d4d46]">Skills covered</label>
              <button
                type="button"
                onClick={() => void suggestSkillsFromCourse()}
                disabled={skillsLoading || !course.title.trim()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf6f0] px-3 py-1.5 text-[12px] font-semibold text-[#146c45] hover:bg-[#d4ede2] disabled:opacity-50"
              >
                {skillsLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {skillsLoading ? "Suggesting…" : "Suggest for this course"}
              </button>
            </div>
            {course.skills.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {course.skills.map((skill) => (
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
              {course.title.trim()
                ? "Tap a suggested skill for this title, or type any extra skill."
                : "Add a course title to see suggestions, or type any skill."}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestionPool.filter((skill) => !course.skills.some((item) => skillKey(item) === skillKey(skill))).map((skill) => (
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
                className={`${inputCls} flex-1`}
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

          {course.delivery_type === "live"
            ? <LiveBatchEditor courseId={course.id} batches={course.live_batches} coursePublished={course.status === "published"} onChange={(live_batches) => setCourse({ ...course, live_batches })} />
            : <CourseModuleEditor userId={userId} modules={course.modules} onChange={(modules) => setCourse({ ...course, modules })} />
          }

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" value="draft" className="flex-1 rounded-full border border-[#d5e3dc] px-5 py-3 text-[14px] font-semibold text-[#1d332a] hover:border-[#b7cec3] transition">
              Save draft
            </button>
            <button type="submit" value="published" className="flex-1 rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] hover:bg-[#0f5a39] transition">
              Publish course
            </button>
            {course.id && (
              <button
                type="button"
                onClick={() => void onDeleteCourse({ id: course.id as string, title: course.title })}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 px-5 py-3 text-[14px] font-semibold text-red-600 hover:bg-red-50 transition"
              >
                <Trash2 size={15} /> Delete course
              </button>
            )}
          </div>
        </form>

        <CourseEnrollmentDetails
          title={course.id ? course.title || "This course" : "New course"}
          students={selectedStudents}
          emptyText={course.id ? "No enrolments on this course yet." : "Enrolments appear after you publish and learners join."}
        />
      </div>
      ) : (
      <>
        <section className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#12241c]">Published courses</h2>
          {published.length === 0 && <Empty text="No published courses yet. Use New course to create and publish a program." />}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {published.map((item) => (
              <div key={item.id} className="rounded-xl border border-[#eef3f0] bg-[#f7fbf9] p-4 text-left transition hover:border-[#cfe6db] hover:bg-white">
                <button type="button" onClick={() => onOpenCourse(item)} className="w-full text-left">
                  <div className="flex items-center justify-between gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.delivery_type === "live" ? "bg-violet-100" : "bg-[#eaf6f0]"}`}>
                      {item.delivery_type === "live" ? <Video size={14} className="text-violet-600" /> : <PlayCircle size={14} className="text-[#146c45]" />}
                    </div>
                    <span className="rounded-full bg-[#d4ede2] px-2 py-0.5 text-[11px] font-semibold text-[#146c45]">published</span>
                  </div>
                  <p className="mt-3 font-semibold text-[#12241c] text-[14px]">{item.title}</p>
                  <p className="mt-1 text-[12px] text-[#5b6b64]">
                    {item.level} · {item.delivery_type === "live" ? "Live" : "Self-paced"}
                    {item.duration ? ` · ${item.duration}` : ""}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[12px] text-[#5b6b64]">
                    <span className="flex items-center gap-1"><Users size={11} />{studentsByCourse[item.id]?.length ?? 0} enrolled</span>
                    {item.is_free ? <span className="font-semibold text-[#146c45]">Free</span> : item.price != null ? <span>₹{item.price.toLocaleString()}</span> : null}
                  </div>
                </button>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => onOpenCourse(item)} className="flex-1 rounded-lg border border-[#e4eee9] bg-white px-3 py-2 text-[12px] font-semibold text-[#1d332a] hover:border-[#cfe6db]">
                    Edit
                  </button>
                  <button type="button" onClick={() => void onDeleteCourse(item)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-[12px] font-semibold text-red-600 hover:bg-red-50">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        {drafts.length > 0 && (
          <section className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#12241c]">Drafts</h2>
            <div className="space-y-2">
              {drafts.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#eef3f0] p-3.5 hover:border-[#cfe6db] hover:bg-[#f7fbf9]">
                  <button type="button" onClick={() => onOpenCourse(item)} className="min-w-0 flex-1 text-left">
                    <p className="text-[13px] font-semibold text-[#12241c]">{item.title || "Untitled draft"}</p>
                    <p className="mt-0.5 text-[12px] text-[#5b6b64]">Draft · {item.level}</p>
                  </button>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => onOpenCourse(item)} className="text-[12px] font-semibold text-[#146c45]">
                      Edit
                    </button>
                    <button type="button" onClick={() => void onDeleteCourse(item)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-red-600">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </>
      )}
    </>
  );
}

function CourseEnrollmentDetails({ title, students, emptyText }: { title: string; students: Student[]; emptyText: string }) {
  return (
    <Panel title="Enrolments">
      <p className="mb-4 text-[13px] text-[#5b6b64]">{title} · {students.length} learner{students.length === 1 ? "" : "s"}</p>
      {students.length ? students.map((student) => (
        <div key={student.id} className="mb-3 rounded-xl bg-[#f7fbf9] p-3">
          <p className="text-[13px] font-semibold text-[#12241c]">{student.profile?.full_name || `Candidate ${student.candidate_id.slice(0, 8)}`}</p>
          {student.profile?.contact_email && <p className="mt-0.5 text-[12px] text-[#5b6b64]">{student.profile.contact_email}</p>}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-[#eef3f0]">
              <div className="h-full rounded-full bg-[#146c45]" style={{ width: `${student.progress}%` }} />
            </div>
            <span className="text-[12px] font-semibold text-[#5b6b64]">{student.progress}%</span>
          </div>
        </div>
      )) : <Empty text={emptyText} />}
    </Panel>
  );
}

/* ─── Offline Training View ─── */
function OfflineTrainingView({ courses }: { courses: Course[] }) {
  type OfflineSession = { id: string; title: string; location: string; date: string; capacity: number; fee: number; status: "upcoming" | "completed" | "cancelled" };
  const [sessions, setSessions] = useState<OfflineSession[]>([
    { id: "demo1", title: "React Bootcamp — Batch 1", location: "Mumbai, Maharashtra", date: "2026-10-15", capacity: 30, fee: 4999, status: "upcoming" },
    { id: "demo2", title: "Python for Data Science", location: "Bangalore, Karnataka", date: "2026-09-20", capacity: 25, fee: 3999, status: "completed" },
  ]);
  const [form, setForm] = useState({ title: "", location: "", date: "", capacity: 20, fee: 0, courseId: "", status: "upcoming" as OfflineSession["status"] });
  const [showForm, setShowForm] = useState(false);
  const inputCls = "w-full rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[14px] text-[#12241c] placeholder-[#7a8b84] outline-none transition focus:border-[#146c45] focus:bg-white focus:ring-2 focus:ring-[#146c45]/10";

  function addSession() {
    if (!form.title || !form.location || !form.date) return;
    setSessions((prev) => [...prev, { ...form, id: crypto.randomUUID() }]);
    setForm({ title: "", location: "", date: "", capacity: 20, fee: 0, courseId: "", status: "upcoming" });
    setShowForm(false);
  }

  const statusColors: Record<OfflineSession["status"], string> = {
    upcoming:  "bg-blue-100 text-blue-700",
    completed: "bg-[#d4ede2] text-[#146c45]",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">OFFLINE TRAINING</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Offline sessions</h1>
          <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Publish and manage in-person training batches.</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-full bg-[#146c45] px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] hover:bg-[#0f5a39] transition">
          <Plus size={16} /> New session
        </button>
      </div>

      {showForm && (
        <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Add offline session</h2>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Session title" className={inputCls} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location (city, venue)" className={inputCls} />
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} placeholder="Capacity" className={inputCls} />
            <input type="number" min="0" value={form.fee} onChange={(e) => setForm({ ...form, fee: Number(e.target.value) })} placeholder="Fee (₹)" className={inputCls} />
          </div>
          <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} className={inputCls}>
            <option value="">Link to online course (optional)</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <div className="flex gap-3">
            <button type="button" onClick={addSession}
              className="flex-1 rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white hover:bg-[#0f5a39] transition">
              Publish session
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-full border border-[#e4eee9] px-5 py-3 text-[14px] font-medium text-[#5b6b64] hover:bg-[#f7fbf9] transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-4 rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf6f0]">
                <MapPin size={18} className="text-[#146c45]" />
              </div>
              <div>
                <p className="font-semibold text-[#12241c]">{s.title}</p>
                <p className="mt-0.5 text-[12px] text-[#5b6b64]">
                  {s.location} · {s.date} · {s.capacity} seats · ₹{s.fee.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColors[s.status]}`}>{s.status}</span>
              <button type="button" onClick={() => setSessions((prev) => prev.filter((x) => x.id !== s.id))}
                className="rounded-lg p-1.5 text-[#7a8b84] hover:bg-red-50 hover:text-red-600 transition">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {sessions.length === 0 && <Empty text="No offline sessions yet. Add your first in-person training batch." />}
      </div>
    </>
  );
}

/* ─── Quiz Builder View ─── */
function QuizBuilderView({ courses }: { courses: Course[] }) {
  type Question = { id: string; text: string; options: string[]; correct: number };
  type Quiz = { id: string; course_id: string; title: string; questions: Question[] };
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id ?? "");
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuiz, setEditingQuiz] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputCls = "w-full rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[14px] text-[#12241c] placeholder-[#7a8b84] outline-none transition focus:border-[#146c45] focus:bg-white focus:ring-2 focus:ring-[#146c45]/10";

  useEffect(() => {
    void apiRequest<{ quizzes: Quiz[] }>("/api/lms/mine")
      .then((res) => setQuizzes(res.quizzes ?? []))
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedCourse && courses[0]?.id) setSelectedCourse(courses[0].id);
  }, [courses, selectedCourse]);

  function addQuestion() {
    setQuestions((prev) => [...prev, { id: crypto.randomUUID(), text: "", options: ["", "", "", ""], correct: 0 }]);
  }
  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, ...patch } : q));
  }
  function updateOption(qId: string, idx: number, val: string) {
    setQuestions((prev) => prev.map((q) => q.id === qId ? { ...q, options: q.options.map((o, i) => i === idx ? val : o) } : q));
  }
  async function saveQuiz() {
    if (!quizTitle || questions.length === 0 || !selectedCourse) return;
    setSaving(true);
    setError("");
    try {
      const payload = { title: quizTitle, questions };
      const res = editingQuiz
        ? await apiRequest<{ quiz: Quiz }>(`/api/lms/quizzes/${editingQuiz}`, { method: "PUT", body: JSON.stringify(payload) })
        : await apiRequest<{ quiz: Quiz }>(`/api/lms/courses/${selectedCourse}/quizzes`, { method: "POST", body: JSON.stringify(payload) });
      const saved = res.quiz;
      setQuizzes((prev) => editingQuiz ? prev.map((q) => q.id === editingQuiz ? saved : q) : [saved, ...prev]);
      setQuizTitle(""); setQuestions([]); setEditingQuiz(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function deleteQuiz(id: string) {
    try {
      await apiRequest(`/api/lms/quizzes/${id}`, { method: "DELETE" });
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      if (editingQuiz === id) { setEditingQuiz(null); setQuizTitle(""); setQuestions([]); }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">QUIZ BUILDER</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Create quizzes</h1>
        <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Build multiple-choice quizzes for your courses.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_.6fr]">
        <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">{editingQuiz ? "Edit quiz" : "New quiz"}</h2>
          <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className={inputCls}>
            {courses.length ? courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>) : <option value="">No courses yet</option>}
          </select>
          <input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} placeholder="Quiz title" className={inputCls} />

          {questions.map((q, qi) => (
            <div key={q.id} className="rounded-xl border border-[#eef3f0] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[#5b6b64]">Q{qi + 1}</span>
                <button type="button" onClick={() => setQuestions((prev) => prev.filter((x) => x.id !== q.id))}
                  className="text-[#7a8b84] hover:text-red-600 transition"><Trash2 size={13} /></button>
              </div>
              <input value={q.text} onChange={(e) => updateQuestion(q.id, { text: e.target.value })} placeholder="Question text" className={inputCls} />
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`correct-${q.id}`} checked={q.correct === oi} onChange={() => updateQuestion(q.id, { correct: oi })}
                    className="text-[#146c45]" />
                  <input value={opt} onChange={(e) => updateOption(q.id, oi, e.target.value)} placeholder={`Option ${oi + 1}`}
                    className="flex-1 rounded-lg border border-[#e4eee9] bg-[#f7fbf9] px-3 py-2 text-[13px] outline-none focus:border-[#146c45]" />
                </div>
              ))}
              <p className="text-[11px] text-[#7a8b84]">Select the radio button next to the correct answer.</p>
            </div>
          ))}

          <div className="flex gap-3">
            <button type="button" onClick={addQuestion}
              className="flex items-center gap-1.5 rounded-full border border-[#e4eee9] px-4 py-2.5 text-[13px] font-medium text-[#5b6b64] hover:bg-[#f7fbf9] transition">
              <Plus size={14} /> Add question
            </button>
            <button type="button" onClick={() => void saveQuiz()} disabled={!quizTitle || questions.length === 0 || !selectedCourse || saving}
              className="flex-1 rounded-full bg-[#146c45] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0f5a39] transition disabled:opacity-50">
              {saving ? "Saving..." : "Save quiz"}
            </button>
          </div>
        </div>

        <Panel title={`Saved quizzes (${quizzes.length})`}>
          {error && <p className="mb-3 text-[13px] text-red-600">{error}</p>}
          {quizzes.length ? quizzes.map((quiz) => (
            <div key={quiz.id} className="mb-3 rounded-xl border border-[#eef3f0] p-3">
              <p className="font-semibold text-[#12241c] text-[13px]">{quiz.title}</p>
              <p className="mt-0.5 text-[11px] text-[#7a8b84]">{quiz.questions.length} questions · {courses.find((c) => c.id === quiz.course_id)?.title ?? "Unknown course"}</p>
              <div className="mt-2 flex items-center gap-3">
                <button type="button" onClick={() => { setEditingQuiz(quiz.id); setQuizTitle(quiz.title); setQuestions(quiz.questions); setSelectedCourse(quiz.course_id); }}
                  className="text-[12px] font-semibold text-[#146c45] hover:text-[#0f5a39]">Edit →</button>
                <button type="button" onClick={() => void deleteQuiz(quiz.id)} className="text-[12px] font-medium text-red-600 hover:text-red-700">Delete</button>
              </div>
            </div>
          )) : <Empty text="No quizzes yet. Create your first quiz." />}
        </Panel>
      </div>
    </>
  );
}

/* ─── Assignments View ─── */
function AssignmentsView({ courses }: { courses: Course[] }) {
  type Assignment = { id: string; course_id: string; title: string; description: string; due_date?: string | null; max_score: number };
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [form, setForm] = useState({ courseId: courses[0]?.id ?? "", title: "", description: "", dueDate: "", maxScore: 100 });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputCls = "w-full rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[14px] text-[#12241c] placeholder-[#7a8b84] outline-none transition focus:border-[#146c45] focus:bg-white focus:ring-2 focus:ring-[#146c45]/10";

  useEffect(() => {
    void apiRequest<{ assignments: Assignment[] }>("/api/lms/mine")
      .then((res) => setAssignments(res.assignments ?? []))
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!form.courseId && courses[0]?.id) setForm((curr) => ({ ...curr, courseId: courses[0].id }));
  }, [courses, form.courseId]);

  async function save() {
    if (!form.title || !form.courseId) return;
    setSaving(true);
    setError("");
    try {
      const res = await apiRequest<{ assignment: Assignment }>(`/api/lms/courses/${form.courseId}/assignments`, {
        method: "POST",
        body: JSON.stringify({ title: form.title, description: form.description, due_date: form.dueDate || null, max_score: form.maxScore }),
      });
      setAssignments((prev) => [res.assignment, ...prev]);
      setForm({ courseId: courses[0]?.id ?? "", title: "", description: "", dueDate: "", maxScore: 100 });
      setShowForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await apiRequest(`/api/lms/assignments/${id}`, { method: "DELETE" });
      setAssignments((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">ASSIGNMENTS</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Manage assignments</h1>
          <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Create and track assignments for your courses.</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-full bg-[#146c45] px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] hover:bg-[#0f5a39] transition">
          <Plus size={16} /> New assignment
        </button>
      </div>

      {showForm && (
        <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Create assignment</h2>
          <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} className={inputCls}>
            {courses.length ? courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>) : <option value="">No courses yet</option>}
          </select>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Assignment title" className={inputCls} />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Instructions / description" className={`${inputCls} min-h-24 resize-y`} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputCls} />
            <input type="number" min="1" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })} placeholder="Max score" className={inputCls} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => void save()} disabled={saving || !form.title || !form.courseId}
              className="flex-1 rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white hover:bg-[#0f5a39] transition disabled:opacity-50">
              {saving ? "Saving..." : "Save assignment"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-full border border-[#e4eee9] px-5 py-3 text-[14px] font-medium text-[#5b6b64] hover:bg-[#f7fbf9] transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-[13px] text-red-600">{error}</p>}
      <div className="space-y-3">
        {assignments.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-4 rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                <ClipboardList size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-[#12241c]">{a.title}</p>
                <p className="mt-0.5 text-[12px] text-[#5b6b64]">
                  {courses.find((c) => c.id === a.course_id)?.title ?? "Unknown"} · Due: {a.due_date || "No deadline"} · Max: {a.max_score} pts
                </p>
              </div>
            </div>
            <button type="button" onClick={() => void remove(a.id)}
              className="rounded-lg p-1.5 text-[#7a8b84] hover:bg-red-50 hover:text-red-600 transition">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {assignments.length === 0 && <Empty text="No assignments yet. Create your first assignment." />}
      </div>
    </>
  );
}

/* ─── Certificates View ─── */
function CertificatesView({ courses, studentsByCourse }: { courses: Course[]; studentsByCourse: Record<string, Student[]> }) {
  const [issued, setIssued] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const completedStudents = courses.flatMap((c) =>
    (studentsByCourse[c.id] ?? [])
      .filter((s) => s.progress === 100)
      .map((s) => ({ course: c, student: s, key: `${c.id}-${s.candidate_id}` }))
  );

  useEffect(() => {
    void apiRequest<{ certificates: { course_id: string; candidate_id: string }[] }>("/api/lms/mine")
      .then((res) => setIssued(new Set((res.certificates ?? []).map((c) => `${c.course_id}-${c.candidate_id}`))))
      .catch((err: Error) => setError(err.message));
  }, []);

  async function issue(courseId: string, candidateId: string) {
    const key = `${courseId}-${candidateId}`;
    setError("");
    try {
      await apiRequest(`/api/lms/courses/${courseId}/certificates`, {
        method: "POST",
        body: JSON.stringify({ candidate_id: candidateId }),
      });
      setIssued((prev) => new Set(prev).add(key));
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function revoke(courseId: string, candidateId: string) {
    const key = `${courseId}-${candidateId}`;
    setError("");
    try {
      await apiRequest(`/api/lms/courses/${courseId}/certificates/${candidateId}`, { method: "DELETE" });
      setIssued((prev) => { const n = new Set(prev); n.delete(key); return n; });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">CERTIFICATES</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Issue certificates</h1>
        <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Award certificates to students who completed your courses.</p>
      </div>

      {error && <p className="text-[13px] text-red-600">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf6f0]"><Award size={20} className="text-[#146c45]" /></div>
          <p className="mt-4 font-[family-name:var(--font-display)] text-[30px] font-semibold text-[#12241c]">{completedStudents.length}</p>
          <p className="mt-1 text-[13px] text-[#5b6b64]">Eligible students</p>
        </div>
        <div className="rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50"><BadgeCheck size={20} className="text-amber-600" /></div>
          <p className="mt-4 font-[family-name:var(--font-display)] text-[30px] font-semibold text-[#12241c]">{issued.size}</p>
          <p className="mt-1 text-[13px] text-[#5b6b64]">Certificates issued</p>
        </div>
        <div className="rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef3f0]"><Clock size={20} className="text-[#5b6b64]" /></div>
          <p className="mt-4 font-[family-name:var(--font-display)] text-[30px] font-semibold text-[#12241c]">{completedStudents.length - issued.size}</p>
          <p className="mt-1 text-[13px] text-[#5b6b64]">Pending issuance</p>
        </div>
      </div>

      {completedStudents.length === 0 ? (
        <Empty text="No students have completed a course yet. Certificates will appear here once students reach 100% progress." />
      ) : (
        <div className="rounded-[22px] border border-white bg-white shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#eef3f0] bg-[#f7fbf9]">
                <th className="px-5 py-3.5 text-left font-semibold text-[#5b6b64]">Student</th>
                <th className="px-5 py-3.5 text-left font-semibold text-[#5b6b64]">Course</th>
                <th className="px-5 py-3.5 text-left font-semibold text-[#5b6b64]">Status</th>
                <th className="px-5 py-3.5 text-left font-semibold text-[#5b6b64]">Action</th>
              </tr>
            </thead>
            <tbody>
              {completedStudents.map(({ course, student, key }) => (
                <tr key={key} className="border-b border-[#eef3f0] last:border-0 hover:bg-[#f7fbf9] transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eaf6f0] text-[13px] font-bold text-[#146c45]">
                        {(student.profile?.full_name ?? "?")[0].toUpperCase()}
                      </div>
                      <p className="font-semibold text-[#12241c]">{student.profile?.full_name ?? `Student ${student.candidate_id.slice(0, 8)}`}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[#3d4d46] max-w-[180px] truncate">{course.title}</td>
                  <td className="px-5 py-4">
                    {issued.has(key)
                      ? <span className="flex items-center gap-1 rounded-full bg-[#d4ede2] px-2.5 py-1 text-[11px] font-semibold text-[#146c45]"><BadgeCheck size={12} /> Issued</span>
                      : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">Pending</span>
                    }
                  </td>
                  <td className="px-5 py-4">
                    {issued.has(key)
                      ? <button type="button" onClick={() => void revoke(course.id, student.candidate_id)} className="text-[12px] font-medium text-red-600 hover:text-red-700">Revoke</button>
                      : <button type="button" onClick={() => void issue(course.id, student.candidate_id)} className="rounded-full bg-[#146c45] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#0f5a39] transition">Issue certificate</button>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ─── AI Content Generator View ─── */
function AIContentView() {
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState<"outline" | "lesson" | "quiz" | "description">("outline");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputCls = "w-full rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[14px] text-[#12241c] placeholder-[#7a8b84] outline-none transition focus:border-[#146c45] focus:bg-white focus:ring-2 focus:ring-[#146c45]/10";

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true); setError(""); setResult("");
    try {
      const { apiRequest } = await import("../../services/api");
      const res = await apiRequest<{ result: string }>("/api/ai/generate-content", {
        method: "POST",
        body: JSON.stringify({ topic, contentType }),
      });
      setResult(res.result ?? "");
    } catch (err) {
      setError((err as Error).message || "AI generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const typeOptions: { value: typeof contentType; label: string; hint: string }[] = [
    { value: "outline",      label: "Course outline",   hint: "Modules, lessons, and learning outcomes" },
    { value: "lesson",       label: "Lesson script",    hint: "A full lesson with examples and recap" },
    { value: "quiz",         label: "Quiz questions",   hint: "Multiple-choice questions with answers" },
    { value: "description",  label: "Course copy",      hint: "Marketplace title, summary, and bullets" },
  ];

  return (
    <>
      <div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">AI CONTENT GENERATOR</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Generate teaching content</h1>
        <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Draft outlines, lessons, quizzes, and course copy from a topic.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4 rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
          <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Prompt</h2>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Intermediate React hooks for job seekers"
            className={inputCls}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {typeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setContentType(opt.value)}
                className={`rounded-xl border p-3 text-left transition ${
                  contentType === opt.value
                    ? "border-[#146c45] bg-[#eaf6f0] ring-2 ring-[#146c45]/10"
                    : "border-[#eef3f0] bg-[#f7fbf9] hover:border-[#cfe6db]"
                }`}
              >
                <p className="text-[13px] font-semibold text-[#12241c]">{opt.label}</p>
                <p className="mt-0.5 text-[11px] text-[#7a8b84]">{opt.hint}</p>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading || !topic.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] hover:bg-[#0f5a39] transition disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Generating…" : "Generate content"}
          </button>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">{error}</p>}
        </div>

        <Panel title="Generated output">
          {result ? (
            <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl bg-[#f7fbf9] p-4 text-[13px] leading-6 text-[#1d332a]">{result}</pre>
          ) : (
            <Empty text="Generated outlines, lessons, and quizzes will appear here." />
          )}
        </Panel>
      </div>
    </>
  );
}

/* ─── Attendance View ─── */
function AttendanceView({ courses, studentsByCourse }: { courses: Course[]; studentsByCourse: Record<string, Student[]> }) {
  type Mark = "present" | "absent" | "late";
  const liveCourses = courses.filter((c) => c.delivery_type === "live");
  const [courseId, setCourseId] = useState(liveCourses[0]?.id ?? courses[0]?.id ?? "");
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, Record<string, Mark>>>({});
  const inputCls = "rounded-xl border border-[#e4eee9] bg-white px-4 py-2.5 text-[13px] text-[#12241c] outline-none focus:border-[#146c45] shadow-sm";

  const students = studentsByCourse[courseId] ?? [];
  const sessionKey = `${courseId}:${sessionDate}`;
  const sessionMarks = marks[sessionKey] ?? {};
  const presentCount = students.filter((s) => sessionMarks[s.id] === "present").length;
  const lateCount = students.filter((s) => sessionMarks[s.id] === "late").length;
  const absentCount = students.filter((s) => sessionMarks[s.id] === "absent").length;

  function setMark(studentId: string, mark: Mark) {
    setMarks((prev) => ({
      ...prev,
      [sessionKey]: { ...(prev[sessionKey] ?? {}), [studentId]: mark },
    }));
  }

  function markAll(mark: Mark) {
    setMarks((prev) => ({
      ...prev,
      [sessionKey]: Object.fromEntries(students.map((s) => [s.id, mark])),
    }));
  }

  const markCls: Record<Mark, string> = {
    present: "bg-[#d4ede2] text-[#146c45]",
    late:    "bg-amber-50 text-amber-700",
    absent:  "bg-red-50 text-red-700",
  };

  return (
    <>
      <div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">ATTENDANCE</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">Track live-class attendance</h1>
        <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">Mark present, late, or absent for each session of a live course.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputCls}>
          {(liveCourses.length ? liveCourses : courses).map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
          {courses.length === 0 && <option value="">No courses yet</option>}
        </select>
        <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className={inputCls} />
        <button type="button" onClick={() => markAll("present")} className="rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0f5a39] transition">
          Mark all present
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric icon={<UserCheck size={20} />} label="Present" value={presentCount} color="emerald" />
        <Metric icon={<Clock size={20} />}     label="Late"    value={lateCount}    color="amber" />
        <Metric icon={<Users size={20} />}     label="Absent"  value={absentCount}  color="violet" />
      </div>

      {students.length === 0 ? (
        <Empty text="No enrolled learners for this course yet. Attendance rows appear after enrolments." />
      ) : (
        <div className="rounded-[22px] border border-white bg-white shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#eef3f0] bg-[#f7fbf9]">
                <th className="px-5 py-3.5 text-left font-semibold text-[#5b6b64]">Student</th>
                <th className="px-5 py-3.5 text-left font-semibold text-[#5b6b64]">Status</th>
                <th className="px-5 py-3.5 text-left font-semibold text-[#5b6b64]">Mark</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const mark = sessionMarks[student.id];
                return (
                  <tr key={student.id} className="border-b border-[#eef3f0] last:border-0 hover:bg-[#f7fbf9] transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eaf6f0] text-[13px] font-bold text-[#146c45]">
                          {(student.profile?.full_name ?? "?")[0].toUpperCase()}
                        </div>
                        <p className="font-semibold text-[#12241c]">{student.profile?.full_name ?? `Student ${student.candidate_id.slice(0, 8)}`}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {mark
                        ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${markCls[mark]}`}>{mark}</span>
                        : <span className="rounded-full bg-[#eef3f0] px-2.5 py-1 text-[11px] font-semibold text-[#5b6b64]">Unmarked</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {(["present", "late", "absent"] as Mark[]).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setMark(student.id, m)}
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition ${
                              mark === m ? markCls[m] : "bg-[#f7fbf9] text-[#5b6b64] hover:bg-[#eaf6f0]"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ─── Shared UI primitives ─── */
function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Metric({ icon, label, value, color }: { icon: ReactNode; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    violet:  "bg-violet-50 text-violet-600",
    blue:    "bg-blue-50 text-blue-600",
    emerald: "bg-[#eaf6f0] text-[#146c45]",
    amber:   "bg-amber-50 text-amber-600",
  };
  return (
    <div className="rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}>{icon}</div>
      <p className="mt-4 font-[family-name:var(--font-display)] text-[30px] font-semibold leading-none text-[#12241c]">{value}</p>
      <p className="mt-1.5 text-[13px] text-[#5b6b64]">{label}</p>
    </div>
  );
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

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl bg-[#f7fbf9] p-4 text-[13px] text-[#7a8b84]">{text}</p>;
}

export { Link };

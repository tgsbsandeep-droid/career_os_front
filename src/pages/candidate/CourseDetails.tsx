import {
  BookOpen, CalendarDays, CheckCircle2, Clock3, Download, ExternalLink, FileText, PlayCircle,
  Star, MessageSquare, StickyNote, Award, ChevronLeft, ChevronRight,
  Send, Loader2, Users, TrendingUp, ThumbsUp, ClipboardList, HelpCircle, Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest, supabase } from "../../services/api";

type Lesson = { id: string; title: string; type: "video" | "file"; url: string; duration?: string };
type Module = { id: string; title: string; description: string; lessons: Lesson[] };
type Review = { id: string; user_name: string; rating: number; comment: string; created_at: string; helpful?: number };
type QnA    = { id: string; user_name: string; question: string; answer?: string; created_at: string; upvotes?: number };
type QuizQuestion = { id: string; text: string; options: string[] };
type QuizAttempt = { score: number; max_score: number };
type LearnerQuiz = { id: string; title: string; questions: QuizQuestion[]; attempt: QuizAttempt | null };
type AssignmentItem = { id: string; title: string; description: string; due_date?: string | null; max_score: number };
type AssignmentSubmission = { assignment_id: string; content: string; file_url?: string | null; score?: number | null };
type IssuedCert = { id: string; course_id: string; issued_at: string };
type LiveBatch = {
  id: string; title: string; start_at: string; end_at?: string | null;
  schedule?: string; capacity: number; meeting_url?: string; status: string;
};
type Course = {
  title: string; provider: string; level: string; duration: string;
  description: string; modules: Module[];
  rating?: number; review_count?: number; student_count?: number;
  instructor_name?: string; instructor_bio?: string;
  certificate?: boolean; total_lessons?: number;
  what_you_learn?: string[]; requirements?: string[];
  reviews?: Review[]; qna?: QnA[];
  is_free?: boolean; price?: number; delivery_type?: "self_paced" | "live";
  skills?: string[]; live_batches?: LiveBatch[];
};

type Tab = "content" | "notes" | "qna" | "reviews" | "quizzes" | "assignments";

function isPdfUrl(url: string) {
  return /\.pdf($|\?|#)/i.test(url);
}

function nextLiveBatch(batches: LiveBatch[] | undefined) {
  const published = (batches ?? []).filter((batch) => batch.status !== "closed" && batch.status !== "draft");
  const pool = published.length ? published : (batches ?? []);
  return [...pool].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0] ?? null;
}

function formatBatchWhen(batch: LiveBatch) {
  if (batch.schedule?.trim()) return batch.schedule.trim();
  const start = new Date(batch.start_at);
  if (Number.isNaN(start.getTime())) return "";
  return start.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function courseFeeLabel(course: Pick<Course, "is_free" | "price">) {
  if (course.is_free || !(course.price && course.price > 0)) return "Free";
  return `₹${course.price.toLocaleString("en-IN")}`;
}

function courseRequiresFee(course: Pick<Course, "is_free" | "price"> | null | undefined) {
  if (!course) return false;
  return course.is_free === false && Boolean(course.price && course.price > 0);
}

type CourseAccess = {
  course: Course;
  enrolled?: boolean;
  access_granted?: boolean;
  payment_required?: boolean;
  payment_status?: string | null;
};

function StarRating({ rating, size = 14, interactive, onChange }: {
  rating: number; size?: number; interactive?: boolean; onChange?: (r: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex">
      {[1,2,3,4,5].map((s) => (
        <Star
          key={s}
          size={size}
          className={`${interactive ? "cursor-pointer transition" : ""} ${
            s <= (interactive ? (hover || rating) : Math.round(rating))
              ? "fill-amber-400 text-amber-400"
              : "fill-[#eef3f0] text-[#eef3f0]"
          }`}
          onMouseEnter={() => interactive && setHover(s)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange?.(s)}
        />
      ))}
    </div>
  );
}

export default function CourseDetails() {
  const { courseId } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [course, setCourse]                 = useState<Course | null>(null);
  const [enrolled, setEnrolled]             = useState(false);
  const [accessGranted, setAccessGranted]   = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [enrolling, setEnrolling]           = useState(false);
  const [paying, setPaying]                 = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [completed, setCompleted]           = useState<string[]>([]);
  const [message, setMessage]               = useState("Loading course...");
  const [activeTab, setActiveTab]           = useState<Tab>("content");
  const [note, setNote]                     = useState("");
  const [notes, setNotes]                   = useState<{ lessonId: string; text: string; ts: string }[]>([]);
  const [question, setQuestion]             = useState("");
  const [qna, setQna]                       = useState<QnA[]>([]);
  const [reviews, setReviews]               = useState<Review[]>([]);
  const [myRating, setMyRating]             = useState(0);
  const [myReview, setMyReview]             = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittingQ, setSubmittingQ]       = useState(false);
  const [certificateReady, setCertificateReady] = useState(false);
  const [learnerName, setLearnerName]       = useState("Candidate");
  const [quizzes, setQuizzes]               = useState<LearnerQuiz[]>([]);
  const [assignments, setAssignments]       = useState<AssignmentItem[]>([]);
  const [submissions, setSubmissions]       = useState<AssignmentSubmission[]>([]);
  const [issuedCert, setIssuedCert]         = useState<IssuedCert | null>(null);
  const [quizAnswers, setQuizAnswers]       = useState<Record<string, Record<string, number>>>({});
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, { content: string; file_url: string }>>({});
  const [lmsBusy, setLmsBusy]               = useState("");
  const [lmsError, setLmsError]             = useState("");

  useEffect(() => {
    if (!courseId) return;
    void Promise.all([
      apiRequest<CourseAccess>(`/api/courses/${courseId}`),
      supabase.auth.getUser(),
    ]).then(async ([{ course: loadedCourse, enrolled: alreadyEnrolled, access_granted, payment_required }, { data }]) => {
      const normalized = { ...loadedCourse, modules: loadedCourse.modules ?? [] };
      setCourse(normalized);
      setQna(normalized.qna ?? []);
      setReviews(normalized.reviews ?? []);
      setSelectedLesson(normalized.modules[0]?.lessons[0] ?? null);
      const isEnrolled = Boolean(alreadyEnrolled);
      const unlocked = Boolean(access_granted);
      setEnrolled(isEnrolled);
      setAccessGranted(unlocked);
      setPaymentRequired(Boolean(payment_required) || (isEnrolled && !unlocked && courseRequiresFee(normalized)));
      if (data.user) {
        setLearnerName(String(data.user.user_metadata?.full_name ?? data.user.email?.split("@")[0] ?? "Candidate"));
        if (unlocked) {
          const enrollRes = await apiRequest<{ enrollments: { course_id: string; completed_lessons?: string[] }[] }>(
            `/api/candidate/${data.user.id}/enrollments`
          );
          const enr = enrollRes.enrollments.find((e) => e.course_id === courseId);
          const cl = enr?.completed_lessons ?? [];
          setCompleted(cl);
          const allL = normalized.modules.flatMap((m) => m.lessons);
          if (allL.length > 0 && cl.length === allL.length) setCertificateReady(true);
          try {
            const lms = await apiRequest<{
              quizzes: LearnerQuiz[];
              assignments: AssignmentItem[];
              submissions: AssignmentSubmission[];
              certificate: IssuedCert | null;
            }>(`/api/lms/courses/${courseId}/learner`);
            setQuizzes(lms.quizzes ?? []);
            setAssignments(lms.assignments ?? []);
            setSubmissions(lms.submissions ?? []);
            setIssuedCert(lms.certificate ?? null);
          } catch { /* LMS tables not migrated yet */ }
        }
      }
      setMessage("");
    }).catch((err: Error) => setMessage(err.message));
  }, [courseId]);

  const allLessons = course?.modules.flatMap((m) => m.lessons) ?? [];
  const progress   = allLessons.length ? Math.round((completed.length / allLessons.length) * 100) : 0;

  function applyCourseAccess(loaded: CourseAccess) {
    const normalized = { ...loaded.course, modules: loaded.course.modules ?? [] };
    const unlocked = Boolean(loaded.access_granted);
    const isEnrolled = Boolean(loaded.enrolled);
    setCourse(normalized);
    setEnrolled(isEnrolled);
    setAccessGranted(unlocked);
    setPaymentRequired(Boolean(loaded.payment_required) || (isEnrolled && !unlocked && courseRequiresFee(normalized)));
    setSelectedLesson((current) => {
      const next = normalized.modules.flatMap((mod) => mod.lessons);
      return next.find((lesson) => lesson.id === current?.id) ?? next[0] ?? null;
    });
    return { normalized, unlocked };
  }

  async function loadLearnerTools() {
    try {
      const lms = await apiRequest<{
        quizzes: LearnerQuiz[];
        assignments: AssignmentItem[];
        submissions: AssignmentSubmission[];
        certificate: IssuedCert | null;
      }>(`/api/lms/courses/${courseId}/learner`);
      setQuizzes(lms.quizzes ?? []);
      setAssignments(lms.assignments ?? []);
      setSubmissions(lms.submissions ?? []);
      setIssuedCert(lms.certificate ?? null);
    } catch { /* LMS tables not migrated yet */ }
  }

  async function enroll() {
    if (!courseId || enrolled || enrolling) return;
    setEnrolling(true);
    setLmsError("");
    try {
      await apiRequest(`/api/courses/${courseId}/enroll`, { method: "POST" });
      const loaded = await apiRequest<CourseAccess>(`/api/courses/${courseId}`);
      const { unlocked } = applyCourseAccess(loaded);
      if (unlocked) await loadLearnerTools();
    } catch (err) {
      setLmsError((err as Error).message);
    } finally {
      setEnrolling(false);
    }
  }

  async function payFee() {
    if (!courseId || paying || accessGranted) return;
    setPaying(true);
    setLmsError("");
    try {
      await apiRequest(`/api/courses/${courseId}/pay`, { method: "POST" });
      const loaded = await apiRequest<CourseAccess>(`/api/courses/${courseId}`);
      const { unlocked } = applyCourseAccess(loaded);
      if (unlocked) await loadLearnerTools();
    } catch (err) {
      setLmsError((err as Error).message);
    } finally {
      setPaying(false);
    }
  }

  async function markComplete() {
    if (!accessGranted || !selectedLesson || completed.includes(selectedLesson.id)) return;
    const next = [...completed, selectedLesson.id];
    setCompleted(next);
    if (next.length === allLessons.length) setCertificateReady(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await apiRequest(`/api/candidate/${data.user.id}/enrollments/${courseId}/progress`, {
          method: "PUT",
          body: JSON.stringify({
            completed_lessons: next,
            progress: allLessons.length ? Math.round((next.length / allLessons.length) * 100) : 0,
          }),
        });
      }
    } catch { /* silent */ }
  }

  async function submitQuiz(quiz: LearnerQuiz) {
    const answers = quizAnswers[quiz.id] ?? {};
    if (quiz.questions.some((q) => answers[q.id] === undefined)) {
      setLmsError("Answer every question before submitting.");
      return;
    }
    setLmsBusy(quiz.id);
    setLmsError("");
    try {
      const res = await apiRequest<{ attempt: QuizAttempt }>(`/api/lms/quizzes/${quiz.id}/attempts`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      setQuizzes((prev) => prev.map((item) => item.id === quiz.id ? { ...item, attempt: res.attempt } : item));
    } catch (err) {
      setLmsError((err as Error).message);
    } finally {
      setLmsBusy("");
    }
  }

  async function submitAssignment(assignment: AssignmentItem) {
    const draft = assignmentDrafts[assignment.id] ?? { content: "", file_url: "" };
    if (!draft.content.trim() && !draft.file_url.trim()) {
      setLmsError("Add a written response or file URL.");
      return;
    }
    setLmsBusy(assignment.id);
    setLmsError("");
    try {
      const res = await apiRequest<{ submission: AssignmentSubmission }>(`/api/lms/assignments/${assignment.id}/submissions`, {
        method: "POST",
        body: JSON.stringify({ content: draft.content.trim(), file_url: draft.file_url.trim() || null }),
      });
      setSubmissions((prev) => {
        const rest = prev.filter((item) => item.assignment_id !== assignment.id);
        return [res.submission, ...rest];
      });
    } catch (err) {
      setLmsError((err as Error).message);
    } finally {
      setLmsBusy("");
    }
  }

  async function claimCertificate() {
    if (!courseId) return;
    setLmsBusy("certificate");
    setLmsError("");
    try {
      const res = await apiRequest<{ certificate: IssuedCert }>(`/api/lms/courses/${courseId}/certificates/claim`, { method: "POST" });
      setIssuedCert(res.certificate);
    } catch (err) {
      setLmsError((err as Error).message);
    } finally {
      setLmsBusy("");
    }
  }

  function downloadCertificate() {
    if (!course) return;
    const title = course.title.replace(/[<>]/g, "");
    const issuer = (course.provider || "CareerOS").replace(/[<>]/g, "");
    const name = learnerName.replace(/[<>]/g, "") || "Candidate";
    const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=640");
    if (!win) return;
    win.document.write(`<!doctype html>
<html>
  <head>
    <title>${title} certificate</title>
    <style>
      body { font-family: Georgia, serif; margin: 0; background: #f7fbf9; color: #12241c; }
      .sheet { margin: 40px auto; width: 820px; padding: 56px; border: 12px solid #146c45; background: white; text-align: center; }
      h1 { letter-spacing: .18em; font-size: 14px; color: #157a4f; }
      h2 { font-size: 36px; margin: 12px 0 8px; }
      p { color: #5b6b64; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <h1>CERTIFICATE OF COMPLETION</h1>
      <p>This certifies that</p>
      <h2>${name}</h2>
      <p>has successfully completed</p>
      <h2 style="font-size:28px">${title}</h2>
      <p>Issued by ${issuer}</p>
    </div>
    <script>window.print()</script>
  </body>
</html>`);
    win.document.close();
  }

  function goToLesson(dir: "prev" | "next") {
    const idx = allLessons.findIndex((l) => l.id === selectedLesson?.id);
    const target = dir === "next" ? allLessons[idx + 1] : allLessons[idx - 1];
    if (target) setSelectedLesson(target);
  }

  function saveNote() {
    if (!note.trim() || !selectedLesson) return;
    setNotes((curr) => [...curr, { lessonId: selectedLesson.id, text: note.trim(), ts: new Date().toLocaleTimeString() }]);
    setNote("");
  }

  async function submitQuestion() {
    if (!question.trim()) return;
    setSubmittingQ(true);
    const newQ: QnA = { id: Date.now().toString(), user_name: "You", question: question.trim(), created_at: new Date().toISOString() };
    setQna((curr) => [newQ, ...curr]);
    setQuestion("");
    setSubmittingQ(false);
  }

  async function submitReview() {
    if (!myRating || !myReview.trim()) return;
    setSubmittingReview(true);
    const newR: Review = { id: Date.now().toString(), user_name: "You", rating: myRating, comment: myReview.trim(), created_at: new Date().toISOString() };
    setReviews((curr) => [newR, ...curr]);
    setMyRating(0);
    setMyReview("");
    setSubmittingReview(false);
  }

  if (!course) {
    return (
      <main className="min-h-screen bg-[#f7fbf9] p-6">
        <div className="mx-auto max-w-3xl rounded-[22px] border border-white bg-white p-8 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
          <p className="text-[13px] text-[#5b6b64]">{message}</p>
          <Link to="/candidate/courses" className="mt-4 inline-block font-semibold text-[#146c45] hover:underline">
            ← Back to courses
          </Link>
        </div>
      </main>
    );
  }

  const currentIdx  = allLessons.findIndex((l) => l.id === selectedLesson?.id);
  const lessonNotes = notes.filter((n) => n.lessonId === selectedLesson?.id);

  return (
    <main className="min-h-screen bg-[#f7fbf9]">
      <div className="mx-auto max-w-[1280px] px-5 py-6 space-y-5">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[13px] text-[#5b6b64]">
          <Link to="/candidate/courses" className="hover:text-[#146c45] transition">Courses</Link>
          <span>/</span>
          <span className="text-[#12241c] font-medium truncate max-w-[300px]">{course.title}</span>
        </div>

        {/* Main layout */}
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">

          {/* ── Left column ── */}
          <div className="space-y-4">

            {/* Video / file player */}
            <div className="overflow-hidden rounded-[22px] border border-white bg-white shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
              {course.delivery_type === "live" ? (
                <div className="flex aspect-video flex-col items-center justify-center bg-gradient-to-br from-violet-700 to-violet-900 px-6 text-center">
                  <Video size={48} className="text-white/80" />
                  <p className="mt-3 font-[family-name:var(--font-display)] text-[22px] font-semibold text-white">{course.title}</p>
                  {(() => {
                    const batch = nextLiveBatch(course.live_batches);
                    const when = batch ? formatBatchWhen(batch) : "";
                    return (
                      <>
                        <p className="mt-2 max-w-md text-[14px] leading-6 text-white/75">
                          {when ? `Live class · ${when}` : "Live class. Batch time is published by the academy."}
                        </p>
                        {accessGranted && batch?.meeting_url ? (
                          <a
                            href={batch.meeting_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-violet-800 hover:bg-white/90 transition"
                          >
                            <ExternalLink size={16} /> Join live class
                          </a>
                        ) : paymentRequired ? (
                          <button
                            type="button"
                            onClick={() => void payFee()}
                            disabled={paying}
                            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-violet-800 hover:bg-white/90 disabled:opacity-60 transition"
                          >
                            {paying ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
                            {paying ? "Recording payment…" : `Pay ${courseFeeLabel(course)} to join`}
                          </button>
                        ) : accessGranted ? (
                          <p className="mt-5 text-[13px] text-white/70">Meeting link appears here once the academy publishes it.</p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void enroll()}
                            disabled={enrolling}
                            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#146c45] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0f5a39] disabled:opacity-60 transition"
                          >
                            {enrolling ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
                            {enrolling ? "Enrolling…" : course.is_free || !(course.price && course.price > 0) ? "Enrol free" : "Enrol to join"}
                          </button>
                        )}
                      </>
                    );
                  })()}
                  {lmsError && <p className="mt-3 text-[12px] text-red-200">{lmsError}</p>}
                </div>
              ) : !accessGranted ? (
                <div className="flex aspect-video flex-col items-center justify-center bg-gradient-to-br from-[#0b2a1c] to-[#0f3d28] px-6 text-center">
                  <PlayCircle size={48} className="text-white/70" />
                  <p className="mt-3 font-[family-name:var(--font-display)] text-[22px] font-semibold text-white">{course.title}</p>
                  <p className="mt-2 max-w-md text-[14px] leading-6 text-white/70">
                    {paymentRequired
                      ? "You are enrolled. Pay the course fee to unlock lessons, quizzes, and files."
                      : "Preview the modules and course details below, then enrol to start lessons."}
                  </p>
                  {paymentRequired ? (
                    <button
                      type="button"
                      onClick={() => void payFee()}
                      disabled={paying}
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#146c45] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0f5a39] disabled:opacity-60 transition"
                    >
                      {paying ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
                      {paying ? "Recording payment…" : `Pay ${courseFeeLabel(course)}`}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void enroll()}
                      disabled={enrolling}
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#146c45] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0f5a39] disabled:opacity-60 transition"
                    >
                      {enrolling ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
                      {enrolling ? "Enrolling…" : course.is_free ? "Enrol free" : "Enrol to start"}
                    </button>
                  )}
                  {lmsError && <p className="mt-3 text-[12px] text-red-200">{lmsError}</p>}
                </div>
              ) : selectedLesson ? (
                <>
                  {selectedLesson.type === "video" ? (
                    <video
                      ref={videoRef}
                      key={selectedLesson.url}
                      controls
                      className="aspect-video w-full bg-[#0b2a1c]"
                      src={selectedLesson.url}
                      onEnded={() => void markComplete()}
                    >
                      Your browser does not support video playback.
                    </video>
                  ) : isPdfUrl(selectedLesson.url) ? (
                    <iframe
                      key={selectedLesson.url}
                      title={selectedLesson.title}
                      src={selectedLesson.url}
                      className="aspect-video w-full bg-white"
                    />
                  ) : (
                    <div className="flex aspect-video flex-col items-center justify-center bg-gradient-to-br from-[#0b2a1c] to-[#0f3d28]">
                      <FileText size={48} className="text-white/60" />
                      <p className="mt-3 font-semibold text-white">Lesson resource</p>
                      <a
                        href={selectedLesson.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-white/20 transition"
                      >
                        <Download size={15} /> Open file
                      </a>
                    </div>
                  )}

                  {/* Lesson controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#157a4f]">
                        {selectedLesson.type} lesson
                      </p>
                      <h2 className="mt-0.5 font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#12241c]">
                        {selectedLesson.title}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentIdx === 0}
                        onClick={() => goToLesson("prev")}
                        className="flex items-center gap-1 rounded-lg border border-[#e4eee9] px-3 py-2 text-[12px] font-medium text-[#5b6b64] hover:bg-[#f7fbf9] disabled:opacity-40 transition"
                      >
                        <ChevronLeft size={14} /> Prev
                      </button>
                      <button
                        type="button"
                        onClick={() => void markComplete()}
                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                          completed.includes(selectedLesson.id)
                            ? "bg-[#d4ede2] text-[#146c45]"
                            : "bg-[#146c45] text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] hover:bg-[#0f5a39]"
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        {completed.includes(selectedLesson.id) ? "Completed" : "Mark complete"}
                      </button>
                      <button
                        type="button"
                        disabled={currentIdx === allLessons.length - 1}
                        onClick={() => goToLesson("next")}
                        className="flex items-center gap-1 rounded-lg border border-[#e4eee9] px-3 py-2 text-[12px] font-medium text-[#5b6b64] hover:bg-[#f7fbf9] disabled:opacity-40 transition"
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex aspect-video items-center justify-center text-[#7a8b84]">
                  This course has no lessons yet.
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="rounded-[22px] border border-white bg-white shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] overflow-hidden">
              <div className="flex border-b border-[#eef3f0]">
                {(accessGranted
                  ? (["content", "notes", "quizzes", "assignments", "qna", "reviews"] as Tab[])
                  : (["content", "reviews"] as Tab[])
                ).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex flex-1 items-center justify-center gap-1.5 py-3.5 text-[13px] font-semibold transition ${
                      activeTab === tab
                        ? "border-b-2 border-[#146c45] text-[#146c45]"
                        : "text-[#5b6b64] hover:text-[#12241c]"
                    }`}
                  >
                    {tab === "content"  && <><BookOpen size={14} /> Overview</>}
                    {tab === "notes"       && <><StickyNote size={14} /> Notes</>}
                    {tab === "quizzes"     && <><HelpCircle size={14} /> Quizzes</>}
                    {tab === "assignments" && <><ClipboardList size={14} /> Assignments</>}
                    {tab === "qna"      && <><MessageSquare size={14} /> Q&amp;A</>}
                    {tab === "reviews"  && <><Star size={14} /> Reviews</>}
                  </button>
                ))}
              </div>

              <div className="p-5">

                {/* ── Overview ── */}
                {activeTab === "content" && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#12241c]">About this course</h3>
                      <p className="mt-2 text-[14px] leading-7 text-[#5b6b64]">{course.description}</p>
                    </div>
                    {(course.what_you_learn ?? []).length > 0 && (
                      <div>
                        <h3 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">What you'll learn</h3>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {(course.what_you_learn ?? []).map((item) => (
                            <div key={item} className="flex items-start gap-2 text-[13px] text-[#3d4d46]">
                              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#146c45]" />
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(course.requirements ?? []).length > 0 && (
                      <div>
                        <h3 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Requirements</h3>
                        <ul className="mt-2 space-y-1">
                          {(course.requirements ?? []).map((r) => (
                            <li key={r} className="flex items-start gap-2 text-[13px] text-[#5b6b64]">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5b6b64]" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {course.instructor_name && (
                      <div className="rounded-xl border border-[#eef3f0] p-4">
                        <h3 className="text-[13px] font-semibold text-[#12241c]">Instructor</h3>
                        <div className="mt-3 flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eaf6f0] text-[18px] font-bold text-[#146c45]">
                            {course.instructor_name[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-[#12241c]">{course.instructor_name}</p>
                            {course.instructor_bio && <p className="mt-1 text-[13px] text-[#5b6b64]">{course.instructor_bio}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Notes ── */}
                {activeTab === "notes" && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={selectedLesson ? `Add a note for "${selectedLesson.title}"…` : "Select a lesson to add notes"}
                        rows={3}
                        className="flex-1 resize-none rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[13px] text-[#12241c] placeholder-[#7a8b84] outline-none focus:border-[#146c45] focus:ring-2 focus:ring-[#146c45]/10"
                      />
                      <button
                        type="button"
                        onClick={saveNote}
                        disabled={!note.trim()}
                        className="self-end rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0f5a39] disabled:opacity-50 transition"
                      >
                        Save
                      </button>
                    </div>
                    {lessonNotes.length === 0 && (
                      <p className="py-4 text-center text-[13px] text-[#7a8b84]">No notes for this lesson yet.</p>
                    )}
                    {lessonNotes.map((n, i) => (
                      <div key={i} className="rounded-xl border border-[#eef3f0] bg-[#f7fbf9] p-4">
                        <p className="text-[13px] text-[#3d4d46]">{n.text}</p>
                        <p className="mt-1.5 text-[11px] text-[#7a8b84]">{n.ts}</p>
                      </div>
                    ))}
                  </div>
                )}


                {activeTab === "quizzes" && (
                  <div className="space-y-4">
                    {lmsError && <p className="text-[13px] text-red-600">{lmsError}</p>}
                    {quizzes.length === 0 && (
                      <p className="py-4 text-center text-[13px] text-[#7a8b84]">No quizzes for this course yet.</p>
                    )}
                    {quizzes.map((quiz) => (
                      <div key={quiz.id} className="space-y-3 rounded-xl border border-[#eef3f0] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-semibold text-[#12241c]">{quiz.title}</h3>
                          {quiz.attempt && (
                            <span className="rounded-full bg-[#d4ede2] px-2.5 py-1 text-[11px] font-semibold text-[#146c45]">
                              Score {quiz.attempt.score}/{quiz.attempt.max_score}
                            </span>
                          )}
                        </div>
                        {quiz.questions.map((q) => (
                          <div key={q.id} className="space-y-2">
                            <p className="text-[13px] font-medium text-[#12241c]">{q.text}</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {q.options.map((option, idx) => (
                                <label key={`${q.id}-${idx}`} className="flex items-center gap-2 rounded-lg border border-[#eef3f0] px-3 py-2 text-[13px] text-[#3d4d46]">
                                  <input
                                    type="radio"
                                    name={`${quiz.id}-${q.id}`}
                                    checked={(quizAnswers[quiz.id]?.[q.id] ?? -1) === idx}
                                    onChange={() => setQuizAnswers((prev) => ({
                                      ...prev,
                                      [quiz.id]: { ...(prev[quiz.id] ?? {}), [q.id]: idx },
                                    }))}
                                    disabled={Boolean(quiz.attempt)}
                                  />
                                  {option}
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                        {!quiz.attempt && (
                          <button
                            type="button"
                            onClick={() => void submitQuiz(quiz)}
                            disabled={lmsBusy === quiz.id}
                            className="rounded-full bg-[#146c45] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0f5a39] disabled:opacity-50 transition"
                          >
                            {lmsBusy === quiz.id ? "Submitting..." : "Submit quiz"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "assignments" && (
                  <div className="space-y-4">
                    {lmsError && <p className="text-[13px] text-red-600">{lmsError}</p>}
                    {assignments.length === 0 && (
                      <p className="py-4 text-center text-[13px] text-[#7a8b84]">No assignments for this course yet.</p>
                    )}
                    {assignments.map((assignment) => {
                      const submission = submissions.find((item) => item.assignment_id === assignment.id);
                      const draft = assignmentDrafts[assignment.id] ?? { content: submission?.content ?? "", file_url: submission?.file_url ?? "" };
                      return (
                        <div key={assignment.id} className="space-y-3 rounded-xl border border-[#eef3f0] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold text-[#12241c]">{assignment.title}</h3>
                              <p className="mt-1 text-[13px] text-[#5b6b64]">{assignment.description || "No extra instructions."}</p>
                              <p className="mt-1 text-[12px] text-[#7a8b84]">Due {assignment.due_date || "No deadline"} · Max {assignment.max_score} pts</p>
                            </div>
                            {submission && (
                              <span className="rounded-full bg-[#d4ede2] px-2.5 py-1 text-[11px] font-semibold text-[#146c45]">
                                {submission.score != null ? `${submission.score}/${assignment.max_score}` : "Submitted"}
                              </span>
                            )}
                          </div>
                          <textarea
                            value={draft.content}
                            onChange={(e) => setAssignmentDrafts((prev) => ({ ...prev, [assignment.id]: { ...draft, content: e.target.value } }))}
                            placeholder="Write your response"
                            rows={4}
                            className="w-full resize-y rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[13px] text-[#12241c] outline-none focus:border-[#146c45] focus:ring-2 focus:ring-[#146c45]/10"
                          />
                          <input
                            value={draft.file_url}
                            onChange={(e) => setAssignmentDrafts((prev) => ({ ...prev, [assignment.id]: { ...draft, file_url: e.target.value } }))}
                            placeholder="Optional file URL"
                            className="w-full rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[13px] text-[#12241c] outline-none focus:border-[#146c45] focus:ring-2 focus:ring-[#146c45]/10"
                          />
                          <button
                            type="button"
                            onClick={() => void submitAssignment(assignment)}
                            disabled={lmsBusy === assignment.id}
                            className="rounded-full bg-[#146c45] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0f5a39] disabled:opacity-50 transition"
                          >
                            {lmsBusy === assignment.id ? "Submitting..." : submission ? "Update submission" : "Submit assignment"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Q&A ── */}
                {activeTab === "qna" && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask a question about this course…"
                        className="flex-1 rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[13px] text-[#12241c] placeholder-[#7a8b84] outline-none focus:border-[#146c45] focus:ring-2 focus:ring-[#146c45]/10"
                        onKeyDown={(e) => { if (e.key === "Enter") void submitQuestion(); }}
                      />
                      <button
                        type="button"
                        onClick={() => void submitQuestion()}
                        disabled={submittingQ || !question.trim()}
                        className="rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0f5a39] disabled:opacity-50 transition"
                      >
                        {submittingQ ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      </button>
                    </div>
                    {qna.length === 0 && (
                      <p className="py-4 text-center text-[13px] text-[#7a8b84]">No questions yet. Be the first to ask!</p>
                    )}
                    {qna.map((q) => (
                      <div key={q.id} className="space-y-2 rounded-xl border border-[#eef3f0] p-4">
                        <div className="flex items-start gap-2">
                          <MessageSquare size={15} className="mt-0.5 shrink-0 text-[#146c45]" />
                          <div>
                            <p className="text-[13px] font-semibold text-[#12241c]">{q.user_name}</p>
                            <p className="mt-0.5 text-[13px] text-[#3d4d46]">{q.question}</p>
                          </div>
                        </div>
                        {q.answer && (
                          <div className="ml-5 rounded-lg bg-[#eaf6f0] p-3">
                            <p className="text-[12px] font-semibold text-[#146c45]">Instructor reply</p>
                            <p className="mt-1 text-[13px] text-[#3d4d46]">{q.answer}</p>
                          </div>
                        )}
                        <button type="button" className="ml-5 flex items-center gap-1 text-[11px] text-[#7a8b84] hover:text-[#146c45]">
                          <ThumbsUp size={12} /> {q.upvotes ?? 0} helpful
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Reviews ── */}
                {activeTab === "reviews" && (
                  <div className="space-y-5">
                    {course.rating !== undefined && (
                      <div className="flex items-center gap-6 rounded-xl bg-[#f7fbf9] p-4">
                        <div className="text-center">
                          <p className="font-[family-name:var(--font-display)] text-[48px] font-semibold leading-none text-[#12241c]">
                            {course.rating.toFixed(1)}
                          </p>
                          <StarRating rating={course.rating} />
                          <p className="mt-1 text-[12px] text-[#5b6b64]">{course.review_count?.toLocaleString()} ratings</p>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          {[5,4,3,2,1].map((s) => {
                            const pct = reviews.length
                              ? Math.round(reviews.filter((r) => Math.round(r.rating) === s).length / reviews.length * 100)
                              : 0;
                            return (
                              <div key={s} className="flex items-center gap-2">
                                <div className="flex-1 h-2 overflow-hidden rounded-full bg-[#eef3f0]">
                                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                                </div>
                                <div className="flex shrink-0 items-center gap-0.5">
                                  {[1,2,3,4,5].map((x) => (
                                    <Star key={x} size={10} className={x <= s ? "fill-amber-400 text-amber-400" : "fill-[#eef3f0] text-[#eef3f0]"} />
                                  ))}
                                </div>
                                <span className="w-8 text-right text-[11px] text-[#7a8b84]">{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Write review */}
                    {accessGranted && (
                    <div className="space-y-3 rounded-xl border border-[#eef3f0] p-4">
                      <h3 className="text-[13px] font-semibold text-[#12241c]">Write a review</h3>
                      <StarRating rating={myRating} size={22} interactive onChange={setMyRating} />
                      <textarea
                        value={myReview}
                        onChange={(e) => setMyReview(e.target.value)}
                        placeholder="Share your experience with this course…"
                        rows={3}
                        className="w-full resize-none rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[13px] text-[#12241c] placeholder-[#7a8b84] outline-none focus:border-[#146c45] focus:ring-2 focus:ring-[#146c45]/10"
                      />
                      <button
                        type="button"
                        onClick={() => void submitReview()}
                        disabled={submittingReview || !myRating || !myReview.trim()}
                        className="inline-flex items-center gap-2 rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0f5a39] disabled:opacity-50 transition"
                      >
                        {submittingReview ? <Loader2 size={14} className="animate-spin" /> : null}
                        Submit review
                      </button>
                    </div>
                    )}

                    {reviews.length === 0 && (
                      <p className="py-4 text-center text-[13px] text-[#7a8b84]">No reviews yet.</p>
                    )}
                    {reviews.map((r) => (
                      <div key={r.id} className="rounded-xl border border-[#eef3f0] p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eaf6f0] text-[13px] font-bold text-[#146c45]">
                              {r.user_name[0]}
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-[#12241c]">{r.user_name}</p>
                              <StarRating rating={r.rating} />
                            </div>
                          </div>
                          <span className="text-[11px] text-[#7a8b84]">
                            {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <p className="mt-2 text-[13px] leading-6 text-[#3d4d46]">{r.comment}</p>
                        {r.helpful !== undefined && (
                          <button type="button" className="mt-2 flex items-center gap-1 text-[11px] text-[#7a8b84] hover:text-[#146c45]">
                            <ThumbsUp size={12} /> {r.helpful} found helpful
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-4">

            {/* Progress / enrol card */}
            <div className="rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
              <div className="mb-4">
                <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">FEE</p>
                <p className={`mt-1 font-[family-name:var(--font-display)] text-[22px] font-semibold ${course.is_free || !(course.price && course.price > 0) ? "text-[#146c45]" : "text-[#12241c]"}`}>
                  {courseFeeLabel(course)}
                </p>
              </div>
              {course.delivery_type === "live" && (
                <div className="mb-4 rounded-xl bg-[#f7fbf9] p-3 text-[13px] text-[#5b6b64]">
                  {(() => {
                    const batch = nextLiveBatch(course.live_batches);
                    if (!batch) return <p>No live batch scheduled yet.</p>;
                    const when = formatBatchWhen(batch);
                    return (
                      <>
                        <p className="flex items-start gap-2 font-medium text-[#12241c]">
                          <CalendarDays size={14} className="mt-0.5 shrink-0 text-[#146c45]" />
                          {when || "Batch time to be announced"}
                        </p>
                        {batch.capacity > 0 && (
                          <p className="mt-1.5 flex items-center gap-2">
                            <Users size={14} /> {batch.capacity} seats
                          </p>
                        )}
                        {accessGranted && batch.meeting_url ? (
                          <a
                            href={batch.meeting_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 font-semibold text-[#146c45] hover:underline"
                          >
                            <ExternalLink size={13} /> Join meeting
                          </a>
                        ) : paymentRequired ? (
                          <p className="mt-2 text-[12px] text-[#7a8b84]">Pay the course fee to unlock the meeting link.</p>
                        ) : accessGranted ? (
                          <p className="mt-2 text-[12px] text-[#7a8b84]">Meeting link appears after the academy publishes it.</p>
                        ) : (
                          <p className="mt-2 text-[12px] text-[#7a8b84]">Enrol to get the meeting link.</p>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
              {!accessGranted && (
                <div className="mb-4">
                  <h3 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">
                    {paymentRequired ? "Pay to unlock" : course.delivery_type === "live" ? "Enrol to join" : "Enrol to start"}
                  </h3>
                  <p className="mt-2 text-[13px] leading-6 text-[#5b6b64]">
                    {paymentRequired
                      ? "You are enrolled. Pay the course fee to open lessons, quizzes, and the live meeting link."
                      : course.delivery_type === "live"
                        ? "Review the live batch time and fee first. Enrol when you are ready to join the class."
                        : "Review the modules and course details first. Enrol when you are ready to open lessons."}
                  </p>
                  {paymentRequired ? (
                    <button
                      type="button"
                      onClick={() => void payFee()}
                      disabled={paying}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0f5a39] disabled:opacity-60 transition"
                    >
                      {paying ? <Loader2 size={15} className="animate-spin" /> : <BookOpen size={15} />}
                      {paying ? "Recording payment…" : `Pay ${courseFeeLabel(course)}`}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void enroll()}
                      disabled={enrolling}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0f5a39] disabled:opacity-60 transition"
                    >
                      {enrolling ? <Loader2 size={15} className="animate-spin" /> : course.delivery_type === "live" ? <Video size={15} /> : <BookOpen size={15} />}
                      {enrolling ? "Enrolling…" : course.is_free || !(course.price && course.price > 0) ? "Enrol free" : "Enrol now"}
                    </button>
                  )}
                  {lmsError && <p className="mt-2 text-[12px] text-red-600">{lmsError}</p>}
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">{accessGranted ? "Your progress" : "At a glance"}</h3>
                {accessGranted && <span className="font-semibold text-[#146c45]">{progress}%</span>}
              </div>
              {accessGranted && (
                <>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#eef3f0]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#146c45] to-[#157a62] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-[12px] text-[#5b6b64]">{completed.length} / {allLessons.length} lessons completed</p>
                </>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-[#f7fbf9] p-3 text-center">
                  <p className="font-[family-name:var(--font-display)] text-[22px] font-semibold text-[#12241c]">{allLessons.length}</p>
                  <p className="text-[11px] text-[#5b6b64]">Total lessons</p>
                </div>
                <div className="rounded-xl bg-[#f7fbf9] p-3 text-center">
                  <p className="font-[family-name:var(--font-display)] text-[22px] font-semibold text-[#12241c]">{course.duration}</p>
                  <p className="text-[11px] text-[#5b6b64]">Duration</p>
                </div>
              </div>

              {/* Certificate */}
              {certificateReady && course.certificate && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                  <Award size={28} className="mx-auto text-amber-500" />
                  <p className="mt-2 font-semibold text-[#12241c]">{issuedCert ? "Certificate issued!" : "Certificate ready"}</p>
                  <p className="mt-1 text-[12px] text-[#5b6b64]">
                    {issuedCert ? "You've completed this course." : "Claim your certificate to add it to your wallet."}
                  </p>
                  {lmsError && <p className="mt-2 text-[12px] text-red-600">{lmsError}</p>}
                  {!issuedCert ? (
                    <button
                      type="button"
                      onClick={() => void claimCertificate()}
                      disabled={lmsBusy === "certificate"}
                      className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-[12px] font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition"
                    >
                      {lmsBusy === "certificate" ? "Claiming..." : "Claim certificate"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={downloadCertificate}
                      className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-[12px] font-semibold text-white hover:bg-amber-600 transition"
                    >
                      <Download size={13} /> Download certificate
                    </button>
                  )}
                  <Link to="/candidate/certificates" className="mt-2 inline-block text-[12px] font-semibold text-amber-700 hover:underline">
                    View certificate wallet
                  </Link>
                </div>
              )}
            </div>

            {/* Course stats */}
            <div className="rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
              <h3 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c] mb-3">Course info</h3>
              <div className="space-y-2.5 text-[13px]">
                {course.rating !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#5b6b64]">Rating</span>
                    <div className="flex items-center gap-1">
                      <Star size={13} className="fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-[#12241c]">{course.rating.toFixed(1)}</span>
                      <span className="text-[#7a8b84]">({course.review_count?.toLocaleString()})</span>
                    </div>
                  </div>
                )}
                {course.student_count !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#5b6b64]">Students</span>
                    <span className="flex items-center gap-1 font-semibold text-[#12241c]">
                      <Users size={13} className="text-[#5b6b64]" />
                      {course.student_count.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[#5b6b64]">Level</span>
                  <span className="font-semibold text-[#12241c]">{course.level}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5b6b64]">Duration</span>
                  <span className="flex items-center gap-1 font-semibold text-[#12241c]">
                    <Clock3 size={13} className="text-[#5b6b64]" />
                    {course.duration}
                  </span>
                </div>
                {course.certificate && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#5b6b64]">Certificate</span>
                    <span className="flex items-center gap-1 font-semibold text-amber-600">
                      <Award size={13} /> Yes
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Module list */}
            <div className="rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
              <h3 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c] mb-4">Course content</h3>
              <div className="space-y-4">
                {course.modules.map((mod, index) => (
                  <section key={mod.id}>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#7a8b84]">Module {index + 1}</p>
                    <h4 className="mt-0.5 text-[13px] font-semibold text-[#12241c]">{mod.title}</h4>
                    <div className="mt-2 space-y-1">
                      {mod.lessons.map((lesson) => (
                        <button
                          type="button"
                          key={lesson.id}
                          onClick={() => { if (accessGranted) setSelectedLesson(lesson); }}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] transition ${
                            selectedLesson?.id === lesson.id
                              ? "bg-[#eaf6f0] text-[#146c45]"
                              : "text-[#5b6b64] hover:bg-[#f7fbf9]"
                          }`}
                        >
                          {completed.includes(lesson.id)
                            ? <CheckCircle2 size={14} className="shrink-0 text-[#146c45]" />
                            : lesson.type === "video"
                              ? <PlayCircle size={14} className="shrink-0" />
                              : <FileText size={14} className="shrink-0" />
                          }
                          <span className="flex-1 truncate">{lesson.title}</span>
                          {lesson.duration && (
                            <span className="shrink-0 text-[11px] text-[#7a8b84]">{lesson.duration}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            {/* Progress CTA */}
            {progress > 0 && progress < 100 && (
              <div className="rounded-[22px] border border-[#cfe6db] bg-[#eaf6f0] p-4 text-center">
                <TrendingUp size={20} className="mx-auto text-[#146c45]" />
                <p className="mt-2 text-[13px] font-semibold text-[#12241c]">Keep going!</p>
                <p className="mt-1 text-[12px] text-[#5b6b64]">{100 - progress}% left to complete</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

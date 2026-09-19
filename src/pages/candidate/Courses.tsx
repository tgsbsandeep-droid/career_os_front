import { useEffect, useState } from "react";
import {
  Bookmark, BookmarkCheck, BookOpen, CalendarDays, Clock, Search, CheckCircle2,
  ExternalLink, Loader2, Users, Video, PlayCircle, Star, Award,
  TrendingUp, Filter, ChevronDown, Sparkles, X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest, supabase } from "../../services/api";

type LiveBatch = {
  id: string; title: string; start_at: string; end_at?: string | null;
  schedule?: string; capacity: number; meeting_url?: string; status: string;
};

type CatalogCourse = {
  id: string; title: string; description?: string; provider: string;
  level: string; duration: string; delivery_type: "self_paced" | "live";
  thumbnail_url?: string; skills?: string[]; live_batches?: LiveBatch[];
  rating?: number; review_count?: number; student_count?: number;
  price?: number; is_free?: boolean; certificate?: boolean;
  instructor_name?: string; instructor_avatar?: string;
  total_lessons?: number; language?: string;
};

type Enrollment = {
  course_id: string;
  progress?: number;
  completed_lessons?: string[];
  payment_status?: string | null;
  access_granted?: boolean;
  payment_required?: boolean;
};
type PageMeta = { total: number; limit: number; offset: number; hasMore: boolean };

const PAGE_SIZE = 50;

const levelColors: Record<string, string> = {
  Beginner:     "bg-[#d4ede2] text-[#146c45]",
  Intermediate: "bg-blue-100 text-blue-700",
  Advanced:     "bg-violet-100 text-violet-700",
  "All levels": "bg-[#eef3f0] text-[#5b6b64]",
};

const DELIVERY_FILTERS = ["All", "Self-paced", "Live"];
const LEVEL_FILTERS    = ["All levels", "Beginner", "Intermediate", "Advanced"];
const SORT_OPTIONS     = ["Most popular", "Highest rated", "Newest", "Price: Low to High"];

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

function courseFeeLabel(course: Pick<CatalogCourse, "is_free" | "price">) {
  if (course.is_free || !(course.price && course.price > 0)) return "Free";
  return `₹${course.price.toLocaleString("en-IN")}`;
}

function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1,2,3,4,5].map((s) => (
          <Star
            key={s}
            size={13}
            className={s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-[#eef3f0] text-[#eef3f0]"}
          />
        ))}
      </div>
      <span className="text-[12px] font-semibold text-amber-600">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-[11px] text-[#7a8b84]">({count.toLocaleString()})</span>}
    </div>
  );
}

export default function Courses() {
  const [searchParams] = useSearchParams();
  const [query, setQuery]                     = useState(() => searchParams.get("q") ?? "");
  const [skillsFromCoach]                     = useState<string[]>(() => {
    const s = searchParams.get("skills");
    return s ? s.split(",").map((x) => x.trim()).filter(Boolean) : [];
  });
  const [deliveryFilter, setDeliveryFilter]   = useState("All");
  const [levelFilter, setLevelFilter]         = useState("All levels");
  const [sortBy, setSortBy]                   = useState("Most popular");
  const [showFilters, setShowFilters]         = useState(false);
  const [availableCourses, setAvailableCourses] = useState<CatalogCourse[]>([]);
  const [hasMore, setHasMore]                 = useState(false);
  const [loadingMore, setLoadingMore]         = useState(false);
  const [enrollments, setEnrollments]         = useState<Map<string, Enrollment>>(new Map());
  const [savedCourses, setSavedCourses]       = useState(new Set<string>());
  const [savingId, setSavingId]               = useState<string | null>(null);
  const [userId, setUserId]                   = useState<string | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (user) setUserId(user.id);
      const coursesReq = apiRequest<{ courses: CatalogCourse[]; page?: PageMeta }>(`/api/courses?limit=${PAGE_SIZE}&offset=0`);
      const enrollmentsReq = user
        ? apiRequest<{ enrollments: Enrollment[] }>(`/api/candidate/${user.id}/enrollments`)
        : Promise.resolve({ enrollments: [] });
      const savedReq = user
        ? apiRequest<{ saved_courses: { course_id: string }[] }>(`/api/candidate/${user.id}/saved-courses`).catch(() => ({ saved_courses: [] }))
        : Promise.resolve({ saved_courses: [] });
      return Promise.all([coursesReq, enrollmentsReq, savedReq]);
    }).then(([coursesRes, enrollmentsRes, savedRes]) => {
      setAvailableCourses(coursesRes.courses);
      setHasMore(Boolean(coursesRes.page?.hasMore));
      const map = new Map<string, Enrollment>();
      enrollmentsRes.enrollments.forEach((e) => map.set(e.course_id, e));
      setEnrollments(map);
      setSavedCourses(new Set((savedRes.saved_courses ?? []).map((row) => row.course_id)));
    }).catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const response = await apiRequest<{ courses: CatalogCourse[]; page?: PageMeta }>(`/api/courses?limit=${PAGE_SIZE}&offset=${availableCourses.length}`);
      setAvailableCourses((current) => {
        const seen = new Set(current.map((course) => course.id));
        return [...current, ...response.courses.filter((course) => !seen.has(course.id))];
      });
      setHasMore(Boolean(response.page?.hasMore));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  async function toggleSave(courseId: string) {
    if (!userId) return;
    setSavingId(courseId);
    const isSaved = savedCourses.has(courseId);
    try {
      await apiRequest(`/api/candidate/${userId}/saved-courses/${courseId}`, { method: isSaved ? "DELETE" : "POST" });
      setSavedCourses((curr) => {
        const next = new Set(curr);
        if (isSaved) next.delete(courseId);
        else next.add(courseId);
        return next;
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  const isRecommendedMode = skillsFromCoach.length > 0 || (searchParams.get("q") ?? "") !== "";

  const filtered = availableCourses
    .filter((c) => {
      const q = query.toLowerCase();
      const matchesQuery = !q || `${c.title} ${c.level} ${c.provider} ${(c.skills ?? []).join(" ")} ${c.instructor_name ?? ""}`.toLowerCase().includes(q);
      const matchesDelivery =
        deliveryFilter === "All" ||
        (deliveryFilter === "Self-paced" && c.delivery_type === "self_paced") ||
        (deliveryFilter === "Live" && c.delivery_type === "live");
      const matchesLevel = levelFilter === "All levels" || c.level === levelFilter;
      // If arriving from CareerCoach with skills, also require at least one skill overlap
      const matchesSkills = skillsFromCoach.length === 0 || (c.skills ?? []).some((s) =>
        skillsFromCoach.some((sk) => s.toLowerCase().includes(sk.toLowerCase()) || sk.toLowerCase().includes(s.toLowerCase()))
      ) || `${c.title} ${c.description ?? ""}`.toLowerCase().includes((searchParams.get("q") ?? "").toLowerCase());
      return matchesQuery && matchesDelivery && matchesLevel && matchesSkills;
    })
    .sort((a, b) => {
      if (sortBy === "Highest rated") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === "Price: Low to High") return (a.price ?? 0) - (b.price ?? 0);
      return (b.student_count ?? 0) - (a.student_count ?? 0);
    });

  const enrolledCount = enrollments.size;

  return (
    <main className="min-h-screen bg-[#f7fbf9]">
      <div className="mx-auto max-w-[1180px] px-5 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">LEARNING CATALOG</p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">
              Courses
            </h1>
            <p className="mt-2 text-[15px] leading-7 text-[#5b6b64]">
              {loading ? "Loading…" : `${filtered.length} course${filtered.length !== 1 ? "s" : ""} available`}
            </p>
          </div>
          {enrolledCount > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-[#cfe6db] bg-[#eaf6f0] px-4 py-2.5 text-[13px] font-semibold text-[#146c45]">
              <CheckCircle2 size={16} />
              {enrolledCount} enrolled
            </div>
          )}
        </div>

        {/* Recommendation banner — shown when arriving from CareerCoach */}
        {isRecommendedMode && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#cfe6db] bg-[#eaf6f0] px-5 py-3.5">
            <div className="flex items-center gap-2.5 text-[13px] font-medium text-[#146c45]">
              <Sparkles size={15} className="shrink-0" />
              Showing courses recommended for <strong className="font-semibold">{searchParams.get("q") ?? "your target role"}</strong>
              {skillsFromCoach.length > 0 && (
                <span className="hidden sm:inline text-[#5b6b64]">
                  · matched on: {skillsFromCoach.slice(0, 4).join(", ")}
                </span>
              )}
            </div>
            <Link to="/candidate/courses" className="flex items-center gap-1 rounded-full border border-[#cfe6db] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5b6b64] hover:bg-[#f7fbf9] transition">
              <X size={12} /> Clear
            </Link>
          </div>
        )}

        {/* Search + filter bar */}
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a8b84]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses, instructors, or skills…"
                className="w-full rounded-xl border border-[#e4eee9] bg-white py-3 pl-10 pr-4 text-[14px] text-[#12241c] placeholder-[#7a8b84] shadow-sm outline-none transition focus:border-[#146c45] focus:ring-2 focus:ring-[#146c45]/10"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-[13px] font-semibold transition ${showFilters ? "border-[#146c45] bg-[#eaf6f0] text-[#146c45]" : "border-[#e4eee9] bg-white text-[#5b6b64] hover:border-[#cfe6db]"}`}
            >
              <Filter size={15} />
              Filters
              <ChevronDown size={14} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-[#e4eee9] bg-white px-4 py-3 text-[13px] font-medium text-[#3d4d46] outline-none focus:border-[#146c45]"
            >
              {SORT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-4 rounded-[22px] border border-[#e4eee9] bg-white p-4">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#7a8b84]">Format</p>
                <div className="flex gap-1.5">
                  {DELIVERY_FILTERS.map((f) => (
                    <button key={f} type="button" onClick={() => setDeliveryFilter(f)}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${deliveryFilter === f ? "bg-[#146c45] text-white" : "border border-[#d5e3dc] bg-[#f7fbf9] text-[#5b6b64] hover:border-[#b7cec3]"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#7a8b84]">Level</p>
                <div className="flex flex-wrap gap-1.5">
                  {LEVEL_FILTERS.map((f) => (
                    <button key={f} type="button" onClick={() => setLevelFilter(f)}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${levelFilter === f ? "bg-[#146c45] text-white" : "border border-[#d5e3dc] bg-[#f7fbf9] text-[#5b6b64] hover:border-[#b7cec3]"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="animate-pulse rounded-[22px] border border-white bg-white shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
                <div className="h-40 rounded-t-[22px] bg-[#eef3f0]" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-3/4 rounded bg-[#eef3f0]" />
                  <div className="h-3 w-1/2 rounded bg-[#eef3f0]" />
                  <div className="h-8 rounded-full bg-[#eef3f0]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="rounded-[22px] border border-white bg-white p-12 text-center shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <BookOpen size={36} className="mx-auto text-[#c9d6cf]" />
            <p className="mt-3 font-semibold text-[#12241c]">No courses found</p>
            <p className="mt-1 text-[13px] text-[#7a8b84]">Try adjusting your search or filters.</p>
          </div>
        )}

        {/* Course grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course) => {
              const enrollment = enrollments.get(course.id);
              const isEnrolled = Boolean(enrollment);
              const accessGranted = Boolean(enrollment?.access_granted ?? (isEnrolled && enrollment?.payment_required !== true && enrollment?.payment_status !== "unpaid"));
              const paymentRequired = Boolean(enrollment?.payment_required) || (isEnrolled && !accessGranted && course.is_free === false && Boolean(course.price && course.price > 0));
              const isSaved = savedCourses.has(course.id);
              const isSaving = savingId === course.id;
              const progress = enrollment?.progress ?? 0;
              const levelColor = levelColors[course.level] ?? "bg-[#eef3f0] text-[#5b6b64]";

              return (
                <article
                  key={course.id}
                  className="group flex flex-col rounded-[22px] border border-white bg-white shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] transition hover:border-[#cfe6db] hover:shadow-[0_18px_40px_-28px_rgba(18,50,36,0.28)] overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className={`relative h-40 flex items-center justify-center ${course.delivery_type === "live" ? "bg-gradient-to-br from-violet-600 to-violet-800" : "bg-gradient-to-br from-[#146c45] to-[#0b5c3a]"}`}>
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-white/80">
                        {course.delivery_type === "live" ? <Video size={32} /> : <PlayCircle size={32} />}
                        <span className="text-[12px] font-medium">{course.delivery_type === "live" ? "Live class" : "Self-paced"}</span>
                      </div>
                    )}
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${levelColor}`}>{course.level}</span>
                      {course.certificate && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-400/90 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                          <Award size={11} /> Certificate
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={!userId || isSaving}
                      onClick={() => void toggleSave(course.id)}
                      title={isSaved ? "Remove from saved" : "Save course"}
                      className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/40 disabled:opacity-60"
                    >
                      {isSaving ? <Loader2 size={15} className="animate-spin" /> : isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                    </button>
                    {(course.is_free || !(course.price && course.price > 0)) ? (
                      <span className="absolute top-12 right-3 rounded-full bg-[#146c45] px-2.5 py-1 text-[11px] font-bold text-white">FREE</span>
                    ) : (
                      <span className="absolute top-12 right-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#12241c]">
                        {courseFeeLabel(course)}
                      </span>
                    )}
                    {isEnrolled && progress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
                        <div className="h-full bg-white/90 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c] leading-snug group-hover:text-[#146c45] transition line-clamp-2">
                      <Link to={`/candidate/courses/${course.id}`} className="hover:underline">
                        {course.title}
                      </Link>
                    </h2>
                    <p className="mt-1 text-[12px] text-[#5b6b64]">
                      {course.instructor_name ?? course.provider}
                    </p>

                    {/* Rating */}
                    {course.rating !== undefined && (
                      <div className="mt-2">
                        <StarRating rating={course.rating} count={course.review_count} />
                      </div>
                    )}

                    {/* Meta */}
                    <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-[#5b6b64]">
                      <span className="flex items-center gap-1"><Clock size={12} />{course.duration}</span>
                      {course.total_lessons && <span className="flex items-center gap-1"><BookOpen size={12} />{course.total_lessons} lessons</span>}
                      {course.student_count && (
                        <span className="flex items-center gap-1"><Users size={12} />{course.student_count.toLocaleString()} students</span>
                      )}
                    </div>
                    {course.delivery_type === "live" && (() => {
                      const batch = nextLiveBatch(course.live_batches);
                      if (!batch) {
                        return <p className="mt-2 text-[12px] text-[#7a8b84]">No live batch scheduled yet.</p>;
                      }
                      const when = formatBatchWhen(batch);
                      return (
                        <div className="mt-2 rounded-xl bg-[#f7fbf9] px-3 py-2 text-[12px] text-[#5b6b64]">
                          {when && (
                            <p className="flex items-center gap-1.5 font-medium text-[#12241c]">
                              <CalendarDays size={12} className="text-[#146c45]" /> {when}
                            </p>
                          )}
                          {batch.capacity > 0 && (
                            <p className="mt-1 flex items-center gap-1.5">
                              <Users size={12} /> {batch.capacity} seats
                            </p>
                          )}
                          {accessGranted && batch.meeting_url ? (
                            <a
                              href={batch.meeting_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="mt-1.5 inline-flex items-center gap-1.5 font-semibold text-[#146c45] hover:underline"
                            >
                              <ExternalLink size={12} /> Join live class
                            </a>
                          ) : paymentRequired ? (
                            <p className="mt-1 text-[11px] text-[#7a8b84]">Pay the course fee to unlock the meeting link.</p>
                          ) : isEnrolled ? (
                            <p className="mt-1 text-[11px] text-[#7a8b84]">Meeting link appears here once the academy publishes it.</p>
                          ) : (
                            <p className="mt-1 text-[11px] text-[#7a8b84]">Meeting link is shared after you enrol.</p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Skills */}
                    {(course.skills ?? []).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(course.skills ?? []).slice(0, 3).map((skill) => (
                          <span key={skill} className="rounded-full border border-[#e4eee9] bg-[#f7fbf9] px-2 py-0.5 text-[11px] text-[#5b6b64]">
                            {skill}
                          </span>
                        ))}
                        {(course.skills ?? []).length > 3 && (
                          <span className="rounded-full border border-[#e4eee9] bg-[#f7fbf9] px-2 py-0.5 text-[11px] text-[#7a8b84]">
                            +{(course.skills ?? []).length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Progress bar for enrolled */}
                    {isEnrolled && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] text-[#5b6b64] mb-1">
                          <span className="flex items-center gap-1"><TrendingUp size={11} /> Progress</span>
                          <span className="font-semibold text-[#146c45]">{progress}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#eef3f0]">
                          <div className="h-full rounded-full bg-[#146c45] transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="mt-auto pt-4">
                      <p className={`mb-3 font-[family-name:var(--font-display)] text-[18px] font-semibold ${course.is_free || !(course.price && course.price > 0) ? "text-[#146c45]" : "text-[#12241c]"}`}>
                        {courseFeeLabel(course)}
                      </p>

                      {/* CTA */}
                      {paymentRequired ? (
                        <Link
                          to={`/candidate/courses/${course.id}`}
                          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] hover:bg-[#0f5a39] transition"
                        >
                          <BookOpen size={16} />
                          Pay {courseFeeLabel(course)} to unlock
                        </Link>
                      ) : isEnrolled ? (
                        <Link
                          to={`/candidate/courses/${course.id}`}
                          className="flex w-full items-center justify-center gap-2 rounded-full border border-[#cfe6db] bg-[#eaf6f0] px-4 py-2.5 text-[13px] font-semibold text-[#146c45] hover:bg-[#d4ede2] transition"
                        >
                          {course.delivery_type === "live" ? <Video size={16} /> : <PlayCircle size={16} />}
                          {course.delivery_type === "live" ? "Open live class" : progress > 0 ? "Continue learning" : "Start course"}
                        </Link>
                      ) : course.delivery_type === "live" ? (
                        <Link
                          to={`/candidate/courses/${course.id}`}
                          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] hover:bg-[#0f5a39] transition"
                        >
                          <Video size={15} />
                          View live class
                        </Link>
                      ) : (
                        <Link
                          to={`/candidate/courses/${course.id}`}
                          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] hover:bg-[#0f5a39] transition"
                        >
                          <BookOpen size={15} />
                          View course
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
            {hasMore && (
              <div className="col-span-full flex justify-center pt-2">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                  className="inline-flex items-center gap-2 rounded-full border border-[#cfe6db] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#146c45] shadow-sm transition hover:bg-[#eaf6f0] disabled:opacity-60"
                >
                  {loadingMore ? <Loader2 size={15} className="animate-spin" /> : null}
                  {loadingMore ? "Loading…" : "Load more courses"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

import {
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  Calendar,
  Award,
  Users,
  BookOpen,
  Building2,
  IndianRupee,
  Mail,
  Phone,
  FileText,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

type TrainingCategory = "all" | "tech" | "management" | "design" | "data" | "softskills" | "certification";

type Training = {
  id: string;
  title: string;
  provider: string;
  city: string;
  address: string;
  venue: string;
  category: Exclude<TrainingCategory, "all">;
  duration: string;
  startDate: string;
  endDate: string;
  schedule: string;
  language: string;
  batchSize: number;
  seatsLeft: number;
  price: number;
  description: string;
  overview: string;
  highlights: string[];
  inclusions: string[];
  skills: string[];
  certificate: boolean;
  level: "Beginner" | "Intermediate" | "Advanced";
  contactEmail: string;
  contactPhone: string;
};

type Registration = {
  trainingId: string;
  registrationId: string;
  enrolledAt: string;
  fullName: string;
  email: string;
  phone: string;
  status: "confirmed" | "waitlisted";
};

type EnrollForm = {
  fullName: string;
  email: string;
  phone: string;
};

const STORAGE_KEY = "careeros.offline-training.registrations";

const TRAININGS: Training[] = [
  {
    id: "1",
    title: "Full-Stack Development Bootcamp",
    provider: "Masai School",
    city: "Bangalore",
    address: "Koramangala, Bangalore",
    venue: "Masai Campus, 3rd Floor, 5th Block, Koramangala",
    category: "tech",
    duration: "6 months",
    startDate: "2026-10-01",
    endDate: "2027-03-31",
    schedule: "Mon–Fri, 10:00 AM – 6:00 PM IST",
    language: "English",
    batchSize: 40,
    seatsLeft: 12,
    price: 150000,
    description: "Intensive full-stack bootcamp covering HTML, CSS, JavaScript, React, Node.js, and databases. Job placement support included.",
    overview:
      "A classroom bootcamp for career switchers. You will build production-style projects, get daily mentor feedback, and finish with a placement sprint. Classes are in person so you can pair-program, present work, and use campus labs.",
    highlights: [
      "Daily in-person labs with teaching assistants",
      "Capstone project reviewed by hiring partners",
      "Placement support: resume clinic, mock interviews, referrals",
      "Weekend catch-up sessions for anyone who misses a weekday",
    ],
    inclusions: ["Campus access", "Course materials", "Placement support", "Certificate of completion"],
    skills: ["HTML/CSS", "JavaScript", "React", "Node.js", "MongoDB"],
    certificate: true,
    level: "Beginner",
    contactEmail: "admissions@masaischool.example",
    contactPhone: "+91 80 4567 2101",
  },
  {
    id: "2",
    title: "AWS Solutions Architect Certification",
    provider: "KnowledgeHut",
    city: "Mumbai",
    address: "Andheri West, Mumbai",
    venue: "KnowledgeHut Learning Centre, Andheri West",
    category: "certification",
    duration: "3 months",
    startDate: "2026-09-22",
    endDate: "2026-12-18",
    schedule: "Tue & Thu, 7:00 PM – 9:30 PM IST · Sat labs 10:00 AM – 1:00 PM",
    language: "English",
    batchSize: 25,
    seatsLeft: 8,
    price: 45000,
    description: "Comprehensive AWS certification prep covering EC2, S3, RDS, Lambda, and more. Includes mock exams and hands-on labs.",
    overview:
      "Instructor-led AWS SAA prep with weekday theory and Saturday cloud labs. You will provision real AWS resources, sit timed mock exams, and get a readiness score before you book the official test.",
    highlights: [
      "Official-style mock exams with score reports",
      "Hands-on labs on EC2, S3, RDS, IAM, and Lambda",
      "Exam booking guidance and voucher support",
      "Recorded recap of each classroom session",
    ],
    inclusions: ["Lab credits", "Mock exams", "Study guide", "Certificate of completion"],
    skills: ["AWS", "Cloud Architecture", "DevOps", "Security"],
    certificate: true,
    level: "Intermediate",
    contactEmail: "mumbai@knowledgehut.example",
    contactPhone: "+91 22 3980 4410",
  },
  {
    id: "3",
    title: "Product Management Fundamentals",
    provider: "Product School",
    city: "Delhi",
    address: "Connaught Place, New Delhi",
    venue: "Product School Studio, Connaught Place",
    category: "management",
    duration: "2 months",
    startDate: "2026-10-10",
    endDate: "2026-12-05",
    schedule: "Sat–Sun, 9:30 AM – 1:30 PM IST",
    language: "English",
    batchSize: 30,
    seatsLeft: 15,
    price: 60000,
    description: "Learn product thinking, roadmapping, user research, and stakeholder management from experienced PMs at top companies.",
    overview:
      "Weekend classroom programme for aspiring and early PMs. You will write PRDs, run research interviews, and present a product case to visiting PMs from consumer and B2B companies.",
    highlights: [
      "Live case clinics with working product managers",
      "Portfolio-ready PRD and roadmap artefacts",
      "Stakeholder simulation and prioritisation drills",
      "Alumni review of your final product pitch",
    ],
    inclusions: ["Workbook", "Case library", "Guest AMAs", "Certificate of completion"],
    skills: ["Product Strategy", "User Research", "Roadmapping", "Agile", "Analytics"],
    certificate: true,
    level: "Intermediate",
    contactEmail: "delhi@productschool.example",
    contactPhone: "+91 11 4155 9022",
  },
  {
    id: "4",
    title: "Data Science & Machine Learning",
    provider: "UpGrad Campus",
    city: "Hyderabad",
    address: "Hitech City, Hyderabad",
    venue: "UpGrad Campus, Hitech City",
    category: "data",
    duration: "4 months",
    startDate: "2026-10-05",
    endDate: "2027-02-05",
    schedule: "Mon, Wed, Fri, 6:30 PM – 9:00 PM IST",
    language: "English",
    batchSize: 35,
    seatsLeft: 20,
    price: 80000,
    description: "End-to-end data science program covering Python, statistics, ML algorithms, deep learning, and real-world projects.",
    overview:
      "Evening classroom track for working professionals. You will move from Python and statistics into supervised ML, then ship two industry projects with faculty review.",
    highlights: [
      "GPU lab access for deep-learning modules",
      "Two graded industry projects",
      "Doubt-clearing desks after every session",
      "Career coach session in the final month",
    ],
    inclusions: ["Lab access", "Datasets", "Project reviews", "Certificate of completion"],
    skills: ["Python", "Machine Learning", "Deep Learning", "SQL", "Tableau"],
    certificate: true,
    level: "Intermediate",
    contactEmail: "hyderabad@upgrad.example",
    contactPhone: "+91 40 6717 3300",
  },
  {
    id: "5",
    title: "UI/UX Design Bootcamp",
    provider: "Designboat",
    city: "Pune",
    address: "Baner, Pune",
    venue: "Designboat Studio, Baner",
    category: "design",
    duration: "3 months",
    startDate: "2026-09-28",
    endDate: "2026-12-20",
    schedule: "Mon–Fri, 11:00 AM – 5:00 PM IST",
    language: "English",
    batchSize: 20,
    seatsLeft: 5,
    price: 55000,
    description: "Hands-on UX design program covering user research, wireframing, prototyping in Figma, and portfolio building.",
    overview:
      "Studio-style bootcamp with small batches. You will research a live brief, prototype in Figma, run usability tests, and leave with a portfolio reviewed by practising designers.",
    highlights: [
      "Figma studio machines and licensed plugins",
      "Weekly critique with practising designers",
      "Usability-test lab with real participants",
      "Portfolio review before graduation",
    ],
    inclusions: ["Studio access", "Figma seats", "Portfolio review", "Certificate of completion"],
    skills: ["Figma", "UX Research", "Wireframing", "Prototyping", "Design Systems"],
    certificate: true,
    level: "Beginner",
    contactEmail: "studio@designboat.example",
    contactPhone: "+91 20 4860 1188",
  },
  {
    id: "6",
    title: "Leadership & Communication Skills",
    provider: "Dale Carnegie",
    city: "Chennai",
    address: "Anna Nagar, Chennai",
    venue: "Dale Carnegie Centre, Anna Nagar",
    category: "softskills",
    duration: "6 weeks",
    startDate: "2026-10-15",
    endDate: "2026-11-26",
    schedule: "Thu, 6:00 PM – 9:00 PM IST · Sat, 10:00 AM – 1:00 PM IST",
    language: "English",
    batchSize: 25,
    seatsLeft: 18,
    price: 25000,
    description: "Develop leadership presence, public speaking, conflict resolution, and team management skills through interactive workshops.",
    overview:
      "Workshop series for first-time managers and high-potential ICs. Sessions mix speaking drills, conflict role-play, and feedback from certified trainers.",
    highlights: [
      "Video-reviewed speaking practice",
      "Conflict and feedback role-plays",
      "Personal leadership action plan",
      "Small cohort of 25 for live coaching",
    ],
    inclusions: ["Workbook", "Video reviews", "Action plan coaching", "Certificate of completion"],
    skills: ["Leadership", "Public Speaking", "Communication", "Team Management"],
    certificate: true,
    level: "Beginner",
    contactEmail: "chennai@dalecarnegie.example",
    contactPhone: "+91 44 4208 7755",
  },
];

const categoryConfig: Record<TrainingCategory, { label: string; color: string }> = {
  all: { label: "All programs", color: "bg-[#eef3f0] text-[#5b6b64]" },
  tech: { label: "Technology", color: "bg-blue-50 text-blue-700" },
  management: { label: "Management", color: "bg-violet-50 text-violet-700" },
  design: { label: "Design", color: "bg-pink-50 text-pink-700" },
  data: { label: "Data & AI", color: "bg-amber-50 text-amber-700" },
  softskills: { label: "Soft Skills", color: "bg-[#eaf6f0] text-[#146c45]" },
  certification: { label: "Certification", color: "bg-red-50 text-red-700" },
};

const levelConfig: Record<Training["level"], string> = {
  Beginner: "bg-[#eaf6f0] text-[#146c45]",
  Intermediate: "bg-amber-50 text-amber-700",
  Advanced: "bg-red-50 text-red-700",
};

const inputClass =
  "w-full min-h-11 rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[14px] text-[#12241c] placeholder-[#7a8b84] outline-none transition duration-200 focus:border-[#146c45] focus:bg-white focus:ring-2 focus:ring-[#146c45]/10";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatPrice(price: number) {
  if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
  return `₹${(price / 1000).toFixed(0)}K`;
}

function formatPriceFull(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

function loadRegistrations(): Record<string, Registration> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Registration>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveRegistrations(map: Record<string, Registration>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function makeRegistrationId(trainingId: string) {
  const token = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OT-${trainingId}-${token}`;
}

function TrainingBadges({ training }: { training: Training }) {
  const catCfg = categoryConfig[training.category];
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${catCfg.color}`}>{catCfg.label}</span>
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${levelConfig[training.level]}`}>{training.level}</span>
      {training.certificate && (
        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
          <Award size={10} /> Certificate
        </span>
      )}
    </div>
  );
}

function RegistrationPanel({ training, registration }: { training: Training; registration: Registration }) {
  return (
    <section className="rounded-[22px] border border-[#cfe6db] bg-[#f7fbf9] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">REGISTRATION</p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#12241c]">
            {registration.status === "confirmed" ? "Seat confirmed" : "Waitlisted"}
          </h2>
          <p className="mt-1 text-[13px] text-[#5b6b64]">
            Show this registration at the venue. Keep the ID until the batch starts.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ${
            registration.status === "confirmed" ? "bg-[#eaf6f0] text-[#146c45]" : "bg-amber-50 text-amber-800"
          }`}
        >
          <CheckCircle2 size={14} />
          {registration.status === "confirmed" ? "Confirmed" : "Waitlisted"}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-white px-4 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#7a8b84]">Registration ID</dt>
          <dd className="mt-1 font-mono text-[14px] font-semibold text-[#12241c]">{registration.registrationId}</dd>
        </div>
        <div className="rounded-xl bg-white px-4 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#7a8b84]">Registered on</dt>
          <dd className="mt-1 text-[14px] font-semibold text-[#12241c]">{formatDate(registration.enrolledAt)}</dd>
        </div>
        <div className="rounded-xl bg-white px-4 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#7a8b84]">Candidate</dt>
          <dd className="mt-1 text-[14px] font-semibold text-[#12241c]">{registration.fullName}</dd>
          <dd className="mt-0.5 text-[12px] text-[#5b6b64]">{registration.email}</dd>
        </div>
        <div className="rounded-xl bg-white px-4 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#7a8b84]">Phone</dt>
          <dd className="mt-1 text-[14px] font-semibold text-[#12241c]">{registration.phone}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-2 text-[13px] text-[#5b6b64]">
        <p className="flex items-start gap-2">
          <MapPin size={14} className="mt-0.5 shrink-0 text-[#146c45]" />
          <span>
            <strong className="text-[#12241c]">Report to:</strong> {training.venue}
          </span>
        </p>
        <p className="flex items-start gap-2">
          <Calendar size={14} className="mt-0.5 shrink-0 text-[#146c45]" />
          <span>
            <strong className="text-[#12241c]">Batch:</strong> {formatDate(training.startDate)} – {formatDate(training.endDate)} · {training.schedule}
          </span>
        </p>
      </div>

      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-[13px] leading-6 text-[#5b6b64]">
        <li>Arrive 15 minutes early on day one with a government ID.</li>
        <li>The academy will email joining instructions to {registration.email}.</li>
        <li>Fee of {formatPriceFull(training.price)} is collected at the venue unless you already paid.</li>
        <li>
          Questions: {training.contactEmail} · {training.contactPhone}
        </li>
      </ol>
    </section>
  );
}

function EnrollModal({
  training,
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  training: Training;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (form: EnrollForm) => void;
}) {
  const titleId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<EnrollForm>({ fullName: "", email: "", phone: "" });
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstFieldRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || submitting) return;
      event.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    if (!fullName) {
      setFieldError("Enter the name that should appear on the registration.");
      firstFieldRef.current?.focus();
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError("Enter a valid email for joining instructions.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setFieldError("Enter a 10-digit phone number.");
      return;
    }
    setFieldError(null);
    onSubmit({ fullName, email, phone });
  }

  const alertText = fieldError || error;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button type="button" aria-label="Close registration form" className="absolute inset-0 cursor-pointer bg-[#12241c]/50" onClick={() => !submitting && onClose()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[81] flex max-h-[92dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[24px] border border-white bg-white shadow-[0_24px_60px_-28px_rgba(18,50,36,0.45)] sm:rounded-[24px]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#eef3f0] px-5 py-4">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">REGISTER</p>
            <h2 id={titleId} className="mt-1 font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#12241c]">
              {training.title}
            </h2>
            <p className="mt-1 text-[13px] text-[#5b6b64]">
              {training.provider} · {training.city} · starts {formatDate(training.startDate)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            className="grid h-9 w-9 place-items-center rounded-full text-[#5b6b64] hover:bg-[#f7fbf9]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
          <p className="text-[13px] leading-6 text-[#5b6b64]">
            Confirm your details to hold a seat. This does not charge you yet — the academy collects {formatPriceFull(training.price)} at the venue.
          </p>
          {alertText && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{alertText}</p>}
          <label className="mt-4 block text-[13px] font-medium text-[#3d4d46]">
            Full name
            <input
              ref={firstFieldRef}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className={`${inputClass} mt-1.5`}
              autoComplete="name"
            />
          </label>
          <label className="mt-3 block text-[13px] font-medium text-[#3d4d46]">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={`${inputClass} mt-1.5`}
              autoComplete="email"
            />
          </label>
          <label className="mt-3 block text-[13px] font-medium text-[#3d4d46]">
            Phone
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={`${inputClass} mt-1.5`}
              autoComplete="tel"
            />
          </label>
          <div className="mt-5 flex gap-3 pb-2">
            <button
              type="button"
              onClick={() => !submitting && onClose()}
              className="flex-1 rounded-full border border-[#e4eee9] px-4 py-2.5 text-[14px] font-medium text-[#5b6b64] hover:bg-[#f7fbf9]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-full bg-[#146c45] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0f5a39] disabled:opacity-60"
            >
              {submitting ? "Registering…" : "Confirm registration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TrainingDetails({
  training,
  registration,
  onBack,
  onEnroll,
}: {
  training: Training;
  registration: Registration | undefined;
  onBack: () => void;
  onEnroll: () => void;
}) {
  const urgency = training.seatsLeft <= 10;
  const enrolled = Boolean(registration);

  return (
    <div className="min-h-screen bg-[#f7fbf9]">
      <div className="mx-auto max-w-[1100px] px-5 py-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#5b6b64] transition hover:text-[#146c45]"
        >
          <ArrowLeft size={14} /> Back to programs
        </button>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <article className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] sm:p-8">
              <TrainingBadges training={training} />
              <h1 className="mt-4 font-[family-name:var(--font-display)] text-[28px] font-semibold leading-tight tracking-tight text-[#12241c]">
                {training.title}
              </h1>
              <p className="mt-1 text-[15px] text-[#5b6b64]">by {training.provider}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 text-[13px] text-[#5b6b64]">
                <p className="flex items-start gap-2">
                  <MapPin size={14} className="mt-0.5 shrink-0" /> {training.venue}
                </p>
                <p className="flex items-start gap-2">
                  <Calendar size={14} className="mt-0.5 shrink-0" /> {formatDate(training.startDate)} – {formatDate(training.endDate)}
                </p>
                <p className="flex items-start gap-2">
                  <Clock size={14} className="mt-0.5 shrink-0" /> {training.schedule}
                </p>
                <p className="flex items-start gap-2">
                  <Users size={14} className="mt-0.5 shrink-0" />
                  <span className={urgency ? "font-semibold text-red-600" : ""}>
                    {training.seatsLeft} of {training.batchSize} seats left
                    {urgency ? " — hurry!" : ""}
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <BookOpen size={14} className="mt-0.5 shrink-0" /> {training.duration} · {training.language} · {training.level}
                </p>
                <p className="flex items-start gap-2">
                  <Building2 size={14} className="mt-0.5 shrink-0" /> {training.address}
                </p>
              </div>
            </article>

            {registration && <RegistrationPanel training={training} registration={registration} />}

            <article className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
              <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">ABOUT THIS PROGRAM</p>
              <p className="mt-3 text-[14px] leading-7 text-[#5b6b64]">{training.overview}</p>
              <p className="mt-3 text-[14px] leading-7 text-[#5b6b64]">{training.description}</p>
            </article>

            <article className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
              <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">WHAT YOU WILL COVER</p>
              <ul className="mt-3 space-y-2 text-[14px] leading-6 text-[#5b6b64]">
                {training.highlights.map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#146c45]" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {training.skills.map((skill) => (
                  <span key={skill} className="rounded-full border border-[#cfe6db] bg-[#eaf6f0] px-2.5 py-1 text-[12px] font-medium text-[#146c45]">
                    {skill}
                  </span>
                ))}
              </div>
            </article>

            <article className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
              <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">INCLUDED</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-[14px] text-[#5b6b64]">
                {training.inclusions.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <FileText size={14} className="text-[#146c45]" /> {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
              <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">FEE</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-[28px] font-semibold text-[#12241c]">{formatPriceFull(training.price)}</p>
              <p className="mt-1 text-[12px] text-[#7a8b84]">Payable at the venue · GST extra if applicable</p>

              {enrolled ? (
                <div className="mt-4 rounded-xl bg-[#eaf6f0] px-4 py-3 text-[13px] font-semibold text-[#146c45]">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> You are registered
                  </span>
                  <p className="mt-1 font-medium text-[#5b6b64]">Scroll up for your registration ID, venue, and joining steps.</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onEnroll}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] transition hover:bg-[#0f5a39]"
                >
                  <BookOpen size={14} /> Enroll now
                </button>
              )}

              <div className="mt-4 space-y-2 border-t border-[#eef3f0] pt-4 text-[13px] text-[#5b6b64]">
                <p className="flex items-center gap-2">
                  <Mail size={14} /> {training.contactEmail}
                </p>
                <p className="flex items-center gap-2">
                  <Phone size={14} /> {training.contactPhone}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function OfflineTraining() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<TrainingCategory>("all");
  const [registrations, setRegistrations] = useState<Record<string, Registration>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  useEffect(() => {
    setRegistrations(loadRegistrations());
  }, []);

  const selected = useMemo(() => TRAININGS.find((item) => item.id === selectedId) ?? null, [selectedId]);

  function openDetails(id: string) {
    setSelectedId(id);
    setEnrollOpen(false);
    setEnrollError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function confirmEnrollment(form: EnrollForm) {
    if (!selected) return;
    if (registrations[selected.id]) {
      setEnrollOpen(false);
      return;
    }
    setEnrolling(true);
    setEnrollError(null);
    const registration: Registration = {
      trainingId: selected.id,
      registrationId: makeRegistrationId(selected.id),
      enrolledAt: new Date().toISOString(),
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      status: selected.seatsLeft > 0 ? "confirmed" : "waitlisted",
    };
    const next = { ...registrations, [selected.id]: registration };
    setRegistrations(next);
    saveRegistrations(next);
    setEnrolling(false);
    setEnrollOpen(false);
  }

  const filtered = TRAININGS.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search.trim() ||
      t.title.toLowerCase().includes(q) ||
      t.city.toLowerCase().includes(q) ||
      t.skills.some((s) => s.toLowerCase().includes(q));
    const matchesCategory = category === "all" || t.category === category;
    return matchesSearch && matchesCategory;
  });

  if (selected) {
    return (
      <>
        <TrainingDetails
          training={selected}
          registration={registrations[selected.id]}
          onBack={() => {
            setSelectedId(null);
            setEnrollOpen(false);
          }}
          onEnroll={() => {
            setEnrollError(null);
            setEnrollOpen(true);
          }}
        />
        {enrollOpen && (
          <EnrollModal
            training={selected}
            submitting={enrolling}
            error={enrollError}
            onClose={() => !enrolling && setEnrollOpen(false)}
            onSubmit={confirmEnrollment}
          />
        )}
      </>
    );
  }

  const enrolledCount = Object.keys(registrations).length;

  return (
    <div className="min-h-screen bg-[#f7fbf9]">
      <div className="mx-auto max-w-[1180px] px-5 py-8">
        <div className="mb-8">
          <Link to="/candidate/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#5b6b64] transition hover:text-[#146c45]">
            <ArrowLeft size={14} /> Back to dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1a8f5a] to-[#0b5c3a] shadow-[0_8px_20px_-8px_rgba(11,92,58,0.7)]">
              <Building2 size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-tight text-[#12241c]">Offline Training</h1>
              <p className="text-[14px] text-[#5b6b64]">In-person bootcamps, workshops, and certification programs across India</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-48 flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a8b84]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, city, or skill…"
              className="w-full rounded-xl border border-[#e4eee9] bg-white py-2.5 pl-9 pr-4 text-[14px] outline-none focus:border-[#146c45]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter size={14} className="text-[#7a8b84]" />
            {(Object.keys(categoryConfig) as TrainingCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
                  category === cat
                    ? "border-[#146c45] bg-[#eaf6f0] text-[#146c45]"
                    : "border-[#e4eee9] bg-white text-[#5b6b64] hover:border-[#cfe6db]"
                }`}
              >
                {categoryConfig[cat].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 flex items-center gap-4 text-[13px] text-[#5b6b64]">
          <span>
            <strong className="text-[#12241c]">{filtered.length}</strong> programs found
          </span>
          {enrolledCount > 0 && (
            <span className="text-[#146c45]">
              <strong>{enrolledCount}</strong> registered
            </span>
          )}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-[22px] border-2 border-dashed border-[#cfe6db] bg-white p-12 text-center">
            <BookOpen size={32} className="mx-auto text-[#c9d6cf]" />
            <p className="mt-3 font-semibold text-[#12241c]">No programs found</p>
            <p className="mt-1 text-[13px] text-[#7a8b84]">Try a different search or category.</p>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((training) => {
            const registration = registrations[training.id];
            const isEnrolled = Boolean(registration);
            const urgency = training.seatsLeft <= 10;

            return (
              <article
                key={training.id}
                className="flex cursor-pointer flex-col rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] transition hover:-translate-y-0.5"
                onClick={() => openDetails(training.id)}
              >
                <TrainingBadges training={training} />

                <h3 className="mt-3 font-[family-name:var(--font-display)] text-[15px] font-semibold leading-snug text-[#12241c]">{training.title}</h3>
                <p className="mt-1 text-[12px] text-[#7a8b84]">by {training.provider}</p>

                <div className="mt-3 space-y-1.5 text-[12px] text-[#5b6b64]">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} /> {training.address}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} /> Starts {formatDate(training.startDate)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} /> {training.duration}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={12} />
                    <span className={urgency ? "font-semibold text-red-600" : ""}>
                      {training.seatsLeft} of {training.batchSize} seats left {urgency && "— hurry!"}
                    </span>
                  </div>
                </div>

                <p className="mt-3 flex-1 text-[13px] leading-6 text-[#5b6b64] line-clamp-3">{training.description}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {training.skills.slice(0, 4).map((skill) => (
                    <span key={skill} className="rounded-full border border-[#e4eee9] bg-[#f7fbf9] px-2 py-0.5 text-[11px] text-[#5b6b64]">
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-0.5 font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#12241c]">
                    <IndianRupee size={15} className="mt-0.5" />
                    {formatPrice(training.price)}
                  </div>
                  {isEnrolled ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf6f0] px-4 py-2 text-[13px] font-semibold text-[#146c45]">
                      <CheckCircle2 size={14} /> View registration
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#12241c] px-4 py-2 text-[13px] font-semibold text-white">
                      <BookOpen size={13} /> View details
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const NAV = [
  { label: "How it works", href: "#how-it-works" },
  { label: "For every role", href: "#roles" },
  { label: "AI Copilot", href: "#copilot" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const STEPS = [
  {
    n: "01",
    title: "Build your skill profile",
    body: "Onboarding and resume parsing turn your history into structured skills, levels and goals.",
    icon: "layers",
  },
  {
    n: "02",
    title: "Pick a career target",
    body: "Choose a career path and see readiness, strengths and the exact gaps holding you back.",
    icon: "target",
  },
  {
    n: "03",
    title: "Close the gaps",
    body: "Get a roadmap of courses, tutors, projects and assessments matched to those gaps.",
    icon: "grad",
  },
  {
    n: "04",
    title: "Get matched and hired",
    body: "Apply to scored jobs, prepare with AI mock interviews and track every stage.",
    icon: "briefcase",
  },
];

const ROLES = [
  {
    id: "candidates",
    label: "Candidates",
    icon: "person",
    badge: "Live today",
    title: "Turn skills into a job, not a pile of applications",
    body: "A structured skill graph, a readiness score and a copilot that already knows your gaps — so every course and application moves you forward.",
    points: [
      "Skill profile, gap analysis and career roadmap",
      "Job match scores with strengths and missing skills",
      "AI copilot, mock interviews and application tracking",
      "Verified assessments that recruiters can trust",
    ],
  },
  {
    id: "tutors",
    label: "Tutors",
    icon: "hat",
    badge: "Schema mapped",
    title: "Teach against real skill gaps, not generic syllabi",
    body: "Your sessions attach to the same skill records candidates and employers use, so tutoring closes a named gap instead of floating as extra content.",
    points: [
      "Offer 1:1 and cohort sessions against skill IDs",
      "See which gaps learners actually need closed",
      "Location-aware offline and remote delivery",
      "Outcomes feed back into the learner’s graph",
    ],
  },
  {
    id: "institutes",
    label: "Institutes",
    icon: "building",
    badge: "Schema mapped",
    title: "Fill batches with learners who already know the gap",
    body: "Courses publish against the shared taxonomy. Enrolment conversations start from a readiness score, not a brochure.",
    points: [
      "Publish courses mapped to skill levels",
      "Run online cohorts and classroom batches",
      "See demand from candidates targeting those skills",
      "Report placements back onto the same graph",
    ],
  },
  {
    id: "colleges",
    label: "Colleges",
    icon: "campus",
    badge: "Schema mapped",
    title: "Campus programmes that connect to employment",
    body: "Treat every programme as a skill path with assessments, employer demand and placement reporting — not a PDF of subjects.",
    points: [
      "Map programmes to career targets and skills",
      "Run campus drives with scored shortlists",
      "Track cohort readiness before placement season",
      "Share verified skill evidence with recruiters",
    ],
  },
  {
    id: "recruiters",
    label: "Recruiters",
    icon: "radar",
    badge: "Schema mapped",
    title: "Shortlists that explain themselves",
    body: "Search the skill graph, not keyword resumes. Every match score comes with strengths, gaps and verified evidence.",
    points: [
      "Skill-graph talent search with level filters",
      "Match scores with a readable explanation",
      "Verified assessments instead of self-reported lists",
      "Pipeline that stays in sync with learning progress",
    ],
  },
  {
    id: "employers",
    label: "Employers",
    icon: "org",
    badge: "Data model ready",
    title: "Hire and upskill from the same skill graph",
    body: "Shared skills, courses, jobs and outcomes mean employers plug into the same system of record instead of a separate silo.",
    points: [
      "Post roles with required and preferred skills",
      "See the true skill supply for each role",
      "Sponsor training that closes your own gaps",
      "Foundation for workforce management",
    ],
  },
];

const PROMPTS = [
  "What career should I pursue?",
  "What skills am I missing?",
  "Create a 90-day learning plan",
  "Why am I not getting interviews?",
  "How do I become a data analyst?",
  "Prepare me for an interview",
];

const HERO_SUGGESTIONS = ["Data analyst", "Power BI", "Full-stack", "SQL"];

const COPILOT_ANSWERS = [
  {
    body: "Your Excel, SQL and stakeholder work point to analytics — not generic “tech”. Data analyst and BI developer both sit above 70% readiness.",
    items: [
      "Keep SQL as a verified strength",
      "Add Power BI to unlock 7 of 9 target roles",
      "Use the career coach to pin one 90-day target",
    ],
  },
  {
    body: "Your SQL and Excel are strong, but 7 of your 9 applications required Power BI, which is not on your profile yet.",
    items: [
      "Close the Power BI gap: Power BI End-to-End (30h)",
      "Take the SQL assessment to add a verified badge",
      "Rewrite your summary around measurable outcomes",
    ],
  },
  {
    body: "A focused 90-day plan beats another month of unfocused applications. Week-by-week work maps to the same skill graph recruiters search.",
    items: [
      "Days 1–30: Power BI project + SQL assessment",
      "Days 31–60: 8 scored applications with match ≥ 75%",
      "Days 61–90: mock interviews and a verified certificate",
    ],
  },
  {
    body: "You are applying broadly, but the missing skill is visible on every rejection. Recruiters filter Power BI before they open the resume.",
    items: [
      "Pause roles that list Power BI as required",
      "Publish a one-page dashboard as evidence",
      "Re-run match scores after the skill is verified",
    ],
  },
  {
    body: "Data analyst is a reachable target from your current graph. The gap is visualization and a verified SQL badge — not a new degree.",
    items: [
      "Map the path: SQL → Excel → Power BI → storytelling",
      "Enrol in one live batch this month",
      "Track readiness until the score crosses 80%",
    ],
  },
  {
    body: "Interview prep should use your real gaps, not a generic question bank. Start with the two skills blocking your last applications.",
    items: [
      "Run a 20-minute SQL mock with feedback",
      "Practise explaining the Power BI gap honestly",
      "Save a STAR story for each verified skill",
    ],
  },
];

const SKILL_CARDS = [
  {
    icon: "brain",
    title: "One skill taxonomy",
    body: "Every course, job, tutor and candidate references the same skill records, so gaps and matches are computed, not guessed.",
  },
  {
    icon: "levels",
    title: "Gap analysis by level",
    body: "Career paths declare a required level and importance per skill, producing a weighted readiness score rather than a checklist.",
  },
  {
    icon: "signal",
    title: "Verified signal",
    body: "Assessments and certificates upgrade self-reported skills into verified evidence recruiters can trust.",
  },
];

const JOURNEY = [
  "People",
  "Skills",
  "Learning",
  "Assessments",
  "Career goals",
  "Jobs",
  "Employers",
  "Employment",
];

const QUOTES = [
  {
    quote:
      "For the first time I knew which two skills were blocking me instead of applying blindly.",
    role: "Candidate, analytics",
  },
  {
    quote:
      "Learners arrive already knowing which skill gap they are here to close. Enrolment conversations are shorter.",
    role: "Training institute",
  },
  {
    quote:
      "Shortlists come with an explanation. That alone changes how we review candidates.",
    role: "Recruiter",
  },
];

const PLANS = [
  {
    name: "Candidate",
    blurb: "Everything a job seeker needs to get moving.",
    price: "Free",
    period: "forever",
    cta: "Start free",
    to: "/register",
    featured: false,
    items: [
      "Skill profile and gap analysis",
      "Career roadmap",
      "Job matching and applications",
      "AI copilot (fair-use limits)",
    ],
  },
  {
    name: "Candidate Pro",
    blurb: "For candidates in an active job search.",
    price: "₹499",
    period: "per month",
    cta: "Start free trial",
    to: "/register",
    featured: true,
    items: [
      "Unlimited AI copilot and resume reviews",
      "Unlimited AI mock interviews",
      "Verified skill assessments",
      "Priority visibility to recruiters",
    ],
  },
  {
    name: "Institutions & Employers",
    blurb: "For institutes, colleges, recruiters and employers.",
    price: "Custom",
    period: "annual",
    cta: "Talk to us",
    to: "/register",
    featured: false,
    items: [
      "Cohort and workforce dashboards",
      "Course and job publishing",
      "Skill-graph talent search",
      "Placement and outcome reporting",
    ],
  },
];

const FAQS = [
  {
    q: "How is CareerOS different from a job board or a course marketplace?",
    a: "Job boards rank keywords. Course marketplaces sell isolated lessons. CareerOS keeps skills, learning, assessments, career targets and jobs on one graph, so a course you take actually changes your match score and a job you apply to points at a named gap.",
  },
  {
    q: "How does the AI use my data?",
    a: "The copilot reads the skills, goal, learning history and applications already on your profile. Advice is grounded in that record and written back as roadmap items you can act on. It is not trained as a public dump of your resume.",
  },
  {
    q: "Does the job match score really mean anything?",
    a: "Yes. Roles declare required and preferred skills at a level. Your profile holds the same skill IDs with evidence. The score is a weighted comparison of those two graphs — with strengths and gaps listed, not a black-box percentage.",
  },
  {
    q: "Can institutes and colleges run offline programmes here?",
    a: "Yes. Classroom batches, campus programmes, local tutors and in-person hiring drives are first-class, with location on every record. Online and offline share the same skill graph.",
  },
  {
    q: "Which roles are live today?",
    a: "Candidates are live. Tutors, institutes, colleges, recruiters and employers already have schema, permissions and surfaces mapped, and can join the design-partner programme while those workspaces ship.",
  },
];

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
  switch (name) {
    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3l1.2 5.2L18 9.5l-4.2 2.2L15 17l-3-3.2L9 17l1.2-5.3L6 9.5l4.8-1.3L12 3z" />
        </svg>
      );
    case "layers":
      return (
        <svg {...common}>
          <path d="M12 3 3 8l9 5 9-5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5" />
        </svg>
      );
    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
        </svg>
      );
    case "grad":
      return (
        <svg {...common}>
          <path d="M3 8 12 4l9 4-9 4L3 8z" />
          <path d="M7 10v5c2 1.5 8 1.5 10 0v-5" />
          <path d="M21 8v7" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
        </svg>
      );
    case "person":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 19c1.4-3.2 3.8-4.8 7-4.8S17.6 15.8 19 19" />
        </svg>
      );
    case "hat":
      return (
        <svg {...common}>
          <path d="M3 10 12 6l9 4-9 4-9-4z" />
          <path d="M7 12v4c2 1.2 8 1.2 10 0v-4" />
        </svg>
      );
    case "building":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 8h2M14 8h2M8 12h2M14 12h2M8 16h8" />
        </svg>
      );
    case "campus":
      return (
        <svg {...common}>
          <path d="M4 20V9l8-5 8 5v11" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );
    case "radar":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 12 16 7" />
        </svg>
      );
    case "org":
      return (
        <svg {...common}>
          <rect x="3" y="10" width="7" height="10" rx="1.5" />
          <rect x="14" y="4" width="7" height="16" rx="1.5" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.8 2.8L16.5 9" />
        </svg>
      );
    case "brain":
      return (
        <svg {...common}>
          <path d="M9 6a3 3 0 0 1 6 0 3 3 0 0 1 3 3c1.2.6 2 1.8 2 3.2A3.3 3.3 0 0 1 17 15.5V18a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-2.5A3.3 3.3 0 0 1 4 12.2C4 10.8 4.8 9.6 6 9a3 3 0 0 1 3-3z" />
        </svg>
      );
    case "levels":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2.5" />
        </svg>
      );
    case "signal":
      return (
        <svg {...common}>
          <circle cx="9" cy="10" r="3" />
          <circle cx="16" cy="14" r="2.4" />
          <path d="M11.5 12.5 14 13.4" />
        </svg>
      );
    case "wifi":
      return (
        <svg {...common}>
          <path d="M5 9.5a10 10 0 0 1 14 0M7.8 12.4a6.2 6.2 0 0 1 8.4 0" />
          <circle cx="12" cy="16.4" r="1.2" fill="currentColor" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.2" />
        </svg>
      );
    case "bot":
      return (
        <svg {...common}>
          <rect x="5" y="8" width="14" height="11" rx="3" />
          <path d="M12 8V5M9 13h.01M15 13h.01" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    default:
      return null;
  }
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#1a8f5a] to-[#0b5c3a] text-white shadow-[0_8px_20px_-8px_rgba(11,92,58,0.7)]">
        <span className="font-[family-name:var(--font-display)] text-[17px] font-bold leading-none">C</span>
      </span>
      {!compact && (
        <span className="font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-tight text-[#12241c]">
          Career<span className="text-[#178a5a]">OS</span>
        </span>
      )}
    </Link>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [role, setRole] = useState(ROLES[5]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activePrompt, setActivePrompt] = useState(3);
  const [heroQuery, setHeroQuery] = useState("");
  const [heroMode, setHeroMode] = useState<"jobs" | "courses">("jobs");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="landing min-h-screen bg-[#f7fbf9] text-[#12241c] antialiased">
      <a href="#main" className="skip-link">Skip to content</a>
      <header
        className={`sticky top-0 z-50 border-b transition-colors ${
          scrolled ? "border-[#e4eee9] bg-white/90 backdrop-blur-md" : "border-[#eef3f0] bg-white"
        }`}
      >
        <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[14.5px] font-medium text-[#5b6b64] transition-colors hover:text-[#12241c]"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-4 lg:flex">
            <Link to="/login" className="text-[14.5px] font-medium text-[#5b6b64] hover:text-[#12241c]">
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-full bg-[#146c45] px-4 py-2 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] transition hover:bg-[#0f5a39]"
            >
              Get started
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-xl text-[#12241c] lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <Icon name={menuOpen ? "close" : "menu"} className="h-5 w-5" />
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-[#e4eee9] bg-white px-5 py-4 lg:hidden">
            <div className="flex flex-col gap-1">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-2 py-2.5 text-sm font-medium text-[#3d4d46]"
                >
                  {item.label}
                </a>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                to="/login"
                className="flex-1 rounded-full border border-[#d7e4de] py-2.5 text-center text-sm font-semibold"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="flex-1 rounded-full bg-[#146c45] py-2.5 text-center text-sm font-semibold text-white"
              >
                Get started
              </Link>
            </div>
          </div>
        )}
      </header>

      <section id="main" className="landing-dots relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_70%_20%,rgba(46,168,112,0.14),transparent_60%)]" />
        <div className="relative mx-auto grid max-w-[1180px] items-center gap-12 px-5 pb-10 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-16 lg:pt-20">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#cfe6db] bg-[#eaf6f0] px-3 py-1 text-[12.5px] font-medium text-[#146c45]">
              <Icon name="spark" className="h-3.5 w-3.5" />
              AI-powered career ecosystem
            </div>
            <h1 className="mt-5 max-w-[15ch] font-[family-name:var(--font-display)] text-[48px] font-semibold leading-[1.05] tracking-[-0.038em] text-[#12241c] sm:text-[62px]">
              One platform for{" "}
              <span className="text-[#157a62]">skills, learning,</span>{" "}
              <span className="text-[#5b5fe8]">careers</span> and employment.
            </h1>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-8 text-[#5b6b64]">
              CareerOS connects candidates, tutors, training institutes, colleges, recruiters and employers on a
              single skill graph — so learning always leads somewhere.
            </p>
            <form
              className="mt-8 rounded-[28px] border border-white bg-white p-2 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.28)]"
              onSubmit={(event) => {
                event.preventDefault();
                const query = heroQuery.trim();
                const path = heroMode === "jobs" ? "/candidate/jobs" : "/candidate/courses";
                navigate(query ? `${path}?q=${encodeURIComponent(query)}` : path);
              }}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex rounded-full bg-[#eaf6f0] p-1">
                  {(["jobs", "courses"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setHeroMode(mode)}
                      className={`rounded-full px-3 py-2 text-[13px] font-semibold capitalize transition ${
                        heroMode === mode ? "bg-white text-[#146c45] shadow-sm" : "text-[#5b6b64] hover:text-[#12241c]"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <div className="relative min-w-0 flex-1">
                  <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8b84]" />
                  <input
                    value={heroQuery}
                    onChange={(event) => setHeroQuery(event.target.value)}
                    placeholder={heroMode === "jobs" ? "Search roles, skills, or companies" : "Search courses, skills, or tutors"}
                    className="w-full rounded-full border border-transparent bg-[#f7fbf9] py-3 pl-10 pr-4 text-[14px] text-[#12241c] outline-none transition placeholder:text-[#7a8b84] focus:border-[#146c45] focus:bg-white focus:ring-2 focus:ring-[#146c45]/10"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_12px_24px_-12px_rgba(20,108,69,0.95)] transition hover:bg-[#0f5a39] active:scale-[0.98]"
                >
                  Search {heroMode}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 px-2 pb-1">
                <span className="text-[12px] font-medium text-[#7a8b84]">Popular</span>
                {HERO_SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setHeroQuery(item)}
                    className="rounded-full border border-[#e4eee9] bg-[#f7fbf9] px-3 py-1 text-[12px] font-medium text-[#5b6b64] transition hover:border-[#cfe6db] hover:text-[#146c45]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </form>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full bg-[#146c45] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_12px_24px_-12px_rgba(20,108,69,0.95)] transition hover:bg-[#0f5a39]"
              >
                Start as a candidate
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <a
                href="#roles"
                className="inline-flex items-center rounded-full border border-[#d5e3dc] bg-white px-5 py-3 text-[15px] font-semibold text-[#1d332a] shadow-sm transition hover:border-[#b7cec3]"
              >
                Explore for institutions
              </a>
            </div>
            <div className="mt-10 grid max-w-[420px] grid-cols-3 gap-6 border-t border-[#e1ebe6] pt-6">
              {[
                ["8", "Skill families"],
                ["50+", "Career paths"],
                ["7", "Role surfaces"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="font-[family-name:var(--font-display)] text-[34px] font-semibold leading-none text-[#157a4f]">
                    {n}
                  </div>
                  <div className="mt-1.5 text-[12px] font-medium text-[#7a8b84]">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[540px]">
            <div className="absolute -inset-6 rounded-[36px] bg-[radial-gradient(circle_at_60%_40%,rgba(46,168,112,0.18),transparent_65%)]" />
            <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-[#f3eee4] shadow-[0_30px_80px_-28px_rgba(18,50,36,0.35)]">
              <div className="relative aspect-[5/4] overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80"
                  alt="Candidate reviewing a skill-graph career path"
                  className="h-full w-full object-cover object-[50%_18%]"
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(243,238,228,0.08),rgba(243,238,228,0.08)_40%,rgba(243,238,228,0.55))]" />
                <svg className="absolute right-8 top-10 h-40 w-36 text-[#2aa36a]" viewBox="0 0 140 160" fill="none">
                  <path d="M8 148 C 28 128, 38 118, 52 92 C 68 62, 78 48, 128 18" stroke="currentColor" strokeWidth="3" />
                  {[
                    [52, 92],
                    [78, 52],
                    [108, 30],
                    [128, 18],
                  ].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="6" fill="#fff" stroke="currentColor" strokeWidth="3" />
                  ))}
                  <circle cx="128" cy="18" r="12" fill="#e9f7ef" stroke="currentColor" strokeWidth="2" />
                  <path d="M128 12v8M124 16h8" stroke="#1a8f5a" strokeWidth="2" />
                </svg>
                <div className="absolute left-5 top-8 hidden w-[92px] rounded-2xl bg-white/80 p-3 shadow-sm backdrop-blur sm:block">
                  <svg viewBox="0 0 64 48" className="text-[#5b6b64]">
                    <circle cx="22" cy="24" r="14" fill="none" stroke="#c9d6cf" strokeWidth="6" />
                    <circle
                      cx="22"
                      cy="24"
                      r="14"
                      fill="none"
                      stroke="#157a62"
                      strokeWidth="6"
                      strokeDasharray="55 88"
                      strokeLinecap="round"
                    />
                    <path d="M44 16h16M44 24h12M44 32h8" stroke="#9aada4" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="absolute right-6 top-28 hidden h-12 w-12 items-center justify-center rounded-2xl bg-white/85 shadow-sm backdrop-blur sm:flex">
                  <Icon name="person" className="h-5 w-5 text-[#5b6b64]" />
                </div>
                <div className="absolute bottom-28 left-6 hidden h-[72px] w-[92px] items-end rounded-2xl bg-white/80 p-2 shadow-sm backdrop-blur sm:flex">
                  <svg viewBox="0 0 80 40" className="w-full">
                    <path d="M4 32 L18 24 L32 28 L48 14 L64 18 L76 8" fill="none" stroke="#157a62" strokeWidth="3" />
                    <path d="M4 32 L18 24 L32 28 L48 14 L64 18 L76 8 V40 H4z" fill="#157a62" opacity="0.18" />
                  </svg>
                </div>
                <div className="absolute bottom-28 right-8 hidden h-12 w-16 items-center justify-center rounded-2xl bg-white/85 shadow-sm backdrop-blur sm:flex">
                  <Icon name="levels" className="h-5 w-5 text-[#157a62]" />
                </div>
              </div>
              <div className="absolute bottom-5 left-5 right-16 max-w-[240px] rounded-2xl border border-white/80 bg-white p-4 shadow-[0_16px_40px_-20px_rgba(18,50,36,0.45)]">
                <div className="text-[11px] font-semibold tracking-[0.12em] text-[#7a8b84]">JOB MATCH</div>
                <div className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-semibold leading-none text-[#157a4f]">
                  87%
                </div>
                <p className="mt-2 text-[12.5px] leading-5 text-[#5b6b64]">
                  Strong: SQL, Excel · Gaps: Power BI
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#eef8f3] py-20">
        <div className="mx-auto max-w-[1180px] px-5">
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">HOW IT WORKS</p>
          <h2 className="mt-3 max-w-[18ch] font-[family-name:var(--font-display)] text-[40px] font-semibold leading-[1.12] tracking-[-0.03em] text-[#12241c] sm:text-[48px]">
            From skill gap to employment, in one connected flow
          </h2>
          <p className="mt-4 max-w-[58ch] text-[16px] leading-7 text-[#5b6b64]">
            Every step writes back to the same skill graph, so your roadmap, applications and interviews stay in
            sync.
          </p>
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((step) => (
              <article
                key={step.n}
                className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.35)] transition duration-200 hover:-translate-y-1 hover:border-[#cfe6db] hover:shadow-[0_18px_40px_-24px_rgba(18,50,36,0.32)]"
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7f6ee] text-[#157a4f]">
                    <Icon name={step.icon} className="h-5 w-5" />
                  </span>
                  <span className="text-[15px] font-semibold text-[#c5d4cd]">{step.n}</span>
                </div>
                <h3 className="mt-8 text-[18px] font-semibold tracking-tight text-[#12241c]">{step.title}</h3>
                <p className="mt-2 text-[14.5px] leading-6 text-[#5b6b64]">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="roles" className="bg-[#f7fbf9] py-20">
        <div className="mx-auto max-w-[1180px] px-5">
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">BUILT FOR THE WHOLE ECOSYSTEM</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-[40px] font-semibold tracking-[-0.03em] text-[#12241c] sm:text-[48px]">
            One graph, six sides of the market
          </h2>
          <p className="mt-4 max-w-[62ch] text-[16px] leading-7 text-[#5b6b64]">
            Candidates are live today. Every other role already has its schema, permissions and surfaces mapped.
          </p>
          <div className="mt-8 flex gap-1 overflow-x-auto rounded-full bg-[#eaf3ee] p-1.5">
            {ROLES.map((item) => (
              <button
                key={item.id}
                onClick={() => setRole(item)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-medium transition ${
                  role.id === item.id
                    ? "bg-white text-[#12241c] shadow-sm"
                    : "text-[#5b6b64] hover:text-[#12241c]"
                }`}
              >
                <Icon name={item.icon} className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-8 rounded-[28px] border border-[#e4eee9] bg-white p-6 shadow-[0_20px_50px_-36px_rgba(18,50,36,0.4)] lg:grid-cols-[0.92fr_1.08fr] lg:p-10">
            <div>
              <span className="inline-flex rounded-full bg-[#eaf6f0] px-3 py-1 text-[12px] font-semibold text-[#157a4f]">
                {role.badge}
              </span>
              <h3 className="mt-5 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.03em] text-[#12241c]">
                {role.title}
              </h3>
              <p className="mt-4 max-w-[46ch] text-[15.5px] leading-7 text-[#5b6b64]">{role.body}</p>
              <Link
                to="/register"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white hover:bg-[#0f5a39]"
              >
                Get started
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {role.points.map((point) => (
                <div
                  key={point}
                  className="flex items-center gap-3 rounded-2xl border border-[#e8f1ec] bg-[#f6fbf8] px-4 py-4"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#d9f0e3] text-[#157a4f]">
                    <Icon name="check" className="h-4 w-4" />
                  </span>
                  <span className="text-[14.5px] font-medium text-[#2a3d35]">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="copilot" className="bg-[#0d4a3a] py-20 text-white">
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[12.5px] font-medium text-[#c8e8d8]">
              <Icon name="bot" className="h-3.5 w-3.5" />
              AI Career Copilot
            </div>
            <h2 className="mt-5 font-[family-name:var(--font-display)] text-[40px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[48px]">
              A career coach that has actually read your profile
            </h2>
            <p className="mt-4 max-w-[48ch] text-[16px] leading-7 text-[#c5ddd2]">
              The copilot answers with your skills, goal, learning history and applications in context — then turns
              advice into roadmap items you can act on.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {PROMPTS.map((prompt, i) => (
                <button
                  key={prompt}
                  onClick={() => setActivePrompt(i)}
                  className={`rounded-2xl border px-4 py-3.5 text-left text-[14px] transition ${
                    activePrompt === i
                      ? "border-white/25 bg-white/12 text-white"
                      : "border-white/10 bg-white/6 text-[#d5e8de] hover:bg-white/10"
                  }`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/6 p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.45)] sm:p-6">
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-[14.5px] text-[#e7f4ed]">
              {PROMPTS[activePrompt]}
            </div>
            <div className="mt-4 rounded-2xl bg-[#08382c] p-5 text-[14.5px] leading-7 text-[#d7eee4] transition duration-200">
              <p>{COPILOT_ANSWERS[activePrompt].body}</p>
              <ul className="mt-4 space-y-1 text-[#cfe6db]">
                {COPILOT_ANSWERS[activePrompt].items.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7fbf9] py-20">
        <div className="mx-auto max-w-[1180px] px-5">
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">SKILLS INTELLIGENCE</p>
          <h2 className="mt-3 max-w-[16ch] font-[family-name:var(--font-display)] text-[40px] font-semibold leading-[1.12] tracking-[-0.03em] text-[#12241c] sm:text-[48px]">
            Structured skills instead of resume keywords
          </h2>
          <p className="mt-4 max-w-[58ch] text-[16px] leading-7 text-[#5b6b64]">
            Categories, levels, verification and assessment scores make skills comparable across learners, courses
            and jobs.
          </p>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {SKILL_CARDS.map((card) => (
              <article key={card.title} className="rounded-[22px] border border-[#e4eee9] bg-white p-6 shadow-sm">
                <span className="grid h-10 w-10 place-items-center rounded-xl text-[#157a4f]">
                  <Icon name={card.icon} className="h-6 w-6" />
                </span>
                <h3 className="mt-8 text-[18px] font-semibold text-[#12241c]">{card.title}</h3>
                <p className="mt-2 text-[14.5px] leading-6 text-[#5b6b64]">{card.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 rounded-[28px] bg-[#e9f6f0] p-8">
            <h3 className="font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-[-0.03em] text-[#12241c]">
              The learning-to-employment journey
            </h3>
            <p className="mt-2 text-[15px] text-[#5b6b64]">
              Nothing in CareerOS is an isolated feature — each entity connects to the next.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {JOURNEY.map((item, i) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="rounded-full border border-[#d7e7df] bg-white px-3.5 py-1.5 text-[13.5px] font-medium text-[#1d332a] shadow-sm">
                    {item}
                  </span>
                  {i < JOURNEY.length - 1 && <span className="text-[#9ab0a6]">→</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <article className="rounded-[22px] border border-[#e4eee9] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-[#157a4f]">
                  <Icon name="wifi" className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-[18px] font-semibold text-[#12241c]">Online everywhere</h3>
                  <p className="mt-2 text-[14.5px] leading-6 text-[#5b6b64]">
                    Self-paced courses, live cohorts, remote tutoring and AI practice available from anywhere.
                  </p>
                </div>
              </div>
            </article>
            <article className="rounded-[22px] border border-[#e4eee9] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-[#157a4f]">
                  <Icon name="pin" className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-[18px] font-semibold text-[#12241c]">Offline where it matters</h3>
                  <p className="mt-2 text-[14.5px] leading-6 text-[#5b6b64]">
                    Classroom batches, campus programmes, local tutors and in-person hiring drives are first-class,
                    with location on every record.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-[1180px] px-5">
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">EARLY FEEDBACK</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-[40px] font-semibold tracking-[-0.03em] text-[#12241c] sm:text-[48px]">
            What our first users are telling us
          </h2>
          <p className="mt-3 text-[16px] text-[#5b6b64]">Placeholder quotes from our design-partner programme.</p>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {QUOTES.map((item) => (
              <article
                key={item.role}
                className="flex flex-col rounded-[22px] border border-[#e4eee9] bg-white p-6 shadow-sm"
              >
                <p className="text-[16px] leading-7 text-[#2a3d35]">“{item.quote}”</p>
                <div className="mt-8 flex items-center gap-3 border-t border-[#eef3f0] pt-5">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e7f6ee] text-[12px] font-bold text-[#157a4f]">
                    DP
                  </span>
                  <div>
                    <div className="text-[14px] font-semibold text-[#12241c]">Design partner</div>
                    <div className="text-[13px] text-[#7a8b84]">{item.role}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-[#f7fbf9] py-20">
        <div className="mx-auto max-w-[1180px] px-5">
          <h2 className="max-w-[16ch] font-[family-name:var(--font-display)] text-[40px] font-semibold leading-[1.12] tracking-[-0.03em] text-[#12241c] sm:text-[48px]">
            Free for candidates. Priced for outcomes.
          </h2>
          <p className="mt-4 text-[16px] text-[#5b6b64]">
            Institutions pay for reach and reporting; candidates never pay to be discovered.
          </p>
          <div className="mt-12 grid items-stretch gap-4 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <article
                key={plan.name}
                className={`relative flex flex-col rounded-[24px] border bg-white p-7 shadow-sm ${
                  plan.featured
                    ? "border-[#146c45] shadow-[0_24px_50px_-28px_rgba(20,108,69,0.45)]"
                    : "border-[#e4eee9]"
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-6 rounded-full bg-[#5b5fe8] px-3 py-1 text-[11px] font-semibold text-white">
                    Most popular
                  </span>
                )}
                <h3 className="text-[20px] font-semibold text-[#12241c]">{plan.name}</h3>
                <p className="mt-1 text-[14px] text-[#5b6b64]">{plan.blurb}</p>
                <div className="mt-6 flex items-end gap-2">
                  <span className="font-[family-name:var(--font-display)] text-[42px] font-semibold leading-none tracking-tight text-[#12241c]">
                    {plan.price}
                  </span>
                  <span className="mb-1 text-[14px] text-[#7a8b84]">{plan.period}</span>
                </div>
                <ul className="mt-7 space-y-3">
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[14.5px] text-[#2a3d35]">
                      <span className="mt-0.5 text-[#157a4f]">
                        <Icon name="check" className="h-[18px] w-[18px]" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.to}
                  className={`mt-8 block rounded-full py-3 text-center text-[14.5px] font-semibold transition ${
                    plan.featured
                      ? "bg-[#146c45] text-white hover:bg-[#0f5a39]"
                      : "border border-[#d7e4de] bg-white text-[#1d332a] hover:border-[#b7cec3]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white py-20">
        <div className="mx-auto max-w-[760px] px-5">
          <h2 className="text-center font-[family-name:var(--font-display)] text-[40px] font-semibold tracking-[-0.03em] text-[#12241c] sm:text-[48px]">
            Questions we get asked
          </h2>
          <div className="mt-10 divide-y divide-[#e8eeeb]">
            {FAQS.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={item.q}>
                  <button
                    className="flex w-full items-center justify-between gap-6 py-5 text-left"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                  >
                    <span className="text-[16px] font-medium text-[#1d332a]">{item.q}</span>
                    <span className={`shrink-0 text-[#7a8b84] transition ${open ? "rotate-180" : ""}`}>
                      <Icon name="chevron" className="h-5 w-5" />
                    </span>
                  </button>
                  {open && <p className="pb-5 pr-10 text-[15px] leading-7 text-[#5b6b64]">{item.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 pb-16">
        <div className="mx-auto max-w-[1180px] overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,#0f5a43_0%,#0a3d32_100%)] px-6 py-16 text-center text-white">
          <h2 className="font-[family-name:var(--font-display)] text-[36px] font-semibold tracking-[-0.03em] sm:text-[48px]">
            Start with your skills. End with a job.
          </h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-[16px] leading-7 text-[#c5ddd2]">
            Create your free candidate account and get a readiness score, a roadmap and matched jobs in minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[14.5px] font-semibold text-[#0f5a39]"
            >
              Create free account
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <a
              href="#roles"
              className="inline-flex items-center rounded-full border border-white/20 px-5 py-3 text-[14.5px] font-semibold text-white"
            >
              For institutions
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e4eee9] bg-white py-10">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-6 px-5 sm:flex-row">
          <Logo />
          <nav className="flex flex-wrap justify-center gap-6 text-[13.5px] text-[#7a8b84]">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="hover:text-[#12241c]">
                {item.label}
              </a>
            ))}
            <Link to="/login" className="hover:text-[#12241c]">
              Sign in
            </Link>
          </nav>
          <p className="text-[12px] text-[#9ab0a6]">© {new Date().getFullYear()} CareerOS</p>
        </div>
      </footer>
    </div>
  );
}

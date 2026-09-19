import { ArrowLeft, BookOpen, BriefcaseBusiness, MessageSquare, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function MentorBooking() {
  return (
    <div className="min-h-dvh bg-[#f7fbf9]">
      <a href="#main" className="skip-link">Skip to content</a>
      <div id="main" className="mx-auto max-w-[1180px] px-5 py-8">
        <Link
          to="/candidate/dashboard"
          className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-[#5b6b64] transition duration-200 hover:text-[#146c45]"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#1a8f5a] to-[#0b5c3a] text-white shadow-[0_8px_20px_-8px_rgba(11,92,58,0.7)]">
            <Users size={22} />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-tight text-[#12241c]">
              Mentors
            </h1>
            <p className="text-[14px] text-[#5b6b64]">1:1 sessions with industry mentors</p>
          </div>
        </div>

        <div className="mt-8 rounded-[22px] border border-white bg-white p-10 text-center shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf6f0] text-[#146c45]">
            <Users size={26} />
          </div>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-[22px] font-semibold text-[#12241c]">
            Mentor booking is not live yet
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-6 text-[#5b6b64]">
            There is no mentors API or booking calendar. Profiles, ratings, and prices on this page would be demo data, so we keep it empty until sessions can be booked for real.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/candidate/career-coach"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#146c45] px-5 py-2.5 text-[14px] font-semibold text-white transition duration-200 hover:bg-[#0f5a39] active:scale-[0.98]"
            >
              <MessageSquare size={16} /> Talk to Career Coach
            </Link>
            <Link
              to="/candidate/courses"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#e4eee9] bg-white px-5 py-2.5 text-[14px] font-semibold text-[#12241c] transition duration-200 hover:border-[#cfe6db] hover:bg-[#f7fbf9] active:scale-[0.98]"
            >
              <BookOpen size={16} /> Browse courses
            </Link>
            <Link
              to="/candidate/jobs"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#e4eee9] bg-white px-5 py-2.5 text-[14px] font-semibold text-[#12241c] transition duration-200 hover:border-[#cfe6db] hover:bg-[#f7fbf9] active:scale-[0.98]"
            >
              <BriefcaseBusiness size={16} /> Browse jobs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

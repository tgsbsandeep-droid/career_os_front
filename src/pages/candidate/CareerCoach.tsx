import { useEffect, useState } from "react";
import {
  Sparkles,
  Loader2,
  TrendingUp,
  Target,
  BookOpen,
  Zap,
  RefreshCw,
  User,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getCareerAdvice } from "../../services/ai";
import { apiRequest, supabase } from "../../services/api";

const quickPrompts = [
  { label: "How to get promoted?",      icon: TrendingUp },
  { label: "Skills I should learn next", icon: BookOpen },
  { label: "How to switch careers?",    icon: RefreshCw },
  { label: "Improve my resume",         icon: Target },
];

type Profile = {
  full_name?: string;
  skills?: string[];
  experience?: string[];
};

export default function CareerCoach() {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState("");
  const [targetRole, setTargetRole] = useState("Senior Frontend Developer");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { setProfileLoading(false); return; }
      void apiRequest<{ profile: Profile | null }>(`/api/candidate/${data.user.id}/profile`)
        .then(({ profile: p }) => setProfile(p))
        .catch(() => undefined)
        .finally(() => setProfileLoading(false));
    });
  }, []);

  async function analyzeCareer(customRole?: string) {
    setLoading(true);
    setError("");
    setAdvice("");
    try {
      const result = await getCareerAdvice({
        name: profile?.full_name ?? "there",
        skills: profile?.skills ?? ["React", "TypeScript", "JavaScript"],
        experience: profile?.experience ?? ["2 years frontend development"],
        targetRole: customRole ?? targetRole,
      });
      setAdvice(result);
    } catch (err) {
      setError((err as Error).message || "Unable to get career advice. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const skills = profile?.skills ?? [];
  const hasProfile = skills.length > 0;

  return (
    <main className="min-h-screen bg-[#f7fbf9]">
      <div className="mx-auto max-w-3xl px-5 py-8 space-y-6">

        {/* Hero */}
        <div className="overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0b2a1c] via-[#0f3d28] to-[#0b5c3a] p-6 text-white sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2aa36a]/20">
              <Sparkles size={22} className="text-[#2aa36a]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold tracking-[0.16em] text-[#2aa36a]">POWERED BY GEMINI AI</p>
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-[26px] font-semibold leading-tight tracking-[-0.025em] sm:text-[30px]">AI Career Coach</h1>
              <p className="mt-2 text-[14px] text-white/70 leading-relaxed">
                Get personalized career guidance based on your skills, experience, and goals.
              </p>
            </div>
          </div>

          {/* Profile summary */}
          {!profileLoading && (
            <div className="mt-6 flex flex-wrap gap-3">
              {hasProfile ? (
                <>
                  <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-[12px] font-medium">
                    <User size={13} className="text-[#2aa36a]" />
                    {profile?.full_name ?? "Your profile"}
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-[12px] font-medium">
                    <Zap size={13} className="text-[#2aa36a]" />
                    {skills.length} skills loaded
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-amber-500/20 px-3 py-2 text-[12px] font-medium text-amber-300">
                  <Target size={13} />
                  Complete your profile for personalized advice
                </div>
              )}
            </div>
          )}
        </div>

        {/* Target role input */}
        <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={17} className="text-[#5b6b64]" />
            <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Your target role</h2>
          </div>
          <div className="flex gap-3">
            <input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Frontend Developer"
              className="flex-1 rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[14px] text-[#12241c] placeholder-[#7a8b84] outline-none transition focus:border-[#146c45] focus:bg-white focus:ring-2 focus:ring-[#146c45]/10"
            />
            <button
              type="button"
              disabled={loading || !targetRole.trim()}
              onClick={() => void analyzeCareer()}
              className="inline-flex items-center gap-2 rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] transition hover:bg-[#0f5a39] disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </div>

        {/* Quick prompts */}
        <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Quick questions</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {quickPrompts.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                disabled={loading}
                onClick={() => void analyzeCareer(label)}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#eef3f0] bg-[#f7fbf9] px-4 py-3 text-left text-[13px] font-medium text-[#3d4d46] transition hover:border-[#cfe6db] hover:bg-[#eaf6f0] hover:text-[#146c45] disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className="text-[#7a8b84]" />
                  {label}
                </div>
                <ChevronRight size={15} className="shrink-0 text-[#7a8b84]" />
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="rounded-[22px] border border-white bg-white p-8 text-center shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#d4ede2]">
              <Loader2 size={24} className="animate-spin text-[#146c45]" />
            </div>
            <p className="mt-4 font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#12241c]">Analyzing your career…</p>
            <p className="mt-1 text-[13px] text-[#5b6b64]">Gemini AI is crafting personalized advice for you.</p>
          </div>
        )}

        {/* Advice output */}
        {advice && !loading && (
          <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eaf6f0]">
                  <Sparkles size={15} className="text-[#146c45]" />
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Your personalized advice</h2>
              </div>
              <button
                type="button"
                onClick={() => void analyzeCareer()}
                className="flex items-center gap-1.5 rounded-lg border border-[#e4eee9] px-3 py-1.5 text-[12px] font-medium text-[#5b6b64] hover:bg-[#f7fbf9] transition"
              >
                <RefreshCw size={13} />
                Regenerate
              </button>
            </div>

            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-[14px] leading-7 text-[#3d4d46]">
                {advice}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-[#eef3f0] pt-5">
              <Link
                to={`/candidate/courses?q=${encodeURIComponent(targetRole)}&skills=${encodeURIComponent((profile?.skills ?? []).slice(0, 5).join(","))}`}
                className="inline-flex items-center gap-2 rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] hover:bg-[#0f5a39] transition"
              >
                <BookOpen size={15} />
                Browse relevant courses
              </Link>
              <Link
                to={`/candidate/jobs?q=${encodeURIComponent(targetRole)}&skills=${encodeURIComponent((profile?.skills ?? []).slice(0, 5).join(","))}`}
                className="inline-flex items-center gap-2 rounded-full border border-[#d5e3dc] px-4 py-2.5 text-[13px] font-semibold text-[#1d332a] hover:border-[#b7cec3] transition"
              >
                <Target size={15} />
                Find matching jobs
              </Link>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

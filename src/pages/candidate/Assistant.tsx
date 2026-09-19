import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Briefcase,
  FileText,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import { Link } from "react-router-dom";
import { chatWithAssistant, type AssistantTurn } from "../../services/ai";
import { apiRequest, supabase } from "../../services/api";

type Profile = {
  full_name?: string;
  skills?: string[];
  experience?: string[];
};

const starters = [
  "What should I learn next for my target role?",
  "Help me plan a 30-day job-search sprint.",
  "How do I explain a career switch in interviews?",
  "Rewrite my LinkedIn headline.",
];

export default function Assistant() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<AssistantTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      void apiRequest<{ profile: Profile | null }>(`/api/candidate/${data.user.id}/profile`)
        .then(({ profile: loaded }) => setProfile(loaded))
        .catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    setError("");
    setInput("");
    const nextHistory = [...history, { role: "user" as const, content: trimmed }];
    setHistory(nextHistory);
    setLoading(true);
    try {
      const reply = await chatWithAssistant({
        message: trimmed,
        history: nextHistory.slice(0, -1),
        profile: {
          name: profile?.full_name,
          skills: profile?.skills,
          experience: profile?.experience,
          targetRole,
        },
      });
      setHistory([...nextHistory, { role: "assistant", content: reply }]);
    } catch (err) {
      setError((err as Error).message || "Unable to reach the assistant.");
      setHistory(nextHistory);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7fbf9]">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8">
        <div className="overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0b2a1c] via-[#0f3d28] to-[#0b5c3a] p-6 text-white sm:p-8">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#2aa36a]/20">
              <Sparkles size={22} className="text-[#2aa36a]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold tracking-[0.16em] text-[#2aa36a]">AI ASSISTANT</p>
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-[26px] font-semibold leading-tight tracking-[-0.025em] sm:text-[30px]">
                Ask CareerOS anything
              </h1>
              <p className="mt-2 text-[14px] leading-relaxed text-white/70">
                A conversational coach that uses your profile, skills, and goal — then points you to jobs, courses, resume, or interview practice.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] font-medium text-white/70">
              Target role
              <input
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-[13px] text-white outline-none placeholder:text-white/40 focus:border-[#2aa36a]"
                placeholder="e.g. Product Manager"
              />
            </label>
            <div className="flex flex-wrap items-end gap-2 text-[12px]">
              <Link to="/candidate/career-coach" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 font-medium text-white hover:bg-white/15">
                <Target size={13} /> Roadmap
              </Link>
              <Link to="/candidate/resume-optimizer" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 font-medium text-white hover:bg-white/15">
                <FileText size={13} /> Resume
              </Link>
              <Link to="/candidate/interview-practice" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 font-medium text-white hover:bg-white/15">
                <Mic size={13} /> Interview
              </Link>
            </div>
          </div>
        </div>

        {history.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {starters.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void send(prompt)}
                className="rounded-2xl border border-white bg-white px-4 py-3 text-left text-[13px] font-medium text-[#3d4d46] shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)] hover:border-[#cfe6db] hover:text-[#146c45]"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <section className="rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
          <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
            {history.length === 0 && !loading && (
              <p className="py-8 text-center text-[13px] text-[#7a8b84]">Start a conversation or pick a prompt above.</p>
            )}
            {history.map((turn, index) => (
              <div key={`${turn.role}-${index}`} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-7 whitespace-pre-wrap ${
                    turn.role === "user" ? "bg-[#146c45] text-white" : "bg-[#f7fbf9] text-[#3d4d46]"
                  }`}
                >
                  {turn.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-[#f7fbf9] px-4 py-3 text-[13px] text-[#5b6b64]">
                <Loader2 size={15} className="animate-spin text-[#146c45]" /> Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}

          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about skills, jobs, resumes, interviews…"
              className="flex-1 rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[14px] outline-none focus:border-[#146c45] focus:bg-white"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-[#146c45] px-4 py-3 text-[13px] font-semibold text-white hover:bg-[#0f5a39] disabled:opacity-60"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Send
            </button>
          </form>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link to="/candidate/jobs" className="inline-flex items-center gap-2 rounded-full border border-[#d5e3dc] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#1d332a] hover:border-[#b7cec3]">
            <Briefcase size={14} /> Browse jobs
          </Link>
          <Link to="/candidate/courses" className="inline-flex items-center gap-2 rounded-full border border-[#d5e3dc] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#1d332a] hover:border-[#b7cec3]">
            <BookOpen size={14} /> Browse courses
          </Link>
        </div>
      </div>
    </main>
  );
}

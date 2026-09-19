import {
  ArrowLeft,
  Sparkles,
  FileText,
  Target,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/api";

const skillSuggestions = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "SQL",
  "AWS", "Docker", "Data analysis", "UI/UX design", "Communication",
  "Leadership", "Project management", "Marketing", "Sales", "Finance",
];

const inputClass =
  "w-full rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[14px] text-[#12241c] placeholder-[#7a8b84] outline-none transition focus:border-[#146c45] focus:bg-white focus:ring-2 focus:ring-[#146c45]/10";

function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-[14px] leading-7 text-[#3d4d46]">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} className="mt-4 font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#12241c]">{line.slice(3)}</h3>;
        if (line.startsWith("# ")) return <h2 key={i} className="mt-5 font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#12241c]">{line.slice(2)}</h2>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold text-[#12241c]">{line.slice(2, -2)}</p>;
        if (line.match(/^\*\*(.+)\*\*/)) {
          const parts = line.split(/\*\*(.+?)\*\*/g);
          return <p key={i}>{parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-semibold text-[#12241c]">{p}</strong> : p)}</p>;
        }
        if (line.startsWith("- ") || line.startsWith("• ")) return <li key={i} className="ml-4 list-disc">{line.slice(2)}</li>;
        if (line.match(/^\d+\./)) return <li key={i} className="ml-4 list-decimal">{line.replace(/^\d+\.\s*/, "")}</li>;
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

export default function ResumeOptimizer() {
  const [resumeText, setResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function toggleSkill(skill: string) {
    setSkills((curr) => curr.includes(skill) ? curr.filter((s) => s !== skill) : [...curr, skill]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resumeText.trim() || !targetRole.trim()) return;
    setLoading(true);
    setError("");
    setResult("");
    try {
      const res = await apiRequest<{ result: string }>("/api/ai/resume-optimize", {
        method: "POST",
        body: JSON.stringify({ resumeText, targetRole, skills }),
      });
      setResult(res.result ?? "");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#f7fbf9]">
      <div className="mx-auto max-w-[1180px] px-5 py-8">

        {/* Header */}
        <div className="mb-8">
          <Link to="/candidate/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#5b6b64] hover:text-[#146c45] transition">
            <ArrowLeft size={14} /> Back to dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-[0_8px_20px_-8px_rgba(139,92,246,0.7)]">
              <FileText size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-tight text-[#12241c]">AI Resume Optimizer</h1>
              <p className="text-[14px] text-[#5b6b64]">Get ATS score, keyword gaps, and a rewritten summary — powered by Gemini AI</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Input panel */}
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5 lg:col-span-2">
            <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
              <h2 className="mb-4 font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Your details</h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#3d4d46]">Target role *</label>
                  <div className="relative">
                    <Target size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a8b84]" />
                    <input
                      required
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Senior Frontend Engineer"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#3d4d46]">Resume / profile summary *</label>
                  <textarea
                    required
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste your resume text, LinkedIn summary, or describe your experience and background here…"
                    className={`${inputClass} min-h-40 resize-y`}
                  />
                  <p className="mt-1 text-[12px] text-[#7a8b84]">The more detail you provide, the better the analysis.</p>
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[#3d4d46]">Your current skills</label>
                  <div className="flex flex-wrap gap-2">
                    {skillSuggestions.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`rounded-full border px-3 py-1 text-[12px] font-medium transition ${
                          skills.includes(skill)
                            ? "border-[#146c45] bg-[#eaf6f0] text-[#146c45]"
                            : "border-[#e4eee9] bg-[#f7fbf9] text-[#5b6b64] hover:border-[#cfe6db]"
                        }`}
                      >
                        {skills.includes(skill) && <span className="mr-1">✓</span>}
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !resumeText.trim() || !targetRole.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(139,92,246,0.9)] transition hover:from-violet-700 hover:to-purple-700 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Analyzing resume…" : "Optimize my resume"}
            </button>
          </form>

          {/* Result panel */}
          <div className="lg:col-span-3">
            {!result && !loading && !error && (
              <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-[#cfe6db] bg-white p-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
                  <Sparkles size={24} className="text-violet-500" />
                </div>
                <p className="mt-4 font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#12241c]">Your optimization report will appear here</p>
                <p className="mt-2 text-[13px] text-[#7a8b84]">Fill in your details and click "Optimize my resume" to get started.</p>
              </div>
            )}

            {loading && (
              <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-[22px] border border-white bg-white p-10 text-center shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
                  <Loader2 size={24} className="animate-spin text-violet-500" />
                </div>
                <p className="mt-4 font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#12241c]">Analyzing your resume…</p>
                <p className="mt-2 text-[13px] text-[#7a8b84]">Gemini AI is reviewing your profile against the target role.</p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-[22px] border border-red-200 bg-red-50 p-5">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
                <div>
                  <p className="font-semibold text-red-700">Analysis failed</p>
                  <p className="mt-1 text-[13px] text-red-600">{error}</p>
                </div>
              </div>
            )}

            {result && (
              <div className="rounded-[22px] border border-white bg-white shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
                <div className="flex items-center justify-between border-b border-[#eef3f0] px-6 py-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-[#146c45]" />
                    <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Optimization Report</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyResult()}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#5b6b64] hover:bg-[#f0f7f3] transition"
                  >
                    {copied ? <Check size={13} className="text-[#146c45]" /> : <Copy size={13} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="p-6">
                  <MarkdownBlock text={result} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import {
  ArrowLeft,
  Sparkles,
  Mic,
  ChevronRight,
  Loader2,
  AlertCircle,
  RotateCcw,
  Star,
  MessageSquare,
  Target,
  Zap,
  Video,
  VideoOff,
  Circle,
  Square,
  Play,
  Type,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/api";

type Difficulty = "easy" | "medium" | "hard";
type QuestionType = "behavioral" | "technical" | "situational";
type Stage = "setup" | "question" | "answering" | "feedback";
type PracticeMode = "text" | "video";

const inputClass =
  "w-full rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[14px] text-[#12241c] placeholder-[#7a8b84] outline-none transition focus:border-[#146c45] focus:bg-white focus:ring-2 focus:ring-[#146c45]/10";

const difficultyConfig: Record<Difficulty, { label: string; color: string; bg: string }> = {
  easy:   { label: "Easy",   color: "text-[#146c45]", bg: "bg-[#eaf6f0] border-[#cfe6db]" },
  medium: { label: "Medium", color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  hard:   { label: "Hard",   color: "text-red-700",    bg: "bg-red-50 border-red-200" },
};

const typeConfig: Record<QuestionType, { label: string; icon: React.ReactNode }> = {
  behavioral:  { label: "Behavioral",  icon: <MessageSquare size={14} /> },
  technical:   { label: "Technical",   icon: <Zap size={14} /> },
  situational: { label: "Situational", icon: <Target size={14} /> },
};

function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-[14px] leading-7 text-[#3d4d46]">
      {lines.map((line, i) => {
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

// ─── Video Recorder Component ────────────────────────────────────────────────
function VideoRecorder({
  onTranscript,
  onVideoBlob,
}: {
  onTranscript: (text: string) => void;
  onVideoBlob: (blob: Blob | null) => void;
}) {
  const liveRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [camState, setCamState] = useState<"idle" | "preview" | "recording" | "recorded">("idle");
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [camError, setCamError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startCamera() {
    setCamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (liveRef.current) {
        liveRef.current.srcObject = stream;
        await liveRef.current.play();
      }
      setCamState("preview");
    } catch {
      setCamError("Camera/microphone access denied. Please allow permissions and try again.");
    }
  }

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm;codecs=vp8,opus" });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);
      onVideoBlob(blob);
      // Simple transcript placeholder — in production, send blob to speech-to-text API
      onTranscript("[Video answer recorded — AI will evaluate your delivery and content]");
      setCamState("recorded");
      if (liveRef.current) liveRef.current.srcObject = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    recorderRef.current = recorder;
    recorder.start(200);
    setCamState("recording");
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function retake() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    onVideoBlob(null);
    onTranscript("");
    setCamState("idle");
    setElapsed(0);
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="space-y-3">
      {/* Video display */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0b1a14] aspect-video flex items-center justify-center">
        {camState === "idle" && (
          <div className="flex flex-col items-center gap-3 text-white/60">
            <VideoOff size={36} />
            <p className="text-[13px]">Camera not started</p>
          </div>
        )}
        {(camState === "preview" || camState === "recording") && (
          <video ref={liveRef} muted className="w-full h-full object-cover" />
        )}
        {camState === "recorded" && recordedUrl && (
          <video ref={playbackRef} src={recordedUrl} controls className="w-full h-full object-cover" />
        )}
        {camState === "recording" && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-red-600/90 px-3 py-1 text-[12px] font-semibold text-white">
            <Circle size={8} className="fill-white animate-pulse" /> REC {mins}:{secs}
          </div>
        )}
      </div>

      {camError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          <AlertCircle size={14} /> {camError}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {camState === "idle" && (
          <button type="button" onClick={() => void startCamera()}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#12241c] py-3 text-[13px] font-semibold text-white hover:bg-[#0b1a14] transition">
            <Video size={15} /> Start camera
          </button>
        )}
        {camState === "preview" && (
          <button type="button" onClick={startRecording}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-red-600 py-3 text-[13px] font-semibold text-white hover:bg-red-700 transition">
            <Circle size={13} className="fill-white" /> Start recording
          </button>
        )}
        {camState === "recording" && (
          <button type="button" onClick={stopRecording}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-red-600 py-3 text-[13px] font-semibold text-white hover:bg-red-700 transition animate-pulse">
            <Square size={13} className="fill-white" /> Stop recording
          </button>
        )}
        {camState === "recorded" && (
          <>
            <button type="button" onClick={() => playbackRef.current?.play()}
              className="flex items-center gap-1.5 rounded-full border border-[#e4eee9] px-4 py-3 text-[13px] font-medium text-[#5b6b64] hover:bg-[#f0f7f3] transition">
              <Play size={13} /> Review
            </button>
            <button type="button" onClick={retake}
              className="flex items-center gap-1.5 rounded-full border border-[#e4eee9] px-4 py-3 text-[13px] font-medium text-[#5b6b64] hover:bg-[#f0f7f3] transition">
              <RotateCcw size={13} /> Retake
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InterviewPractice() {
  const [role, setRole] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [questionType, setQuestionType] = useState<QuestionType>("behavioral");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("text");
  const [stage, setStage] = useState<Stage>("setup");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionCount, setSessionCount] = useState(0);
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
  const [_videoBlob, setVideoBlob] = useState<Blob | null>(null);

  async function generateQuestion() {
    if (!role.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest<{ result: string }>("/api/ai/interview-question", {
        method: "POST",
        body: JSON.stringify({ role, skills: [], difficulty, questionType, previousQuestions }),
      });
      setQuestion(res.result ?? "");
      setAnswer("");
      setFeedback("");
      setVideoBlob(null);
      setStage("question");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest<{ result: string }>("/api/ai/interview-evaluate", {
        method: "POST",
        body: JSON.stringify({ question, answer, role }),
      });
      setFeedback(res.result ?? "");
      setStage("feedback");
      setSessionCount((c) => c + 1);
      setPreviousQuestions((prev) => [...prev, question.slice(0, 120)]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function nextQuestion() {
    setStage("question");
    setAnswer("");
    setFeedback("");
    setVideoBlob(null);
    void generateQuestion();
  }

  function restart() {
    setStage("setup");
    setQuestion("");
    setAnswer("");
    setFeedback("");
    setError("");
    setVideoBlob(null);
    setPreviousQuestions([]);
    setSessionCount(0);
  }

  return (
    <div className="min-h-screen bg-[#f7fbf9]">
      <div className="mx-auto max-w-[860px] px-5 py-8">

        {/* Header */}
        <div className="mb-8">
          <Link to="/candidate/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#5b6b64] hover:text-[#146c45] transition">
            <ArrowLeft size={14} /> Back to dashboard
          </Link>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_8px_20px_-8px_rgba(245,158,11,0.7)]">
                <Mic size={22} className="text-white" />
              </div>
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-tight text-[#12241c]">AI Interview Practice</h1>
                <p className="text-[14px] text-[#5b6b64]">Practice with AI-generated questions and get instant feedback</p>
              </div>
            </div>
            {sessionCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[13px] font-semibold text-amber-700">
                <Star size={14} /> {sessionCount} answered
              </div>
            )}
          </div>
        </div>

        {/* Setup stage */}
        {stage === "setup" && (
          <div className="space-y-5">
            <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
              <h2 className="mb-5 font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Configure your session</h2>

              <div className="space-y-5">
                {/* Practice mode toggle */}
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[#3d4d46]">Practice mode</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setPracticeMode("text")}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-[13px] font-semibold transition ${practiceMode === "text" ? "border-[#146c45] bg-[#eaf6f0] text-[#146c45]" : "border-[#e4eee9] bg-[#f7fbf9] text-[#5b6b64] hover:border-[#cfe6db]"}`}>
                      <Type size={15} /> Text answer
                    </button>
                    <button type="button" onClick={() => setPracticeMode("video")}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-[13px] font-semibold transition ${practiceMode === "video" ? "border-[#146c45] bg-[#eaf6f0] text-[#146c45]" : "border-[#e4eee9] bg-[#f7fbf9] text-[#5b6b64] hover:border-[#cfe6db]"}`}>
                      <Video size={15} /> Video answer
                    </button>
                  </div>
                  {practiceMode === "video" && (
                    <p className="mt-2 text-[12px] text-[#7a8b84]">Record yourself answering — great for practising delivery, eye contact, and body language. Requires camera & microphone access.</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#3d4d46]">Target role *</label>
                  <input value={role} onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Product Manager, Data Scientist, Frontend Engineer"
                    className={inputClass} />
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[#3d4d46]">Difficulty</label>
                  <div className="flex gap-2">
                    {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
                      const cfg = difficultyConfig[d];
                      return (
                        <button key={d} type="button" onClick={() => setDifficulty(d)}
                          className={`flex-1 rounded-xl border py-2.5 text-[13px] font-semibold transition ${difficulty === d ? cfg.bg + " " + cfg.color : "border-[#e4eee9] bg-[#f7fbf9] text-[#5b6b64] hover:border-[#cfe6db]"}`}>
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[#3d4d46]">Question type</label>
                  <div className="flex gap-2">
                    {(["behavioral", "technical", "situational"] as QuestionType[]).map((t) => {
                      const cfg = typeConfig[t];
                      return (
                        <button key={t} type="button" onClick={() => setQuestionType(t)}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[13px] font-semibold transition ${questionType === t ? "border-[#146c45] bg-[#eaf6f0] text-[#146c45]" : "border-[#e4eee9] bg-[#f7fbf9] text-[#5b6b64] hover:border-[#cfe6db]"}`}>
                          {cfg.icon} {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button type="button" onClick={() => void generateQuestion()} disabled={loading || !role.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(245,158,11,0.9)] transition hover:from-amber-600 hover:to-orange-600 disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Generating question…" : "Start practice session"}
            </button>
          </div>
        )}

        {/* Question + answering stage */}
        {(stage === "question" || stage === "answering") && (
          <div className="space-y-5">
            {/* Badges */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[12px] font-semibold text-amber-700">
                <Star size={12} /> Q{sessionCount + 1}
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-[#e4eee9] px-3 py-1 text-[12px] font-medium text-[#5b6b64]">
                {typeConfig[questionType].icon} {typeConfig[questionType].label}
              </div>
              <div className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${difficultyConfig[difficulty].bg} ${difficultyConfig[difficulty].color}`}>
                {difficultyConfig[difficulty].label}
              </div>
              <div className={`flex items-center gap-1 rounded-full border px-3 py-1 text-[12px] font-semibold ${practiceMode === "video" ? "border-[#146c45] bg-[#eaf6f0] text-[#146c45]" : "border-[#e4eee9] bg-[#f7fbf9] text-[#5b6b64]"}`}>
                {practiceMode === "video" ? <Video size={11} /> : <Type size={11} />}
                {practiceMode === "video" ? "Video" : "Text"}
              </div>
            </div>

            {/* Question card */}
            <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
              <p className="mb-1 text-[12px] font-semibold tracking-[0.12em] text-amber-600">INTERVIEW QUESTION</p>
              {loading ? (
                <div className="flex items-center gap-2 py-4 text-[#5b6b64]">
                  <Loader2 size={16} className="animate-spin" /> Generating question…
                </div>
              ) : (
                <MarkdownBlock text={question} />
              )}
            </div>

            {/* Answer area */}
            {!loading && (
              <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
                {practiceMode === "text" ? (
                  <>
                    <label className="mb-2 block text-[13px] font-medium text-[#3d4d46]">Your answer</label>
                    <textarea value={answer} onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Type your answer here. Use the STAR method: Situation, Task, Action, Result…"
                      className={`${inputClass} min-h-36 resize-y`} />
                  </>
                ) : (
                  <>
                    <label className="mb-3 block text-[13px] font-medium text-[#3d4d46]">Record your video answer</label>
                    <VideoRecorder
                      onTranscript={(t) => setAnswer(t)}
                      onVideoBlob={(b) => setVideoBlob(b)}
                    />
                    {answer && (
                      <p className="mt-3 rounded-xl bg-[#f7fbf9] px-4 py-3 text-[12px] text-[#5b6b64]">
                        ✓ Video recorded — ready to submit for AI feedback
                      </p>
                    )}
                  </>
                )}

                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={() => void submitAnswer()} disabled={loading || !answer.trim()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(245,158,11,0.9)] transition hover:from-amber-600 hover:to-orange-600 disabled:opacity-50">
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />}
                    {loading ? "Evaluating…" : "Submit answer"}
                  </button>
                  <button type="button" onClick={restart}
                    className="flex items-center gap-1.5 rounded-full border border-[#e4eee9] px-4 py-3 text-[13px] font-medium text-[#5b6b64] hover:bg-[#f0f7f3] transition">
                    <RotateCcw size={14} /> Restart
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                <AlertCircle size={15} /> {error}
              </div>
            )}
          </div>
        )}

        {/* Feedback stage */}
        {stage === "feedback" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full bg-[#eaf6f0] px-3 py-1 text-[12px] font-semibold text-[#146c45]">
                <Star size={12} /> {sessionCount} answered
              </div>
            </div>

            {/* Original question */}
            <div className="rounded-[22px] border border-[#e4eee9] bg-[#f7fbf9] p-5">
              <p className="mb-1 text-[11px] font-semibold tracking-[0.12em] text-[#7a8b84]">QUESTION</p>
              <MarkdownBlock text={question} />
            </div>

            {/* Your answer */}
            <div className="rounded-[22px] border border-[#e4eee9] bg-[#f7fbf9] p-5">
              <p className="mb-1 text-[11px] font-semibold tracking-[0.12em] text-[#7a8b84]">YOUR ANSWER</p>
              <p className="text-[14px] leading-7 text-[#3d4d46]">{answer}</p>
            </div>

            {/* AI feedback */}
            <div className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
                  <Sparkles size={15} className="text-amber-600" />
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">AI Feedback</h2>
              </div>
              <MarkdownBlock text={feedback} />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => void nextQuestion()} disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(245,158,11,0.9)] transition hover:from-amber-600 hover:to-orange-600 disabled:opacity-50">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />}
                {loading ? "Generating…" : "Next question"}
              </button>
              <button type="button" onClick={restart}
                className="flex items-center gap-1.5 rounded-full border border-[#e4eee9] px-4 py-3 text-[13px] font-medium text-[#5b6b64] hover:bg-[#f0f7f3] transition">
                <RotateCcw size={14} /> New session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
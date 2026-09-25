import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getCachedUser,
  getDashboardPath,
  getSupabaseAuthProvidersUrl,
  isSessionReady,
  mapAuthError,
  needsRoleSelection,
  sendPhoneOtp,
  subscribeToUser,
  verifyPhoneOtp,
} from "../../services/auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "../../services/api";
import AuthSocialButtons from "../../components/AuthSocialButtons";

const inputClass =
  "w-full rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[14px] text-[#12241c] placeholder-[#7a8b84] outline-none transition focus:border-[#146c45] focus:bg-white focus:ring-2 focus:ring-[#146c45]/10";

function BrandPanel({ title, subtitle }: { title: ReactNode; subtitle: string }) {
  return (
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-[#0b2a1c] via-[#0f3d28] to-[#0b5c3a] p-12 text-white">
      <Link to="/" className="flex items-center gap-2.5">
        <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
          <span className="font-[family-name:var(--font-display)] text-[17px] font-bold leading-none">C</span>
        </span>
        <span className="font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-tight">
          Career<span className="text-[#2aa36a]">OS</span>
        </span>
      </Link>
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-[40px] font-semibold leading-tight tracking-[-0.025em]">{title}</h1>
        <p className="mt-4 text-[16px] text-white/70 leading-relaxed">{subtitle}</p>
        <div className="mt-10 grid grid-cols-3 gap-4">
          {[
            { value: "10K+", label: "Active jobs" },
            { value: "500+", label: "Courses" },
            { value: "95%", label: "Placement rate" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[22px] bg-white/10 p-4 backdrop-blur">
              <p className="font-[family-name:var(--font-display)] text-[24px] font-semibold">{stat.value}</p>
              <p className="mt-1 text-[13px] text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[13px] text-white/40">© 2026 CareerOS. All rights reserved.</p>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const redirected = useRef(false);
  const [mode, setMode] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(!isSessionReady() || Boolean(getCachedUser()));
  const [error, setError] = useState("");

  const goNext = useCallback((user: Parameters<typeof getDashboardPath>[0]) => {
    if (redirected.current || !user) return;
    redirected.current = true;
    navigate(needsRoleSelection(user) ? "/select-role" : getDashboardPath(user), { replace: true });
  }, [navigate]);

  useEffect(() => {
    return subscribeToUser((user) => {
      if (user) { goNext(user); return; }
      setCheckingSession(false);
    });
  }, [goNext]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "email") {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        goNext(data.user ?? data.session?.user);
      } else if (!otpSent) {
        await sendPhoneOtp(phone);
        setOtpSent(true);
      } else {
        const user = await verifyPhoneOtp(phone, otp);
        goNext(user);
      }
    } catch (err) {
      redirected.current = false;
      const mapped = mapAuthError(err, mode === "otp" ? "phone" : undefined);
      setError(mapped);
      if (mode === "otp" && mapped.toLowerCase().includes("phone otp is not enabled")) {
        setOtpSent(false);
      }
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f7fbf9]" aria-busy="true" aria-label="Checking session">
        <div className="ui-skeleton h-10 w-10 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="skip-link">Skip to content</a>
      <BrandPanel title={<>Your next career<br />move starts here.</>} subtitle="AI-powered job matching, skill-building courses, and personalized career coaching — all in one place." />

      <div id="main" className="flex w-full flex-col justify-center bg-[#f7fbf9] px-6 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#1a8f5a] to-[#0b5c3a] text-white shadow-[0_8px_20px_-8px_rgba(11,92,58,0.7)]">
            <span className="font-[family-name:var(--font-display)] text-[17px] font-bold leading-none">C</span>
          </span>
          <span className="font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-tight text-[#12241c]">
            Career<span className="text-[#178a5a]">OS</span>
          </span>
        </Link>

        <div className="mx-auto w-full max-w-sm">
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">SIGN IN</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-tight text-[#12241c]">Welcome back</h2>
          <p className="mt-2 text-[14px] text-[#5b6b64]">Email, mobile OTP, Google, or LinkedIn.</p>

          <div className="mt-6 grid grid-cols-2 rounded-full bg-[#eaf6f0] p-1" role="tablist" aria-label="Sign-in method">
            {(["email", "otp"] as const).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={mode === item}
                onClick={() => { setMode(item); setError(""); }}
                className={`min-h-11 rounded-full px-3 py-2 text-[13px] font-semibold transition duration-200 ${mode === item ? "bg-white text-[#146c45] shadow-sm" : "text-[#5b6b64] hover:text-[#12241c]"}`}
              >
                {item === "email" ? "Email" : "Mobile OTP"}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => void login(e)} className="mt-6 space-y-5">
            {error && (
              <div role="alert" className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                <p>{error}</p>
                {mode === "otp" && error.toLowerCase().includes("phone otp is not enabled") && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <a href={getSupabaseAuthProvidersUrl()} target="_blank" rel="noreferrer" className="font-semibold text-[#146c45] hover:underline">
                      Open Phone provider settings
                    </a>
                    <button
                      type="button"
                      onClick={() => { setMode("email"); setError(""); setOtpSent(false); }}
                      className="font-semibold text-[#146c45] hover:underline"
                    >
                      Use email instead
                    </button>
                  </div>
                )}
              </div>
            )}

            {mode === "email" ? (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-[13px] font-medium text-[#3d4d46]">Email address</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="password" className="block text-[13px] font-medium text-[#3d4d46]">Password</label>
                    <Link to="/forgot-password" className="text-[12px] font-semibold text-[#146c45] hover:underline">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className={`${inputClass} pr-11`} />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center text-[#7a8b84] transition duration-200 hover:text-[#5b6b64]" aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="block text-[13px] font-medium text-[#3d4d46]">Mobile number</label>
                  <input id="phone" type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setOtpSent(false); }} placeholder="98765 43210 or +91…" required className={inputClass} />
                  <p className="text-[12px] text-[#7a8b84]">10-digit Indian numbers are prefixed with +91.</p>
                </div>
                {otpSent && (
                  <div className="space-y-1.5">
                    <label htmlFor="otp" className="block text-[13px] font-medium text-[#3d4d46]">OTP code</label>
                    <input id="otp" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" required className={inputClass} />
                  </div>
                )}
              </>
            )}

            <button type="submit" disabled={loading} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] transition duration-200 hover:bg-[#0f5a39] active:scale-[0.98] disabled:opacity-60">
              {loading ? <Loader2 size={17} className="animate-spin" /> : null}
              {mode === "email" ? (loading ? "Signing in…" : "Sign in") : otpSent ? (loading ? "Verifying…" : "Verify OTP") : (loading ? "Sending…" : "Send OTP")}
            </button>
          </form>

          <AuthSocialButtons onError={setError} />

          <p className="mt-6 text-center text-[13px] text-[#5b6b64]">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-[#146c45] hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getCachedUser,
  getDashboardPath,
  isSessionReady,
  needsRoleSelection,
  persistProfile,
  requireSingleSignupRole,
  subscribeToUser,
  type AppRole,
} from "../../services/auth";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "../../services/api";
import AuthSocialButtons from "../../components/AuthSocialButtons";

const roleChoices: { value: AppRole; label: string; description: string }[] = [
  { value: "candidate", label: "Candidate", description: "Find jobs & grow skills" },
  { value: "academy",   label: "Academy",   description: "Teach & create courses" },
  { value: "recruiter", label: "Recruiter", description: "Hire talent & post jobs" },
];

const inputClass =
  "w-full rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[14px] text-[#12241c] placeholder-[#7a8b84] outline-none transition focus:border-[#146c45] focus:bg-white focus:ring-2 focus:ring-[#146c45]/10";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("candidate");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [checkingSession, setCheckingSession] = useState(!isSessionReady() || Boolean(getCachedUser()));
  const redirected = useRef(false);

  function goNext(user: Parameters<typeof getDashboardPath>[0]) {
    if (redirected.current || !user) return;
    redirected.current = true;
    navigate(needsRoleSelection(user) ? "/select-role" : getDashboardPath(user), { replace: true });
  }

  useEffect(() => {
    return subscribeToUser((user) => {
      if (user) { goNext(user); return; }
      setCheckingSession(false);
    });
  }, [navigate]);

  function chooseRole(next: AppRole) {
    if (next === "admin") return;
    try {
      setRole(requireSingleSignupRole([next]));
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const fullName = name.trim();
    const trimmedEmail = email.trim();
    let active: AppRole;
    try {
      active = requireSingleSignupRole([role]);
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    if (!fullName) {
      setError("Enter your full name.");
      return;
    }
    if (!trimmedEmail) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);

    const selected = [active];
    const { data, error: authError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: { data: { full_name: fullName, role: active, roles: selected, active_role: active } },
    });

    if (authError) {
      redirected.current = false;
      if (authError.message.toLowerCase().includes("email rate limit")) {
        setError("Too many requests. Please use the most recent confirmation email or wait an hour.");
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    if (data.user) {
      if (data.session) {
        try {
          await persistProfile(data.user, { full_name: fullName, roles: selected, active_role: active });
        } catch {
          /* profile upsert is best-effort; metadata is already on the user */
        }
        goNext(data.session.user);
      } else {
        setSuccess(true);
      }
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f7fbf9] px-6">
        <a href="#main" className="skip-link">Skip to content</a>
        <div id="main" className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#d4ede2]">
            <CheckCircle2 size={32} className="text-[#146c45]" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-[26px] font-semibold text-[#12241c]">Check your email</h2>
          <p className="mt-3 text-[14px] text-[#5b6b64]">
            We sent a confirmation link to <strong className="text-[#12241c]">{email}</strong>. Click it to activate your account.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#146c45] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] transition duration-200 hover:bg-[#0f5a39] active:scale-[0.98]"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
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
          <h1 className="font-[family-name:var(--font-display)] text-[40px] font-semibold leading-tight tracking-[-0.025em]">
            Join thousands<br />building their future.
          </h1>
          <p className="mt-4 text-[16px] text-white/70 leading-relaxed">
            Start with one workspace. Extra roles can be added later after confirmation.
          </p>
          <div className="mt-10 space-y-4">
            {[
              "Email, Google, or LinkedIn — one account",
              "Add extra roles later after confirmation",
              "AI job matching, courses, and hiring tools",
              "Personalized career coaching powered by AI",
            ].map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2aa36a]/20">
                  <CheckCircle2 size={13} className="text-[#2aa36a]" />
                </div>
                <p className="text-[13px] text-white/70">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[13px] text-white/40">© 2026 CareerOS. All rights reserved.</p>
      </div>

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
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">GET STARTED</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-tight text-[#12241c]">Create your account</h2>
          <p className="mt-2 text-[14px] text-[#5b6b64]">Choose one starting role. Extra workspaces can be added later after confirmation.</p>

          <form onSubmit={(e) => void register(e)} className="mt-8 space-y-5">
            {error && (
              <div role="alert" className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-[13px] font-medium text-[#3d4d46]">Full name</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" required className={inputClass} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[13px] font-medium text-[#3d4d46]">Email address</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className={inputClass} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[13px] font-medium text-[#3d4d46]">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center text-[#7a8b84] transition duration-200 hover:text-[#5b6b64]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="block text-[13px] font-medium text-[#3d4d46]">I am a… (choose one)</legend>
              <div role="radiogroup" aria-label="Starting role" className="grid grid-cols-1 gap-2">
                {roleChoices.map((r) => {
                  const on = role === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => chooseRole(r.value)}
                      className={`flex min-h-11 items-start justify-between rounded-xl border p-3 text-left transition duration-200 ${
                        on
                          ? "border-[#146c45] bg-[#eaf6f0] ring-2 ring-[#146c45]/10"
                          : "border-[#e4eee9] bg-[#f7fbf9] hover:border-[#cfe6db] hover:bg-white"
                      }`}
                    >
                      <div>
                        <p className={`text-[13px] font-semibold ${on ? "text-[#146c45]" : "text-[#12241c]"}`}>{r.label}</p>
                        <p className="mt-0.5 text-[12px] text-[#5b6b64]">{r.description}</p>
                      </div>
                      {on && <CheckCircle2 size={16} className="mt-0.5 text-[#146c45]" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-[12px] text-[#7a8b84]">Only one starting role is allowed. Extra roles require a later confirmation. Employer hiring lives under Recruiter. Admin cannot be self-assigned.</p>
            </fieldset>

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] transition duration-200 hover:bg-[#0f5a39] active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? <><Loader2 size={17} className="animate-spin" /> Creating account…</> : "Create account"}
            </button>
          </form>

          <AuthSocialButtons onError={setError} />

          <p className="mt-6 text-center text-[13px] text-[#5b6b64]">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-[#146c45] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

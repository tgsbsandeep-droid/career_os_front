import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  getCachedUser,
  isPasswordRecoveryRedirect,
  isSessionReady,
  mapAuthError,
  subscribeToUser,
  updatePassword,
} from "../../services/auth";

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
      </div>
      <p className="text-[13px] text-white/40">© 2026 CareerOS. All rights reserved.</p>
    </div>
  );
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const authError = params.get("error_description") || params.get("error") || hash.get("error_description");
    if (authError) {
      setError(authError.replace(/\+/g, " "));
      setChecking(false);
      return;
    }

    return subscribeToUser((user) => {
      if (!isSessionReady()) return;
      setChecking(false);
      if (user || isPasswordRecoveryRedirect() || getCachedUser()) {
        setReady(Boolean(user ?? getCachedUser()));
        return;
      }
      setError("This reset link is invalid or has expired. Request a new one.");
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
      window.setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="skip-link">Skip to content</a>
      <BrandPanel
        title={<>Choose a<br />new password.</>}
        subtitle="Use at least 8 characters. After saving, sign in again with your new password."
      />

      <div id="main" className="flex w-full flex-col justify-center bg-[#f7fbf9] px-6 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">ACCOUNT RECOVERY</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-tight text-[#12241c]">Set new password</h2>
          <p className="mt-2 text-[14px] text-[#5b6b64]">
            {done ? "Password updated. Redirecting to sign in…" : "Enter and confirm your new password."}
          </p>

          {checking ? (
            <div className="mt-10 flex justify-center" aria-busy="true" aria-label="Checking reset link">
              <div className="ui-skeleton h-10 w-10 rounded-full" />
            </div>
          ) : done ? (
            <p className="mt-8 text-[14px] text-[#146c45]">Your password has been updated.</p>
          ) : (
            <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-5">
              {error && (
                <div role="alert" className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  {error}
                </div>
              )}
              {ready && (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-[13px] font-medium text-[#3d4d46]">New password</label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        required
                        minLength={8}
                        autoComplete="new-password"
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
                  <div className="space-y-1.5">
                    <label htmlFor="confirm" className="block text-[13px] font-medium text-[#3d4d46]">Confirm password</label>
                    <input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat new password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] transition duration-200 hover:bg-[#0f5a39] active:scale-[0.98] disabled:opacity-60"
                  >
                    {loading ? <Loader2 size={17} className="animate-spin" /> : null}
                    {loading ? "Saving…" : "Update password"}
                  </button>
                </>
              )}
              {!ready && !error && (
                <p className="text-[13px] text-[#5b6b64]">Waiting for a valid reset session…</p>
              )}
              {!ready && error && (
                <Link
                  to="/forgot-password"
                  className="flex min-h-11 w-full items-center justify-center rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white transition duration-200 hover:bg-[#0f5a39] active:scale-[0.98]"
                >
                  Request a new link
                </Link>
              )}
            </form>
          )}

          <p className="mt-6 text-center text-[13px] text-[#5b6b64]">
            Need a new link?{" "}
            <Link to="/forgot-password" className="font-semibold text-[#146c45] hover:underline">Request reset</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

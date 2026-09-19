import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { mapAuthError, requestPasswordReset } from "../../services/auth";

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

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
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
        title={<>Reset your<br />password.</>}
        subtitle="We'll email a secure link so you can choose a new password and get back to your dashboard."
      />

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
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">ACCOUNT RECOVERY</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-tight text-[#12241c]">Forgot password</h2>
          <p className="mt-2 text-[14px] text-[#5b6b64]">
            {sent
              ? "If that email is registered, a reset link is on its way. Check spam if you don't see it."
              : "Enter the email you use to sign in. We'll send a reset link."}
          </p>

          {sent ? (
            <Link
              to="/login"
              className="mt-8 flex min-h-11 w-full items-center justify-center rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white transition duration-200 hover:bg-[#0f5a39] active:scale-[0.98]"
            >
              Back to sign in
            </Link>
          ) : (
            <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-5">
              {error && (
                <div role="alert" className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-[13px] font-medium text-[#3d4d46]">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] transition duration-200 hover:bg-[#0f5a39] active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? <Loader2 size={17} className="animate-spin" /> : null}
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-[13px] text-[#5b6b64]">
            Remembered it?{" "}
            <Link to="/login" className="font-semibold text-[#146c45] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, LogOut } from "lucide-react";
import { supabase } from "../../services/api";
import {
  addUserRoles,
  getCachedUser,
  getDashboardPath,
  getRoleLabel,
  getUserRoles,
  isSessionReady,
  needsRoleSelection,
  persistProfile,
  requireSingleSignupRole,
  sanitizeSignupRoles,
  setActiveRole,
  subscribeToUser,
  type AppRole,
} from "../../services/auth";

const choices: { value: AppRole; label: string; description: string }[] = [
  { value: "candidate", label: "Candidate", description: "Find jobs, courses, and career tools" },
  { value: "academy",   label: "Academy",   description: "Publish courses and teach learners" },
  { value: "recruiter", label: "Recruiter", description: "Post jobs and hire talent" },
];

export default function SelectRole() {
  const navigate = useNavigate();
  const [userReady, setUserReady] = useState(isSessionReady());
  const [selected, setSelected] = useState<AppRole | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const existing = getUserRoles(getCachedUser());
  const isAdding = existing.length > 0 && !needsRoleSelection(getCachedUser());

  useEffect(() => {
    return subscribeToUser((user) => {
      setUserReady(true);
      if (!user) navigate("/login", { replace: true });
    });
  }, [navigate]);

  function choose(role: AppRole) {
    if (role === "admin") return;
    try {
      const next = requireSingleSignupRole([role]);
      const held = sanitizeSignupRoles(existing);
      if (held.includes(next)) {
        setError("That role is already on this account.");
        return;
      }
      setSelected(next);
      setConfirmed(false);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function save() {
    let active: AppRole;
    try {
      active = requireSingleSignupRole(selected ? [selected] : []);
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    const held = sanitizeSignupRoles(existing);
    if (held.includes(active)) {
      setError("That role is already on this account.");
      return;
    }
    if (isAdding && !confirmed) {
      setError(`Confirm that you want to add the ${getRoleLabel(active)} workspace to this account.`);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const user = isAdding
        ? await addUserRoles([active])
        : await (async () => {
            const current = getCachedUser();
            if (!current) throw new Error("Not signed in");
            await persistProfile(current, { roles: [active], active_role: active });
            const refreshed = await supabase.auth.getUser();
            return refreshed.data.user;
          })();
      if (user && isAdding) await setActiveRole(active);
      navigate(getDashboardPath(user, active), { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  if (!userReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f7fbf9]" aria-busy="true" aria-label="Checking session">
        <div className="ui-skeleton h-10 w-10 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f7fbf9] px-6 py-12">
      <a href="#main" className="skip-link">Skip to content</a>
      <div id="main" className="w-full max-w-lg rounded-[22px] border border-white bg-white p-8 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
        <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">
          {isAdding ? "ADD A ROLE" : "CHOOSE YOUR ROLE"}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[28px] font-semibold text-[#12241c]">
          {isAdding ? "Use CareerOS in another way" : "How will you use CareerOS?"}
        </h1>
        <p className="mt-2 text-[14px] leading-6 text-[#5b6b64]">
          {isAdding
            ? "Add one extra workspace at a time. Confirm below before it is saved."
            : "Choose one starting role. Extra roles can be added later after confirmation."}
        </p>

        {error && (
          <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
        )}

        <div role="radiogroup" aria-label={isAdding ? "Extra role" : "Starting role"} className="mt-6 grid gap-3">
          {choices.map((choice) => {
            const already = existing.includes(choice.value);
            const on = selected === choice.value;
            return (
              <button
                key={choice.value}
                type="button"
                role="radio"
                disabled={already}
                aria-checked={on}
                onClick={() => choose(choice.value)}
                className={`flex min-h-11 items-start justify-between rounded-2xl border p-4 text-left transition duration-200 ${
                  on
                    ? "border-[#146c45] bg-[#eaf6f0] ring-2 ring-[#146c45]/10"
                    : already
                      ? "border-[#e4eee9] bg-[#f7fbf9] opacity-70"
                      : "border-[#e4eee9] bg-[#f7fbf9] hover:border-[#cfe6db] hover:bg-white"
                }`}
              >
                <div>
                  <p className={`text-[15px] font-semibold ${on ? "text-[#146c45]" : "text-[#12241c]"}`}>{choice.label}</p>
                  <p className="mt-0.5 text-[13px] text-[#5b6b64]">{already ? "Already on this account" : choice.description}</p>
                </div>
                {(on || already) && <CheckCircle2 size={18} className="mt-0.5 text-[#146c45]" />}
              </button>
            );
          })}
        </div>

        {isAdding && selected ? (
          <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-[#d5e3dc] bg-[#f7fbf9] px-4 py-3 text-[13px] leading-5 text-[#3d4d46]">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#146c45]"
            />
            <span>
              I confirm I want to add the <strong className="text-[#12241c]">{getRoleLabel(selected)}</strong> workspace to this account. I understand this grants a second way to use CareerOS.
            </span>
          </label>
        ) : null}

        <button
          type="button"
          onClick={() => void save()}
          disabled={loading || !selected || (isAdding && !confirmed)}
          className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white transition duration-200 hover:bg-[#0f5a39] active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? "Saving…" : isAdding ? `Add ${selected ? getRoleLabel(selected) : "role"}` : "Continue"}
        </button>

        <button type="button" onClick={() => void logout()} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-medium text-[#5b6b64] transition duration-200 hover:bg-red-50 hover:text-red-700">
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );
}

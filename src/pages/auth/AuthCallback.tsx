import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardPath, isPasswordRecoveryRedirect, needsRoleSelection, subscribeToUser } from "../../services/auth";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const authError = params.get("error_description") || params.get("error") || hash.get("error_description");
    if (authError) {
      setError(authError.replace(/\+/g, " "));
      return;
    }

    if (isPasswordRecoveryRedirect()) {
      navigate("/auth/reset-password" + window.location.search + window.location.hash, { replace: true });
      return;
    }

    return subscribeToUser((user) => {
      if (!user) return;
      if (isPasswordRecoveryRedirect()) {
        navigate("/auth/reset-password" + window.location.search + window.location.hash, { replace: true });
        return;
      }
      if (needsRoleSelection(user)) {
        navigate("/select-role", { replace: true });
        return;
      }
      navigate(getDashboardPath(user), { replace: true });
    });
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7fbf9] px-6">
        <div className="max-w-md rounded-[22px] border border-red-200 bg-white p-8 text-center shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
          <p className="text-[12px] font-semibold tracking-[0.16em] text-red-600">SIGN-IN FAILED</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[24px] font-semibold text-[#12241c]">Could not complete login</h1>
          <p className="mt-3 text-[14px] text-[#5b6b64]">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="mt-6 rounded-full bg-[#146c45] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0f5a39]"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7fbf9]">
      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#146c45]" />
      <p className="mt-4 text-[14px] text-[#5b6b64]">Finishing sign-in…</p>
    </div>
  );
}

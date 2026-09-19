import { useState } from "react";
import { Loader2 } from "lucide-react";
import { getSupabaseAuthProvidersUrl, mapAuthError, signInWithGoogle, signInWithLinkedIn } from "../services/auth";

export default function AuthSocialButtons({ onError }: { onError: (message: string) => void }) {
  const [busy, setBusy] = useState<"google" | "linkedin" | null>(null);

  async function run(kind: "google" | "linkedin") {
    onError("");
    setBusy(kind);
    try {
      if (kind === "google") await signInWithGoogle();
      else await signInWithLinkedIn();
    } catch (err) {
      onError(mapAuthError(err, kind));
      setBusy(null);
    }
  }

  return (
    <>
      <div className="my-6 flex items-center gap-3 text-[12px] text-[#7a8b84]">
        <span className="h-px flex-1 bg-[#e4eee9]" />
        or continue with
        <span className="h-px flex-1 bg-[#e4eee9]" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void run("google")}
          disabled={busy !== null}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#e4eee9] bg-white px-3 py-2.5 text-[13px] font-semibold text-[#12241c] transition duration-200 hover:border-[#cfe6db] hover:bg-[#f7fbf9] active:scale-[0.98] disabled:opacity-60"
        >
          {busy === "google" ? <Loader2 size={15} className="animate-spin" /> : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12S6.6 21.8 12 21.8c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.8H12z" />
            </svg>
          )}
          Google
        </button>
        <button
          type="button"
          onClick={() => void run("linkedin")}
          disabled={busy !== null}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#e4eee9] bg-white px-3 py-2.5 text-[13px] font-semibold text-[#12241c] transition duration-200 hover:border-[#cfe6db] hover:bg-[#f7fbf9] active:scale-[0.98] disabled:opacity-60"
        >
          {busy === "linkedin" ? <Loader2 size={15} className="animate-spin" /> : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path fill="#0A66C2" d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
            </svg>
          )}
          LinkedIn
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-[#7a8b84]">
        Providers must be enabled in{" "}
        <a href={getSupabaseAuthProvidersUrl()} target="_blank" rel="noreferrer" className="font-semibold text-[#146c45] hover:underline">
          Supabase Auth → Providers
        </a>
        .
      </p>
    </>
  );
}

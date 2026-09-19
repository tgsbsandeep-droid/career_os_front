import { useEffect, useId, useRef, useState } from "react";
import { Briefcase, Loader2, X } from "lucide-react";

export type ApplyJobSummary = {
  id: string;
  title: string;
  company_name: string;
};

export type ApplyPrefill = {
  full_name?: string;
  contact_email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  resume_url?: string;
};

export type JobApplicationPayload = {
  full_name: string;
  contact_email: string;
  phone: string;
  location: string;
  linkedin_url: string;
  resume_url: string;
  cover_letter: string;
  notes: string;
};

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  resumeUrl: string;
  coverLetter: string;
  noticePeriod: string;
  expectedCtc: string;
};

const inputClass =
  "w-full min-h-11 rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[14px] text-[#12241c] placeholder-[#7a8b84] outline-none transition duration-200 focus:border-[#146c45] focus:bg-white focus:ring-2 focus:ring-[#146c45]/10";
const labelClass = "block text-[13px] font-medium text-[#3d4d46]";

function asFormText(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

function buildForm(prefill: ApplyPrefill | null): FormState {
  return {
    fullName: asFormText(prefill?.full_name),
    email: asFormText(prefill?.contact_email),
    phone: asFormText(prefill?.phone),
    location: asFormText(prefill?.location),
    linkedin: asFormText(prefill?.linkedin_url),
    resumeUrl: asFormText(prefill?.resume_url),
    coverLetter: "",
    noticePeriod: "",
    expectedCtc: "",
  };
}

function isDirty(form: FormState, prefill: ApplyPrefill | null) {
  const initial = buildForm(prefill);
  return (
    asFormText(form.coverLetter).trim() !== "" ||
    asFormText(form.noticePeriod).trim() !== "" ||
    asFormText(form.expectedCtc).trim() !== "" ||
    form.fullName !== initial.fullName ||
    form.email !== initial.email ||
    form.phone !== initial.phone ||
    form.location !== initial.location ||
    form.linkedin !== initial.linkedin ||
    form.resumeUrl !== initial.resumeUrl
  );
}

export default function JobApplyModal({
  job,
  prefill,
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  job: ApplyJobSummary;
  prefill: ApplyPrefill | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: JobApplicationPayload) => void;
}) {
  const titleId = useId();
  const errorId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(() => buildForm(prefill));
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    setForm(buildForm(prefill));
  }, [job.id, prefill]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstFieldRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || submitting) return;
      event.preventDefault();
      requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function requestClose() {
    if (submitting) return;
    if (isDirty(form, prefill) && !window.confirm("Discard this application? Your answers will not be saved.")) return;
    onClose();
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const fullName = asFormText(form.fullName).trim();
    const email = asFormText(form.email).trim();
    const coverLetter = asFormText(form.coverLetter).trim();
    if (!fullName) {
      setFieldError("Enter your full name.");
      firstFieldRef.current?.focus();
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError("Enter a valid email address.");
      return;
    }
    if (coverLetter.length < 20) {
      setFieldError("Add a short note (at least 20 characters) about why you are a fit.");
      return;
    }
    setFieldError(null);
    const extras = [
      asFormText(form.noticePeriod).trim() ? `Notice period: ${asFormText(form.noticePeriod).trim()}` : "",
      asFormText(form.expectedCtc).trim() ? `Expected CTC: ${asFormText(form.expectedCtc).trim()}` : "",
    ].filter(Boolean);
    onSubmit({
      full_name: fullName,
      contact_email: email,
      phone: asFormText(form.phone).trim(),
      location: asFormText(form.location).trim(),
      linkedin_url: asFormText(form.linkedin).trim(),
      resume_url: asFormText(form.resumeUrl).trim(),
      cover_letter: coverLetter,
      notes: extras.join("\n"),
    });
  }

  const alertText = fieldError || error;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close application form"
        className="absolute inset-0 bg-[#12241c]/50 cursor-pointer"
        onClick={requestClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={alertText ? errorId : undefined}
        className="relative z-[81] flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[24px] border border-white bg-white shadow-[0_24px_60px_-28px_rgba(18,50,36,0.45)] sm:rounded-[24px]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#eef3f0] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#157a4f]">APPLY</p>
            <h2 id={titleId} className="mt-1 font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#12241c]">
              {job.title}
            </h2>
            <p className="mt-0.5 truncate text-[13px] text-[#5b6b64]">{job.company_name || "Company"}</p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={submitting}
            aria-label="Close"
            className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border border-[#e4eee9] text-[#5b6b64] transition duration-200 hover:border-[#cfe6db] hover:text-[#12241c] disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Full name <span className="text-[#146c45]">*</span></span>
                <input
                  ref={firstFieldRef}
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  autoComplete="name"
                  className={`${inputClass} mt-1.5`}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Email <span className="text-[#146c45]">*</span></span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  autoComplete="email"
                  className={`${inputClass} mt-1.5`}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Phone</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  autoComplete="tel"
                  className={`${inputClass} mt-1.5`}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Location</span>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  autoComplete="address-level2"
                  className={`${inputClass} mt-1.5`}
                />
              </label>
            </div>

            <label className="block">
              <span className={labelClass}>LinkedIn or portfolio</span>
              <input
                type="url"
                value={form.linkedin}
                onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                placeholder="https://"
                className={`${inputClass} mt-1.5`}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Resume URL</span>
              <input
                type="url"
                value={form.resumeUrl}
                onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })}
                placeholder="https://… or add a resume on your profile"
                className={`${inputClass} mt-1.5`}
              />
              <span className="mt-1.5 block text-[12px] leading-5 text-[#7a8b84]">
                Prefills from your profile. You can paste a public link instead.
              </span>
            </label>

            <label className="block">
              <span className={labelClass}>Why you are a fit <span className="text-[#146c45]">*</span></span>
              <textarea
                value={form.coverLetter}
                onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
                rows={5}
                placeholder="Share relevant experience, skills, and why this role interests you."
                className={`${inputClass} mt-1.5 min-h-32 resize-y`}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Notice period</span>
                <input
                  value={form.noticePeriod}
                  onChange={(e) => setForm({ ...form, noticePeriod: e.target.value })}
                  placeholder="Immediate / 30 days"
                  className={`${inputClass} mt-1.5`}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Expected CTC</span>
                <input
                  value={form.expectedCtc}
                  onChange={(e) => setForm({ ...form, expectedCtc: e.target.value })}
                  placeholder="e.g. 12 LPA"
                  className={`${inputClass} mt-1.5`}
                />
              </label>
            </div>

            {alertText && (
              <p id={errorId} role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
                {alertText}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-[#eef3f0] px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={requestClose}
              disabled={submitting}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-[#d5e3dc] bg-white px-5 text-[14px] font-semibold text-[#1d332a] transition duration-200 hover:border-[#b7cec3] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#146c45] px-5 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] transition duration-200 hover:bg-[#0f5a39] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Briefcase size={16} />}
              {submitting ? "Submitting…" : "Submit application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

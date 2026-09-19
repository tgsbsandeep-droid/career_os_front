import { useMemo, useState } from "react";
import {
  Award,
  BriefcaseBusiness,
  Check,
  Globe,
  GraduationCap,
  Languages,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { apiRequest } from "../services/api";
import ImageUpload from "./ImageUpload";
import { normalizeSkillName, skillKey, uniqueSkills } from "../utils/skillSuggestions";

export type TeachingEntry = {
  role: string;
  organization: string;
  years: string;
  description: string;
};

export type QualificationEntry = {
  name: string;
  issuer: string;
  year: string;
};

export type AcademyProfile = {
  display_name: string;
  headline: string;
  bio: string;
  avatar_url: string;
  location: string;
  languages: string[];
  website: string;
  linkedin_url: string;
  phone: string;
  contact_email: string;
  teaching_experience_years: string;
  preferred_teaching_mode: "" | "online" | "offline" | "hybrid";
  hourly_rate: string;
  teaching_history: TeachingEntry[];
  audiences: string[];
  expertise: string[];
  qualifications: QualificationEntry[];
};

const emptyTeaching: TeachingEntry = { role: "", organization: "", years: "", description: "" };
const emptyQualification: QualificationEntry = { name: "", issuer: "", year: "" };

export const emptyAcademyProfile: AcademyProfile = {
  display_name: "",
  headline: "",
  bio: "",
  avatar_url: "",
  location: "",
  languages: [],
  website: "",
  linkedin_url: "",
  phone: "",
  contact_email: "",
  teaching_experience_years: "",
  preferred_teaching_mode: "",
  hourly_rate: "",
  teaching_history: [{ ...emptyTeaching }],
  audiences: [],
  expertise: [],
  qualifications: [],
};

const LANGUAGE_OPTIONS = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi", "Bengali", "Gujarati", "Punjabi", "Urdu"];
const AUDIENCE_OPTIONS = ["School students", "College students", "Working professionals", "Career switchers", "Freshers", "Corporate teams", "Entrepreneurs"];
const EXPERTISE_OPTIONS = [
  "Web development", "Data science", "UI/UX design", "Cloud computing", "Digital marketing",
  "Career coaching", "Communication", "Leadership", "Finance", "Accounting", "Nursing",
  "Teaching methodology", "Interview preparation", "Product management", "Sales",
];
const TEACHING_MODES = [
  { value: "online", label: "Online" },
  { value: "offline", label: "In person" },
  { value: "hybrid", label: "Hybrid" },
] as const;

const inputClass = "w-full rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[14px] text-[#12241c] placeholder-[#7a8b84] outline-none transition focus:border-[#146c45] focus:bg-white focus:ring-2 focus:ring-[#146c45]/10";
const labelClass = "block text-[13px] font-medium text-[#3d4d46]";

function parseJsonRecord<T extends Record<string, string>>(value: string, keys: Array<keyof T>): T | null {
  try {
    const parsed = JSON.parse(value) as Partial<T>;
    if (!parsed || typeof parsed !== "object") return null;
    const record = {} as T;
    for (const key of keys) record[key] = String(parsed[key] ?? "") as T[typeof key];
    return record;
  } catch {
    return null;
  }
}

function parseTeachingHistory(values: string[] | undefined): TeachingEntry[] {
  const entries = (values ?? []).map((value) => {
    const parsed = parseJsonRecord<TeachingEntry>(value, ["role", "organization", "years", "description"]);
    if (parsed) return parsed;
    return { ...emptyTeaching, role: value };
  }).filter((entry) => entry.role || entry.organization || entry.description);
  return entries.length ? entries : [{ ...emptyTeaching }];
}

function parseQualifications(values: string[] | undefined): QualificationEntry[] {
  return (values ?? []).map((value) => {
    const parsed = parseJsonRecord<QualificationEntry>(value, ["name", "issuer", "year"]);
    if (parsed && (parsed.name || parsed.issuer)) return parsed;
    const [name, issuer] = value.split(" — ");
    return { name: name ?? value, issuer: issuer ?? "", year: "" };
  }).filter((entry) => entry.name);
}

export function academyProfileFromApi(raw: Partial<AcademyProfile> & {
  languages?: string[];
  teaching_history?: string[] | TeachingEntry[];
  audiences?: string[];
  expertise?: string[];
  qualifications?: string[] | QualificationEntry[];
  teaching_experience_years?: string | number | null;
  hourly_rate?: string | number | null;
  preferred_teaching_mode?: string | null;
} | null): AcademyProfile {
  if (!raw) return { ...emptyAcademyProfile };
  const history = Array.isArray(raw.teaching_history)
    ? raw.teaching_history.every((item) => typeof item === "string")
      ? parseTeachingHistory(raw.teaching_history as string[])
      : (raw.teaching_history as TeachingEntry[]).length
        ? (raw.teaching_history as TeachingEntry[])
        : [{ ...emptyTeaching }]
    : [{ ...emptyTeaching }];
  const qualifications = Array.isArray(raw.qualifications)
    ? raw.qualifications.every((item) => typeof item === "string")
      ? parseQualifications(raw.qualifications as string[])
      : (raw.qualifications as QualificationEntry[])
    : [];
  const mode = String(raw.preferred_teaching_mode ?? "");
  return {
    ...emptyAcademyProfile,
    display_name: raw.display_name ?? "",
    headline: raw.headline ?? "",
    bio: raw.bio ?? "",
    avatar_url: raw.avatar_url ?? "",
    location: raw.location ?? "",
    languages: uniqueSkills(raw.languages ?? []),
    website: raw.website ?? "",
    linkedin_url: raw.linkedin_url ?? "",
    phone: raw.phone ?? "",
    contact_email: raw.contact_email ?? "",
    teaching_experience_years: raw.teaching_experience_years == null ? "" : String(raw.teaching_experience_years),
    preferred_teaching_mode: mode === "online" || mode === "offline" || mode === "hybrid" ? mode : "",
    hourly_rate: raw.hourly_rate == null ? "" : String(raw.hourly_rate),
    teaching_history: history,
    audiences: uniqueSkills(raw.audiences ?? []),
    expertise: uniqueSkills(raw.expertise ?? []),
    qualifications,
  };
}

function ChipPicker({
  options,
  selected,
  onToggle,
  customValue,
  onCustomChange,
  onAddCustom,
  placeholder,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  customValue: string;
  onCustomChange: (value: string) => void;
  onAddCustom: () => void;
  placeholder: string;
}) {
  const pool = uniqueSkills([...options, ...selected]);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {pool.map((item) => {
          const active = selected.some((value) => skillKey(value) === skillKey(item));
          return (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
                active
                  ? "border-[#146c45] bg-[#146c45] text-white"
                  : "border-[#e4eee9] bg-[#f7fbf9] text-[#5b6b64] hover:border-[#cfe6db] hover:bg-[#eaf6f0] hover:text-[#146c45]"
              }`}
            >
              {active && <Check size={12} />}
              {item}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={customValue}
          onChange={(event) => onCustomChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAddCustom();
            }
          }}
          placeholder={placeholder}
          className={`${inputClass} flex-1`}
        />
        <button
          type="button"
          onClick={onAddCustom}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-2.5 text-[13px] font-medium text-[#3d4d46] hover:border-[#cfe6db] hover:bg-[#eaf6f0]"
        >
          <Plus size={15} />
          Add
        </button>
      </div>
    </div>
  );
}

function Section({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf6f0] text-[#146c45]">
          {icon}
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">{title}</h2>
          <p className="text-[12px] text-[#5b6b64]">{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function TutorProfileForm({
  userId,
  profile,
  onChange,
  onMessage,
}: {
  userId: string;
  profile: AcademyProfile;
  onChange: (profile: AcademyProfile) => void;
  onMessage: (message: string, type?: "success" | "error") => void;
}) {
  const [saving, setSaving] = useState(false);
  const [languageDraft, setLanguageDraft] = useState("");
  const [audienceDraft, setAudienceDraft] = useState("");
  const [expertiseDraft, setExpertiseDraft] = useState("");
  const [newQualification, setNewQualification] = useState<QualificationEntry>({ ...emptyQualification });

  const completeness = useMemo(() => {
    const checks = [
      Boolean(profile.display_name.trim()),
      Boolean(profile.headline.trim()),
      Boolean(profile.bio.trim()),
      Boolean(profile.avatar_url),
      Boolean(profile.location.trim()),
      profile.languages.length > 0,
      Boolean(profile.preferred_teaching_mode),
      Boolean(profile.teaching_experience_years),
      profile.expertise.length > 0,
      profile.qualifications.length > 0,
      profile.teaching_history.some((entry) => entry.role || entry.organization),
    ];
    const done = checks.filter(Boolean).length;
    return { done, total: checks.length, percent: Math.round((done / checks.length) * 100) };
  }, [profile]);

  function patch(partial: Partial<AcademyProfile>) {
    onChange({ ...profile, ...partial });
  }

  function toggleList(field: "languages" | "audiences" | "expertise", value: string) {
    const current = profile[field];
    const next = current.some((item) => skillKey(item) === skillKey(value))
      ? current.filter((item) => skillKey(item) !== skillKey(value))
      : uniqueSkills([...current, value]);
    patch({ [field]: next });
  }

  function addCustom(field: "languages" | "audiences" | "expertise", draft: string, clear: () => void) {
    const value = normalizeSkillName(draft);
    if (!value) return;
    patch({ [field]: uniqueSkills([...profile[field], value]) });
    clear();
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) return;
    setSaving(true);
    try {
      const teaching_history = profile.teaching_history
        .filter((entry) => entry.role || entry.organization || entry.description)
        .map((entry) => JSON.stringify(entry));
      const qualifications = profile.qualifications
        .filter((entry) => entry.name.trim())
        .map((entry) => JSON.stringify(entry));
      await apiRequest(`/api/academies/${userId}/profile`, {
        method: "PUT",
        body: JSON.stringify({
          display_name: profile.display_name.trim(),
          headline: profile.headline.trim(),
          bio: profile.bio.trim(),
          avatar_url: profile.avatar_url || null,
          location: profile.location.trim(),
          languages: profile.languages,
          website: profile.website.trim() || null,
          linkedin_url: profile.linkedin_url.trim() || null,
          phone: profile.phone.trim(),
          contact_email: profile.contact_email.trim(),
          teaching_experience_years: profile.teaching_experience_years ? Number(profile.teaching_experience_years) : null,
          preferred_teaching_mode: profile.preferred_teaching_mode || null,
          hourly_rate: profile.hourly_rate ? Number(profile.hourly_rate) : null,
          teaching_history,
          audiences: profile.audiences,
          expertise: profile.expertise,
          qualifications,
        }),
      });
      onMessage("Academy profile saved.", "success");
    } catch (error) {
      onMessage((error as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id="academy-profile" onSubmit={(event) => void saveProfile(event)} className="scroll-mt-24 space-y-6">
      <Section icon={<UserRound size={17} />} title="Public identity" hint="This is how learners see you on courses and search.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ImageUpload userId={userId} bucket="avatars" value={profile.avatar_url} onChange={(avatar_url) => patch({ avatar_url })} label="Profile photo" />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Display name</label>
            <input value={profile.display_name} onChange={(event) => patch({ display_name: event.target.value })} placeholder="Name shown to learners" className={inputClass} required />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Headline</label>
            <input value={profile.headline} onChange={(event) => patch({ headline: event.target.value })} placeholder="e.g. Data science trainer · 8 years industry experience" className={inputClass} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label className={labelClass}>Professional bio</label>
            <textarea
              value={profile.bio}
              onChange={(event) => patch({ bio: event.target.value })}
              placeholder="Tell learners who you teach, how you teach, and the outcomes they can expect."
              className={`${inputClass} min-h-32 resize-y`}
            />
            <p className="text-[12px] text-[#7a8b84]">{profile.bio.trim().length}/800 characters recommended</p>
          </div>
          <div className="space-y-1.5">
            <label className={`${labelClass} flex items-center gap-1.5`}><MapPin size={13} /> Location</label>
            <input value={profile.location} onChange={(event) => patch({ location: event.target.value })} placeholder="City, country or Remote" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Teaching mode</label>
            <div className="flex flex-wrap gap-2">
              {TEACHING_MODES.map((mode) => {
                const active = profile.preferred_teaching_mode === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => patch({ preferred_teaching_mode: active ? "" : mode.value })}
                    className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
                      active
                        ? "border-[#146c45] bg-[#146c45] text-white"
                        : "border-[#e4eee9] bg-[#f7fbf9] text-[#5b6b64] hover:border-[#cfe6db]"
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      <Section icon={<Mail size={17} />} title="Contact" hint="Optional details for learners and CareerOS support.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={`${labelClass} flex items-center gap-1.5`}><Mail size={13} /> Contact email</label>
            <input type="email" value={profile.contact_email} onChange={(event) => patch({ contact_email: event.target.value })} placeholder="you@academy.com" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className={`${labelClass} flex items-center gap-1.5`}><Phone size={13} /> Phone</label>
            <input value={profile.phone} onChange={(event) => patch({ phone: event.target.value })} placeholder="+91 98765 43210" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className={`${labelClass} flex items-center gap-1.5`}><Globe size={13} /> Website</label>
            <input type="url" value={profile.website} onChange={(event) => patch({ website: event.target.value })} placeholder="https://youracademy.com" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>LinkedIn</label>
            <input type="url" value={profile.linkedin_url} onChange={(event) => patch({ linkedin_url: event.target.value })} placeholder="https://linkedin.com/in/yourname" className={inputClass} />
          </div>
        </div>
      </Section>

      <Section icon={<Sparkles size={17} />} title="Teaching practice" hint="Help learners understand your experience and who you work with.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelClass}>Years teaching</label>
            <input type="number" min="0" max="60" value={profile.teaching_experience_years} onChange={(event) => patch({ teaching_experience_years: event.target.value })} placeholder="e.g. 6" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Indicative hourly rate (optional)</label>
            <input type="number" min="0" value={profile.hourly_rate} onChange={(event) => patch({ hourly_rate: event.target.value })} placeholder="INR / hour" className={inputClass} />
          </div>
        </div>
        <div className="mt-5 space-y-1.5">
          <label className={`${labelClass} flex items-center gap-1.5`}><Languages size={13} /> Languages you teach in</label>
          <ChipPicker
            options={LANGUAGE_OPTIONS}
            selected={profile.languages}
            onToggle={(value) => toggleList("languages", value)}
            customValue={languageDraft}
            onCustomChange={setLanguageDraft}
            onAddCustom={() => addCustom("languages", languageDraft, () => setLanguageDraft(""))}
            placeholder="Add a language…"
          />
        </div>
        <div className="mt-5 space-y-1.5">
          <label className={labelClass}>Who you teach</label>
          <ChipPicker
            options={AUDIENCE_OPTIONS}
            selected={profile.audiences}
            onToggle={(value) => toggleList("audiences", value)}
            customValue={audienceDraft}
            onCustomChange={setAudienceDraft}
            onAddCustom={() => addCustom("audiences", audienceDraft, () => setAudienceDraft(""))}
            placeholder="Add an audience…"
          />
        </div>
      </Section>

      <Section icon={<GraduationCap size={17} />} title="Areas of expertise" hint="Pick the subjects you actually teach. Add any extra skill.">
        <ChipPicker
          options={EXPERTISE_OPTIONS}
          selected={profile.expertise}
          onToggle={(value) => toggleList("expertise", value)}
          customValue={expertiseDraft}
          onCustomChange={setExpertiseDraft}
          onAddCustom={() => addCustom("expertise", expertiseDraft, () => setExpertiseDraft(""))}
          placeholder="Add an expertise…"
        />
      </Section>

      <Section icon={<BriefcaseBusiness size={17} />} title="Teaching history" hint="Institutes, academies, or corporate programmes you have taught.">
        <div className="space-y-4">
          {profile.teaching_history.map((entry, index) => (
            <div key={index} className="space-y-3 rounded-xl border border-[#eef3f0] bg-[#f7fbf9] p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a8b84]">Role {index + 1}</p>
                {profile.teaching_history.length > 1 && (
                  <button
                    type="button"
                    onClick={() => patch({ teaching_history: profile.teaching_history.filter((_, itemIndex) => itemIndex !== index) })}
                    className="flex items-center gap-1 text-[12px] font-medium text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={entry.role} onChange={(event) => patch({ teaching_history: profile.teaching_history.map((item, itemIndex) => itemIndex === index ? { ...item, role: event.target.value } : item) })} placeholder="Role / programme" className={inputClass} />
                <input value={entry.organization} onChange={(event) => patch({ teaching_history: profile.teaching_history.map((item, itemIndex) => itemIndex === index ? { ...item, organization: event.target.value } : item) })} placeholder="Organisation" className={inputClass} />
                <input value={entry.years} onChange={(event) => patch({ teaching_history: profile.teaching_history.map((item, itemIndex) => itemIndex === index ? { ...item, years: event.target.value } : item) })} placeholder="Years, e.g. 2019–2023" className={inputClass} />
              </div>
              <textarea
                value={entry.description}
                onChange={(event) => patch({ teaching_history: profile.teaching_history.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item) })}
                placeholder="What you taught and the outcomes for learners…"
                className={`${inputClass} min-h-20 resize-y`}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => patch({ teaching_history: [...profile.teaching_history, { ...emptyTeaching }] })}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#cfe6db] px-4 py-3 text-[13px] font-medium text-[#5b6b64] transition hover:border-[#146c45] hover:text-[#146c45]"
        >
          <Plus size={16} />
          Add another teaching role
        </button>
      </Section>

      <Section icon={<Award size={17} />} title="Qualifications" hint="Degrees, certifications, and teaching credentials.">
        {profile.qualifications.length > 0 && (
          <div className="mb-4 space-y-2">
            {profile.qualifications.map((entry, index) => (
              <div key={`${entry.name}-${index}`} className="flex items-center justify-between rounded-xl border border-[#eef3f0] bg-[#f7fbf9] px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-[#12241c]">{entry.name}</p>
                  <p className="text-[12px] text-[#5b6b64]">{[entry.issuer, entry.year].filter(Boolean).join(" · ")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => patch({ qualifications: profile.qualifications.filter((_, itemIndex) => itemIndex !== index) })}
                  className="text-[#c9d6cf] transition hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-3 rounded-xl border border-dashed border-[#cfe6db] bg-[#f7fbf9] p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#5b6b64]">Add qualification</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <input value={newQualification.name} onChange={(event) => setNewQualification((curr) => ({ ...curr, name: event.target.value }))} placeholder="Qualification name *" className={inputClass} />
            <input value={newQualification.issuer} onChange={(event) => setNewQualification((curr) => ({ ...curr, issuer: event.target.value }))} placeholder="Issuing organisation" className={inputClass} />
            <input value={newQualification.year} onChange={(event) => setNewQualification((curr) => ({ ...curr, year: event.target.value }))} placeholder="Year" className={inputClass} />
          </div>
          <button
            type="button"
            disabled={!newQualification.name.trim()}
            onClick={() => {
              if (!newQualification.name.trim()) return;
              patch({ qualifications: [...profile.qualifications, newQualification] });
              setNewQualification({ ...emptyQualification });
            }}
            className="flex items-center gap-2 rounded-xl border border-[#cfe6db] bg-white px-4 py-2.5 text-[13px] font-medium text-[#146c45] transition hover:bg-[#eaf6f0] disabled:opacity-40"
          >
            <Plus size={15} /> Add qualification
          </button>
        </div>
      </Section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-[#5b6b64]">Profile completeness {completeness.percent}% · {completeness.done}/{completeness.total} sections filled</p>
        <button
          type="submit"
          disabled={saving || !userId}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#146c45] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] transition hover:bg-[#0f5a39] disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}

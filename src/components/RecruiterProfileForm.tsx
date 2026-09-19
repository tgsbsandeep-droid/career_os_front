import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Check,
  Globe,
  Heart,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { apiRequest } from "../services/api";
import ImageUpload from "./ImageUpload";
import { normalizeSkillName, skillKey, uniqueSkills } from "../utils/skillSuggestions";

export type RecruiterProfile = {
  company_name: string;
  headline: string;
  bio: string;
  avatar_url: string;
  location: string;
  industry: string;
  company_size: "" | "startup" | "small" | "medium" | "large" | "enterprise";
  founded_year: string;
  website: string;
  linkedin_url: string;
  phone: string;
  contact_email: string;
  hiring_roles: string[];
  work_modes: string[];
  benefits: string[];
  culture_values: string[];
};

export const emptyRecruiterProfile: RecruiterProfile = {
  company_name: "",
  headline: "",
  bio: "",
  avatar_url: "",
  location: "",
  industry: "",
  company_size: "",
  founded_year: "",
  website: "",
  linkedin_url: "",
  phone: "",
  contact_email: "",
  hiring_roles: [],
  work_modes: [],
  benefits: [],
  culture_values: [],
};

const INDUSTRY_OPTIONS = [
  "Technology", "Healthcare", "Finance", "Education", "Manufacturing", "Retail",
  "Consulting", "Media", "Logistics", "Energy", "Government", "Nonprofit",
];
const COMPANY_SIZES = [
  { value: "startup", label: "1–10" },
  { value: "small", label: "11–50" },
  { value: "medium", label: "51–200" },
  { value: "large", label: "201–1,000" },
  { value: "enterprise", label: "1,000+" },
] as const;
const WORK_MODE_OPTIONS = ["Remote", "Hybrid", "On-site"];
const HIRING_ROLE_OPTIONS = [
  "Software engineering", "Product", "Design", "Data", "Sales", "Marketing",
  "Operations", "People / HR", "Finance", "Customer success", "Interns",
];
const BENEFIT_OPTIONS = [
  "Health insurance", "Remote work", "Flexible hours", "Learning budget",
  "Equity", "Parental leave", "Wellness", "Relocation",
];
const CULTURE_OPTIONS = [
  "Inclusive", "Fast-paced", "Collaborative", "Mentorship",
  "Work-life balance", "Innovation", "Ownership", "Customer-first",
];

const inputClass = "w-full rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[14px] text-[#12241c] placeholder-[#7a8b84] outline-none transition focus:border-[#146c45] focus:bg-white focus:ring-2 focus:ring-[#146c45]/10";
const labelClass = "block text-[13px] font-medium text-[#3d4d46]";

function asCompanySize(value: unknown): RecruiterProfile["company_size"] {
  const size = String(value ?? "");
  return size === "startup" || size === "small" || size === "medium" || size === "large" || size === "enterprise"
    ? size
    : "";
}

export function recruiterProfileFromApi(raw: Partial<RecruiterProfile> & {
  company_description?: string | null;
  avatar_url?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  company_size?: string | null;
  founded_year?: string | number | null;
  hiring_roles?: string[] | null;
  work_modes?: string[] | null;
  benefits?: string[] | null;
  culture_values?: string[] | null;
} | null): RecruiterProfile {
  if (!raw) return { ...emptyRecruiterProfile };
  return {
    ...emptyRecruiterProfile,
    company_name: raw.company_name ?? "",
    headline: raw.headline ?? "",
    bio: raw.bio ?? raw.company_description ?? "",
    avatar_url: raw.avatar_url ?? "",
    location: raw.location ?? "",
    industry: raw.industry ?? "",
    company_size: asCompanySize(raw.company_size),
    founded_year: raw.founded_year == null ? "" : String(raw.founded_year),
    website: raw.website ?? "",
    linkedin_url: raw.linkedin_url ?? "",
    phone: raw.phone ?? "",
    contact_email: raw.contact_email ?? "",
    hiring_roles: uniqueSkills(raw.hiring_roles ?? []),
    work_modes: uniqueSkills(raw.work_modes ?? []),
    benefits: uniqueSkills(raw.benefits ?? []),
    culture_values: uniqueSkills(raw.culture_values ?? []),
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

export default function RecruiterProfileForm({
  userId,
  profile,
  onChange,
  onMessage,
}: {
  userId: string;
  profile: RecruiterProfile;
  onChange: (profile: RecruiterProfile) => void;
  onMessage: (message: string, type?: "success" | "error") => void;
}) {
  const [saving, setSaving] = useState(false);
  const [industryDraft, setIndustryDraft] = useState("");
  const [roleDraft, setRoleDraft] = useState("");
  const [modeDraft, setModeDraft] = useState("");
  const [benefitDraft, setBenefitDraft] = useState("");
  const [cultureDraft, setCultureDraft] = useState("");

  const completeness = useMemo(() => {
    const checks = [
      Boolean(profile.company_name.trim()),
      Boolean(profile.headline.trim()),
      Boolean(profile.bio.trim()),
      Boolean(profile.avatar_url),
      Boolean(profile.location.trim()),
      Boolean(profile.industry.trim()),
      Boolean(profile.company_size),
      Boolean(profile.website.trim() || profile.linkedin_url.trim()),
      profile.hiring_roles.length > 0,
      profile.work_modes.length > 0,
      profile.benefits.length > 0,
    ];
    const done = checks.filter(Boolean).length;
    return { done, total: checks.length, percent: Math.round((done / checks.length) * 100) };
  }, [profile]);

  function patch(partial: Partial<RecruiterProfile>) {
    onChange({ ...profile, ...partial });
  }

  function toggleList(field: "hiring_roles" | "work_modes" | "benefits" | "culture_values", value: string) {
    const current = profile[field];
    const next = current.some((item) => skillKey(item) === skillKey(value))
      ? current.filter((item) => skillKey(item) !== skillKey(value))
      : uniqueSkills([...current, value]);
    patch({ [field]: next });
  }

  function addCustom(field: "hiring_roles" | "work_modes" | "benefits" | "culture_values", draft: string, clear: () => void) {
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
      await apiRequest(`/api/recruiters/${userId}/profile`, {
        method: "PUT",
        body: JSON.stringify({
          company_name: profile.company_name.trim(),
          headline: profile.headline.trim(),
          bio: profile.bio.trim(),
          avatar_url: profile.avatar_url || null,
          location: profile.location.trim(),
          industry: profile.industry.trim() || industryDraft.trim() || null,
          company_size: profile.company_size || null,
          founded_year: profile.founded_year ? Number(profile.founded_year) : null,
          website: profile.website.trim() || null,
          linkedin_url: profile.linkedin_url.trim() || null,
          phone: profile.phone.trim(),
          contact_email: profile.contact_email.trim(),
          hiring_roles: profile.hiring_roles,
          work_modes: profile.work_modes,
          benefits: profile.benefits,
          culture_values: profile.culture_values,
        }),
      });
      if (industryDraft.trim() && !profile.industry) {
        patch({ industry: normalizeSkillName(industryDraft) });
        setIndustryDraft("");
      }
      onMessage("Company profile saved.", "success");
    } catch (error) {
      onMessage((error as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id="recruiter-profile" onSubmit={(event) => void saveProfile(event)} className="scroll-mt-24 space-y-6">
      <Section icon={<UserRound size={17} />} title="Public identity" hint="This is how candidates see your company on jobs and invites.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ImageUpload userId={userId} bucket="avatars" value={profile.avatar_url} onChange={(avatar_url) => patch({ avatar_url })} label="Company logo" />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Company name</label>
            <input value={profile.company_name} onChange={(event) => patch({ company_name: event.target.value })} placeholder="Name shown on job posts" className={inputClass} required />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Headline</label>
            <input value={profile.headline} onChange={(event) => patch({ headline: event.target.value })} placeholder="e.g. Product studio hiring across India" className={inputClass} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label className={labelClass}>Company bio</label>
            <textarea
              value={profile.bio}
              onChange={(event) => patch({ bio: event.target.value })}
              placeholder="Tell candidates what you build, who you hire, and why people stay."
              className={`${inputClass} min-h-32 resize-y`}
            />
            <p className="text-[12px] text-[#7a8b84]">{profile.bio.trim().length}/800 characters recommended</p>
          </div>
          <div className="space-y-1.5">
            <label className={`${labelClass} flex items-center gap-1.5`}><MapPin size={13} /> Location</label>
            <input value={profile.location} onChange={(event) => patch({ location: event.target.value })} placeholder="City, country or Remote" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Company size</label>
            <div className="flex flex-wrap gap-2">
              {COMPANY_SIZES.map((size) => {
                const active = profile.company_size === size.value;
                return (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => patch({ company_size: active ? "" : size.value })}
                    className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
                      active
                        ? "border-[#146c45] bg-[#146c45] text-white"
                        : "border-[#e4eee9] bg-[#f7fbf9] text-[#5b6b64] hover:border-[#cfe6db]"
                    }`}
                  >
                    {size.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Industry</label>
            <div className="flex flex-wrap gap-2">
              {uniqueSkills([...INDUSTRY_OPTIONS, profile.industry]).filter(Boolean).map((item) => {
                const active = skillKey(profile.industry) === skillKey(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => patch({ industry: active ? "" : item })}
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
                value={industryDraft}
                onChange={(event) => setIndustryDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    const value = normalizeSkillName(industryDraft);
                    if (!value) return;
                    patch({ industry: value });
                    setIndustryDraft("");
                  }
                }}
                placeholder="Add an industry…"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => {
                  const value = normalizeSkillName(industryDraft);
                  if (!value) return;
                  patch({ industry: value });
                  setIndustryDraft("");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-2.5 text-[13px] font-medium text-[#3d4d46] hover:border-[#cfe6db] hover:bg-[#eaf6f0]"
              >
                <Plus size={15} />
                Add
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Founded year</label>
            <input type="number" min="1800" max="2100" value={profile.founded_year} onChange={(event) => patch({ founded_year: event.target.value })} placeholder="e.g. 2018" className={inputClass} />
          </div>
        </div>
      </Section>

      <Section icon={<Mail size={17} />} title="Contact" hint="Optional details for candidates and CareerOS support.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={`${labelClass} flex items-center gap-1.5`}><Mail size={13} /> Hiring email</label>
            <input type="email" value={profile.contact_email} onChange={(event) => patch({ contact_email: event.target.value })} placeholder="jobs@company.com" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className={`${labelClass} flex items-center gap-1.5`}><Phone size={13} /> Phone</label>
            <input value={profile.phone} onChange={(event) => patch({ phone: event.target.value })} placeholder="+91 98765 43210" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className={`${labelClass} flex items-center gap-1.5`}><Globe size={13} /> Website</label>
            <input type="url" value={profile.website} onChange={(event) => patch({ website: event.target.value })} placeholder="https://company.com" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>LinkedIn</label>
            <input type="url" value={profile.linkedin_url} onChange={(event) => patch({ linkedin_url: event.target.value })} placeholder="https://linkedin.com/company/yourco" className={inputClass} />
          </div>
        </div>
      </Section>

      <Section icon={<BriefcaseBusiness size={17} />} title="Hiring focus" hint="Help candidates understand the roles and ways of working you hire for.">
        <div className="space-y-1.5">
          <label className={`${labelClass} flex items-center gap-1.5`}><Users size={13} /> Roles you hire</label>
          <ChipPicker
            options={HIRING_ROLE_OPTIONS}
            selected={profile.hiring_roles}
            onToggle={(value) => toggleList("hiring_roles", value)}
            customValue={roleDraft}
            onCustomChange={setRoleDraft}
            onAddCustom={() => addCustom("hiring_roles", roleDraft, () => setRoleDraft(""))}
            placeholder="Add a role family…"
          />
        </div>
        <div className="mt-5 space-y-1.5">
          <label className={labelClass}>Work modes</label>
          <ChipPicker
            options={WORK_MODE_OPTIONS}
            selected={profile.work_modes}
            onToggle={(value) => toggleList("work_modes", value)}
            customValue={modeDraft}
            onCustomChange={setModeDraft}
            onAddCustom={() => addCustom("work_modes", modeDraft, () => setModeDraft(""))}
            placeholder="Add a work mode…"
          />
        </div>
      </Section>

      <Section icon={<Heart size={17} />} title="Culture and benefits" hint="What candidates can expect beyond the job description.">
        <div className="space-y-1.5">
          <label className={`${labelClass} flex items-center gap-1.5`}><Sparkles size={13} /> Culture</label>
          <ChipPicker
            options={CULTURE_OPTIONS}
            selected={profile.culture_values}
            onToggle={(value) => toggleList("culture_values", value)}
            customValue={cultureDraft}
            onCustomChange={setCultureDraft}
            onAddCustom={() => addCustom("culture_values", cultureDraft, () => setCultureDraft(""))}
            placeholder="Add a culture value…"
          />
        </div>
        <div className="mt-5 space-y-1.5">
          <label className={labelClass}>Benefits</label>
          <ChipPicker
            options={BENEFIT_OPTIONS}
            selected={profile.benefits}
            onToggle={(value) => toggleList("benefits", value)}
            customValue={benefitDraft}
            onCustomChange={setBenefitDraft}
            onAddCustom={() => addCustom("benefits", benefitDraft, () => setBenefitDraft(""))}
            placeholder="Add a benefit…"
          />
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

export const recruiterProfileChecklist = (profile: RecruiterProfile) => [
  { done: Boolean(profile.company_name.trim()), text: "Company name" },
  { done: Boolean(profile.headline.trim()), text: "Headline" },
  { done: Boolean(profile.bio.trim()), text: "Company bio" },
  { done: Boolean(profile.avatar_url), text: "Company logo" },
  { done: Boolean(profile.location.trim()), text: "Location" },
  { done: Boolean(profile.industry.trim()), text: "Industry" },
  { done: Boolean(profile.company_size), text: "Company size" },
  { done: Boolean(profile.website.trim() || profile.linkedin_url.trim()), text: "Website or LinkedIn" },
  { done: profile.hiring_roles.length > 0, text: "Roles you hire" },
  { done: profile.work_modes.length > 0, text: "Work modes" },
  { done: profile.benefits.length > 0, text: "Benefits" },
];

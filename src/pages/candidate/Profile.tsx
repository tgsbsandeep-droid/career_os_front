import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  BriefcaseBusiness,
  Check,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  UserRound,
  Loader2,
  Trash2,
  Upload,
  FileText,
  CheckCircle2,
  Globe,
  Link2,
  AtSign,
  Award,
  ExternalLink,
  Sparkles,
  Video,
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest, supabase } from "../../services/api";
import ImageUpload from "../../components/ImageUpload";
import { normalizeSkillName, profileHasSkillSignal, skillKey, suggestSkillsFromProfile, uniqueSkills } from "../../utils/skillSuggestions";

const educationLevels = ["Secondary School", "Higher Secondary", "Diploma", "Graduate", "Masters", "Doctorate", "Other"];

type ExperienceEntry = {
  startMonth: string;
  endMonth: string;
  current: boolean;
  organization: string;
  role: string;
  description: string;
};

const emptyExperience: ExperienceEntry = { startMonth: "", endMonth: "", current: false, organization: "", role: "", description: "" };

function parseExperienceEntry(value: string): ExperienceEntry {
  try {
    const parsed = JSON.parse(value) as Partial<ExperienceEntry> & { date?: unknown };
    if (typeof parsed.startMonth === "string" && typeof parsed.organization === "string" && typeof parsed.role === "string") {
      return { ...emptyExperience, ...parsed, description: typeof parsed.description === "string" ? parsed.description : "" };
    }
    if (typeof parsed.date === "string" && typeof parsed.organization === "string" && typeof parsed.role === "string") {
      return { ...emptyExperience, startMonth: parsed.date.slice(0, 7), organization: parsed.organization, role: parsed.role };
    }
  } catch { /* plain text fallback */ }
  return { ...emptyExperience, role: value };
}

const inputClass = "w-full rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-3 text-[14px] text-[#12241c] placeholder-[#7a8b84] outline-none transition focus:border-[#146c45] focus:bg-white focus:ring-2 focus:ring-[#146c45]/10";
const labelClass = "block text-[13px] font-medium text-[#3d4d46]";

export default function Profile() {
  const [profileId, setProfileId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [fullName, setFullName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [education, setEducation] = useState("");
  const [educationInstitution, setEducationInstitution] = useState("");
  const [educationField, setEducationField] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [experience, setExperience] = useState<ExperienceEntry[]>([{ ...emptyExperience }]);
  const [resumeUrl, setResumeUrl] = useState("");
  // Portfolio & social links
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  // Certificate wallet
  type Certificate = { name: string; issuer: string; date: string; url: string };
  type EnrolledCourse = {
    id: string;
    course_id: string;
    progress?: number;
    progress_pct?: number;
    payment_status?: string | null;
    access_granted?: boolean;
    payment_required?: boolean;
    courses?: {
      title?: string;
      level?: string;
      provider?: string;
      price?: number;
      is_free?: boolean;
      delivery_type?: string;
    } | null;
  };
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [newCert, setNewCert] = useState<Certificate>({ name: "", issuer: "", date: "", url: "" });
  const [aiSkills, setAiSkills] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const profileSkillContext = useMemo(
    () => ({
      education,
      educationField,
      educationInstitution,
      experience,
      certificates,
    }),
    [education, educationField, educationInstitution, experience, certificates],
  );
  const localSkillSuggestions = useMemo(() => suggestSkillsFromProfile(profileSkillContext), [profileSkillContext]);
  const hasSkillSignal = profileHasSkillSignal(profileSkillContext) || Boolean(resumeUrl);
  const suggestionPool = useMemo(
    () => uniqueSkills([...localSkillSuggestions, ...aiSkills, ...skills]),
    [localSkillSuggestions, aiSkills, skills],
  );
  const unselectedSuggestions = useMemo(
    () => suggestionPool.filter((skill) => !skills.some((item) => skillKey(item) === skillKey(skill))),
    [suggestionPool, skills],
  );

  async function fetchCandidateSkillSuggestions(input: {
    education: string;
    educationField: string;
    educationInstitution: string;
    experience: ExperienceEntry[];
    certificates: Certificate[];
    skills: string[];
    resumeUrl: string;
  }) {
    const hasSignal =
      profileHasSkillSignal({
        education: input.education,
        educationField: input.educationField,
        educationInstitution: input.educationInstitution,
        experience: input.experience,
        certificates: input.certificates,
      }) || Boolean(input.resumeUrl);
    if (!hasSignal) {
      setAiSkills([]);
      return;
    }
    setSkillsLoading(true);
    try {
      const res = await apiRequest<{ skills?: string[] }>("/api/ai/candidate-skills", {
        method: "POST",
        body: JSON.stringify({
          education: input.education,
          education_field: input.educationField,
          education_institution: input.educationInstitution,
          experience: input.experience
            .filter((entry) => entry.role || entry.organization || entry.description)
            .map((entry) => ({
              role: entry.role,
              organization: entry.organization,
              description: entry.description,
            })),
          certificates: input.certificates.map((cert) => ({ name: cert.name, issuer: cert.issuer })),
          existing_skills: input.skills,
          resume_url: input.resumeUrl || null,
        }),
      });
      setAiSkills(uniqueSkills(res.skills ?? []));
    } catch {
      setAiSkills([]);
    } finally {
      setSkillsLoading(false);
    }
  }

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setProfileId(data.user.id);
      setFullName(data.user.user_metadata?.full_name ?? "");
      setContactEmail(data.user.email ?? "");
      void Promise.all([
        apiRequest<{ profile: { full_name?: string; avatar_url?: string; education?: string; education_institution?: string; education_field?: string; graduation_year?: string; contact_email?: string; phone?: string; location?: string; skills?: string[]; experience?: string[]; resume_url?: string; linkedin_url?: string; github_url?: string; portfolio_url?: string; website_url?: string; certificates?: string[] } | null }>(
          `/api/candidate/${data.user.id}/profile`
        ),
        apiRequest<{ enrollments: EnrolledCourse[] }>(`/api/candidate/${data.user.id}/enrollments`).catch(() => ({ enrollments: [] as EnrolledCourse[] })),
      ]).then(([{ profile }, enrollRes]) => {
        setEnrolledCourses(enrollRes.enrollments ?? []);
        if (!profile) return;
        setAvatarUrl(profile.avatar_url ?? "");
        const nextEducation = profile.education ?? "";
        const nextInstitution = profile.education_institution ?? "";
        const nextField = profile.education_field ?? "";
        const nextSkills = profile.skills ?? [];
        const nextExperience = profile.experience?.length ? profile.experience.map(parseExperienceEntry) : [{ ...emptyExperience }];
        const nextResumeUrl = profile.resume_url ?? "";
        let nextCertificates: Certificate[] = [];
        if (profile.certificates?.length) {
          try {
            nextCertificates = profile.certificates.map((c) => JSON.parse(c) as Certificate);
          } catch { /* ignore */ }
        }
        setFullName(profile.full_name ?? data.user.user_metadata?.full_name ?? "");
        setEducation(nextEducation);
        setEducationInstitution(nextInstitution);
        setEducationField(nextField);
        setGraduationYear(profile.graduation_year ?? "");
        setContactEmail(profile.contact_email ?? data.user.email ?? "");
        setPhone(profile.phone ?? "");
        setLocation(profile.location ?? "");
        setSkills(nextSkills);
        setExperience(nextExperience);
        setResumeUrl(nextResumeUrl);
        setLinkedinUrl(profile.linkedin_url ?? "");
        setGithubUrl(profile.github_url ?? "");
        setPortfolioUrl(profile.portfolio_url ?? "");
        setWebsiteUrl(profile.website_url ?? "");
        setCertificates(nextCertificates);
        void fetchCandidateSkillSuggestions({
          education: nextEducation,
          educationField: nextField,
          educationInstitution: nextInstitution,
          experience: nextExperience,
          certificates: nextCertificates,
          skills: nextSkills,
          resumeUrl: nextResumeUrl,
        });
      }).catch((err: Error) => setMessage({ text: err.message, type: "error" }))
        .finally(() => setLoading(false));
    });
  }, []);

  async function uploadResume(file: File) {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) { setMessage({ text: "Please sign in again before uploading.", type: "error" }); return; }
    setUploading(true);
    const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${userId}/${Date.now()}-${fileName}`;
    const { error } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
    if (error) { setMessage({ text: error.message, type: "error" }); setUploading(false); return; }
    const { data: publicUrlData } = supabase.storage.from("resumes").getPublicUrl(path);
    const nextResumeUrl = publicUrlData.publicUrl;
    setResumeUrl(nextResumeUrl);
    setUploading(false);
    void fetchCandidateSkillSuggestions({
      education,
      educationField,
      educationInstitution,
      experience,
      certificates,
      skills,
      resumeUrl: nextResumeUrl,
    });
  }

  function addCustomSkill() {
    const skill = normalizeSkillName(customSkill);
    if (!skill) return;
    setSkills((curr) => uniqueSkills([...curr, skill]));
    setCustomSkill("");
  }

  function toggleSkill(skill: string) {
    setSkills((curr) =>
      curr.some((item) => skillKey(item) === skillKey(skill))
        ? curr.filter((item) => skillKey(item) !== skillKey(skill))
        : uniqueSkills([...curr, skill]),
    );
  }

  async function suggestSkillsFromProfileDetails() {
    await fetchCandidateSkillSuggestions({
      education,
      educationField,
      educationInstitution,
      experience,
      certificates,
      skills,
      resumeUrl,
    });
  }

  function updateExperience(index: number, field: keyof ExperienceEntry, value: string | boolean) {
    setExperience((curr) => curr.map((entry, i) => i === index ? { ...entry, [field]: value } : entry));
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await apiRequest(`/api/candidate/${profileId}/profile`, {
        method: "PUT",
        body: JSON.stringify({
          full_name: fullName,
          avatar_url: avatarUrl || null,
          contact_email: contactEmail,
          phone,
          location,
          education,
          education_institution: educationInstitution,
          education_field: educationField,
          graduation_year: graduationYear,
          skills,
          experience: experience
            .filter((e) => e.startMonth || e.organization || e.role || e.description)
            .map((e) => JSON.stringify(e)),
          resume_url: resumeUrl || null,
          linkedin_url: linkedinUrl || null,
          github_url: githubUrl || null,
          portfolio_url: portfolioUrl || null,
          website_url: websiteUrl || null,
          certificates: certificates.map((c) => JSON.stringify(c)),
        }),
      });
      setMessage({ text: "Profile saved successfully!", type: "success" });
    } catch (err) {
      setMessage({ text: (err as Error).message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7fbf9]">
        <div className="flex items-center gap-3 text-[#5b6b64]">
          <Loader2 size={20} className="animate-spin" />
          Loading profile…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7fbf9]">
      <div className="mx-auto max-w-3xl px-5 py-8">

        {/* Back link */}
        <Link
          to="/candidate/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-[#5b6b64] hover:text-[#146c45] transition"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        <form onSubmit={(e) => void saveProfile(e)} className="space-y-6">

          {/* Header card */}
          <div className="overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0b2a1c] via-[#0f3d28] to-[#0b5c3a] p-6 text-white sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold tracking-[0.16em] text-[#2aa36a]">YOUR CAREER STORY</p>
                <h1 className="mt-2 font-[family-name:var(--font-display)] text-[26px] font-semibold leading-tight tracking-[-0.025em] sm:text-[30px]">Build a profile that gets noticed.</h1>
                <p className="mt-2 text-[14px] text-white/70">Give employers a clear picture of who you are and where you're headed.</p>
              </div>
              <div className="hidden shrink-0 rounded-xl bg-white/10 p-3 sm:block">
                <UserRound size={24} className="text-white" />
              </div>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`flex items-center gap-2 rounded-[22px] border px-4 py-3 text-[13px] font-medium ${
              message.type === "success"
                ? "border-[#cfe6db] bg-[#eaf6f0] text-[#146c45]"
                : "border-red-200 bg-red-50 text-red-700"
            }`}>
              {message.type === "success" ? <CheckCircle2 size={16} /> : null}
              {message.text}
            </div>
          )}

          {/* Contact information */}
          <section className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf6f0]">
                <UserRound size={17} className="text-[#146c45]" />
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Contact information</h2>
                <p className="text-[12px] text-[#5b6b64]">How employers can reach you.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <ImageUpload userId={profileId} bucket="avatars" value={avatarUrl} onChange={setAvatarUrl} label="Profile photo" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className={labelClass}>Full name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" required className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className={`${labelClass} flex items-center gap-1.5`}><Mail size={13} /> Email address</label>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" required className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className={`${labelClass} flex items-center gap-1.5`}><Phone size={13} /> Phone number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className={inputClass} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className={`${labelClass} flex items-center gap-1.5`}><MapPin size={13} /> Current location</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, country or Remote" className={inputClass} />
              </div>
            </div>
          </section>

          {/* Education */}
          <section className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
                <GraduationCap size={17} className="text-blue-700" />
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Education</h2>
                <p className="text-[12px] text-[#5b6b64]">Your academic background.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className={labelClass}>Highest level</label>
                <select value={education} onChange={(e) => setEducation(e.target.value)} required className={`${inputClass} cursor-pointer`}>
                  <option value="">Select level</option>
                  {educationLevels.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Institution</label>
                <input value={educationInstitution} onChange={(e) => setEducationInstitution(e.target.value)} placeholder="University or school" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Field of study</label>
                <input value={educationField} onChange={(e) => setEducationField(e.target.value)} placeholder="e.g. Computer Science" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Graduation year</label>
                <input value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} placeholder="e.g. 2025" inputMode="numeric" className={inputClass} />
              </div>
            </div>
          </section>

          {/* Skills */}
          <section className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf6f0]">
                  <Check size={17} className="text-[#146c45]" />
                </div>
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Skills</h2>
                  <p className="text-[12px] text-[#5b6b64]">Suggestions follow your education, experience, certificates, and resume.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void suggestSkillsFromProfileDetails()}
                disabled={skillsLoading || !hasSkillSignal}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf6f0] px-3 py-1.5 text-[12px] font-semibold text-[#146c45] hover:bg-[#d4ede2] disabled:opacity-50"
              >
                {skillsLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {skillsLoading ? "Suggesting…" : "Suggest from my profile"}
              </button>
            </div>

            {skills.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="inline-flex items-center gap-1.5 rounded-full border border-[#146c45] bg-[#146c45] px-3 py-1.5 text-[12px] font-medium text-white">
                    {skill}
                    <button type="button" title={`Remove ${skill}`} onClick={() => toggleSkill(skill)} className="rounded-full hover:text-[#d4ede2]">
                      <Trash2 size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <p className="mb-2 text-[12px] text-[#5b6b64]">
              {hasSkillSignal
                ? "Tap a suggested skill for your background, or type any extra skill."
                : "Add education, work experience, certificates, or a resume to see personalised suggestions."}
            </p>

            {unselectedSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {unselectedSuggestions.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#e4eee9] bg-[#f7fbf9] px-3 py-1.5 text-[12px] font-medium text-[#5b6b64] hover:border-[#cfe6db] hover:bg-[#eaf6f0] hover:text-[#146c45]"
                  >
                    <Plus size={12} />
                    {skill}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <input
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSkill(); } }}
                placeholder="Add a custom skill…"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={addCustomSkill}
                className="flex items-center gap-1.5 rounded-xl border border-[#e4eee9] bg-[#f7fbf9] px-4 py-2.5 text-[13px] font-medium text-[#3d4d46] hover:bg-[#eaf6f0] hover:border-[#cfe6db] transition"
              >
                <Plus size={15} />
                Add
              </button>
            </div>
          </section>

          {/* Experience */}
          <section className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                <BriefcaseBusiness size={17} className="text-amber-700" />
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Work experience</h2>
                <p className="text-[12px] text-[#5b6b64]">Add your most recent roles first.</p>
              </div>
            </div>

            <div className="space-y-4">
              {experience.map((entry, index) => (
                <div key={index} className="rounded-xl border border-[#eef3f0] bg-[#f7fbf9] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-[#7a8b84] uppercase tracking-wide">Experience {index + 1}</p>
                    {experience.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setExperience((curr) => curr.filter((_, i) => i !== index))}
                        className="flex items-center gap-1 text-[12px] font-medium text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[12px] font-medium text-[#5b6b64]">Start month</label>
                      <input type="month" value={entry.startMonth} onChange={(e) => updateExperience(index, "startMonth", e.target.value)} className={inputClass} required={index === 0} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[12px] font-medium text-[#5b6b64]">End month</label>
                      <input type="month" value={entry.endMonth} onChange={(e) => updateExperience(index, "endMonth", e.target.value)} className={inputClass} disabled={entry.current} required={index === 0 && !entry.current} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[12px] font-medium text-[#5b6b64]">Organisation</label>
                      <input value={entry.organization} onChange={(e) => updateExperience(index, "organization", e.target.value)} placeholder="Company name" className={inputClass} required={index === 0} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[12px] font-medium text-[#5b6b64]">Role / Job title</label>
                      <input value={entry.role} onChange={(e) => updateExperience(index, "role", e.target.value)} placeholder="e.g. Frontend Developer" className={inputClass} required={index === 0} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-[#5b6b64]">Description</label>
                    <textarea
                      value={entry.description}
                      onChange={(e) => updateExperience(index, "description", e.target.value)}
                      placeholder="Describe your responsibilities, achievements, and impact…"
                      className={`${inputClass} min-h-24 resize-y`}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-[12px] font-medium text-[#5b6b64] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={entry.current}
                      onChange={(e) => updateExperience(index, "current", e.target.checked)}
                      className="rounded border-[#cfe6db] text-[#146c45]"
                    />
                    Currently working here
                  </label>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setExperience((curr) => [...curr, { ...emptyExperience }])}
              className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-[#cfe6db] px-4 py-3 text-[13px] font-medium text-[#5b6b64] hover:border-[#146c45] hover:text-[#146c45] transition w-full justify-center"
            >
              <Plus size={16} />
              Add another experience
            </button>
          </section>

          {/* Resume */}
          <section className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef3f0]">
                <FileText size={17} className="text-[#5b6b64]" />
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Resume</h2>
                <p className="text-[12px] text-[#5b6b64]">PDF, DOC, or DOCX. Optional but recommended.</p>
              </div>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#cfe6db] bg-[#f7fbf9] p-8 text-center transition hover:border-[#146c45] hover:bg-[#eaf6f0]">
              {uploading ? (
                <Loader2 size={24} className="animate-spin text-[#146c45]" />
              ) : resumeUrl ? (
                <CheckCircle2 size={24} className="text-[#146c45]" />
              ) : (
                <Upload size={24} className="text-[#7a8b84]" />
              )}
              <div>
                <p className="text-[13px] font-medium text-[#12241c]">
                  {uploading ? "Uploading…" : resumeUrl ? "Resume uploaded" : "Click to upload resume"}
                </p>
                <p className="mt-0.5 text-[12px] text-[#7a8b84]">PDF, DOC, DOCX up to 10MB</p>
              </div>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="sr-only"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadResume(file); }}
              />
            </label>

            {resumeUrl && (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center gap-2 text-[13px] font-medium text-[#146c45] hover:underline"
              >
                <FileText size={15} />
                View uploaded resume
              </a>
            )}
          </section>

          {/* Portfolio & Social Links */}
          <section className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
                <Globe size={17} className="text-blue-700" />
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Portfolio & social links</h2>
                <p className="text-[12px] text-[#5b6b64]">Help employers find your work online.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className={`${labelClass} flex items-center gap-1.5`}><AtSign size={13} /> LinkedIn</label>
                <input type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/yourname" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className={`${labelClass} flex items-center gap-1.5`}><Link2 size={13} /> GitHub</label>
                <input type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/yourname" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className={`${labelClass} flex items-center gap-1.5`}><Globe size={13} /> Portfolio</label>
                <input type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://yourportfolio.com" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className={`${labelClass} flex items-center gap-1.5`}><Globe size={13} /> Website</label>
                <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourwebsite.com" className={inputClass} />
              </div>
            </div>
            {/* Preview links */}
            {(linkedinUrl || githubUrl || portfolioUrl || websiteUrl) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {linkedinUrl && <a href={linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[12px] font-medium text-blue-700 hover:bg-blue-100 transition"><AtSign size={12} /> LinkedIn <ExternalLink size={11} /></a>}
                {githubUrl && <a href={githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full border border-[#e4eee9] bg-[#f7fbf9] px-3 py-1.5 text-[12px] font-medium text-[#3d4d46] hover:bg-[#eaf6f0] transition"><Link2 size={12} /> GitHub <ExternalLink size={11} /></a>}
                {portfolioUrl && <a href={portfolioUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[12px] font-medium text-violet-700 hover:bg-violet-100 transition"><Globe size={12} /> Portfolio <ExternalLink size={11} /></a>}
                {websiteUrl && <a href={websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full border border-[#e4eee9] bg-[#f7fbf9] px-3 py-1.5 text-[12px] font-medium text-[#3d4d46] hover:bg-[#eaf6f0] transition"><Globe size={12} /> Website <ExternalLink size={11} /></a>}
              </div>
            )}
          </section>

          {/* Enrolled courses */}
          <section className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf6f0]">
                <BookOpen size={17} className="text-[#146c45]" />
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Enrolled courses</h2>
                <p className="text-[12px] text-[#5b6b64]">Paid and free programs you have joined, including live classes.</p>
              </div>
            </div>
            {enrolledCourses.length === 0 ? (
              <p className="text-[13px] text-[#7a8b84]">No enrolments yet. Browse courses to join a program.</p>
            ) : (
              <div className="space-y-2">
                {enrolledCourses.map((enrollment) => {
                  const course = enrollment.courses;
                  const paidCourse = course?.is_free === false && Number(course.price ?? 0) > 0;
                  const fee = paidCourse ? `₹${Number(course?.price).toLocaleString("en-IN")}` : "Free";
                  const live = course?.delivery_type === "live";
                  const accessGranted = Boolean(enrollment.access_granted ?? (enrollment.payment_required !== true && enrollment.payment_status !== "unpaid"));
                  const paymentRequired = Boolean(enrollment.payment_required) || (paidCourse && !accessGranted);
                  return (
                    <Link
                      key={enrollment.id}
                      to={`/candidate/courses/${enrollment.course_id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#eef3f0] bg-[#f7fbf9] px-4 py-3 hover:border-[#cfe6db] hover:bg-[#eaf6f0] transition"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[#12241c]">{course?.title || "Course"}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-[#5b6b64]">
                          {live && <span className="inline-flex items-center gap-1 text-[#146c45]"><Video size={12} /> Live class</span>}
                          {course?.provider && <span>{course.provider}</span>}
                          {course?.level && <span>{course.level}</span>}
                          {paymentRequired
                            ? <span className="font-semibold text-amber-700">Fee unpaid</span>
                            : <span>{enrollment.progress_pct ?? enrollment.progress ?? 0}% complete</span>}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[13px] font-semibold ${paymentRequired ? "text-amber-700" : paidCourse ? "text-[#12241c]" : "text-[#146c45]"}`}>
                        {paymentRequired ? `Pay ${fee}` : fee}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Certificate Wallet */}
          <section className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                <Award size={17} className="text-amber-700" />
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[#12241c]">Certificate wallet</h2>
                <p className="text-[12px] text-[#5b6b64]">Add certifications, courses, and achievements.</p>
              </div>
            </div>

            {/* Existing certificates */}
            {certificates.length > 0 && (
              <div className="mb-4 space-y-2">
                {certificates.map((cert, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-[#eef3f0] bg-[#f7fbf9] px-4 py-3">
                    <div>
                      <p className="text-[13px] font-semibold text-[#12241c]">{cert.name}</p>
                      <p className="text-[12px] text-[#5b6b64]">{cert.issuer}{cert.date ? ` · ${cert.date}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {cert.url && (
                        <a href={cert.url} target="_blank" rel="noreferrer" className="text-[#146c45] hover:underline">
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button type="button" onClick={() => setCertificates((curr) => curr.filter((_, i) => i !== idx))} className="text-[#c9d6cf] hover:text-red-500 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new certificate */}
            <div className="rounded-xl border border-dashed border-[#cfe6db] bg-[#f7fbf9] p-4 space-y-3">
              <p className="text-[12px] font-semibold text-[#5b6b64] uppercase tracking-wide">Add certificate</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={newCert.name} onChange={(e) => setNewCert((c) => ({ ...c, name: e.target.value }))} placeholder="Certificate name *" className={inputClass} />
                <input value={newCert.issuer} onChange={(e) => setNewCert((c) => ({ ...c, issuer: e.target.value }))} placeholder="Issuing organisation" className={inputClass} />
                <input type="month" value={newCert.date} onChange={(e) => setNewCert((c) => ({ ...c, date: e.target.value }))} className={inputClass} />
                <input type="url" value={newCert.url} onChange={(e) => setNewCert((c) => ({ ...c, url: e.target.value }))} placeholder="Certificate URL (optional)" className={inputClass} />
              </div>
              <button
                type="button"
                disabled={!newCert.name.trim()}
                onClick={() => {
                  if (!newCert.name.trim()) return;
                  setCertificates((curr) => [...curr, newCert]);
                  setNewCert({ name: "", issuer: "", date: "", url: "" });
                }}
                className="flex items-center gap-2 rounded-xl border border-[#cfe6db] bg-white px-4 py-2.5 text-[13px] font-medium text-[#146c45] hover:bg-[#eaf6f0] transition disabled:opacity-40"
              >
                <Plus size={15} /> Add certificate
              </button>
            </div>
          </section>

          {/* Save button */}
          <button
            type="submit"
            disabled={saving || !profileId}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#146c45] px-5 py-4 text-[15px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)] transition hover:bg-[#0f5a39] disabled:opacity-60"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? "Saving…" : "Save profile"}
          </button>

        </form>
      </div>
    </main>
  );
}

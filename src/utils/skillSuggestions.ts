/**
 * Shared skill-suggestion utilities used across candidate, recruiter, and academy pages.
 */

// ── Normalisation helpers ────────────────────────────────────────────────────

export function normalizeSkillName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function skillKey(value: string): string {
  return normalizeSkillName(value).toLowerCase();
}

export function uniqueSkills(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const skill = normalizeSkillName(raw);
    if (!skill) continue;
    const key = skillKey(skill);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(skill);
  }
  return result;
}

// ── Profile-based local skill suggestions ───────────────────────────────────

const FIELD_SKILL_MAP: Record<string, string[]> = {
  "computer science": ["Python", "JavaScript", "Data Structures", "Algorithms", "SQL", "Git"],
  "information technology": ["Networking", "Linux", "SQL", "Python", "Cybersecurity", "Cloud Computing"],
  "software engineering": ["Java", "Python", "React", "Node.js", "SQL", "Git", "REST APIs"],
  "data science": ["Python", "Machine Learning", "SQL", "Statistics", "Pandas", "TensorFlow"],
  "mechanical engineering": ["AutoCAD", "SolidWorks", "MATLAB", "Thermodynamics", "Manufacturing"],
  "electrical engineering": ["Circuit Design", "MATLAB", "PLC", "Embedded Systems", "AutoCAD Electrical"],
  "civil engineering": ["AutoCAD", "Structural Analysis", "Project Management", "Revit", "STAAD Pro"],
  "business administration": ["Excel", "Financial Analysis", "Project Management", "Communication", "Leadership"],
  "marketing": ["SEO", "Google Analytics", "Social Media Marketing", "Content Writing", "Email Marketing"],
  "finance": ["Financial Modeling", "Excel", "Accounting", "Risk Management", "Bloomberg"],
  "human resources": ["Recruitment", "HRMS", "Employee Relations", "Payroll", "Training & Development"],
  "design": ["Figma", "Adobe Photoshop", "Illustrator", "UI/UX Design", "Canva"],
  "graphic design": ["Adobe Photoshop", "Illustrator", "InDesign", "Figma", "Typography"],
  "nursing": ["Patient Care", "Clinical Skills", "Medical Terminology", "EMR", "BLS/CPR"],
  "medicine": ["Clinical Diagnosis", "Patient Management", "Medical Research", "EMR", "BLS/CPR"],
  "law": ["Legal Research", "Contract Drafting", "Litigation", "Legal Writing", "Compliance"],
  "education": ["Curriculum Development", "Classroom Management", "E-learning", "Assessment Design"],
  "psychology": ["Counseling", "Research Methods", "SPSS", "Behavioral Analysis", "Report Writing"],
  "journalism": ["Content Writing", "Editing", "Research", "Social Media", "Video Production"],
  "architecture": ["AutoCAD", "Revit", "SketchUp", "3ds Max", "Urban Planning"],
};

const ROLE_SKILL_MAP: Record<string, string[]> = {
  developer: ["JavaScript", "Python", "Git", "REST APIs", "SQL"],
  engineer: ["Problem Solving", "System Design", "Git", "Agile", "Documentation"],
  designer: ["Figma", "Adobe XD", "UI/UX Design", "Prototyping", "User Research"],
  manager: ["Project Management", "Leadership", "Communication", "Agile", "Stakeholder Management"],
  analyst: ["Excel", "SQL", "Data Analysis", "Reporting", "Problem Solving"],
  teacher: ["Curriculum Development", "Classroom Management", "Communication", "Assessment"],
  nurse: ["Patient Care", "Clinical Skills", "Medical Terminology", "BLS/CPR"],
  accountant: ["Accounting", "Excel", "Tally", "Financial Reporting", "GST"],
  sales: ["CRM", "Negotiation", "Communication", "Lead Generation", "Customer Service"],
  marketing: ["SEO", "Social Media", "Content Writing", "Google Analytics", "Email Marketing"],
};

export interface ProfileSkillContext {
  education?: string;
  education_field?: string;
  experience?: Array<{ role?: string; organization?: string; description?: string }>;
  certificates?: Array<{ name?: string; issuer?: string }>;
}

export function profileHasSkillSignal(ctx: ProfileSkillContext): boolean {
  return (
    Boolean(ctx.education_field?.trim()) ||
    Boolean(ctx.education?.trim()) ||
    (ctx.experience ?? []).some((e) => e.role?.trim() || e.organization?.trim() || e.description?.trim()) ||
    (ctx.certificates ?? []).some((c) => c.name?.trim())
  );
}

export function suggestSkillsFromProfile(ctx: ProfileSkillContext): string[] {
  const suggestions: string[] = [];

  // From field of study
  const field = (ctx.education_field ?? "").toLowerCase();
  for (const [key, skills] of Object.entries(FIELD_SKILL_MAP)) {
    if (field.includes(key)) {
      suggestions.push(...skills);
      break;
    }
  }

  // From experience roles
  for (const entry of ctx.experience ?? []) {
    const role = (entry.role ?? "").toLowerCase();
    for (const [key, skills] of Object.entries(ROLE_SKILL_MAP)) {
      if (role.includes(key)) {
        suggestions.push(...skills);
        break;
      }
    }
  }

  // From certificates
  for (const cert of ctx.certificates ?? []) {
    const name = (cert.name ?? "").toLowerCase();
    if (name.includes("aws")) suggestions.push("AWS", "Cloud Computing");
    if (name.includes("google")) suggestions.push("Google Cloud", "Analytics");
    if (name.includes("pmp") || name.includes("project management")) suggestions.push("Project Management", "Agile", "Scrum");
    if (name.includes("python")) suggestions.push("Python", "Data Analysis");
    if (name.includes("react")) suggestions.push("React", "JavaScript", "TypeScript");
    if (name.includes("sql")) suggestions.push("SQL", "Database Management");
  }

  return uniqueSkills(suggestions).slice(0, 16);
}

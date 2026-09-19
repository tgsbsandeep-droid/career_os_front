export function normalizeSkillName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function skillKey(value: string) {
  return normalizeSkillName(value).toLowerCase();
}

export function uniqueSkills(values: string[]) {
  const seen = new Set<string>();
  const skills: string[] = [];
  for (const raw of values) {
    const skill = normalizeSkillName(raw);
    if (!skill) continue;
    const key = skillKey(skill);
    if (seen.has(key)) continue;
    seen.add(key);
    skills.push(skill);
  }
  return skills;
}

/** Domain chips inferred from education, job titles, and certificate names — not a generic IT catalog. */
const PROFILE_SKILL_GROUPS: Array<{ match: RegExp; skills: string[] }> = [
  { match: /computer science|information technology|\bit\b|software|full.?stack|fullstack/i, skills: ["JavaScript", "Python", "SQL", "Git", "Data structures", "Problem solving"] },
  { match: /front.?end|frontend|react|javascript developer|web developer/i, skills: ["JavaScript", "TypeScript", "React", "HTML", "CSS", "Responsive design"] },
  { match: /back.?end|backend|node\.js|java engineer|python engineer/i, skills: ["Node.js", "REST APIs", "SQL", "PostgreSQL", "System design"] },
  { match: /data science|machine learning|\bml\b|artificial intelligence|\bai\b/i, skills: ["Python", "SQL", "Machine learning", "Pandas", "Statistics"] },
  { match: /data analy|analytics|business intelligence|\bbi\b/i, skills: ["SQL", "Excel", "Tableau", "Power BI", "Data analysis", "Statistics"] },
  { match: /product design|ui\/ux|ux design|ui design|human computer/i, skills: ["Figma", "UI design", "User research", "Wireframing", "Prototyping"] },
  { match: /graphic|visual design|brand design|illustrat/i, skills: ["Adobe Photoshop", "Adobe Illustrator", "Figma", "Branding", "Typography"] },
  { match: /devops|sre|cloud|platform engineer/i, skills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux"] },
  { match: /android|ios|mobile/i, skills: ["Kotlin", "Swift", "React Native", "Mobile UI", "REST APIs"] },
  { match: /\bqa\b|tester|sdet|quality assurance/i, skills: ["Manual testing", "Automation testing", "API testing", "Bug tracking"] },
  { match: /cyber|information security|infosec/i, skills: ["Network security", "Risk assessment", "Linux", "Incident response"] },
  { match: /product manager|product owner/i, skills: ["Product strategy", "Roadmapping", "User research", "Agile", "Communication"] },
  { match: /project manag|scrum|pmp/i, skills: ["Project management", "Agile", "Scrum", "Stakeholder management", "Planning"] },
  { match: /business analy/i, skills: ["Business analysis", "Requirements gathering", "Process mapping", "SQL", "Communication"] },
  { match: /market|seo|digital media|brand manager/i, skills: ["Digital marketing", "SEO", "Content writing", "Campaign management", "Analytics"] },
  { match: /sales|account executive|business development/i, skills: ["Sales", "CRM", "Negotiation", "Communication", "Pipeline management"] },
  { match: /\bhr\b|human resource|recruiter|talent/i, skills: ["Recruiting", "Employee relations", "Interviewing", "HR operations", "Communication"] },
  { match: /finance|accountancy|accounting|chartered account|commerce/i, skills: ["Accounting", "Excel", "Financial analysis", "GST", "Tally"] },
  { match: /econom/i, skills: ["Economics", "Excel", "Research", "Data analysis", "Report writing"] },
  { match: /mba|management|operations/i, skills: ["Leadership", "Communication", "Operations", "Excel", "Stakeholder management"] },
  { match: /nurs|healthcare|hospital|clinical|medical/i, skills: ["Patient care", "Clinical documentation", "Vital signs", "Infection control", "Empathy"] },
  { match: /pharm/i, skills: ["Pharmacology", "Dispensing", "Patient counselling", "Inventory management"] },
  { match: /physiotherapy|occupational therap/i, skills: ["Patient assessment", "Rehabilitation", "Treatment planning", "Communication"] },
  { match: /teach|education|b\.?ed|pedagog/i, skills: ["Lesson planning", "Classroom management", "Curriculum design", "Communication", "Assessment"] },
  { match: /psychology|counsel/i, skills: ["Counselling", "Active listening", "Research", "Report writing", "Empathy"] },
  { match: /law|llb|legal|advocate/i, skills: ["Legal research", "Drafting", "Contract review", "Litigation support", "Communication"] },
  { match: /journalis|mass communication|media/i, skills: ["Writing", "Editing", "Research", "Interviewing", "Social media"] },
  { match: /content|copywriter|writer|english literature/i, skills: ["Content writing", "Editing", "Research", "SEO", "Communication"] },
  { match: /hospitality|hotel|tourism/i, skills: ["Customer service", "Front office", "Food and beverage", "Communication"] },
  { match: /chef|culinary|kitchen/i, skills: ["Food preparation", "Kitchen operations", "Food safety", "Menu planning"] },
  { match: /civil engineer|structural/i, skills: ["AutoCAD", "Site supervision", "Quantity surveying", "STAAD", "Project management"] },
  { match: /mechanical|automobile/i, skills: ["AutoCAD", "SolidWorks", "Manufacturing", "Maintenance", "Quality control"] },
  { match: /electrical|electronics|ece/i, skills: ["Circuit design", "PLC", "MATLAB", "Troubleshooting", "AutoCAD Electrical"] },
  { match: /architect/i, skills: ["AutoCAD", "Revit", "SketchUp", "Design development", "Site coordination"] },
  { match: /biology|biotech|microbio|life science/i, skills: ["Lab techniques", "Research", "Data analysis", "Scientific writing"] },
  { match: /chemistry|chemical/i, skills: ["Lab safety", "Analytical chemistry", "Research", "Quality control"] },
  { match: /physics|mathematics|statistics/i, skills: ["Quantitative analysis", "Research", "Excel", "Problem solving"] },
  { match: /logistics|supply chain|procurement/i, skills: ["Supply chain", "Inventory management", "Vendor management", "Excel"] },
  { match: /customer support|customer service|bpo/i, skills: ["Customer service", "Communication", "CRM", "Problem solving"] },
  { match: /intern/i, skills: ["Communication", "Microsoft Office", "Research", "Collaboration"] },
];

export type SkillSuggestionInput = {
  education?: string;
  educationField?: string;
  educationInstitution?: string;
  experience?: Array<{ role?: string; organization?: string; description?: string }>;
  certificates?: Array<{ name?: string; issuer?: string }>;
};

export function profileHasSkillSignal(input: SkillSuggestionInput) {
  const experienceText = (input.experience ?? [])
    .map((entry) => [entry.role, entry.organization, entry.description].filter(Boolean).join(" "))
    .join(" ")
    .trim();
  const certText = (input.certificates ?? [])
    .map((cert) => [cert.name, cert.issuer].filter(Boolean).join(" "))
    .join(" ")
    .trim();
  return Boolean(
    String(input.educationField ?? "").trim() ||
      String(input.education ?? "").trim() ||
      experienceText ||
      certText,
  );
}

export function suggestSkillsFromProfile(input: SkillSuggestionInput) {
  const haystack = [
    input.education,
    input.educationField,
    input.educationInstitution,
    ...(input.experience ?? []).flatMap((entry) => [entry.role, entry.organization, entry.description]),
    ...(input.certificates ?? []).flatMap((cert) => [cert.name, cert.issuer]),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!haystack) return [];

  const matched: string[] = [];
  for (const group of PROFILE_SKILL_GROUPS) {
    if (group.match.test(haystack)) matched.push(...group.skills);
  }
  return uniqueSkills(matched).slice(0, 16);
}

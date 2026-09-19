import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Download,
  ExternalLink,
  FileBadge,
  GraduationCap,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest, supabase } from "../../services/api";

type ProfileCertificate = {
  name: string;
  issuer: string;
  date: string;
  url: string;
};

type Enrollment = {
  id: string;
  course_id: string;
  progress?: number;
  progress_pct?: number;
  courses?: {
    title?: string;
    level?: string;
    certificate?: boolean;
    provider?: string;
  };
};

type IssuedCertificate = {
  id: string;
  course_id: string;
  issued_at: string;
  courses?: {
    title?: string;
    provider?: string;
    level?: string;
    certificate?: boolean;
  };
};

function parseCertificates(raw: unknown): ProfileCertificate[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item === "string") {
      try {
        const parsed = JSON.parse(item) as ProfileCertificate;
        if (parsed?.name) return [parsed];
      } catch {
        return [{ name: item, issuer: "", date: "", url: "" }];
      }
      return [];
    }
    if (item && typeof item === "object" && "name" in item) {
      return [item as ProfileCertificate];
    }
    return [];
  });
}

export default function Certificates() {
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [wallet, setWallet] = useState<ProfileCertificate[]>([]);
  const [earned, setEarned] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [newCert, setNewCert] = useState<ProfileCertificate>({ name: "", issuer: "", date: "", url: "" });

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      setFullName(String(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? ""));
      try {
        const [profileRes, enrollRes, issuedRes] = await Promise.all([
          apiRequest<{ profile: { full_name?: string; certificates?: unknown } | null }>(`/api/candidate/${user.id}/profile`),
          apiRequest<{ enrollments: Enrollment[] }>(`/api/candidate/${user.id}/enrollments`),
          apiRequest<{ certificates: IssuedCertificate[] }>("/api/lms/my-certificates").catch(() => ({ certificates: [] as IssuedCertificate[] })),
        ]);
        if (profileRes.profile?.full_name) setFullName(profileRes.profile.full_name);
        setWallet(parseCertificates(profileRes.profile?.certificates));
        const issued = issuedRes.certificates ?? [];
        setEarned(
          issued.length
            ? issued.map((cert) => ({
                id: cert.id,
                course_id: cert.course_id,
                progress: 100,
                progress_pct: 100,
                courses: cert.courses,
              }))
            : (enrollRes.enrollments ?? []).filter((enrollment) => {
                const progress = enrollment.progress_pct ?? enrollment.progress ?? 0;
                return progress >= 100 && enrollment.courses?.certificate !== false;
              }),
        );
      } catch (err) {
        setMessage({ text: (err as Error).message, type: "error" });
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const total = wallet.length + earned.length;
  const emptyCert = useMemo(() => ({ name: "", issuer: "", date: "", url: "" }), []);

  async function persistWallet(next: ProfileCertificate[]) {
    if (!userId) return;
    setSaving(true);
    setMessage(null);
    try {
      await apiRequest(`/api/candidate/${userId}/profile`, {
        method: "PUT",
        body: JSON.stringify({ certificates: next.map((cert) => JSON.stringify(cert)) }),
      });
      setWallet(next);
      setMessage({ text: "Certificate wallet updated.", type: "success" });
    } catch (err) {
      setMessage({ text: (err as Error).message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  function addCertificate() {
    if (!newCert.name.trim()) return;
    void persistWallet([...wallet, { ...newCert, name: newCert.name.trim() }]);
    setNewCert(emptyCert);
  }

  function removeCertificate(index: number) {
    void persistWallet(wallet.filter((_, i) => i !== index));
  }

  function printCertificate(title: string, issuer: string) {
    const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=640");
    if (!win) return;
    win.document.write(`<!doctype html>
<html>
  <head>
    <title>${title} certificate</title>
    <style>
      body { font-family: Georgia, serif; margin: 0; background: #f7fbf9; color: #12241c; }
      .sheet { margin: 40px auto; width: 820px; padding: 56px; border: 12px solid #146c45; background: white; text-align: center; }
      h1 { letter-spacing: .18em; font-size: 14px; color: #157a4f; }
      h2 { font-size: 36px; margin: 12px 0 8px; }
      p { color: #5b6b64; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <h1>CERTIFICATE OF COMPLETION</h1>
      <p>This certifies that</p>
      <h2>${fullName || "Candidate"}</h2>
      <p>has successfully completed</p>
      <h2 style="font-size:28px">${title}</h2>
      <p>${issuer ? `Issued by ${issuer}` : "CareerOS"}</p>
    </div>
    <script>window.print()</script>
  </body>
</html>`);
    win.document.close();
  }

  return (
    <main className="min-h-screen bg-[#f7fbf9]">
      <div className="mx-auto max-w-[1180px] px-5 py-8 space-y-6">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#157a4f]">CREDENTIALS</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#12241c]">
            Certificates
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#5b6b64]">
            Keep course completions and uploaded credentials in one wallet recruiters can trust.
          </p>
        </div>

        {message && (
          <div className={`rounded-[22px] border px-4 py-3 text-[13px] ${message.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-[#cfe6db] bg-[#eaf6f0] text-[#146c45]"}`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-[#146c45]" />
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
                <p className="text-[12px] font-semibold tracking-[0.12em] text-[#7a8b84]">TOTAL</p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-[30px] font-semibold text-[#12241c]">{total}</p>
              </div>
              <div className="rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
                <p className="text-[12px] font-semibold tracking-[0.12em] text-[#7a8b84]">COURSE EARNED</p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-[30px] font-semibold text-[#12241c]">{earned.length}</p>
              </div>
              <div className="rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
                <p className="text-[12px] font-semibold tracking-[0.12em] text-[#7a8b84]">UPLOADED</p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-[30px] font-semibold text-[#12241c]">{wallet.length}</p>
              </div>
            </section>

            <section className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
              <div className="mb-5 flex items-center gap-2">
                <GraduationCap size={18} className="text-[#146c45]" />
                <h2 className="font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#12241c]">Earned from courses</h2>
              </div>
              {earned.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#cfe6db] bg-[#f7fbf9] p-8 text-center">
                  <Award size={28} className="mx-auto text-[#c9d6cf]" />
                  <p className="mt-3 font-semibold text-[#12241c]">No course certificates yet</p>
                  <p className="mt-1 text-[13px] text-[#7a8b84]">Complete a course that awards a certificate to earn one here.</p>
                  <Link to="/candidate/courses" className="mt-4 inline-flex rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0f5a39]">
                    Browse courses
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {earned.map((enrollment) => (
                    <article key={enrollment.id} className="rounded-2xl border border-[#eef3f0] bg-[#f7fbf9] p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.14em] text-amber-700">COURSE CERTIFICATE</p>
                          <h3 className="mt-1 font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#12241c]">
                            {enrollment.courses?.title ?? "Course"}
                          </h3>
                          <p className="mt-1 text-[13px] text-[#5b6b64]">
                            {enrollment.courses?.provider ?? "CareerOS"} · {enrollment.courses?.level ?? "Completed"}
                          </p>
                        </div>
                        <Award size={22} className="text-amber-500" />
                      </div>
                      <button
                        type="button"
                        onClick={() => printCertificate(enrollment.courses?.title ?? "Course", enrollment.courses?.provider ?? "CareerOS")}
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-[12px] font-semibold text-white hover:bg-amber-600"
                      >
                        <Download size={13} /> Download certificate
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[22px] border border-white bg-white p-6 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.18)]">
              <div className="mb-5 flex items-center gap-2">
                <FileBadge size={18} className="text-[#146c45]" />
                <h2 className="font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#12241c]">Uploaded credentials</h2>
              </div>

              {wallet.length > 0 && (
                <div className="mb-5 space-y-3">
                  {wallet.map((cert, index) => (
                    <div key={`${cert.name}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-[#eef3f0] bg-[#f7fbf9] px-4 py-3">
                      <div>
                        <p className="font-semibold text-[#12241c]">{cert.name}</p>
                        <p className="text-[13px] text-[#5b6b64]">
                          {[cert.issuer, cert.date].filter(Boolean).join(" · ") || "Added to profile"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {cert.url && (
                          <a href={cert.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#146c45] hover:underline">
                            <ExternalLink size={13} /> View
                          </a>
                        )}
                        <button type="button" onClick={() => removeCertificate(index)} className="rounded-lg p-2 text-[#7a8b84] hover:bg-red-50 hover:text-red-600" aria-label="Remove certificate">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-2xl border border-dashed border-[#cfe6db] bg-[#f7fbf9] p-4 space-y-3">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#5b6b64]">Add certificate</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={newCert.name} onChange={(e) => setNewCert({ ...newCert, name: e.target.value })} placeholder="Certificate name" className="rounded-xl border border-[#e4eee9] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#146c45]" />
                  <input value={newCert.issuer} onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })} placeholder="Issuer" className="rounded-xl border border-[#e4eee9] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#146c45]" />
                  <input value={newCert.date} onChange={(e) => setNewCert({ ...newCert, date: e.target.value })} placeholder="Date (e.g. 2026)" className="rounded-xl border border-[#e4eee9] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#146c45]" />
                  <input value={newCert.url} onChange={(e) => setNewCert({ ...newCert, url: e.target.value })} placeholder="Credential URL (optional)" className="rounded-xl border border-[#e4eee9] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#146c45]" />
                </div>
                <button
                  type="button"
                  disabled={saving || !newCert.name.trim()}
                  onClick={addCertificate}
                  className="inline-flex items-center gap-2 rounded-full bg-[#146c45] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0f5a39] disabled:opacity-60"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  Add certificate
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

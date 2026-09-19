import { FileText, Plus, Trash2, Upload, Video } from "lucide-react";
import { useState } from "react";
import { supabase } from "../services/api";

export type CourseLesson = { id: string; title: string; type: "video" | "file"; url: string; duration?: string };
export type CourseModule = { id: string; title: string; description: string; lessons: CourseLesson[] };

export default function CourseModuleEditor({ userId, modules, onChange }: { userId: string; modules: CourseModule[]; onChange: (modules: CourseModule[]) => void }) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function addLesson(moduleId: string, file: File, type: CourseLesson["type"]) {
    setUploading(moduleId);
    setError("");
    const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error: uploadError } = await supabase.storage.from("learning-content").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) setError(uploadError.message);
    else {
      const { data } = supabase.storage.from("learning-content").getPublicUrl(path);
      onChange(modules.map((module) => module.id === moduleId ? { ...module, lessons: [...module.lessons, { id: crypto.randomUUID(), title: file.name.replace(/\.[^/.]+$/, ""), type, url: data.publicUrl }] } : module));
    }
    setUploading(null);
  }

  return <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">Course modules</h3><p className="text-sm text-slate-500">Add video lessons or downloadable files to each module.</p></div><button type="button" onClick={() => onChange([...modules, { id: crypto.randomUUID(), title: `Module ${modules.length + 1}`, description: "", lessons: [] }])} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"><Plus size={16} /> Add module</button></div><div className="mt-4 space-y-4">{modules.map((module, index) => <div key={module.id} className="rounded-xl bg-slate-50 p-4"><div className="flex gap-3"><div className="flex-1 space-y-2"><input value={module.title} onChange={(event) => onChange(modules.map((item) => item.id === module.id ? { ...item, title: event.target.value } : item))} placeholder={`Module ${index + 1} title`} className="w-full rounded-lg border px-3 py-2 font-semibold" /><input value={module.description} onChange={(event) => onChange(modules.map((item) => item.id === module.id ? { ...item, description: event.target.value } : item))} placeholder="Module description" className="w-full rounded-lg border px-3 py-2 text-sm" /></div><button type="button" title="Remove module" onClick={() => onChange(modules.filter((item) => item.id !== module.id))} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={17} /></button></div><div className="mt-3 space-y-2">{module.lessons.map((lesson) => <div key={lesson.id} className="flex items-center gap-2 rounded-lg border bg-white p-2 text-sm"><span className="text-emerald-700">{lesson.type === "video" ? <Video size={16} /> : <FileText size={16} />}</span><span className="flex-1 truncate">{lesson.title}</span><button type="button" title="Remove lesson" onClick={() => onChange(modules.map((item) => item.id === module.id ? { ...item, lessons: item.lessons.filter((entry) => entry.id !== lesson.id) } : item))} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button></div>)}<div className="flex flex-wrap items-center gap-2"><label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold"><Upload size={15} /> {uploading === module.id ? "Uploading..." : "Add video"}<input type="file" accept="video/*" className="hidden" disabled={uploading !== null} onChange={(event) => { const file = event.target.files?.[0]; if (file) void addLesson(module.id, file, "video"); }} /></label><label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold"><Upload size={15} /> Add file<input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.txt" className="hidden" disabled={uploading !== null} onChange={(event) => { const file = event.target.files?.[0]; if (file) void addLesson(module.id, file, "file"); }} /></label></div></div></div>)}</div>{error && <p className="mt-3 text-sm text-red-700">{error}</p>}</div>;
}

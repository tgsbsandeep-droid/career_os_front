import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "../services/api";

export type LiveBatch = {
  id: string;
  title: string;
  start_at: string;
  end_at?: string | null;
  schedule: string;
  capacity: number;
  meeting_url?: string;
  status: "draft" | "published" | "closed";
};

type BatchForm = { title: string; start_date: string; start_time: string; meeting_url: string; capacity: string };

const emptyForm: BatchForm = { title: "", start_date: "", start_time: "", meeting_url: "", capacity: "30" };

function splitStart(startAt: string) {
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) {
    const [day = "", time = ""] = startAt.split("T");
    return { start_date: day, start_time: time.slice(0, 5) };
  }
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
  return { start_date: local.slice(0, 10), start_time: local.slice(11, 16) };
}

function formatBatchWhen(batch: LiveBatch) {
  if (batch.schedule?.trim()) return batch.schedule.trim();
  const start = new Date(batch.start_at);
  if (Number.isNaN(start.getTime())) return "Time to be announced";
  return start.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LiveBatchEditor({
  courseId,
  batches = [],
  coursePublished = false,
  onChange,
}: {
  courseId?: string;
  batches?: LiveBatch[];
  coursePublished?: boolean;
  onChange?: (batches: LiveBatch[]) => void;
}) {
  const [form, setForm] = useState<BatchForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  function startEdit(batch: LiveBatch) {
    const { start_date, start_time } = splitStart(batch.start_at);
    setEditingId(batch.id);
    setForm({
      title: batch.title === "Live training batch" ? "" : batch.title,
      start_date,
      start_time,
      meeting_url: batch.meeting_url ?? "",
      capacity: String(batch.capacity || 30),
    });
    setMessage("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveBatch() {
    if (!courseId) { setMessage("Save the course as a draft first, then add a live batch."); return; }
    if (!form.start_date || !form.start_time) { setMessage("Add a batch date and time."); return; }
    if (!form.meeting_url.trim()) { setMessage("Add a meeting link."); return; }
    const payload = {
      title: form.title.trim() || "Live training batch",
      start_at: `${form.start_date}T${form.start_time}`,
      meeting_url: form.meeting_url.trim(),
      capacity: Number(form.capacity) || 30,
      status: coursePublished ? "published" : "draft",
    };
    setSaving(true);
    try {
      if (editingId) {
        const response = await apiRequest<{ batch: LiveBatch }>(`/api/courses/${courseId}/live-batches/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        onChange?.(batches.map((batch) => (batch.id === editingId ? response.batch : batch)));
        setMessage("Live batch updated.");
      } else {
        const response = await apiRequest<{ batch: LiveBatch }>(`/api/courses/${courseId}/live-batches`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        onChange?.([...batches, response.batch]);
        setMessage(coursePublished ? "Live batch created and visible to learners." : "Live batch created. Publish the course to make this session visible.");
      }
      resetForm();
    } catch (error) {
      setMessage((error as Error).message);
    }
    setSaving(false);
  }

  async function deleteBatch(batchId: string) {
    if (!courseId) return;
    if (!window.confirm("Delete this live batch? Learners will no longer see this session.")) return;
    setDeletingId(batchId);
    try {
      await apiRequest(`/api/courses/${courseId}/live-batches/${batchId}`, { method: "DELETE" });
      onChange?.(batches.filter((batch) => batch.id !== batchId));
      if (editingId === batchId) resetForm();
      setMessage("Live batch deleted.");
    } catch (error) {
      setMessage((error as Error).message);
    }
    setDeletingId(null);
  }

  return (
    <section className="rounded-xl border border-[#e4eee9] p-4">
      <div className="flex items-center gap-2">
        <CalendarDays size={18} className="text-[#146c45]" />
        <div>
          <h3 className="font-semibold text-[#12241c]">Live training batches</h3>
          <p className="text-sm text-[#5b6b64]">
            Save the course first, then create a batch. Publish course also publishes this session so candidates can see the time and join.
          </p>
        </div>
      </div>
      {batches.length > 0 && (
        <div className="mt-4 space-y-2">
          {batches.map((batch) => (
            <div key={batch.id} className="rounded-lg bg-[#f7fbf9] p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#12241c]">{batch.title}</span>
                    <span className="text-[#146c45]">{batch.status}</span>
                  </div>
                  <p className="mt-1 text-[#5b6b64]">{formatBatchWhen(batch)}</p>
                  {batch.meeting_url && <p className="mt-1 truncate text-[#146c45]">{batch.meeting_url}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(batch)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#e4eee9] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#1d332a] hover:border-[#cfe6db]"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === batch.id}
                    onClick={() => void deleteBatch(batch.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={12} /> {deletingId === batch.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <input
          form="live-batch-standalone"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="Batch title (optional)"
          className="rounded-lg border border-[#e4eee9] px-3 py-2 sm:col-span-2"
        />
        <input form="live-batch-standalone" type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} className="rounded-lg border border-[#e4eee9] px-3 py-2" />
        <input form="live-batch-standalone" type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} className="rounded-lg border border-[#e4eee9] px-3 py-2" />
        <input
          form="live-batch-standalone"
          type="url"
          value={form.meeting_url}
          onChange={(event) => setForm({ ...form, meeting_url: event.target.value })}
          placeholder="Meeting link"
          className="rounded-lg border border-[#e4eee9] px-3 py-2 sm:col-span-2"
        />
        <input
          form="live-batch-standalone"
          type="number"
          min="1"
          value={form.capacity}
          onChange={(event) => setForm({ ...form, capacity: event.target.value })}
          placeholder="Seats"
          className="rounded-lg border border-[#e4eee9] px-3 py-2"
        />
        <div className="flex gap-2">
          {editingId && (
            <button type="button" onClick={resetForm} className="flex-1 rounded-lg border border-[#d5e3dc] px-3 py-2 text-sm font-semibold text-[#1d332a]">
              Cancel
            </button>
          )}
          <button disabled={saving} type="button" onClick={() => void saveBatch()} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#146c45] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {editingId ? <Pencil size={16} /> : <Plus size={16} />}
            {saving ? "Saving…" : editingId ? "Save batch" : "Create batch"}
          </button>
        </div>
      </div>
      {message && <p className="mt-2 text-sm text-[#5b6b64]">{message}</p>}
    </section>
  );
}

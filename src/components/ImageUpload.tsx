import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "../services/api";

export default function ImageUpload({
  userId,
  bucket,
  value,
  onChange,
  label,
}: {
  userId: string;
  bucket: "avatars" | "course-thumbnails" | "learning-content";
  value: string;
  onChange: (url: string) => void;
  label: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setUploading(true);
    setError("");
    const { data: authData } = await supabase.auth.getUser();
    const ownerId = authData.user?.id || userId;
    if (!ownerId) {
      setError("Please sign in again before uploading a photo.");
      setUploading(false);
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${ownerId}/${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      setError(uploadError.message);
    } else {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
    }
    setUploading(false);
  }

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-[#3d4d46]">{label}</p>
      <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-[#cfe6db] bg-[#f7fbf9] p-4 transition hover:border-[#146c45] hover:bg-[#eaf6f0]">
        {value ? (
          <img src={value} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#146c45]">
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          </div>
        )}
        <div>
          <p className="text-[13px] font-medium text-[#12241c]">{uploading ? "Uploading…" : value ? "Change photo" : "Upload a photo"}</p>
          <p className="mt-0.5 text-[12px] text-[#7a8b84]">PNG, JPG, or WebP</p>
        </div>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </label>
      {error && <p className="text-[12px] text-red-700">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";
import { setAvatarUrl, removeAvatar } from "@/lib/actions/account";

/**
 * 96px avatar with an ink camera badge (screens 9c/14c). Uploads client-side to
 * the public `avatars` bucket under `<userId>/…`, persists the URL via a server
 * action, then refreshes. "Remove" reverts to the gradient/initials fallback.
 */
export function AvatarUploader({
  userId,
  name,
  avatarUrl,
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setPreview(data.publicUrl);
      startTransition(() => setAvatarUrl(data.publicUrl));
    } catch {
      setError("Couldn't upload that image. Try a JPG or PNG under a few MB.");
    } finally {
      setBusy(false);
    }
  }

  function onRemove() {
    setPreview(null);
    startTransition(() => removeAvatar());
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <Avatar name={name} src={preview} gradient="brand" size={96} />
        <label className="absolute -bottom-1 -right-1 flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-pill bg-ink text-white ring-2 ring-white transition hover:-translate-y-px">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} strokeWidth={2} />}
          <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <label className="cursor-pointer rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-gray-300">
          Change photo
          <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
        </label>
        {preview && (
          <button type="button" onClick={onRemove} className="text-sm font-semibold text-red-700 hover:underline">
            Remove
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-center text-xs text-red-700">{error}</p>}
    </div>
  );
}

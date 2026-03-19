import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { updateProfile } from './useAuth';
import { useAuthStore } from '../store/authStore';
import { pickImage } from './pickImage';

function mimeToExt(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpg';
}

export function usePhotoUpload() {
  const appUser = useAuthStore((s) => s.appUser);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickAndUpload(): Promise<string | null> {
    setError(null);

    try {
      const uid = appUser?.id;
      if (!uid) throw new Error('Not authenticated.');

      const picked = await pickImage();
      if (!picked) return null;

      setUploading(true);

      const { blob, mimeType } = picked;
      const ext = mimeToExt(mimeType);
      const fileName = `${uid}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await updateProfile({ avatarUrl: publicUrl });

      return publicUrl;
    } catch (e: any) {
      setError(e?.message ?? 'Upload failed.');
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { pickAndUpload, uploading, error };
}

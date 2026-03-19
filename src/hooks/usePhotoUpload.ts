import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { updateProfile } from './useAuth';
import { pickImage } from './pickImage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

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

      const formData = new FormData();
      formData.append('file', picked.blob, `avatar`);
      formData.append('uid', uid);

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/upload-avatar`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
          body: formData,
        }
      );

      const json = await response.json();
      if (!response.ok) throw new Error(json?.error ?? 'Upload failed');

      const publicUrl = `${json.publicUrl}?t=${Date.now()}`;
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

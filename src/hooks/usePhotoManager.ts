import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { updateProfile } from './useAuth';
import { pickImage } from './pickImage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const MAX_PHOTOS = 5;

export function usePhotoManager() {
  const appUser = useAuthStore((s) => s.appUser);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [deletingSlot, setDeletingSlot] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const photos: string[] = appUser?.photos ?? [];

  async function uploadPhoto(slot: number): Promise<void> {
    setError(null);
    const uid = appUser?.id;
    if (!uid) { setError('Not authenticated.'); return; }
    if (slot < 0 || slot >= MAX_PHOTOS) { setError('Invalid slot.'); return; }

    const picked = await pickImage();
    if (!picked) return;

    setUploadingSlot(slot);
    try {
      const formData = new FormData();
      formData.append('file', picked.blob, 'photo');
      formData.append('uid', uid);
      formData.append('slot', String(slot));

      const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: formData,
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json?.error ?? 'Upload failed');

      const publicUrl = `${json.publicUrl}?t=${Date.now()}`;

      const updatedPhotos = [...photos];
      updatedPhotos[slot] = publicUrl;
      const newPhotos = updatedPhotos.filter(Boolean);

      await updateProfile({
        photos: newPhotos,
        avatarUrl: newPhotos[0] ?? undefined,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Upload failed.');
    } finally {
      setUploadingSlot(null);
    }
  }

  async function deletePhoto(index: number): Promise<void> {
    setError(null);
    const uid = appUser?.id;
    if (!uid) { setError('Not authenticated.'); return; }
    if (photos.length <= 1) { setError('At least one photo is required.'); return; }
    if (index < 0 || index >= photos.length) return;

    setDeletingSlot(index);
    try {
      const url = photos[index];
      const fileNameMatch = url.match(/avatars\/(.+?)(?:\?|$)/);
      if (fileNameMatch?.[1]) {
        const fileName = decodeURIComponent(fileNameMatch[1]);
        await fetch(`${SUPABASE_URL}/functions/v1/delete-photo`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uid, fileName }),
        });
      }

      const newPhotos = photos.filter((_, i) => i !== index);
      await updateProfile({
        photos: newPhotos,
        avatarUrl: newPhotos[0] ?? undefined,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Delete failed.');
    } finally {
      setDeletingSlot(null);
    }
  }

  async function reorderPhotos(fromIndex: number, toIndex: number): Promise<void> {
    setError(null);
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= photos.length || toIndex >= photos.length) return;

    const newPhotos = [...photos];
    const [moved] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, moved);

    try {
      await updateProfile({
        photos: newPhotos,
        avatarUrl: newPhotos[0] ?? undefined,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Reorder failed.');
    }
  }

  return {
    photos,
    uploadPhoto,
    deletePhoto,
    reorderPhotos,
    uploadingSlot,
    deletingSlot,
    error,
    canAddMore: photos.length < MAX_PHOTOS,
    MAX_PHOTOS,
  };
}

import { useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { updateProfile } from './useAuth';
import { useAuthStore } from '../store/authStore';

function mimeToExt(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpg';
}

function pickFileWeb(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      resolve(file);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
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

      let blob: Blob;
      let mimeType: string;

      if (Platform.OS === 'web') {
        const file = await pickFileWeb();
        if (!file) return null;
        blob = file;
        mimeType = file.type || 'image/jpeg';
      } else {
        const ImagePicker = await import('expo-image-picker');
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access photos is required.');
          return null;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (result.canceled || !result.assets?.[0]) return null;

        const asset = result.assets[0];
        mimeType = asset.mimeType ?? 'image/jpeg';
        const response = await fetch(asset.uri);
        blob = await response.blob();
      }

      setUploading(true);

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

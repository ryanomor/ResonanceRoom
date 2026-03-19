import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
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

async function uriToBlob(uri: string, mimeType: string): Promise<Blob> {
  if (uri.startsWith('data:')) {
    const base64 = uri.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  }
  const response = await fetch(uri);
  return response.blob();
}

export function usePhotoUpload() {
  const appUser = useAuthStore((s) => s.appUser);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickAndUpload(): Promise<string | null> {
    setError(null);

    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access photos is required.');
        return null;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    setUploading(true);

    try {
      const uid = appUser?.id;
      if (!uid) throw new Error('Not authenticated.');

      const mimeType = asset.mimeType ?? 'image/jpeg';
      const ext = mimeToExt(mimeType);
      const fileName = `${uid}/avatar.${ext}`;

      const blob = await uriToBlob(asset.uri, mimeType);

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

import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { updateProfile } from './useAuth';
import { useAuthStore } from '../store/authStore';

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

      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${uid}/avatar.${ext}`;

      let blob: Blob;
      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        blob = await response.blob();
      } else {
        const response = await fetch(asset.uri);
        blob = await response.blob();
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
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

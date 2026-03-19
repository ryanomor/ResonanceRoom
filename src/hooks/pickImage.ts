import * as ImagePicker from 'expo-image-picker';

export type PickedImage = {
  blob: Blob;
  mimeType: string;
};

export async function pickImage(): Promise<PickedImage | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? 'image/jpeg';
  const response = await fetch(asset.uri);
  const blob = await response.blob();

  return { blob, mimeType };
}

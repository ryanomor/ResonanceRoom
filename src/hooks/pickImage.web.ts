export type PickedImage = {
  blob: Blob;
  mimeType: string;
};

export async function pickImage(): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve({ blob: file, mimeType: file.type || 'image/jpeg' });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

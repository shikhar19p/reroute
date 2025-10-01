import { storage } from './firebaseConfig';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

export async function uploadFarmhouseImage(
  ownerId: string,
  file: Blob | File,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 5MB limit');
  }

  const filename = Date.now() + '_' + Math.random().toString(36).substring(7);
  const storageRef = ref(storage, 'farmhouses/' + ownerId + '/' + filename);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress({
            progress,
            status: 'uploading',
          });
        }
      },
      (error) => {
        console.error('Upload error:', error);

        const errorMessage = error.code === 'storage/unauthorized'
          ? 'Unauthorized to upload. Please check permissions.'
          : 'Upload failed. Please check your connection and try again.';

        if (onProgress) {
          onProgress({
            progress: 0,
            status: 'error',
            error: errorMessage,
          });
        }

        reject(new Error(errorMessage));
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          if (onProgress) {
            onProgress({
              progress: 100,
              status: 'success',
              url: downloadURL,
            });
          }

          resolve(downloadURL);
        } catch (error) {
          reject(new Error('Failed to get download URL'));
        }
      }
    );
  });
}

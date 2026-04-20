import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '@/config/firebase';
import { writeAuditLog } from './audit';

// All media is stored under private paths — never public buckets
function mediaPath(stateId: string, childId: string, fileName: string): string {
  return `states/${stateId}/children/${childId}/${fileName}`;
}

export async function uploadStateLogo(stateId: string, file: File): Promise<string> {
  const fileName = `logo_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const storageRef = ref(storage, `states/${stateId}/branding/${fileName}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadSponsorLogo(file: File): Promise<string> {
  const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const storageRef = ref(storage, `sponsors/${fileName}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadMedia(params: {
  stateId: string;
  childId: string;
  file: File | Blob;
  uploadedBy: string;
  captureMethod?: 'in_app_camera' | 'file_upload';
  onProgress?: (percent: number) => void;
}): Promise<string> {
  const { stateId, childId, file, uploadedBy, captureMethod = 'file_upload', onProgress } = params;

  const fileName = file instanceof File
    ? `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    : `${Date.now()}_capture.${file.type.split('/')[1]?.split(';')[0] ?? 'bin'}`;

  if (file.size === 0) throw new Error('File appears to be empty (0 bytes). Please try again.');

  const storageRef = ref(storage, mediaPath(stateId, childId, fileName));

  // getDownloadURL returns a token-based URL (not a public URL)
  const signedUrl = await new Promise<string>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      () => getDownloadURL(task.snapshot.ref).then(resolve).catch(reject),
    );
  });

  await writeAuditLog({
    stateId,
    eventType: 'media_upload',
    targetId: childId,
    targetType: 'media',
    performedBy: uploadedBy,
    details: {
      fileName,
      path: storageRef.fullPath,
      captureMethod,
      fileSize: file.size,
      mimeType: file.type,
    },
  });

  return signedUrl;
}

export async function deleteMedia(params: {
  stateId: string;
  childId: string;
  fileName: string;
  deletedBy: string;
}): Promise<void> {
  const { stateId, childId, fileName, deletedBy } = params;
  const storageRef = ref(storage, mediaPath(stateId, childId, fileName));
  await deleteObject(storageRef);

  await writeAuditLog({
    stateId,
    eventType: 'media_delete',
    targetId: childId,
    targetType: 'media',
    performedBy: deletedBy,
    details: { fileName },
  });
}

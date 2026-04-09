import {
  ref,
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

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percent: number;
}

export async function uploadMedia(params: {
  stateId: string;
  childId: string;
  file: File;
  uploadedBy: string;
  onProgress?: (progress: UploadProgress) => void;
}): Promise<string> {
  const { stateId, childId, file, uploadedBy, onProgress } = params;
  const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const storageRef = ref(storage, mediaPath(stateId, childId, fileName));

  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      'state_changed',
      (snapshot) => {
        if (onProgress) {
          onProgress({
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            percent: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
          });
        }
      },
      reject,
      resolve
    );
  });

  // getDownloadURL returns a token-based URL (not a public URL)
  const signedUrl = await getDownloadURL(storageRef);

  await writeAuditLog({
    stateId,
    eventType: 'media_upload',
    targetId: childId,
    targetType: 'media',
    performedBy: uploadedBy,
    details: { fileName, path: storageRef.fullPath },
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

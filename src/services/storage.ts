import {
  ref,
  uploadBytes,
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

export async function uploadMedia(params: {
  stateId: string;
  childId: string;
  file: File;
  uploadedBy: string;
}): Promise<string> {
  const { stateId, childId, file, uploadedBy } = params;
  const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const storageRef = ref(storage, mediaPath(stateId, childId, fileName));

  if (file.size === 0) throw new Error(`File "${file.name}" appears to be empty (0 bytes). Please try selecting it again.`);

  await uploadBytes(storageRef, file);

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

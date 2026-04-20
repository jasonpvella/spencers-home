import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadMedia } from '@/services/storage';
import { addPhotoUrl, updateChild } from '@/services/children';
import { useToast } from '@/components/shared/Toaster';
import CameraCapture from './CameraCapture';
import type { ChildProfile } from '@/types';

interface Props {
  child: ChildProfile;
  userId: string;
  onUpdate: () => void;
}

interface UploadState {
  fileName: string;
  error: string | null;
}

const ACCEPTED_IMAGE = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] };
const ACCEPTED_VIDEO = { 'video/mp4': ['.mp4'], 'video/quicktime': ['.mov'], 'video/webm': ['.webm'] };
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;  // 10 MB
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB

export default function MediaUpload({ child, userId, onUpdate }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<'camera' | 'upload'>('camera');
  const [imageUpload, setImageUpload] = useState<UploadState | null>(null);
  const [videoUpload, setVideoUpload] = useState<UploadState | null>(null);

  const handleImageDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      setImageUpload({ fileName: file.name, error: null });
      try {
        const url = await uploadMedia({
          stateId: child.stateId,
          childId: child.id,
          file,
          uploadedBy: userId,
          captureMethod: 'file_upload',
        });
        await addPhotoUrl(child.stateId, child.id, url, userId);
        setImageUpload(null);
        toast('Photo uploaded', 'success');
        onUpdate();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        setImageUpload((s) => s && { ...s, error: msg });
        toast(msg, 'error');
      }
    },
    [child, userId, onUpdate, toast]
  );

  const handleVideoDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      setVideoUpload({ fileName: file.name, error: null });
      try {
        const url = await uploadMedia({
          stateId: child.stateId,
          childId: child.id,
          file,
          uploadedBy: userId,
          captureMethod: 'file_upload',
        });
        await updateChild(
          child.stateId,
          child.id,
          { videoUrl: url },
          userId
        );
        setVideoUpload(null);
        toast('Video uploaded', 'success');
        onUpdate();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        setVideoUpload((s) => s && { ...s, error: msg });
        toast(msg, 'error');
      }
    },
    [child, userId, onUpdate, toast]
  );

  const { getRootProps: getImageRootProps, getInputProps: getImageInputProps, isDragActive: isImageDragActive } =
    useDropzone({
      onDrop: handleImageDrop,
      accept: ACCEPTED_IMAGE,
      maxFiles: 1,
      maxSize: MAX_IMAGE_BYTES,
      disabled: !!imageUpload,
    });

  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps, isDragActive: isVideoDragActive } =
    useDropzone({
      onDrop: handleVideoDrop,
      accept: ACCEPTED_VIDEO,
      maxFiles: 1,
      maxSize: MAX_VIDEO_BYTES,
      disabled: !!videoUpload,
    });

  return (
    <div className="space-y-4">
      {/* Existing media — always visible */}
      {child.photoUrls.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Photos</p>
          <div className="flex gap-2 flex-wrap">
            {child.photoUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Photo ${i + 1}`}
                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
              />
            ))}
          </div>
        </div>
      )}

      {child.videoUrl && (
        <p className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-1.5 inline-block">
          Video uploaded
        </p>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab('camera')}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            tab === 'camera'
              ? 'border-brand-500 text-brand-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Camera
        </button>
        <button
          onClick={() => setTab('upload')}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            tab === 'upload'
              ? 'border-brand-500 text-brand-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Upload File
        </button>
      </div>

      {/* Tab content */}
      {tab === 'camera' ? (
        <CameraCapture child={child} userId={userId} onUpdate={onUpdate} />
      ) : (
        <div className="space-y-4">
          {/* Photo upload */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Photo</p>
            <div
              {...getImageRootProps()}
              className={`border-2 border-dashed rounded-xl px-4 py-6 text-center cursor-pointer transition-colors ${
                isImageDragActive
                  ? 'border-brand-400 bg-brand-50'
                  : imageUpload
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
              }`}
            >
              <input {...getImageInputProps()} />
              {imageUpload ? (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 truncate">{imageUpload.fileName}</p>
                  {imageUpload.error ? (
                    <p className="text-xs text-red-500">{imageUpload.error}</p>
                  ) : (
                    <p className="text-xs text-gray-400">Uploading…</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {isImageDragActive ? 'Drop photo here' : 'Drop a photo or click to select'}
                  <span className="block text-xs text-gray-400 mt-0.5">JPG, PNG, WebP · max 10 MB</span>
                </p>
              )}
            </div>
          </div>

          {/* Video upload */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Video</p>
            <div
              {...getVideoRootProps()}
              className={`border-2 border-dashed rounded-xl px-4 py-6 text-center cursor-pointer transition-colors ${
                isVideoDragActive
                  ? 'border-brand-400 bg-brand-50'
                  : videoUpload
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
              }`}
            >
              <input {...getVideoInputProps()} />
              {videoUpload ? (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 truncate">{videoUpload.fileName}</p>
                  {videoUpload.error ? (
                    <p className="text-xs text-red-500">{videoUpload.error}</p>
                  ) : (
                    <p className="text-xs text-gray-400">Uploading…</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {isVideoDragActive
                    ? 'Drop video here'
                    : child.videoUrl
                    ? 'Drop a new video to replace'
                    : 'Drop a video or click to select'}
                  <span className="block text-xs text-gray-400 mt-0.5">MP4, MOV, WebM · max 500 MB</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

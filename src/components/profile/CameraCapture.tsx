import { useState, useRef, useEffect, useCallback } from 'react';
import { uploadMedia } from '@/services/storage';
import { addPhotoUrl, updateChild } from '@/services/children';
import { useToast } from '@/components/shared/Toaster';
import type { ChildProfile } from '@/types';

interface Props {
  child: ChildProfile;
  userId: string;
  onUpdate: () => void;
}

type CameraState = 'idle' | 'preview' | 'recording' | 'uploading' | 'done' | 'error';

const MAX_RECORD_SECONDS = 120;

function getSupportedMimeType(): string {
  const candidates = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export default function CameraCapture({ child, userId, onUpdate }: Props) {
  const { toast } = useToast();
  const [camState, setCamState] = useState<CameraState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MAX_RECORD_SECONDS);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unloadRef = useRef<((e: BeforeUnloadEvent) => void) | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (unloadRef.current) { window.removeEventListener('beforeunload', unloadRef.current); unloadRef.current = null; }
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  async function openCamera() {
    setError(null);
    setCamState('preview');

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not supported in this browser.');
      setCamState('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      const msg = e instanceof Error && e.name === 'NotAllowedError'
        ? 'Camera access was denied. Allow camera access in your browser settings and try again.'
        : 'Could not access camera. Your browser or device may not support this feature.';
      setError(msg);
      setCamState('error');
    }
  }

  function closeCamera() {
    stopStream();
    setCamState('idle');
    setError(null);
    setProgress(0);
    setTimeLeft(MAX_RECORD_SECONDS);
  }

  function addUnloadGuard() {
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    unloadRef.current = handler;
    window.addEventListener('beforeunload', handler);
  }

  function removeUnloadGuard() {
    if (unloadRef.current) {
      window.removeEventListener('beforeunload', unloadRef.current);
      unloadRef.current = null;
    }
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const scale = Math.min(1, 1200 / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      stopStream();
      setCamState('uploading');
      setProgress(0);
      addUnloadGuard();
      try {
        const url = await uploadMedia({
          stateId: child.stateId,
          childId: child.id,
          file: blob,
          uploadedBy: userId,
          captureMethod: 'in_app_camera',
          onProgress: setProgress,
        });
        await addPhotoUrl(child.stateId, child.id, url, userId);
        removeUnloadGuard();
        setCamState('done');
        toast('Photo saved', 'success');
        onUpdate();
      } catch (e) {
        removeUnloadGuard();
        setError(e instanceof Error ? e.message : 'Upload failed');
        setCamState('error');
      }
    }, 'image/jpeg', 0.85);
  }

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

    recorder.onstop = async () => {
      const effectiveMime = mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: effectiveMime });
      chunksRef.current = [];
      stopStream();
      setCamState('uploading');
      setProgress(0);
      addUnloadGuard();
      try {
        const url = await uploadMedia({
          stateId: child.stateId,
          childId: child.id,
          file: blob,
          uploadedBy: userId,
          captureMethod: 'in_app_camera',
          onProgress: setProgress,
        });
        await updateChild(child.stateId, child.id, { videoUrl: url }, userId);
        removeUnloadGuard();
        setCamState('done');
        toast('Video saved', 'success');
        onUpdate();
      } catch (e) {
        removeUnloadGuard();
        setError(e instanceof Error ? e.message : 'Upload failed');
        setCamState('error');
      }
    };

    recorder.start(1000);
    setCamState('recording');
    setTimeLeft(MAX_RECORD_SECONDS);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  function formatTime(s: number): string {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  if (camState === 'idle') {
    return (
      <div className="text-center py-6 space-y-2">
        <button
          onClick={openCamera}
          className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Open Camera
        </button>
        <p className="text-xs text-gray-400">Media is never saved to your device</p>
      </div>
    );
  }

  if (camState === 'uploading') {
    return (
      <div className="py-6 space-y-3">
        <p className="text-sm text-gray-500 text-center">Uploading…</p>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-brand-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 text-center">{progress}%</p>
      </div>
    );
  }

  if (camState === 'done') {
    return (
      <div className="py-6 text-center space-y-3">
        <p className="text-sm text-green-600">Saved successfully</p>
        <button onClick={closeCamera} className="text-sm text-brand-600 hover:underline">
          Capture another
        </button>
      </div>
    );
  }

  if (camState === 'error') {
    return (
      <div className="py-6 text-center space-y-3">
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={closeCamera} className="text-sm text-gray-500 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  // preview and recording states
  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
        <video
          ref={videoRef}
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {camState === 'recording' && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-sm font-mono tabular-nums bg-black/50 px-2 py-0.5 rounded">
              {formatTime(timeLeft)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={closeCamera}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Cancel
        </button>

        {camState === 'preview' && (
          <div className="flex gap-2">
            <button
              onClick={capturePhoto}
              className="text-sm bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Take Photo
            </button>
            <button
              onClick={startRecording}
              className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-colors"
            >
              Record Video
            </button>
          </div>
        )}

        {camState === 'recording' && (
          <button
            onClick={stopRecording}
            className="text-sm bg-red-500 text-white px-4 py-1.5 rounded-lg hover:bg-red-600 transition-colors"
          >
            Stop Recording
          </button>
        )}
      </div>
    </div>
  );
}

export type CameraErrorKind =
  'denied' | 'not_found' | 'in_use' | 'insecure' | 'unknown';

export class CameraError extends Error {
  constructor(
    public readonly kind: CameraErrorKind,
    message: string
  ) {
    super(message);
  }
}

export async function openCamera(deviceId?: string): Promise<MediaStream> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    throw new CameraError(
      'insecure',
      'Camera API is not available (HTTPS is required).'
    );
  }
  const video: MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 30 },
    ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }),
  };
  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio: false });
  } catch (error) {
    const name = (error as DOMException)?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError')
      throw new CameraError('denied', String(error));
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      if (deviceId) return openCamera();
      throw new CameraError('not_found', String(error));
    }
    if (name === 'NotReadableError' || name === 'AbortError')
      throw new CameraError('in_use', String(error));
    throw new CameraError('unknown', String(error));
  }
}

export async function listCameras(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'videoinput');
}

export async function cameraPermission(): Promise<PermissionState | 'unknown'> {
  try {
    const status = await navigator.permissions.query({
      name: 'camera' as PermissionName,
    });
    return status.state;
  } catch {
    return 'unknown';
  }
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}

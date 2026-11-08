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

/**
 * ブラウザのアドレスバー等でカメラ権限が「許可（granted）」に変更された瞬間を検知し、
 * 再読み込みや手動の再試行なしでカメラを起動できるようにする。
 */
export function watchCameraPermission(
  onGranted: () => void,
  nav: { permissions?: Permissions } = typeof navigator !== 'undefined'
    ? navigator
    : {}
): () => void {
  let disposed = false;
  let activeStatus: Pick<PermissionStatus, 'onchange'> | null = null;
  if (!nav.permissions?.query) return () => undefined;

  void nav.permissions
    .query({ name: 'camera' as PermissionName })
    .then((status) => {
      if (disposed) return;
      activeStatus = status;
      status.onchange = () => {
        if (!disposed && status.state === 'granted') {
          onGranted();
        }
      };
    })
    .catch(() => undefined);

  return () => {
    disposed = true;
    if (activeStatus) {
      activeStatus.onchange = null;
    }
  };
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}

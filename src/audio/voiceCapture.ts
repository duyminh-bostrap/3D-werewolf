export const MICROPHONE_CONSTRAINTS: MediaStreamConstraints = {
  audio: { channelCount: { ideal: 1 }, echoCancellation: true, noiseSuppression: true, autoGainControl: false },
};

export function microphoneConstraints(device: Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'> = navigator): MediaStreamConstraints {
  const isIOS = /iPhone|iPad|iPod/.test(device.userAgent) || (device.platform === 'MacIntel' && device.maxTouchPoints > 1);
  // WebKit #326286: echo-cancelled capture crackles across all playback on iOS.
  return isIOS ? { audio: { channelCount: { ideal: 1 }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } } : MICROPHONE_CONSTRAINTS;
}

export async function attachMicrophone(pc: RTCPeerConnection, stream: MediaStream): Promise<void> {
  const track = stream.getAudioTracks()[0];
  if (!track) return;
  const sender = pc.getSenders().find((item) => item.track?.kind === 'audio');
  if (!sender) pc.addTrack(track, stream);
  else if (sender.track !== track) await sender.replaceTrack(track);
}

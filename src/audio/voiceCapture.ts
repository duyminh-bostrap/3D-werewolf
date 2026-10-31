export const MICROPHONE_CONSTRAINTS: MediaStreamConstraints = {
  audio: { channelCount: { ideal: 1 }, echoCancellation: true, noiseSuppression: true, autoGainControl: false },
};

export function microphoneConstraints(device: Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'> = navigator): MediaStreamConstraints {
  const isIOS = /iPhone|iPad|iPod/.test(device.userAgent) || (device.platform === 'MacIntel' && device.maxTouchPoints > 1);
  // WebKit #326286: echo-cancelled capture crackles across all playback on iOS.
  return isIOS ? { audio: { channelCount: { ideal: 1 }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } } : MICROPHONE_CONSTRAINTS;
}

export function clampMicVolume(volume: number): number {
  return Number.isFinite(volume) ? Math.max(0, Math.min(3, volume)) : 1;
}

export function amplifyMicrophone(ctx: AudioContext, raw: MediaStream, volume: number) {
  const source = ctx.createMediaStreamSource(raw);
  const gain = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor();
  const destination = ctx.createMediaStreamDestination();
  gain.gain.value = clampMicVolume(volume);
  limiter.threshold.value = -6;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.1;
  // This graph only feeds WebRTC; never monitor the microphone through speakers.
  source.connect(gain).connect(limiter).connect(destination);
  return { stream: destination.stream,
    setVolume(value: number) { gain.gain.setTargetAtTime(clampMicVolume(value), ctx.currentTime, 0.04); },
    stop() { source.disconnect(); gain.disconnect(); limiter.disconnect(); destination.disconnect(); destination.stream.getTracks().forEach(track => track.stop()); },
  };
}

export async function attachMicrophone(pc: RTCPeerConnection, stream: MediaStream): Promise<void> {
  const track = stream.getAudioTracks()[0];
  if (!track) return;
  const sender = pc.getSenders().find((item) => item.track?.kind === 'audio');
  if (!sender) pc.addTrack(track, stream);
  else if (sender.track !== track) await sender.replaceTrack(track);
}

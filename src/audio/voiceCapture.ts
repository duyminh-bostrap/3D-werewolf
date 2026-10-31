export const MICROPHONE_CONSTRAINTS: MediaStreamConstraints = {
  audio: { channelCount: { ideal: 1 }, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
};

export async function attachMicrophone(pc: RTCPeerConnection, stream: MediaStream): Promise<void> {
  const track = stream.getAudioTracks()[0];
  if (!track) return;
  const sender = pc.getSenders().find((item) => item.track?.kind === 'audio');
  if (!sender) pc.addTrack(track, stream);
  else if (sender.track !== track) await sender.replaceTrack(track);
}

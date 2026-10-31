import test from 'node:test';
import assert from 'node:assert/strict';
import { attachMicrophone, MICROPHONE_CONSTRAINTS } from './voiceCapture';

test('microphone uses mono capture with browser echo/noise/gain processing', () => {
  const audio = MICROPHONE_CONSTRAINTS.audio as MediaTrackConstraints;
  assert.deepEqual(audio.channelCount, { ideal: 1 });
  assert.equal(audio.echoCancellation, true);
  assert.equal(audio.noiseSuppression, true);
  assert.equal(audio.autoGainControl, true);
});
test('repeated microphone attachment never adds duplicate audio senders', async () => {
  const track = { kind: 'audio' } as MediaStreamTrack;
  const replacement = { kind: 'audio' } as MediaStreamTrack;
  let adds = 0, replacements = 0;
  const senders: Array<{track: MediaStreamTrack; replaceTrack: (track: MediaStreamTrack) => Promise<void>}> = [];
  const pc = { getSenders: () => senders, addTrack: (track: MediaStreamTrack) => {
    adds++;
    const sender = { track, replaceTrack: async (next: MediaStreamTrack) => { replacements++; sender.track = next; } };
    senders.push(sender);
  } } as unknown as RTCPeerConnection;
  const stream = (track: MediaStreamTrack) => ({getAudioTracks: () => [track]}) as MediaStream;
  await attachMicrophone(pc, stream(track));
  await attachMicrophone(pc, stream(track));
  await attachMicrophone(pc, stream(replacement));
  assert.equal(adds, 1); assert.equal(replacements, 1); assert.equal(senders.length, 1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { attachMicrophone, MICROPHONE_CONSTRAINTS, microphoneConstraints, clampMicVolume } from './voiceCapture';

test('mic volume clamps persisted and slider values to a finite 0–300% range', () => {
  assert.equal(clampMicVolume(-1), 0);
  assert.equal(clampMicVolume(0), 0);
  assert.equal(clampMicVolume(2), 2);
  assert.equal(clampMicVolume(4), 3);
  assert.equal(clampMicVolume(NaN), 1);
});

test('microphone uses mono echo/noise processing without automatic gain boosts', () => {
  const audio = MICROPHONE_CONSTRAINTS.audio as MediaTrackConstraints;
  assert.deepEqual(audio.channelCount, { ideal: 1 });
  assert.equal(audio.echoCancellation, true);
  assert.equal(audio.noiseSuppression, true);
  assert.equal(audio.autoGainControl, false);
});

test('iPhone and desktop-mode iPad bypass the WebKit voice-processing crackle path', () => {
  for (const device of [
    { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 },
    { userAgent: 'Mozilla/5.0 Macintosh', platform: 'MacIntel', maxTouchPoints: 5 },
  ]) {
    const audio = microphoneConstraints(device).audio as MediaTrackConstraints;
    assert.equal(audio.echoCancellation, false);
    assert.equal(audio.noiseSuppression, false);
    assert.equal(audio.autoGainControl, false);
  }
  for (const device of [
    { userAgent: 'Android', platform: 'Linux', maxTouchPoints: 5 },
    { userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 0 },
  ]) assert.equal(microphoneConstraints(device), MICROPHONE_CONSTRAINTS);
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

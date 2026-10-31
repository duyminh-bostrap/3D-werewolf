import test from 'node:test';
import assert from 'node:assert/strict';
import { soundEngine } from './soundEngine';

test('voice analysis reuses one game AudioContext, including while music is muted', () => {
  let created = 0;
  class FakeContext {
    state = 'running';
    constructor(options: AudioContextOptions) { created++; assert.equal(options.latencyHint, 'balanced'); }
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { AudioContext: FakeContext } });
  try {
    const first = soundEngine.getVoiceAnalysisContext();
    assert.equal(soundEngine.getVoiceAnalysisContext(), first);
    soundEngine.setMuted(true);
    assert.equal(soundEngine.getVoiceAnalysisContext(), first);
    assert.equal(created, 1);
  } finally {
    Reflect.deleteProperty(globalThis, 'window');
  }
});

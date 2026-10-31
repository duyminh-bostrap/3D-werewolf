import test from 'node:test';
import assert from 'node:assert/strict';
import { soundEngine } from './soundEngine';

test('one shared AudioContext and master volume control cover music, effects and mute', () => {
  let created = 0;
  let outputLevel = 1;
  let music: { volume: number } | null = null;
  class FakeContext {
    state = 'running';
    currentTime = 0;
    destination = {};
    constructor(options: AudioContextOptions) { created++; assert.equal(options.latencyHint, 'balanced'); }
    createGain() { return { gain: { value: 1, setTargetAtTime: (value: number) => { outputLevel = value; } }, connect: () => {} }; }
  }
  class FakeAudio {
    volume = 1; paused = true;
    constructor() { music = this; }
    addEventListener() {}
    async play() { this.paused = false; }
    pause() { this.paused = true; }
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { AudioContext: FakeContext, addEventListener: () => {} } });
  Object.defineProperty(globalThis, 'Audio', { configurable: true, value: FakeAudio });
  try {
    const first = soundEngine.getVoiceAnalysisContext();
    assert.equal(soundEngine.getVoiceAnalysisContext(), first);
    soundEngine.setMuted(true);
    assert.equal(soundEngine.getVoiceAnalysisContext(), first);
    assert.equal(created, 1);
    soundEngine.setCustomLoopTrack('/test.mp3');
    soundEngine.setVolume(0.25);
    assert.equal(outputLevel, 0);
    soundEngine.setMuted(false);
    assert.equal(outputLevel, 0.25);
    assert.equal(music!.volume, 0.42 * 0.25);
    soundEngine.setVolume(0.6);
    assert.equal(outputLevel, 0.6);
    assert.equal(music!.volume, 0.42 * 0.6);
    soundEngine.setMuted(true);
    assert.equal(outputLevel, 0);
    assert.equal(music!.volume, 0);
    soundEngine.setMuted(false);
    assert.equal(outputLevel, 0.6);
    soundEngine.setVolume(-1); assert.equal(outputLevel, 0);
    soundEngine.setVolume(2); assert.equal(outputLevel, 1);
    soundEngine.setVolume(Number.NaN); assert.equal(outputLevel, 1);
  } finally {
    Reflect.deleteProperty(globalThis, 'window');
    Reflect.deleteProperty(globalThis, 'Audio');
  }
});

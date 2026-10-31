import test from 'node:test';
import assert from 'node:assert/strict';
import { soundEngine } from './soundEngine';

test('one shared AudioContext and master volume control cover music, effects and mute', () => {
  let created = 0;
  let outputLevel = 1;
  let music: { volume: number; paused: boolean } | null = null;
  let mediaSources = 0;
  let volumeWrites = 0;
  const connections: Array<[unknown, unknown]> = [];
  const gains: Array<{gain: {value:number; setTargetAtTime:(value:number)=>void}; connect:(target:unknown)=>void}> = [];
  class FakeContext {
    state = 'running';
    currentTime = 0;
    destination = {};
    constructor(options: AudioContextOptions) { created++; assert.equal(options.latencyHint, 'balanced'); }
    createGain() {
      const isMaster = gains.length === 0;
      const node = { gain: { value: 1, setTargetAtTime: (value: number) => { if (isMaster) outputLevel = value; } }, connect: (target: unknown) => { connections.push([node, target]); } };
      gains.push(node); return node;
    }
    createMediaElementSource(element: unknown) { mediaSources++; return {connect: (target: unknown) => {connections.push([element, target]);}}; }
  }
  class FakeAudio {
    get volume() { return 1; }
    set volume(_value: number) { volumeWrites++; }
    paused = true;
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
    assert.equal(gains[1].gain.value, 0.42);
    assert.ok(connections.some(([source, target]) => source === music && target === gains[1]));
    assert.ok(connections.some(([source, target]) => source === gains[1] && target === gains[0]));
    soundEngine.setVolume(0.6);
    assert.equal(outputLevel, 0.6);
    assert.equal(music!.volume, 1);
    soundEngine.setMuted(true);
    assert.equal(outputLevel, 0);
    assert.equal(music!.paused, true);
    soundEngine.setMuted(false);
    assert.equal(outputLevel, 0.6);
    soundEngine.setVolume(-1); assert.equal(outputLevel, 0);
    soundEngine.setVolume(2); assert.equal(outputLevel, 1);
    soundEngine.setVolume(Number.NaN); assert.equal(outputLevel, 1);
    soundEngine.setCustomLoopTrack('/other.mp3');
    assert.equal(mediaSources, 1);
    assert.equal(volumeWrites, 0, 'must work even when iOS ignores HTML audio volume');
  } finally {
    Reflect.deleteProperty(globalThis, 'window');
    Reflect.deleteProperty(globalThis, 'Audio');
  }
});

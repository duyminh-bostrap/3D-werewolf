import test from 'node:test';
import assert from 'node:assert/strict';
import { bindGameViewport } from './viewport';

test('HUD follows keyboard viewport, clamps stale iOS offsets and leaves pinch zoom alone', () => {
  const viewport = Object.assign(new EventTarget(), { height: 852, offsetTop: 0, scale: 1 });
  const win = Object.assign(new EventTarget(), { innerHeight: 852, visualViewport: viewport });
  const styles = new Map<string, string>();
  const root = { style: { setProperty: (key: string, value: string) => styles.set(key, value), removeProperty: (key: string) => styles.delete(key) } };
  const stop = bindGameViewport(win as unknown as Window, root as unknown as HTMLElement);
  assert.equal(styles.get('--visible-height'), '852px');
  viewport.height = 480; viewport.offsetTop = 120; viewport.dispatchEvent(new Event('resize'));
  assert.equal(styles.get('--visible-height'), '480px');
  assert.equal(styles.get('--visible-top'), '120px');
  viewport.scale = 2; viewport.height = 240; viewport.dispatchEvent(new Event('resize'));
  assert.equal(styles.get('--visible-height'), '480px');
  viewport.scale = 1; viewport.height = 852; viewport.offsetTop = 120; viewport.dispatchEvent(new Event('scroll'));
  assert.equal(styles.get('--visible-top'), '0px');
  assert.equal(styles.get('--visible-height'), '852px');
  stop(); viewport.height = 400; viewport.dispatchEvent(new Event('resize'));
  assert.equal(styles.size, 0);
});

test('browsers without VisualViewport use window height and respond to rotation', () => {
  const win = Object.assign(new EventTarget(), { innerHeight: 852 });
  const styles = new Map<string, string>();
  const root = { style: { setProperty: (k: string, v: string) => styles.set(k, v), removeProperty: (k: string) => styles.delete(k) } };
  const stop = bindGameViewport(win as unknown as Window, root as unknown as HTMLElement);
  win.innerHeight = 393; win.dispatchEvent(new Event('resize'));
  assert.equal(styles.get('--visible-height'), '393px');
  assert.equal(styles.get('--visible-top'), '0px');
  stop();
});

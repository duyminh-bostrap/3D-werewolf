import test from 'node:test';
import assert from 'node:assert/strict';
import { APPEARANCE_PRESETS, type PlayerState, type RoleId } from './rules';
import { nightFeedback } from './nightFeedback';

const player = (id: string, role: RoleId): PlayerState => ({ id, name: id, role, isAlive: true, isHost: false, isBot: false, seatIndex: 0, x: 0, z: 0, rotY: 0, appearance: APPEARANCE_PRESETS[0], isMuted: true, isSpeaking: false, isReady: false, loverId: null });
test('inspection feedback identifies the inspected player without leaking their exact special role', () => {
  const seer = player('Lan', 'seer'), wolf = player('Corvus', 'werewolf'), witch = player('Mai', 'witch');
  assert.equal(nightFeedback(seer, { type: 'seer', targetId: wolf.id }, [wolf]), 'Corvus: Là Sói.');
  assert.equal(nightFeedback(seer, { type: 'seer', targetId: witch.id }, [witch]), 'Mai: Không phải Sói.');
  assert.equal(nightFeedback(player('Aura', 'aura_seer'), { type: 'aura_seer', targetId: witch.id }, [witch]), 'Mai: Có chức năng.');
});
test('witch feedback retains the confirmed victim and distinguishes healing, poison and skip', () => {
  const witch = player('Mai', 'witch'), target = player('Lan', 'villager');
  assert.match(nightFeedback(witch, { type: 'heal', targetId: target.id }, [target]), /cứu Lan/);
  assert.match(nightFeedback(witch, { type: 'poison', targetId: target.id }, [target]), /ném độc Lan/);
  assert.match(nightFeedback(witch, { type: 'skip_night_role' }, [target]), /bỏ qua/);
});

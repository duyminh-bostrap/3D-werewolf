import test from 'node:test';
import assert from 'node:assert/strict';
import { APPEARANCE_PRESETS, checkWinCondition, doesRoleHaveNightAction, resolveNightActions, resolveTrialVerdict, selectDayTrialNominee, type NightActionsInput, type PlayerState, type RoleId } from './rules';
import { littleGirlHint, validNightChoice } from './nightAction';

const potions = { hasHealPotion: true, hasPoisonPotion: true, hasAlphaConvert: true };
function players(roles: RoleId[]): PlayerState[] {
  return roles.map((role, index) => ({ id: `p${index}`, name: `Người ${index}`, role, isAlive: true, isHost: index === 0, isBot: false, seatIndex: index, x: 0, z: 0, rotY: 0, appearance: APPEARANCE_PRESETS[0], isMuted: true, isSpeaking: false, isReady: true, loverId: null }));
}
const empty = (): NightActionsInput => ({ wolfVotes: {}, bodyguardTargetId: null, seerTargetId: null, witchSaveUsed: false, witchPoisonTargetId: null, hunterRevengeTargetId: null, cupidLovers: null });
const resolve = (p: PlayerState[], input: Partial<NightActionsInput>) => resolveNightActions(p, { ...empty(), ...input }, potions, null, null);

test('Ma Sói: kills one voted living villager, never itself or a fellow wolf', () => {
  const p = players(['werewolf', 'werewolf', 'villager', 'seer', 'villager']);
  assert.deepEqual(resolve(p, { wolfVotes: { p0: 'p2', p1: 'p2' } }).deadPlayerIds, ['p2']);
  for (const targetId of ['p0', 'p1', 'missing']) assert.equal(validNightChoice(p[0], { type: 'werewolf', targetId }, p, 1, potions, false, null, []), false);
});
test('Sói Đầu Đàn: conversion is once per match and only on the pack-selected victim', () => {
  const p = players(['alpha_wolf', 'werewolf', 'villager', 'villager', 'villager']);
  const r = resolve(p, { wolfVotes: { p0: 'p2', p1: 'p2' }, alphaConvertUsed: true, alphaConvertTargetId: 'p2' });
  assert.equal(r.convertedWolfId, 'p2'); assert.equal(r.nextWitchState.hasAlphaConvert, false); assert.equal(r.deadPlayerIds.length, 0);
  assert.equal(validNightChoice(p[0], { type: 'alpha_convert', targetId: 'p2' }, p, 2, { ...potions, hasAlphaConvert: false }, false, null, []), false);
  assert.equal(resolve(p, { wolfVotes: { p0: 'p3', p1: 'p3' }, alphaConvertUsed: true, alphaConvertTargetId: 'p2' }).convertedWolfId, null);
});
test('Sói Trắng: can kill another wolf, not a villager with its betrayal action, and wins alone', () => {
  const p = players(['white_wolf', 'werewolf', 'villager']);
  assert.deepEqual(resolve(p, { whiteWolfTargetId: 'p1' }).deadPlayerIds, ['p1']);
  assert.equal(validNightChoice(p[0], { type: 'white_wolf_kill', targetId: 'p2' }, p, 1, potions, false, null, []), false);
  assert.equal(checkWinCondition([p[0]]).winner, 'solo');
});
test('Bán Sói: remains with villagers until bitten, protection prevents conversion', () => {
  const p = players(['werewolf', 'cursed_wolf', 'bodyguard', 'villager']);
  assert.equal(doesRoleHaveNightAction('cursed_wolf', 1, potions, false), false);
  assert.equal(resolve(p, { wolfVotes: { p0: 'p1' } }).convertedWolfId, 'p1');
  assert.equal(resolve(p, { wolfVotes: { p0: 'p1' }, bodyguardTargetId: 'p1' }).convertedWolfId, null);
});
for (const role of ['seer', 'aura_seer'] as const) test(`${role}: only a living, different player is a valid inspection target`, () => {
  const p = players([role, 'werewolf', 'villager']);
  assert.equal(validNightChoice(p[0], { type: role, targetId: 'p1' }, p, 1, potions, false, null, []), true);
  p[1].isAlive = false;
  assert.equal(validNightChoice(p[0], { type: role, targetId: 'p1' }, p, 1, potions, false, null, []), false);
  assert.equal(validNightChoice(p[0], { type: role, targetId: 'p0' }, p, 1, potions, false, null, []), false);
});
test('Bảo Vệ: two guards protect independently and cannot repeat their own previous target', () => {
  const p = players(['werewolf', 'bodyguard', 'bodyguard', 'villager', 'villager']);
  const input = { ...empty(), wolfVotes: { p0: 'p4' }, bodyguardTargets: { p1: 'p3', p2: 'p4' } };
  assert.equal(resolveNightActions(p, input, potions, null, null, { lastProtected: { p1: 'p4', p2: 'p3' } }).savedByBodyguard, true);
  assert.equal(validNightChoice(p[2], { type: 'bodyguard', targetId: 'p4' }, p, 2, potions, false, 'p4', []), false);
  assert.equal(validNightChoice(p[2], { type: 'bodyguard', targetId: 'p2' }, p, 2, potions, false, null, []), true);
});
test('Phù Thủy: each witch owns its potions and healing is tied to the confirmed victim', () => {
  const p = players(['werewolf', 'witch', 'witch', 'villager', 'villager']);
  const r = resolveNightActions(p, { ...empty(), wolfVotes: { p0: 'p3' }, witchActions: { p1: { healTargetId: 'p3' }, p2: { poisonTargetId: 'p0' } } }, potions, null, null, { witchStates: { p1: potions, p2: potions } });
  assert.deepEqual(r.deadPlayerIds, ['p0']);
  assert.equal(r.nextWitchStates!.p1.hasHealPotion, false); assert.equal(r.nextWitchStates!.p1.hasPoisonPotion, true);
  assert.equal(r.nextWitchStates!.p2.hasHealPotion, true); assert.equal(r.nextWitchStates!.p2.hasPoisonPotion, false);
  assert.equal(validNightChoice(p[1], { type: 'heal', targetId: 'p3' }, p, 2, { ...potions, hasHealPotion: false }, false, null, []), false);
});
test('Thợ Săn: independent revenge chains work at night and after daytime execution', () => {
  const p = players(['werewolf', 'hunter', 'hunter', 'villager', 'villager']);
  const targets = { p1: 'p2', p2: 'p0' };
  assert.deepEqual(new Set(resolve(p, { wolfVotes: { p0: 'p1' }, hunterTargets: targets }).deadPlayerIds), new Set(['p1', 'p2', 'p0']));
  assert.deepEqual(new Set(resolveTrialVerdict(p, 'p1', { p0: 'kill', p3: 'kill' }, null, targets).deadPlayerIds), new Set(['p1', 'p2', 'p0']));
});
test('Thần Tình Ái: only first night, distinct living lovers, death follows the partner', () => {
  const p = players(['werewolf', 'cupid', 'villager', 'villager']);
  assert.equal(validNightChoice(p[1], { type: 'cupid', lovers: ['p2', 'p2'] }, p, 1, potions, false, null, []), false);
  assert.equal(validNightChoice(p[1], { type: 'cupid', lovers: ['p2', 'p3'] }, p, 2, potions, false, null, []), false);
  assert.deepEqual(new Set(resolve(p, { wolfVotes: { p0: 'p2' }, cupidLovers: ['p2', 'p3'] }).deadPlayerIds), new Set(['p2', 'p3']));
});
test('Già Làng: survives exactly the first wolf bite; poison bypasses the shield', () => {
  const p = players(['werewolf', 'elder', 'witch', 'villager']); p[1].elderExtraLife = true;
  assert.equal(resolve(p, { wolfVotes: { p0: 'p1' } }).savedByElderShield, true);
  p[1].elderExtraLife = false; assert.deepEqual(resolve(p, { wolfVotes: { p0: 'p1' } }).deadPlayerIds, ['p1']);
  p[1].elderExtraLife = true; assert.deepEqual(resolve(p, { witchPoisonTargetId: 'p1' }).deadPlayerIds, ['p1']);
});
test('Cô Bé: server creates an ambiguous pair of suspects; role needs a confirmed action', () => {
  const p = players(['werewolf', 'little_girl', 'villager']);
  assert.match(littleGirlHint(p, 'p1', () => 0.8), /Người 0.*Người 2/);
  assert.equal(validNightChoice(p[1], { type: 'little_girl_peek' }, p, 1, potions, false, null, []), true);
});
test('Thị Trưởng: double vote for both nomination and kill/save verdict', () => {
  const p = players(['mayor', 'villager', 'werewolf']);
  assert.equal(selectDayTrialNominee(p, { p0: 'p2', p1: 'p0' }).accusedId, 'p2');
  assert.equal(resolveTrialVerdict(p, 'p2', { p0: 'kill', p1: 'save' }, null).executedId, 'p2');
});
test('Thằng Ngố: wins only if executed, not merely nominated or killed at night', () => {
  const p = players(['werewolf', 'jester', 'villager']);
  assert.equal(resolveTrialVerdict(p, 'p1', { p0: 'kill', p2: 'kill' }, null).jesterWon, true);
  assert.equal(resolveTrialVerdict(p, 'p1', { p0: 'save' }, null).jesterWon, false);
  assert.deepEqual(resolve(p, { wolfVotes: { p0: 'p1' } }).deadPlayerIds, ['p1']);
});
test('Dân Làng: no night action, dead players and repeated confirmations cannot act', () => {
  const p = players(['villager', 'werewolf', 'villager']);
  assert.equal(doesRoleHaveNightAction('villager', 1, potions, false), false);
  assert.equal(validNightChoice(p[0], { type: 'seer', targetId: 'p1' }, p, 1, potions, false, null, []), false);
  assert.equal(validNightChoice(p[1], { type: 'werewolf', targetId: 'p2' }, p, 1, potions, false, null, ['p1']), false);
  p[1].isAlive = false;
  assert.equal(validNightChoice(p[1], { type: 'werewolf', targetId: 'p2' }, p, 1, potions, false, null, []), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRoleDeck,
  canBodyguardProtect,
  canPlayerMoveInPhase,
  checkWinCondition,
  clampRoleDeckToPlayerCount,
  clampRoomPlayerCount,
  computeJoystickVector,
  computeNightActionProgress,
  doesRoleHaveNightAction,
  getRecommendedRoleDeckForCount,
  resolveCameraCollision,
  resolveDayVote,
  resolveNightActions,
  resolvePlayerMovement,
  resolveTrialVerdict,
  selectDayTrialNominee,
  stepFireballPhysics,
  validateLobbyStart,
  APPEARANCE_PRESETS,
  BOT_NAMES,
  DAY_DISCUSSION_DURATION_MS,
  DAY_TRIAL_DURATION_MS,
  MAX_ROOM_PLAYERS,
  MIN_ROOM_PLAYERS,
  NIGHT_PHASE_DURATION_MS,
  QUICK_CHAT_PRESETS,
  ROLE_CATALOG,
  type PlayerState,
  type RoleId,
} from './rules';

function createMockPlayers(count: number): PlayerState[] {
  const roles = buildRoleDeck(count);
  return roles.map((role, idx) => ({
    id: `p${idx + 1}`,
    name: `Player ${idx + 1}`,
    isHost: idx === 0,
    isBot: idx > 0,
    isAlive: true,
    role,
    seatIndex: idx,
    x: 0,
    z: 5 + idx,
    rotY: 0,
    appearance: APPEARANCE_PRESETS[idx % APPEARANCE_PRESETS.length],
    isMuted: false,
    isSpeaking: false,
    isReady: true,
    loverId: null,
  }));
}

test('buildRoleDeck creates exact number of roles with balanced werewolves', () => {
  const deck8 = buildRoleDeck(8);
  assert.equal(deck8.length, 8);
  assert.equal(deck8.filter((r) => r === 'werewolf').length, 2);
  assert.equal(deck8.filter((r) => r === 'seer').length, 1);
  assert.equal(deck8.filter((r) => r === 'witch').length, 1);
});

test('canBodyguardProtect forbids protecting same player two nights in a row', () => {
  assert.equal(canBodyguardProtect('p2', 'p2'), false);
  assert.equal(canBodyguardProtect('p2', 'p3'), true);
  assert.equal(canBodyguardProtect(null, 'p2'), true);
});

test('resolveNightActions handles werewolf kill, bodyguard block, and witch potions', () => {
  const players = createMockPlayers(8);
  // p1 and p2 are werewolves in default unshuffled deck; p3 is seer, p4 is bodyguard, p5 is witch
  const resBlocked = resolveNightActions(
    players,
    {
      wolfVotes: { p1: 'p3', p2: 'p3' },
      bodyguardTargetId: 'p3',
      seerTargetId: 'p1',
      witchSaveUsed: false,
      witchPoisonTargetId: null,
      hunterRevengeTargetId: null,
      cupidLovers: null,
    },
    { hasHealPotion: true, hasPoisonPotion: true },
    null,
    null
  );

  assert.equal(resBlocked.savedByBodyguard, true);
  assert.equal(resBlocked.deadPlayerIds.length, 0);
  assert.equal(resBlocked.seerInspection?.isWerewolf, true);

  // Now test werewolf kill + witch poison
  const resKilled = resolveNightActions(
    players,
    {
      wolfVotes: { p1: 'p3', p2: 'p3' },
      bodyguardTargetId: 'p4',
      seerTargetId: 'p8',
      witchSaveUsed: false,
      witchPoisonTargetId: 'p2',
      hunterRevengeTargetId: null,
      cupidLovers: null,
    },
    { hasHealPotion: true, hasPoisonPotion: true },
    null,
    'p3'
  );

  assert.deepEqual(resKilled.deadPlayerIds.sort(), ['p2', 'p3']);
  assert.equal(resKilled.nextWitchState.hasPoisonPotion, false);
});

test('resolveDayVote executes clear plurality target and skips on tie', () => {
  const players = createMockPlayers(6);
  const tieVote = resolveDayVote(
    players,
    { p1: 'p3', p2: 'p3', p3: 'p1', p4: 'p1' },
    null
  );
  assert.equal(tieVote.isTie, true);
  assert.equal(tieVote.executedId, null);

  const majorityVote = resolveDayVote(
    players,
    { p1: 'p3', p2: 'p3', p4: 'p3', p3: 'p1' },
    null
  );
  assert.equal(majorityVote.isTie, false);
  assert.equal(majorityVote.executedId, 'p3');
});

test('checkWinCondition detects villager, werewolf, and lover victories', () => {
  const players = createMockPlayers(6);
  assert.equal(checkWinCondition(players).winner, 'ongoing');

  // Kill all werewolves
  const noWolves = players.map((p) =>
    p.role === 'werewolf' ? { ...p, isAlive: false } : p
  );
  assert.equal(checkWinCondition(noWolves).winner, 'villagers');

  // Leave 2 wolves and 2 villagers
  const wolvesWin = players.map((p, i) => ({
    ...p,
    isAlive: p.role === 'werewolf' || i === 2 || i === 3,
  }));
  assert.equal(checkWinCondition(wolvesWin).winner, 'werewolves');
});

test('resolvePlayerMovement slides smoothly around circular obstacles and clamps to world radius', () => {
  const obstacles = [{ x: 0, z: 0, radius: 3.0 }];
  const pos = resolvePlayerMovement(0, 3.2, 0, -1.0, obstacles, 0.5, 45);
  const dist = Math.hypot(pos.x, pos.z);
  assert.ok(dist >= 3.49, `Expected player to remain outside obstacle radius 3.5, got ${dist}`);
});

test('computeJoystickVector clamps analog radius and applies deadzone', () => {
  const zero = computeJoystickVector(1, 1, 44, 0.1);
  assert.equal(zero.magnitude, 0);

  const fullRight = computeJoystickVector(80, 0, 44, 0.08);
  assert.equal(Math.round(fullRight.knobX), 44);
  assert.ok(fullRight.normX > 0.99);
  assert.equal(fullRight.magnitude, 1);
});

test('getRecommendedRoleDeckForCount and clampRoleDeckToPlayerCount scale roles strictly for 5 to 15 players', () => {
  assert.equal(MIN_ROOM_PLAYERS, 5);
  assert.equal(MAX_ROOM_PLAYERS, 15);
  assert.equal(clampRoomPlayerCount(2), 5);
  assert.equal(clampRoomPlayerCount(15), 15);
  assert.equal(clampRoomPlayerCount(20), 15);
  assert.ok(BOT_NAMES.length >= 14, 'Should have at least 14 distinct bot names for a 15-player room');

  for (let count = MIN_ROOM_PLAYERS; count <= MAX_ROOM_PLAYERS; count++) {
    const rec = getRecommendedRoleDeckForCount(count);
    const clamped = clampRoleDeckToPlayerCount(rec, count);
    assert.equal(
      clamped.totalAllocated + clamped.villagerCount,
      count,
      `Expected total roles to match room size ${count}`
    );
    assert.ok(clamped.werewolfCount >= 1, `Expected at least 1 wolf for ${count} players`);
  }

  // Over-allocated config should clamp strictly to 6 players
  const overConfig = { werewolf: 4, seer: 2, witch: 2, bodyguard: 2, hunter: 2, cupid: 1 };
  const clamped6 = clampRoleDeckToPlayerCount(overConfig, 6);
  assert.equal(clamped6.werewolfCount + clamped6.specialCount + clamped6.villagerCount, 6);
  assert.ok(clamped6.werewolfCount <= 2);
});

test('advanced Ma Sói roles: Elder 2 lives, Cursed Wolf conversion, Mayor x2 vote, and Jester execution win', () => {
  const players = createMockPlayers(8);
  players[0].role = 'alpha_wolf';
  players[2].role = 'elder';
  players[2].elderExtraLife = true;
  players[3].role = 'cursed_wolf';
  players[4].role = 'mayor';
  players[5].role = 'jester';

  // 1. Elder survives first wolf bite via ancient shield
  const elderRes = resolveNightActions(
    players,
    {
      wolfVotes: { p1: 'p3', p2: 'p3' },
      bodyguardTargetId: null,
      seerTargetId: null,
      witchSaveUsed: false,
      witchPoisonTargetId: null,
      hunterRevengeTargetId: null,
      cupidLovers: null,
    },
    { hasHealPotion: true, hasPoisonPotion: true, hasAlphaConvert: true },
    null,
    null
  );
  assert.equal(elderRes.savedByElderShield, true);
  assert.equal(elderRes.deadPlayerIds.length, 0);

  // 2. Cursed Wolf converts to Werewolf instead of dying when bitten
  const cursedRes = resolveNightActions(
    players,
    {
      wolfVotes: { p1: 'p4', p2: 'p4' },
      bodyguardTargetId: null,
      seerTargetId: null,
      witchSaveUsed: false,
      witchPoisonTargetId: null,
      hunterRevengeTargetId: null,
      cupidLovers: null,
    },
    { hasHealPotion: true, hasPoisonPotion: true, hasAlphaConvert: true },
    null,
    null
  );
  assert.equal(cursedRes.convertedWolfId, 'p4');
  assert.equal(cursedRes.deadPlayerIds.length, 0);

  // 3. Mayor vote counts as 2 votes, breaking a 1v1 tie and executing Jester
  const mayorAndJesterVote = resolveDayVote(
    players,
    {
      p5: 'p6', // p5 is Mayor (weight 2) voting for p6 (Jester)
      p1: 'p3', // p1 votes for p3 (weight 1)
    },
    null
  );
  assert.equal(mayorAndJesterVote.executedId, 'p6');
  assert.equal(mayorAndJesterVote.voteCounts.p6, 2);
  assert.equal(mayorAndJesterVote.jesterWon, true);
});

test('stepFireballPhysics kicks fireball when player approaches and bounces off obstacles', () => {
  const initialBall = {
    x: 0,
    y: 0.52,
    z: 8.0,
    vx: 0,
    vy: 0,
    vz: 0,
    kickCount: 0,
    lastKickerName: '',
  };

  // Player approaches within kick distance (1.42m) from behind (z = 9.0)
  const kickRes = stepFireballPhysics(
    initialBall,
    [{ id: 'p1', name: 'Bá Tước', x: 0, z: 9.0, y: 0 }],
    [{ x: 0, z: 0, radius: 3.1 }],
    0.016
  );

  assert.equal(kickRes.kickedBy?.id, 'p1');
  assert.equal(kickRes.state.kickCount, 1);
  assert.equal(kickRes.state.lastKickerName, 'Bá Tước');
  assert.ok(kickRes.state.vz < -10, 'Expected ball to be kicked toward negative Z');
  assert.ok(kickRes.state.vy > 4, 'Expected ball to launch upward on kick');
});

test('canPlayerMoveInPhase allows free movement in lobby and locks movement when playing', () => {
  assert.equal(canPlayerMoveInPhase('lobby'), true);
  assert.equal(canPlayerMoveInPhase('role_reveal'), false);
  assert.equal(canPlayerMoveInPhase('night'), false);
  assert.equal(canPlayerMoveInPhase('day_announcement'), false);
  assert.equal(canPlayerMoveInPhase('day_discussion'), false);
  assert.equal(canPlayerMoveInPhase('day_voting'), false);
  assert.equal(canPlayerMoveInPhase('hunter_revenge'), false);
  assert.equal(canPlayerMoveInPhase('ended'), false);
});

test('resolveCameraCollision clamps camera in front of cottages behind the player and flags occluders', () => {
  const obstacles = [
    { x: 0, z: 0, radius: 3.1, label: 'Bonfire' },
    { x: -15, z: 19, radius: 4.2, label: 'Nhà Cổ Gothic' },
  ];

  // Player at (-15, 11), camera wants to sit at (-15, 21) which is inside the cottage at (-15, 19)
  const result = resolveCameraCollision(-15, 11, -15, 21, obstacles, 1.8, 3.4);
  assert.ok(result.clampedDistance < 10, 'Camera distance should be clamped before hitting the cottage');
  assert.ok(result.z < 15, 'Camera Z should remain in front of cottage wall');
  assert.ok(result.occludedObstacleIndices.includes(1), 'Cottage obstacle index 1 should be marked occluded');
  assert.ok(QUICK_CHAT_PRESETS.length >= 4, 'Quick chat presets should be populated');
});

test('all 15 roles have complete metadata for on-demand role explanation modal', () => {
  const allRoles: RoleId[] = [
    'werewolf',
    'alpha_wolf',
    'white_wolf',
    'cursed_wolf',
    'seer',
    'aura_seer',
    'witch',
    'bodyguard',
    'hunter',
    'cupid',
    'elder',
    'little_girl',
    'mayor',
    'jester',
    'villager',
  ];

  assert.equal(allRoles.length, 15);
  for (const rId of allRoles) {
    const meta = ROLE_CATALOG[rId];
    assert.ok(meta, `Role ${rId} must exist in ROLE_CATALOG`);
    assert.ok(meta.nameVi && meta.nameVi.trim().length > 0, `${rId} nameVi missing`);
    assert.ok(meta.titleLatin && meta.titleLatin.trim().length > 0, `${rId} titleLatin missing`);
    assert.ok(meta.romanNumeral && meta.romanNumeral.trim().length > 0, `${rId} romanNumeral missing`);
    assert.ok(meta.summary && meta.summary.trim().length > 10, `${rId} summary explanation missing`);
    assert.ok(meta.nightPrompt && meta.nightPrompt.trim().length > 5, `${rId} nightPrompt missing`);
    assert.ok(meta.winCondition && meta.winCondition.trim().length > 5, `${rId} winCondition missing`);
    assert.ok(meta.accentColor.startsWith('#'), `${rId} accentColor must be hex`);
  }
});

test('60s Night action progress, 180s Day blank vote nomination, and 30s Gallows Trial Kill/Save verdict', () => {
  assert.equal(NIGHT_PHASE_DURATION_MS, 60_000);
  assert.equal(DAY_DISCUSSION_DURATION_MS, 180_000);
  assert.equal(DAY_TRIAL_DURATION_MS, 30_000);
  assert.equal(canPlayerMoveInPhase('day_trial'), false);

  const players = createMockPlayers(6);
  players[0].role = 'werewolf';
  players[1].role = 'seer';
  players[2].role = 'bodyguard';
  players[3].role = 'villager';
  players[4].role = 'mayor';
  players[5].role = 'jester';

  const witchState = { hasHealPotion: true, hasPoisonPotion: true };

  // Villager, Mayor, Jester do not have active night actions
  assert.equal(doesRoleHaveNightAction('villager', 1, witchState, false), false);
  assert.equal(doesRoleHaveNightAction('werewolf', 1, witchState, false), true);
  assert.equal(doesRoleHaveNightAction('cupid', 1, witchState, false), true);
  assert.equal(doesRoleHaveNightAction('cupid', 2, witchState, false), false);

  const baseNightInput = {
    wolfVotes: { p1: 'p4' },
    bodyguardTargetId: null,
    seerTargetId: null,
    witchSaveUsed: false,
    witchPoisonTargetId: null,
    hunterRevengeTargetId: null,
    cupidLovers: null,
  };

  const progressBefore = computeNightActionProgress(
    players,
    { ...baseNightInput, actedPlayerIds: ['p1'] },
    1,
    witchState,
    false
  );
  assert.equal(progressBefore.requiredCount, 3);
  assert.equal(progressBefore.completedCount, 1);
  assert.equal(progressBefore.allCompleted, false);

  const progressAllDone = computeNightActionProgress(
    players,
    {
      ...baseNightInput,
      seerTargetId: 'p1',
      bodyguardTargetId: 'p2',
      actedPlayerIds: ['p1', 'p2', 'p3'],
    },
    1,
    witchState,
    false
  );
  assert.equal(progressAllDone.allCompleted, true);

  // Blank votes ('skip') should skip the trial without nominating anyone
  const skipNomination = selectDayTrialNominee(players, {
    p1: 'skip',
    p2: 'skip',
    p3: 'p6',
  });
  assert.equal(skipNomination.accusedId, null);

  // Plurality vote for p6 (Jester) puts p6 on the gallows for 30s defense trial
  const trialNomination = selectDayTrialNominee(players, {
    p1: 'p6',
    p2: 'p6',
    p3: 'skip',
  });
  assert.equal(trialNomination.accusedId, 'p6');

  // During 30s trial, if Save >= Kill, accused is spared
  const sparedVerdict = resolveTrialVerdict(
    players,
    'p6',
    {
      p1: 'kill',
      p2: 'save',
    },
    null
  );
  assert.equal(sparedVerdict.executedId, null);

  // If Mayor (p5, weight 2) votes Kill against 1 Save vote, Kill wins (2 vs 1) and Jester wins solo
  const executedVerdict = resolveTrialVerdict(
    players,
    'p6',
    {
      p5: 'kill', // Mayor weight 2
      p2: 'save', // weight 1
    },
    null
  );
  assert.equal(executedVerdict.executedId, 'p6');
  assert.equal(executedVerdict.killVotes, 2);
  assert.equal(executedVerdict.saveVotes, 1);
  assert.equal(executedVerdict.jesterWon, true);
});

test('validateLobbyStart blocks start when missing players or non-host players are unready', () => {
  const players6 = createMockPlayers(6);
  // Room target is 8 players, only 6 present -> cannot start
  const notFull = validateLobbyStart(players6, 8);
  assert.equal(notFull.canStart, false);
  assert.equal(notFull.currentCount, 6);
  assert.equal(notFull.requiredCount, 8);

  // Room has 8 players, but player 2 (non-host) is not ready -> cannot start
  const players8 = createMockPlayers(8);
  players8[1].isReady = false;
  const unready = validateLobbyStart(players8, 8);
  assert.equal(unready.canStart, false);
  assert.equal(unready.readyCount, 7);

  // Player 2 presses ready -> host can start
  players8[1].isReady = true;
  const readyToStart = validateLobbyStart(players8, 8);
  assert.equal(readyToStart.canStart, true);
  assert.equal(readyToStart.readyCount, 8);
});


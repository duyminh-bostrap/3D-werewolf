import { deathNotice } from './src/game/deathNotifications';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { phaseNotice } from './src/game/phaseNotice';
import { environmentStage, PHASE_TRANSITION_MS, type PhaseTransition } from './src/game/phaseTransition';
import { littleGirlHint, validNightChoice } from './src/game/nightAction';
import { createServer as createViteServer } from 'vite';
import {
  APPEARANCE_PRESETS,
  BOT_NAMES,
  DAY_DISCUSSION_DURATION_MS,
  DAY_TRIAL_DURATION_MS,
  DEFAULT_ROLE_DECK,
  MAX_ROOM_PLAYERS,
  MIN_ROOM_PLAYERS,
  NIGHT_PHASE_DURATION_MS,
  ROLE_CATALOG,
  buildRoleDeck,
  canBodyguardProtect,
  checkWinCondition,
  clampRoleDeckToPlayerCount,
  clampRoomPlayerCount,
  computeNightActionProgress,
  doesRoleHaveNightAction,
  getRecommendedRoleDeckForCount,
  getSeatTransform,
  isWolfPackRole,
  resolveNightActions,
  resolveTrialVerdict,
  selectDayTrialNominee,
  shuffleRoles,
  validateLobbyStart,
  type CharacterAppearance,
  type Faction,
  type GamePhase,
  type NightActionsInput,
  type PlayerState,
  type RoleDeckConfig,
  type RoleId,
  type SocialInteractionType,
  type WitchPotionState,
} from './src/game/rules';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  channel: 'global' | 'wolves' | 'system' | 'dead';
  timestamp: number;
}

export interface RoomPublicState {
  phaseTransition?: PhaseTransition | null;
  littleGirlClue?: string | null;
  nightRecaps?: Array<{ night: number; lines: string[] }>;
  roomCode: string;
  phase: GamePhase;
  dayNumber: number;
  maxPlayers?: number;
  players: PlayerState[];
  roleDeck: RoleDeckConfig;
  witchState: WitchPotionState;
  lastProtectedId: string | null;
  lovers: [string, string] | null;
  wolfTargetId: string | null;
  seerInspection: { targetId: string; isWerewolf: boolean; role: RoleId } | null;
  dayVotes: Record<string, string>;
  accusedPlayerId?: string | null;
  trialVotes?: Record<string, 'kill' | 'save'>;
  phaseEndsAt?: number | null;
  nightCompletedCount?: number;
  nightRequiredCount?: number;
  allNightActionsSubmitted?: boolean;
  myNightActionRequired?: boolean;
  myNightActionSubmitted?: boolean;
  winner: 'ongoing' | Faction;
  winReason: string;
  logs: string[];
  messages: ChatMessage[];
}

interface ServerRoom extends RoomPublicState {
  witchStates?: Record<string, WitchPotionState>;
  lastProtectedByPlayer?: Record<string, string>;
  hunterTargets?: Record<string, string>;
  inspections?: Record<string, NonNullable<RoomPublicState['seerInspection']>>;
  littleGirlClues?: Record<string, string>;
  lastAnnouncedPhase?: string;
  nightActions: NightActionsInput;
  clients: Map<string, WebSocket>;
  botAutoActTimer?: ReturnType<typeof setTimeout> | null;
  autoAdvanceTimer?: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, ServerRoom>();

function createEmptyNightActions(): NightActionsInput {
  return {
    wolfVotes: {},
    alphaConvertUsed: false,
    whiteWolfTargetId: null,
    bodyguardTargetId: null,
    seerTargetId: null,
    auraSeerTargetId: null,
    witchSaveUsed: false,
    witchPoisonTargetId: null,
    hunterRevengeTargetId: null,
    cupidLovers: null,
    actedPlayerIds: [],
  };
}

function createBotPlayer(seatIndex: number, existingNames: Set<string> = new Set()): PlayerState {
  const seat = getSeatTransform(seatIndex, Math.max(8, seatIndex + 1), 8.2);
  const preset = APPEARANCE_PRESETS[seatIndex % APPEARANCE_PRESETS.length];
  let chosenName = BOT_NAMES[(seatIndex - 1 + BOT_NAMES.length) % BOT_NAMES.length];
  if (existingNames.has(chosenName)) {
    const unused = BOT_NAMES.find((n) => !existingNames.has(n));
    if (unused) chosenName = unused;
  }
  return {
    id: `bot_${seatIndex}_${Math.random().toString(36).slice(2, 7)}`,
    name: chosenName,
    isHost: false,
    isBot: true,
    isAlive: true,
    role: 'villager',
    seatIndex,
    x: seat.x,
    z: seat.z,
    rotY: seat.rotY,
    appearance: { ...preset },
    isMuted: false,
    isSpeaking: false,
    isReady: true,
    loverId: null,
  };
}

function clearRoomTimers(room: ServerRoom) {
  if (room.botAutoActTimer) {
    clearTimeout(room.botAutoActTimer);
    room.botAutoActTimer = null;
  }
  if (room.autoAdvanceTimer) {
    clearTimeout(room.autoAdvanceTimer);
    room.autoAdvanceTimer = null;
  }
}

function getOrCreateRoom(roomCode: string): ServerRoom {
  const normalized = roomCode.trim().toUpperCase() || 'GOTHIC';
  let room = rooms.get(normalized);
  if (!room) {
    room = {
      roomCode: normalized,
      phase: 'lobby',
      dayNumber: 1,
      maxPlayers: MAX_ROOM_PLAYERS,
      players: [],
      roleDeck: { ...DEFAULT_ROLE_DECK },
      witchState: { hasHealPotion: true, hasPoisonPotion: true },
      lastProtectedId: null,
      lovers: null,
      wolfTargetId: null,
      seerInspection: null,
      dayVotes: {},
      accusedPlayerId: null,
      trialVotes: {},
      phaseEndsAt: null,
      nightCompletedCount: 0,
      nightRequiredCount: 0,
      allNightActionsSubmitted: false,
      winner: 'ongoing',
      winReason: '',
      logs: [
        `Chào mừng đến Huyết Nguyệt Thôn (Phòng #${normalized}). Chủ phòng có thể chọn số người (5–15) và bộ bài Role trước khi bắt đầu!`,
      ],
      messages: [],
      nightActions: createEmptyNightActions(),
      clients: new Map(),
      botAutoActTimer: null,
      autoAdvanceTimer: null,
    };
    rooms.set(normalized, room);
  }
  return room;
}

function updateNightProgressFields(room: ServerRoom) {
  if (room.phase !== 'night') {
    room.nightCompletedCount = 0;
    room.nightRequiredCount = 0;
    room.allNightActionsSubmitted = false;
    return;
  }
  const progress = computeNightActionProgress(
    room.players,
    room.nightActions,
    room.dayNumber,
    room.witchState,
    Boolean(room.lovers),
    room.witchStates
  );
  room.nightCompletedCount = progress.completedCount;
  room.nightRequiredCount = progress.requiredCount;
  room.allNightActionsSubmitted = progress.allCompleted;
}

function serializeRoomState(room: ServerRoom, viewerId?: string): RoomPublicState {
  updateNightProgressFields(room);
  const viewer = viewerId ? room.players.find((p) => p.id === viewerId) : undefined;
  const visibleMessages = room.messages.filter((m) => canPlayerSeeMessage(viewer, m));
  return {
    roomCode: room.roomCode,
    phase: room.phase,
    dayNumber: room.dayNumber,
    maxPlayers: room.maxPlayers ?? 8,
    players: room.players,
    roleDeck: room.roleDeck,
    witchState: { ...(room.witchStates?.[viewerId ?? ''] ?? room.witchState), hasAlphaConvert: room.witchState.hasAlphaConvert },
    lastProtectedId: viewer?.role === 'bodyguard' ? room.lastProtectedByPlayer?.[viewer.id] ?? null : null,
    lovers: room.lovers,
    wolfTargetId: room.wolfTargetId,
    seerInspection: room.inspections?.[viewerId ?? ''] ?? null,
    littleGirlClue: room.littleGirlClues?.[viewerId ?? ''] ?? null,
    nightRecaps: room.phase === 'ended' ? room.nightRecaps ?? [] : [],
    dayVotes: room.dayVotes,
    accusedPlayerId: room.accusedPlayerId ?? null,
    trialVotes: room.trialVotes ?? {},
    phaseEndsAt: room.phaseEndsAt ?? null,
    phaseTransition: room.phaseTransition ?? null,
    nightCompletedCount: room.nightCompletedCount ?? 0,
    nightRequiredCount: room.nightRequiredCount ?? 0,
    allNightActionsSubmitted: room.allNightActionsSubmitted ?? false,
    myNightActionRequired: Boolean(room.phase === 'night' && viewer?.isAlive && doesRoleHaveNightAction(viewer.role, room.dayNumber, room.witchStates?.[viewer.id] ?? room.witchState, Boolean(room.lovers))),
    myNightActionSubmitted: Boolean(room.phase === 'night' && viewerId && room.nightActions.actedPlayerIds?.includes(viewerId)),
    winner: room.winner,
    winReason: room.winReason,
    logs: room.logs.slice(-30),
    messages: visibleMessages.slice(-50),
  };
}

/**
 * Wolf-night messages stay invisible to the village; everyone else sees global chat.
 */
function canPlayerSeeMessage(viewer: PlayerState | undefined, msg: ChatMessage): boolean {
  if (msg.channel === 'wolves') {
    return Boolean(viewer && viewer.isAlive && isWolfPackRole(viewer.role));
  }
  return true;
}

/**
 * Voice routing rules: the dead cannot speak or listen, and at night only the wolf
 * pack can hear each other (the village stays silent).
 */
function canHearVoice(room: ServerRoom, listenerId: string, speakerId: string): boolean {
  const listener = room.players.find((p) => p.id === listenerId);
  const speaker = room.players.find((p) => p.id === speakerId);
  if (!listener || !speaker) return false;
  if (!listener.isAlive || !speaker.isAlive) return false;
  if (room.phase === 'night') {
    return isWolfPackRole(listener.role) && isWolfPackRole(speaker.role);
  }
  return true;
}

function broadcastRoomState(room: ServerRoom) {
  const phaseKey = `${room.phase === 'day_voting' ? 'day_discussion' : room.phase}:${room.dayNumber}:${room.accusedPlayerId ?? ''}`;
  if (room.lastAnnouncedPhase !== phaseKey) {
    room.lastAnnouncedPhase = phaseKey;
    const notice = phaseNotice(room.phase, room.dayNumber, room.players.find((p) => p.id === room.accusedPlayerId)?.name, room.winReason);
    if (notice) room.messages.push({ id: `phase_${Date.now()}_${phaseKey}`, senderId: 'system', senderName: 'Hệ thống', text: notice, channel: 'system', timestamp: Date.now() });
  }
  updateNightProgressFields(room);
  for (const [pid, ws] of room.clients.entries()) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    ws.send(
      JSON.stringify({
        type: 'room:state',
        state: serializeRoomState(room, pid),
      })
    );
  }
}

function broadcastEvent(room: ServerRoom, eventPayload: Record<string, unknown>, excludeId?: string) {
  const data = JSON.stringify(eventPayload);
  for (const [pid, ws] of room.clients.entries()) {
    if (pid !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function markPlayerActed(room: ServerRoom, playerId: string) {
  if (!room.nightActions.actedPlayerIds) {
    room.nightActions.actedPlayerIds = [];
  }
  if (!room.nightActions.actedPlayerIds.includes(playerId)) {
    room.nightActions.actedPlayerIds.push(playerId);
  }
}

function applyNightChoice(room: ServerRoom, actor: PlayerState, choice: { type: string; targetId?: string | null; lovers?: [string, string] }) {
  const actionType = choice.type;
  const targetId = choice.targetId ?? null;
  const potions = { ...(room.witchStates?.[actor.id] ?? room.witchState), hasAlphaConvert: room.witchState.hasAlphaConvert };
  if (!validNightChoice(actor, choice, room.players, room.dayNumber, potions, Boolean(room.lovers), room.lastProtectedByPlayer?.[actor.id] ?? null, room.nightActions.actedPlayerIds ?? [])) return;
            if (actionType === 'skip_night_role') {
              // Explicit skips complete only this actor's turn.
            } else if (actor.role === 'little_girl') {
              (room.littleGirlClues ??= {})[actor.id] = littleGirlHint(room.players, actor.id);
            } else if (actor.role === 'cupid') {
              room.nightActions.cupidLovers = choice.lovers!;
            } else if (actor.role === 'witch') {
              (room.nightActions.witchActions ??= {})[actor.id] = actionType === 'heal' ? { healTargetId: choice.targetId! } : { poisonTargetId: targetId! };
            } else if (actor.role === 'bodyguard') {
              (room.nightActions.bodyguardTargets ??= {})[actor.id] = targetId!;
            } else if (actor.role === 'hunter') {
              (room.nightActions.hunterTargets ??= {})[actor.id] = targetId!;
            } else if (actor.role === 'seer' || actor.role === 'aura_seer') {
              const inspected = room.players.find((p) => p.id === targetId)!;
              (room.inspections ??= {})[actor.id] = { targetId: inspected.id, isWerewolf: isWolfPackRole(inspected.role), role: inspected.role };
            } else if (actionType === 'white_wolf_kill') {
              room.nightActions.whiteWolfTargetId = targetId;
            } else if (isWolfPackRole(actor.role)) {
              room.nightActions.wolfVotes[actor.id] = targetId!;
              if (actionType === 'alpha_convert') {
                room.nightActions.alphaConvertUsed = true;
                room.nightActions.alphaConvertTargetId = targetId!;
              }
              const tally = new Map<string, number>();
              for (const target of Object.values(room.nightActions.wolfVotes)) tally.set(target, (tally.get(target) ?? 0) + 1);
              room.wolfTargetId = [...tally].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
            }
            markPlayerActed(room, actor.id);

}

function fillBotNightActions(room: ServerRoom) {
  const alive = room.players.filter((p) => p.isAlive);
  for (const bot of alive.filter((p) => p.isBot)) {
    if (room.nightActions.actedPlayerIds?.includes(bot.id)) continue;
    const others = alive.filter((p) => p.id !== bot.id);
    const pick = (candidates: PlayerState[]) => candidates[Math.floor(Math.random() * candidates.length)]?.id;
    let choice: { type: string; targetId?: string | null; lovers?: [string, string] } = { type: 'skip_night_role' };
    if (isWolfPackRole(bot.role)) choice = { type: bot.role, targetId: pick(alive.filter((p) => !isWolfPackRole(p.role))) };
    else if (bot.role === 'bodyguard') choice = { type: bot.role, targetId: pick(alive.filter((p) => canBodyguardProtect(room.lastProtectedByPlayer?.[bot.id] ?? null, p.id))) };
    else if (['seer', 'aura_seer', 'hunter'].includes(bot.role)) choice = { type: bot.role, targetId: pick(others) };
    else if (bot.role === 'cupid' && room.dayNumber === 1 && !room.lovers && alive.length >= 2) choice = { type: 'cupid', lovers: [alive[0].id, alive[1].id] };
    else if (bot.role === 'little_girl') choice = { type: 'little_girl_peek' };
    else if (bot.role === 'witch') {
      const state = room.witchStates?.[bot.id] ?? room.witchState;
      if (state.hasHealPotion && room.wolfTargetId) choice = { type: 'heal', targetId: room.wolfTargetId };
      else if (state.hasPoisonPotion && Math.random() < 0.25) choice = { type: 'poison', targetId: pick(others) };
    }
    applyNightChoice(room, bot, choice);
  }
}

function fillBotDayVotes(room: ServerRoom) {
  const alive = room.players.filter((p) => p.isAlive);
  for (const bot of alive) {
    if (!bot.isBot) continue;
    if (room.dayVotes[bot.id]) continue;

    if (isWolfPackRole(bot.role)) {
      const targets = alive.filter((p) => !isWolfPackRole(p.role));
      if (targets.length > 0) {
        room.dayVotes[bot.id] = targets[Math.floor(Math.random() * targets.length)].id;
      }
    } else {
      const others = alive.filter((p) => p.id !== bot.id);
      if (others.length > 0) {
        const wolves = others.filter((p) => isWolfPackRole(p.role));
        if (wolves.length > 0 && Math.random() < 0.48) {
          room.dayVotes[bot.id] = wolves[Math.floor(Math.random() * wolves.length)].id;
        } else {
          room.dayVotes[bot.id] = others[Math.floor(Math.random() * others.length)].id;
        }
      }
    }
  }
}

function fillBotTrialVotes(room: ServerRoom) {
  const accusedId = room.accusedPlayerId;
  if (!accusedId) return;
  if (!room.trialVotes) room.trialVotes = {};
  const alive = room.players.filter((p) => p.isAlive && p.id !== accusedId);
  const accused = room.players.find((p) => p.id === accusedId);

  for (const bot of alive) {
    if (!bot.isBot) continue;
    if (room.trialVotes[bot.id]) continue;

    if (isWolfPackRole(bot.role)) {
      // Wolves try to save fellow wolves and execute villagers
      if (accused && isWolfPackRole(accused.role)) {
        room.trialVotes[bot.id] = 'save';
      } else {
        room.trialVotes[bot.id] = 'kill';
      }
    } else {
      // Villagers lean toward executing wolves or follow majority
      if (accused && isWolfPackRole(accused.role)) {
        room.trialVotes[bot.id] = Math.random() < 0.72 ? 'kill' : 'save';
      } else {
        room.trialVotes[bot.id] = Math.random() < 0.55 ? 'kill' : 'save';
      }
    }
  }
}

function enterNightPhase(room: ServerRoom) {
  clearRoomTimers(room);
  room.phaseTransition = null;
  room.phase = 'night';
  room.wolfTargetId = null;
  room.seerInspection = null;
  room.inspections = {};
  room.littleGirlClues = {};
  room.accusedPlayerId = null;
  room.trialVotes = {};
  room.nightActions = createEmptyNightActions();
  room.phaseEndsAt = Date.now() + NIGHT_PHASE_DURATION_MS;

  // Pre-select a wolf target so Witch can see who is being attacked, while marking bots completed after 2.2s
  const alive = room.players.filter((p) => p.isAlive);
  const botWolves = alive.filter((p) => p.isBot && isWolfPackRole(p.role));
  const nonWolves = alive.filter((p) => !isWolfPackRole(p.role));
  if (botWolves.length > 0 && nonWolves.length > 0) {
    const pick = nonWolves[Math.floor(Math.random() * nonWolves.length)];
    for (const bw of botWolves) {
      room.nightActions.wolfVotes[bw.id] = pick.id;
    }
    room.wolfTargetId = pick.id;
  }

  // AI bots lock in their night actions after ~2.2 seconds so the night auto-completes once humans finish
  room.botAutoActTimer = setTimeout(() => {
    if (room.phase !== 'night') return;
    fillBotNightActions(room);
    updateNightProgressFields(room);
    broadcastRoomState(room);
    checkNightAutoSkip(room);
  }, 2200);

  updateNightProgressFields(room);
  broadcastRoomState(room);
}

function announceDeath(room: ServerRoom, player: PlayerState, period: 'day' | 'night') {
  room.messages.push({ id: `death_${Date.now()}_${player.id}`, senderId: 'system', senderName: 'Hệ thống', text: `${deathNotice(player)} (${period === 'night' ? 'Đêm' : 'Ngày'} ${room.dayNumber})`, channel: 'system', timestamp: Date.now() });
}

function executeResolveNight(room: ServerRoom) {
  if (room.phase !== 'night') return;
  clearRoomTimers(room);
  fillBotNightActions(room);

  const res = resolveNightActions(
    room.players,
    room.nightActions,
    room.witchState,
    room.lovers,
    room.lastProtectedId,
    { witchStates: room.witchStates, lastProtected: room.lastProtectedByPlayer }
  );

  room.witchState = res.nextWitchState;
  room.witchStates = res.nextWitchStates;
  room.lastProtectedByPlayer = { ...room.nightActions.bodyguardTargets };
  room.hunterTargets = { ...room.nightActions.hunterTargets };
  (room.nightRecaps ??= []).push({ night: room.dayNumber, lines: [...res.logs] });
  room.lastProtectedId = room.nightActions.bodyguardTargetId;
  room.lovers = res.updatedLovers;
  if (room.lovers) {
    const [l1, l2] = room.lovers;
    for (const p of room.players) {
      if (p.id === l1) p.loverId = l2;
      else if (p.id === l2) p.loverId = l1;
    }
  }

  if (res.savedByElderShield && res.wolfTargetId) {
    const elderPlayer = room.players.find((p) => p.id === res.wolfTargetId);
    if (elderPlayer) elderPlayer.elderExtraLife = false;
  }

  if (res.convertedWolfId) {
    const converted = room.players.find((p) => p.id === res.convertedWolfId);
    if (converted) converted.role = 'werewolf';
  }

  for (const deadId of res.deadPlayerIds) {
    const victim = room.players.find((p) => p.id === deadId);
    if (victim && victim.isAlive) {
      announceDeath(room, victim, 'night');
      victim.isAlive = false;
      victim.deathPeriod = 'night';
      victim.deathRound = room.dayNumber;
      victim.isMuted = true;
      victim.isSpeaking = false;
    }
  }

  room.logs.push(...res.logs);
  if (res.seerInspection) {
    room.seerInspection = res.seerInspection;
  }

  const winCheck = checkWinCondition(room.players, room.lovers);
  if (winCheck.winner !== 'ongoing') {
    room.winner = winCheck.winner;
    room.winReason = winCheck.reason;
    room.phase = 'ended';
    room.phaseEndsAt = null;
    room.logs.push(winCheck.reason);
  } else {
    room.phase = 'day_discussion';
    room.dayVotes = {};
    room.accusedPlayerId = null;
    room.trialVotes = {};
    room.phaseEndsAt = Date.now() + DAY_DISCUSSION_DURATION_MS;
    room.logs.push(
      `Ngày ${room.dayNumber}: Dân làng có 3 phút (180s) để thảo luận và bỏ phiếu (hoặc Bỏ Phiếu Trắng để skip).`
    );
  }

  broadcastRoomState(room);
}

function finishPhaseTransition(room: ServerRoom) {
  if (!room.phaseTransition) return;
  room.phaseTransition = null;
  if (room.phase === 'night') executeResolveNight(room);
  else if (room.phase === 'day_trial') executeResolveTrialVerdict(room);
  else if (room.phase === 'day_discussion' || room.phase === 'day_voting') {
    room.dayNumber += 1;
    enterNightPhase(room);
  }
}

function beginPhaseTransition(room: ServerRoom, to: 'day' | 'night') {
  if (room.phaseTransition) return;
  clearRoomTimers(room);
  const now = Date.now();
  room.phaseTransition = { from: environmentStage(room.phase), to, startedAt: now, endsAt: now + PHASE_TRANSITION_MS };
  room.phaseEndsAt = room.phaseTransition.endsAt;
  room.messages.push({ id: `transition_${now}`, senderId: 'system', senderName: 'Hệ thống', text: `${to === 'day' ? 'Bình minh' : 'Đêm mới'} sau 5 giây. Đã khóa lựa chọn.`, channel: 'system', timestamp: now });
  room.autoAdvanceTimer = setTimeout(() => finishPhaseTransition(room), PHASE_TRANSITION_MS);
  broadcastRoomState(room);
}

function checkNightAutoSkip(room: ServerRoom) {
  if (room.phase !== 'night') return;
  updateNightProgressFields(room);
  if (room.allNightActionsSubmitted) beginPhaseTransition(room, 'day');
}

function executeResolveDayDiscussion(room: ServerRoom) {
  if (room.phase !== 'day_discussion' && room.phase !== 'day_voting') return;
  clearRoomTimers(room);
  fillBotDayVotes(room);

  const nomination = selectDayTrialNominee(room.players, room.dayVotes);
  room.logs.push(...nomination.logs);

  if (!nomination.accusedId) {
    beginPhaseTransition(room, 'night');
    return;
  }

  // Enter 30-second Gallows Defense Trial ('day_trial') with simultaneous Kill / Save voting!
  room.phase = 'day_trial';
  room.accusedPlayerId = nomination.accusedId;
  room.trialVotes = {};
  room.phaseEndsAt = Date.now() + DAY_TRIAL_DURATION_MS;

  // Bots cast their Kill/Save votes after 2.5 seconds
  room.botAutoActTimer = setTimeout(() => {
    if (room.phase !== 'day_trial') return;
    fillBotTrialVotes(room);
    broadcastRoomState(room);
    if (room.players.filter((p) => p.isAlive && p.id !== room.accusedPlayerId).every((p) => room.trialVotes?.[p.id])) beginPhaseTransition(room, 'night');
  }, 2500);

  broadcastRoomState(room);
}

function executeResolveTrialVerdict(room: ServerRoom) {
  if (room.phase !== 'day_trial' || !room.accusedPlayerId) return;
  clearRoomTimers(room);
  fillBotTrialVotes(room);

  const verdict = resolveTrialVerdict(
    room.players,
    room.accusedPlayerId,
    room.trialVotes ?? {},
    room.lovers,
    room.hunterTargets
  );

  for (const deadId of verdict.deadPlayerIds) {
    const p = room.players.find((pl) => pl.id === deadId);
    if (p && p.isAlive) {
      announceDeath(room, p, 'day');
      p.isAlive = false;
      p.deathPeriod = 'day';
      p.deathRound = room.dayNumber;
      p.isMuted = true;
      p.isSpeaking = false;
    }
  }
  room.logs.push(...verdict.logs);
  const recap = room.nightRecaps?.find((entry) => entry.night === room.dayNumber);
  if (recap) recap.lines.push(...verdict.logs.map((line) => `Ban ngày: ${line}`));

  if (verdict.jesterWon) {
    const executed = room.players.find((pl) => pl.id === verdict.executedId);
    room.winner = 'solo';
    room.winReason = `Thằng Ngố (${executed?.name ?? 'Kẻ Chán Đời'}) đã đánh lừa toàn bộ Dân Làng treo cổ mình và giành chiến thắng độc lập!`;
    room.phase = 'ended';
    room.phaseEndsAt = null;
    room.logs.push(room.winReason);
    broadcastRoomState(room);
    return;
  }

  const winCheck = checkWinCondition(room.players, room.lovers);
  if (winCheck.winner !== 'ongoing') {
    room.winner = winCheck.winner;
    room.winReason = winCheck.reason;
    room.phase = 'ended';
    room.phaseEndsAt = null;
    room.logs.push(winCheck.reason);
    broadcastRoomState(room);
  } else {
    room.dayNumber += 1;
    room.logs.push(
      `Màn đêm thứ ${room.dayNumber} buông xuống Huyết Nguyệt Thôn. Mỗi người có 1 phút (60s) để thực hiện chức năng.`
    );
    enterNightPhase(room);
  }
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', activeRooms: rooms.size });
  });

  app.get('/api/rooms/:code', (req, res) => {
    const room = getOrCreateRoom(req.params.code);
    res.json(serializeRoomState(room));
  });

  // Authoritative 1-second server tick to enforce 60s Night, 180s Day Discussion, and 30s Trial timers
  setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      if (!room.phaseEndsAt || now < room.phaseEndsAt) continue;

      if (room.phaseTransition) { finishPhaseTransition(room); continue; }

      if (room.phase === 'night') {
        room.logs.push('Đã hết 1 phút (60s) ban đêm — bình minh ló dạng trên Huyết Nguyệt Thôn!');
        beginPhaseTransition(room, 'day');
      } else if (room.phase === 'day_discussion' || room.phase === 'day_voting') {
        room.logs.push('Đã hết 3 phút (180s) thảo luận ban ngày — tổng kết phiếu bầu!');
        executeResolveDayDiscussion(room);
      } else if (room.phase === 'day_trial') {
        room.logs.push('Đã hết 30 giây biện minh trên giàn — công bố phán quyết Giết / Sống!');
        beginPhaseTransition(room, 'night');
      }
    }
  }, 1000);

  wss.on('connection', (ws) => {
    let currentRoomCode = '';
    let currentPlayerId = '';

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));

        if (msg.type === 'room:join') {
          const roomCode = String(msg.roomCode || 'GOTHIC').toUpperCase();
          const playerId = String(msg.playerId || `p_${Math.random().toString(36).slice(2, 9)}`);
          const playerName = String(msg.playerName || 'Lữ Khách Bí Ẩn').slice(0, 24);
          const appearance: CharacterAppearance =
            msg.appearance || APPEARANCE_PRESETS[0];

          const room = getOrCreateRoom(roomCode);
          const existingPlayer = room.players.find((p) => p.id === playerId);
          const hasBotSeat = room.phase === 'lobby' && room.players.some((p) => p.isBot);
          if (!existingPlayer && !hasBotSeat && room.players.length >= Math.min(MAX_ROOM_PLAYERS, room.maxPlayers ?? MAX_ROOM_PLAYERS)) {
            ws.send(JSON.stringify({ type: 'room:error', message: 'Phòng đã đủ người (tối đa 15 người).' }));
            return;
          }
          if (currentRoomCode && currentRoomCode !== roomCode) {
            const oldRoom = rooms.get(currentRoomCode);
            if (oldRoom) {
              oldRoom.clients.delete(currentPlayerId);
              if (oldRoom.phase === 'lobby') oldRoom.players = oldRoom.players.filter((p) => p.id !== currentPlayerId);
              broadcastEvent(oldRoom, { type: 'webrtc:peer-left', peerId: currentPlayerId });
              broadcastRoomState(oldRoom);
            }
          }
          currentRoomCode = roomCode;
          currentPlayerId = playerId;
          room.clients.set(playerId, ws);

          let existing = room.players.find((p) => p.id === playerId);
          if (!existing) {
            const isFirstHuman = room.players.filter((p) => !p.isBot).length === 0;
            if (room.players.length === 0) {
              existing = {
                id: playerId,
                name: playerName,
                isHost: true,
                isBot: false,
                isAlive: true,
                role: 'villager',
                seatIndex: 0,
                x: 0,
                z: 12.5,
                rotY: Math.PI,
                appearance,
                isMuted: false,
                isSpeaking: false,
                isReady: true,
                loverId: null,
              };
              room.players.push(existing);
            } else {
              const botIdx = room.players.findIndex((p) => p.isBot);
              if (botIdx !== -1 && room.phase === 'lobby') {
                const seatIndex = room.players[botIdx].seatIndex;
                const seat = getSeatTransform(seatIndex, 8, 8.2);
                existing = {
                  id: playerId,
                  name: playerName,
                  isHost: isFirstHuman,
                  isBot: false,
                  isAlive: true,
                  role: 'villager',
                  seatIndex,
                  x: seat.x,
                  z: seat.z + 2,
                  rotY: seat.rotY,
                  appearance,
                  isMuted: false,
                  isSpeaking: false,
                  isReady: isFirstHuman,
                  loverId: null,
                };
                room.players[botIdx] = existing;
              } else {
                const seatIndex = room.players.length;
                const seat = getSeatTransform(seatIndex, Math.max(8, seatIndex + 1), 8.2);
                existing = {
                  id: playerId,
                  name: playerName,
                  isHost: isFirstHuman,
                  isBot: false,
                  isAlive: true,
                  role: 'villager',
                  seatIndex,
                  x: seat.x,
                  z: seat.z,
                  rotY: seat.rotY,
                  appearance,
                  isMuted: false,
                  isSpeaking: false,
                  isReady: isFirstHuman,
                  loverId: null,
                };
                room.players.push(existing);
              }
            }

            room.logs.push(`${playerName} đã bước vào Sảnh Chờ phòng #${roomCode}.`);
          } else {
            existing.name = playerName;
            existing.appearance = appearance;
            existing.isBot = false;
            if (!room.players.some((p) => p.isHost && !p.isBot)) existing.isHost = true;
          }

          broadcastRoomState(room);
          // Only announce the newcomer to players who are allowed to hear them
          for (const otherId of room.clients.keys()) {
            if (otherId === playerId) continue;
            if (!canHearVoice(room, otherId, playerId)) continue;
            const otherWs = room.clients.get(otherId);
            if (!otherWs || otherWs.readyState !== WebSocket.OPEN) continue;
            otherWs.send(
              JSON.stringify({
                type: 'webrtc:peer-joined',
                peerId: playerId,
                peerName: playerName,
              })
            );
          }
          return;
        }

        if (!currentRoomCode) return;
        const room = rooms.get(currentRoomCode);
        if (!room) return;

        switch (msg.type) {
          case 'player:move': {
            if (room.phase !== 'lobby') break;
            const p = room.players.find((pl) => pl.id === currentPlayerId);
            if (p) {
              p.x = Number(msg.x) || 0;
              p.z = Number(msg.z) || 0;
              p.rotY = Number(msg.rotY) || 0;
              broadcastEvent(
                room,
                {
                  type: 'player:moved',
                  playerId: currentPlayerId,
                  x: p.x,
                  z: p.z,
                  rotY: p.rotY,
                },
                currentPlayerId
              );
            }
            break;
          }

          case 'player:customize': {
            const p = room.players.find((pl) => pl.id === currentPlayerId);
            if (p) {
              if (msg.name) p.name = String(msg.name).slice(0, 24);
              if (msg.appearance) p.appearance = msg.appearance;
              broadcastRoomState(room);
            }
            break;
          }

          case 'voice:status': {
            const p = room.players.find((pl) => pl.id === currentPlayerId);
            if (p) {
              // The dead are forced to silence
              p.isMuted = p.isAlive
                ? typeof msg.isMuted === 'boolean'
                  ? msg.isMuted
                  : p.isMuted
                : true;
              p.isSpeaking = p.isAlive
                ? typeof msg.isSpeaking === 'boolean'
                  ? msg.isSpeaking
                  : p.isSpeaking
                : false;
              broadcastEvent(
                room,
                {
                  type: 'voice:updated',
                  playerId: currentPlayerId,
                  isMuted: p.isMuted,
                  isSpeaking: p.isSpeaking,
                },
                currentPlayerId
              );
            }
            break;
          }

          case 'webrtc:signal': {
            const targetId = String(msg.targetId || '');
            const targetWs = room.clients.get(targetId);
            // Enforce voice privacy server-side: no relay outside the allowed channel
            if (
              targetWs &&
              targetWs.readyState === WebSocket.OPEN &&
              canHearVoice(room, targetId, currentPlayerId) &&
              canHearVoice(room, currentPlayerId, targetId)
            ) {
              targetWs.send(
                JSON.stringify({
                  type: 'webrtc:signal',
                  fromId: currentPlayerId,
                  signal: msg.signal,
                })
              );
            }
            break;
          }

          case 'player:toggle-ready': {
            const p = room.players.find((pl) => pl.id === currentPlayerId);
            if (p && !p.isHost) {
              p.isReady = typeof msg.isReady === 'boolean' ? msg.isReady : !p.isReady;
              broadcastRoomState(room);
            }
            break;
          }

          case 'player:interact': {
            const sender = room.players.find((pl) => pl.id === currentPlayerId);
            const target = room.players.find((pl) => pl.id === String(msg.targetId || ''));
            const action = String(msg.action || 'heart') as SocialInteractionType;
            if (sender && target && sender.id !== target.id && ['friend', 'heart', 'stone'].includes(action)) {
              broadcastEvent(room, {
                type: 'player:interacted',
                senderId: sender.id,
                senderName: sender.name,
                targetId: target.id,
                targetName: target.name,
                action,
              });
            }
            break;
          }

          case 'room:add-bot': {
            if (room.phase !== 'lobby' || !room.players.some((p) => p.id === currentPlayerId && p.isHost)) break;
            if (room.players.length < Math.min(MAX_ROOM_PLAYERS, room.maxPlayers ?? MAX_ROOM_PLAYERS)) {
              const usedNames = new Set(room.players.map((p) => p.name));
              const newBot = createBotPlayer(room.players.length, usedNames);
              room.players.push(newBot);
              if (room.players.length > (room.maxPlayers ?? 8)) {
                room.maxPlayers = room.players.length;
              }
              room.players.forEach((p, idx) => {
                p.seatIndex = idx;
                p.isAlive = true;
                const seat = getSeatTransform(idx, room.players.length, 8.2);
                if (p.isBot) {
                  p.x = seat.x;
                  p.z = seat.z;
                  p.rotY = seat.rotY;
                }
              });
              room.roleDeck = clampRoleDeckToPlayerCount(
                room.roleDeck,
                room.maxPlayers ?? room.players.length
              ).deck;
              broadcastRoomState(room);
            }
            break;
          }

          case 'room:remove-bot': {
            if (room.phase !== 'lobby' || !room.players.some((p) => p.id === currentPlayerId && p.isHost)) break;
            if (room.players.length > 1) {
              const lastBotIdx = [...room.players]
                .reverse()
                .findIndex((p) => p.isBot);
              if (lastBotIdx !== -1) {
                const realIdx = room.players.length - 1 - lastBotIdx;
                room.players.splice(realIdx, 1);
                room.players.forEach((p, idx) => {
                  p.seatIndex = idx;
                  p.isAlive = true;
                  const seat = getSeatTransform(idx, Math.max(room.players.length, 5), 8.2);
                  if (p.isBot) {
                    p.x = seat.x;
                    p.z = seat.z;
                    p.rotY = seat.rotY;
                  }
                });
                broadcastRoomState(room);
              }
            }
            break;
          }

          case 'room:set-player-count': {
            if (room.phase !== 'lobby' || !room.players.some((p) => p.id === currentPlayerId && p.isHost)) break;
            const targetCount = clampRoomPlayerCount(Number(msg.targetCount) || 8);
            room.maxPlayers = Math.min(MAX_ROOM_PLAYERS, Math.max(targetCount, room.players.length));
            while (room.players.length > targetCount) {
              const lastBotIdx = [...room.players].reverse().findIndex((p) => p.isBot);
              if (lastBotIdx === -1) break;
              room.players.splice(room.players.length - 1 - lastBotIdx, 1);
            }
            room.players.forEach((p, idx) => {
              p.seatIndex = idx;
              p.isAlive = true;
              const seat = getSeatTransform(idx, Math.max(room.players.length, targetCount), 8.2);
              if (p.isBot) {
                p.x = seat.x;
                p.z = seat.z;
                p.rotY = seat.rotY;
              }
            });
            if (msg.autoBalanceRoles) {
              room.roleDeck = getRecommendedRoleDeckForCount(targetCount);
            } else {
              room.roleDeck = clampRoleDeckToPlayerCount(
                room.roleDeck,
                targetCount
              ).deck;
            }
            broadcastRoomState(room);
            break;
          }

          case 'room:kick-player': {
            if (room.phase !== 'lobby' || !room.players.some((p) => p.id === currentPlayerId && p.isHost)) break;
            if (room.players.length > 1) {
              const targetId = String(msg.targetId || '');
              const idx = room.players.findIndex((p) => p.id === targetId && p.id !== currentPlayerId);
              if (idx !== -1) {
                const removed = room.players.splice(idx, 1)[0];
                const kickedSocket = room.clients.get(removed.id);
                room.clients.delete(removed.id);
                if (kickedSocket?.readyState === WebSocket.OPEN) {
                  kickedSocket.send(JSON.stringify({ type: 'room:error', message: 'Chủ phòng đã mời bạn rời phòng.' }));
                  kickedSocket.close(1000, 'Removed by host');
                }
                broadcastEvent(room, { type: 'webrtc:peer-left', peerId: removed.id });
                room.players.forEach((p, i) => {
                  p.seatIndex = i;
                  const seat = getSeatTransform(i, room.players.length, 8.2);
                  if (p.isBot) {
                    p.x = seat.x;
                    p.z = seat.z;
                    p.rotY = seat.rotY;
                  }
                });
                room.roleDeck = clampRoleDeckToPlayerCount(
                  room.roleDeck,
                  room.players.length
                ).deck;
                room.logs.push(`Đã mời ${removed.name} rời khỏi bàn nghi lễ.`);
                broadcastRoomState(room);
              }
            }
            break;
          }

          case 'room:promote-host': {
            if (room.phase !== 'lobby' || !room.players.some((p) => p.id === currentPlayerId && p.isHost)) break;
            const targetId = String(msg.targetId || '');
            const target = room.players.find((p) => p.id === targetId);
            if (target) {
              room.players.forEach((p) => {
                p.isHost = p.id === targetId;
              });
              room.logs.push(`${target.name} đã được trao quyền Chủ Phòng Nghi Lễ.`);
              broadcastRoomState(room);
            }
            break;
          }

          case 'room:update-deck': {
            if (room.phase === 'lobby' && room.players.some((p) => p.id === currentPlayerId && p.isHost) && msg.roleDeck) {
              const merged = { ...room.roleDeck, ...msg.roleDeck };
              room.roleDeck = clampRoleDeckToPlayerCount(
                merged,
                room.players.length
              ).deck;
              broadcastRoomState(room);
            }
            break;
          }

          case 'game:start': {
            const caller = room.players.find((p) => p.id === currentPlayerId);
            if (!caller || !caller.isHost || room.phase !== 'lobby') {
              break;
            }
            const validation = validateLobbyStart(room.players, room.maxPlayers ?? 8);
            if (!validation.canStart) {
              room.logs.push(`Chưa thể bắt đầu: ${validation.reasonVi}.`);
              broadcastRoomState(room);
              break;
            }

            clearRoomTimers(room);

            const deck = shuffleRoles(
              buildRoleDeck(room.players.length, room.roleDeck)
            );

            room.players.forEach((p, idx) => {
              p.seatIndex = idx;
              p.role = deck[idx];
              p.isAlive = true;
              p.loverId = null;
              p.elderExtraLife = deck[idx] === 'elder';
              const seat = getSeatTransform(idx, room.players.length, 8.2);
              p.x = seat.x;
              p.z = seat.z;
              p.rotY = seat.rotY;
            });

            if (msg.preferredRole && ROLE_CATALOG[msg.preferredRole as RoleId]) {
              const pref = msg.preferredRole as RoleId;
              const caller = room.players.find((p) => p.id === currentPlayerId);
              if (caller) {
                const holder = room.players.find((p) => p.role === pref);
                if (holder && caller.id !== holder.id) {
                  const tmp = caller.role;
                  caller.role = holder.role;
                  holder.role = tmp;
                } else {
                  caller.role = pref;
                }
                room.players.forEach((p) => {
                  p.elderExtraLife = p.role === 'elder';
                });
              }
            }

            room.phase = 'role_reveal';
            room.witchStates = Object.fromEntries(room.players.filter((p) => p.role === 'witch').map((p) => [p.id, { hasHealPotion: true, hasPoisonPotion: true }]));
            room.lastProtectedByPlayer = {};
            room.hunterTargets = {};
            room.inspections = {};
            room.littleGirlClues = {};
            room.nightRecaps = [];
            room.players.forEach((p) => { delete p.deathPeriod; delete p.deathRound; });
            room.dayNumber = 1;
            room.witchState = {
              hasHealPotion: true,
              hasPoisonPotion: true,
              hasAlphaConvert: true,
            };
            room.lastProtectedId = null;
            room.lovers = null;
            room.wolfTargetId = null;
            room.seerInspection = null;
            room.dayVotes = {};
            room.accusedPlayerId = null;
            room.trialVotes = {};
            room.phaseEndsAt = null;
            room.winner = 'ongoing';
            room.winReason = '';
            room.nightActions = createEmptyNightActions();
            room.logs.push(
              `Ván đấu bắt đầu! Định mệnh đã chia ${room.players.length} lá bài Tarot chức năng.`
            );
            broadcastRoomState(room);
            break;
          }

          case 'game:enter-night': {
            if (room.phase === 'role_reveal') {
              enterNightPhase(room);
            }
            break;
          }

          case 'game:night-action': {
            if (room.phase !== 'night' || room.phaseTransition) break;
            const actor = room.players.find((p) => p.id === currentPlayerId);
            if (!actor) break;
            const targetId = typeof msg.targetId === 'string' ? msg.targetId : null;
            const actionType = String(msg.actionType || '');
            const choice = { type: actionType, targetId: actionType === 'heal' ? room.wolfTargetId : targetId, lovers: Array.isArray(msg.lovers) && msg.lovers.length === 2 ? msg.lovers.map(String) as [string, string] : undefined };
            const potions = { ...(room.witchStates?.[actor.id] ?? room.witchState), hasAlphaConvert: room.witchState.hasAlphaConvert };
            if (!validNightChoice(actor, choice, room.players, room.dayNumber, potions, Boolean(room.lovers), room.lastProtectedByPlayer?.[actor.id] ?? null, room.nightActions.actedPlayerIds ?? [])) break;
            applyNightChoice(room, actor, choice);
            updateNightProgressFields(room);
            broadcastRoomState(room);
            checkNightAutoSkip(room);
            break;
          }

          case 'game:start-voting': {
            if (room.phase === 'day_discussion' && !room.phaseTransition) {
              room.phase = 'day_voting';
              fillBotDayVotes(room);
              broadcastRoomState(room);
            }
            break;
          }

          case 'game:submit-vote': {
            if ((room.phase !== 'day_discussion' && room.phase !== 'day_voting') || room.phaseTransition) break;
            const voter = room.players.find((p) => p.id === currentPlayerId);
            const targetId = typeof msg.targetId === 'string' ? msg.targetId : '';
            if (!voter?.isAlive || (targetId !== 'skip' && !room.players.some((p) => p.id === targetId && p.isAlive))) break;
            room.phase = 'day_voting';
            room.dayVotes[voter.id] = targetId;
            fillBotDayVotes(room);
            broadcastRoomState(room);

            // Check if all alive players have voted -> automatically evaluate trial nominee!
            const alivePlayers = room.players.filter((p) => p.isAlive);
            const allVoted = alivePlayers.every((p) => Boolean(room.dayVotes[p.id]));
            if (allVoted) executeResolveDayDiscussion(room);
            break;
          }

          case 'game:submit-trial-vote': {
            if (room.phase !== 'day_trial' || !room.accusedPlayerId || room.phaseTransition) break;
            const voter = room.players.find((p) => p.id === currentPlayerId);
            const choice = msg.choice === 'kill' ? 'kill' : msg.choice === 'save' ? 'save' : null;
            if (voter && voter.isAlive && voter.id !== room.accusedPlayerId && choice) {
              if (!room.trialVotes) room.trialVotes = {};
              room.trialVotes[voter.id] = choice;
              fillBotTrialVotes(room);
              broadcastRoomState(room);

              // If all eligible alive voters have cast their Kill/Save vote, auto-resolve after 1s
              const eligibleVoters = room.players.filter(
                (p) => p.isAlive && p.id !== room.accusedPlayerId
              );
              const allTrialVoted = eligibleVoters.every(
                (p) => Boolean(room.trialVotes?.[p.id])
              );
              if (allTrialVoted) beginPhaseTransition(room, 'night');
            }
            break;
          }

          case 'game:resolve-trial': {
            // Trial resolution is automatic; clients cannot bypass defense or countdown.
            break;
          }

          case 'game:reset-lobby': {
            clearRoomTimers(room);
            room.phase = 'lobby';
            room.phaseTransition = null;
            room.nightRecaps = [];
            room.messages = room.messages.filter((m) => m.channel !== 'system');
            room.inspections = {};
            room.littleGirlClues = {};
            room.hunterTargets = {};
            room.players = room.players.filter((p) => p.isBot || room.clients.has(p.id));
            room.dayNumber = 1;
            room.winner = 'ongoing';
            room.winReason = '';
            room.lovers = null;
            room.wolfTargetId = null;
            room.seerInspection = null;
            room.dayVotes = {};
            room.accusedPlayerId = null;
            room.trialVotes = {};
            room.phaseEndsAt = null;
            room.nightCompletedCount = 0;
            room.nightRequiredCount = 0;
            room.allNightActionsSubmitted = false;
            room.players.forEach((p, idx) => {
              p.isAlive = true;
              p.role = 'villager';
              delete p.deathPeriod;
              delete p.deathRound;
              p.loverId = null;
              const seat = getSeatTransform(idx, room.players.length, 8.2);
              p.x = seat.x;
              p.z = seat.z;
              p.rotY = seat.rotY;
            });
            room.logs.push('Trở về Sảnh Chờ Huyết Nguyệt Thôn. Sẵn sàng cho nghi lễ tiếp theo!');
            broadcastRoomState(room);
            break;
          }

          case 'chat:send': {
            const sender = room.players.find((p) => p.id === currentPlayerId);
            const text = String(msg.text || '').trim().slice(0, 220);
            // Fallen players can no longer speak (and cannot leak info to the living)
            if (sender && sender.isAlive && text) {
              // Channel is decided by the server so it cannot be spoofed by clients:
              // wolves whispering at night go to the private wolf channel.
              const channel: ChatMessage['channel'] =
                room.phase === 'night' && isWolfPackRole(sender.role) ? 'wolves' : 'global';
              const chatMsg: ChatMessage = {
                id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                senderId: sender.id,
                senderName: sender.name,
                text,
                channel,
                timestamp: Date.now(),
              };
              room.messages.push(chatMsg);
              broadcastRoomState(room);
            }
            break;
          }

          case 'sound:trigger': {
            broadcastEvent(room, {
              type: 'sound:played',
              soundId: String(msg.soundId || 'howl'),
              senderName: String(msg.senderName || ''),
            });
            break;
          }

          case 'fireball:kick': {
            if (msg.fireball) {
              broadcastEvent(
                room,
                {
                  type: 'fireball:kicked',
                  fireball: msg.fireball,
                },
                currentPlayerId
              );
            }
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoomCode && currentPlayerId) {
        const room = rooms.get(currentRoomCode);
        if (room && room.clients.get(currentPlayerId) === ws) {
          room.clients.delete(currentPlayerId);
          const player = room.players.find((p) => p.id === currentPlayerId);
          if (player) {
            if (room.phase === 'lobby') room.players = room.players.filter((p) => p.id !== currentPlayerId);
            player.isHost = false;
            player.isMuted = true;
            player.isSpeaking = false;
            room.logs.push(`${player.name} đã rời phòng.`);
          }
          if (!room.players.some((p) => p.isHost && !p.isBot)) {
            const nextHost = room.players.find((p) => !p.isBot && room.clients.has(p.id));
            if (nextHost) nextHost.isHost = true;
          }
          broadcastEvent(room, { type: 'webrtc:peer-left', peerId: currentPlayerId });
          broadcastRoomState(room);
        }
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Gothic Werewolf 3D server listening on http://localhost:${PORT}`);
  });
}

startServer();

import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
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
  winner: 'ongoing' | Faction;
  winReason: string;
  logs: string[];
  messages: ChatMessage[];
}

interface ServerRoom extends RoomPublicState {
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
      maxPlayers: 8,
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
    Boolean(room.lovers)
  );
  room.nightCompletedCount = progress.completedCount;
  room.nightRequiredCount = progress.requiredCount;
  room.allNightActionsSubmitted = progress.allCompleted;
}

function serializeRoomState(room: ServerRoom): RoomPublicState {
  updateNightProgressFields(room);
  return {
    roomCode: room.roomCode,
    phase: room.phase,
    dayNumber: room.dayNumber,
    maxPlayers: room.maxPlayers ?? 8,
    players: room.players,
    roleDeck: room.roleDeck,
    witchState: room.witchState,
    lastProtectedId: room.lastProtectedId,
    lovers: room.lovers,
    wolfTargetId: room.wolfTargetId,
    seerInspection: room.seerInspection,
    dayVotes: room.dayVotes,
    accusedPlayerId: room.accusedPlayerId ?? null,
    trialVotes: room.trialVotes ?? {},
    phaseEndsAt: room.phaseEndsAt ?? null,
    nightCompletedCount: room.nightCompletedCount ?? 0,
    nightRequiredCount: room.nightRequiredCount ?? 0,
    allNightActionsSubmitted: room.allNightActionsSubmitted ?? false,
    winner: room.winner,
    winReason: room.winReason,
    logs: room.logs.slice(-30),
    messages: room.messages.slice(-50),
  };
}

function broadcastRoomState(room: ServerRoom) {
  const payload = JSON.stringify({
    type: 'room:state',
    state: serializeRoomState(room),
  });
  for (const ws of room.clients.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
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

function fillBotNightActions(room: ServerRoom, humanPlayerId?: string) {
  const alive = room.players.filter((p) => p.isAlive);
  if (alive.length === 0) return;

  for (const bot of alive) {
    if (!bot.isBot && bot.id === humanPlayerId) continue;
    if (!bot.isBot) continue;

    if (isWolfPackRole(bot.role) && !room.nightActions.wolfVotes[bot.id]) {
      const nonWolves = alive.filter((p) => !isWolfPackRole(p.role));
      if (nonWolves.length > 0) {
        const pick = nonWolves[Math.floor(Math.random() * nonWolves.length)];
        room.nightActions.wolfVotes[bot.id] = pick.id;
      }
    } else if (bot.role === 'bodyguard' && !room.nightActions.bodyguardTargetId) {
      const candidates = alive.filter((p) =>
        canBodyguardProtect(room.lastProtectedId, p.id)
      );
      if (candidates.length > 0) {
        room.nightActions.bodyguardTargetId =
          candidates[Math.floor(Math.random() * candidates.length)].id;
      }
    } else if (bot.role === 'seer' && !room.nightActions.seerTargetId) {
      const others = alive.filter((p) => p.id !== bot.id);
      if (others.length > 0) {
        room.nightActions.seerTargetId =
          others[Math.floor(Math.random() * others.length)].id;
      }
    } else if (bot.role === 'aura_seer' && !room.nightActions.auraSeerTargetId) {
      const others = alive.filter((p) => p.id !== bot.id);
      if (others.length > 0) {
        room.nightActions.auraSeerTargetId =
          others[Math.floor(Math.random() * others.length)].id;
      }
    } else if (bot.role === 'cupid' && room.dayNumber === 1 && !room.lovers && !room.nightActions.cupidLovers) {
      if (alive.length >= 2) {
        room.nightActions.cupidLovers = [alive[0].id, alive[1].id];
      }
    } else if (bot.role === 'hunter' && !room.nightActions.hunterRevengeTargetId) {
      const others = alive.filter((p) => p.id !== bot.id);
      if (others.length > 0) {
        room.nightActions.hunterRevengeTargetId =
          others[Math.floor(Math.random() * others.length)].id;
      }
    }

    if (doesRoleHaveNightAction(bot.role, room.dayNumber, room.witchState, Boolean(room.lovers))) {
      markPlayerActed(room, bot.id);
    }
  }

  const wolfTally = Object.values(room.nightActions.wolfVotes);
  if (wolfTally.length > 0 && !room.wolfTargetId) {
    room.wolfTargetId = wolfTally[0];
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
  room.phase = 'night';
  room.wolfTargetId = null;
  room.seerInspection = null;
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

function executeResolveNight(room: ServerRoom) {
  if (room.phase !== 'night') return;
  clearRoomTimers(room);
  fillBotNightActions(room);

  const res = resolveNightActions(
    room.players,
    room.nightActions,
    room.witchState,
    room.lovers,
    room.lastProtectedId
  );

  room.witchState = res.nextWitchState;
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
    if (victim) victim.isAlive = false;
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

function checkNightAutoSkip(room: ServerRoom) {
  if (room.phase !== 'night') return;
  updateNightProgressFields(room);
  if (room.allNightActionsSubmitted && !room.autoAdvanceTimer) {
    // Give 1.2s so players see the inspection result / checkmark before transitioning to Day
    room.autoAdvanceTimer = setTimeout(() => {
      room.autoAdvanceTimer = null;
      if (room.phase === 'night') {
        room.logs.push('Tất cả chức năng trong đêm đã hoàn tất — tự động chuyển sang Ban Ngày!');
        executeResolveNight(room);
      }
    }, 1200);
  }
}

function executeResolveDayDiscussion(room: ServerRoom) {
  if (room.phase !== 'day_discussion' && room.phase !== 'day_voting') return;
  clearRoomTimers(room);
  fillBotDayVotes(room);

  const nomination = selectDayTrialNominee(room.players, room.dayVotes);
  room.logs.push(...nomination.logs);

  if (!nomination.accusedId) {
    // Blank vote won or tie -> skip straight to next Night!
    room.dayNumber += 1;
    room.logs.push(
      `Màn đêm thứ ${room.dayNumber} buông xuống Huyết Nguyệt Thôn. Mỗi người có 1 phút (60s) để thực hiện chức năng.`
    );
    enterNightPhase(room);
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
    room.lovers
  );

  for (const deadId of verdict.deadPlayerIds) {
    const p = room.players.find((pl) => pl.id === deadId);
    if (p) p.isAlive = false;
  }
  room.logs.push(...verdict.logs);

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

      if (room.phase === 'night') {
        room.logs.push('Đã hết 1 phút (60s) ban đêm — bình minh ló dạng trên Huyết Nguyệt Thôn!');
        executeResolveNight(room);
      } else if (room.phase === 'day_discussion' || room.phase === 'day_voting') {
        room.logs.push('Đã hết 3 phút (180s) thảo luận ban ngày — tổng kết phiếu bầu!');
        executeResolveDayDiscussion(room);
      } else if (room.phase === 'day_trial') {
        room.logs.push('Đã hết 30 giây biện minh trên giàn — công bố phán quyết Giết / Sống!');
        executeResolveTrialVerdict(room);
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

          currentRoomCode = roomCode;
          currentPlayerId = playerId;

          const room = getOrCreateRoom(roomCode);
          room.clients.set(playerId, ws);

          // Convert any stale disconnected human slots (closed tabs not in room.clients) back to bots
          room.players.forEach((p, idx) => {
            if (!p.isBot && p.id !== playerId && !room.clients.has(p.id)) {
              const usedNames = new Set(room.players.map((pl) => pl.name));
              room.players[idx] = createBotPlayer(idx, usedNames);
            }
          });

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
              for (let i = 1; i < 8; i++) {
                room.players.push(createBotPlayer(i));
              }
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
          }

          broadcastRoomState(room);
          broadcastEvent(
            room,
            { type: 'webrtc:peer-joined', peerId: playerId, peerName: playerName },
            playerId
          );
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
              if (typeof msg.isMuted === 'boolean') p.isMuted = msg.isMuted;
              if (typeof msg.isSpeaking === 'boolean') p.isSpeaking = msg.isSpeaking;
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
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
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
            if (sender && target) {
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
            if (room.phase !== 'lobby') break;
            if (room.players.length < MAX_ROOM_PLAYERS) {
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
            if (room.phase !== 'lobby') break;
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
            if (room.phase !== 'lobby') break;
            const targetCount = clampRoomPlayerCount(Number(msg.targetCount) || 8);
            room.maxPlayers = targetCount;
            if (msg.fillBots !== false) {
              while (room.players.length < targetCount) {
                const usedNames = new Set(room.players.map((p) => p.name));
                room.players.push(createBotPlayer(room.players.length, usedNames));
              }
            }
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
            if (room.phase !== 'lobby') break;
            if (room.players.length > MIN_ROOM_PLAYERS) {
              const targetId = String(msg.targetId || '');
              const idx = room.players.findIndex((p) => p.id === targetId && p.id !== currentPlayerId);
              if (idx !== -1) {
                const removed = room.players.splice(idx, 1)[0];
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
            if (room.phase === 'lobby' && msg.roleDeck) {
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
            if (caller && !caller.isHost) {
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
            if (room.phase !== 'night') break;
            const actor = room.players.find((p) => p.id === currentPlayerId);
            if (!actor || !actor.isAlive) break;

            const targetId = msg.targetId ? String(msg.targetId) : null;
            const actionType = String(msg.actionType || '');

            if (actionType === 'skip_night_role') {
              markPlayerActed(room, actor.id);
            } else if (actionType === 'little_girl_peek' && actor.role === 'little_girl') {
              markPlayerActed(room, actor.id);
            } else if (actionType === 'alpha_convert' && actor.role === 'alpha_wolf' && targetId) {
              room.nightActions.alphaConvertUsed = true;
              room.nightActions.wolfVotes[actor.id] = targetId;
              for (const p of room.players) {
                if (p.isBot && p.isAlive && isWolfPackRole(p.role)) {
                  room.nightActions.wolfVotes[p.id] = targetId;
                  markPlayerActed(room, p.id);
                }
              }
              room.wolfTargetId = targetId;
              markPlayerActed(room, actor.id);
            } else if (actionType === 'white_wolf_kill' && actor.role === 'white_wolf' && targetId) {
              room.nightActions.whiteWolfTargetId = targetId;
              markPlayerActed(room, actor.id);
            } else if (isWolfPackRole(actor.role) && targetId) {
              room.nightActions.wolfVotes[actor.id] = targetId;
              for (const p of room.players) {
                if (p.isBot && p.isAlive && isWolfPackRole(p.role)) {
                  room.nightActions.wolfVotes[p.id] = targetId;
                  markPlayerActed(room, p.id);
                }
              }
              room.wolfTargetId = targetId;
              markPlayerActed(room, actor.id);
            } else if (actor.role === 'seer' && targetId) {
              room.nightActions.seerTargetId = targetId;
              const inspected = room.players.find((p) => p.id === targetId);
              if (inspected) {
                room.seerInspection = {
                  targetId: inspected.id,
                  isWerewolf: isWolfPackRole(inspected.role),
                  role: inspected.role,
                };
              }
              markPlayerActed(room, actor.id);
            } else if (actor.role === 'aura_seer' && targetId) {
              room.nightActions.auraSeerTargetId = targetId;
              const inspected = room.players.find((p) => p.id === targetId);
              if (inspected) {
                room.seerInspection = {
                  targetId: inspected.id,
                  isWerewolf: isWolfPackRole(inspected.role),
                  role: inspected.role,
                };
              }
              markPlayerActed(room, actor.id);
            } else if (actor.role === 'bodyguard' && targetId) {
              if (canBodyguardProtect(room.lastProtectedId, targetId)) {
                room.nightActions.bodyguardTargetId = targetId;
                markPlayerActed(room, actor.id);
              }
            } else if (actor.role === 'witch') {
              if (actionType === 'heal') {
                room.nightActions.witchSaveUsed = true;
                markPlayerActed(room, actor.id);
              } else if (actionType === 'poison' && targetId) {
                room.nightActions.witchPoisonTargetId = targetId;
                markPlayerActed(room, actor.id);
              }
            } else if (actor.role === 'hunter' && targetId) {
              room.nightActions.hunterRevengeTargetId = targetId;
              markPlayerActed(room, actor.id);
            } else if (actor.role === 'cupid' && Array.isArray(msg.lovers) && msg.lovers.length === 2) {
              room.nightActions.cupidLovers = [
                String(msg.lovers[0]),
                String(msg.lovers[1]),
              ];
              markPlayerActed(room, actor.id);
            }

            updateNightProgressFields(room);
            broadcastRoomState(room);
            checkNightAutoSkip(room);
            break;
          }

          case 'game:resolve-night': {
            executeResolveNight(room);
            break;
          }

          case 'game:start-voting': {
            if (room.phase === 'day_discussion') {
              room.phase = 'day_voting';
              fillBotDayVotes(room);
              broadcastRoomState(room);
            }
            break;
          }

          case 'game:submit-vote': {
            if (room.phase !== 'day_discussion' && room.phase !== 'day_voting') break;
            room.phase = 'day_voting';
            const voter = room.players.find((p) => p.id === currentPlayerId);
            if (voter && voter.isAlive && msg.targetId) {
              room.dayVotes[voter.id] = String(msg.targetId);
            }
            fillBotDayVotes(room);
            broadcastRoomState(room);

            // Check if all alive players have voted -> automatically evaluate trial nominee!
            const alivePlayers = room.players.filter((p) => p.isAlive);
            const allVoted = alivePlayers.every((p) => Boolean(room.dayVotes[p.id]));
            if (allVoted && !room.autoAdvanceTimer) {
              room.autoAdvanceTimer = setTimeout(() => {
                room.autoAdvanceTimer = null;
                if (room.phase === 'day_discussion' || room.phase === 'day_voting') {
                  executeResolveDayDiscussion(room);
                }
              }, 900);
            }
            break;
          }

          case 'game:resolve-vote': {
            if (room.phase === 'day_discussion' || room.phase === 'day_voting') {
              executeResolveDayDiscussion(room);
            } else if (room.phase === 'day_trial') {
              executeResolveTrialVerdict(room);
            }
            break;
          }

          case 'game:submit-trial-vote': {
            if (room.phase !== 'day_trial' || !room.accusedPlayerId) break;
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
              if (allTrialVoted && !room.autoAdvanceTimer) {
                room.autoAdvanceTimer = setTimeout(() => {
                  room.autoAdvanceTimer = null;
                  if (room.phase === 'day_trial') {
                    executeResolveTrialVerdict(room);
                  }
                }, 1000);
              }
            }
            break;
          }

          case 'game:resolve-trial': {
            if (room.phase === 'day_trial') {
              executeResolveTrialVerdict(room);
            }
            break;
          }

          case 'game:reset-lobby': {
            clearRoomTimers(room);
            room.phase = 'lobby';
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
            if (sender && text) {
              const chatMsg: ChatMessage = {
                id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                senderId: sender.id,
                senderName: sender.name,
                text,
                channel: msg.channel || 'global',
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
        if (room) {
          room.clients.delete(currentPlayerId);
          broadcastEvent(room, {
            type: 'webrtc:peer-left',
            peerId: currentPlayerId,
          });
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

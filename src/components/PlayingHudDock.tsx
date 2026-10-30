import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Users,
  Palette,
  Layers,
  Eye,
  Play,
  RotateCcw,
  MessageSquare,
  Settings,
  Sun,
  Moon,
  Sunset,
  Mic,
  MicOff,
  Crosshair,
  Send,
  Zap,
  Minus,
  Plus,
  Clock,
  Skull,
  ShieldCheck,
  Scale,
  Heart,
  UserPlus,
  UserCheck,
  Check,
  FastForward,
  Ban,
  X,
} from 'lucide-react';
import {
  MAX_ROOM_PLAYERS,
  MIN_ROOM_PLAYERS,
  QUICK_CHAT_PRESETS,
  ROLE_CATALOG,
  canBodyguardProtect,
  isWolfPackRole,
  validateLobbyStart,
  type GamePhase,
  type PlayerState,
  type RoleId,
  type SocialInteractionType,
  type WitchPotionState,
} from '../game/rules';
import type { ChatMessage } from '../../server';
import type { LightingStageMode } from '../three/GothicVillageScene';
import { WebRTCVoiceManager } from './WebRTCVoiceManager';
import { soundEngine } from '../audio/soundEngine';

interface PlayingHudDockProps {
  wsRef: React.MutableRefObject<WebSocket | null>;
  roomCode: string;
  phase: GamePhase;
  dayNumber: number;
  maxPlayers?: number;
  players: PlayerState[];
  localPlayer: PlayerState;
  selectedTargetId: string | null;
  witchState: WitchPotionState;
  lastProtectedId: string | null;
  wolfTargetId: string | null;
  seerInspection: { targetId: string; isWerewolf: boolean; role: RoleId } | null;
  dayVotes: Record<string, string>;
  accusedPlayerId?: string | null;
  trialVotes?: Record<string, 'kill' | 'save'>;
  phaseEndsAt?: number | null;
  nightCompletedCount?: number;
  nightRequiredCount?: number;
  allNightActionsSubmitted?: boolean;
  logs: string[];
  messages: ChatMessage[];
  messageCount: number;
  lightingOverride: LightingStageMode;
  isWerewolfNightVision: boolean;
  isHudCollapsed: boolean;
  onToggleHudCollapse: () => void;
  onCycleLightingOverride: () => void;
  onOpenChatDrawer: () => void;
  onOpenSettings: () => void;
  onOpenCustomizer: () => void;
  onOpenRoleCard: () => void;
  onOpenRoomPlayers: () => void;
  onOpenRoleConfig: () => void;
  onSetPlayerCount: (targetCount: number, autoBalanceRoles: boolean) => void;
  onAddBot?: () => void;
  onSelectTarget: (targetId: string | null) => void;
  onInteractPlayer?: (targetId: string, action: SocialInteractionType) => void;
  onToggleReady?: () => void;
  onToggleWolfVision: () => void;
  onStartGame: () => void;
  onSubmitNightAction: (actionType: string, targetId?: string | null, lovers?: [string, string]) => void;
  onResolveNight: () => void;
  onSubmitDayVote: (targetId: string) => void;
  onResolveDayVote: () => void;
  onSubmitTrialVote: (choice: 'kill' | 'save') => void;
  onResolveTrial: () => void;
  onSendChat: (text: string) => void;
  onVoiceStateChange: (isMuted: boolean, isSpeaking: boolean) => void;
}

function formatCountdown(secondsLeft: number): string {
  const clamped = Math.max(0, Math.floor(secondsLeft));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const PlayingHudDock: React.FC<PlayingHudDockProps> = ({
  wsRef,
  roomCode,
  phase,
  dayNumber,
  maxPlayers = 8,
  players,
  localPlayer,
  selectedTargetId,
  witchState,
  lastProtectedId,
  wolfTargetId,
  seerInspection,
  dayVotes,
  accusedPlayerId = null,
  trialVotes = {},
  phaseEndsAt = null,
  nightCompletedCount = 0,
  nightRequiredCount = 0,
  allNightActionsSubmitted = false,
  messageCount,
  lightingOverride,
  isWerewolfNightVision,
  isHudCollapsed,
  onToggleHudCollapse,
  onCycleLightingOverride,
  onOpenChatDrawer,
  onOpenSettings,
  onOpenCustomizer,
  onOpenRoleCard,
  onOpenRoomPlayers,
  onOpenRoleConfig,
  onSetPlayerCount,
  onAddBot,
  onSelectTarget,
  onInteractPlayer,
  onToggleReady,
  onToggleWolfVision,
  onStartGame,
  onSubmitNightAction,
  onResolveNight,
  onSubmitDayVote,
  onResolveDayVote,
  onSubmitTrialVote,
  onResolveTrial,
  onSendChat,
  onVoiceStateChange,
}) => {
  const [cupidFirstId, setCupidFirstId] = useState<string | null>(null);
  const [actionSubmitted, setActionSubmitted] = useState(false);
  const [littleGirlClue, setLittleGirlClue] = useState<string | null>(null);
  const [quickChatInput, setQuickChatInput] = useState('');
  const [showQuickPresets, setShowQuickPresets] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [friendIds, setFriendIds] = useState<Set<string>>(() => new Set());
  const [heartCounts, setHeartCounts] = useState<Record<string, number>>({});
  const [stoneCounts, setStoneCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    setActionSubmitted(false);
    setLittleGirlClue(null);
    setCupidFirstId(null);
  }, [phase, dayNumber]);

  useEffect(() => {
    if (!phaseEndsAt) {
      setSecondsLeft(null);
      return;
    }
    const updateTimer = () => {
      const rem = Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000));
      setSecondsLeft(rem);
    };
    updateTimer();
    const id = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(id);
  }, [phaseEndsAt]);

  const alivePlayers = players.filter((p) => p.isAlive);
  const roleMeta = ROLE_CATALOG[localPlayer.role] || ROLE_CATALOG.villager;

  const selected3DPlayer = players.find((p) => p.id === selectedTargetId) || null;
  const cupidFirstPlayer = players.find((p) => p.id === cupidFirstId) || null;
  const wolfVictimPlayer = players.find((p) => p.id === wolfTargetId) || null;
  const accusedPlayer = players.find((p) => p.id === accusedPlayerId) || null;

  const killVoteCount = Object.values(trialVotes).filter((v) => v === 'kill').length;
  const saveVoteCount = Object.values(trialVotes).filter((v) => v === 'save').length;
  const myTrialVote = trialVotes[localPlayer.id];
  const myDayVote = dayVotes[localPlayer.id];

  const isLobby = phase === 'lobby';
  const lobbyValidation = validateLobbyStart(players, maxPlayers);

  const effectiveLightStage: 'dusk' | 'night' | 'day' =
    lightingOverride !== 'auto'
      ? lightingOverride
      : phase === 'night' || phase === 'role_reveal'
      ? 'night'
      : phase === 'day_announcement' ||
        phase === 'day_discussion' ||
        phase === 'day_voting' ||
        phase === 'day_trial' ||
        phase === 'hunter_revenge'
      ? 'day'
      : 'dusk';

  const shortPhaseTitle =
    phase === 'lobby'
      ? `#${roomCode}`
      : phase === 'role_reveal' || phase === 'night'
      ? `Đêm ${dayNumber}`
      : phase === 'day_discussion' || phase === 'day_voting'
      ? `Ngày ${dayNumber}`
      : phase === 'day_trial'
      ? `Xử`
      : 'Kết';

  const handleConfirm3DNightAction = () => {
    if (!selected3DPlayer || !selected3DPlayer.isAlive) return;

    if (localPlayer.role === 'cupid' && dayNumber === 1) {
      if (!cupidFirstId) {
        setCupidFirstId(selected3DPlayer.id);
      } else if (cupidFirstId !== selected3DPlayer.id) {
        onSubmitNightAction('cupid', null, [cupidFirstId, selected3DPlayer.id]);
        setCupidFirstId(null);
        setActionSubmitted(true);
      }
      return;
    }

    if (
      localPlayer.role === 'bodyguard' &&
      !canBodyguardProtect(lastProtectedId, selected3DPlayer.id)
    ) {
      return;
    }

    if (
      localPlayer.role === 'white_wolf' &&
      isWolfPackRole(selected3DPlayer.role) &&
      selected3DPlayer.id !== localPlayer.id
    ) {
      onSubmitNightAction('white_wolf_kill', selected3DPlayer.id);
      setActionSubmitted(true);
      soundEngine.playHorrorSlash();
      return;
    }

    if (localPlayer.role === 'witch') {
      if (witchState.hasPoisonPotion) {
        onSubmitNightAction('poison', selected3DPlayer.id);
        setActionSubmitted(true);
      }
      return;
    }

    onSubmitNightAction(localPlayer.role, selected3DPlayer.id);
    setActionSubmitted(true);
    if (isWolfPackRole(localPlayer.role)) {
      soundEngine.playHorrorSlash();
    }
  };

  const triggerSocialAction = (target: PlayerState, action: SocialInteractionType) => {
    if (action === 'friend') {
      soundEngine.playHeartChime();
      setFriendIds((prev) => {
        const next = new Set(prev);
        next.add(target.id);
        return next;
      });
    } else if (action === 'heart') {
      soundEngine.playHeartChime();
      setHeartCounts((prev) => ({ ...prev, [target.id]: (prev[target.id] || 0) + 1 }));
    } else if (action === 'stone') {
      soundEngine.playStoneThrow();
      setStoneCounts((prev) => ({ ...prev, [target.id]: (prev[target.id] || 0) + 1 }));
    }

    window.dispatchEvent(
      new CustomEvent('gothic-player-interact', {
        detail: { senderId: localPlayer.id, targetId: target.id, action },
      })
    );
    onInteractPlayer?.(target.id, action);
  };

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-2 sm:p-3">
      {/* Headless WebRTC Voice Manager */}
      <WebRTCVoiceManager
        wsRef={wsRef}
        localPlayerId={localPlayer.id}
        players={players}
        isMuted={localPlayer.isMuted}
        isSpeaking={localPlayer.isSpeaking}
        onVoiceStateChange={onVoiceStateChange}
      />

      {/* Top Perimeter Area: Top Bar + Non-Overlapping Selected 3D Character Social Bar */}
      <div className="w-full flex flex-col items-center gap-1.5">
        <div className="w-full flex items-center justify-between gap-1">
          {/* Zone 1 (Top-Left): Settings, Customizer, Lighting */}
          <div className="pointer-events-auto rounded-xl sm:rounded-2xl bg-[#110d19]/92 border border-[#d4af37]/35 p-1 shadow-xl flex items-center gap-1 shrink-0">
            <button
              type="button"
              data-testid="open-settings-btn"
              aria-label="Cài đặt"
              title="Cài Đặt"
              onClick={onOpenSettings}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#1a1426] hover:bg-[#271e38] border border-white/10 flex items-center justify-center text-[#d4af37] cursor-pointer transition-colors"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            </button>

            <button
              type="button"
              data-testid="open-customizer-btn"
              aria-label="Sửa nhân vật 3D"
              title="Trang Phục 3D"
              onClick={onOpenCustomizer}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#1a1426] hover:bg-[#271e38] border border-violet-400/35 flex items-center justify-center text-violet-300 cursor-pointer transition-colors"
            >
              <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            </button>

            <button
              type="button"
              data-testid="cycle-lighting-stage-btn"
              onClick={onCycleLightingOverride}
              aria-label="Đổi ánh sáng"
              title="Ánh Sáng"
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                effectiveLightStage === 'day'
                  ? 'bg-sky-950/90 border-sky-400/50 text-amber-300'
                  : effectiveLightStage === 'night'
                  ? 'bg-red-950/90 border-red-500/50 text-red-400'
                  : 'bg-amber-950/80 border-amber-400/50 text-amber-400'
              }`}
            >
              {effectiveLightStage === 'day' ? (
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : effectiveLightStage === 'night' ? (
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                <Sunset className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </button>
          </div>

          {/* Zone 2 (Top-Center): Phase, Countdown & Secret Role Icon */}
          <div className="pointer-events-auto h-9 sm:h-10 rounded-xl sm:rounded-2xl bg-[#110d19]/92 border border-[#d4af37]/35 px-2 sm:px-3 shadow-xl flex items-center gap-1.5 shrink-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                phase === 'night' || phase === 'role_reveal'
                  ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                  : phase === 'day_trial'
                  ? 'bg-orange-500 shadow-[0_0_8px_#f97316] animate-ping'
                  : phase === 'day_discussion' || phase === 'day_voting'
                  ? 'bg-amber-300 shadow-[0_0_8px_#fcd34d]'
                  : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
              }`}
            />
            <span className="text-[11px] sm:text-xs font-bold font-display text-white whitespace-nowrap">
              {shortPhaseTitle}
            </span>

            {secondsLeft !== null && !isLobby && (
              <span
                data-testid="phase-countdown-badge"
                className={`px-1.5 py-0.5 rounded-md font-mono-tabular text-[10px] sm:text-[11px] font-bold flex items-center gap-1 border ${
                  secondsLeft <= 10
                    ? 'bg-red-950/90 border-red-500 text-red-200 animate-pulse'
                    : 'bg-black/45 border-white/15 text-[#d4af37]'
                }`}
              >
                <Clock className="w-3 h-3 shrink-0" />
                {formatCountdown(secondsLeft)}
              </span>
            )}

            {!isLobby && (
              <button
                type="button"
                onClick={onOpenRoleCard}
                title={roleMeta.nameVi}
                aria-label="Xem bài Role"
                className="h-6 px-1.5 rounded-lg bg-[#1d1628] hover:bg-[#2a203b] border border-white/15 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                style={{ color: roleMeta.accentColor }}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">{roleMeta.nameVi}</span>
              </button>
            )}
          </div>

          {/* Zone 3 (Top-Right): Room Players (- / + ONLY in Lobby for Host) + Role Deck + Host Start / Player Ready */}
          <div className="pointer-events-auto rounded-xl sm:rounded-2xl bg-[#110d19]/92 border border-[#d4af37]/35 p-1 shadow-xl flex items-center gap-1 shrink-0">
            {/* 3A. Room Players Capsule (- / + locked once game starts!) */}
            <div className="h-7 sm:h-8 rounded-lg bg-[#1a1426] border border-emerald-500/40 flex items-center overflow-hidden shrink-0">
              {isLobby && localPlayer.isHost && (
                <button
                  type="button"
                  data-testid="hud-decrease-players-btn"
                  disabled={maxPlayers <= MIN_ROOM_PLAYERS}
                  aria-label="Giảm người"
                  title="Giảm số lượng người"
                  onClick={() => onSetPlayerCount(maxPlayers - 1, true)}
                  className="w-5 sm:w-6 h-full hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-200 hover:text-white cursor-pointer"
                >
                  <Minus className="w-3 h-3 shrink-0" />
                </button>
              )}

              <button
                type="button"
                data-testid="open-players-modal-btn"
                aria-label="Danh sách người chơi"
                title={isLobby ? lobbyValidation.reasonVi : `${alivePlayers.length}/${players.length}`}
                onClick={onOpenRoomPlayers}
                className="h-full px-1.5 hover:bg-[#271e38] border-x border-white/10 text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span
                  data-testid="hud-player-count-value"
                  className="text-[11px] font-mono-tabular font-bold text-[#d4af37]"
                >
                  {isLobby
                    ? `${players.length}/${maxPlayers}`
                    : `${alivePlayers.length}/${players.length}`}
                </span>
              </button>

              {isLobby && localPlayer.isHost && (
                <button
                  type="button"
                  data-testid="hud-increase-players-btn"
                  disabled={maxPlayers >= MAX_ROOM_PLAYERS}
                  aria-label="Tăng người"
                  title="Tăng số lượng người"
                  onClick={() => onSetPlayerCount(maxPlayers + 1, true)}
                  className="w-5 sm:w-6 h-full hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-200 hover:text-white cursor-pointer"
                >
                  <Plus className="w-3 h-3 shrink-0" />
                </button>
              )}
            </div>

            {/* Quick +Bot Fill Button when Lobby has fewer players than maxPlayers */}
            {isLobby && localPlayer.isHost && players.length < maxPlayers && onAddBot && (
              <button
                type="button"
                data-testid="hud-add-bot-btn"
                onClick={onAddBot}
                title="Thêm Bot cho đủ người"
                aria-label="Thêm Bot"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-950/90 hover:bg-emerald-800 border border-emerald-400/50 text-emerald-300 flex items-center justify-center cursor-pointer shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            )}

            {/* 3B. Role Deck Button */}
            <button
              type="button"
              data-testid="open-roles-modal-btn"
              aria-label="Bộ bài Role"
              title="Bộ Bài Role"
              onClick={onOpenRoleConfig}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#1a1426] hover:bg-[#271e38] border border-[#d4af37]/40 text-[#d4af37] flex items-center justify-center cursor-pointer shrink-0"
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            </button>

            {/* 3C. Primary Action:
                - In Lobby: Host sees Start (<Play />, disabled if not full or not all ready);
                            Non-Host sees Ready (<Check />, toggles isReady).
                - In Game: Host sees Restart (<RotateCcw />). */}
            {isLobby ? (
              localPlayer.isHost ? (
                <button
                  type="button"
                  data-testid="start-night-ritual-btn"
                  disabled={!lobbyValidation.canStart}
                  aria-label="Bắt đầu"
                  title={lobbyValidation.reasonVi}
                  onClick={() => {
                    if (!lobbyValidation.canStart) return;
                    setActionSubmitted(false);
                    soundEngine.playChurchBell();
                    onStartGame();
                  }}
                  className={`h-7 sm:h-8 px-2 rounded-lg flex items-center justify-center gap-1 shadow-md transition-all shrink-0 ${
                    lobbyValidation.canStart
                      ? 'bg-[#9e1b24] hover:bg-[#b91c1c] border border-[#f59e0b]/60 text-amber-200 cursor-pointer active:scale-95'
                      : 'bg-slate-800/80 border border-white/10 text-slate-500 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="toggle-ready-btn"
                  aria-label="Sẵn sàng"
                  title={localPlayer.isReady ? 'Đã sẵn sàng' : 'Bấm Sẵn sàng'}
                  onClick={onToggleReady}
                  className={`h-7 sm:h-8 px-2 rounded-lg border flex items-center justify-center gap-1 text-[11px] font-bold shadow-md cursor-pointer transition-all shrink-0 ${
                    localPlayer.isReady
                      ? 'bg-emerald-600 border-emerald-300 text-white'
                      : 'bg-amber-500 hover:bg-amber-400 border-amber-200 text-slate-950 animate-pulse'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                </button>
              )
            ) : (
              localPlayer.isHost && (
                <button
                  type="button"
                  data-testid="start-night-ritual-btn"
                  aria-label="Ván mới"
                  title="Ván mới"
                  onClick={() => {
                    setActionSubmitted(false);
                    soundEngine.playChurchBell();
                    onStartGame();
                  }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#241a32] hover:bg-[#332447] border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-md cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )
            )}
          </div>
        </div>

        {/* Floating Top-Center 3D Character Social Bar: Kết bạn, Thả tym, Ném đá (Zero overlap with bottom controls!) */}
        {selected3DPlayer && (
          <div
            data-testid="3d-character-social-bar"
            className="pointer-events-auto rounded-xl bg-[#14101f]/95 border border-[#d4af37]/45 px-2.5 py-1 shadow-2xl flex items-center gap-1.5"
          >
            <span className="text-[11px] font-bold text-amber-200 truncate max-w-[120px]">
              #{selected3DPlayer.seatIndex + 1} {selected3DPlayer.name}
            </span>

            {/* 1. Kết Bạn (Add Friend) */}
            <button
              type="button"
              data-testid="interact-friend-btn"
              onClick={() => triggerSocialAction(selected3DPlayer, 'friend')}
              aria-label="Kết bạn"
              title={friendIds.has(selected3DPlayer.id) ? 'Đã kết bạn' : 'Kết bạn'}
              className={`w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
                friendIds.has(selected3DPlayer.id)
                  ? 'bg-emerald-700 border-emerald-300 text-white'
                  : 'bg-[#1f182e] hover:bg-emerald-950 border-emerald-400/40 text-emerald-300'
              }`}
            >
              {friendIds.has(selected3DPlayer.id) ? (
                <UserCheck className="w-3.5 h-3.5" />
              ) : (
                <UserPlus className="w-3.5 h-3.5" />
              )}
            </button>

            {/* 2. Thả Tym (Send Heart) */}
            <button
              type="button"
              data-testid="interact-heart-btn"
              onClick={() => triggerSocialAction(selected3DPlayer, 'heart')}
              aria-label="Thả tym"
              title="Thả tym"
              className="h-7 px-2 rounded-lg bg-rose-950/90 hover:bg-rose-800 active:scale-90 border border-rose-400/50 text-rose-300 flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-all"
            >
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-400" />
              {(heartCounts[selected3DPlayer.id] || 0) > 0 && (
                <span>{heartCounts[selected3DPlayer.id]}</span>
              )}
            </button>

            {/* 3. Ném Đá (Throw Stone) */}
            <button
              type="button"
              data-testid="interact-stone-btn"
              onClick={() => triggerSocialAction(selected3DPlayer, 'stone')}
              aria-label="Ném đá"
              title="Ném đá"
              className="h-7 px-2 rounded-lg bg-stone-800/90 hover:bg-stone-700 active:scale-90 border border-amber-400/40 text-amber-200 flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-all"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 fill-stone-400 stroke-amber-200"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <polygon points="6,4 16,3 21,10 18,19 8,20 3,13" />
              </svg>
              {(stoneCounts[selected3DPlayer.id] || 0) > 0 && (
                <span>{stoneCounts[selected3DPlayer.id]}</span>
              )}
            </button>

            {/* Close Selection */}
            <button
              type="button"
              onClick={() => onSelectTarget(null)}
              aria-label="Đóng"
              className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom HUD Area: Ultra-Compact Icon-First Phase Bar + Mic/Chat Dock */}
      <div className="w-full max-w-fit mx-auto pointer-events-auto flex flex-col items-center gap-1.5">
        {!isHudCollapsed && (
          <>
            {/* 1. Night Phase (60s): Compact Icon-Driven Bar */}
            {phase === 'night' && (
              <div
                data-testid="3d-target-selection-bar"
                className="rounded-xl bg-[#14101f]/95 border border-[#d4af37]/35 px-2 py-1 shadow-xl flex flex-wrap items-center justify-center gap-1.5"
              >
                <span
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-black/40 border border-white/10"
                  style={{ color: roleMeta.accentColor }}
                >
                  {roleMeta.nameVi}
                </span>

                {nightRequiredCount > 0 && (
                  <span
                    data-testid="night-progress-badge"
                    className={`text-[10px] font-mono-tabular font-bold px-1.5 py-0.5 rounded border ${
                      allNightActionsSubmitted
                        ? 'bg-emerald-950/90 border-emerald-400/50 text-emerald-300'
                        : 'bg-black/40 border-white/10 text-slate-300'
                    }`}
                  >
                    {nightCompletedCount}/{nightRequiredCount}
                  </span>
                )}

                <span className="inline-flex items-center gap-1 text-[11px] text-amber-200 font-semibold px-1.5 py-0.5 rounded bg-white/5">
                  <Crosshair className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>
                    {selected3DPlayer ? `#${selected3DPlayer.seatIndex + 1}` : '?'}
                  </span>
                </span>

                {cupidFirstPlayer && localPlayer.role === 'cupid' && (
                  <span className="px-1.5 py-0.5 rounded bg-pink-950/80 border border-pink-400/40 text-pink-200 text-[10px]">
                    ♥ #{cupidFirstPlayer.seatIndex + 1}
                  </span>
                )}

                {seerInspection &&
                  (localPlayer.role === 'seer' || localPlayer.role === 'aura_seer') && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-950/90 border border-purple-400/50 text-purple-200 text-[10px] font-bold">
                      {localPlayer.role === 'seer'
                        ? seerInspection.isWerewolf
                          ? 'SÓI!'
                          : ROLE_CATALOG[seerInspection.role].nameVi
                        : seerInspection.role !== 'villager'
                        ? 'Tà'
                        : 'Dân'}
                    </span>
                  )}

                {littleGirlClue && localPlayer.role === 'little_girl' && (
                  <span className="px-1.5 py-0.5 rounded bg-sky-950/90 border border-sky-400/50 text-sky-200 text-[10px] font-semibold">
                    {littleGirlClue}
                  </span>
                )}

                {isWolfPackRole(localPlayer.role) && (
                  <button
                    type="button"
                    onClick={onToggleWolfVision}
                    title="Huyết Nhãn"
                    aria-label="Huyết Nhãn"
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer ${
                      isWerewolfNightVision
                        ? 'bg-red-950 border-red-500 text-red-200'
                        : 'bg-[#1c1626] border-white/15 text-slate-300'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}

                {localPlayer.role === 'little_girl' && (
                  <button
                    type="button"
                    onClick={() => {
                      const wolves = alivePlayers.filter((p) => isWolfPackRole(p.role));
                      const others = alivePlayers.filter(
                        (p) => !isWolfPackRole(p.role) && p.id !== localPlayer.id
                      );
                      const suspect1 = wolves[0]?.name || '?';
                      const suspect2 = others[0]?.name || '?';
                      setLittleGirlClue(`${suspect1}/${suspect2}`);
                      onSubmitNightAction('little_girl_peek');
                      setActionSubmitted(true);
                    }}
                    title="Rình"
                    className="w-7 h-7 rounded-lg bg-sky-950/90 hover:bg-sky-900 text-sky-200 border border-sky-400/50 flex items-center justify-center cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}

                {localPlayer.role === 'witch' ? (
                  <>
                    <button
                      type="button"
                      disabled={!witchState.hasHealPotion || !wolfTargetId}
                      onClick={() => {
                        onSubmitNightAction('heal');
                        setActionSubmitted(true);
                      }}
                      title={`Cứu ${wolfVictimPlayer ? wolfVictimPlayer.name : ''}`}
                      className="h-7 px-2 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 disabled:opacity-40 text-[11px] font-bold text-emerald-100 border border-emerald-400/40 flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{witchState.hasHealPotion ? '1' : '0'}</span>
                    </button>
                    <button
                      type="button"
                      data-testid="confirm-3d-target-action-btn"
                      disabled={
                        !witchState.hasPoisonPotion ||
                        !selected3DPlayer ||
                        !selected3DPlayer.isAlive
                      }
                      onClick={handleConfirm3DNightAction}
                      title="Bình Độc"
                      className="h-7 px-2 rounded-lg bg-rose-900/80 hover:bg-rose-800 disabled:opacity-40 text-[11px] font-bold text-rose-100 border border-rose-400/40 flex items-center gap-1 cursor-pointer"
                    >
                      <Skull className="w-3.5 h-3.5" />
                      <span>{witchState.hasPoisonPotion ? '1' : '0'}</span>
                    </button>
                  </>
                ) : (
                  localPlayer.role !== 'villager' &&
                  localPlayer.role !== 'elder' &&
                  localPlayer.role !== 'jester' &&
                  localPlayer.role !== 'mayor' &&
                  localPlayer.role !== 'little_girl' && (
                    <>
                      {localPlayer.role === 'alpha_wolf' && (
                        <button
                          type="button"
                          disabled={
                            witchState.hasAlphaConvert === false ||
                            !selected3DPlayer ||
                            !selected3DPlayer.isAlive
                          }
                          onClick={() => {
                            if (selected3DPlayer) {
                              onSubmitNightAction('alpha_convert', selected3DPlayer.id);
                              setActionSubmitted(true);
                            }
                          }}
                          title="Huyết Nguyền"
                          className="h-7 px-2 rounded-lg bg-amber-950/90 hover:bg-amber-900 disabled:opacity-40 text-[11px] font-bold text-amber-200 border border-amber-400/50 cursor-pointer"
                        >
                          Nguyền
                        </button>
                      )}

                      <button
                        type="button"
                        data-testid="confirm-3d-target-action-btn"
                        disabled={!selected3DPlayer || !selected3DPlayer.isAlive}
                        onClick={handleConfirm3DNightAction}
                        title="Thực hiện kỹ năng"
                        className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-35 text-slate-950 font-bold shadow flex items-center justify-center cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </>
                  )
                )}

                {actionSubmitted && (
                  <span className="text-[11px] font-bold text-emerald-400">✓</span>
                )}

                <button
                  type="button"
                  data-testid="resolve-night-btn"
                  title="Qua Đêm"
                  aria-label="Qua Đêm"
                  onClick={() => {
                    soundEngine.playChurchBell();
                    onResolveNight();
                    setActionSubmitted(false);
                    setLittleGirlClue(null);
                  }}
                  className={`w-7 h-7 rounded-lg text-white font-bold shadow flex items-center justify-center cursor-pointer ${
                    allNightActionsSubmitted
                      ? 'bg-emerald-600 hover:bg-emerald-500 ring-1 ring-emerald-300'
                      : 'bg-[#9e1b24] hover:bg-[#b91c1c]'
                  }`}
                >
                  <FastForward className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 2. Day Discussion & Voting (3m / 180s): Icon-First Vote + Blank Vote */}
            {(phase === 'day_discussion' || phase === 'day_voting') && (
              <div
                data-testid="3d-day-voting-bar"
                className="rounded-xl bg-[#14101f]/95 border border-[#d4af37]/35 px-2 py-1 shadow-xl flex flex-wrap items-center justify-center gap-1.5"
              >
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-200 font-semibold px-1.5 py-0.5 rounded bg-white/5">
                  <Crosshair className="w-3 h-3 text-[#d4af37] shrink-0" />
                  <span>
                    {selected3DPlayer ? `#${selected3DPlayer.seatIndex + 1}` : '?'}
                  </span>
                </span>

                {localPlayer.role === 'mayor' && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-400/50 text-amber-200 text-[10px] font-bold">
                    x2
                  </span>
                )}

                <button
                  type="button"
                  data-testid="confirm-3d-vote-btn"
                  disabled={
                    !selected3DPlayer || !selected3DPlayer.isAlive || !localPlayer.isAlive
                  }
                  onClick={() => {
                    if (selected3DPlayer) {
                      onSubmitDayVote(selected3DPlayer.id);
                    }
                  }}
                  title="Bỏ phiếu treo cổ"
                  className="h-7 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-35 text-slate-950 text-[11px] font-bold shadow flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Vote</span>
                </button>

                <button
                  type="button"
                  data-testid="blank-vote-skip-btn"
                  disabled={!localPlayer.isAlive}
                  onClick={() => onSubmitDayVote('skip')}
                  title="Phiếu trắng (Skip)"
                  className={`h-7 px-2 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    myDayVote === 'skip'
                      ? 'bg-slate-700 border-amber-300 text-white'
                      : 'bg-[#1c1626] hover:bg-[#271f36] border-white/20 text-slate-200'
                  }`}
                >
                  <Ban className="w-3 h-3" />
                  <span>Skip</span>
                </button>

                {myDayVote && (
                  <span className="text-[11px] text-emerald-400 font-bold">✓</span>
                )}

                <button
                  type="button"
                  data-testid="resolve-day-vote-btn"
                  title="Chốt phiếu"
                  aria-label="Chốt phiếu"
                  onClick={() => {
                    soundEngine.playHeartbeat();
                    onResolveDayVote();
                  }}
                  className="w-7 h-7 rounded-lg bg-[#9e1b24] hover:bg-[#b91c1c] text-white font-bold shadow flex items-center justify-center cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 3. Gallows Defense Trial Phase (30s): Icon-First Kill / Save Voting */}
            {phase === 'day_trial' && (
              <div
                data-testid="3d-day-trial-bar"
                className="rounded-xl bg-[#190f1c]/95 border-2 border-orange-500/60 px-2.5 py-1.5 shadow-2xl flex flex-wrap items-center justify-center gap-1.5"
              >
                <div className="flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span className="text-xs font-bold text-amber-300">
                    {accusedPlayer
                      ? `#${accusedPlayer.seatIndex + 1} ${accusedPlayer.name}`
                      : '?'}
                  </span>
                </div>

                {localPlayer.id === accusedPlayerId ? (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-950/90 border border-amber-400/50 text-[10px] font-semibold text-amber-200">
                    Biện minh 30s
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="trial-vote-kill-btn"
                      disabled={!localPlayer.isAlive}
                      onClick={() => {
                        soundEngine.playHorrorSlash();
                        onSubmitTrialVote('kill');
                      }}
                      title="Giết (Treo cổ)"
                      className={`h-7 px-2 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        myTrialVote === 'kill'
                          ? 'bg-red-600 text-white ring-2 ring-red-300 shadow-lg'
                          : 'bg-red-950/90 hover:bg-red-800 border border-red-500/60 text-red-100'
                      }`}
                    >
                      <Skull className="w-3.5 h-3.5" />
                      <span>{killVoteCount}</span>
                    </button>

                    <button
                      type="button"
                      data-testid="trial-vote-save-btn"
                      disabled={!localPlayer.isAlive}
                      onClick={() => onSubmitTrialVote('save')}
                      title="Sống (Tha bổng)"
                      className={`h-7 px-2 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        myTrialVote === 'save'
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 shadow-lg'
                          : 'bg-emerald-950/90 hover:bg-emerald-800 border border-emerald-500/60 text-emerald-100'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{saveVoteCount}</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  data-testid="resolve-trial-btn"
                  title="Phán quyết"
                  aria-label="Phán quyết"
                  onClick={() => {
                    soundEngine.playChurchBell();
                    onResolveTrial();
                  }}
                  className="w-7 h-7 rounded-lg bg-[#9e1b24] hover:bg-[#b91c1c] text-white font-bold shadow flex items-center justify-center cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </>
        )}

        {/* 3. Quick-Chat Presets Strip ("Chọn text nhanh") */}
        {showQuickPresets && (
          <div
            data-testid="quick-chat-presets-bar"
            className="max-w-[94vw] sm:max-w-lg overflow-x-auto no-scrollbar rounded-xl bg-[#110d19]/90 border border-[#d4af37]/30 px-2 py-1 shadow-xl flex items-center gap-1"
          >
            {QUICK_CHAT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                data-testid="quick-chat-preset-btn"
                onClick={() => onSendChat(preset)}
                className="px-2 py-0.5 rounded-lg bg-[#1d162b] hover:bg-[#2d2142] active:scale-95 border border-[#d4af37]/30 text-[11px] font-medium text-amber-100 whitespace-nowrap cursor-pointer transition-all shrink-0"
              >
                {preset}
              </button>
            ))}
          </div>
        )}

        {/* 4. Bottom Dock: Icon-Only Mic + Quick Text Toggle + Inline Text Input + Icon-Only Chat */}
        <div className="rounded-2xl bg-[#110d19]/95 border border-[#d4af37]/40 p-1.5 shadow-2xl flex items-center gap-1.5">
          {/* Button 1: Mic Toggle (Icon-Only, No Text) */}
          <button
            type="button"
            data-testid="priority-mic-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('gothic-toggle-mic'))}
            aria-label={localPlayer.isMuted ? 'Bật Mic Đàm Thoại' : 'Tắt Mic Đàm Thoại'}
            title={localPlayer.isMuted ? 'Bật Mic Voice Chat' : 'Tắt Mic Voice Chat'}
            className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-md cursor-pointer transition-all shrink-0 ${
              !localPlayer.isMuted && localPlayer.isSpeaking
                ? 'bg-emerald-600 border-emerald-300 text-white ring-2 ring-emerald-400/50'
                : !localPlayer.isMuted
                ? 'bg-emerald-900/90 border-emerald-400/60 text-emerald-100'
                : 'bg-[#1e172a] hover:bg-[#2a203b] border-[#d4af37]/40 text-amber-200'
            }`}
          >
            {localPlayer.isMuted ? (
              <MicOff className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <Mic className="w-4 h-4 text-emerald-300 shrink-0 animate-pulse" />
            )}
          </button>

          {/* Button 2: Toggle Quick-Text Presets ("Chọn text nhanh") */}
          <button
            type="button"
            data-testid="toggle-quick-chat-btn"
            onClick={() => setShowQuickPresets((v) => !v)}
            aria-label="Bật/Tắt chọn text nhanh"
            title="Chọn câu chat nhanh"
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-md cursor-pointer transition-colors shrink-0 ${
              showQuickPresets
                ? 'bg-[#2a1f3d] border-[#d4af37]/60 text-[#d4af37]'
                : 'bg-[#1e172a] hover:bg-[#2a203b] border-white/15 text-slate-300'
            }`}
          >
            <Zap className="w-4 h-4 shrink-0" />
          </button>

          {/* Inline Text Input ("Ô nhập text") + Send Button */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = quickChatInput.trim();
              if (!trimmed) return;
              onSendChat(trimmed);
              setQuickChatInput('');
            }}
            className="h-9 rounded-xl bg-[#1b1426] border border-white/15 focus-within:border-[#d4af37]/70 px-2 flex items-center gap-1.5"
          >
            <input
              type="text"
              data-testid="quick-chat-input"
              aria-label="Nhập tin nhắn nhanh"
              value={quickChatInput}
              onChange={(e) => setQuickChatInput(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="w-28 sm:w-44 bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              data-testid="quick-chat-send-btn"
              aria-label="Gửi tin nhắn"
              title="Gửi tin nhắn (Enter)"
              className="w-6 h-6 rounded-lg bg-[#d4af37]/20 hover:bg-[#d4af37] text-[#d4af37] hover:text-slate-950 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Button 3: Chat / Nhắn Tin Drawer Toggle (Icon-Only, No Text) */}
          <button
            type="button"
            data-testid="open-chat-drawer-btn"
            aria-label="Mở lịch sử nhắn tin"
            title="Mở lịch sử Nhắn tin & Nhật ký (C)"
            onClick={onOpenChatDrawer}
            className="relative w-9 h-9 rounded-xl bg-[#1e172a] hover:bg-[#2a203b] border border-[#d4af37]/40 text-amber-200 flex items-center justify-center shadow-md cursor-pointer transition-all shrink-0"
          >
            <MessageSquare className="w-4 h-4 text-[#d4af37] shrink-0" />
            {messageCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#9e1b24] border border-amber-300/50 text-[9px] font-mono-tabular font-bold text-white flex items-center justify-center">
                {messageCount}
              </span>
            )}
          </button>

          {/* Minimal Icon-Only Collapse Toggle for Night/Day Action Pill */}
          {(phase === 'night' || phase === 'day_discussion' || phase === 'day_voting') && (
            <button
              type="button"
              onClick={onToggleHudCollapse}
              aria-label={isHudCollapsed ? 'Hiện thanh kỹ năng' : 'Ẩn thanh kỹ năng'}
              title={isHudCollapsed ? 'Hiện thanh kỹ năng (H)' : 'Ẩn thanh kỹ năng (H)'}
              className="w-8 h-9 rounded-xl bg-[#181224] hover:bg-[#231b33] border border-white/10 text-[#d4af37] flex items-center justify-center cursor-pointer transition-colors shrink-0"
            >
              {isHudCollapsed ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


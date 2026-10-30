import { loadFriends, saveFriend } from '../lib/friendsStore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Users,
  Layers,
  Pointer,
  Mountain,
  Eye,
  Play,
  MessageSquare,
  Settings,
  Mic,
  MicOff,
  Crosshair,
  Send,
  Zap,
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
import type { CameraPreset } from '../three/GothicVillageScene';
import { WebRTCVoiceManager } from './WebRTCVoiceManager';
import { soundEngine } from '../audio/soundEngine';
import { renderRoleWoodcutSvg } from './RoleTarotModal';

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
  littleGirlClue?: string | null;
  dayVotes: Record<string, string>;
  accusedPlayerId?: string | null;
  trialVotes?: Record<string, 'kill' | 'save'>;
  phaseEndsAt?: number | null;
  nightCompletedCount?: number;
  nightRequiredCount?: number;
  allNightActionsSubmitted?: boolean;
  myNightActionRequired?: boolean;
  myNightActionSubmitted?: boolean;
  logs: string[];
  messages: ChatMessage[];
  messageCount: number;
  isWerewolfNightVision: boolean;
  isHudCollapsed: boolean;
  cameraPreset: CameraPreset;
  onPointFirstPerson: () => void;
  onToggleOverview: () => void;
  onToggleHudCollapse: () => void;
  onOpenChatDrawer: () => void;
  onOpenSettings: () => void;
  onOpenRoleCard: () => void;
  onOpenRoomPlayers: () => void;
  onOpenRoleConfig: () => void;
  onOpenFriends: () => void;
  onSelectTarget: (targetId: string | null) => void;
  onInteractPlayer?: (targetId: string, action: SocialInteractionType) => void;
  onToggleReady?: () => void;
  onToggleWolfVision: () => void;
  onStartGame: () => void;
  onSubmitNightAction: (actionType: string, targetId?: string | null, lovers?: [string, string]) => void;
  onSubmitDayVote: (targetId: string) => void;
  onSubmitTrialVote: (choice: 'kill' | 'save') => void;
  onResolveTrial: () => void;
  onSendChat: (text: string) => void;
  onVoiceStateChange: (isMuted: boolean, isSpeaking: boolean) => void;
}

const CAMERA_MODE_LABELS: Record<CameraPreset, { short: string; full: string }> = {
  follow: { short: '3rd', full: 'Góc Nhìn Thứ 3 (Theo Bước)' },
  first: { short: '1st', full: 'Góc Nhìn Thứ Nhất' },
  bonfire: { short: 'Lửa', full: 'Cận Cảnh Lửa Trại' },
  overview: { short: 'Toàn', full: 'Toàn Cảnh Làng Cổ' },
};

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
  littleGirlClue,
  dayVotes,
  accusedPlayerId = null,
  trialVotes = {},
  phaseEndsAt = null,
  nightCompletedCount = 0,
  nightRequiredCount = 0,
  allNightActionsSubmitted = false,
  myNightActionRequired = false,
  myNightActionSubmitted = false,
  messageCount,
  messages,
  isWerewolfNightVision,
  isHudCollapsed,
  cameraPreset,
  onPointFirstPerson,
  onToggleOverview,
  onToggleHudCollapse,
  onOpenChatDrawer,
  onOpenSettings,
  onOpenRoleCard,
  onOpenRoomPlayers,
  onOpenRoleConfig,
  onOpenFriends,
  onSelectTarget,
  onInteractPlayer,
  onToggleReady,
  onToggleWolfVision,
  onStartGame,
  onSubmitNightAction,
  onSubmitDayVote,
  onSubmitTrialVote,
  onResolveTrial,
  onSendChat,
  onVoiceStateChange,
}) => {
  const [cupidFirstId, setCupidFirstId] = useState<string | null>(null);
  const [quickChatInput, setQuickChatInput] = useState('');
  const [showQuickPresets, setShowQuickPresets] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [friendIds, setFriendIds] = useState<Set<string>>(() => new Set());
  const bottomDockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dock = bottomDockRef.current;
    if (!dock) return;
    const update = () => document.documentElement.style.setProperty('--game-controls-bottom', `${Math.ceil(window.innerHeight - dock.getBoundingClientRect().top + 12)}px`);
    const observer = new ResizeObserver(update);
    observer.observe(dock);
    window.addEventListener('resize', update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      document.documentElement.style.removeProperty('--game-controls-bottom');
    };
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () => void loadFriends().then((friends) => {
      if (active) setFriendIds(new Set(friends.map((friend) => friend.id)));
    }).catch(() => {});
    refresh();
    window.addEventListener('gothic-friends-changed', refresh);
    return () => { active = false; window.removeEventListener('gothic-friends-changed', refresh); };
  }, [localPlayer.id, selectedTargetId]);

  useEffect(() => {

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

      soundEngine.playHorrorSlash();
      return;
    }

    if (localPlayer.role === 'witch') {
      if (witchState.hasPoisonPotion) {
        onSubmitNightAction('poison', selected3DPlayer.id);

      }
      return;
    }

    onSubmitNightAction(localPlayer.role, selected3DPlayer.id);

    if (isWolfPackRole(localPlayer.role)) {
      soundEngine.playHorrorSlash();
    }
  };

  const topGroup = 'pointer-events-auto flex h-11 shrink-0 items-center gap-1 rounded-xl border border-[#d4af37]/35 bg-[#110d19]/95 p-1 shadow-lg';
  const topButton = 'flex h-9 w-8 sm:w-9 shrink-0 items-center justify-center rounded-lg border border-[#d4af37]/20 bg-[#211a2e] text-[#e8cd82] transition-colors hover:bg-[#342640] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200';

  const triggerSocialAction = (target: PlayerState, action: SocialInteractionType) => {
    if (target.id === localPlayer.id) return;
    if (action === 'friend') {
      if (friendIds.has(target.id)) return;
      void saveFriend({ playerId: target.id, name: target.name, roomCode, note: '' });
      soundEngine.playHeartChime();
      setFriendIds((prev) => {
        const next = new Set(prev);
        next.add(target.id);
        return next;
      });
    } else if (action === 'heart') {
      soundEngine.playHeartChime();
    } else if (action === 'stone') {
      soundEngine.playStoneThrow();
    }

    window.dispatchEvent(
      new CustomEvent('gothic-player-interact', {
        detail: { senderId: localPlayer.id, targetId: target.id, action },
      })
    );
    onInteractPlayer?.(target.id, action);
  };

  const socialPointerDown = (e: React.PointerEvent<HTMLButtonElement>, target: PlayerState, action: SocialInteractionType) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    triggerSocialAction(target, action);
  };

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-2 sm:p-3">
      {/* Headless WebRTC Voice Manager */}
      <WebRTCVoiceManager
        wsRef={wsRef}
        localPlayerId={localPlayer.id}
        players={players}
        phase={phase}
        localRole={localPlayer.role}
        localIsAlive={localPlayer.isAlive}
        isMuted={localPlayer.isMuted}
        isSpeaking={localPlayer.isSpeaking}
        onVoiceStateChange={onVoiceStateChange}
      />

      {/* Top Perimeter Area: Top Bar + Non-Overlapping Selected 3D Character Social Bar */}
      <div className="w-full flex flex-col items-center gap-1.5">
        <div className="w-full flex items-center justify-between gap-1">
          {/* Match phase on the left; lobby action uses the available space. */}
          <div className={`pointer-events-auto flex items-center gap-1 shrink-0 ${isLobby ? 'flex-1 justify-start' : 'h-11 rounded-xl bg-[#110d19]/95 border border-[#d4af37]/35 px-2 shadow-lg'}`}>
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

                    soundEngine.playChurchBell();
                    onStartGame();
                  }}
                  className={`min-h-11 px-3 sm:px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold tracking-wide shadow-lg transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${
                    lobbyValidation.canStart
                      ? 'bg-gradient-to-b from-[#a62231] to-[#68121e] border-[#e5b95d] text-[#fff1c8] hover:from-[#bd3040] hover:to-[#811927] cursor-pointer active:scale-95'
                      : 'bg-[#241c2b] border-[#71614e] text-[#b4a7a1] cursor-not-allowed'
                  }`}
                >
                  <span className="w-6 h-6 rounded-md bg-black/20 border border-white/15 flex items-center justify-center"><Play className="w-3 h-3 fill-current shrink-0" /></span>
                  <span className="whitespace-nowrap">Bắt đầu</span>
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="toggle-ready-btn"
                  aria-label="Sẵn sàng"
                  aria-pressed={localPlayer.isReady}
                  title={localPlayer.isReady ? 'Đã sẵn sàng' : 'Bấm Sẵn sàng'}
                  onClick={onToggleReady}
                  className={`min-h-11 px-3 sm:px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold tracking-wide shadow-lg cursor-pointer transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${
                    localPlayer.isReady
                      ? 'bg-gradient-to-b from-[#24644d] to-[#143c31] border-emerald-400/70 text-emerald-50'
                      : 'bg-gradient-to-b from-[#a62231] to-[#68121e] border-[#e5b95d] text-[#fff1c8] hover:from-[#bd3040]'
                  }`}
                >
                  <span className="w-6 h-6 rounded-md bg-black/20 border border-white/15 flex items-center justify-center"><Check className="w-3.5 h-3.5 shrink-0" /></span>
                  <span className="whitespace-nowrap">{localPlayer.isReady ? 'Đã sẵn sàng' : 'Sẵn sàng'}</span>
                </button>
              )
            ) : (
              <>
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
                className={`px-1.5 py-1 rounded-lg font-mono-tabular text-[10px] sm:text-[11px] font-bold flex items-center gap-1 border ${
                  secondsLeft <= 10
                    ? 'bg-red-950/90 border-red-500 text-red-200 animate-pulse'
                    : 'bg-black/45 border-white/15 text-[#d4af37]'
                }`}
              >
                <Clock className="w-3 h-3 shrink-0" />
                {formatCountdown(secondsLeft)}
              </span>
            )}

              </>
            )}
          </div>

          {/* Zone 3 (Top-Right): Room Players + Role Deck + Room Actions */}
          <div className={topGroup}>
            {/* 3A. Room Players Capsule */}
            <div className="flex h-9 shrink-0 items-center overflow-hidden rounded-lg border border-[#d4af37]/20 bg-[#211a2e]">
              <button
                type="button"
                data-testid="open-players-modal-btn"
                aria-label="Danh sách người chơi"
                title={isLobby ? lobbyValidation.reasonVi : `${alivePlayers.length}/${players.length}`}
                onClick={onOpenRoomPlayers}
                className="flex h-full items-center gap-1 px-2 text-[#e8cd82] hover:bg-[#342640] focus-visible:outline-2 focus-visible:outline-amber-200"
              >
                <Users className="w-4 h-4 shrink-0" />
                <span
                  data-testid="hud-player-count-value"
                  className="text-[11px] font-mono-tabular font-bold text-[#d4af37]"
                >
                  {isLobby
                    ? `${players.length}/${maxPlayers}`
                    : `${alivePlayers.length}/${players.length}`}
                </span>
              </button>

            </div>

            <button type="button" onClick={onOpenRoleConfig} aria-label="Bộ bài Role" title="Bộ bài Role" data-testid="open-roles-modal-btn" className={topButton}>
              <Layers className="w-4 h-4" />
            </button>

            <button type="button" data-testid="invite-friends-btn" onClick={onOpenFriends} aria-label="Mời bạn bè" title="Mời bạn bè" className={topButton}>
              <UserPlus className="w-4 h-4" />
            </button>

            <button type="button" data-testid="open-settings-btn" onClick={onOpenSettings} aria-label="Cài đặt" title="Cài đặt" className={topButton}>
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div data-testid="hud-secondary-row" className="grid w-full grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
        {!isLobby && phase !== 'ended' && (
          <button
            type="button"
            onClick={onOpenRoleCard}
            aria-label={`Xem lá bài của bạn: ${roleMeta.nameVi}`}
            title={roleMeta.nameVi}
            data-testid="open-role-card-btn"
            className="pointer-events-auto col-start-1 row-start-1 flex h-11 w-11 items-center justify-center rounded-xl border border-[#d4af37]/35 bg-[#110d19]/95 p-1 shadow-lg transition-colors hover:bg-[#342640] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
          >
            <span aria-hidden="true" className="block h-full w-full [&_svg]:!h-full [&_svg]:!w-full">
              {renderRoleWoodcutSvg(localPlayer.role, roleMeta.accentColor)}
            </span>
          </button>
        )}

        {/* Selected player actions */}
        {selected3DPlayer && selected3DPlayer.id !== localPlayer.id && (
          <div
            data-testid="3d-character-social-bar"
            className="pointer-events-auto col-start-2 row-start-1 flex h-11 min-w-0 w-full items-center gap-1 rounded-xl border border-[#d4af37]/35 bg-[#110d19]/95 p-1 shadow-lg"
          >
            <span className="min-w-0 flex-1 truncate px-1 text-xs font-bold text-[#e8cd82]">
              #{selected3DPlayer.seatIndex + 1} {selected3DPlayer.name}
            </span>

            {/* 1. Kết Bạn (Add Friend) */}
            <button
              type="button"
              data-testid="interact-friend-btn"
              onPointerDown={(e) => socialPointerDown(e, selected3DPlayer, 'friend')}
              onClick={(e) => { if (e.detail === 0) triggerSocialAction(selected3DPlayer, 'friend'); }}
              aria-label={friendIds.has(selected3DPlayer.id) ? 'Đã kết bạn' : 'Kết bạn'}
              aria-pressed={friendIds.has(selected3DPlayer.id)}
              title={friendIds.has(selected3DPlayer.id) ? 'Đã kết bạn' : 'Kết bạn'}
              className={`${topButton} touch-none ${friendIds.has(selected3DPlayer.id) ? '!bg-emerald-950 !border-emerald-400/60 !text-emerald-300' : ''}`}
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
              onPointerDown={(e) => socialPointerDown(e, selected3DPlayer, 'heart')}
              onClick={(e) => { if (e.detail === 0) triggerSocialAction(selected3DPlayer, 'heart'); }}
              aria-label="Thả tym"
              title="Thả tym"
              className={`${topButton} touch-none gap-1 !text-rose-300`}
            >
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-400" />
            </button>

            {/* 3. Ném Đá (Throw Stone) */}
            <button
              type="button"
              data-testid="interact-stone-btn"
              onPointerDown={(e) => socialPointerDown(e, selected3DPlayer, 'stone')}
              onClick={(e) => { if (e.detail === 0) triggerSocialAction(selected3DPlayer, 'stone'); }}
              aria-label="Ném đá"
              title="Ném đá"
              className={`${topButton} touch-none gap-1`}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 fill-stone-400 stroke-amber-200"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <polygon points="6,4 16,3 21,10 18,19 8,20 3,13" />
              </svg>
            </button>

            {/* Close Selection */}
            <button
              type="button"
              onClick={() => onSelectTarget(null)}
              aria-label="Đóng"
              className={`${topButton} !text-slate-400`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
          <button type="button" data-testid="overview-camera-btn" onClick={onToggleOverview} aria-label={cameraPreset === 'overview' ? 'Trở lại góc nhìn nhân vật' : 'Xem toàn cảnh'} aria-pressed={cameraPreset === 'overview'} className={`pointer-events-auto col-start-3 row-start-1 flex h-11 w-11 items-center justify-center rounded-xl border ${cameraPreset === 'overview' ? 'bg-[#9e1b24]/90 border-[#d4af37]/70 text-amber-100' : 'bg-[#110d19]/95 border-[#d4af37]/35 text-amber-200 hover:bg-[#2a203b]'}`}>
            <Mountain className="h-5 w-5" />
          </button>
        </div>
      </div>
      {/* Bottom HUD Area: Ultra-Compact Icon-First Phase Bar + Mic/Chat Dock */}
      <div ref={bottomDockRef} data-testid="bottom-game-dock" className="w-full max-w-fit mx-auto pointer-events-auto flex flex-col items-center gap-1.5">
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
                          : 'Không phải Sói'
                        : seerInspection.role !== 'villager'
                        ? 'Có chức năng'
                        : 'Dân thường'}
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

                {myNightActionRequired && !myNightActionSubmitted && localPlayer.isAlive && (
                  <>
                {localPlayer.role === 'little_girl' && (
                  <button
                    type="button"
                    onClick={() => onSubmitNightAction('little_girl_peek')}
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

                    <button type="button" data-testid="skip-night-action-btn" onClick={() => onSubmitNightAction('skip_night_role')} className="min-h-8 rounded-lg border border-white/20 bg-[#1c1626] px-2 text-[11px] font-semibold text-slate-200 hover:bg-[#271f36]">Bỏ qua</button>
                  </>
                )}
                {(myNightActionSubmitted || !myNightActionRequired) && (
                  <span data-testid="night-waiting-status" role="status" className="text-[11px] font-semibold text-emerald-300">{myNightActionSubmitted ? 'Đã xác nhận · Chờ người chơi khác' : 'Chờ người chơi khác'}</span>
                )}
              </div>
            )}

            {/* 2. Day Discussion & Voting (3m / 180s): Icon-First Vote + Blank Vote */}
            {localPlayer.isAlive && (phase === 'day_discussion' || phase === 'day_voting') && (
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


              </div>
            )}

            {/* 3. Gallows Defense Trial Phase (30s): Icon-First Kill / Save Voting */}
            {localPlayer.isAlive && phase === 'day_trial' && (
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
            className="quick-chat-strip max-w-[94vw] sm:max-w-lg overflow-x-auto overscroll-x-contain rounded-xl bg-[#110d19]/95 border border-[#d4af37]/30 px-2 py-2 shadow-xl flex items-center gap-1.5"
          >
            {QUICK_CHAT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                data-testid="quick-chat-preset-btn"
                onClick={() => onSendChat(preset)}
                className="min-h-9 px-3 rounded-lg bg-[#241b30] hover:bg-[#34263f] active:scale-95 border border-[#d4af37]/30 text-xs font-medium text-amber-100 whitespace-nowrap cursor-pointer transition-all shrink-0"
              >
                {preset}
              </button>
            ))}
          </div>
        )}

        {messages.length > 0 && (
          <details data-testid="latest-chat-preview" className="w-full rounded-xl border border-white/15 bg-[#110d19]/95 text-xs text-slate-200">
            <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 px-3 py-2">
              <MessageSquare aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#e8cd82]" />
              <span className="min-w-0 flex-1 truncate"><strong className="text-[#e8cd82]">{messages[messages.length - 1].senderName}: </strong>{messages[messages.length - 1].text}</span>
              <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            </summary>
            <div className="space-y-2 border-t border-white/10 px-3 py-2">
              <div className="modal-scroll max-h-28 space-y-2 overflow-y-auto">
                {messages.slice(-4).map((message) => <p key={message.id} className="break-words leading-relaxed"><strong className="text-[#e8cd82]">{message.senderName}: </strong>{message.text}</p>)}
              </div>
              <button type="button" onClick={onOpenChatDrawer} className="min-h-8 text-xs font-semibold text-[#e8cd82]">Xem tất cả tin nhắn</button>
            </div>
          </details>
        )}

        {/* Bottom Dock */}
        <div className="rounded-2xl bg-[#110d19]/95 border border-[#d4af37]/40 p-1.5 shadow-2xl flex items-center gap-1.5">
          {/* Button 1: Mic Toggle (Icon-Only, No Text) */}
          <button
            type="button"
            data-testid="priority-mic-btn"
            onClick={() => {
              if (!localPlayer.isAlive) return;
              window.dispatchEvent(new CustomEvent('gothic-toggle-mic'));
            }}
            disabled={!localPlayer.isAlive}
            aria-label={
              !localPlayer.isAlive
                ? 'Đã ngã xuống - không thể nói'
                : localPlayer.isMuted
                ? 'Bật Mic Đàm Thoại'
                : 'Tắt Mic Đàm Thoại'
            }
            title={
              !localPlayer.isAlive
                ? 'Người đã chết không thể nói'
                : localPlayer.isMuted
                ? 'Bật Mic Voice Chat'
                : 'Tắt Mic Voice Chat'
            }
            className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-md shrink-0 ${
              !localPlayer.isAlive
                ? 'bg-[#161020] border-white/10 text-slate-600 opacity-60 cursor-not-allowed'
                : 'cursor-pointer transition-all ' +
                  (!localPlayer.isMuted && localPlayer.isSpeaking
                    ? 'bg-emerald-600 border-emerald-300 text-white ring-2 ring-emerald-400/50'
                    : !localPlayer.isMuted
                    ? 'bg-emerald-900/90 border-emerald-400/60 text-emerald-100'
                    : 'bg-[#1e172a] hover:bg-[#2a203b] border-[#d4af37]/40 text-amber-200')
            }`}
          >
            {!localPlayer.isAlive ? (
              <Skull className="w-4 h-4 text-slate-500 shrink-0" />
            ) : localPlayer.isMuted ? (
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
              placeholder={
                phase === 'night' && isWolfPackRole(localPlayer.role)
                  ? 'Nhắn riêng bầy sói...'
                  : localPlayer.isAlive
                  ? 'Nhập tin nhắn...'
                  : 'Đã chết - không thể nói'
              }
              disabled={!localPlayer.isAlive}
              className="w-28 sm:w-44 bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
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

          {/* Pointing is available during an active match. */}
          {!isLobby && phase !== 'ended' && (
          <button
            type="button"
            data-testid="cycle-camera-btn"
            onClick={onPointFirstPerson}
            aria-label={cameraPreset === 'first' ? 'Tắt chỉ tay · Góc nhìn thứ ba' : 'Bật chỉ tay · Góc nhìn thứ nhất'}
            aria-pressed={cameraPreset === 'first'}
            title={cameraPreset === 'first' ? 'Tắt chỉ tay · Góc nhìn thứ ba' : 'Bật chỉ tay · Góc nhìn thứ nhất'}
            style={{ bottom: 'max(var(--game-controls-bottom, 104px), 104px)' }}
            className={`fixed right-[calc(0.625rem+52px)] sm:right-[calc(1rem+52px)] z-30 pointer-events-auto w-11 h-11 rounded-full border flex items-center justify-center shadow-md cursor-pointer transition-colors ${
              cameraPreset === 'first'
                ? 'bg-[#9e1b24]/65 border-[#d4af37]/80 text-[#f3e5ab] opacity-95'
                : 'bg-[#110d19]/32 border-[#d4af37]/30 text-[#d4af37]/85 opacity-75 hover:opacity-90'
            }`}
          >
            <Pointer className="w-5 h-5 shrink-0" />
          </button>
          )}



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


import { chatChannels, type ChatChannel } from './game/chatChannels';
import { visibleChatMessages } from './game/chatBubbles';
import { shouldShowGameOver } from './game/gameOver';
import { BrandMark } from './components/BrandMark';
import { AccountPanel } from './components/AccountPanel';
import { SOCIAL_LOGIN_ENABLED } from './lib/socialAuth';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APPEARANCE_PRESETS,
  MIN_ROOM_PLAYERS,
  canPlayerMoveInPhase,
  clampRoleDeckToPlayerCount,
  clampRoomPlayerCount,
  DEFAULT_ROLE_DECK,
  getRecommendedRoleDeckForCount,
  type CharacterAppearance,
  type PlayerState,
  type RoleDeckConfig,
  type RoleId,
} from './game/rules';
import type { RoomPublicState } from '../server';
import { GothicVillageScene, type CameraPreset } from './three/GothicVillageScene';
import {
  GameOverModal,
  PauseModal,
  TitleScreenOverlay,
} from './components/GameShellModals';
import { PlayingHudDock } from './components/PlayingHudDock';
import { RoleTarotModal } from './components/RoleTarotModal';
import { CharacterCustomizerModal } from './components/CharacterCustomizerModal';
import { RoomPlayersModal } from './components/RoomPlayersModal';
import { RoleConfigModal } from './components/RoleConfigModal';
import { ChatDrawerModal } from './components/ChatDrawerModal';
import { FriendsModal } from './components/FriendsModal';
import { SettingsModal } from './components/SettingsModal';
import { MobileMovementPad, type MobileMovementInput } from './components/MobileMovementPad';
import { soundEngine } from './audio/soundEngine';
import { toggleOverview } from './game/followCamera';
import { loadCharacter, saveCharacter } from './lib/characterStorage';
import { supabase, syncCharacter } from './lib/supabaseCharacter';
import { newlyDeadPlayers } from './game/deathNotifications';

function createInitialLocalState(
  roomCode: string,
  localPlayerId: string,
  localName: string,
  localAppearance: CharacterAppearance
): RoomPublicState {
  const players: PlayerState[] = [
    {
      id: localPlayerId,
      name: localName,
      isHost: true,
      isBot: false,
      isAlive: true,
      role: 'villager',
      seatIndex: 0,
      x: 0,
      z: 8.6,
      rotY: Math.PI,
      appearance: localAppearance,
      isMuted: true,
      isSpeaking: false,
      isReady: true,
      loverId: null,
    },
  ];

  return {
    roomCode,
    phase: 'lobby',
    dayNumber: 1,
    maxPlayers: MIN_ROOM_PLAYERS,
    players,
    roleDeck: getRecommendedRoleDeckForCount(MIN_ROOM_PLAYERS),
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
      `Phòng #${roomCode} sẵn sàng.`,
    ],
    messages: [],
  };
}

export default function App() {
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialRoomCode = (urlParams.get('room') || 'GOTHIC').toUpperCase();
  const isAutoStart = urlParams.get('autostart') === '1';
  const [isIntroPlaying, setIsIntroPlaying] = useState(!isAutoStart);
  const [hasChosenAccount, setHasChosenAccount] = useState(!SOCIAL_LOGIN_ENABLED || isAutoStart);

  const [localPlayerId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('gothic_player_id') || sessionStorage.getItem('gothic_player_id');
      const id = saved || `p_${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
      localStorage.setItem('gothic_player_id', id);
      return id;
    } catch {
      return `p_${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    }
  });
  const [savedCharacter] = useState(() => {
    try { return loadCharacter(localStorage); } catch { return null; }
  });
  const [hasCharacter, setHasCharacter] = useState(Boolean(savedCharacter));

  const [playerName, setPlayerName] = useState<string>(savedCharacter?.name ?? 'Lữ Khách');
  const [roomCode, setRoomCode] = useState<string>(initialRoomCode);
  const [appearance, setAppearance] = useState<CharacterAppearance>(
    () => ({ ...(savedCharacter?.appearance ?? APPEARANCE_PRESETS[0]) })
  );

  const [shellState, setShellState] = useState<'title' | 'playing' | 'paused' | 'gameover'>(
    isAutoStart ? 'playing' : 'title'
  );

  const [roomState, setRoomState] = useState<RoomPublicState>(() =>
    createInitialLocalState(initialRoomCode, localPlayerId, playerName, appearance)
  );

  const [roomError, setRoomError] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('follow');
  const [lightingOverride, setLightingOverride] = useState<'auto' | 'dusk' | 'night' | 'day'>('auto');
  const [isWerewolfNightVision, setIsWerewolfNightVision] = useState(false);

  const [audioVolume, setAudioVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('gothic-game-volume');
      const value = saved === null ? 1 : Number(saved);
      return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
    } catch { return 1; }
  });
  const isAudioMuted = audioVolume === 0;
  const lastAudibleVolume = useRef(audioVolume || 1);
  const toggleAudio = useCallback(() => setAudioVolume((current) => current === 0 ? lastAudibleVolume.current : 0), []);
  useEffect(() => {
    if (audioVolume > 0) lastAudibleVolume.current = audioVolume;
    soundEngine.setVolume(audioVolume);
    soundEngine.setMuted(audioVolume === 0);
    try { localStorage.setItem('gothic-game-volume', String(audioVolume)); } catch { /* Storage may be unavailable. */ }
  }, [audioVolume]);
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);
  const [showVirtualPad, setShowVirtualPad] = useState(true);

  // Separated Independent Panels / Modals:
  // 1. Sửa Nhân Vật Riêng (Character Customizer 3D Studio)
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  // 2. Thanh Chat Riêng (Dedicated Chat & Chronicle Drawer)
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  // 3. Setting Riêng (Dedicated Settings & Soundboard Modal)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // 4. Quản Lý Người Trong Phòng Riêng (Dedicated Room Players & Invite Modal)
  const [isRoomPlayersOpen, setIsRoomPlayersOpen] = useState(false);
  // 5. Chọn Role Theo Số Lượng Người Trong Phòng Riêng (Dedicated Role Config Modal)
  const [isRoleConfigOpen, setIsRoleConfigOpen] = useState(false);
  // 6. Role Tarot Reveal Modal
  const [isRoleCardModalOpen, setIsRoleCardModalOpen] = useState(false);
  // 7. Danh Sách Bạn Bè (Friends List)
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mobileInputRef = useRef<MobileMovementInput>({
    moveX: 0,
    moveZ: 0,
    jumpRequested: false,
    lookDeltaYaw: 0,
    lookDeltaPitch: 0,
    isHoldingEye: false,
  });

  const [profileReady, setProfileReady] = useState(!supabase);
  const [profileSyncError, setProfileSyncError] = useState(false);
  const profileInitRef = useRef<Promise<void> | null>(null);
  const profileWritesRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!supabase || !hasChosenAccount) return;
    if (!profileInitRef.current) {
      profileInitRef.current = (async () => {
        try {
          let dirty = false;
          try { dirty = localStorage.getItem('gothic_character_dirty') === '1'; } catch { /* unavailable */ }
          const authIntent = localStorage.getItem('gothic_auth_intent');
          const character = await syncCharacter(supabase, savedCharacter, authIntent === 'login' ? false : dirty);
          localStorage.removeItem('gothic_auth_intent');
          if (character) {
            setPlayerName(character.name);
            setAppearance(character.appearance);
            setHasCharacter(true);
            setRoomState((prev) => ({ ...prev, players: prev.players.map((p) => p.id === localPlayerId ? { ...p, name: character.name, appearance: character.appearance } : p) }));
            try { saveCharacter(localStorage, character); localStorage.removeItem('gothic_character_dirty'); } catch { /* unavailable */ }
          }
          setProfileSyncError(false);
        } catch {
          setProfileSyncError(true);
        } finally {
          setProfileReady(true);
        }
      })();
    }
  }, [savedCharacter, localPlayerId, hasChosenAccount]);

  const persistCharacter = useCallback((name: string, app: CharacterAppearance) => {
    const character = { name: name.trim() || 'Lữ Khách', appearance: app };
    try { saveCharacter(localStorage, character); if (supabase) localStorage.setItem('gothic_character_dirty', '1'); } catch { /* unavailable */ }
    setHasCharacter(true);
    const client = supabase;
    if (!client) return;
    profileWritesRef.current = profileWritesRef.current.then(async () => {
      try {
        await syncCharacter(client, character, true);
        try {
          if (JSON.stringify(loadCharacter(localStorage)) === JSON.stringify(character)) localStorage.removeItem('gothic_character_dirty');
        } catch { /* unavailable */ }
        setProfileSyncError(false);
      } catch { setProfileSyncError(true); }
    });
  }, []);

  const previousLifeRef = useRef<Map<string, boolean> | null>(null);
  const gameOverTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (shellState === 'title') {
      previousLifeRef.current = null;
      if (gameOverTimerRef.current !== null) window.clearTimeout(gameOverTimerRef.current);
      gameOverTimerRef.current = null;
      document.body.dataset.state = 'title';
      return;
    }
    if (roomState.phase !== 'ended') {
      if (gameOverTimerRef.current !== null) window.clearTimeout(gameOverTimerRef.current);
      gameOverTimerRef.current = null;
      if (shellState === 'gameover') {
        setShellState('playing');
        document.body.dataset.state = 'playing';
        return;
      }
    }
    const deaths = previousLifeRef.current ? newlyDeadPlayers(previousLifeRef.current, roomState.players) : [];
    previousLifeRef.current = new Map(roomState.players.map((p) => [p.id, p.isAlive]));
    if (roomState.phase === 'ended' && shellState !== 'gameover') {
      document.body.dataset.state = 'gameover';
      if (gameOverTimerRef.current === null) {
        if (deaths.length) {
          gameOverTimerRef.current = window.setTimeout(() => {
            gameOverTimerRef.current = null;
            setShellState('gameover');
          }, deaths.length * 3500);
        } else {
          setShellState('gameover');
        }
      }
    } else {
      document.body.dataset.state = shellState;
    }
  }, [shellState, roomState.phase, roomState.players]);
  useEffect(() => () => {
    if (gameOverTimerRef.current !== null) window.clearTimeout(gameOverTimerRef.current);
  }, []);

  // Update ambient music harmony & sync stage lighting on phase transitions
  useEffect(() => {
    setLightingOverride('auto');
    if (shellState === 'title') return;
    if (roomState.phase === 'night' || roomState.phase === 'role_reveal') {
      soundEngine.startAmbient('night');
    } else if (roomState.phase === 'day_discussion' || roomState.phase === 'day_voting') {
      soundEngine.startAmbient('day');
    } else {
      soundEngine.startAmbient('lobby');
    }
  }, [roomState.phase, shellState]);

  // Connect only while in a room; leaving closes the socket and stops reconnects.
  const inRoom = shellState !== 'title' && profileReady;
  useEffect(() => {
    if (!inRoom) return;
    let reconnectTimer: number | null = null;
    let unmounted = false;

    function connectWs() {
      if (unmounted) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'room:join',
            roomCode,
            playerId: localPlayerId,
            playerName,
            appearance,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'room:error') {
            setRoomError(String(msg.message || 'Không thể vào phòng.'));
            setShellState('title');
          } else if (msg.type === 'room:state' && msg.state) {
            setRoomState(msg.state);
          } else if (msg.type === 'player:moved') {
            setRoomState((prev) => ({
              ...prev,
              players: prev.players.map((p) =>
                p.id === msg.playerId
                  ? { ...p, x: msg.x, z: msg.z, rotY: msg.rotY }
                  : p
              ),
            }));
          } else if (msg.type === 'voice:updated') {
            setRoomState((prev) => ({
              ...prev,
              players: prev.players.map((p) =>
                p.id === msg.playerId
                  ? { ...p, isMuted: msg.isMuted, isSpeaking: msg.isSpeaking }
                  : p
              ),
            }));
          } else if (msg.type === 'sound:played') {
            if (msg.soundId === 'howl') soundEngine.playWolfHowl();
            else if (msg.soundId === 'bell') soundEngine.playChurchBell();
            else if (msg.soundId === 'heartbeat') soundEngine.playHeartbeat();
          } else if (msg.type === 'fireball:kicked' && msg.fireball) {
            soundEngine.playFireballKick();
            window.dispatchEvent(
              new CustomEvent('gothic-fireball-event', { detail: msg.fireball })
            );
          } else if (msg.type === 'player:interacted') {
            if (msg.senderId !== localPlayerId) {
              if (msg.action === 'stone') soundEngine.playStoneThrow();
              else soundEngine.playHeartChime();
              window.dispatchEvent(
                new CustomEvent('gothic-player-interact', { detail: msg })
              );
            }
          } else if (
            msg.type === 'webrtc:peer-joined' ||
            msg.type === 'webrtc:peer-left' ||
            msg.type === 'webrtc:signal'
          ) {
            window.dispatchEvent(new CustomEvent('gothic-webrtc-event', { detail: msg }));
          }
        } catch {
          // Ignore malformed WS message
        }
      };

      ws.onclose = () => {
        if (!unmounted) {
          reconnectTimer = window.setTimeout(connectWs, 2000);
        }
      };
    }

    connectWs();
    return () => {
      unmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [roomCode, localPlayerId, inRoom]);

  const sendWs = useCallback((payload: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const handleEnterVillage = useCallback(
    (overrideRoomCode?: string) => {
      const targetCode = (overrideRoomCode || roomCode || 'GOTHIC').trim().toUpperCase();
      if (!profileReady || isIntroPlaying || !hasChosenAccount) return;
      setRoomError('');
      persistCharacter(playerName, appearance);
      if (targetCode !== roomCode) {
        setRoomCode(targetCode);
      }
      document.body.dataset.state = 'playing';
      setShellState('playing');
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      soundEngine.startAmbient('lobby');
      soundEngine.playChurchBell();

    },
    [roomCode, localPlayerId, playerName, appearance, sendWs, profileReady, isIntroPlaying, hasChosenAccount, persistCharacter]
  );

  // Keyboard shortcuts (Enter/Space on Title, Esc/P for Pause, H for Collapse HUD, C for Chat, M for Mute, V for Camera)
  const CAMERA_CYCLE: CameraPreset[] = ['follow', 'first'];
  const previousCameraRef = useRef<'follow' | 'first'>('follow');

  const cycleCameraPreset = useCallback(() => {
    setCameraPreset((prev) => {
      const current = prev === 'overview' ? previousCameraRef.current : prev;
      const idx = CAMERA_CYCLE.indexOf(current);
      const next = CAMERA_CYCLE[(idx + 1) % CAMERA_CYCLE.length] as 'follow' | 'first';
      previousCameraRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (shellState === 'title') {
        if ((e.code === 'Enter' || e.code === 'Space') && !isCustomizerOpen) {
          e.preventDefault();
          handleEnterVillage();
        }
        return;
      }

      if (e.code === 'Escape' && isFriendsOpen) {
        e.preventDefault();
        setIsFriendsOpen(false);
      } else if (e.code === 'KeyF') {
        setIsFriendsOpen((v) => !v);
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        setShellState((prev) => (prev === 'paused' ? 'playing' : 'paused'));
      } else if (e.code === 'KeyH') {
        setIsHudCollapsed((v) => !v);
      } else if (e.code === 'KeyC') {
        setIsChatDrawerOpen((v) => !v);
      } else if (e.code === 'KeyV') {
        cycleCameraPreset();
      } else if (e.code === 'KeyM') {
        toggleAudio();
      } else if (e.code === 'KeyR') {
        sendWs({ type: 'game:reset-lobby' });
        setShellState('playing');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shellState, isCustomizerOpen, isFriendsOpen, handleEnterVillage, sendWs, cycleCameraPreset, toggleAudio]);

  const [preferredChatChannel, setPreferredChatChannel] = useState<ChatChannel>('global');
  const [clearedChatThrough, setClearedChatThrough] = useState(0);
  useEffect(() => setClearedChatThrough(0), [roomCode]);
  const chatMessages = visibleChatMessages(roomState.messages, roomState.phase, clearedChatThrough);
  const localPlayer = useMemo(() => {
    return (
      roomState.players.find((p) => p.id === localPlayerId) ||
      roomState.players[0] || {
        id: localPlayerId,
        name: playerName,
        isHost: true,
        isBot: false,
        isAlive: true,
        role: 'villager' as RoleId,
        seatIndex: 0,
        x: 0,
        z: 12.8,
        rotY: Math.PI,
        appearance,
        isMuted: true,
        isSpeaking: false,
        isReady: true,
        loverId: null,
      }
    );
  }, [roomState.players, localPlayerId, playerName, appearance]);

  const channels = chatChannels(roomState.phase, localPlayer, roomState.lovers);
  const channel = channels.includes(preferredChatChannel) ? preferredChatChannel : channels[0] ?? 'global';
  const channelProps = { channels, channel, onChannelChange: setPreferredChatChannel };

  const handleLocalMove = useCallback(
    (x: number, z: number, rotY: number) => {
      sendWs({ type: 'player:move', x, z, rotY });
    },
    [sendWs]
  );

  const handleSaveCustomization = (newName: string, newApp: CharacterAppearance) => {
    if (hasCharacter) persistCharacter(newName, newApp);
    setPlayerName(newName);
    setAppearance(newApp);
    setRoomState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === localPlayerId ? { ...p, name: newName, appearance: newApp } : p
      ),
    }));
    sendWs({
      type: 'player:customize',
      name: newName,
      appearance: newApp,
    });
  };

  const handleStartGame = (preferredRole?: RoleId) => {
    setSelectedTargetId(null);
    sendWs({ type: 'game:start', preferredRole });
  };

  const handleSetPlayerCount = useCallback(
    (targetCount: number, autoBalanceRoles = true) => {
      const clamped = clampRoomPlayerCount(targetCount);
      sendWs({
        type: 'room:set-player-count',
        targetCount: clamped,
        autoBalanceRoles,
      });
    },
    [sendWs]
  );

  const handleLeaveRoom = () => {
    setSelectedTargetId(null);
    setIsChatDrawerOpen(false);
    setIsSettingsOpen(false);
    setIsRoomPlayersOpen(false);
    setIsRoleConfigOpen(false);
    setIsRoleCardModalOpen(false);
    setIsFriendsOpen(false);
    mobileInputRef.current = { moveX: 0, moveZ: 0, jumpRequested: false, lookDeltaYaw: 0, lookDeltaPitch: 0, isHoldingEye: false };
    setRoomState(createInitialLocalState(roomCode, localPlayerId, playerName, appearance));
    previousCameraRef.current = 'follow';
    setCameraPreset('follow');
    setShellState('title');
  };

  const handleConfirmRoleReveal = () => {
    setIsRoleCardModalOpen(false);
    if (roomState.phase === 'role_reveal') {
      sendWs({ type: 'game:enter-night' });
    }
  };

  const showRoleTarot =
    shellState === 'playing' &&
    (roomState.phase === 'role_reveal' || isRoleCardModalOpen);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#09080d] select-none">
      {/* Persistent Full-Bleed 3D Gothic Village Canvas */}
      <GothicVillageScene
        key={`${roomState.roomCode}-${shellState === 'title'}`}
        isTitleScreen={shellState === 'title'}
        isIntroPlaying={isIntroPlaying}
        onIntroComplete={() => setIsIntroPlaying(false)}
        phase={roomState.phase}
        players={roomState.players}
        messages={chatMessages}
        localPlayerId={localPlayer.id}
        selectedTargetId={selectedTargetId}
        dayVotes={roomState.dayVotes}
        accusedPlayerId={roomState.accusedPlayerId ?? null}
        phaseTransition={roomState.phaseTransition}
        phaseEndsAt={roomState.phaseEndsAt}
        cameraPreset={cameraPreset}
        lightingOverride={lightingOverride}
        isWerewolfNightVision={isWerewolfNightVision}
        mobileInputRef={mobileInputRef}
        onSelectPlayer={(pid) => setSelectedTargetId(pid)}
        onLocalMove={handleLocalMove}
        onKickFireball={(fireball) => sendWs({ type: 'fireball:kick', fireball })}
      />

      {/* Ergonomic Mobile & Touch Movement Pad (360° Virtual Analog Joystick + Jump Icon + 360° Camera Eye) */}
      <MobileMovementPad
        visible={
          showVirtualPad &&
          shellState === 'playing' &&
          !isCustomizerOpen &&
          !isSettingsOpen &&
          !isRoomPlayersOpen &&
          !isRoleConfigOpen &&
          !isRoleCardModalOpen &&
          !isFriendsOpen
        }
        canMove={canPlayerMoveInPhase(roomState.phase)}
        isHudCollapsed={isHudCollapsed}
        inputRef={mobileInputRef}
      />

      {shellState === 'title' && isIntroPlaying && (
        <div role="status" className="pointer-events-none fixed bottom-8 left-0 right-0 text-center text-xs font-medium tracking-wide text-amber-100/80">Đang khám phá ngôi làng...</div>
      )}

      {shellState === 'title' && !isIntroPlaying && !hasChosenAccount && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#07060b]/90 p-4">
          <div className="my-auto w-full max-w-sm space-y-4">
            <BrandMark />
            <div className="text-center"><h2 className="text-lg font-semibold text-white">Chọn cách vào làng</h2><p className="mt-1 text-xs text-slate-400">Chơi khách hoặc đăng nhập để giữ nhân vật.</p></div>
            <AccountPanel onContinue={() => setHasChosenAccount(true)} />
          </div>
        </div>
      )}
      {shellState === 'title' && !isIntroPlaying && hasChosenAccount && !profileReady && <div role="status" className="fixed inset-0 z-40 flex items-center justify-center bg-[#07060b]/90 text-sm text-amber-100">Đang tải nhân vật...</div>}

      {/* Title Screen Stage Overlay */}
      {shellState === 'title' && hasChosenAccount && profileReady && !isIntroPlaying && (
        <TitleScreenOverlay
          playerName={playerName}
          hasCharacter={hasCharacter}
          onCompleteCharacter={() => persistCharacter(playerName, appearance)}
          roomCode={roomCode}
          appearance={appearance}
          onChangeName={setPlayerName}
          onChangeRoomCode={(code) => setRoomCode(code || 'GOTHIC')}
          onChangeAppearance={(newApp) => {
            setAppearance(newApp);
            handleSaveCustomization(playerName, newApp);
          }}
          onStartGame={handleEnterVillage}
          onOpenCustomizer={() => setIsCustomizerOpen(true)}
        />
      )}

      {roomError && <div role="alert" className="fixed bottom-12 left-4 right-4 z-50 rounded-lg bg-red-950 px-3 py-2 text-center text-sm text-red-100">{roomError}</div>}

      {profileSyncError && (
        <div role="status" className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-[#241a32] px-3 py-2 text-xs text-amber-100 text-center">
          Chưa đồng bộ Supabase; nhân vật vẫn được lưu trên thiết bị.
        </div>
      )}

      {/* Playing HUD & Streamlined Ritual Action Bar */}
      {shellState !== 'title' && (
        <PlayingHudDock
          {...channelProps}
          wsRef={wsRef}
          roomCode={roomState.roomCode}
          phase={roomState.phase}
          dayNumber={roomState.dayNumber}
          maxPlayers={roomState.maxPlayers ?? roomState.players.length}
          players={roomState.players}
          localPlayer={localPlayer}
          selectedTargetId={selectedTargetId}
          witchState={roomState.witchState}
          lastProtectedId={roomState.lastProtectedId}
          wolfTargetId={roomState.wolfTargetId}
          seerInspection={roomState.seerInspection}
          nightFeedback={roomState.nightFeedback}
          littleGirlClue={roomState.littleGirlClue}
          dayVotes={roomState.dayVotes}
          accusedPlayerId={roomState.accusedPlayerId}
          trialVotes={roomState.trialVotes}
          phaseEndsAt={roomState.phaseEndsAt}
          phaseTransition={roomState.phaseTransition}
          nightCompletedCount={roomState.nightCompletedCount}
          nightRequiredCount={roomState.nightRequiredCount}
          allNightActionsSubmitted={roomState.allNightActionsSubmitted}
          myNightActionRequired={roomState.myNightActionRequired}
          myNightActionSubmitted={roomState.myNightActionSubmitted}
          logs={roomState.logs}
          messages={chatMessages}
          messageCount={chatMessages.length}
          isWerewolfNightVision={isWerewolfNightVision}
          isHudCollapsed={isHudCollapsed}
          cameraPreset={cameraPreset}
          onPointFirstPerson={() => setCameraPreset((current) => {
            const next = current === 'first' ? 'follow' : 'first';
            previousCameraRef.current = next;
            return next;
          })}
          onToggleOverview={() => setCameraPreset((prev) => {
            if (prev === 'follow' || prev === 'first') previousCameraRef.current = prev;
            return toggleOverview(prev, previousCameraRef.current);
          })}
          onToggleHudCollapse={() => setIsHudCollapsed((v) => !v)}
          onOpenChatDrawer={() => setIsChatDrawerOpen((v) => !v)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenRoleCard={() => setIsRoleCardModalOpen(true)}
          onOpenRoomPlayers={() => setIsRoomPlayersOpen(true)}
          onOpenRoleConfig={() => setIsRoleConfigOpen(true)}
          onOpenFriends={() => setIsFriendsOpen(true)}
          onSelectTarget={(tid) => setSelectedTargetId(tid)}
          onToggleWolfVision={() => setIsWerewolfNightVision((v) => !v)}
          onStartGame={() => handleStartGame()}
          onToggleReady={() => sendWs({ type: 'player:toggle-ready' })}
          onInteractPlayer={(targetId, action) =>
            sendWs({ type: 'player:interact', targetId, action })
          }
          onSubmitNightAction={(actionType, targetId, lovers) =>
            sendWs({
              type: 'game:night-action',
              actionType,
              targetId,
              lovers,
            })
          }
          onSubmitDayVote={(targetId) => sendWs({ type: 'game:submit-vote', targetId })}
          onSubmitTrialVote={(choice) => sendWs({ type: 'game:submit-trial-vote', choice })}

          onSendChat={(text) => { if (channels.length) sendWs({ type: 'chat:send', text, channel }); }}
          onVoiceStateChange={(isMuted, isSpeaking) => {
            setRoomState((prev) => ({
              ...prev,
              players: prev.players.map((p) =>
                p.id === localPlayer.id ? { ...p, isMuted, isSpeaking } : p
              ),
            }));
            sendWs({ type: 'voice:status', isMuted, isSpeaking });
          }}
        />
      )}

      {/* 1. Thanh Chat Riêng: Dedicated Slide-Over Chat & Chronicle Drawer */}
      <ChatDrawerModal
        {...channelProps}
        onClearConversation={() => setClearedChatThrough(Math.max(0, ...roomState.messages.map((m) => m.timestamp)))}
        isOpen={isChatDrawerOpen}
        messages={chatMessages}
        logs={roomState.logs}
        phase={roomState.phase}
        localPlayer={localPlayer}
        onSendChat={(text) => { if (channels.length) sendWs({ type: 'chat:send', text, channel }); }}
        onClose={() => setIsChatDrawerOpen(false)}
      />

      {/* 2. Setting Riêng: Dedicated Settings & Horror Soundboard Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        isAudioMuted={isAudioMuted}
        audioVolume={audioVolume}
        onAudioVolumeChange={setAudioVolume}
        isLobby={roomState.phase === 'lobby'}
        lightingOverride={lightingOverride}
        onCycleLightingOverride={() => setLightingOverride((prev) => prev === 'auto' ? 'day' : prev === 'day' ? 'night' : prev === 'night' ? 'dusk' : 'auto')}
        onOpenCustomizer={() => { setIsSettingsOpen(false); setIsCustomizerOpen(true); }}
        cameraPreset={cameraPreset}
        showVirtualPad={showVirtualPad}
        isHudCollapsed={isHudCollapsed}

        onChangeCameraPreset={(preset) => { if (preset === 'first' || preset === 'follow') previousCameraRef.current = preset; setCameraPreset(preset); }}
        onToggleVirtualPad={() => setShowVirtualPad((v) => !v)}
        onToggleHudCollapse={() => setIsHudCollapsed((v) => !v)}
        onTriggerHorrorSound={(soundId) => {
          if (soundId === 'howl') soundEngine.playWolfHowl();
          else if (soundId === 'bell') soundEngine.playChurchBell();
          else if (soundId === 'heartbeat') soundEngine.playHeartbeat();
          sendWs({ type: 'sound:trigger', soundId, senderName: localPlayer.name });
        }}
        onResetLobby={() => {
          sendWs({ type: 'game:reset-lobby' });
          setShellState('playing');
        }}
        onReturnTitle={handleLeaveRoom}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* 3. Sửa Nhân Vật Riêng: Dedicated 3D Character Customizer Studio Modal */}
      {isCustomizerOpen && (
        <CharacterCustomizerModal
          playerName={playerName}
          appearance={appearance}
          onSave={handleSaveCustomization}
          onClose={() => setIsCustomizerOpen(false)}
        />
      )}

      {/* 4. Quản Lý Người Trong Phòng Riêng: Dedicated Room Players & Invite Modal */}
      <RoomPlayersModal
        isOpen={isRoomPlayersOpen}
        isLobby={roomState.phase === 'lobby'}
        maxPlayers={roomState.maxPlayers ?? roomState.players.length}
        roomCode={roomState.roomCode}
        players={roomState.players}
        localPlayerId={localPlayer.id}
        onAddBot={() => sendWs({ type: 'room:add-bot' })}
        onRemoveBot={() => sendWs({ type: 'room:remove-bot' })}
        onSetPlayerCount={handleSetPlayerCount}
        onKickPlayer={(targetId) => sendWs({ type: 'room:kick-player', targetId })}
        onPromoteHost={(targetId) => sendWs({ type: 'room:promote-host', targetId })}
        onOpenRoleConfig={() => setIsRoleConfigOpen(true)}
        onClose={() => setIsRoomPlayersOpen(false)}
      />

      {/* 8. Danh Sách Bạn Bè: Friends List & Quick Invite */}
      <FriendsModal
        isOpen={isFriendsOpen}
        currentRoomCode={roomState.roomCode}
        onJoinRoom={(code) => handleEnterVillage(code)}
        onClose={() => setIsFriendsOpen(false)}
      />

      {/* 5. Chọn Role Theo Số Lượng Người Trong Phòng Riêng: Dedicated Role Config Modal */}
      <RoleConfigModal
        isHost={localPlayer.isHost}
        isOpen={isRoleConfigOpen}
        isLobby={roomState.phase === 'lobby'}
        playerCount={roomState.maxPlayers ?? roomState.players.length}
        roleDeck={roomState.roleDeck}
        onUpdateDeck={(partial: Partial<RoleDeckConfig>) =>
          sendWs({ type: 'room:update-deck', roleDeck: partial })
        }
        onSetPlayerCount={handleSetPlayerCount}
        onStartWithPreferredRole={(rId) => handleStartGame(rId)}
        onOpenRoomPlayers={() => setIsRoomPlayersOpen(true)}
        onClose={() => setIsRoleConfigOpen(false)}
      />

      {/* 3D Flipping Horror Tarot Role Card Modal */}
      {showRoleTarot && (
        <RoleTarotModal
          role={localPlayer.role}
          playerName={localPlayer.name}
          isInitialReveal={roomState.phase === 'role_reveal'}
          onConfirm={handleConfirmRoleReveal}
        />
      )}

      {/* Pause Modal */}
      {shellState === 'paused' && (
        <PauseModal
          onResume={() => setShellState('playing')}
          onResetLobby={() => {
            sendWs({ type: 'game:reset-lobby' });
            setShellState('playing');
          }}
          onReturnTitle={() => setShellState('title')}
        />
      )}

      {/* Game Over / Victory Modal */}
      {shouldShowGameOver(shellState, roomState.phase, roomState.winner) && (
        <GameOverModal
          winner={roomState.winner}
          winReason={roomState.winReason}
          dayNumber={roomState.dayNumber}
          localRole={localPlayer.role}
          players={roomState.players}
          nightRecaps={roomState.nightRecaps}
          onPlayAgain={() => {
            sendWs({ type: 'game:reset-lobby' });
            handleStartGame();
          }}
          onReturnLobby={() => sendWs({ type: 'game:reset-lobby' })}
        />
      )}
    </main>
  );
}

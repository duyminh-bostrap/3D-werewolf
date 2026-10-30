import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APPEARANCE_PRESETS,
  BOT_NAMES,
  canPlayerMoveInPhase,
  clampRoleDeckToPlayerCount,
  clampRoomPlayerCount,
  DEFAULT_ROLE_DECK,
  getRecommendedRoleDeckForCount,
  getSeatTransform,
  type CharacterAppearance,
  type PlayerState,
  type RoleDeckConfig,
  type RoleId,
} from './game/rules';
import type { RoomPublicState } from '../server';
import { GothicVillageScene } from './three/GothicVillageScene';
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
import { SettingsModal } from './components/SettingsModal';
import { MobileMovementPad, type MobileMovementInput } from './components/MobileMovementPad';
import { soundEngine } from './audio/soundEngine';

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
      z: 12.8,
      rotY: Math.PI,
      appearance: localAppearance,
      isMuted: true,
      isSpeaking: false,
      isReady: true,
      loverId: null,
    },
  ];

  for (let i = 1; i < 8; i++) {
    const seat = getSeatTransform(i, 8, 8.2);
    players.push({
      id: `bot_init_${i}`,
      name: BOT_NAMES[(i - 1) % BOT_NAMES.length],
      isHost: false,
      isBot: true,
      isAlive: true,
      role: 'villager',
      seatIndex: i,
      x: seat.x,
      z: seat.z,
      rotY: seat.rotY,
      appearance: APPEARANCE_PRESETS[i % APPEARANCE_PRESETS.length],
      isMuted: true,
      isSpeaking: false,
      isReady: true,
      loverId: null,
    });
  }

  return {
    roomCode,
    phase: 'lobby',
    dayNumber: 1,
    maxPlayers: 8,
    players,
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
      `Phòng #${roomCode} sẵn sàng.`,
    ],
    messages: [],
  };
}

export default function App() {
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialRoomCode = (urlParams.get('room') || 'GOTHIC').toUpperCase();
  const isAutoStart = urlParams.get('autostart') === '1';

  const [localPlayerId] = useState<string>(() => {
    const saved = sessionStorage.getItem('gothic_player_id');
    if (saved) return saved;
    const generated = `p_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('gothic_player_id', generated);
    return generated;
  });

  const [playerName, setPlayerName] = useState<string>('Bá Tước Mặc Khải');
  const [roomCode, setRoomCode] = useState<string>(initialRoomCode);
  const [appearance, setAppearance] = useState<CharacterAppearance>(
    () => ({ ...APPEARANCE_PRESETS[0] })
  );

  const [shellState, setShellState] = useState<'title' | 'playing' | 'paused' | 'gameover'>(
    isAutoStart ? 'playing' : 'title'
  );

  const [roomState, setRoomState] = useState<RoomPublicState>(() =>
    createInitialLocalState(initialRoomCode, localPlayerId, 'Bá Tước Mặc Khải', APPEARANCE_PRESETS[0])
  );

  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [cameraPreset, setCameraPreset] = useState<'follow' | 'overview' | 'bonfire'>('follow');
  const [lightingOverride, setLightingOverride] = useState<'auto' | 'dusk' | 'night' | 'day'>('auto');
  const [isWerewolfNightVision, setIsWerewolfNightVision] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
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

  const wsRef = useRef<WebSocket | null>(null);
  const mobileInputRef = useRef<MobileMovementInput>({
    moveX: 0,
    moveZ: 0,
    jumpRequested: false,
    eyeLookYaw: 0,
    eyeLookPitch: 0,
    isHoldingEye: false,
  });

  // Mirror shellState & room phase to document.body.dataset.state
  useEffect(() => {
    if (roomState.phase === 'ended' && shellState !== 'title') {
      document.body.dataset.state = 'gameover';
      setShellState('gameover');
    } else {
      document.body.dataset.state = shellState;
    }
  }, [shellState, roomState.phase]);

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

  // Connect to WebSocket Server
  useEffect(() => {
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
          if (msg.type === 'room:state' && msg.state) {
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
  }, [roomCode, localPlayerId]);

  const sendWs = useCallback((payload: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const handleEnterVillage = useCallback(
    (overrideRoomCode?: string) => {
      const targetCode = (overrideRoomCode || roomCode || 'GOTHIC').trim().toUpperCase();
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
      sendWs({
        type: 'room:join',
        roomCode: targetCode,
        playerId: localPlayerId,
        playerName: playerName.trim() || 'Lữ Khách Bí Ẩn',
        appearance,
      });
    },
    [roomCode, localPlayerId, playerName, appearance, sendWs]
  );

  // Keyboard shortcuts (Enter/Space on Title, Esc/P for Pause, H for Collapse HUD, C for Chat, M for Mute)
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

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        setShellState((prev) => (prev === 'paused' ? 'playing' : 'paused'));
      } else if (e.code === 'KeyH') {
        setIsHudCollapsed((v) => !v);
      } else if (e.code === 'KeyC') {
        setIsChatDrawerOpen((v) => !v);
      } else if (e.code === 'KeyM') {
        setIsAudioMuted((prev) => {
          const next = !prev;
          soundEngine.setMuted(next);
          return next;
        });
      } else if (e.code === 'KeyR') {
        sendWs({ type: 'game:reset-lobby' });
        setShellState('playing');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shellState, isCustomizerOpen, handleEnterVillage, sendWs]);

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

  const handleLocalMove = useCallback(
    (x: number, z: number, rotY: number) => {
      sendWs({ type: 'player:move', x, z, rotY });
    },
    [sendWs]
  );

  const handleSaveCustomization = (newName: string, newApp: CharacterAppearance) => {
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
      setRoomState((prev) => {
        if (prev.phase !== 'lobby') return prev;
        const nextPlayers = [...prev.players];
        const usedNames = new Set(nextPlayers.map((p) => p.name));

        while (nextPlayers.length < clamped) {
          const idx = nextPlayers.length;
          const seat = getSeatTransform(idx, clamped, 8.2);
          let chosenName = BOT_NAMES[(idx - 1 + BOT_NAMES.length) % BOT_NAMES.length];
          if (usedNames.has(chosenName)) {
            const unused = BOT_NAMES.find((n) => !usedNames.has(n));
            if (unused) chosenName = unused;
          }
          usedNames.add(chosenName);
          nextPlayers.push({
            id: `bot_${idx}_${Math.random().toString(36).slice(2, 7)}`,
            name: chosenName,
            isHost: false,
            isBot: true,
            isAlive: true,
            role: 'villager',
            seatIndex: idx,
            x: seat.x,
            z: seat.z,
            rotY: seat.rotY,
            appearance: { ...APPEARANCE_PRESETS[idx % APPEARANCE_PRESETS.length] },
            isMuted: true,
            isSpeaking: false,
            isReady: true,
            loverId: null,
          });
        }

        while (nextPlayers.length > clamped) {
          const lastBotIdx = [...nextPlayers].reverse().findIndex((p) => p.isBot);
          if (lastBotIdx === -1) break;
          nextPlayers.splice(nextPlayers.length - 1 - lastBotIdx, 1);
        }

        const arranged = nextPlayers.map((p, idx) => {
          const seat = getSeatTransform(idx, nextPlayers.length, 8.2);
          return p.isBot
            ? {
                ...p,
                seatIndex: idx,
                isAlive: true,
                x: seat.x,
                z: seat.z,
                rotY: seat.rotY,
              }
            : { ...p, seatIndex: idx, isAlive: true };
        });

        const nextDeck = autoBalanceRoles
          ? getRecommendedRoleDeckForCount(clamped)
          : clampRoleDeckToPlayerCount(prev.roleDeck, clamped).deck;

        return {
          ...prev,
          phase: 'lobby',
          maxPlayers: clamped,
          players: arranged,
          roleDeck: nextDeck,
        };
      });

      sendWs({
        type: 'room:set-player-count',
        targetCount: clamped,
        autoBalanceRoles,
      });
    },
    [sendWs]
  );

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
        isTitleScreen={shellState === 'title'}
        phase={roomState.phase}
        players={roomState.players}
        localPlayerId={localPlayer.id}
        selectedTargetId={selectedTargetId}
        dayVotes={roomState.dayVotes}
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
          !isRoleCardModalOpen
        }
        canMove={canPlayerMoveInPhase(roomState.phase)}
        isHudCollapsed={isHudCollapsed}
        inputRef={mobileInputRef}
      />

      {/* Title Screen Stage Overlay */}
      {shellState === 'title' && (
        <TitleScreenOverlay
          playerName={playerName}
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

      {/* Playing HUD & Streamlined Ritual Action Bar */}
      {shellState !== 'title' && (
        <PlayingHudDock
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
          dayVotes={roomState.dayVotes}
          accusedPlayerId={roomState.accusedPlayerId}
          trialVotes={roomState.trialVotes}
          phaseEndsAt={roomState.phaseEndsAt}
          nightCompletedCount={roomState.nightCompletedCount}
          nightRequiredCount={roomState.nightRequiredCount}
          allNightActionsSubmitted={roomState.allNightActionsSubmitted}
          logs={roomState.logs}
          messages={roomState.messages}
          messageCount={roomState.messages.length}
          lightingOverride={lightingOverride}
          isWerewolfNightVision={isWerewolfNightVision}
          isHudCollapsed={isHudCollapsed}
          onToggleHudCollapse={() => setIsHudCollapsed((v) => !v)}
          onCycleLightingOverride={() =>
            setLightingOverride((prev) =>
              prev === 'auto'
                ? 'day'
                : prev === 'day'
                ? 'night'
                : prev === 'night'
                ? 'dusk'
                : 'auto'
            )
          }
          onOpenChatDrawer={() => setIsChatDrawerOpen((v) => !v)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenCustomizer={() => setIsCustomizerOpen(true)}
          onOpenRoleCard={() => setIsRoleCardModalOpen(true)}
          onOpenRoomPlayers={() => setIsRoomPlayersOpen(true)}
          onOpenRoleConfig={() => setIsRoleConfigOpen(true)}
          onSetPlayerCount={handleSetPlayerCount}
          onAddBot={() => sendWs({ type: 'room:add-bot' })}
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
          onResolveNight={() => sendWs({ type: 'game:resolve-night' })}
          onSubmitDayVote={(targetId) => sendWs({ type: 'game:submit-vote', targetId })}
          onResolveDayVote={() => sendWs({ type: 'game:resolve-vote' })}
          onSubmitTrialVote={(choice) => sendWs({ type: 'game:submit-trial-vote', choice })}
          onResolveTrial={() => sendWs({ type: 'game:resolve-trial' })}
          onSendChat={(text) => sendWs({ type: 'chat:send', text })}
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
        isOpen={isChatDrawerOpen}
        messages={roomState.messages}
        logs={roomState.logs}
        onSendChat={(text) => sendWs({ type: 'chat:send', text })}
        onClose={() => setIsChatDrawerOpen(false)}
      />

      {/* 2. Setting Riêng: Dedicated Settings & Horror Soundboard Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        isAudioMuted={isAudioMuted}
        cameraPreset={cameraPreset}
        showVirtualPad={showVirtualPad}
        isHudCollapsed={isHudCollapsed}
        onToggleAudioMute={() => {
          const next = !isAudioMuted;
          setIsAudioMuted(next);
          soundEngine.setMuted(next);
        }}
        onChangeCameraPreset={(preset) => setCameraPreset(preset)}
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
        onReturnTitle={() => setShellState('title')}
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

      {/* 5. Chọn Role Theo Số Lượng Người Trong Phòng Riêng: Dedicated Role Config Modal */}
      <RoleConfigModal
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
      {shellState === 'gameover' && (
        <GameOverModal
          winner={roomState.winner}
          winReason={roomState.winReason}
          dayNumber={roomState.dayNumber}
          localRole={localPlayer.role}
          players={roomState.players}
          onPlayAgain={() => {
            setShellState('playing');
            handleStartGame();
          }}
          onReturnLobby={() => {
            sendWs({ type: 'game:reset-lobby' });
            setShellState('playing');
          }}
        />
      )}
    </main>
  );
}

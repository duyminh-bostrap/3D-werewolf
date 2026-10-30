import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  ArrowLeft,
  ArrowRight,
  DoorOpen,
  Eye,
  Palette,
  Play,
  PlusCircle,
  RotateCcw,
  RotateCw,
  User,
} from 'lucide-react';
import {
  APPEARANCE_PRESETS,
  ROLE_CATALOG,
  type CharacterAppearance,
  type Faction,
  type HeadgearStyle,
  type PlayerState,
  type RoleId,
} from '../game/rules';
import { createCharacterAvatar } from '../three/proceduralAssets';

interface TitleScreenOverlayProps {
  playerName: string;
  roomCode: string;
  appearance: CharacterAppearance;
  onChangeName: (name: string) => void;
  onChangeRoomCode: (code: string) => void;
  onChangeAppearance: (app: CharacterAppearance) => void;
  onStartGame: (overrideRoomCode?: string) => void;
  onOpenCustomizer: () => void;
}

const QUICK_HEADGEAR: Array<{ id: HeadgearStyle; label: string }> = [
  { id: 'crimson_hood', label: 'Mũ Trùm' },
  { id: 'witch_hat', label: 'Phù Thủy' },
  { id: 'plague_mask', label: 'Mặt Nạ' },
  { id: 'hunter_tricorne', label: 'Thợ Săn' },
  { id: 'noble_crown', label: 'Vương Miện' },
  { id: 'wolf_skull', label: 'Sọ Sói' },
];

const QUICK_CLOAKS = [
  '#5c141b',
  '#1e1b2e',
  '#14261c',
  '#2b2118',
  '#1a2436',
  '#281822',
];

export const TitleScreenOverlay: React.FC<TitleScreenOverlayProps> = ({
  playerName,
  roomCode,
  appearance,
  onChangeName,
  onChangeRoomCode,
  onChangeAppearance,
  onStartGame,
  onOpenCustomizer,
}) => {
  const [step, setStep] = useState<'character' | 'room'>('character');
  const [previewWolf, setPreviewWolf] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState(roomCode || 'GOTHIC');

  const previewMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const yawRef = useRef<number>(0.3);
  const isDraggingRef = useRef<boolean>(false);
  const lastXRef = useRef<number>(0);

  // Initialize Live 3D Character Preview Turntable in Step 1
  useEffect(() => {
    if (step !== 'character') return;
    const container = previewMountRef.current;
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 200;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 30);
    camera.position.set(0, 1.52, 4.15);
    camera.lookAt(0, 1.22, 0);

    const hemi = new THREE.HemisphereLight(0xa5b4fc, 0x261820, 1.35);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffe4b5, 2.25);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xef4444, 1.35);
    rimLight.position.set(-3, 3, -3);
    scene.add(rimLight);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.08, 0.2, 32),
      new THREE.MeshStandardMaterial({ color: 0x1b1528, roughness: 0.55, metalness: 0.3 })
    );
    pedestal.position.y = -0.1;
    scene.add(pedestal);

    const goldRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.96, 0.025, 12, 36),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.85 })
    );
    goldRing.rotation.x = Math.PI / 2;
    goldRing.position.y = 0.01;
    scene.add(goldRing);

    const initialAvatar = createCharacterAvatar(appearance, previewWolf, true);
    initialAvatar.rotation.y = yawRef.current;
    scene.add(initialAvatar);
    avatarGroupRef.current = initialAvatar;

    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      if (!isDraggingRef.current) {
        yawRef.current += 0.008;
      }
      if (avatarGroupRef.current) {
        avatarGroupRef.current.rotation.y = yawRef.current;
        const head = avatarGroupRef.current.getObjectByName('avatar_head');
        if (head) {
          head.position.y = 1.95 + Math.sin(elapsed * 2.5) * 0.025;
        }
      }
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 300;
      const h = container.clientHeight || 200;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frameId);
      renderer.dispose();
    };
  }, [step]);

  // Rebuild 3D avatar mesh whenever appearance or wolf toggle changes in Step 1
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || step !== 'character') return;
    if (avatarGroupRef.current) {
      scene.remove(avatarGroupRef.current);
    }
    const nextAvatar = createCharacterAvatar(appearance, previewWolf, true);
    nextAvatar.rotation.y = yawRef.current;
    scene.add(nextAvatar);
    avatarGroupRef.current = nextAvatar;
  }, [appearance, previewWolf, step]);

  const handleCreateNewRoom = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const generatedCode = `${randomNum}`;
    onChangeRoomCode(generatedCode);
    setJoinCodeInput(generatedCode);
    onStartGame(generatedCode);
  };

  const handleJoinExistingRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleaned = joinCodeInput.trim().toUpperCase() || 'GOTHIC';
    onChangeRoomCode(cleaned);
    onStartGame(cleaned);
  };

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex flex-col justify-center p-3 sm:p-6 bg-gradient-to-b from-[#07060b]/85 via-[#07060b]/70 to-[#07060b]/92 overflow-y-auto">
      <div className="max-w-sm w-full mx-auto pointer-events-auto my-auto space-y-3">
        {/* Ultra-Clean Mobile Header Lockup */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <svg
              viewBox="0 0 72 72"
              className="w-10 h-10 shrink-0"
              aria-hidden="true"
            >
              <circle
                cx="36"
                cy="36"
                r="32"
                fill="#180a10"
                stroke="#d4af37"
                strokeWidth="2.5"
              />
              <circle cx="36" cy="36" r="24" fill="#7f1d1d" opacity="0.85" />
              <path
                d="M20 56 L26 36 L22 26 L31 28 L36 14 L41 28 L50 26 L46 36 L52 56 Z"
                fill="#09080d"
                stroke="#d4af37"
                strokeWidth="1.5"
              />
              <circle cx="32" cy="31" r="2" fill="#ef4444" />
              <circle cx="40" cy="31" r="2" fill="#ef4444" />
            </svg>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold font-display tracking-tight text-white leading-tight">
                HUYẾT NGUYỆT THÔN
              </h1>
              <p
                data-testid="title-short-subtitle"
                className="text-[11px] text-[#d4af37] font-medium"
              >
                Ma Sói 3D
              </p>
            </div>
          </div>

          {/* Compact Step Pill */}
          <div className="shrink-0 rounded-lg bg-[#14101e] border border-[#d4af37]/35 px-2 py-0.5 text-[11px] font-mono-tabular font-bold text-[#d4af37]">
            {step === 'character' ? '1/2' : '2/2'}
          </div>
        </div>

        {/* STEP 1: 3D Character Preview + Name + Quick Outfit */}
        {step === 'character' ? (
          <div
            data-testid="onboarding-step-character"
            className="rounded-2xl bg-[#110e18]/95 border border-[#d4af37]/40 p-3.5 space-y-3 shadow-2xl"
          >
            {/* Prominent Live 3D Character Preview Canvas */}
            <div className="relative rounded-xl bg-gradient-to-b from-[#1e162b] via-[#130e1c] to-[#0a0710] border border-[#d4af37]/30 overflow-hidden">
              <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
                <span
                  title="Vuốt để xoay 3D"
                  className="w-7 h-7 rounded-lg bg-black/60 border border-white/10 text-[#d4af37] flex items-center justify-center"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </span>
                <div className="flex items-center gap-1.5 pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => setPreviewWolf((v) => !v)}
                    aria-label="Xem thử dạng Sói"
                    title={previewWolf ? 'Dạng Sói' : 'Dạng Người'}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-colors ${
                      previewWolf
                        ? 'bg-red-950/90 border-red-500 text-red-200'
                        : 'bg-black/60 border-white/15 text-slate-300'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onOpenCustomizer}
                    aria-label="Tùy chỉnh chi tiết"
                    title="Tùy chỉnh chi tiết 3D"
                    className="w-7 h-7 rounded-lg bg-[#1d162b]/90 hover:bg-[#2a203d] border border-[#d4af37]/40 text-[#d4af37] flex items-center justify-center cursor-pointer"
                  >
                    <Palette className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div
                ref={previewMountRef}
                data-testid="step1-3d-preview-canvas"
                onPointerDown={(e) => {
                  isDraggingRef.current = true;
                  lastXRef.current = e.clientX;
                }}
                onPointerMove={(e) => {
                  if (!isDraggingRef.current) return;
                  const dx = e.clientX - lastXRef.current;
                  yawRef.current += dx * 0.014;
                  lastXRef.current = e.clientX;
                }}
                onPointerUp={() => {
                  isDraggingRef.current = false;
                }}
                onPointerLeave={() => {
                  isDraggingRef.current = false;
                }}
                className="w-full h-44 sm:h-52 cursor-grab active:cursor-grabbing touch-none"
              />

              <div className="px-3 py-1.5 bg-black/55 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="font-bold text-white truncate">
                  {playerName.trim() || 'Lữ Khách'}
                </span>
                <span className="text-[11px] text-[#d4af37] font-medium truncate">
                  {appearance.epithet}
                </span>
              </div>
            </div>

            {/* Compact Name Input with User Icon */}
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                id="title-player-name"
                type="text"
                maxLength={24}
                value={playerName}
                onChange={(e) => onChangeName(e.target.value)}
                aria-label="Tên nhân vật"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#09080d] border border-white/15 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                placeholder="Tên nhân vật..."
              />
            </div>

            {/* Color Dots + 6 Compact Outfit Pills */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                {QUICK_CLOAKS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Màu áo ${hex}`}
                    onClick={() =>
                      onChangeAppearance({ ...appearance, cloakColor: hex })
                    }
                    className={`w-5 h-5 rounded-full border cursor-pointer transition-transform ${
                      appearance.cloakColor === hex
                        ? 'scale-125 border-[#d4af37]'
                        : 'border-white/30'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {APPEARANCE_PRESETS.slice(0, 6).map((preset, i) => {
                  const selected =
                    appearance.headgear === preset.headgear &&
                    appearance.cloakColor === preset.cloakColor;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onChangeAppearance({ ...preset })}
                      className={`px-2 py-1.5 rounded-lg text-[11px] border text-left flex items-center gap-1.5 transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#9e1b24]/35 border-[#d4af37] text-white font-semibold'
                          : 'bg-[#181422] border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/40"
                        style={{ backgroundColor: preset.cloakColor }}
                      />
                      <span className="truncate">{QUICK_HEADGEAR[i]?.label || preset.epithet}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 1 Primary CTA */}
            <button
              type="button"
              data-testid="step1-next-btn"
              onClick={() => setStep('room')}
              className="w-full py-2.5 px-4 rounded-xl bg-[#9e1b24] hover:bg-[#b91c1c] text-white font-bold text-sm shadow-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Tiếp Tục</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* STEP 2: Create Room or Enter Room Code (Fixed Layout, Minimal Text) */
          <div
            data-testid="onboarding-step-room"
            className="rounded-2xl bg-[#110e18]/95 border border-[#d4af37]/40 p-3.5 space-y-3 shadow-2xl"
          >
            {/* Compact Character Pill + Icon-Only Back Button */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#181324] border border-white/10">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-4 h-4 rounded-full shrink-0 border border-[#d4af37]"
                  style={{ backgroundColor: appearance.cloakColor }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {playerName.trim() || 'Lữ Khách'}
                  </div>
                  <div className="text-[10px] text-[#d4af37] truncate">
                    {appearance.epithet}
                  </div>
                </div>
              </div>
              <button
                type="button"
                data-testid="step2-back-btn"
                onClick={() => setStep('character')}
                aria-label="Quay lại sửa nhân vật"
                title="Sửa nhân vật"
                className="w-8 h-8 rounded-lg bg-[#231c33] hover:bg-[#2e2542] border border-white/15 text-slate-200 flex items-center justify-center cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Option A: Single Clean Create Room Button */}
            <button
              type="button"
              data-testid="create-room-btn"
              onClick={handleCreateNewRoom}
              className="w-full py-3 px-4 rounded-xl bg-[#9e1b24] hover:bg-[#b91c1c] text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Tạo Phòng Mới</span>
            </button>

            {/* Option B: Room Code Input + Compact Join Button (min-w-0 prevents overflow) */}
            <form
              onSubmit={handleJoinExistingRoom}
              className="p-2.5 rounded-xl bg-[#171222] border border-white/15 flex items-center gap-2"
            >
              <DoorOpen className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />
              <input
                id="title-room-code"
                data-testid="room-code-input"
                type="text"
                maxLength={10}
                value={joinCodeInput}
                onChange={(e) => {
                  const next = e.target.value.toUpperCase();
                  setJoinCodeInput(next);
                  onChangeRoomCode(next);
                }}
                aria-label="Mã phòng"
                className="min-w-0 flex-1 px-3 py-2 rounded-xl bg-[#09080d] border border-white/20 text-sm font-mono-tabular font-bold text-[#d4af37] uppercase focus:outline-none focus:border-[#d4af37]"
                placeholder="Mã phòng..."
              />
              <button
                type="submit"
                data-start="true"
                data-testid="join-room-btn"
                aria-label="Vào sảnh chờ"
                title="Vào sảnh chờ"
                className="shrink-0 h-10 px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Vào</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

interface PauseModalProps {
  onResume: () => void;
  onResetLobby: () => void;
  onReturnTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onResetLobby,
  onReturnTitle,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
    >
      <div className="w-full max-w-xs rounded-2xl bg-[#120e1a] border border-[#d4af37]/40 p-5 text-center space-y-4 shadow-2xl">
        <h2 id="pause-modal-title" className="text-xl font-bold font-display text-white">
          Tạm Dừng
        </h2>

        <div className="space-y-2">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-2.5 px-4 rounded-xl bg-[#9e1b24] hover:bg-[#b91c1c] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Tiếp Tục
          </button>
          <button
            type="button"
            onClick={onResetLobby}
            className="w-full py-2.5 px-4 rounded-xl bg-[#1d1828] hover:bg-[#282136] text-slate-200 border border-white/15 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Về Sảnh
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-medium transition-colors cursor-pointer"
          >
            Thoát
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  winner: 'ongoing' | Faction;
  winReason: string;
  dayNumber: number;
  localRole: RoleId;
  players: PlayerState[];
  onPlayAgain: () => void;
  onReturnLobby: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  winReason,
  dayNumber,
  localRole,
  players,
  onPlayAgain,
  onReturnLobby,
}) => {
  const isWolfWin = winner === 'werewolves';
  const isLoverWin = winner === 'lovers';
  const isSoloWin = winner === 'solo';
  const survivorsCount = players.filter((p) => p.isAlive).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-modal-title"
    >
      <div className="w-full max-w-xl rounded-2xl bg-[#120e1a] border-2 border-[#d4af37]/60 p-6 shadow-2xl space-y-5">
        <div className="text-center space-y-1">
          <span className="text-xs font-mono-tabular tracking-widest text-[#d4af37]">
            KẾT THÚC ĐÊM HUYẾT NGUYỆT
          </span>
          <h2
            id="gameover-modal-title"
            className={`text-3xl font-extrabold font-display ${
              isWolfWin
                ? 'text-red-500'
                : isLoverWin
                ? 'text-pink-400'
                : isSoloWin
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {isWolfWin
              ? 'Bầy Ma Sói Thống Trị'
              : isLoverWin
              ? 'Cặp Đôi Định Mệnh Chiến Thắng'
              : isSoloWin
              ? 'Kẻ Độc Hành Chiến Thắng'
              : 'Phe Dân Làng Chiến Thắng'}
          </h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto">{winReason}</p>
        </div>

        {/* 3 Tabular-Nums Mastery Stat Tiles */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-[#1a1524] border border-white/10 p-3 text-center">
            <div className="text-[11px] text-slate-400 uppercase">Số Đêm Sinh Tử</div>
            <div className="text-2xl font-bold font-mono-tabular text-white mt-0.5">
              {dayNumber}
            </div>
          </div>
          <div className="rounded-xl bg-[#1a1524] border border-white/10 p-3 text-center">
            <div className="text-[11px] text-slate-400 uppercase">Vai Trò Của Bạn</div>
            <div className="text-sm font-bold text-[#d4af37] mt-1.5 truncate">
              {ROLE_CATALOG[localRole].nameVi}
            </div>
          </div>
          <div className="rounded-xl bg-[#1a1524] border border-white/10 p-3 text-center">
            <div className="text-[11px] text-slate-400 uppercase">Người Sống Sót</div>
            <div className="text-2xl font-bold font-mono-tabular text-emerald-400 mt-0.5">
              {survivorsCount}/{players.length}
            </div>
          </div>
        </div>

        {/* Full Role Reveal Roster */}
        <div className="max-h-48 overflow-y-auto rounded-xl bg-[#0b0910] border border-white/10 divide-y divide-white/5">
          {players.map((p) => {
            const roleMeta = ROLE_CATALOG[p.role];
            return (
              <div
                key={p.id}
                className="flex items-center justify-between px-3.5 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono-tabular text-slate-400">
                    #{p.seatIndex + 1}
                  </span>
                  <span className="font-semibold text-white">{p.name}</span>
                  <span className="text-slate-500">·</span>
                  <span className={p.isAlive ? 'text-emerald-400' : 'text-slate-500'}>
                    {p.isAlive ? 'Sống sót' : 'Đã ngã xuống'}
                  </span>
                </div>
                <span
                  className="font-semibold"
                  style={{ color: roleMeta.accentColor }}
                >
                  {roleMeta.nameVi}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onReturnLobby}
            className="px-4 py-2.5 rounded-xl bg-[#1d1828] hover:bg-[#282136] text-slate-200 border border-white/15 text-xs font-semibold cursor-pointer"
          >
            Về Sảnh Chờ 3D
          </button>
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="px-6 py-2.5 rounded-xl bg-[#9e1b24] hover:bg-[#b91c1c] text-white font-bold text-sm shadow-lg cursor-pointer"
          >
            Chơi Lại Ván Mới
          </button>
        </div>
      </div>
    </div>
  );
};

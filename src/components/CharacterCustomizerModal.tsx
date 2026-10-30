import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Sparkles, Eye, RotateCw, X } from 'lucide-react';
import {
  APPEARANCE_PRESETS,
  type CharacterAppearance,
  type HeadgearStyle,
} from '../game/rules';
import { createCharacterAvatar } from '../three/proceduralAssets';

interface CharacterCustomizerModalProps {
  playerName: string;
  appearance: CharacterAppearance;
  onSave: (name: string, appearance: CharacterAppearance) => void;
  onClose: () => void;
}

const HEADGEAR_OPTIONS: Array<{ id: HeadgearStyle; label: string }> = [
  { id: 'crimson_hood', label: 'Mũ Trùm Huyết Nguyệt' },
  { id: 'witch_hat', label: 'Nón Phù Thủy Cổ Thuật' },
  { id: 'plague_mask', label: 'Mặt Nạ Y Sĩ Dịch Hạch' },
  { id: 'hunter_tricorne', label: 'Mũ Thợ Săn Ba Góc' },
  { id: 'noble_crown', label: 'Vương Miện Lãnh Chúa' },
  { id: 'wolf_skull', label: 'Mũ Sọ Sói Cổ Đại' },
];

const CLOAK_COLORS = [
  { hex: '#5c141b', name: 'Đỏ Huyết Tụ' },
  { hex: '#1e1b2e', name: 'Tím Bóng Đêm' },
  { hex: '#14261c', name: 'Xanh Rừng Thẳm' },
  { hex: '#2b2118', name: 'Nâu Thợ Săn' },
  { hex: '#1a2436', name: 'Xanh Đá Phiến' },
  { hex: '#281822', name: 'Đen Hắc Ám' },
];

const LANTERN_COLORS = [
  { hex: '#f59e0b', name: 'Lửa Hổ Phách' },
  { hex: '#ef4444', name: 'Huyết Nguyệt' },
  { hex: '#a855f7', name: 'Tím Linh Hồn' },
  { hex: '#10b981', name: 'Lục Phù Thủy' },
  { hex: '#38bdf8', name: 'Lam Ma Trơi' },
];

const EPITHET_OPTIONS = [
  'Kẻ Gác Đêm',
  'Nhà Chiêm Tinh',
  'Y Sĩ Dịch Hạch',
  'Thợ Săn Cổ Thụ',
  'Lãnh Chúa Sương Mù',
  'Kẻ Hành Hương',
];

export const CharacterCustomizerModal: React.FC<CharacterCustomizerModalProps> = ({
  playerName,
  appearance,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(playerName);
  const [draft, setDraft] = useState<CharacterAppearance>({ ...appearance });
  const [previewWolfBeast, setPreviewWolfBeast] = useState(false);
  const [error, setError] = useState('');

  const previewMountRef = useRef<HTMLDivElement | null>(null);
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const yawRef = useRef<number>(0.35);
  const isDraggingRef = useRef<boolean>(false);
  const lastXRef = useRef<number>(0);

  // Initialize Dedicated 3D Character Studio Turntable Preview
  useEffect(() => {
    const container = previewMountRef.current;
    if (!container) return;

    const width = container.clientWidth || 260;
    const height = container.clientHeight || 320;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.setPixelRatio(1);
    renderer.setSize(width, height);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 30);
    camera.position.set(0, 1.55, 4.35);
    camera.lookAt(0, 1.25, 0);

    const hemi = new THREE.HemisphereLight(0x8fa8ff, 0x261820, 1.25);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffe0b2, 2.1);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xdc2626, 1.3);
    rimLight.position.set(-3, 3, -3);
    scene.add(rimLight);

    // Carved Stone Turntable Pedestal
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1d1829,
      roughness: 0.6,
      metalness: 0.25,
    });
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.08, 0.22, 32),
      pedestalMat
    );
    pedestal.position.y = -0.11;
    scene.add(pedestal);

    const goldRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.96, 0.025, 12, 36),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.85 })
    );
    goldRing.rotation.x = Math.PI / 2;
    goldRing.position.y = 0.01;
    scene.add(goldRing);

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

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
    };
  }, []);

  // Rebuild 3D Character on Draft / Beast Mode Change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (avatarGroupRef.current) {
      scene.remove(avatarGroupRef.current);
    }
    const built = createCharacterAvatar(draft, previewWolfBeast, true);
    built.rotation.y = yawRef.current;
    scene.add(built);
    avatarGroupRef.current = built;
  }, [draft, previewWolfBeast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Vui lòng nhập danh xưng nhân vật của bạn.');
      return;
    }
    onSave(trimmed, draft);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/82 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customizer-title"
      data-testid="separate-customizer-modal"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[#120f1a] border border-[#d4af37]/45 p-4 sm:p-6 shadow-2xl space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h2 id="customizer-title" className="text-lg sm:text-xl font-bold font-display text-white">
              Phòng Tạo Hình Nhân Vật 3D
            </h2>
            <p className="text-xs text-slate-400">
              Xoay thử mô hình 3D trực tiếp và tùy biến áo choàng nhung, mũ cổ phục & đèn lồng
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng phòng tạo hình"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          {/* Left Column: Dedicated Live 3D Character Turntable Studio */}
          <div className="md:col-span-5 rounded-2xl bg-[#09070f] border border-[#d4af37]/30 p-3 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between z-10">
              <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#d4af37] flex items-center gap-1">
                <RotateCw className="w-3 h-3" />
                <span>Kéo Để Xoay 360°</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewWolfBeast((v) => !v)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1 cursor-pointer transition-colors ${
                  previewWolfBeast
                    ? 'bg-red-950 border-red-500 text-red-200'
                    : 'bg-[#181326] border-white/15 text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>{previewWolfBeast ? 'Dạng Ma Sói' : 'Thử Dạng Sói'}</span>
              </button>
            </div>

            <div
              ref={previewMountRef}
              onPointerDown={(e) => {
                isDraggingRef.current = true;
                lastXRef.current = e.clientX;
              }}
              onPointerMove={(e) => {
                if (!isDraggingRef.current) return;
                const dx = e.clientX - lastXRef.current;
                yawRef.current += dx * 0.012;
                lastXRef.current = e.clientX;
              }}
              onPointerUp={() => {
                isDraggingRef.current = false;
              }}
              onPointerLeave={() => {
                isDraggingRef.current = false;
              }}
              className="w-full h-56 sm:h-64 cursor-grab active:cursor-grabbing select-none touch-none"
            />

            <div className="text-center border-t border-white/10 pt-2">
              <div className="text-sm font-bold font-display text-white truncate">
                {name || 'Lữ Khách Bí Ẩn'}
              </div>
              <div className="text-[11px] text-[#d4af37]">{draft.epithet}</div>
            </div>
          </div>

          {/* Right Column: Customization Controls */}
          <div className="md:col-span-7 space-y-3.5">
            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Bộ Trang Phục Mẫu Nhanh
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {APPEARANCE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDraft({ ...preset })}
                    className="px-2.5 py-2 rounded-xl bg-[#1b1626] hover:bg-[#261f36] border border-white/10 text-left text-xs text-slate-200 transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30"
                      style={{ backgroundColor: preset.cloakColor }}
                    />
                    <span className="truncate">{preset.epithet}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Name & Epithet */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="custom-player-name" className="block text-xs font-medium text-slate-300 mb-1">
                  Tên Nhân Vật
                </label>
                <input
                  id="custom-player-name"
                  type="text"
                  maxLength={24}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#09080d] border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-[#d4af37]"
                  placeholder="Nhập tên của bạn..."
                />
                {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
              </div>

              <div>
                <label htmlFor="custom-epithet" className="block text-xs font-medium text-slate-300 mb-1">
                  Danh Hiệu Cổ Thôn
                </label>
                <select
                  id="custom-epithet"
                  value={draft.epithet}
                  onChange={(e) => setDraft({ ...draft, epithet: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#09080d] border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-[#d4af37]"
                >
                  {EPITHET_OPTIONS.map((ep) => (
                    <option key={ep} value={ep}>
                      {ep}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Headgear / Mask Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mũ & Mặt Nạ Điêu Khắc 3D
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {HEADGEAR_OPTIONS.map((item) => {
                  const active = draft.headgear === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDraft({ ...draft, headgear: item.id })}
                      className={`px-2.5 py-2 rounded-xl text-xs font-medium border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#9e1b24]/35 border-[#d4af37] text-white'
                          : 'bg-[#181422] border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cloak & Lantern Colors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Màu Áo Choàng Nhung
                </label>
                <div className="flex items-center gap-2">
                  {CLOAK_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      aria-label={`Màu áo choàng ${c.name}`}
                      onClick={() => setDraft({ ...draft, cloakColor: c.hex })}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        draft.cloakColor === c.hex ? 'border-[#d4af37] scale-115' : 'border-white/20'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Màu Lửa Đèn Lồng
                </label>
                <div className="flex items-center gap-2">
                  {LANTERN_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      aria-label={`Màu đèn lồng ${c.name}`}
                      onClick={() =>
                        setDraft({ ...draft, lanternColor: c.hex, trimColor: c.hex })
                      }
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        draft.lanternColor === c.hex ? 'border-white scale-115' : 'border-white/20'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            data-testid="save-character-3d-btn"
            className="px-5 py-2.5 rounded-xl bg-[#9e1b24] hover:bg-[#b91c1c] text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Lưu Nhân Vật 3D</span>
          </button>
        </div>
      </form>
    </div>
  );
};

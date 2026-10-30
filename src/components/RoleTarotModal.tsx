import React, { useEffect, useRef, useState } from 'react';
import { ROLE_CATALOG, isWolfPackRole, type RoleId } from '../game/rules';
import { soundEngine } from '../audio/soundEngine';

interface RoleTarotModalProps {
  role: RoleId;
  playerName: string;
  isInitialReveal: boolean;
  onConfirm: () => void;
}

export function renderRoleWoodcutSvg(role: RoleId, accent: string) {
  switch (role) {
    case 'werewolf':
      return (
        <svg viewBox="0 0 200 220" className="w-44 h-48 mx-auto">
          <circle cx="100" cy="76" r="52" fill="#450a0a" stroke={accent} strokeWidth="2.5" />
          <circle cx="100" cy="76" r="44" fill="#7f1d1d" opacity="0.65" />
          <path
            d="M55 195 L68 135 L60 105 L78 88 L84 62 L98 80 L116 60 L120 88 L142 98 L124 118 L138 155 L148 195 Z"
            fill="#09080d"
            stroke={accent}
            strokeWidth="2"
          />
          <circle cx="94" cy="92" r="3.5" fill="#ef4444" />
          <circle cx="110" cy="92" r="3.5" fill="#ef4444" />
          <path d="M95 108 L100 116 L105 108" fill="none" stroke="#fca5a5" strokeWidth="2" />
          <path d="M40 42 L74 110 M52 36 L86 104 M64 32 L98 100" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
        </svg>
      );
    case 'alpha_wolf':
      return (
        <svg viewBox="0 0 200 220" className="w-44 h-48 mx-auto">
          {/* Crowned Alpha Wolf & Blood Curse Rune */}
          <circle cx="100" cy="88" r="58" fill="#3b0709" stroke="#f59e0b" strokeWidth="2.5" />
          <polygon
            points="72,56 84,34 100,48 116,34 128,56"
            fill="#d4af37"
            stroke="#fef08a"
            strokeWidth="1.5"
          />
          <path
            d="M52 196 L64 128 L58 96 L78 78 L86 58 L100 72 L114 58 L122 78 L142 96 L136 128 L148 196 Z"
            fill="#09080d"
            stroke="#ef4444"
            strokeWidth="2.5"
          />
          <circle cx="90" cy="94" r="4" fill="#fbbf24" />
          <circle cx="110" cy="94" r="4" fill="#fbbf24" />
          <path d="M88 116 L100 128 L112 116" fill="none" stroke="#ef4444" strokeWidth="2.5" />
        </svg>
      );
    case 'white_wolf':
      return (
        <svg viewBox="0 0 200 220" className="w-44 h-48 mx-auto">
          {/* Pale Full Moon & White Lone Wolf */}
          <circle cx="100" cy="82" r="52" fill="#1e293b" stroke="#f8fafc" strokeWidth="2.5" />
          <path
            d="M55 195 L68 135 L62 102 L80 86 L86 60 L100 78 L114 60 L120 86 L138 102 L132 135 L145 195 Z"
            fill="#e2e8f0"
            stroke="#475569"
            strokeWidth="2"
          />
          <circle cx="92" cy="92" r="3.5" fill="#dc2626" />
          <circle cx="108" cy="92" r="3.5" fill="#dc2626" />
          <path d="M40 165 L160 55" stroke="#ef4444" strokeWidth="2.5" />
        </svg>
      );
    case 'cursed_wolf':
      return (
        <svg viewBox="0 0 200 220" className="w-44 h-48 mx-auto">
          {/* Half-Human Half-Wolf Split Mask & Claw Mark */}
          <circle cx="100" cy="108" r="56" fill="#27120b" stroke={accent} strokeWidth="2.5" />
          <path d="M100 52 A56 56 0 0 0 100 164 Z" fill="#334155" />
          <path d="M100 52 A56 56 0 0 1 100 164 Z" fill="#7c2d12" />
          <circle cx="80" cy="100" r="4" fill="#e2e8f0" />
          <circle cx="120" cy="100" r="5" fill="#f97316" />
          <path d="M100 34 L100 182" stroke="#fdba74" strokeWidth="2" strokeDasharray="5 3" />
        </svg>
      );
    case 'seer':
      return (
        <svg viewBox="0 0 200 220" className="w-44 h-48 mx-auto">
          <circle cx="100" cy="105" r="68" fill="none" stroke={accent} strokeWidth="1.5" strokeDasharray="4 4" />
          <path d="M100 22 L100 45 M100 165 L100 188 M24 105 L46 105 M154 105 L176 105 M45 50 L62 67 M138 143 L155 160 M155 50 L138 67 M62 143 L45 160" stroke={accent} strokeWidth="2" />
          <path
            d="M34 105 Q100 48 166 105 Q100 162 34 105 Z"
            fill="#1e1035"
            stroke="#d8b4fe"
            strokeWidth="2.5"
          />
          <circle cx="100" cy="105" r="22" fill={accent} />
          <circle cx="100" cy="105" r="9" fill="#09080d" />
          <circle cx="106" cy="99" r="3.5" fill="#ffffff" />
        </svg>
      );
    case 'aura_seer':
      return (
        <svg viewBox="0 0 200 220" className="w-44 h-48 mx-auto">
          {/* Twin concentric mystic aura rings & crystal prism */}
          <circle cx="100" cy="108" r="64" fill="none" stroke="#c084fc" strokeWidth="2" strokeDasharray="6 4" />
          <circle cx="100" cy="108" r="46" fill="#2e1065" stroke="#e9d5ff" strokeWidth="2" />
          <polygon points="100,52 136,108 100,164 64,108" fill="#7e22ce" stroke="#f3e8ff" strokeWidth="2.5" />
          <circle cx="100" cy="108" r="10" fill="#fef08a" />
        </svg>
      );
    case 'witch':
      return (
        <svg viewBox="0 0 200 220" className="w-44 h-48 mx-auto">
          <path d="M72 52 L88 52 L88 78 L112 135 Q118 158 96 164 L64 164 Q42 158 48 135 L72 78 Z" fill="#064e3b" stroke="#34d399" strokeWidth="2.5" />
          <path d="M118 68 L134 68 L134 92 L156 142 Q160 164 140 170 L112 170 Q92 164 96 142 L118 92 Z" fill="#4c0519" stroke="#f43f5e" strokeWidth="2.5" />
          <circle cx="80" cy="136" r="6" fill="#6ee7b7" />
          <circle cx="92" cy="118" r="4" fill="#6ee7b7" />
          <path d="M120 135 L132 147 M132 135 L120 147" stroke="#fda4af" strokeWidth="2.5" />
        </svg>
      );
    case 'bodyguard':
      return (
        <svg viewBox="0 0 200 220" className="w-44 h-48 mx-auto">
          <path d="M100 22 L100 198" stroke="#93c5fd" strokeWidth="4" />
          <path d="M72 48 L128 48" stroke="#93c5fd" strokeWidth="4" />
          <path
            d="M52 62 L148 62 L148 118 Q148 166 100 186 Q52 166 52 118 Z"
            fill="#172554"
            stroke="#60a5fa"
            strokeWidth="3"
          />
          <path d="M100 76 L100 166 M68 114 L132 114" stroke="#dbeafe" strokeWidth="3" />
        </svg>
      );
    case 'hunter':
      return (
        <svg viewBox="0 0 200 220" className="w-44 h-48 mx-auto">
          <circle cx="100" cy="110" r="56" fill="#271a0c" stroke={accent} strokeWidth="2.5" />
          <circle cx="100" cy="110" r="36" fill="none" stroke="#fde68a" strokeWidth="1.5" strokeDasharray="6 4" />
          <path d="M100 36 L100 184 M26 110 L174 110" stroke="#fbbf24" strokeWidth="2" />
          <polygon points="100,52 90,82 100,74 110,82" fill="#fef08a" />
        </svg>
      );
    case 'cupid':
      return (
        <svg viewBox="0 0 200 220" className="w-44 h-48 mx-auto">
          <path
            d="M100 168 C100 168 44 128 44 84 C44 62 62 48 80 48 C92 48 100 58 100 68 C100 58 108 48 120 48 C138 48 156 62 156 84 C156 128 100 168 100 168 Z"
            fill="#500724"
            stroke="#f472b6"
            strokeWidth="3"
          />
          <line x1="32" y1="154" x2="168" y2="58" stroke="#fbcfe8" strokeWidth="3.5" />
          <polygon points="172,55 154,60 162,72" fill="#fbcfe8" />
        </svg>
      );
    case 'elder':
      return (
        <svg viewBox="0 0 200 220" className="w-44 h-48 mx-auto">
          {/* Ancient Hourglass & Twin Life Seals */}
          <polygon points="62,48 138,48 100,110 138,172 62,172 100,110" fill="#422006" stroke="#facc15" strokeWidth="3" />
          <line x1="54" y1="48" x2="146" y2="48" stroke="#fde047" strokeWidth="4" />
          <line x1="54" y1="172" x2="146" y2="172" stroke="#fde047" strokeWidth="4" />
          <circle cx="84" cy="74" r="6" fill="#fef08a" />
          <circle cx="116" cy="74" r="6" fill="#fef08a" />
        </svg>
      );
    case 'little_girl':
      return (
        <svg viewBox="0 0 200 220" className="w-44 h-48 mx-auto">
          {/* Half-open Gothic Window Shutter & Peeking Eyes */}
          <rect x="48" y="42" width="104" height="136" rx="8" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="3" />
          <line x1="100" y1="42" x2="100" y2="178" stroke="#7dd3fc" strokeWidth="2.5" />
          <circle cx="82" cy="108" r="5" fill="#e0f2fe" />
          <circle cx="118" cy="108" r="5" fill="#e0f2fe" />
          <path d="M52 70 L96 70 M52 145 L96 145" stroke="#38bdf8" strokeWidth="2" />
        </svg>
      );
    case 'mayor':
      return (
        <svg viewBox="0 0 200 220" className="w-44 h-48 mx-auto">
          {/* Golden Scales of Justice & Mayor Seal (x2 Vote) */}
          <line x1="100" y1="40" x2="100" y2="178" stroke="#fbbf24" strokeWidth="4" />
          <line x1="50" y1="76" x2="150" y2="76" stroke="#fde68a" strokeWidth="3.5" />
          <polygon points="50,76 34,124 66,124" fill="#78350f" stroke="#fbbf24" strokeWidth="2" />
          <polygon points="150,76 134,124 166,124" fill="#78350f" stroke="#fbbf24" strokeWidth="2" />
          <circle cx="100" cy="40" r="9" fill="#fef08a" />
        </svg>
      );
    case 'jester':
      return (
        <svg viewBox="0 0 200 220" className="w-44 h-48 mx-auto">
          {/* Jester Bells Cap & Gallows Rope */}
          <path
            d="M46 146 Q52 68 88 86 Q100 44 112 86 Q148 68 154 146 Z"
            fill="#4c0519"
            stroke="#fb7185"
            strokeWidth="3"
          />
          <circle cx="48" cy="76" r="7" fill="#fbbf24" />
          <circle cx="100" cy="48" r="7" fill="#fbbf24" />
          <circle cx="152" cy="76" r="7" fill="#fbbf24" />
          <path d="M76 122 Q100 144 124 122" fill="none" stroke="#fecdd3" strokeWidth="3" />
        </svg>
      );
    case 'villager':
    default:
      return (
        <svg viewBox="0 0 200 220" className="w-44 h-48 mx-auto">
          <polygon points="100,42 134,68 124,152 76,152 66,68" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2.5" />
          <circle cx="100" cy="108" r="18" fill="#f59e0b" />
          <circle cx="100" cy="108" r="9" fill="#fef08a" />
          <path d="M84 42 L116 42 M70 152 L130 152" stroke="#94a3b8" strokeWidth="3" />
        </svg>
      );
  }
}

export const RoleTarotModal: React.FC<RoleTarotModalProps> = ({
  role,
  playerName,
  isInitialReveal,
  onConfirm,
}) => {
  const meta = ROLE_CATALOG[role] || ROLE_CATALOG.villager;
  const [isFlipped, setIsFlipped] = useState(!isInitialReveal);
  const autoFlipTimer = useRef<number | null>(null);

  useEffect(() => {
    if (isInitialReveal) {
      autoFlipTimer.current = window.setTimeout(() => {
        autoFlipTimer.current = null;
        setIsFlipped(true);
        soundEngine.playCardFlip(isWolfPackRole(role));
      }, 420);
      return () => {
        if (autoFlipTimer.current !== null) window.clearTimeout(autoFlipTimer.current);
        autoFlipTimer.current = null;
      };
    }
  }, [isInitialReveal, role]);

  const handleFlipToggle = () => {
    if (autoFlipTimer.current !== null) {
      window.clearTimeout(autoFlipTimer.current);
      autoFlipTimer.current = null;
    }
    setIsFlipped((current) => !current);
    soundEngine.playCardFlip(isWolfPackRole(role));
  };

  const factionName =
    meta.faction === 'werewolves'
      ? 'Phe Ma Sói'
      : meta.faction === 'solo'
      ? 'Phe Thứ Ba · Độc Lập'
      : 'Phe Dân Làng';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07050c]/92 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tarot-modal-title"
    >
      <div className="max-w-md w-full flex flex-col items-center">
        <p className="text-xs tracking-widest text-[#d4af37] mb-2 font-mono-tabular">
          ĐỊNH MỆNH HUYẾT NGUYỆT · {playerName}
        </p>

        {/* Interactive 3D Tarot Card Container */}
        <div
          onClick={handleFlipToggle}
          className="w-80 h-[470px] perspective-1200 cursor-pointer select-none mb-5"
          title="Nhấp để lật lá bài Tarot"
        >
          <div
            className="relative w-full h-full duration-700 preserve-3d transition-transform"
            style={{
              transform: `rotateY(${isFlipped ? 180 : 0}deg)`,
            }}
          >
            {/* Card Back (Unflipped Occult Engraving) */}
            <div className="absolute inset-0 w-full h-full rounded-2xl bg-[#120d18] border-2 border-[#d4af37]/70 shadow-2xl backface-hidden flex flex-col items-center justify-between p-6">
              <div className="w-full h-full border border-[#d4af37]/35 rounded-xl flex flex-col items-center justify-center p-4 relative">
                <svg viewBox="0 0 160 220" className="w-48 h-64 text-[#d4af37]">
                  <circle cx="80" cy="110" r="62" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="80" cy="110" r="48" fill="none" stroke="#dc2626" strokeWidth="1" strokeDasharray="4 4" />
                  <polygon
                    points="80,48 96,92 142,92 104,118 118,162 80,136 42,162 56,118 18,92 64,92"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <circle cx="80" cy="110" r="16" fill="#7f1d1d" stroke="currentColor" strokeWidth="2" />
                </svg>
                <span className="text-xs text-[#d4af37] tracking-widest mt-3 font-display">
                  NHẤP ĐỂ LẬT LÁ BÀI ĐỊNH MỆNH
                </span>
              </div>
            </div>

            {/* Card Front (Revealed Role Tarot) */}
            <div
              className="absolute inset-0 w-full h-full rounded-2xl bg-[#110e17] border-2 shadow-2xl backface-hidden rotate-y-180 flex flex-col justify-between p-5"
              style={{ borderColor: meta.accentColor }}
            >
              {/* Top Roman Numeral & Latin Kicker */}
              <div className="text-center border-b border-white/10 pb-2.5">
                <div className="text-xs font-mono-tabular text-[#d4af37] tracking-widest">
                  ARCANA {meta.romanNumeral} · {meta.titleLatin}
                </div>
                <h2
                  id="tarot-modal-title"
                  className="text-2xl font-bold font-display text-white mt-0.5"
                >
                  {meta.nameVi}
                </h2>
              </div>

              {/* Center Bespoke Occult Woodcut Illustration */}
              <div className="my-1 flex items-center justify-center bg-[#09070d] rounded-xl border border-white/10 py-2">
                {renderRoleWoodcutSvg(role, meta.accentColor)}
              </div>

              {/* Role Lore & Night Ability (Compact) */}
              <div className="space-y-1.5 text-left bg-[#181421] p-3 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-xs text-slate-300 whitespace-nowrap">
                  <strong style={{ color: meta.accentColor }} className="font-semibold">
                    {factionName}
                  </strong>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{meta.summary}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Confirm CTA */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleFlipToggle}
            className="px-3.5 py-2 rounded-lg bg-[#1d1826] hover:bg-[#2a2336] text-slate-200 border border-white/15 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Lật Bài
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-testid="confirm-role-card-btn"
            className="px-5 py-2 rounded-lg bg-[#9e1b24] hover:bg-[#b91c1c] text-white font-semibold text-xs sm:text-sm shadow-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isInitialReveal ? 'Vào Đêm →' : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  Users,
  X,
  Flame,
  Minus,
  Plus,
  Info,
  ChevronRight,
  BookOpen,
  Trophy,
  Moon,
} from 'lucide-react';
import {
  MAX_ROOM_PLAYERS,
  MIN_ROOM_PLAYERS,
  ROLE_CATALOG,
  clampRoleDeckToPlayerCount,
  getFullVarietyRoleDeckForCount,
  getRecommendedRoleDeckForCount,
  type RoleDeckConfig,
  type RoleId,
} from '../game/rules';
import { renderRoleWoodcutSvg } from './RoleTarotModal';

const ROLE_LABELS: Record<RoleId, string> = {
  werewolf: 'Ma Sói', alpha_wolf: 'Sói Đầu Đàn', white_wolf: 'Sói Trắng',
  cursed_wolf: 'Bán Sói', seer: 'Tiên Tri', aura_seer: 'Tiên Tri Hào Quang',
  bodyguard: 'Bảo Vệ', witch: 'Phù Thủy', hunter: 'Thợ Săn',
  cupid: 'Thần Tình Ái', elder: 'Già Làng', little_girl: 'Cô Bé',
  mayor: 'Thị Trưởng', jester: 'Thằng Ngố', villager: 'Dân Làng',
};

interface RoleConfigModalProps {
  isOpen: boolean;
  isLobby?: boolean;
  playerCount: number;
  roleDeck: RoleDeckConfig;
  onUpdateDeck: (deck: Partial<RoleDeckConfig>) => void;
  onSetPlayerCount: (targetCount: number, autoBalanceRoles: boolean) => void;
  onStartWithPreferredRole: (role?: RoleId) => void;
  onOpenRoomPlayers: () => void;
  onClose: () => void;
}

export const RoleConfigModal: React.FC<RoleConfigModalProps> = ({
  isOpen,
  isLobby = true,
  playerCount,
  roleDeck,
  onUpdateDeck,
  onSetPlayerCount,
  onStartWithPreferredRole,
  onOpenRoomPlayers,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'wolves' | 'villagers' | 'solo'>('all');
  const [inspectingRoleId, setInspectingRoleId] = useState<RoleId | null>(null);

  if (!isOpen) return null;

  const {
    deck: clampedDeck,
    werewolfCount,
    specialCount,
    soloCount,
    villagerCount,
    totalAllocated,
  } = clampRoleDeckToPlayerCount(roleDeck, playerCount);

  const maxWolvesForRoom = Math.max(1, Math.floor((playerCount - 1) / 2));
  const roomSizes = Array.from(
    { length: MAX_ROOM_PLAYERS - MIN_ROOM_PLAYERS + 1 },
    (_, i) => MIN_ROOM_PLAYERS + i
  );

  const configurableRoles: Array<{
    key: keyof RoleDeckConfig;
    roleId: RoleId;
    category: 'wolves' | 'villagers' | 'solo';
    max: number;
  }> = [
    // Phe Ma Sói (4)
    { key: 'werewolf', roleId: 'werewolf', category: 'wolves', max: maxWolvesForRoom },
    { key: 'alpha_wolf', roleId: 'alpha_wolf', category: 'wolves', max: 1 },
    { key: 'white_wolf', roleId: 'white_wolf', category: 'wolves', max: 1 },
    { key: 'cursed_wolf', roleId: 'cursed_wolf', category: 'wolves', max: 1 },
    // Phe Dân Làng Chức Năng (9)
    { key: 'seer', roleId: 'seer', category: 'villagers', max: 2 },
    { key: 'aura_seer', roleId: 'aura_seer', category: 'villagers', max: 1 },
    { key: 'bodyguard', roleId: 'bodyguard', category: 'villagers', max: 2 },
    { key: 'witch', roleId: 'witch', category: 'villagers', max: 2 },
    { key: 'hunter', roleId: 'hunter', category: 'villagers', max: 2 },
    { key: 'cupid', roleId: 'cupid', category: 'villagers', max: 1 },
    { key: 'elder', roleId: 'elder', category: 'villagers', max: 1 },
    { key: 'little_girl', roleId: 'little_girl', category: 'villagers', max: 1 },
    { key: 'mayor', roleId: 'mayor', category: 'villagers', max: 1 },
    // Phe Thứ Ba / Độc Lập (1)
    { key: 'jester', roleId: 'jester', category: 'solo', max: 1 },
  ];

  const visibleRoles = configurableRoles.filter(
    (r) => activeTab === 'all' || r.category === activeTab
  );

  const handleAutoBalance = () => {
    const recommended = getRecommendedRoleDeckForCount(playerCount);
    onUpdateDeck(recommended);
  };

  const handleFullVarietyPreset = () => {
    const fullDeck = getFullVarietyRoleDeckForCount(playerCount);
    onUpdateDeck(fullDeck);
  };

  const allPlayableRoles: RoleId[] = [
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

  const inspectingMeta = inspectingRoleId ? ROLE_CATALOG[inspectingRoleId] : null;
  const inspectingConfig = inspectingRoleId
    ? configurableRoles.find((r) => r.roleId === inspectingRoleId)
    : null;

  const inspectingCount = inspectingConfig ? clampedDeck[inspectingConfig.key] ?? 0 : 0;
  const isInspectingWolfPack =
    inspectingConfig &&
    (inspectingConfig.key === 'werewolf' ||
      inspectingConfig.key === 'alpha_wolf' ||
      inspectingConfig.key === 'white_wolf');
  const canIncreaseInspecting =
    inspectingConfig &&
    inspectingCount < inspectingConfig.max &&
    totalAllocated < playerCount &&
    (!isInspectingWolfPack || werewolfCount < maxWolvesForRoom);
  const canDecreaseInspecting =
    inspectingConfig &&
    inspectingCount > 0 &&
    !(isInspectingWolfPack && werewolfCount <= 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/84 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-config-title"
      data-testid="separate-roles-modal"
    >
      <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#d4af37]/45 bg-[#120e1b] shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 p-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-[#9e1b24]/25 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="role-config-title"
                className="text-lg sm:text-xl font-bold font-display text-white"
              >
                Bộ bài
              </h2>
              <p className="text-xs text-slate-400">
                15 vai trò · {playerCount} lá
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng chọn role"
            className="w-9 h-9 shrink-0 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="modal-scroll min-h-0 space-y-4 overflow-y-auto p-4">
        <section className="space-y-3 rounded-xl border border-white/10 bg-[#181324] p-3" aria-label="Thành phần bộ bài">
          <div className="flex items-center justify-between text-xs"><h3 className="font-semibold text-slate-200">Thành phần</h3><span className="text-slate-400">{playerCount} lá</span></div>
          <dl className={`grid gap-2 ${soloCount > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <div className="rounded-lg bg-red-500/10 px-2 py-2 text-center"><dt className="text-[11px] text-red-200">Sói</dt><dd className="mt-1 text-lg font-bold tabular-nums text-red-300">{werewolfCount}</dd></div>
            <div className="rounded-lg bg-purple-400/10 px-2 py-2 text-center"><dt className="text-[11px] text-purple-200">Chức năng</dt><dd className="mt-1 text-lg font-bold tabular-nums text-purple-300">{specialCount - soloCount}</dd></div>
            {soloCount > 0 && <div className="rounded-lg bg-pink-400/10 px-2 py-2 text-center"><dt className="text-[11px] text-pink-200">Độc lập</dt><dd className="mt-1 text-lg font-bold tabular-nums text-pink-300">{soloCount}</dd></div>}
            <div className="rounded-lg bg-slate-400/10 px-2 py-2 text-center"><dt className="text-[11px] text-slate-300">Dân làng</dt><dd className="mt-1 text-lg font-bold tabular-nums text-slate-200">{villagerCount}</dd></div>
          </dl>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" data-testid="full-variety-roles-btn" onClick={handleFullVarietyPreset} className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-[#271b3a] px-2 text-xs font-semibold text-[#f3e5ab] hover:bg-[#35244f]"><Flame className="h-3.5 w-3.5 shrink-0" /> Đa dạng</button>
            <button type="button" data-testid="auto-balance-roles-btn" onClick={handleAutoBalance} className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-[#9e1b24] px-2 text-xs font-semibold text-white hover:bg-[#b91c1c]"><Wand2 className="h-3.5 w-3.5 shrink-0" /> Cân bằng</button>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
            {isLobby ? <label className="flex min-w-0 items-center gap-2 text-xs text-slate-300">Số chỗ
              <select aria-label="Số chỗ trong phòng" value={playerCount} onChange={(e) => onSetPlayerCount(Number(e.target.value), true)} className="min-h-10 rounded-lg border border-white/15 bg-[#110d19] px-3 text-sm font-semibold text-[#e8cd82]">
                {roomSizes.map((count) => <option key={count} value={count}>{count}</option>)}
              </select>
            </label> : <span className="text-xs text-slate-400">Đang trong ván</span>}
            <button type="button" onClick={() => { onClose(); onOpenRoomPlayers(); }} className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#e8cd82] hover:bg-white/5"><Users className="h-4 w-4" /> Phòng <ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </section>

        {/* Faction Filter Tabs */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'wolves', label: 'Sói' },
            { id: 'villagers', label: 'Dân làng' },
            { id: 'solo', label: 'Độc lập' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`min-h-9 px-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#9e1b24] border-[#d4af37] text-white'
                  : 'bg-[#171222] border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div data-testid="role-cards-grid" className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {visibleRoles.map(({ key, roleId, max }) => {
            const meta = ROLE_CATALOG[roleId];
            const count = clampedDeck[key] ?? 0;
            const isWolfPackKey = key === 'werewolf' || key === 'alpha_wolf' || key === 'white_wolf';
            const canIncrease = count < max && totalAllocated < playerCount && (!isWolfPackKey || werewolfCount < maxWolvesForRoom);
            const canDecrease = count > 0 && !(isWolfPackKey && werewolfCount <= 1);
            return (
              <article key={key} data-testid={`role-card-${roleId}`} className="flex min-w-0 flex-col rounded-xl border p-1.5"
                style={{ background: count > 0 ? `linear-gradient(160deg, ${meta.accentColor}18, #14101d 75%)` : '#14101d', borderColor: count > 0 ? `${meta.accentColor}70` : 'rgba(255,255,255,0.1)' }}>
                <button type="button" data-testid={`role-info-btn-${roleId}`} onClick={() => setInspectingRoleId(roleId)} aria-label={`Giải thích vai trò ${meta.nameVi}`}
                  className="relative flex h-16 items-center justify-center rounded-lg bg-black/25 focus-visible:outline-2 focus-visible:outline-amber-200">
                  <span aria-hidden="true" className="h-[66px] w-[66px] max-w-full [&_svg]:!h-full [&_svg]:!w-full">{renderRoleWoodcutSvg(roleId, meta.accentColor)}</span>
                  <Info aria-hidden="true" className="absolute right-1 top-1 h-3.5 w-3.5 text-[#e8cd82]" />
                </button>
                <div className="flex-1 py-1"><h3 title={meta.nameVi} className="min-h-7 break-words text-[11px] font-semibold leading-[14px] text-slate-100">{ROLE_LABELS[roleId]}</h3></div>
                <div className="grid grid-cols-[minmax(24px,1fr)_16px_minmax(24px,1fr)] items-center rounded-lg border border-white/10 bg-black/20">
                  <button type="button" disabled={!canDecrease} aria-label={`Giảm ${meta.nameVi}`} onClick={() => onUpdateDeck({ ...clampedDeck, [key]: Math.max(0, count - 1) })}
                    className="flex min-h-6 items-center justify-center rounded-l-lg text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-25"><Minus className="h-3.5 w-3.5" /></button>
                  <span className="text-center text-xs font-bold tabular-nums text-white">{count}</span>
                  <button type="button" disabled={!canIncrease} aria-label={`Tăng ${meta.nameVi}`} onClick={() => onUpdateDeck({ ...clampedDeck, [key]: count + 1 })}
                    className="flex min-h-6 items-center justify-center rounded-r-lg text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-25"><Plus className="h-3.5 w-3.5" /></button>
                </div>
              </article>
            );
          })}
          {(activeTab === 'all' || activeTab === 'villagers') && (
            <article data-testid="role-card-villager" className="flex min-w-0 flex-col rounded-xl border border-white/10 bg-[#14101d] p-1.5">
              <button type="button" data-testid="role-info-btn-villager" onClick={() => setInspectingRoleId('villager')} aria-label="Giải thích vai trò Dân Làng"
                className="relative flex h-16 items-center justify-center rounded-lg bg-black/25 focus-visible:outline-2 focus-visible:outline-amber-200">
                <span aria-hidden="true" className="h-[66px] w-[66px] max-w-full [&_svg]:!h-full [&_svg]:!w-full">{renderRoleWoodcutSvg('villager', ROLE_CATALOG.villager.accentColor)}</span>
                <Info aria-hidden="true" className="absolute right-1 top-1 h-3.5 w-3.5 text-[#e8cd82]" />
              </button>
              <div className="flex-1 py-1"><h3 title={ROLE_CATALOG.villager.nameVi} className="min-h-7 break-words text-[11px] font-semibold leading-[14px] text-slate-100">Dân Làng</h3></div>
              <div className="flex min-h-6 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-xs font-bold tabular-nums text-white">×{villagerCount}</div>
            </article>
          )}
        </div>

        {/* Quick Tarot Role Experience Bar for all 15 Roles */}
        <details className="rounded-xl border border-white/10 bg-[#18121e] p-3">
          <summary className="cursor-pointer text-xs font-semibold text-[#e8cd82]">Thử vai trò</summary>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {allPlayableRoles.map((rId) => (
              <button
                key={rId}
                type="button"
                onClick={() => {
                  onStartWithPreferredRole(rId);
                  onClose();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#261c33] hover:bg-[#362747] border border-white/10 text-[11px] font-semibold text-white cursor-pointer transition-colors"
              >
                {ROLE_LABELS[rId]}
              </button>
            ))}
          </div>
        </details>
        </div>

        <div className="shrink-0 border-t border-white/10 p-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 w-full rounded-xl bg-[#9e1b24] px-4 text-sm font-semibold text-white hover:bg-[#b91c1c]"
          >
            Xong
          </button>
        </div>
      </div>

      {/* On-Demand Detailed Role Explanation Modal */}
      {inspectingRoleId && inspectingMeta && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/90 pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-explanation-title"
          data-testid="role-explanation-modal"
        >
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-[#120e1a] border-2 shadow-2xl p-5 sm:p-6 space-y-4"
               style={{ borderColor: inspectingMeta.accentColor }}>
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <div className="text-[11px] font-mono-tabular text-[#d4af37] tracking-widest uppercase">
                  ARCANA {inspectingMeta.romanNumeral} · {inspectingMeta.titleLatin}
                </div>
                <h3
                  id="role-explanation-title"
                  className="text-xl sm:text-2xl font-bold font-display text-white mt-0.5"
                  style={{ color: inspectingMeta.accentColor }}
                >
                  {inspectingMeta.nameVi}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-semibold"
                    style={{
                      backgroundColor: `${inspectingMeta.accentColor}25`,
                      color: inspectingMeta.accentColor,
                      border: `1px solid ${inspectingMeta.accentColor}50`,
                    }}
                  >
                    {inspectingMeta.faction === 'werewolves'
                      ? 'Phe Ma Sói (Tà Ác)'
                      : inspectingMeta.faction === 'solo'
                      ? 'Phe Thứ Ba · Độc Lập'
                      : 'Phe Dân Làng (Chính Nghĩa)'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                data-testid="close-role-explanation-btn"
                onClick={() => setInspectingRoleId(null)}
                aria-label="Đóng giải thích vai trò"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Illustration Woodcut Icon */}
            <div className="flex items-center justify-center bg-[#0a0710] rounded-xl border border-white/10 py-2">
              <div className="transform scale-90 sm:scale-100">
                {renderRoleWoodcutSvg(inspectingRoleId, inspectingMeta.accentColor)}
              </div>
            </div>

            {/* Role Detailed Explanation Sections */}
            <div className="space-y-3 text-xs">
              {/* 1. Summary / Lore */}
              <div className="p-3 rounded-xl bg-[#1a1426] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#d4af37]">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Giải Thích Chức Năng:</span>
                </div>
                <p className="text-slate-200 leading-relaxed text-xs sm:text-[13px]">
                  {inspectingMeta.summary}
                </p>
              </div>

              {/* 2. Night Ability */}
              <div className="p-3 rounded-xl bg-[#171322] border border-amber-500/25 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Moon className="w-3.5 h-3.5 shrink-0" />
                  <span>Hành Động Trong Đêm Huyết Nguyệt:</span>
                </div>
                <p className="text-amber-100/90 leading-relaxed text-xs">
                  {inspectingMeta.nightPrompt}
                </p>
              </div>

              {/* 3. Win Condition */}
              <div className="p-3 rounded-xl bg-[#151c22] border border-emerald-500/25 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                  <Trophy className="w-3.5 h-3.5 shrink-0" />
                  <span>Điều Kiện Chiến Thắng:</span>
                </div>
                <p className="text-emerald-100/90 leading-relaxed text-xs">
                  {inspectingMeta.winCondition}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
              {inspectingConfig ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300">Số lượng trong bộ bài:</span>
                  <div className="flex items-center gap-1.5 font-mono-tabular">
                    <button
                      type="button"
                      disabled={!canDecreaseInspecting}
                      onClick={() =>
                        onUpdateDeck({
                          ...clampedDeck,
                          [inspectingConfig.key]: Math.max(0, inspectingCount - 1),
                        })
                      }
                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-xs font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold text-white w-6 text-center">
                      {inspectingCount}
                    </span>
                    <button
                      type="button"
                      disabled={!canIncreaseInspecting}
                      onClick={() =>
                        onUpdateDeck({
                          ...clampedDeck,
                          [inspectingConfig.key]: inspectingCount + 1,
                        })
                      }
                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-xs font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  Lá Dân Làng tự động bù số ghế còn lại ({villagerCount} lá)
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onStartWithPreferredRole(inspectingRoleId);
                    setInspectingRoleId(null);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#281c3a] hover:bg-[#392752] border border-[#d4af37]/50 text-xs font-semibold text-[#f3e5ab] cursor-pointer"
                >
                  Chơi Vai Này
                </button>
                <button
                  type="button"
                  data-testid="dismiss-role-explanation-btn"
                  onClick={() => setInspectingRoleId(null)}
                  className="px-4 py-1.5 rounded-xl bg-[#9e1b24] hover:bg-[#b91c1c] text-xs font-bold text-white cursor-pointer"
                >
                  Đã Hiểu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

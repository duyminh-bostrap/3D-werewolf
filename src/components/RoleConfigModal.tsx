import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  ShieldAlert,
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
  Check,
  Crown,
  Snowflake,
  Eye,
  Shield,
  FlaskConical,
  Crosshair,
  Heart,
  Footprints,
  Landmark,
  Laugh,
  PawPrint,
  type LucideIcon,
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

const ROLE_ICONS: Record<RoleId, LucideIcon> = {
  villager: Users,
  werewolf: PawPrint,
  alpha_wolf: Crown,
  white_wolf: Snowflake,
  cursed_wolf: Flame,
  seer: Eye,
  aura_seer: Sparkles,
  bodyguard: Shield,
  witch: FlaskConical,
  hunter: Crosshair,
  cupid: Heart,
  elder: BookOpen,
  little_girl: Footprints,
  mayor: Landmark,
  jester: Laugh,
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
    recommendedMinPlayers: number;
  }> = [
    // Phe Ma Sói (4)
    { key: 'werewolf', roleId: 'werewolf', category: 'wolves', max: maxWolvesForRoom, recommendedMinPlayers: 5 },
    { key: 'alpha_wolf', roleId: 'alpha_wolf', category: 'wolves', max: 1, recommendedMinPlayers: 7 },
    { key: 'white_wolf', roleId: 'white_wolf', category: 'wolves', max: 1, recommendedMinPlayers: 9 },
    { key: 'cursed_wolf', roleId: 'cursed_wolf', category: 'wolves', max: 1, recommendedMinPlayers: 7 },
    // Phe Dân Làng Chức Năng (9)
    { key: 'seer', roleId: 'seer', category: 'villagers', max: 2, recommendedMinPlayers: 5 },
    { key: 'aura_seer', roleId: 'aura_seer', category: 'villagers', max: 1, recommendedMinPlayers: 7 },
    { key: 'bodyguard', roleId: 'bodyguard', category: 'villagers', max: 2, recommendedMinPlayers: 5 },
    { key: 'witch', roleId: 'witch', category: 'villagers', max: 2, recommendedMinPlayers: 6 },
    { key: 'hunter', roleId: 'hunter', category: 'villagers', max: 2, recommendedMinPlayers: 7 },
    { key: 'cupid', roleId: 'cupid', category: 'villagers', max: 1, recommendedMinPlayers: 8 },
    { key: 'elder', roleId: 'elder', category: 'villagers', max: 1, recommendedMinPlayers: 7 },
    { key: 'little_girl', roleId: 'little_girl', category: 'villagers', max: 1, recommendedMinPlayers: 8 },
    { key: 'mayor', roleId: 'mayor', category: 'villagers', max: 1, recommendedMinPlayers: 6 },
    // Phe Thứ Ba / Độc Lập (1)
    { key: 'jester', roleId: 'jester', category: 'solo', max: 1, recommendedMinPlayers: 6 },
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
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[#120e1b] border border-[#d4af37]/45 p-4 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#9e1b24]/25 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="role-config-title"
                className="text-lg sm:text-xl font-bold font-display text-white"
              >
                Kho Bài 15 Role Ma Sói ({playerCount} Người Trong Phòng)
              </h2>
              <p className="text-xs text-slate-400">
                Thẻ vai trò gọn gàng — ấn nút ℹ trên từng thẻ để xem giải thích chi tiết chức năng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng chọn role"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Room Size & Faction Balance Bar */}
        <div className="rounded-xl bg-[#181324] border border-[#d4af37]/30 p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-bold text-white">
                Cơ cấu ({playerCount}/{playerCount} Lá):
              </span>
              <span className="px-2 py-0.5 rounded bg-red-950/90 border border-red-500/40 text-red-200 font-mono-tabular font-semibold">
                Phe Sói: {werewolfCount}
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-950/90 border border-purple-400/40 text-purple-200 font-mono-tabular font-semibold">
                Chức Năng: {specialCount - soloCount}
              </span>
              {soloCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-pink-950/90 border border-pink-500/40 text-pink-200 font-mono-tabular font-semibold">
                  Phe Độc Lập: {soloCount}
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-500/40 text-slate-200 font-mono-tabular font-semibold">
                Dân Làng: {villagerCount}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                data-testid="full-variety-roles-btn"
                onClick={handleFullVarietyPreset}
                className="px-3 py-1.5 rounded-xl bg-[#271b3a] hover:bg-[#35244f] border border-[#d4af37]/40 text-xs font-bold text-[#f3e5ab] flex items-center gap-1.5 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Bộ Bài Đầy Đủ Role Mới</span>
              </button>

              <button
                type="button"
                data-testid="auto-balance-roles-btn"
                onClick={handleAutoBalance}
                className="px-3 py-1.5 rounded-xl bg-[#9e1b24] hover:bg-[#b91c1c] text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                <span>Cân Bằng Chuẩn ({playerCount} Người)</span>
              </button>
            </div>
          </div>

          {/* Visual Segmented Slot Bar (exact N slots from 5..15) */}
          <div className="flex w-full gap-1 pt-1">
            {Array.from({ length: playerCount }).map((_, idx) => {
              const isWolfSlot = idx < werewolfCount;
              const isSpecialSlot = idx >= werewolfCount && idx < werewolfCount + specialCount;
              return (
                <div
                  key={idx}
                  className={`flex-1 h-2.5 rounded-full ${
                    isWolfSlot
                      ? 'bg-red-500'
                      : isSpecialSlot
                      ? 'bg-purple-400'
                      : 'bg-slate-500'
                  }`}
                />
              );
            })}
          </div>

          {/* - / + Stepper & Quick Player Count Switcher (5..15) - ONLY in Lobby */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs">
            {isLobby ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-300 font-semibold">Số người (5–15):</span>
                <div className="inline-flex items-center rounded-lg bg-[#110d19] border border-[#d4af37]/45 p-0.5 font-mono-tabular mr-1">
                  <button
                    type="button"
                    data-testid="role-modal-decrease-players-btn"
                    disabled={playerCount <= MIN_ROOM_PLAYERS}
                    aria-label="Giảm sĩ số phòng"
                    onClick={() => onSetPlayerCount(playerCount - 1, true)}
                    className="w-6 h-6 rounded bg-white/5 hover:bg-red-950/80 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-white font-bold cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-xs font-bold text-[#d4af37]">
                    {playerCount}
                  </span>
                  <button
                    type="button"
                    data-testid="role-modal-increase-players-btn"
                    disabled={playerCount >= MAX_ROOM_PLAYERS}
                    aria-label="Tăng sĩ số phòng"
                    onClick={() => onSetPlayerCount(playerCount + 1, true)}
                    className="w-6 h-6 rounded bg-white/5 hover:bg-emerald-950/80 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-white font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {roomSizes.map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => onSetPlayerCount(cnt, true)}
                    className={`px-1.5 py-0.5 rounded font-mono-tabular text-[11px] font-semibold border cursor-pointer ${
                      playerCount === cnt
                        ? 'bg-[#d4af37] border-[#d4af37] text-black'
                        : 'bg-[#110d19] border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-amber-300 font-medium">
                Đang trong ván ({playerCount} người) — Khóa chỉnh số người
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRoomPlayers();
              }}
              className="text-[#d4af37] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Phòng →</span>
            </button>
          </div>
        </div>

        {/* Faction Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'Tất Cả Role (15)' },
            { id: 'wolves', label: 'Phe Ma Sói (4)' },
            { id: 'villagers', label: 'Phe Dân Làng (10)' },
            { id: 'solo', label: 'Phe Độc Lập (1)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#9e1b24] border-[#d4af37] text-white'
                  : 'bg-[#171222] border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Compact Role Cards Grid (No bloated paragraphs; click ℹ for full explanation) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1.5 sm:gap-2">
          {visibleRoles.map(({ key, roleId, max, recommendedMinPlayers }) => {
            const meta = ROLE_CATALOG[roleId];
            const RoleIcon = ROLE_ICONS[roleId] ?? Users;
            const count = clampedDeck[key] ?? 0;
            const isWolfPackKey =
              key === 'werewolf' || key === 'alpha_wolf' || key === 'white_wolf';
            const canIncrease =
              count < max &&
              totalAllocated < playerCount &&
              (!isWolfPackKey || werewolfCount < maxWolvesForRoom);
            const canDecrease =
              count > 0 && !(isWolfPackKey && werewolfCount <= 1);

            return (
              <div
                key={key}
                data-testid={`role-card-${roleId}`}
                className={`group flex items-center gap-1.5 rounded-xl border px-2 py-1.5 transition-all ${
                  count > 0
                    ? 'shadow-[0_0_16px_-8px_rgba(212,175,55,0.9)]'
                    : 'hover:border-white/25'
                }`}
                style={{
                  background: count > 0
                    ? `linear-gradient(135deg, ${meta.accentColor}1f, rgba(18,14,27,0.92))`
                    : 'rgba(20,16,29,0.9)',
                  borderColor: count > 0 ? `${meta.accentColor}70` : 'rgba(255,255,255,0.1)',
                }}
              >
                {/* Vivid role icon badge */}
                <span
                  className="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: `${meta.accentColor}24`,
                    borderColor: `${meta.accentColor}59`,
                    color: meta.accentColor,
                    boxShadow: count > 0 ? `0 0 12px -4px ${meta.accentColor}` : 'none',
                  }}
                >
                  <RoleIcon className="w-4 h-4" />
                </span>

                {/* Role name + minimum players */}
                <div className="min-w-0 flex-1">
                  <div
                    className="text-[11px] sm:text-xs font-bold truncate leading-tight"
                    style={{ color: count > 0 ? meta.accentColor : '#cbd5e1' }}
                    title={`${meta.nameVi} — ${
                      meta.faction === 'werewolves'
                        ? 'Phe Ma Sói'
                        : meta.faction === 'solo'
                        ? 'Phe Độc Lập'
                        : 'Phe Dân Làng'
                    } · cần ≥${recommendedMinPlayers} người`}
                  >
                    {meta.nameVi}
                  </div>
                  <div className="text-[9px] font-mono-tabular leading-tight text-slate-500">
                    ≥{recommendedMinPlayers} người
                  </div>
                </div>

                <button
                  type="button"
                  data-testid={`role-info-btn-${roleId}`}
                  onClick={() => setInspectingRoleId(roleId)}
                  aria-label={`Giải thích vai trò ${meta.nameVi}`}
                  title={`Xem giải thích chi tiết vai trò ${meta.nameVi}`}
                  className="w-6 h-6 rounded-md bg-white/5 hover:bg-[#d4af37]/25 border border-white/10 hover:border-[#d4af37]/60 text-[#d4af37] flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>

                {/* Inline card-count stepper */}
                <div className="flex items-center gap-0.5 shrink-0 font-mono-tabular">
                  <button
                    type="button"
                    disabled={!canDecrease}
                    aria-label={`Giảm ${meta.nameVi}`}
                    onClick={() =>
                      onUpdateDeck({
                        ...clampedDeck,
                        [key]: Math.max(0, count - 1),
                      })
                    }
                    className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 border border-white/10 disabled:opacity-25 text-white flex items-center justify-center cursor-pointer active:scale-90 transition-all"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span
                    className={`text-xs font-bold w-4 text-center ${
                      count > 0 ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                  <button
                    type="button"
                    disabled={!canIncrease}
                    aria-label={`Tăng ${meta.nameVi}`}
                    onClick={() =>
                      onUpdateDeck({
                        ...clampedDeck,
                        [key]: count + 1,
                      })
                    }
                    className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 border border-white/10 disabled:opacity-25 text-white flex items-center justify-center cursor-pointer active:scale-90 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Remaining Auto-Calculated Villager Card (matches the compact row layout) */}
          {(activeTab === 'all' || activeTab === 'villagers') && (
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-500/30 bg-[#161321] px-2 py-1.5">
              <span className="w-7 h-7 rounded-lg border border-slate-500/40 bg-slate-700/30 text-slate-300 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="text-[11px] sm:text-xs font-bold truncate leading-tight text-slate-200">
                  {ROLE_CATALOG.villager.nameVi}
                </div>
                <div className="text-[9px] leading-tight text-slate-500">Tự động lấp đầy</div>
              </div>

              <button
                type="button"
                data-testid="role-info-btn-villager"
                onClick={() => setInspectingRoleId('villager')}
                aria-label="Giải thích vai trò Dân Làng"
                title="Xem giải thích chi tiết vai trò Dân Làng"
                className="w-6 h-6 rounded-md bg-white/5 hover:bg-[#d4af37]/25 border border-white/10 hover:border-[#d4af37]/60 text-[#d4af37] flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                <Info className="w-3.5 h-3.5" />
              </button>

              <span className="px-2 py-1 rounded-md bg-slate-800 text-[11px] font-mono-tabular font-bold text-white shrink-0">
                ×{villagerCount}
              </span>
            </div>
          )}
        </div>

        {/* Quick Tarot Role Experience Bar for all 15 Roles */}
        <div className="rounded-xl bg-[#18121e] border border-[#d4af37]/30 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs text-[#d4af37]">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Chọn nhanh 1 trong 15 Role bên dưới để vào ván ngay với đúng lá bài Tarot đó:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
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
                {ROLE_CATALOG[rId].nameVi
                  .replace(' Huyết Nguyệt', '')
                  .replace(' (Sói Nguyền)', '')
                  .replace(' Độc Hành', '')
                  .replace(' (Kẻ Bị Nguyền)', '')
                  .replace(' Cổ Thuật', '')
                  .replace(' Cổ Thôn', '')
                  .replace(' (Kẻ Chán Đời)', '')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#9e1b24] hover:bg-[#b91c1c] text-xs font-bold text-white cursor-pointer"
          >
            Lưu Bộ Bài Role ({playerCount} Lá)
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
                  {inspectingConfig && (
                    <span className="text-xs text-slate-400 font-mono-tabular">
                      Đề xuất: ≥{inspectingConfig.recommendedMinPlayers} người
                    </span>
                  )}
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

import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  UserPlus,
  UserMinus,
  Crown,
  Bot,
  UserCheck,
  Trash2,
  X,
  Mic,
  MicOff,
  Minus,
  Plus,
  Lock,
  Layers,
} from 'lucide-react';
import {
  MAX_ROOM_PLAYERS,
  MIN_ROOM_PLAYERS,
  type PlayerState,
} from '../game/rules';

interface RoomPlayersModalProps {
  isOpen: boolean;
  isLobby?: boolean;
  maxPlayers?: number;
  roomCode: string;
  players: PlayerState[];
  localPlayerId: string;
  onAddBot: () => void;
  onRemoveBot: () => void;
  onSetPlayerCount: (targetCount: number, autoBalanceRoles: boolean) => void;
  onKickPlayer: (targetId: string) => void;
  onPromoteHost: (targetId: string) => void;
  onOpenRoleConfig: () => void;
  onClose: () => void;
}

export const RoomPlayersModal: React.FC<RoomPlayersModalProps> = ({
  isOpen,
  isLobby = true,
  maxPlayers,
  roomCode,
  players,
  localPlayerId,
  onAddBot,
  onRemoveBot,
  onSetPlayerCount,
  onKickPlayer,
  onPromoteHost,
  onOpenRoleConfig,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const targetSlots = maxPlayers ?? players.length;
  const localPlayer = players.find((p) => p.id === localPlayerId);
  const canEditPlayerCount = isLobby && Boolean(localPlayer?.isHost ?? true);

  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(
    roomCode
  )}`;

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const humanCount = players.filter((p) => !p.isBot).length;
  const botCount = players.filter((p) => p.isBot).length;
  const roomSizes = Array.from(
    { length: MAX_ROOM_PLAYERS - MIN_ROOM_PLAYERS + 1 },
    (_, i) => MIN_ROOM_PLAYERS + i
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/82 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-players-title"
      data-testid="separate-players-modal"
    >
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[#120e1b] border border-[#d4af37]/45 p-3.5 sm:p-5 shadow-2xl space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#9e1b24]/25 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="room-players-title"
                className="text-base sm:text-lg font-bold font-display text-white"
              >
                Phòng #{roomCode} ({players.length}/{targetSlots})
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invite Link & Room Scale Presets */}
        <div className="rounded-xl bg-[#181324] border border-white/10 p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-200 font-semibold">
              Link phòng <strong className="font-mono-tabular text-[#d4af37]">#{roomCode}</strong>
            </span>
            <div className="flex items-center gap-2.5 font-mono-tabular text-[11px]">
              <span className="text-emerald-400">Người: {humanCount}</span>
              <span className="text-amber-300">AI: {botCount}</span>
              <span className="text-white font-bold">
                {players.length}/{targetSlots}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              aria-label="Link mời"
              className="min-w-0 flex-1 px-2.5 py-1.5 rounded-xl bg-[#09080d] border border-white/15 text-xs font-mono-tabular text-slate-200 select-all"
            />
            <button
              type="button"
              onClick={handleCopyInvite}
              title="Sao chép link"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#9e1b24] hover:bg-[#b91c1c] text-xs font-bold text-white cursor-pointer whitespace-nowrap shadow shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã chép' : 'Copy'}</span>
            </button>
          </div>

          {/* Direct - / + Stepper Control & Quick Player Count Selector (ONLY in Lobby!) */}
          {canEditPlayerCount ? (
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200">
                    Số người (5–15):
                  </span>
                  <div className="inline-flex items-center rounded-xl bg-[#110d19] border border-[#d4af37]/45 p-0.5 font-mono-tabular">
                    <button
                      type="button"
                      data-testid="modal-decrease-players-btn"
                      disabled={targetSlots <= MIN_ROOM_PLAYERS}
                      aria-label="Giảm số người"
                      onClick={() => onSetPlayerCount(targetSlots - 1, true)}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-950/80 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-white font-bold cursor-pointer transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span
                      data-testid="modal-player-count-value"
                      className="px-2.5 text-xs font-bold text-[#d4af37] min-w-[60px] text-center"
                    >
                      {players.length}/{targetSlots}
                    </span>
                    <button
                      type="button"
                      data-testid="modal-increase-players-btn"
                      disabled={targetSlots >= MAX_ROOM_PLAYERS}
                      aria-label="Tăng số người"
                      onClick={() => onSetPlayerCount(targetSlots + 1, true)}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-emerald-950/80 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-white font-bold cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={players.length <= MIN_ROOM_PLAYERS || botCount === 0}
                    onClick={onRemoveBot}
                    title="Bớt AI"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-950/70 hover:bg-red-900 disabled:opacity-40 border border-red-500/40 text-xs font-semibold text-red-200 cursor-pointer"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>-AI</span>
                  </button>
                  <button
                    type="button"
                    disabled={players.length >= MAX_ROOM_PLAYERS}
                    onClick={onAddBot}
                    title="Thêm AI"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 disabled:opacity-40 border border-emerald-500/40 text-xs font-semibold text-emerald-200 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+AI</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {roomSizes.map((count) => (
                  <button
                    key={count}
                    type="button"
                    data-testid={`set-room-size-${count}`}
                    onClick={() => onSetPlayerCount(count, true)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono-tabular font-semibold border transition-colors cursor-pointer ${
                      targetSlots === count
                        ? 'bg-[#9e1b24] border-[#d4af37] text-white'
                        : 'bg-[#110d19] border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div
              data-testid="in-game-player-count-locked"
              className="pt-2 border-t border-white/10 flex items-center gap-1.5 text-[11px] text-amber-300 font-medium"
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>{!isLobby ? 'Đang trong ván — Khóa thêm/bớt người' : 'Chủ phòng chỉnh số lượng người'}</span>
            </div>
          )}
        </div>

        {/* Full Player Roster Around the Bonfire */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
            {players.map((p) => {
              const isMe = p.id === localPlayerId;
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border px-2.5 py-2 flex items-center justify-between gap-2 ${
                    isMe
                      ? 'bg-[#211830] border-[#d4af37]/60'
                      : 'bg-[#171322] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-mono-tabular font-bold text-white shrink-0"
                      style={{
                        backgroundColor: p.appearance.cloakColor,
                        borderColor: p.appearance.trimColor || '#d4af37',
                      }}
                    >
                      #{p.seatIndex + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-white truncate">
                          {p.name}
                        </span>
                        {isMe && (
                          <span className="px-1 py-0.2 rounded bg-amber-500/20 border border-amber-400/40 text-[9px] text-amber-300 font-semibold">
                            Bạn
                          </span>
                        )}
                        {p.isHost && (
                          <span title="Chủ Phòng">
                            <Crown className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        {p.isBot ? (
                          <span className="inline-flex items-center gap-0.5 text-slate-400">
                            <Bot className="w-3 h-3 text-purple-400" />
                            <span>AI</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-emerald-300">
                            <UserCheck className="w-3 h-3" />
                            <span>Người</span>
                          </span>
                        )}
                        {isLobby && (
                          <span
                            className={`px-1 rounded text-[9px] font-bold ${
                              p.isHost || p.isReady
                                ? 'bg-emerald-950/80 text-emerald-300'
                                : 'bg-amber-950/80 text-amber-300'
                            }`}
                          >
                            {p.isHost ? 'Host' : p.isReady ? 'Sẵn sàng' : 'Chờ'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Per-player Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className="w-6 h-6 rounded-lg bg-black/30 flex items-center justify-center"
                      title={p.isMuted ? 'Tắt Mic' : 'Bật Mic'}
                    >
                      {p.isMuted ? (
                        <MicOff className="w-3 h-3 text-slate-500" />
                      ) : (
                        <Mic className="w-3 h-3 text-emerald-400" />
                      )}
                    </span>

                    {canEditPlayerCount && !p.isHost && (
                      <button
                        type="button"
                        onClick={() => onPromoteHost(p.id)}
                        title="Trao Chủ Phòng"
                        aria-label={`Trao quyền chủ phòng cho ${p.name}`}
                        className="w-6 h-6 rounded-lg bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-[#d4af37] flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Crown className="w-3 h-3" />
                      </button>
                    )}

                    {canEditPlayerCount && !isMe && players.length > MIN_ROOM_PLAYERS && (
                      <button
                        type="button"
                        onClick={() => onKickPlayer(p.id)}
                        title="Xóa khỏi phòng"
                        aria-label={`Xóa ${p.name} khỏi phòng`}
                        className="w-6 h-6 rounded-lg bg-red-950/50 hover:bg-red-900/80 text-red-300 flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenRoleConfig();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1f1830] hover:bg-[#2b2142] border border-[#d4af37]/40 text-xs font-semibold text-[#d4af37] cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Role ({targetSlots})</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#9e1b24] hover:bg-[#b91c1c] text-xs font-bold text-white cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

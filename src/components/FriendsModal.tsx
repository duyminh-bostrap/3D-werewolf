import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Play,
  Copy,
  Trash2,
  X,
  Cloud,
  HardDrive,
  Check,
  Loader2,
  Share2,
} from 'lucide-react';
import {
  formatLastSeen,
  isCloudFriendsEnabled,
  loadFriends,
  removeFriend,
  saveFriend,
  type FriendEntry,
} from '../lib/friendsStore';

interface FriendsModalProps {
  isOpen: boolean;
  currentRoomCode: string;
  onJoinRoom: (roomCode: string) => void;
  onClose: () => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  currentRoomCode,
  onJoinRoom,
  onClose,
}) => {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState(currentRoomCode);
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState('');
  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(currentRoomCode.toUpperCase())}`;

  const shareInvite = async () => {
    setInviteStatus('');
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Huyết Nguyệt Thôn', text: `Vào phòng #${currentRoomCode} cùng mình!`, url: inviteUrl });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteStatus('Đã sao chép liên kết phòng.');
    } catch {
      setInviteStatus('Không thể sao chép tự động. Hãy chọn và sao chép liên kết bên dưới.');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setRoomCode((prev) => prev || currentRoomCode);
    let cancelled = false;
    setIsLoading(true);
    void loadFriends()
      .then((list) => {
        if (!cancelled) setFriends(list);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, currentRoomCode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.roomCode.toLowerCase().includes(q) ||
        f.note.toLowerCase().includes(q)
    );
  }, [friends, query]);

  const handleAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      setIsLoading(true);
      try {
        const next = await saveFriend({ name, roomCode, note });
        setFriends(next);
        setName('');
        setNote('');
      } finally {
        setIsLoading(false);
      }
    },
    [name, roomCode, note]
  );

  const handleRemove = useCallback(async (id: string) => {
    const next = await removeFriend(id);
    setFriends(next);
  }, []);

  const handleCopyInvite = useCallback(async (friend: FriendEntry) => {
    const code = currentRoomCode.toUpperCase();
    const url = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(friend.id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setQuery('');
    }
  }, [currentRoomCode]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/84 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="friends-title"
      data-testid="friends-modal"
    >
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-[#120e1b] border border-[#d4af37]/45 p-3.5 sm:p-5 shadow-2xl space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#9e1b24]/25 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="friends-title" className="text-base sm:text-lg font-bold font-display text-white">
                Danh Sách Bạn Bè
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                    isCloudFriendsEnabled
                      ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                      : 'bg-slate-800/80 border-slate-500/40 text-slate-300'
                  }`}
                >
                  {isCloudFriendsEnabled ? (
                    <Cloud className="w-3 h-3" />
                  ) : (
                    <HardDrive className="w-3 h-3" />
                  )}
                  {isCloudFriendsEnabled ? 'Supabase' : 'Lưu trên máy'}
                </span>
                <span className="text-[10px] text-slate-400">{friends.length} người</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng danh sách bạn bè"
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl bg-[#18121e] border border-[#d4af37]/25 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-amber-100">Mời vào phòng #{currentRoomCode}</span>
            <button type="button" data-testid="share-room-invite-btn" onClick={() => void shareInvite()} className="min-h-10 rounded-lg bg-[#9e1b24] px-3 text-xs font-bold text-white flex items-center gap-2 hover:bg-[#b91c1c] focus-visible:outline-2 focus-visible:outline-amber-200">
              <Share2 className="w-4 h-4" /> Gửi link
            </button>
          </div>
          <input aria-label="Liên kết mời vào phòng hiện tại" readOnly value={inviteUrl} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-lg border border-white/15 bg-[#0d0a14] px-3 py-2 text-xs text-slate-300 select-all" />
          {inviteStatus && <p role="status" className="text-xs text-amber-200">{inviteStatus}</p>}
        </div>

        {/* Add friend form */}
        <form onSubmit={handleAdd} className="rounded-xl bg-[#18121e] border border-[#d4af37]/25 p-2.5 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#d4af37]">
            <UserPlus className="w-3.5 h-3.5" />
            <span>Thêm bạn mới</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="Tên bạn bè..."
              aria-label="Tên bạn bè"
              className="px-2.5 py-2 rounded-lg bg-[#0d0a14] border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#d4af37]/70"
            />
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 12))}
              placeholder="Mã phòng (VD: GOTHIC)"
              aria-label="Mã phòng của bạn bè"
              className="px-2.5 py-2 rounded-lg bg-[#0d0a14] border border-white/15 text-xs text-white font-mono-tabular placeholder:text-slate-500 focus:outline-none focus:border-[#d4af37]/70"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={80}
              placeholder="Ghi chú (sở trường, giờ chơi...)"
              aria-label="Ghi chú về bạn bè"
              className="flex-1 px-2.5 py-2 rounded-lg bg-[#0d0a14] border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#d4af37]/70"
            />
            <button
              type="submit"
              disabled={!name.trim() || isLoading}
              className="px-3 py-2 rounded-lg bg-[#9e1b24] hover:bg-[#b91c1c] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>Thêm</span>
            </button>
          </div>
        </form>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm bạn bè, mã phòng, ghi chú..."
            aria-label="Tìm bạn bè"
            className="w-full pl-8 pr-2.5 py-2 rounded-lg bg-[#0d0a14] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#d4af37]/60"
          />
        </div>

        {/* List */}
        <div className="space-y-1.5">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-[#0f0c17] px-3 py-8 text-center space-y-1.5">
              <Users className="w-6 h-6 text-[#d4af37]/50 mx-auto" />
              <p className="text-xs text-slate-400">
                {friends.length === 0
                  ? 'Chưa có bạn bè nào. Thêm người chơi cùng để mời vào phòng nhanh hơn!'
                  : 'Không tìm thấy ai khớp với từ khoá.'}
              </p>
            </div>
          ) : (
            filtered.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center gap-2 rounded-xl bg-[#161221] border border-white/10 px-2 py-1.5"
              >
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#9e1b24] to-[#3b0a12] border border-[#d4af37]/40 text-[#fde68a] text-[11px] font-bold flex items-center justify-center shrink-0">
                  {friend.name.slice(0, 1).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate">{friend.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {friend.roomCode ? (
                      <span className="font-mono-tabular text-[#d4af37]">#{friend.roomCode}</span>
                    ) : (
                      'chưa có phòng'
                    )}
                    {friend.note ? ` · ${friend.note}` : ''} · {formatLastSeen(friend.lastSeenAt)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onJoinRoom(friend.roomCode || currentRoomCode);
                    onClose();
                  }}
                  title={friend.roomCode ? `Vào phòng #${friend.roomCode}` : 'Vào phòng hiện tại'}
                  aria-label={`Vào phòng của ${friend.name}`}
                  className="w-7 h-7 rounded-lg bg-emerald-900/70 hover:bg-emerald-700 border border-emerald-500/50 text-emerald-100 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => void handleCopyInvite(friend)}
                  title="Sao chép link mời"
                  aria-label={`Sao chép link mời ${friend.name}`}
                  className="w-7 h-7 rounded-lg bg-[#231b33] hover:bg-[#31254a] border border-white/15 text-amber-200 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  {copiedId === friend.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void handleRemove(friend.id)}
                  title="Xoá bạn"
                  aria-label={`Xoá ${friend.name}`}
                  className="w-7 h-7 rounded-lg bg-[#2a1418] hover:bg-[#3b1a20] border border-red-500/30 text-red-300 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>


      </div>
    </div>
  );
};

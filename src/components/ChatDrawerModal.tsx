import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, ScrollText, Send, X, Sparkles, Moon, Skull } from 'lucide-react';
import type { ChatMessage } from '../../server';
import { isWolfPackRole, type GamePhase, type PlayerState } from '../game/rules';

interface ChatDrawerModalProps {
  isOpen: boolean;
  messages: ChatMessage[];
  logs: string[];
  phase: GamePhase;
  localPlayer: PlayerState;
  onSendChat: (text: string) => void;
  onClose: () => void;
}

const QUICK_PHRASES = [
  'Tôi là Dân Làng vô tội, đừng treo cổ tôi!',
  'Tiên Tri đêm qua đã soi được ai chưa?',
  'Đêm qua tôi nghe tiếng bước chân khả nghi!',
  'Hãy tập trung bỏ phiếu cho nghi phạm số 1!',
];

export const ChatDrawerModal: React.FC<ChatDrawerModalProps> = ({
  isOpen,
  messages,
  logs,
  phase,
  localPlayer,
  onSendChat,
  onClose,
}) => {
  const [tab, setTab] = useState<'chat' | 'logs'>('chat');
  const [chatText, setChatText] = useState('');
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const isDead = !localPlayer.isAlive;
  const isWolfChannel = phase === 'night' && isWolfPackRole(localPlayer.role) && !isDead;

  useEffect(() => {
    if (isOpen) {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages.length, logs.length, tab]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatText.trim();
    if (!trimmed || isDead) return;
    onSendChat(trimmed);
    setChatText('');
  };

  return (
    <div
      className="fixed top-14 sm:top-16 bottom-3 right-0 z-40 w-full sm:w-[400px] px-2.5 sm:px-4 pointer-events-auto flex flex-col"
      role="dialog"
      aria-modal="false"
      aria-label="Thanh Chat & Nhật Ký Làng"
      data-testid="separate-chat-drawer"
    >
      <div className="flex-1 rounded-2xl bg-[#110d19]/98 border border-[#d4af37]/45 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#161121]">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#d4af37]" />
            <h2 className="text-sm font-bold font-display text-white tracking-wide">
              Thanh Thảo Luận & Nhật Ký Làng
            </h2>
            {isWolfChannel && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-950/80 border border-red-500/50 text-[10px] font-bold text-red-200">
                <Moon className="w-3 h-3" />
                Kênh Sói
              </span>
            )}
            {isDead && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-800/90 border border-slate-500/50 text-[10px] font-bold text-slate-300">
                <Skull className="w-3 h-3" />
                Đã Chết
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng thanh chat"
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tab Switcher (Chat vs Chronicle Logs) */}
        <div className="p-2 bg-[#0c0913] border-b border-white/10 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setTab('chat')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'chat'
                ? 'bg-[#9e1b24] text-white shadow'
                : 'bg-white/5 text-slate-300 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Trò Chuyện ({messages.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('logs')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'logs'
                ? 'bg-[#9e1b24] text-white shadow'
                : 'bg-white/5 text-slate-300 hover:text-white'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>Nhật Ký Đêm ({logs.length})</span>
          </button>
        </div>

        {/* Body Content */}
        {tab === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-[#09070e]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                  {isDead ? (
                    <>
                      <Skull className="w-6 h-6 text-red-400/70" />
                      <p className="text-xs">
                        Bạn đã ngã xuống — hồn ma không thể cất tiếng. Hãy theo dõi cuộc chơi.
                      </p>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6 text-[#d4af37]/60" />
                      <p className="text-xs">
                        {isWolfChannel
                          ? 'Màn đêm buông xuống. Đây là kênh riêng của bầy sói — dân làng không nghe được.'
                          : 'Chưa có lời biện hộ nào. Hãy gửi tin nhắn hoặc chọn câu thoại nhanh bên dưới!'}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl border px-3 py-2 text-xs space-y-0.5 ${
                      m.channel === 'wolves'
                        ? 'bg-[#1c0f14] border-red-500/40'
                        : 'bg-[#161221] border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-[#d4af37] font-semibold">{m.senderName}</strong>
                      {m.channel === 'wolves' && (
                        <span className="px-1.5 py-0.5 rounded bg-red-900/80 border border-red-500/40 text-[9px] font-bold text-red-200">
                          SÓI · ĐÊM
                        </span>
                      )}
                    </div>
                    <p className="text-slate-200 leading-relaxed break-words">{m.text}</p>
                  </div>
                ))
              )}
              <div ref={listEndRef} />
            </div>

            {/* Quick Tactical Phrases */}
            <div className="px-3 py-2 bg-[#120e1b] border-t border-white/10">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
                Thoại Nhanh Phiên Tòa
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {QUICK_PHRASES.map((phrase, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isDead}
                    onClick={() => onSendChat(phrase)}
                    className="px-2.5 py-1 rounded-lg bg-[#1d172b] hover:bg-[#2a213d] border border-white/10 text-[11px] text-slate-200 whitespace-nowrap cursor-pointer transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSubmit}
              className="p-3 bg-[#161121] border-t border-white/10 flex items-center gap-2"
            >
              <input
                type="text"
                data-testid="chat-drawer-input"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                disabled={isDead}
                placeholder={
                  isDead
                    ? 'Đã chết — không thể nói'
                    : isWolfChannel
                    ? 'Nhắn riêng cho bầy sói...'
                    : 'Nhập lời biện hộ hoặc suy luận...'
                }
                className="flex-1 px-3 py-2.5 rounded-xl bg-[#09070e] border border-white/15 text-xs text-white focus:outline-none focus:border-[#d4af37] disabled:opacity-55 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                data-testid="chat-drawer-send-btn"
                disabled={isDead}
                aria-label="Gửi tin nhắn"
                className="px-4 py-2.5 rounded-xl bg-[#9e1b24] hover:bg-[#b91c1c] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2 bg-[#09070e]">
            {logs.map((log, i) => (
              <div
                key={i}
                className="rounded-xl bg-[#151120] border border-[#d4af37]/20 px-3 py-2 text-xs text-slate-200 leading-relaxed"
              >
                <span className="text-[#d4af37] font-mono-tabular mr-1.5">#{i + 1}</span>
                {log}
              </div>
            ))}
            <div ref={listEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

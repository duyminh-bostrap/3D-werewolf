import React from 'react';
import { BookOpen, X } from 'lucide-react';

export const GameGuideModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="guide-title">
    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[#d4af37]/45 bg-[#120e1b] p-5 text-slate-200 shadow-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <h2 id="guide-title" className="flex items-center gap-2 font-display text-lg text-amber-100"><BookOpen className="h-5 w-5 text-[#d4af37]" /> Hướng dẫn chơi</h2>
        <button type="button" onClick={onClose} aria-label="Đóng hướng dẫn" className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-4 space-y-3 text-sm leading-relaxed">
        <p><strong className="text-amber-200">Sảnh chờ:</strong> Mời người chơi, chọn bộ bài và sẵn sàng. Chủ phòng bắt đầu khi đủ điều kiện.</p>
        <p><strong className="text-amber-200">Ban đêm:</strong> Xem lá bài của mình, chọn mục tiêu và dùng chức năng của vai trò.</p>
        <p><strong className="text-amber-200">Ban ngày:</strong> Thảo luận, chọn người nghi ngờ hoặc bỏ phiếu trắng. Người được đề cử có thời gian biện minh trước khi mọi người chọn Giết hoặc Sống.</p>
        <p><strong className="text-amber-200">Điều khiển:</strong> Dùng cần ảo hoặc phím WASD để di chuyển trong sảnh; kéo màn hình hoặc biểu tượng mắt để xoay góc nhìn.</p>
      </div>
    </div>
  </div>
);

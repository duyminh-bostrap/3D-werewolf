import React from 'react';
import {
  Settings,
  Volume2,
  VolumeX,
  Camera,
  Gamepad2,
  Eye,
  RotateCcw,
  LogOut,
  Bell,
  HeartPulse,
  Flame,
  X,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  isAudioMuted: boolean;
  cameraPreset: 'follow' | 'overview' | 'bonfire';
  showVirtualPad: boolean;
  isHudCollapsed: boolean;
  onToggleAudioMute: () => void;
  onChangeCameraPreset: (preset: 'follow' | 'overview' | 'bonfire') => void;
  onToggleVirtualPad: () => void;
  onToggleHudCollapse: () => void;
  onTriggerHorrorSound: (soundId: 'howl' | 'bell' | 'heartbeat') => void;
  onResetLobby: () => void;
  onReturnTitle: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  isAudioMuted,
  cameraPreset,
  showVirtualPad,
  isHudCollapsed,
  onToggleAudioMute,
  onChangeCameraPreset,
  onToggleVirtualPad,
  onToggleHudCollapse,
  onTriggerHorrorSound,
  onResetLobby,
  onReturnTitle,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      data-testid="separate-settings-modal"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#120e1b] border border-[#d4af37]/45 p-5 sm:p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#9e1b24]/25 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-lg sm:text-xl font-bold font-display text-white">
                Cài Đặt Hệ Thống & Âm Thanh
              </h2>
              <p className="text-xs text-slate-400">
                Tùy chỉnh âm thanh kinh dị, góc máy quay 3D và điều khiển di chuyển
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cài đặt"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Audio & Horror Soundboard */}
        <div className="space-y-3 rounded-xl bg-[#181324] border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                Âm Thanh & Nhạc Nền Kinh Dị
              </div>
              <div className="text-xs text-slate-400">
                Nhạc nền Gothic Web Audio & hiệu ứng bước chân 3D
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleAudioMute}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border cursor-pointer transition-colors ${
                isAudioMuted
                  ? 'bg-red-950/60 border-red-500/50 text-red-200'
                  : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
              }`}
            >
              {isAudioMuted ? (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span>Đã Tắt Âm (M)</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span>Đang Bật Âm (M)</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-2 border-t border-white/10">
            <div className="text-[11px] font-medium text-slate-300 mb-2">
              Phát Hiệu Ứng Kinh Dị Toàn Phòng:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onTriggerHorrorSound('howl')}
                className="px-3 py-2.5 rounded-xl bg-[#22172b] hover:bg-[#2f1f3b] border border-red-500/30 text-xs font-semibold text-red-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-red-400" />
                <span>Tiếng Sói Hú</span>
              </button>
              <button
                type="button"
                onClick={() => onTriggerHorrorSound('bell')}
                className="px-3 py-2.5 rounded-xl bg-[#22172b] hover:bg-[#2f1f3b] border border-[#d4af37]/30 text-xs font-semibold text-[#d4af37] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Chuông Báo Tử</span>
              </button>
              <button
                type="button"
                onClick={() => onTriggerHorrorSound('heartbeat')}
                className="px-3 py-2.5 rounded-xl bg-[#22172b] hover:bg-[#2f1f3b] border border-purple-500/30 text-xs font-semibold text-purple-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <HeartPulse className="w-3.5 h-3.5 text-purple-400" />
                <span>Nhịp Tim Đập</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Camera & Mobile Movement Controls */}
        <div className="space-y-3 rounded-xl bg-[#181324] border border-white/10 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" />
            <span>Góc Máy Quay 3D & Điều Khiển Di Chuyển</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'follow', label: 'Theo Bước (3rd Person)' },
                { id: 'bonfire', label: 'Vòng Tròn Lửa Trại' },
                { id: 'overview', label: 'Toàn Cảnh Làng Cổ' },
              ] as const
            ).map((cam) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => onChangeCameraPreset(cam.id)}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  cameraPreset === cam.id
                    ? 'bg-[#9e1b24] border-[#d4af37] text-white'
                    : 'bg-[#110d19] border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={onToggleVirtualPad}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-between cursor-pointer ${
                showVirtualPad
                  ? 'bg-[#1f1830] border-[#d4af37]/50 text-white'
                  : 'bg-[#110d19] border-white/10 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-[#d4af37]" />
                <span>Cần Điều Khiển Ảo (Mobile)</span>
              </span>
              <span className="text-[11px] font-mono-tabular text-[#d4af37]">
                {showVirtualPad ? 'BẬT' : 'TẮT'}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleHudCollapse}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-between cursor-pointer ${
                isHudCollapsed
                  ? 'bg-[#1f1830] border-[#d4af37]/50 text-white'
                  : 'bg-[#110d19] border-white/10 text-slate-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Chế Độ Ngắm Làng (Ẩn HUD)</span>
              </span>
              <span className="text-[11px] font-mono-tabular text-emerald-400">
                {isHudCollapsed ? 'BẬT' : 'TẮT'}
              </span>
            </button>
          </div>
        </div>

        {/* Section 3: Match & Room Management */}
        <div className="space-y-2 rounded-xl bg-[#181324] border border-white/10 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Quản Lý Ván Đấu & Phòng Chờ
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                onResetLobby();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-[#211a30] hover:bg-[#2c2240] border border-white/15 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-[#d4af37]" />
              <span>Đặt Lại Về Sảnh Chờ (R)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onReturnTitle();
              }}
              className="px-4 py-2.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-500/30 text-xs font-semibold text-red-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>Về Màn Hình Khởi Đầu</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#9e1b24] hover:bg-[#b91c1c] text-xs font-bold text-white cursor-pointer"
          >
            Hoàn Tất & Quay Lại Làng
          </button>
        </div>
      </div>
    </div>
  );
};

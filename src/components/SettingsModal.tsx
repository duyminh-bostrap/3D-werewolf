import { AccountPanel } from './AccountPanel';
import { SOCIAL_LOGIN_ENABLED } from '../lib/socialAuth';
import React from 'react';
import {
  Settings,
  Mic,
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
  Palette,
  Sun,
  X,
} from 'lucide-react';

import type { CameraPreset, LightingStageMode } from '../three/GothicVillageScene';

interface SettingsModalProps {
  isOpen: boolean;
  isAudioMuted: boolean;
  micVolume: number;
  onMicVolumeChange: (volume: number) => void;
  audioVolume: number;
  onAudioVolumeChange: (volume: number) => void;
  isLobby: boolean;
  lightingOverride: LightingStageMode;
  onCycleLightingOverride: () => void;
  onOpenCustomizer: () => void;
  cameraPreset: CameraPreset;
  showVirtualPad: boolean;
  isHudCollapsed: boolean;
  onChangeCameraPreset: (preset: CameraPreset) => void;
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
  micVolume,
  onMicVolumeChange,
  audioVolume,
  onAudioVolumeChange,
  isLobby,
  lightingOverride,
  onCycleLightingOverride,
  onOpenCustomizer,
  cameraPreset,
  showVirtualPad,
  isHudCollapsed,
  onChangeCameraPreset,
  onToggleVirtualPad,
  onToggleHudCollapse,
  onTriggerHorrorSound,
  onResetLobby,
  onReturnTitle,
  onClose,
}) => {
  if (!isOpen) return null;

  const row = 'flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#1b1528] px-3.5 py-2.5 text-left text-sm text-slate-100 transition-colors hover:bg-[#261d35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';
  const section = 'space-y-2';
  const heading = 'px-1 text-[11px] font-bold uppercase tracking-[0.13em] text-[#d4af37]';
  const state = 'shrink-0 rounded-md border border-white/10 bg-black/25 px-2 py-1 text-xs font-semibold text-amber-100';
  const lightLabel = lightingOverride === 'auto' ? 'Tự động' : lightingOverride === 'day' ? 'Ban ngày' : lightingOverride === 'night' ? 'Ban đêm' : 'Hoàng hôn';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-2 sm:items-center sm:p-4 pointer-events-auto" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" data-testid="separate-settings-modal">
      <div className="flex max-h-[min(90dvh,760px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#d4af37]/40 bg-[#120e1b] shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d4af37]/35 bg-[#9e1b24]/20 text-[#d4af37]"><Settings className="h-5 w-5" /></div>
            <div><h2 id="settings-modal-title" className="font-display text-lg font-bold text-white">Cài đặt</h2><p className="text-xs text-slate-400">Tùy chỉnh trải nghiệm trong làng</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng cài đặt" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-300"><X className="h-5 w-5" /></button>
        </header>

        <div className="min-h-0 space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
          {SOCIAL_LOGIN_ENABLED && <AccountPanel />}
          <section className={section} aria-labelledby="settings-personal">
            <h3 id="settings-personal" className={heading}>Nhân vật & hiển thị</h3>
            <button type="button" onClick={onOpenCustomizer} className={row}><span className="flex min-w-0 items-center gap-3"><Palette className="h-4 w-4 shrink-0 text-violet-300" /> Sửa nhân vật</span><span aria-hidden="true" className="text-slate-400">›</span></button>
            <button type="button" onClick={onCycleLightingOverride} disabled={!isLobby} title={isLobby ? 'Đổi ánh sáng' : 'Ánh sáng tự động theo ván chơi'} className={`${row} disabled:cursor-not-allowed disabled:opacity-50`}><span className="flex min-w-0 items-center gap-3"><Sun className="h-4 w-4 shrink-0 text-amber-300" /> Ánh sáng</span><span className={state}>{isLobby ? lightLabel : 'Theo ván chơi'}</span></button>
            <div className="rounded-xl border border-white/10 bg-[#1b1528] p-3.5">
              <div className="mb-3 flex items-center gap-3 text-sm text-slate-100"><Camera className="h-4 w-4 text-[#d4af37]" /> Góc nhìn</div>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Chọn góc nhìn">
                {([{ id: 'follow', label: 'Thứ ba' }, { id: 'first', label: 'Thứ nhất' }] as const).map((cam) => (
                  <button key={cam.id} type="button" aria-pressed={cameraPreset === cam.id} onClick={() => onChangeCameraPreset(cam.id)} className={`min-h-10 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-amber-300 ${cameraPreset === cam.id ? 'border-[#d4af37]/70 bg-[#7f1c29] text-white' : 'border-white/10 bg-[#110e1b] text-slate-300 hover:bg-[#2a2038]'}`}>{cam.label}</button>
                ))}
              </div>
            </div>
          </section>

          <section className={section} aria-labelledby="settings-controls">
            <h3 id="settings-controls" className={heading}>Điều khiển</h3>
            <button type="button" onClick={onToggleVirtualPad} aria-pressed={showVirtualPad} className={row}><span className="flex items-center gap-3"><Gamepad2 className="h-4 w-4 text-[#d4af37]" /> Cần điều khiển ảo</span><span className={state}>{showVirtualPad ? 'Bật' : 'Tắt'}</span></button>
            <button type="button" onClick={onToggleHudCollapse} aria-pressed={isHudCollapsed} className={row}><span className="flex items-center gap-3"><Eye className="h-4 w-4 text-emerald-300" /> Ẩn thanh kỹ năng</span><span className={state}>{isHudCollapsed ? 'Bật' : 'Tắt'}</span></button>
          </section>

          <section className={section} aria-labelledby="settings-audio">
            <h3 id="settings-audio" className={heading}>Âm thanh</h3>
            <label className="block rounded-xl border border-white/10 bg-[#1b1528] px-3.5 py-3">
              <span className="mb-2 flex items-center justify-between gap-3 text-sm text-slate-100"><span className="flex items-center gap-2">{isAudioMuted ? <VolumeX className="h-4 w-4 text-slate-400" /> : <Volume2 className="h-4 w-4 text-emerald-300" />} Nhạc và hiệu ứng</span><output className="font-mono-tabular text-xs text-amber-200">{isAudioMuted ? 'Tắt · 0%' : `${Math.round(audioVolume * 100)}%`}</output></span>
              <input type="range" aria-label="Âm lượng nhạc và hiệu ứng" min="0" max="100" step="1" value={Math.round(audioVolume * 100)} onChange={(e) => onAudioVolumeChange(Number(e.target.value) / 100)} className="h-7 w-full cursor-pointer accent-[#d4af37]" />
            </label>
            <label className="block rounded-xl border border-white/10 bg-[#1b1528] px-3.5 py-3">
              <span className="mb-2 flex items-center justify-between gap-3 text-sm text-slate-100"><span className="flex items-center gap-2"><Mic className="h-4 w-4 text-emerald-300" /> Âm lượng mic</span><output className="font-mono-tabular text-xs text-amber-200">{Math.round(micVolume * 100)}%</output></span>
              <input type="range" aria-label="Âm lượng mic" min="0" max="300" step="10" value={Math.round(micVolume * 100)} onChange={e => onMicVolumeChange(Number(e.target.value) / 100)} className="w-full accent-[#d4af37]" />
              <span className="mt-1 block text-xs leading-relaxed text-slate-400">Mức tiếng bạn gửi đi. Thử 150–200% nếu mic nhỏ; 0% là im tiếng. Bật mic để áp dụng.</span>
            </label>
            <details className="rounded-xl border border-white/10 bg-[#1b1528]">
              <summary className="cursor-pointer px-3.5 py-3 text-sm text-slate-200">Phát âm thanh cho cả phòng</summary>
              <div className="grid grid-cols-1 gap-2 border-t border-white/10 p-3 sm:grid-cols-3">
                <button type="button" onClick={() => onTriggerHorrorSound('howl')} className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-[#22172b] px-2 text-xs font-semibold text-red-200 hover:bg-[#302035]"><Flame className="h-4 w-4" /> Sói hú</button>
                <button type="button" onClick={() => onTriggerHorrorSound('bell')} className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d4af37]/30 bg-[#22172b] px-2 text-xs font-semibold text-amber-200 hover:bg-[#302035]"><Bell className="h-4 w-4" /> Chuông</button>
                <button type="button" onClick={() => onTriggerHorrorSound('heartbeat')} className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-purple-500/30 bg-[#22172b] px-2 text-xs font-semibold text-purple-200 hover:bg-[#302035]"><HeartPulse className="h-4 w-4" /> Nhịp tim</button>
              </div>
            </details>
          </section>

          <section className={section} aria-labelledby="settings-room">
            <h3 id="settings-room" className={heading}>Phòng chơi</h3>
            <button type="button" onClick={() => { onResetLobby(); onClose(); }} className={row}><span className="flex items-center gap-3"><RotateCcw className="h-4 w-4 text-[#d4af37]" /> Đặt lại về sảnh chờ</span><span aria-hidden="true" className="text-slate-400">›</span></button>
            <button type="button" onClick={() => { onClose(); onReturnTitle(); }} className={`${row} border-red-500/25 text-red-200 hover:bg-red-950/40`}><span className="flex items-center gap-3"><LogOut className="h-4 w-4 text-red-400" /> Rời phòng</span><span aria-hidden="true" className="text-red-400">›</span></button>
          </section>
        </div>
        <footer className="shrink-0 border-t border-white/10 px-4 py-3 sm:px-5"><button type="button" onClick={onClose} className="min-h-11 w-full rounded-xl bg-[#9e1b24] px-4 text-sm font-semibold text-white hover:bg-[#b91c1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">Trở lại trò chơi</button></footer>
      </div>
    </div>
  );
};

import type { GamePhase } from './rules';

export function phaseNotice(phase: GamePhase, day: number, accusedName?: string, winReason?: string): string | null {
  switch (phase) {
    case 'lobby': return 'Đã về sảnh chờ. Hãy sẵn sàng cho ván mới.';
    case 'role_reveal': return 'Ván đấu bắt đầu. Hãy xem lá bài của bạn.';
    case 'night': return `Đêm ${day} bắt đầu. Bạn có 60 giây để thực hiện chức năng.`;
    case 'day_discussion':
    case 'day_voting': return `Ngày ${day}: thảo luận và bỏ phiếu trong 3 phút.`;
    case 'day_trial': return `${accusedName || 'Người bị đề cử'} lên giàn. Có 30 giây biện minh và biểu quyết.`;
    case 'ended': return winReason || 'Ván đấu đã kết thúc.';
    default: return null;
  }
}

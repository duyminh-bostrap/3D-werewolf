import { type NightChoice } from './nightAction';
import { isWolfPackRole, type PlayerState } from './rules';

export function nightFeedback(actor: PlayerState, choice: NightChoice, players: PlayerState[]): string {
  const target = players.find(p => p.id === choice.targetId);
  const name = target?.name ?? 'mục tiêu';
  if (choice.type === 'skip_night_role') return 'Bạn đã bỏ qua kỹ năng đêm này.';
  if (actor.role === 'seer') return `${name}: ${target && isWolfPackRole(target.role) ? 'Là Sói' : 'Không phải Sói'}.`;
  if (actor.role === 'aura_seer') return `${name}: ${target?.role === 'villager' ? 'Dân thường' : 'Có chức năng'}.`;
  if (choice.type === 'heal') return `Đã dùng thuốc cứu ${name} khỏi đòn tấn công của Sói đêm nay.`;
  if (choice.type === 'poison') return `Đã chọn ném độc ${name}. Kết quả được công bố khi trời sáng.`;
  if (actor.role === 'bodyguard') return `Đã bảo vệ ${name} trong đêm nay.`;
  if (actor.role === 'cupid') return `Đã ghép đôi ${choice.lovers?.map(id => players.find(p => p.id === id)?.name).join(' và ')}.`;
  if (actor.role === 'hunter') return `Đã chọn ${name} làm mục tiêu trả đũa nếu bạn chết.`;
  return `Đã xác nhận kỹ năng lên ${name}. Chờ kết quả khi trời sáng.`;
}

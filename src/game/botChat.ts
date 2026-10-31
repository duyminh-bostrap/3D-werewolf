import type { PlayerState } from './rules';

type PublicPlayer = Pick<PlayerState, 'id' | 'name' | 'isAlive' | 'isBot' | 'seatIndex'>;

export function botChatText(speaker: PublicPlayer, players: PublicPlayer[], votes: Record<string, string>, day: number, turn: number, accusedId?: string | null): string | null {
  if (!speaker.isBot || !speaker.isAlive) return null;
  if (accusedId) return accusedId === speaker.id ? 'Mình chưa thấy bằng chứng rõ ràng. Mọi người hãy xem lại phiếu bầu trước khi quyết định treo cổ mình.' : null;
  const others = players.filter((p) => p.isAlive && p.id !== speaker.id);
  if (!others.length) return null;
  const target = others.find((p) => p.id === votes[speaker.id]) ?? others[(speaker.seatIndex + turn) % others.length];
  const lost = players.filter((p) => !p.isAlive).at(-1);
  const lines = [
    `${target.name}, bạn nghĩ sao về những chuyện vừa xảy ra? Mình muốn nghe thêm trước khi chốt phiếu.`,
    `Đừng vội bỏ phiếu theo số đông. Hãy để ${target.name} giải thích trước.`,
    votes[speaker.id] && votes[speaker.id] !== 'skip'
      ? `Mình đang nghiêng về ${target.name}, nhưng vẫn muốn nghe lập luận của mọi người.`
      : `Ngày ${day} rồi, mọi người có thấy ai nói trước sau không nhất quán không?`,
    lost ? `Chúng ta đã mất ${lost.name}. Mình nghĩ nên đối chiếu lại những phiếu bầu trước đó.` : 'Chưa có ai ngã xuống. Mình muốn nghe từng người thay vì đoán vội.',
  ];
  return lines[turn % lines.length];
}

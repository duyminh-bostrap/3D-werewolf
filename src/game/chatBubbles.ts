import type { ChatMessage } from '../../server';
import type { GamePhase } from './rules';

export function visibleChatMessages(messages: ChatMessage[], phase: GamePhase, clearedThrough: number): ChatMessage[] {
  return messages.filter((message) => message.timestamp > clearedThrough && !((phase === 'lobby' || phase === 'ended') && message.channel === 'system'));
}

export function activeChatBubbles(messages: ChatMessage[], now: number): Map<string, ChatMessage> {
  const bubbles = new Map<string, ChatMessage>();
  for (const message of messages) {
    if (message.channel === 'system' || !message.text.trim() || now < message.timestamp || now - message.timestamp >= 8000) continue;
    const previous = bubbles.get(message.senderId);
    if (!previous || message.timestamp >= previous.timestamp) bubbles.set(message.senderId, message);
  }
  return bubbles;
}

export function speechLines(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const chunks = Array.from(word);
    if (line && Array.from(`${line} ${word}`).length > 24) {
      lines.push(line);
      line = '';
    }
    while (chunks.length > 24) {
      lines.push(chunks.splice(0, 24).join(''));
    }
    const tail = chunks.join('');
    line = line ? `${line} ${tail}` : tail;
  }
  if (line) lines.push(line);
  if (lines.length > 3) lines[2] = `${Array.from(lines[2]).slice(0, 23).join('')}…`;
  return lines.slice(0, 3);
}

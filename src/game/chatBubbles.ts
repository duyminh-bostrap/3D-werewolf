import type { ChatMessage } from '../../server';

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
  const characters = Array.from(text.replace(/\s+/g, ' ').trim());
  const lines: string[] = [];
  for (let offset = 0; offset < Math.min(characters.length, 72); offset += 24) {
    lines.push(characters.slice(offset, offset + 24).join(''));
  }
  if (characters.length > 72) lines[2] = `${lines[2].slice(0, -1)}…`;
  return lines;
}

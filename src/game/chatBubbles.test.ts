import test from 'node:test';
import assert from 'node:assert/strict';
import { activeChatBubbles, speechLines } from './chatBubbles';

test('chat bubbles show only the newest recent player message and expire after eight seconds', () => {
  const message = { id: '1', senderId: 'p1', senderName: 'Lan', text: 'Xin chào', channel: 'global' as const, timestamp: 10000 };
  const messages = [message, { ...message, id: '2', text: 'Tin mới', timestamp: 11000 }, { ...message, senderId: 'system', channel: 'system' as const }];
  assert.equal(activeChatBubbles(messages, 12000).get('p1')?.text, 'Tin mới');
  assert.equal(activeChatBubbles(messages, 12000).size, 1);
  assert.equal(activeChatBubbles(messages, 19000).size, 0);
  assert.equal(activeChatBubbles(messages, 9000).size, 0);
  assert.equal(speechLines('😀'.repeat(80)).length, 3);
  assert.ok(speechLines('a'.repeat(80))[2].endsWith('…'));
});

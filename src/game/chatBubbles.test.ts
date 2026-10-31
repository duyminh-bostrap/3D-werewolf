import test from 'node:test';
import assert from 'node:assert/strict';
import { activeChatBubbles, speechLines, visibleChatMessages } from './chatBubbles';

test('completed game system notices stay hidden; clearing chat is local and new messages still arrive', () => {
  const old = { id: 'old', senderId: 'p', senderName: 'Lan', text: 'Cũ', channel: 'global' as const, timestamp: 100 };
  const system = { ...old, id: 'system', channel: 'system' as const, timestamp: 110 };
  const fresh = { ...old, id: 'new', timestamp: 120 };
  const messages = [old, system, fresh];
  assert.deepEqual(visibleChatMessages(messages, 'lobby', 0).map((m) => m.id), ['old', 'new']);
  assert.deepEqual(visibleChatMessages(messages, 'ended', 0).map((m) => m.id), ['old', 'new']);
  assert.equal(visibleChatMessages(messages, 'night', 0).length, 3);
  assert.deepEqual(visibleChatMessages(messages, 'night', 110).map((m) => m.id), ['new']);
  assert.equal(messages.length, 3);
});

test('chat bubbles show only the newest recent player message and expire after eight seconds', () => {
  const message = { id: '1', senderId: 'p1', senderName: 'Lan', text: 'Xin chào', channel: 'global' as const, timestamp: 10000 };
  const messages = [message, { ...message, id: '2', text: 'Tin mới', timestamp: 11000 }, { ...message, senderId: 'system', channel: 'system' as const }];
  assert.equal(activeChatBubbles(messages, 12000).get('p1')?.text, 'Tin mới');
  assert.equal(activeChatBubbles(messages, 12000).size, 1);
  assert.equal(activeChatBubbles(messages, 19000).size, 0);
  assert.equal(activeChatBubbles(messages, 9000).size, 0);
  assert.equal(speechLines('😀'.repeat(80)).length, 3);
  assert.ok(speechLines('a'.repeat(80))[2].endsWith('…'));
  assert.deepEqual(speechLines('Tôi là Dân lành!'), ['Tôi là Dân lành!']);
  assert.deepEqual(speechLines('Một tin nhắn dài cần được xuống dòng theo từng từ'), ['Một tin nhắn dài cần', 'được xuống dòng theo', 'từng từ']);
});

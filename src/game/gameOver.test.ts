import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowGameOver } from './gameOver';

test('a reset lobby cannot show victory with reset round statistics', () => {
  assert.equal(shouldShowGameOver('gameover', 'lobby', 'ongoing'), false);
  assert.equal(shouldShowGameOver('gameover', 'ended', 'ongoing'), false);
  assert.equal(shouldShowGameOver('gameover', 'ended', 'villagers'), true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { phaseNotice } from './phaseNotice';

test('public phase notices include timers and accused name without revealing hidden roles', () => {
  assert.match(phaseNotice('night', 2)!, /Đêm 2.*60 giây/);
  assert.equal(phaseNotice('day_discussion', 2), phaseNotice('day_voting', 2));
  assert.match(phaseNotice('day_trial', 2, 'Lan')!, /Lan lên giàn.*30 giây/);
  assert.equal(phaseNotice('ended', 2, undefined, 'Dân Làng chiến thắng'), 'Dân Làng chiến thắng');
});

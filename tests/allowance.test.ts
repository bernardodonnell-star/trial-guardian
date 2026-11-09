/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { allowanceState, spendMessage, type Usage } from '../src/lib/allowance.ts';

test('monthly plan has 150 messages and warns at 80%', () => {
  assert.equal(allowanceState({ plan: 'monthly', usedThisMonth: 0, topUpRemaining: 0 }).remaining, 150);
  assert.equal(allowanceState({ plan: 'monthly', usedThisMonth: 119, topUpRemaining: 0 }).warn, false);
  assert.equal(allowanceState({ plan: 'monthly', usedThisMonth: 120, topUpRemaining: 0 }).warn, true);
});

test('super-user has 500', () => {
  assert.equal(allowanceState({ plan: 'super-user', usedThisMonth: 0, topUpRemaining: 0 }).total, 500);
});

test('monthly allowance is spent before top-up', () => {
  let u: Usage = { plan: 'annual', usedThisMonth: 149, topUpRemaining: 200 };
  u = spendMessage(u);
  assert.deepEqual([u.usedThisMonth, u.topUpRemaining], [150, 200]);
  u = spendMessage(u);
  assert.deepEqual([u.usedThisMonth, u.topUpRemaining], [150, 199]);
});

test('when everything is used, live search stops but the assistant still answers from checked data', () => {
  const s = allowanceState({ plan: 'monthly', usedThisMonth: 150, topUpRemaining: 0 });
  assert.equal(s.remaining, 0);
  assert.equal(s.liveSearch, false);
  assert.match(s.label, /brief and checked data only/);
});

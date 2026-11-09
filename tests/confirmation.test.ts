/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { confirmationLabel, decideConfirmation } from '../src/lib/confirmation.ts';
import { SOURCE_MAP } from '../src/lib/sources.ts';
import type { Report, Source } from '../src/lib/types.ts';

const r = (sourceId: string, at: string, extra: Partial<Report> = {}): Report => ({
  sourceId,
  url: `https://example.org/${sourceId}`,
  publishedAt: at,
  stance: 'reports',
  ...extra,
});

const awaiting = [SOURCE_MAP.get('ke-police')!, SOURCE_MAP.get('ke-interior')!];

test('news only stays Unconfirmed and lists independent outlets, latest first', () => {
  const c = decideConfirmation(
    [r('nation-ke', '2026-01-19T06:12:00+03:00'), r('bbc', '2026-01-19T06:15:00+03:00'), r('reuters', '2026-01-19T06:17:00+03:00')],
    SOURCE_MAP,
    awaiting,
  );
  assert.equal(c.status, 'unconfirmed');
  if (c.status !== 'unconfirmed') return;
  assert.deepEqual(c.outlets.map((o) => o.source.id), ['reuters', 'bbc', 'nation-ke']);
  assert.equal(c.awaiting.length, 2);
  assert.match(confirmationLabel(c), /accuracy not yet known · reported by 3 independent outlets/);
});

test('syndicated copies count as one outlet', () => {
  const c = decideConfirmation(
    [
      r('reuters', '2026-01-19T06:10:00+03:00'),
      r('bbc', '2026-01-19T06:14:00+03:00', { syndicatedFrom: 'reuters' }),
      r('dw', '2026-01-19T06:15:00+03:00', { syndicatedFrom: 'reuters' }),
    ],
    SOURCE_MAP,
  );
  assert.equal(c.status, 'unconfirmed');
  if (c.status !== 'unconfirmed') return;
  assert.equal(c.outlets.length, 1);
  assert.equal(c.outlets[0].source.id, 'reuters');
  assert.deepEqual(c.outlets[0].repeatedBy.map((s) => s.id), ['bbc', 'dw']);
  assert.equal(c.outlets[0].lastUpdate, '2026-01-19T06:15:00+03:00');
});

test('social media and unknown sources are never counted', () => {
  const social: Source = { id: 'x-post', name: 'A post', kind: 'social', tier: 0 };
  const map = new Map(SOURCE_MAP);
  map.set(social.id, social);
  const c = decideConfirmation([r('x-post', '2026-01-19T06:00:00+03:00'), r('not-in-registry', '2026-01-19T06:01:00+03:00')], map);
  assert.equal(c.status, 'unconfirmed');
  if (c.status !== 'unconfirmed') return;
  assert.equal(c.outlets.length, 0);
  assert.match(confirmationLabel(c), /no reports yet/);
});

test('only an official source confirms', () => {
  const c = decideConfirmation(
    [r('reuters', '2026-01-19T06:17:00+03:00'), r('ke-police', '2026-01-19T06:31:00+03:00', { stance: 'confirms' })],
    SOURCE_MAP,
  );
  assert.equal(c.status, 'confirmed');
  assert.equal(confirmationLabel(c), 'Confirmed by National Police Service (Kenya)');
});

test('a data service does not confirm on its own', () => {
  const c = decideConfirmation([r('usgs', '2026-01-19T05:48:00+03:00', { stance: 'confirms' })], SOURCE_MAP);
  assert.equal(c.status, 'unconfirmed');
});

test('the latest official statement wins', () => {
  const c = decideConfirmation(
    [
      r('ke-police', '2026-01-19T06:31:00+03:00', { stance: 'confirms' }),
      r('ke-interior', '2026-01-19T07:05:00+03:00', { stance: 'denies' }),
    ],
    SOURCE_MAP,
  );
  assert.equal(c.status, 'denied');
});

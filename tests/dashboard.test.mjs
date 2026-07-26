import assert from 'node:assert/strict'
import test from 'node:test'
import { rangeStart } from '../lib/dashboard.mjs'

test('calculates supported dashboard ranges', () => {
  const now = new Date('2026-07-25T12:00:00Z')
  assert.equal(rangeStart('24h', now), '2026-07-24T12:00:00.000Z')
  assert.equal(rangeStart('7d', now), '2026-07-18T12:00:00.000Z')
  assert.equal(rangeStart('30d', now), '2026-06-25T12:00:00.000Z')
})

test('rejects unsupported dashboard ranges', () => {
  assert.throws(() => rangeStart('all', new Date()), /Unsupported range/)
})

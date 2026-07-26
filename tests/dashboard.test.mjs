import assert from 'node:assert/strict'
import test from 'node:test'
import { parseMetricsCsv, rangeStart } from '../lib/dashboard.mjs'

test('calculates supported dashboard ranges', () => {
  const now = new Date('2026-07-25T12:00:00Z')
  assert.equal(rangeStart('24h', now), '2026-07-24T12:00:00.000Z')
  assert.equal(rangeStart('7d', now), '2026-07-18T12:00:00.000Z')
  assert.equal(rangeStart('30d', now), '2026-06-25T12:00:00.000Z')
})

test('rejects unsupported dashboard ranges', () => {
  assert.throws(() => rangeStart('all', new Date()), /Unsupported range/)
})

test('prepares valid metric rows for one organization', () => {
  const rows = parseMetricsCsv([
    'recorded_at,uptime,response_time,error_rate,transaction_volume,availability,incidents',
    '2026-07-26T09:00:00Z,99.9,240,0.2,1200,99.8,0',
  ].join('\n'), 'ac9d0d0a-0000-4000-8000-000000000001')

  assert.deepEqual(rows, [{
    organization_id: 'ac9d0d0a-0000-4000-8000-000000000001',
    recorded_at: '2026-07-26T09:00:00.000Z',
    uptime: 99.9,
    response_time: 240,
    error_rate: 0.2,
    transaction_volume: 1200,
    availability: 99.8,
    incidents: 0,
  }])
})

test('rejects a reordered header before preparing any rows', () => {
  assert.throws(
    () => parseMetricsCsv('uptime,recorded_at,response_time,error_rate,transaction_volume,availability,incidents\n99,2026-07-26T09:00:00Z,1,1,1,99,0', 'org-1'),
    /header/i,
  )
})

test('rejects an invalid metric with its CSV row number', () => {
  assert.throws(
    () => parseMetricsCsv('recorded_at,uptime,response_time,error_rate,transaction_volume,availability,incidents\n2026-07-26T09:00:00Z,101,1,1,1,99,0', 'org-1'),
    /row 2.*uptime/i,
  )
})

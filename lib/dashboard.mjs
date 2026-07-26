export function rangeStart(range, now) {
  const hours = { '24h': 24, '7d': 168, '30d': 720 }[range]
  if (!hours) throw new Error('Unsupported range')
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString()
}

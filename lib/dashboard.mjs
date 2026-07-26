export function rangeStart(range, now) {
  const hours = { '24h': 24, '7d': 168, '30d': 720 }[range]
  if (!hours) throw new Error('Unsupported range')
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString()
}

const metricHeaders = ['recorded_at', 'uptime', 'response_time', 'error_rate', 'transaction_volume', 'availability', 'incidents']

function csvRows(text) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false
  const csv = String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index]
    if (character === '"') {
      if (quoted && csv[index + 1] === '"') {
        value += '"'
        index += 1
      } else quoted = !quoted
    } else if (character === ',' && !quoted) {
      row.push(value)
      value = ''
    } else if (character === '\n' && !quoted) {
      row.push(value)
      rows.push(row)
      row = []
      value = ''
    } else value += character
  }

  if (quoted) throw new Error('CSV contains an unclosed quoted value.')
  if (value || row.length) rows.push([...row, value])
  return rows
}

function invalid(rowNumber, field) {
  throw new Error(`CSV row ${rowNumber} has an invalid ${field}.`)
}

function numberValue(value, rowNumber, field, valid) {
  const number = Number(value)
  if (value === '' || !Number.isFinite(number) || !valid(number)) invalid(rowNumber, field)
  return number
}

export function parseMetricsCsv(text, organizationId) {
  const [header, ...records] = csvRows(text)
  if (!header || header.map((value) => value.trim()).join(',') !== metricHeaders.join(',')) throw new Error('CSV header does not match the required metric columns.')

  const rows = []
  for (let index = 0; index < records.length; index += 1) {
    const values = records[index].map((value) => value.trim())
    if (values.every((value) => !value)) continue
    const rowNumber = index + 2
    if (values.length !== metricHeaders.length) invalid(rowNumber, 'number of fields')
    const date = new Date(values[0])
    if (!values[0] || Number.isNaN(date.getTime())) invalid(rowNumber, 'recorded_at')
    const uptime = numberValue(values[1], rowNumber, 'uptime', (number) => number >= 0 && number <= 100)
    const responseTime = numberValue(values[2], rowNumber, 'response_time', (number) => number >= 0)
    const errorRate = numberValue(values[3], rowNumber, 'error_rate', (number) => number >= 0 && number <= 100)
    const transactionVolume = numberValue(values[4], rowNumber, 'transaction_volume', (number) => number >= 0)
    const availability = numberValue(values[5], rowNumber, 'availability', (number) => number >= 0 && number <= 100)
    const incidents = numberValue(values[6], rowNumber, 'incidents', (number) => number >= 0 && Number.isInteger(number))
    rows.push({ organization_id: organizationId, recorded_at: date.toISOString(), uptime, response_time: responseTime, error_rate: errorRate, transaction_volume: transactionVolume, availability, incidents })
  }

  if (!rows.length) throw new Error('The CSV contains no metric rows.')
  return rows
}

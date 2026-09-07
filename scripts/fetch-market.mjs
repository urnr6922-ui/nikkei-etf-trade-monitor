import { mkdir, writeFile } from 'node:fs/promises'

const symbols = {
  '1570': '1570.T',
  '1360': '1360.T',
  NIKKEI225: '^N225',
  '1306': '1306.T',
  '1321': '1321.T',
  '1671': '1671.T',
  '1542': '1542.T',
  '2558': '2558.T',
  '2631': '2631.T',
  '2840': '2840.T',
  '7203': '7203.T',
  '6758': '6758.T',
  '9984': '9984.T',
  '8306': '8306.T',
  '9432': '9432.T',
  '6501': '6501.T',
  '8035': '8035.T',
  '6861': '6861.T',
  '8058': '8058.T',
  '5401': '5401.T',
  '2914': '2914.T',
  '4502': '4502.T',
  '6098': '6098.T',
  '7011': '7011.T',
  '4755': '4755.T',
  '8848': '8848.T'
}
const globalSymbols = { DOW: '^DJI', SP500: '^GSPC', NASDAQ: '^IXIC', SOX: '^SOX', USDJPY: 'JPY=X', US10Y: '^TNX', WTI: 'CL=F', NIKKEIF: 'NKD=F' }

async function fetchChart(symbol, range, interval) {
  const params = new URLSearchParams({ range, interval, events: 'history' })
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params}`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params}`,
  ]
  let lastError
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const result = json?.chart?.result?.[0]
      if (!result?.timestamp?.length) throw new Error('no timestamp data')
      const q = result.indicators?.quote?.[0]
      const data = result.timestamp.map((time, i) => ({
        time,
        open: Number(q.open?.[i]),
        high: Number(q.high?.[i]),
        low: Number(q.low?.[i]),
        close: Number(q.close?.[i]),
        volume: Number(q.volume?.[i] ?? 0)
      }))
        // Yahoo may return placeholder zero-bars for holidays/missing observations.
        // Exclude them so daily indicators and chart scaling are based only on real prices.
        .filter(x => [x.open, x.high, x.low, x.close].every(Number.isFinite) && x.open > 0 && x.high > 0 && x.low > 0 && x.close > 0 && x.high >= x.low)
        .sort((a, b) => a.time - b.time)
      return { symbol, fetchedAt: new Date().toISOString(), data }
    } catch (e) { lastError = e }
  }
  throw lastError ?? new Error('market fetch failed')
}

await mkdir('public/market-data', { recursive: true })
for (const [code, symbol] of Object.entries(symbols)) {
  try {
    const intraday = await fetchChart(symbol, '7d', '1m')
    await writeFile(`public/market-data/${code}.json`, JSON.stringify(intraday))
    const daily = await fetchChart(symbol, '1y', '1d')
    await writeFile(`public/market-data/${code}-daily.json`, JSON.stringify(daily))
    console.log(`${code}: intraday=${intraday.data.length}, daily=${daily.data.length}`)
  } catch (e) {
    console.warn(`${code}: unavailable (${e.message})`)
  }
}

const globalData = {}
for (const [code, symbol] of Object.entries(globalSymbols)) {
  try {
    const daily = await fetchChart(symbol, '10d', '1d')
    globalData[code] = { symbol, fetchedAt: daily.fetchedAt, data: daily.data.slice(-10) }
    console.log(`${code}: ${daily.data.length}`)
  } catch (e) {
    console.warn(`${code}: unavailable (${e.message})`)
  }
}
await writeFile('public/market-data/global.json', JSON.stringify({ fetchedAt: new Date().toISOString(), data: globalData }))
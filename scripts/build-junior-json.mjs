import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const outDir = 'public/market-data'
const codes = ['1570', 'NIKKEI225', '1360']
const names = {
  '1570': '日経レバ',
  NIKKEI225: '日経平均',
  '1360': '日経平均ベア2倍'
}

const read = async code => JSON.parse(await readFile(join(outDir, `${code}.json`), 'utf8'))
const clean = raw => (Array.isArray(raw?.data) ? raw.data : [])
  .map(x => ({
    time: Number(x.time), open: Number(x.open), high: Number(x.high),
    low: Number(x.low), close: Number(x.close), volume: Number(x.volume) || 0
  }))
  .filter(x => [x.time, x.open, x.high, x.low, x.close].every(Number.isFinite) && x.high >= x.low && x.close > 0)

const sma = (v, n) => v.map((_, i) => i < n - 1 ? null : v.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n)
const ema = (v, n) => { if (!v.length) return []; const k = 2 / (n + 1); let p = v[0]; return v.map((x, i) => { if (i) p = x * k + p * (1 - k); return p }) }
const rsi = (v, n = 14) => v.map((_, i) => { if (i < n) return null; let g = 0, l = 0; for (let j = i - n + 1; j <= i; j++) { const d = v[j] - v[j - 1]; d >= 0 ? g += d : l -= d } return l === 0 ? 100 : 100 - 100 / (1 + g / l) })
const bands = (v, n = 20) => v.map((_, i) => { if (i < n - 1) return null; const a = v.slice(i - n + 1, i + 1), m = a.reduce((s, x) => s + x, 0) / n, sd = Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / n); return { upper: m + 2 * sd, lower: m - 2 * sd } })
const aggregate5 = a => { const groups = new Map(); for (const x of a) { const b = Math.floor(x.time / 300) * 300; const g = groups.get(b) || []; g.push(x); groups.set(b, g) } return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([time, g]) => ({ time, open: g[0].open, high: Math.max(...g.map(x => x.high)), low: Math.min(...g.map(x => x.low)), close: g.at(-1).close, volume: g.reduce((s, x) => s + x.volume, 0) })) }

const result = { generatedAt: new Date().toISOString(), source: 'public market data used by Nikkei ETF Trade Monitor', assets: {} }
for (const code of codes) {
  const raw = await read(code)
  const a = aggregate5(clean(raw)).slice(-120)
  const close = a.map(x => x.close)
  const S = sma(close, 20), E = ema(close, 20), R = rsi(close), B = bands(close, 20)
  const fast = ema(close, 12), slow = ema(close, 26), macd = close.map((_, i) => fast[i] - slow[i]), signal = ema(macd, 9)
  const last = a.at(-1), prev = a.at(-2)
  const score = (last?.close > S.at(-1) ? 1 : -1) + (last?.close > E.at(-1) ? 1 : -1) + (macd.at(-1) > signal.at(-1) ? 1 : -1) + (R.at(-1) < 70 ? 1 : -1) + (B.at(-1) && last.close >= (B.at(-1).upper + B.at(-1).lower) / 2 ? 1 : -1)
  result.assets[code] = {
    code, name: names[code], fetchedAt: raw.fetchedAt || null,
    price: last?.close ?? null,
    changePct: prev?.close ? (last.close / prev.close - 1) * 100 : null,
    technical: { sma20: S.at(-1), ema20: E.at(-1), rsi14: R.at(-1), macd: macd.at(-1), macdSignal: signal.at(-1), bollinger: B.at(-1) },
    judgment: score >= 3 ? '上向き / 買い優勢' : score <= -3 ? '下向き / 売り優勢' : '中立 / 様子見',
    buyPriorityPct: Math.max(10, Math.min(90, Math.round(50 + score * 9))),
    sellPriorityPct: 100 - Math.max(10, Math.min(90, Math.round(50 + score * 9)))
  }
}
await writeFile(join(outDir, 'junior.json'), JSON.stringify(result, null, 2))
console.log('Built public/market-data/junior.json')

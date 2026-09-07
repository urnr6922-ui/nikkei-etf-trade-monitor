import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

// Yahoo intraday feeds can contain malformed/zero bars. Remove them before aggregation
// so 5/15-minute candles cannot be distorted by a single bad observation.
s = s.replace(
  "const liveRows=useMemo(()=>{if(tf==='日足')return dailyMarket;if(!market?.length)return null;return tf==='1分足'?market:tf==='5分足'?aggregateBars(market,5):aggregateBars(market,15)},[market,dailyMarket,tf])",
  "const liveRows=useMemo(()=>{if(tf==='日足')return dailyMarket;if(!market?.length)return null;const clean=market.filter(r=>Number.isFinite(r?.time)&&Number.isFinite(r?.open)&&Number.isFinite(r?.high)&&Number.isFinite(r?.low)&&Number.isFinite(r?.close)&&r.high>=Math.max(r.open,r.close)&&r.low<=Math.min(r.open,r.close)&&r.close>0).sort((a,b)=>a.time-b.time);const unique=[];for(const r of clean){const last=unique[unique.length-1];if(last&&last.time===r.time)unique[unique.length-1]=r;else unique.push(r)}return tf==='1分足'?unique:tf==='5分足'?aggregateBars(unique,5):aggregateBars(unique,15)},[market,dailyMarket,tf])"
)

// Use the requested one-decimal display for the 1360 ETF; keep other prices compact.
s = s.replace(
  "{Math.round(displayCurrent.price).toLocaleString()}<small>円</small>",
  "{activeSymbol==='1360'?Number(displayCurrent.price).toLocaleString('ja-JP',{minimumFractionDigits:1,maximumFractionDigits:1}):Math.round(displayCurrent.price).toLocaleString('ja-JP')}<small>円</small>"
)
s = s.replace(
  "{Math.round(quoteFor(code).price).toLocaleString()}円",
  "{code==='1360'?Number(quoteFor(code).price).toLocaleString('ja-JP',{minimumFractionDigits:1,maximumFractionDigits:1}):Math.round(quoteFor(code).price).toLocaleString('ja-JP')}円"
)

// Make the SVG scaling safe even if a feed briefly has a flat/degenerate range.
s = s.replace(
  "const max=Math.max(...data.map(x=>x.high)),min=Math.min(...data.map(x=>x.low))",
  "const rawMax=Math.max(...data.map(x=>x.high)),rawMin=Math.min(...data.map(x=>x.low));const pad=Math.max((rawMax-rawMin)*0.03,activeSymbol==='1360'?0.5:1);const max=rawMax+pad,min=rawMin-pad"
)

await writeFile(path, s)
console.log('fixed 5/15-minute candle aggregation, chart scaling, and 1360 one-decimal price display')

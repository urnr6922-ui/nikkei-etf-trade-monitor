import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

// Normalize every market-data path before indicators consume it. This prevents
// malformed/duplicate candles from producing NaN/undefined chart state.
const oldLiveRows = "const liveRows=useMemo(()=>{if(tf==='日足')return dailyMarket;if(!market?.length)return null;return tf==='1分足'?market:tf==='5分足'?aggregateBars(market,5):aggregateBars(market,15)},[market,dailyMarket,tf])"
const newLiveRows = "const normalizeRows=rows=>Array.isArray(rows)?rows.filter(r=>Number.isFinite(r?.time)&&Number.isFinite(r?.open)&&Number.isFinite(r?.high)&&Number.isFinite(r?.low)&&Number.isFinite(r?.close)&&r.open>0&&r.high>0&&r.low>0&&r.close>0&&r.high>=Math.max(r.open,r.close)&&r.low<=Math.min(r.open,r.close)).sort((a,b)=>a.time-b.time):[]\n  const liveRows=useMemo(()=>{const rows=tf==='日足'?dailyMarket:market;if(!rows?.length)return null;const clean=normalizeRows(rows);if(tf==='日足'||tf==='1分足')return clean;return aggregateBars(clean,tf==='5分足'?5:15)},[market,dailyMarket,tf])"
if (s.includes(oldLiveRows)) s = s.replace(oldLiveRows, newLiveRows)

// Never let a missing previous candle break the percentage calculation.
s = s.replace("const j=Ie[Ie.length-1],Ge=Ie[Ie.length-2],Ke=(j.close/Ge.close-1)*100", "const j=Ie[Ie.length-1],Ge=Ie[Ie.length-2],Ke=Ge&&Number.isFinite(Ge.close)&&Ge.close!==0?(j.close/Ge.close-1)*100:0")

// Keep the required pair as the safe fallback.
s = s.replace("if(activeSymbol===code)setSymbol('NIKKEI225')", "if(activeSymbol===code)setSymbol('1570')")

await writeFile(path, s)
console.log('Runtime stability patch applied: normalized candles and guarded percentage calculations')

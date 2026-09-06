import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

s = s.replace("  '1357': { name: '日経平均ベア2倍', subtitle: '日経平均ダブルインバース・インデックス連動型', price: 69.4, change: -1.9, type: 'etf' },", "  '1360': { name: '日経平均ベア2倍', subtitle: '日経平均ベア2倍上場投信', price: 69.4, change: -1.9, type: 'etf' },")

const needle = "const TF = ['1分足', '5分足', '15分足', '日足']\n"
const insert = `
function aggregateBars(rows, minutes) {
  if (minutes === 1) return rows
  const bucket = minutes * 60
  const out = []
  let cur = null
  for (const r of rows) {
    const key = Math.floor(r.time / bucket) * bucket
    if (!cur || cur.time !== key) { cur = { time:key, open:r.open, high:r.high, low:r.low, close:r.close, volume:r.volume||0 }; out.push(cur) }
    else { cur.high=Math.max(cur.high,r.high); cur.low=Math.min(cur.low,r.low); cur.close=r.close; cur.volume+=(r.volume||0) }
  }
  return out
}
function dailyBars(rows) {
  const out=[]; let cur=null
  for (const r of rows) {
    const d=new Date(r.time*1000).toISOString().slice(0,10)
    if(!cur||cur.date!==d){cur={date:d,time:r.time,open:r.open,high:r.high,low:r.low,close:r.close,volume:r.volume||0};out.push(cur)}
    else{cur.high=Math.max(cur.high,r.high);cur.low=Math.min(cur.low,r.low);cur.close=r.close;cur.volume+=(r.volume||0)}
  }
  return out
}
async function loadMarket(symbol) {
  try { const res=await fetch(\`./market-data/\${symbol}.json?ts=\${Date.now()}\`,{cache:'no-store'}); if(!res.ok) throw new Error(); const p=await res.json(); return Array.isArray(p?.data)?Object.assign(p.data,{fetchedAt:p.fetchedAt||null}):null } catch { return null }
}
`
if (!s.includes('function aggregateBars')) s = s.replace(needle, needle + insert)

const indicatorNeedle = "  const [indicators,setIndicators]=useState({sma:true,ema:true,rsi:true,macd:true,bb:true})"
if (!s.includes('const [market,setMarket]')) {
  s = s.replace(indicatorNeedle, indicatorNeedle + "\n  const [market,setMarket]=useState(null)\n  const [marketMap,setMarketMap]=useState({})")
}

const activeNeedle = "  const activeSymbol=assets[symbol]?symbol:'NIKKEI225'"
const activeEffect = "  useEffect(()=>{let alive=true;const refresh=()=>loadMarket(activeSymbol).then(x=>{if(alive)setMarket(x)});refresh();const timer=setInterval(refresh,600000);return()=>{alive=false;clearInterval(timer)}},[activeSymbol,tf])"
if (!s.includes('const refresh=()=>loadMarket(activeSymbol)')) {
  s = s.replace(activeNeedle, activeNeedle + "\n" + activeEffect)
}
if (!s.includes('const refreshAll=()=>')) {
  const old = activeNeedle + "\n" + activeEffect
  const add = "\n  useEffect(()=>{let alive=true;const codes=Object.keys(assets).filter(c=>['1570','1360','NIKKEI225'].includes(c));const refreshAll=()=>Promise.all(codes.map(async c=>[c,await loadMarket(c)])).then(entries=>{if(!alive)return;const next={};for(const [c,rows] of entries)if(rows?.length)next[c]=rows;setMarketMap(next)});refreshAll();const timer=setInterval(refreshAll,600000);return()=>{alive=false;clearInterval(timer)}},[assets])"
  s = s.replace(old, old + add)
}

s = s.replace("  const data=useMemo(()=>seededCandles(activeSymbol,tf),[activeSymbol,tf])", "  const liveRows=useMemo(()=>{if(!market?.length)return null;if(tf==='1分足')return market;if(tf==='5分足')return aggregateBars(market,5);if(tf==='15分足')return aggregateBars(market,15);return dailyBars(market)},[market,tf])\n  const minBars=tf==='日足'?2:20\n  const data=liveRows?.length>=minBars?liveRows.slice(-120):seededCandles(activeSymbol,tf)\n  const isLive=Boolean(liveRows?.length>=minBars)\n  const quoteFor=code=>{const rows=marketMap[code],last=rows?.[rows.length-1],prev=rows?.[rows.length-2];if(!last||!Number.isFinite(last.close))return assets[code];const change=prev&&Number.isFinite(prev.close)?last.close-prev.close:0;return {...assets[code],price:last.close,change}}")
s = s.replace("  const closes=data.map(x=>x.close),sma20=sma(closes,20),ema20=ema(closes,20),rs=rsi(closes),bb=bollinger(closes),mc=macd(closes)", "  const closes=data.map(x=>x.close),sma20=sma(closes,20),ema20=ema(closes,20),rs=rsi(closes),bb=bollinger(closes),mc=macd(closes)\n  const liveLast=isLive?data[data.length-1]:null, livePrev=isLive?data[data.length-2]:null\n  const displayCurrent={...current,price:liveLast?.close??current.price,change:liveLast&&livePrev&&Number.isFinite(liveLast.close)&&Number.isFinite(livePrev.close)?liveLast.close-livePrev.close:current.change}")
s = s.replace("  const last=data[data.length-1],prev=data[data.length-2],pct=(last.close/prev.close-1)*100", "  const last=data[data.length-1],prev=data[data.length-2],pct=prev&&Number.isFinite(prev.close)&&prev.close!==0&&Number.isFinite(last.close)?(last.close/prev.close-1)*100:0")
s = s.replace("{Object.entries(assets).map(([code,a])=>", "{Object.entries(assets).map(([code,a])=>{const q=quoteFor(code);return ")
s = s.replace("</button>)}<button className=\"ticker\"", "</button>})}<button className=\"ticker\"")
s = s.replace("a.price.toLocaleString()", "q.price.toLocaleString()")
s = s.replace("a.change>=0?'up':'down'", "q.change>=0?'up':'down'")
s = s.replace("a.change>=0?'▲':'▼'} {Math.abs(a.change)}円", "q.change>=0?'▲':'▼'} {Math.abs(q.change).toLocaleString(undefined,{maximumFractionDigits:2})}円")
s = s.replace("{current.subtitle}", "{displayCurrent.subtitle}")
s = s.replace("{Math.round(last.close).toLocaleString()}", "{Math.round(displayCurrent.price).toLocaleString()}")
s = s.replace(' · {tf} · デモデータ', " · {tf} · {isLive?'実データ':'データ取得待ち'}{isLive&&market?.fetchedAt?` · 取得 ${new Date(market.fetchedAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}`:''}")
s = s.replace("hint={activeSymbol==='NIKKEI225'?'参考値':'デモ値'}", "hint={isLive?'実データ':'取得待ち'}")
s = s.replace('市場データは現在デモデータです。', "{isLive?'取得した市場データを表示しています。':'市場データを取得できない場合はデモ表示に切り替わります。'}")
s = s.replace('<strong>デモデータ</strong>です。実運用では利用許諾を満たした市場データ提供元との接続が必要です。', "<strong>{isLive?'取得した市場データ':'データ取得待ち（フォールバックはデモ）'}</strong>です。データ提供元の利用条件に従って使用してください。")

await writeFile(path, s)
console.log('market-data connection patch applied')
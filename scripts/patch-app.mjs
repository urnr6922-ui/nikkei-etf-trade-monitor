import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

s = s.replace("  '1360': { name: '日経平均ベア2倍', subtitle: '日経平均ベア2倍上場投信', price: 69.4, change: -1.9, type: 'etf' },", "  '1357': { name: '日経平均ベア2倍', subtitle: '日経平均ダブルインバース・インデックス連動型', price: 69.4, change: -1.9, type: 'etf' },")

const needle = "const TF = ['1分足', '5分足', '15分足', '日足']\n"
const insert = `\nfunction aggregateBars(rows, minutes) {\n  if (minutes === 1) return rows\n  const bucket = minutes * 60\n  const out = []\n  let cur = null\n  for (const r of rows) {\n    const key = Math.floor(r.time / bucket) * bucket\n    if (!cur || cur.time !== key) { cur = { time:key, open:r.open, high:r.high, low:r.low, close:r.close, volume:r.volume||0 }; out.push(cur) }\n    else { cur.high=Math.max(cur.high,r.high); cur.low=Math.min(cur.low,r.low); cur.close=r.close; cur.volume+=(r.volume||0) }\n  }\n  return out\n}\nfunction dailyBars(rows) {\n  const out=[]; let cur=null\n  for (const r of rows) {\n    const d=new Date(r.time*1000).toISOString().slice(0,10)\n    if(!cur||cur.date!==d){cur={date:d,time:r.time,open:r.open,high:r.high,low:r.low,close:r.close,volume:r.volume||0};out.push(cur)}\n    else{cur.high=Math.max(cur.high,r.high);cur.low=Math.min(cur.low,r.low);cur.close=r.close;cur.volume+=(r.volume||0)}\n  }\n  return out\n}\nasync function loadMarket(symbol) {\n  try { const res=await fetch(\`./market-data/\${symbol}.json?ts=\${Date.now()}\`,{cache:'no-store'}); if(!res.ok) throw new Error(); const p=await res.json(); return Array.isArray(p?.data)?p:null } catch { return null }\n}\n`
if (!s.includes('function aggregateBars')) s = s.replace(needle, needle + insert)

const indicatorNeedle = "  const [indicators,setIndicators]=useState({sma:true,ema:true,rsi:true,macd:true,bb:true})"
if (!s.includes('const [market,setMarket]')) {
  s = s.replace(indicatorNeedle, indicatorNeedle + "\n  const [market,setMarket]=useState(null)\n  useEffect(()=>{let alive=true;loadMarket(symbol).then(x=>{if(alive)setMarket(x)});return()=>{alive=false}},[symbol,tf])")
}

s = s.replace("  const data=useMemo(()=>seededCandles(activeSymbol,tf),[activeSymbol,tf])", "  const liveRows=useMemo(()=>{if(!market?.data?.length)return null;if(tf==='1分足')return market.data;if(tf==='5分足')return aggregateBars(market.data,5);if(tf==='15分足')return aggregateBars(market.data,15);return dailyBars(market.data)},[market,tf])\n  const data=liveRows?.length>=20?liveRows.slice(-120):seededCandles(activeSymbol,tf)\n  const isLive=Boolean(liveRows?.length>=20)")
s = s.replace(' · {tf} · デモデータ', " · {tf} · {isLive?'実データ':'データ取得待ち'}")
s = s.replace("hint={activeSymbol==='NIKKEI225'?'参考値':'デモ値'}", "hint={isLive?'実データ':'取得待ち'}")
s = s.replace('市場データは現在デモデータです。', "{isLive?'市場データを取得しています。':'市場データを取得できない場合はデモ表示に切り替わります。'}")
s = s.replace('<strong>デモデータ</strong>です。実運用では利用許諾を満たした市場データ提供元との接続が必要です。', "<strong>{isLive?'取得した市場データ':'データ取得待ち（フォールバックはデモ）'}</strong>です。データ提供元の利用条件に従って使用してください。")

await writeFile(path, s)
console.log('market-data connection patch applied')

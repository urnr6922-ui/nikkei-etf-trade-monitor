import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

const tfNeedle = "const TF = ['1分足', '5分足', '15分足', '日足']\n"
const helpers = "function aggregateBars(rows, minutes) {\n  if (minutes === 1) return rows\n  const bucket = minutes * 60, out = []\n  let cur = null\n  for (const r of rows) {\n    const key = Math.floor(r.time / bucket) * bucket\n    if (!cur || cur.time !== key) { cur = {time:key,open:r.open,high:r.high,low:r.low,close:r.close,volume:r.volume||0}; out.push(cur) }\n    else { cur.high=Math.max(cur.high,r.high); cur.low=Math.min(cur.low,r.low); cur.close=r.close; cur.volume+=(r.volume||0) }\n  }\n  return out\n}\nasync function loadMarket(symbol, daily=false) {\n  try {\n    const file = daily ? symbol + '-daily.json' : symbol + '.json'\n    const res = await fetch('./market-data/' + file + '?ts=' + Date.now(), {cache:'no-store'})\n    if (!res.ok) throw new Error()\n    const p = await res.json()\n    if (!Array.isArray(p?.data)) return null\n    const rows = p.data\n    rows.fetchedAt = p.fetchedAt || null\n    return rows\n  } catch { return null }\n}\n"
if (!s.includes('function aggregateBars')) s = s.replace(tfNeedle, tfNeedle + helpers)

const indicatorNeedle = "  const [indicators,setIndicators]=useState({sma:true,ema:true,rsi:true,macd:true,bb:true})"
if (!s.includes('const [market,setMarket]')) s = s.replace(indicatorNeedle, indicatorNeedle + "\n  const [market,setMarket]=useState(null)\n  const [marketMap,setMarketMap]=useState({})\n  const [dailyMarket,setDailyMarket]=useState(null)")

const activeNeedle = "  const activeSymbol=assets[symbol]?symbol:'NIKKEI225'"
const effect = "\n  useEffect(()=>{let alive=true;const refresh=()=>loadMarket(activeSymbol,tf==='日足').then(x=>{if(alive){if(tf==='日足')setDailyMarket(x);else setMarket(x)}});refresh();const timer=setInterval(refresh,600000);return()=>{alive=false;clearInterval(timer)}},[activeSymbol,tf])"
if (!s.includes("loadMarket(activeSymbol,tf==='日足')")) s = s.replace(activeNeedle, activeNeedle + effect)
if (!s.includes('const refreshAll=')) s = s.replace(effect, effect + "\n  useEffect(()=>{let alive=true;const codes=['1570','1360','NIKKEI225'];const refreshAll=()=>Promise.all(codes.map(async c=>[c,await loadMarket(c,false)])).then(entries=>{if(!alive)return;const next={};for(const [c,rows] of entries)if(rows?.length)next[c]=rows;setMarketMap(next)});refreshAll();const timer=setInterval(refreshAll,600000);return()=>{alive=false;clearInterval(timer)}},[])" )

s = s.replace("  const data=useMemo(()=>seededCandles(activeSymbol,tf),[activeSymbol,tf])", "  const liveRows=useMemo(()=>{if(tf==='日足')return dailyMarket;if(!market?.length)return null;return tf==='1分足'?market:tf==='5分足'?aggregateBars(market,5):aggregateBars(market,15)},[market,dailyMarket,tf])\n  const minBars=20\n  const data=liveRows?.length>=minBars?liveRows.slice(-120):seededCandles(activeSymbol,tf)\n  const isLive=Boolean(liveRows?.length>=minBars)\n  const quoteFor=code=>{const rows=marketMap[code],last=rows?.[rows.length-1],prev=rows?.[rows.length-2];if(!last||!Number.isFinite(last.close))return assets[code];return {...assets[code],price:last.close,change:prev&&Number.isFinite(prev.close)?last.close-prev.close:0}}")
s = s.replace("  const closes=data.map(x=>x.close),sma20=sma(closes,20),ema20=ema(closes,20),rs=rsi(closes),bb=bollinger(closes),mc=macd(closes)", "  const closes=data.map(x=>x.close),sma20=sma(closes,20),ema20=ema(closes,20),rs=rsi(closes),bb=bollinger(closes),mc=macd(closes)\n  const liveLast=isLive?data[data.length-1]:null,livePrev=isLive?data[data.length-2]:null\n  const displayCurrent={...current,price:liveLast?.close??current.price,change:liveLast&&livePrev&&Number.isFinite(liveLast.close)&&Number.isFinite(livePrev.close)?liveLast.close-livePrev.close:current.change}")
s = s.replace("  const last=data[data.length-1],prev=data[data.length-2],pct=(last.close/prev.close-1)*100", "  const last=data[data.length-1],prev=data[data.length-2],pct=prev&&Number.isFinite(prev.close)&&prev.close!==0&&Number.isFinite(last.close)?(last.close/prev.close-1)*100:0")

const oldScore = "  const score=(last.close>s?1:-1)+(last.close>e?1:-1)+(ml>ms?1:-1)+(r<70?1:-1)\n  const direction=score>=3?'上向き':score<=-3?'下向き':'中立'"
const newScore = "  const bbLast=bb[bb.length-1]\n  const score=(last.close>s?1:-1)+(last.close>e?1:-1)+(ml>ms?1:-1)+(r>=55?1:r<=45?-1:0)+(bbLast?(last.close>bbLast.upper?-1:last.close<bbLast.lower?1:last.close>=(bbLast.upper+bbLast.lower)/2?1:-1):0)\n  const direction=score>=3?'上向き':score<=-3?'下向き':'中立'"
s = s.replace(oldScore,newScore)

s = s.replace("{Object.entries(assets).map(([code,a])=>", "{Object.entries(assets).map(([code,a])=>{const q=quoteFor(code);return ")
s = s.replace("</button>)}<button className=\"ticker\"", "</button>})}<button className=\"ticker\"")
s = s.replace("a.price.toLocaleString()", "q.price.toLocaleString()")
s = s.replace("a.change>=0?'up':'down'", "q.change>=0?'up':'down'")
s = s.replace("a.change>=0?'▲':'▼'} {Math.abs(a.change)}円", "q.change>=0?'▲':'▼'} {Math.abs(q.change).toLocaleString(undefined,{maximumFractionDigits:2})}円")
s = s.replace("{current.subtitle}", "{displayCurrent.subtitle}")
s = s.replace("{Math.round(last.close).toLocaleString()}", "{Math.round(displayCurrent.price).toLocaleString()}")
s = s.replace(' · {tf} · デモデータ', " · {tf} · {isLive?'実データ':'データ取得待ち'}")
s = s.replace("hint={activeSymbol==='NIKKEI225'?'参考値':'デモ値'}", "hint={isLive?'実データ':'取得待ち'}")
s = s.replace('市場データは現在デモデータです。', "{isLive?'取得した市場データを表示しています。':'市場データを取得できない場合はデモ表示に切り替わります。'}")
s = s.replace('<strong>デモデータ</strong>です。実運用では利用許諾を満たした市場データ提供元との接続が必要です。', "<strong>{isLive?'取得した市場データ':'データ取得待ち（フォールバックはデモ）'}</strong>です。データ提供元の利用条件に従って使用してください。")

await writeFile(path, s)
console.log('latest market/daily/technical patch applied')
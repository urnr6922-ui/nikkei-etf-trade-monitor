import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

const tfNeedle = "const TF = ['1分足', '5分足', '15分足', '日足']\n"
const helpers = "function aggregateBars(rows, minutes) {\n  if (minutes === 1) return rows\n  const bucket = minutes * 60, out = []\n  let cur = null\n  for (const r of rows) {\n    const key = Math.floor(r.time / bucket) * bucket\n    if (!cur || cur.time !== key) { cur = {time:key,open:r.open,high:r.high,low:r.low,close:r.close,volume:r.volume||0}; out.push(cur) }\n    else { cur.high=Math.max(cur.high,r.high); cur.low=Math.min(cur.low,r.low); cur.close=r.close; cur.volume+=(r.volume||0) }\n  }\n  return out\n}\nasync function loadMarket(symbol, daily=false) {\n  try {\n    const file = daily ? symbol + '-daily.json' : symbol + '.json'\n    const res = await fetch('./market-data/' + file + '?ts=' + Date.now(), {cache:'no-store'})\n    if (!res.ok) throw new Error()\n    const p = await res.json()\n    if (!Array.isArray(p?.data)) return null\n    const rows = p.data\n    rows.fetchedAt = p.fetchedAt || null\n    return rows\n  } catch { return null }\n}\n"
if (!s.includes('function aggregateBars')) s = s.replace(tfNeedle, tfNeedle + helpers)

const indicatorNeedle = "  const [indicators,setIndicators]=useState({sma:true,ema:true,rsi:true,macd:true,bb:true})"
if (!s.includes('const [market,setMarket]')) s = s.replace(indicatorNeedle, indicatorNeedle + "\n  const [market,setMarket]=useState(null)\n  const [marketMap,setMarketMap]=useState({})\n  const [dailyMarket,setDailyMarket]=useState(null)\n  const [marketUpdatedAt,setMarketUpdatedAt]=useState(null)")

const activeNeedle = "  const activeSymbol=assets[symbol]?symbol:'NIKKEI225'"
const effect = "\n  useEffect(()=>{let alive=true;const refresh=()=>loadMarket(activeSymbol,tf==='日足').then(x=>{if(alive){if(tf==='日足'){setDailyMarket(x);setMarketUpdatedAt(x?.fetchedAt||null)}else{setMarket(x);setMarketUpdatedAt(x?.fetchedAt||null)}}});refresh();const timer=setInterval(refresh,600000);return()=>{alive=false;clearInterval(timer)}},[activeSymbol,tf])"
if (!s.includes("loadMarket(activeSymbol,tf==='日足')")) s = s.replace(activeNeedle, activeNeedle + effect)
if (!s.includes('const refreshAll=')) s = s.replace(effect, effect + "\n  useEffect(()=>{let alive=true;const codes=['1570','1360','NIKKEI225'];const refreshAll=()=>Promise.all(codes.map(async c=>[c,await loadMarket(c,false)])).then(entries=>{if(!alive)return;const next={};for(const [c,rows] of entries)if(rows?.length)next[c]=rows;setMarketMap(next)});refreshAll();const timer=setInterval(refreshAll,600000);return()=>{alive=false;clearInterval(timer)}},[])" )

s = s.replace("  const data=useMemo(()=>seededCandles(activeSymbol,tf),[activeSymbol,tf])", "  const liveRows=useMemo(()=>{if(tf==='日足')return dailyMarket;if(!market?.length)return null;return tf==='1分足'?market:tf==='5分足'?aggregateBars(market,5):aggregateBars(market,15)},[market,dailyMarket,tf])\n  const minBars=20\n  const data=liveRows?.length>=minBars?liveRows.slice(-120):seededCandles(activeSymbol,tf)\n  const isLive=Boolean(liveRows?.length>=minBars)\n  const quoteFor=code=>{const rows=marketMap[code],last=rows?.[rows.length-1],prev=rows?.[rows.length-2];if(!last||!Number.isFinite(last.close))return assets[code];return {...assets[code],price:last.close,change:prev&&Number.isFinite(prev.close)?last.close-prev.close:0}}\n  const displayCurrent=quoteFor(activeSymbol)")
s = s.replace("  const closes=data.map(x=>x.close),sma20=sma(closes,20),ema20=ema(closes,20),rs=rsi(closes),bb=bollinger(closes),mc=macd(closes)", "  const closes=data.map(x=>x.close),sma20=sma(closes,20),ema20=ema(closes,20),rs=rsi(closes),bb=bollinger(closes),mc=macd(closes)")
s = s.replace("  const score=(last.close>s?1:-1)+(last.close>e?1:-1)+(ml>ms?1:-1)+(r<70?1:-1)\n  const direction=score>=3?'上向き':score<=-3?'下向き':'中立'", "  const bbLast=bb[bb.length-1]\n  const score=(last.close>s?1:-1)+(last.close>e?1:-1)+(ml>ms?1:-1)+(r>=55?1:r<=45?-1:0)+(bbLast?(last.close>bbLast.upper?-1:last.close<bbLast.lower?1:last.close>=(bbLast.upper+bbLast.lower)/2?1:-1):0)\n  const direction=score>=3?'上向き':score<=-3?'下向き':'中立'\n  const reasonItems=[\n    `SMA20: ${last.close>s?'上回る':'下回る'}`,\n    `EMA20: ${last.close>e?'上回る':'下回る'}`,\n    `MACD: ${ml>ms?'シグナル上':'シグナル下'}`,\n    `RSI14: ${r>=70?'過熱圏':r<=30?'売られ過ぎ圏':r>=55?'上向き寄り':'下向き寄り'}`,\n    `ボリンジャー: ${bbLast?(last.close>bbLast.upper?'上限超え':last.close<bbLast.lower?'下限割れ':last.close>=(bbLast.upper+bbLast.lower)/2?'中心線より上':'中心線より下'):'判定待ち'}`\n  ]\n  const updatedAt=marketUpdatedAt?new Date(marketUpdatedAt).toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'取得待ち'"
)
s = s.replace("  const max=Math.max(...data.map(x=>x.high)),min=Math.min(...data.map(x=>x.low))", "  const max=Math.max(...data.map(x=>x.high)),min=Math.min(...data.map(x=>x.low))")

s = s.replace("{current.subtitle}", "{displayCurrent.subtitle}")
s = s.replace("{Math.round(last.close).toLocaleString()}", "{Math.round(displayCurrent.price).toLocaleString()}")
s = s.replace(' · {tf} · デモデータ', " · {tf} · {isLive?'実データ':'データ取得待ち'}")
s = s.replace("hint={activeSymbol==='NIKKEI225'?'参考値':'デモ値'}", "hint={isLive?'実データ':'取得待ち'}")
s = s.replace('市場データは現在デモデータです。', "{isLive?'取得した市場データを表示しています。':'市場データを取得できない場合はデモ表示に切り替わります。'}")
s = s.replace('<strong>デモデータ</strong>です。実運用では利用許諾を満たした市場データ提供元との接続が必要です。', "<strong>{isLive?'取得した市場データ':'データ取得待ち（フォールバックはデモ）'}</strong>です。データ提供元の利用条件に従って使用してください。")

const signalNeedle = '<div className={\'signal \'+direction}><span>テクニカル状況</span><b>{direction}</b><small>参考情報・投資判断ではありません</small></div>'
const signalReplacement = '<div className={\'signal \'+direction}><span>テクニカル状況</span><b>{direction}</b><small>{reasonItems.slice(0,3).join(\' / \')}</small></div>'
if (s.includes(signalNeedle)) s = s.replace(signalNeedle, signalReplacement)

const detailNeedle = '<div className="detail-title"><b>テクニカル状況</b><span>表示設定: {refresh?\'ON\':\'OFF\'}</span></div>'
const detailReplacement = '<div className="detail-title"><b>テクニカル状況</b><span>表示設定: {refresh?\'ON\':\'OFF\'}</span></div><div className="technical-reasons"><b>判定理由</b><p>{reasonItems.join(\' / \')}</p></div><div className="update-time">株価更新日時：{updatedAt} {isLive?\'（市場データ取得時刻）\':\'（取得待ち）\'}</div>'
if (s.includes(detailNeedle) && !s.includes('className="technical-reasons"')) s = s.replace(detailNeedle, detailReplacement)

const signalPageNeedle = '<div className="signal-hero"><span>現在のテクニカル状況</span><b>{direction}</b><small>複数のテクニカル指標から機械的に算出した参考情報</small></div>'
const signalPageReplacement = '<div className="signal-hero"><span>現在のテクニカル状況</span><b>{direction}</b><small>複数のテクニカル指標から機械的に算出した参考情報</small><p>判定理由：{reasonItems.join(\' / \')}</p><p>株価更新日時：{updatedAt}</p></div>'
if (s.includes(signalPageNeedle) && !s.includes('判定理由：{reasonItems')) s = s.replace(signalPageNeedle, signalPageReplacement)

await writeFile(path, s)
console.log('runtime blank-screen fix: displayCurrent defined')

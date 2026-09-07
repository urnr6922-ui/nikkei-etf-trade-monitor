import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

// Keep the production pair as the primary view.
s = s.replace("useState('NIKKEI225')", "useState('1570')")
s = s.replace("setSymbol('NIKKEI225')", "setSymbol('1570')")

// Sanitize persisted browser state so an old/corrupt custom asset cannot crash the first render.
s = s.replace(/function loadAssets\(\) \{[\s\S]*?\n\}\nfunction saveAssets/, `function loadAssets() {
  const base = { ...DEFAULT_ASSETS }
  try {
    const saved = JSON.parse(window.localStorage.getItem('nikkei-monitor-assets') || 'null')
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return base
    for (const [code, value] of Object.entries(saved)) {
      if (!value || typeof value !== 'object') continue
      const name = typeof value.name === 'string' && value.name.trim() ? value.name.trim() : null
      if (!name) continue
      base[code] = {
        name,
        subtitle: typeof value.subtitle === 'string' && value.subtitle.trim() ? value.subtitle : name,
        price: Number.isFinite(Number(value.price)) ? Number(value.price) : 0,
        change: Number.isFinite(Number(value.change)) ? Number(value.change) : 0,
        type: value.type === 'custom' ? 'custom' : (base[code]?.type || 'etf')
      }
    }
  } catch {}
  return base
}
function saveAssets`)

// Use the fetched quote in the ticker itself, not the static seed price.
s = s.replace(
  "{a.price.toLocaleString()}円</strong><em className={a.change>=0?'up':'down'}>{a.change>=0?'▲':'▼'} {Math.abs(a.change)}円</em>",
  "{Math.round(quoteFor(code)?.price ?? a.price).toLocaleString()}円</strong><em className={(quoteFor(code)?.change ?? a.change)>=0?'up':'down'}>{(quoteFor(code)?.change ?? a.change)>=0?'▲':'▼'} {Math.abs(quoteFor(code)?.change ?? a.change).toFixed(quoteFor(code)?.change % 1 ? 2 : 0)}円</em>"
)

// Remove stale wording that labels the live core chart as demo data.
s = s.replace(/ · \{tf\} · デモデータ/g, " · {tf} · {isLive?'実データ':'データ取得待ち'}")
s = s.replace(/市場データは現在デモデータです。/g, "{isLive?'取得した市場データを表示しています。':'市場データを取得できない場合はデータ取得待ちです。'}")
s = s.replace(/<strong>デモデータ<\/strong>です。実運用では利用許諾を満たした市場データ提供元との接続が必要です。/g, "<strong>{isLive?'取得した市場データ':'データ取得待ち'}</strong>です。データ提供元の利用条件に従って使用してください。")
s = s.replace("activeSymbol==='NIKKEI225'?'参考値':'デモ値'", "isLive?'実データ':'取得待ち'")
s = s.replace("追加銘柄の価格・チャートは現在デモデータです。実データ接続は別途必要です。", "1570・1360は取得した市場データを使用します。追加銘柄はデータ提供元の接続状況により取得待ちになる場合があります。")

// Make the live chart numerically safe even if an upstream feed contains a malformed candle.
s = s.replace(
  "const max=Math.max(...data.map(x=>x.high)),min=Math.min(...data.map(x=>x.low))",
  "const finitePrices=data.flatMap(x=>[x.open,x.high,x.low,x.close]).filter(Number.isFinite),max=Math.max(...finitePrices,1),min=Math.min(...finitePrices,0),priceRange=Math.max(max-min,1)"
)
s = s.replace(/\(v-min\)\/\(max-min\)/g, "(v-min)/priceRange")

// Never allow a missing previous candle or non-finite indicator to break rendering.
s = s.replace(
  "const last=data[data.length-1],prev=data[data.length-2],pct=(last.close/prev.close-1)*100",
  "const last=data[data.length-1]||{open:0,high:0,low:0,close:0,volume:0},prev=data[data.length-2],pct=prev&&Number.isFinite(prev.close)&&prev.close!==0?(last.close/prev.close-1)*100:0"
)
s = s.replace(
  "const score=baseScore + (orientedGlobal>=2?1:orientedGlobal<=-2?-1:0)",
  "const score=Number.isFinite(baseScore)?baseScore + (orientedGlobal>=2?1:orientedGlobal<=-2?-1:0):0"
)
s = s.replace(
  "const displayCurrent=quoteFor(activeSymbol)",
  "const displayCurrent=quoteFor(activeSymbol)||assets[activeSymbol]||DEFAULT_ASSETS['1570']"
)

// Harden the final indicator inputs. This prevents toFixed()/Math.* calls from receiving
// null/NaN when a live feed has an incomplete daily candle set.
s = s.replace(
  "const closes=data.map(x=>x.close),sma20=sma(closes,20),ema20=ema(closes,20),rs=rsi(closes),bb=bollinger(closes),mc=macd(closes)",
  "const closes=data.map(x=>Number.isFinite(x.close)?x.close:0),sma20=sma(closes,20),ema20=ema(closes,20),rs=rsi(closes),bb=bollinger(closes),mc=macd(closes)"
)
s = s.replace(
  "const s=sma20[sma20.length-1],e=ema20[ema20.length-1],r=rs[rs.length-1],ml=mc.line[mc.line.length-1],ms=mc.signal[mc.signal.length-1]",
  "const s=Number.isFinite(sma20[sma20.length-1])?sma20[sma20.length-1]:closes[closes.length-1],e=Number.isFinite(ema20[ema20.length-1])?ema20[ema20.length-1]:closes[closes.length-1],r=Number.isFinite(rs[rs.length-1])?rs[rs.length-1]:50,ml=Number.isFinite(mc.line[mc.line.length-1])?mc.line[mc.line.length-1]:0,ms=Number.isFinite(mc.signal[mc.signal.length-1])?mc.signal[mc.signal.length-1]:0"
)
s = s.replace(
  "const data=liveRows?.length>=minBars?liveRows.slice(-120):seededCandles(activeSymbol,tf)",
  "const cleanLiveRows=liveRows?.filter(x=>Number.isFinite(x?.time)&&Number.isFinite(x?.open)&&Number.isFinite(x?.high)&&Number.isFinite(x?.low)&&Number.isFinite(x?.close)&&x.close>0&&x.high>=Math.max(x.open,x.close)&&x.low<=Math.min(x.open,x.close))||null\n  const data=cleanLiveRows?.length>=minBars?cleanLiveRows.slice(-120):seededCandles(activeSymbol,tf)"
)

// Add a visible React error boundary. On the first startup exception, clear only the app's
// persisted state once and reload; this repairs stale browser state without touching other data.
const renderNeedle = "createRoot(document.getElementById('root')).render(<App/>)"
const safeRender = `class SafeApp extends React.Component {
  constructor(props){super(props);this.state={error:null}}
  static getDerivedStateFromError(error){return {error}}
  componentDidCatch(error){
    console.error('Nikkei ETF Trade Monitor render error',error)
    try {
      const key='nikkei-monitor-startup-recovery'
      if(!sessionStorage.getItem(key)){
        sessionStorage.setItem(key,'1')
        localStorage.removeItem('nikkei-monitor-assets')
        window.location.reload()
      }
    } catch {}
  }
  render(){if(this.state.error)return <div style={{minHeight:'100vh',background:'#080b12',color:'#f5f7fb',padding:'24px',fontFamily:'system-ui,sans-serif'}}><h2>画面の読み込みでエラーが発生しました</h2><p>起動時データを初期化しても改善しませんでした。ページを再読み込みしてください。</p><button onClick={()=>window.location.reload()} style={{padding:'12px 18px',borderRadius:'10px'}}>再読み込み</button></div>;return <App/>}
}
createRoot(document.getElementById('root')).render(<SafeApp/>)`
if (s.includes(renderNeedle)) s = s.replace(renderNeedle, safeRender)

// Ensure the error boundary itself has a React runtime available under the automatic JSX transform.
const reactImport = s.match(/^import \{([^\n]+)\} from ['"]react['"]/m)
if (reactImport && !/^import React,/.test(reactImport[0])) {
  s = s.replace(reactImport[0], `import React, {${reactImport[1]}} from 'react'`)
}

await writeFile(path, s)
console.log('Final live UI and startup recovery patch applied')
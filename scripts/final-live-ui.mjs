import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

// Keep the production pair as the primary view.
s = s.replace("useState('NIKKEI225')", "useState('1570')")
s = s.replace("setSymbol('NIKKEI225')", "setSymbol('1570')")

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

// Add a visible React error boundary instead of a blank/black screen on a render exception.
const renderNeedle = "createRoot(document.getElementById('root')).render(<App/>)"
const safeRender = `class SafeApp extends React.Component {
  constructor(props){super(props);this.state={error:null}}
  static getDerivedStateFromError(error){return {error}}
  componentDidCatch(error){console.error('Nikkei ETF Trade Monitor render error',error)}
  render(){if(this.state.error)return <div style={{minHeight:'100vh',background:'#080b12',color:'#f5f7fb',padding:'24px',fontFamily:'system-ui,sans-serif'}}><h2>画面の読み込みでエラーが発生しました</h2><p>市場データを再取得しても改善しない場合はページを再読み込みしてください。</p><button onClick={()=>window.location.reload()} style={{padding:'12px 18px',borderRadius:'10px'}}>再読み込み</button></div>;return <App/>}
}
createRoot(document.getElementById('root')).render(<SafeApp/>)`
if (s.includes(renderNeedle)) s = s.replace(renderNeedle, safeRender)

// Ensure the error boundary itself has a React runtime available under the automatic JSX transform.
s = s.replace("import { ", "import React, { ")

await writeFile(path, s)
console.log('Final live UI and runtime safety patch applied')

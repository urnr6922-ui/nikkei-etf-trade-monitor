import { readFile, writeFile } from 'node:fs/promises'

const path='src/main.jsx'
let s=await readFile(path,'utf8')

// Use timestamp-aligned 5m/15m aggregation and remove duplicate/malformed bars.
s=s.replace(
  "function agg(a,n){if(n===1)return a;const out=[];for(let i=0;i<a.length;i+=n){const g=a.slice(i,i+n);if(!g.length)continue;out.push({time:g[0].time,open:g[0].open,high:Math.max(...g.map(x=>x.high)),low:Math.min(...g.map(x=>x.low)),close:g[g.length-1].close,volume:g.reduce((s,x)=>s+x.volume,0)})}return out}",
  "function agg(a,n){if(n===1)return a;const groups=new Map();for(const x of a){const bucket=Math.floor(x.time/(n*60))*(n*60);const g=groups.get(bucket)||[];g.push(x);groups.set(bucket,g)}return [...groups.entries()].sort((a,b)=>a[0]-b[0]).map(([time,g])=>({time,open:g[0].open,high:Math.max(...g.map(x=>x.high)),low:Math.min(...g.map(x=>x.low)),close:g[g.length-1].close,volume:g.reduce((sum,x)=>sum+x.volume,0)}))}"
)

// Add persistent indicator visibility controls used by the Settings panel.
s=s.replace(
  "const[symbol,setSymbol]=useState('1570'),[tf,setTf]=useState('5分足'),[tab,setTab]=useState('chart'),[market,setMarket]=useState({}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[settings,setSettings]=useState(false),[updated,setUpdated]=useState('')",
  "const[symbol,setSymbol]=useState('1570'),[tf,setTf]=useState('5分足'),[tab,setTab]=useState('chart'),[market,setMarket]=useState({}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[settings,setSettings]=useState(false),[updated,setUpdated]=useState(''),[ind,setInd]=useState({sma:true,ema:true,bb:true,rsi:true,macd:true})"
)

// Replace the passive Settings text with real selectable toggles.
s=s.replace(
  "{settings&&<section className=\"detail-card\"><div className=\"detail-title\"><b>設定</b><button onClick={()=>setSettings(false)}>閉じる</button></div><p>1570と1360を正式な監視対象として使用。市場データは10分ごとに更新します。</p></section>}",
  "{settings&&<section className=\"detail-card\"><div className=\"detail-title\"><b>表示設定</b><button onClick={()=>setSettings(false)}>閉じる</button></div><div className=\"rows\">{[['sma','SMA20'],['ema','EMA20'],['bb','ボリンジャーバンド'],['rsi','RSI14'],['macd','MACD']].map(([k,label])=><button key={k} className=\"row\" onClick={()=>setInd(x=>({...x,[k]:!x[k]}))}><span>{label}</span><b>{ind[k]?'表示':'非表示'}</b><em>{ind[k]?'ON':'OFF'}</em></button>)}</div><p>監視対象：1570 日経レバ / 1360 日経平均ベア2倍。市場データは10分ごとに更新します。</p></section>}"
)

// Show the Bollinger band and other overlays on the actual candle chart.
s=s.replace(
  "<div className=\"legend\"><i>SMA20</i><i>EMA20</i><i>BB</i></div>",
  "<div className=\"legend\">{ind.sma&&<i>SMA20</i>}{ind.ema&&<i>EMA20</i>}{ind.bb&&<i>BB</i>}</div>"
)
s=s.replace(
  "</g>})}</svg><div className=\"axis\">",
  "</g>})}{ind.sma&&<polyline points={S.map((v,i)=>v==null?'':`${10+i*(880/Math.max(bars.length-1,1))},${365-(v-min)/range*330}`).filter(Boolean).join(' ')} className=\"line-sma\"/>}{ind.ema&&<polyline points={E.map((v,i)=>`${10+i*(880/Math.max(bars.length-1,1))},${365-(v-min)/range*330}`).join(' ')} className=\"line-ema\"/>}{ind.bb&&<polyline points={B.map((v,i)=>v?`${10+i*(880/Math.max(bars.length-1,1))},${365-(v.upper-min)/range*330}`:'').filter(Boolean).join(' ')} className=\"line-bb\"/>}</svg><div className=\"axis\">"
)

// Hide/show RSI and MACD metric cards according to settings.
s=s.replace(
  "<section className=\"metrics\"><div className=\"metric\"><span>RSI (14)</span><b>{fmt(rv,1)}</b><small>{rv>70?'過熱圏':rv<30?'売られ過ぎ圏':'中立圏'}</small></div><div className=\"metric\"><span>MACD</span><b>{fmt(ml,1)}</b><small>{ml>ms?'シグナル上':'シグナル下'}</small></div>",
  "<section className=\"metrics\">{ind.rsi&&<div className=\"metric\"><span>RSI (14)</span><b>{fmt(rv,1)}</b><small>{rv>70?'過熱圏':rv<30?'売られ過ぎ圏':'中立圏'}</small></div>}{ind.macd&&<div className=\"metric\"><span>MACD</span><b>{fmt(ml,1)}</b><small>{ml>ms?'シグナル上':'シグナル下'}</small></div>}",
)

// Keep the price axis tight around actual candles; never include zero for ETF prices.
s=s.replace(
  "const pp=bars.flatMap(x=>[x.high,x.low]).filter(Number.isFinite),max=Math.max(...pp,1),min=Math.min(...pp,0),range=Math.max(max-min,1)",
  "const pp=bars.flatMap(x=>[x.high,x.low]).filter(Number.isFinite),rawMax=Math.max(...pp),rawMin=Math.min(...pp),pad=Math.max((rawMax-rawMin)*0.08, symbol==='1360'?0.2:1),max=rawMax+pad,min=Math.max(0,rawMin-pad),range=Math.max(max-min,1)"
)

await writeFile(path,s)
console.log('Applied final chart rendering, Bollinger overlay, and selectable Settings controls')

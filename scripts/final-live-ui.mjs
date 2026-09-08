import { writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
const app = String.raw`import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Activity, BarChart3, Info, RefreshCw, Settings, TrendingUp } from 'lucide-react'
import './styles.css'

const ASSETS={
  '1570':{name:'日経レバ',subtitle:'NEXT FUNDS 日経平均レバレッジ・インデックス連動型'},
  NIKKEI225:{name:'日経平均',subtitle:'日経平均株価（日経225）'},
  '1360':{name:'日経平均ベア2倍',subtitle:'日経平均ベア2倍上場投信'}
}
const TF=['1分足','5分足','15分足','日足']
const num=v=>Number(v)
function clean(raw){const a=Array.isArray(raw?.data)?raw.data:[];return a.map(x=>({time:num(x.time),open:num(x.open),high:num(x.high),low:num(x.low),close:num(x.close),volume:num(x.volume)||0})).filter(x=>[x.time,x.open,x.high,x.low,x.close].every(Number.isFinite)&&x.high>=x.low&&x.close>0)}
function agg(a,n){if(n===1)return a;const groups=new Map();for(const x of a){const bucket=Math.floor(x.time/(n*60))*(n*60);const g=groups.get(bucket)||[];g.push(x);groups.set(bucket,g)}return [...groups.entries()].sort((a,b)=>a[0]-b[0]).map(([time,g])=>({time,open:g[0].open,high:Math.max(...g.map(x=>x.high)),low:Math.min(...g.map(x=>x.low)),close:g[g.length-1].close,volume:g.reduce((sum,x)=>sum+x.volume,0)}))}
function sma(v,n){return v.map((_,i)=>i<n-1?null:v.slice(i-n+1,i+1).reduce((a,b)=>a+b,0)/n)}
function ema(v,n){if(!v.length)return[];const k=2/(n+1);let p=v[0];return v.map((x,i)=>{if(i)p=x*k+p*(1-k);return p})}
function rsi(v,n=14){return v.map((_,i)=>{if(i<n)return null;let g=0,l=0;for(let j=i-n+1;j<=i;j++){const d=v[j]-v[j-1];d>=0?g+=d:l-=d}return l===0?100:100-100/(1+g/l)})}
function bands(v,n=20){return v.map((_,i)=>{if(i<n-1)return null;const a=v.slice(i-n+1,i+1),m=a.reduce((s,x)=>s+x,0)/n,sd=Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/n);return{upper:m+2*sd,lower:m-2*sd}})}
function macd(v){const a=ema(v,12),b=ema(v,26),line=v.map((_,i)=>a[i]-b[i]);return{line,signal:ema(line,9)}}
function fmt(v,d=0){return Number.isFinite(v)?v.toLocaleString('ja-JP',{maximumFractionDigits:d}):'—'}

function App(){
 const[symbol,setSymbol]=useState('1570'),[tf,setTf]=useState('5分足'),[tab,setTab]=useState('chart'),[market,setMarket]=useState({}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[settings,setSettings]=useState(false),[updated,setUpdated]=useState(''),[juniorInput,setJuniorInput]=useState(''),[juniorReply,setJuniorReply]=useState(''),[speaking,setSpeaking]=useState(false),[ind,setInd]=useState({sma:true,ema:true,bb:true,rsi:true,macd:true})
 const load=async()=>{setLoading(true);setError('');try{const pairs=await Promise.all(Object.keys(ASSETS).flatMap(s=>[s,s+'-daily']).map(async k=>{const r=await fetch('./market-data/'+k+'.json?'+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(k+': '+r.status);return[k,await r.json()]}));setMarket(Object.fromEntries(pairs));const times=pairs.map(([,x])=>x?.fetchedAt).filter(Boolean).map(x=>new Date(x).getTime()).filter(Number.isFinite);setUpdated(times.length?new Date(Math.max(...times)).toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):new Date().toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}))}catch(e){console.error(e);setError('市場データを取得できませんでした。再度更新してください。')}finally{setLoading(false)}}
 useEffect(()=>{load();const id=setInterval(load,300000);return()=>clearInterval(id)},[])
 const base=clean(market[symbol]),daily=clean(market[symbol+'-daily'])
 const bars=useMemo(()=>{if(tf==='日足')return daily.slice(-120);const n=tf==='1分足'?1:tf==='5分足'?5:15;return agg(base,n).slice(-120)},[base,daily,tf])
 const close=bars.map(x=>x.close),S=sma(close,20),E=ema(close,20),R=rsi(close),B=bands(close),M=macd(close)
 const last=bars.at(-1)||{close:0,volume:0},prev=bars.at(-2),pct=prev?.close?((last.close/prev.close)-1)*100:0
 const sv=S.at(-1),ev=E.at(-1),rv=R.at(-1),ml=M.line.at(-1),ms=M.signal.at(-1),bb=B.at(-1)
 const score=(last.close>sv?1:-1)+(last.close>ev?1:-1)+(ml>ms?1:-1)+(rv<70?1:-1)+(bb?(last.close>=((bb.upper+bb.lower)/2)?1:-1):0)
 const direction=score>=3?'上向き':score<=-3?'下向き':'中立'
 const buyPct=Math.max(10,Math.min(90,Math.round(50+score*9)))
 const sellPct=100-buyPct
 const dataOf=code=>clean(market[code]), qOf=code=>dataOf(code).at(-1), pctOf=code=>{const a=dataOf(code),x=a.at(-1),y=a.at(-2);return y?.close?((x.close/y.close)-1)*100:0}
 const nikkei=qOf('NIKKEI225')
 const nikkeiPct=pctOf('NIKKEI225')
 const recommendation=score>=3?'買い優勢':score<=-3?'売り優勢':'様子見'
 const juniorText=()=>{const target=symbol==='1360'?'1360（日経平均ベア2倍）':symbol==='1570'?'1570（日経レバ）':'日経平均';const price=last.close;const rText=Number.isFinite(rv)?'RSI '+rv.toFixed(1):'RSI取得待ち';const mText=Number.isFinite(ml)&&Number.isFinite(ms)?(ml>ms?'MACDはシグナル上':'MACDはシグナル下'):'MACD取得待ち';return 'ジュニアです。'+target+'は現在 '+fmt(price,symbol==='1360'?1:0)+'円。'+recommendation+'です。買い優勢度は'+buyPct+'%、売り優勢度は'+sellPct+'%。理由は、'+(last.close>sv?'SMA20を上回り':'SMA20を下回り')+'、'+(last.close>ev?'EMA20を上回り':'EMA20を下回り')+'、'+mText+'、'+rText+'です。日経平均は '+fmt(nikkei?.close)+'円、前足比 '+nikkeiPct.toFixed(2)+'%。これはテクニカルデータに基づく参考判定で、売買を保証するものではありません。'}
 const runJunior=()=>{const reply=juniorText();setJuniorReply(reply);if(typeof window!=='undefined'&&'speechSynthesis' in window){window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(reply);u.lang='ja-JP';u.onstart=()=>setSpeaking(true);u.onend=()=>setSpeaking(false);window.speechSynthesis.speak(u)}}
 const pp=bars.flatMap(x=>[x.high,x.low]).filter(Number.isFinite),rawMax=Math.max(...pp),rawMin=Math.min(...pp),pad=Math.max((rawMax-rawMin)*0.08,symbol==='1360'?0.2:1),max=rawMax+pad,min=Math.max(0,rawMin-pad),range=Math.max(max-min,1)
 const asset=ASSETS[symbol]
 return <div className="app">
  <header className="topbar"><div className="brand"><div className="logo"><Activity size={20}/></div><div><h1>日経ETF Trade Monitor</h1><span>1570 / 日経平均 / 1360・スマホ対応</span></div></div><button className="icon-btn" onClick={()=>setSettings(v=>!v)}><Settings size={21}/></button></header>
  <main>
   <section className="ticker-tabs">{Object.entries(ASSETS).map(([code,a])=>{const q=clean(market[code]).at(-1);const pc=pctOf(code);return <button key={code} className={'ticker '+(symbol===code?'active':'')} onClick={()=>setSymbol(code)}><span>{code==='NIKKEI225'?'指数':code}</span><b>{a.name}</b><strong>{fmt(q?.close||0,code==='1360'?1:0)}円</strong><em className={pc>=0?'up':'down'}>{pc>=0?'▲':'▼'} {Math.abs(pc).toFixed(2)}%</em></button>})}</section>
   <section className="market-update"><span>市場データ更新</span><b>{updated||'取得中…'}</b><small>公開データ・配信遅延あり／自動確認5分</small></section>
   {settings&&<section className="detail-card settings-panel"><div className="detail-title"><b>設定</b><button onClick={()=>setSettings(false)}>閉じる</button></div><div className="rows">{[['sma','SMA20'],['ema','EMA20'],['bb','ボリンジャーバンド'],['rsi','RSI14'],['macd','MACD']].map(([k,label])=><button key={k} className="row setting-toggle" onClick={()=>setInd(x=>({...x,[k]:!x[k]}))}><span>{label}</span><b>{ind[k]?'表示':'非表示'}</b><em>{ind[k]?'ON':'OFF'}</em></button>)}</div><p>監視対象：1570 / 日経平均 / 1360。市場データは5分ごとに自動確認します。</p></section>}
   <section className="price-card"><div><span className="eyebrow">{asset.subtitle}</span><div className="price">{fmt(last.close,symbol==='1360'?1:0)}<small>円</small></div><div className={'change '+(pct>=0?'up':'down')}>{pct>=0?'▲':'▼'} {Math.abs(pct).toFixed(2)}% <span>前足比</span></div></div><div className={'signal '+direction}><span>テクニカル状況</span><b>{direction}</b><small>参考情報・投資判断ではありません</small></div></section>
   <section className="junior-card"><div className="junior-head"><div><b>ジュニア</b><span>株価アシスタント</span></div><button onClick={runJunior} disabled={loading}>ジュニア、どう？</button></div><div className="junior-chat"><input value={juniorInput} onChange={e=>setJuniorInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){runJunior();setJuniorInput('')}}} placeholder="例：ジュニア、1360は？"/><button onClick={()=>{runJunior();setJuniorInput('')}}>聞く</button></div>{juniorReply&&<div className="junior-reply"><span>{speaking?'🔊 話しています…':'ジュニアの回答'}</span><p>{juniorReply}</p></div>}</section>
   {error&&<section className="detail-card"><b>{error}</b></section>}
   {loading&&!bars.length?<section className="detail-card"><b>市場データを読み込んでいます…</b></section>:<>
    {tab==='chart'&&<><div className="toolbar"><div className="segmented">{TF.map(x=><button key={x} className={tf===x?'selected':''} onClick={()=>setTf(x)}>{x}</button>)}</div><button className="refresh" onClick={load}><RefreshCw size={17}/>更新</button></div>
    <section className="chart-card"><div className="chart-head"><div><b>ローソク足</b><span> · {tf} · 実データ</span></div><div className="legend">{ind.sma&&<i>SMA20</i>}{ind.ema&&<i>EMA20</i>}{ind.bb&&<i>BB</i>}</div></div><div className="chart-wrap"><svg viewBox="0 0 900 390" preserveAspectRatio="none" className="chart">{[0,1,2,3,4].map(i=><line key={i} x1="0" x2="900" y1={40+i*75} y2={40+i*75} className="grid"/>)}{bars.map((d,i)=>{const x=10+i*(880/Math.max(bars.length-1,1)),y=v=>365-(v-min)/range*330,t=y(Math.max(d.open,d.close)),b=y(Math.min(d.open,d.close)),up=d.close>=d.open;return <g key={i}><line x1={x} x2={x} y1={y(d.high)} y2={y(d.low)} className={up?'wick upstroke':'wick downstroke'}/><rect x={x-3.3} y={t} width="6.6" height={Math.max(2,b-t)} className={up?'candle upstroke':'candle downstroke'}/></g>})}{ind.sma&&<polyline points={S.map((v,i)=>v==null?'':(10+i*(880/Math.max(bars.length-1,1)))+','+(365-(v-min)/range*330)).filter(Boolean).join(' ')} className="line-sma"/>}{ind.ema&&<polyline points={E.map((v,i)=>(10+i*(880/Math.max(bars.length-1,1)))+','+(365-(v-min)/range*330)).join(' ')} className="line-ema"/>}{ind.bb&&<polyline points={B.map((v,i)=>v?(10+i*(880/Math.max(bars.length-1,1)))+','+(365-(v.upper-min)/range*330):'').filter(Boolean).join(' ')} className="line-bb"/>}</svg><div className="axis"><span>{fmt(max)}</span><span>{fmt((max+min)/2)}</span><span>{fmt(min)}</span></div></div></section>
    <section className="metrics">{ind.rsi&&<div className="metric"><span>RSI (14)</span><b>{fmt(rv,1)}</b><small>{rv>70?'過熱圏':rv<30?'売られ過ぎ圏':'中立圏'}</small></div>}{ind.macd&&<div className="metric"><span>MACD</span><b>{fmt(ml,1)}</b><small>{ml>ms?'シグナル上':'シグナル下'}</small></div>}<div className="metric"><span>出来高</span><b>{fmt(last.volume/1000,1)}K</b><small>実データ</small></div></section>
    <section className="detail-card"><div className="detail-title"><b>テクニカル状況</b><span>{updated?'更新 '+updated:'—'}</span></div><div className="rows"><div className="row"><span>SMA20</span><b>{fmt(sv)}円</b><em>{last.close>sv?'上向き':'下向き'}</em></div><div className="row"><span>EMA20</span><b>{fmt(ev)}円</b><em>{last.close>ev?'上向き':'下向き'}</em></div><div className="row"><span>ボリンジャー</span><b>{B.at(-1)?fmt(B.at(-1).lower)+' ～ '+fmt(B.at(-1).upper)+'円':'—'}</b><em>参考</em></div><div className="row"><span>総合状況</span><b>{direction}</b><em>参考</em></div></div></section></>}
    {tab==='signals'&&<section className="signal-page"><div className="signal-hero"><span>現在のテクニカル状況</span><b>{direction}</b><small>SMA20 / EMA20 / RSI / MACDを機械的に集計</small></div><div className="signal-grid"><div className="row"><span>SMA20</span><b>{last.close>sv?'上回る':'下回る'}</b></div><div className="row"><span>EMA20</span><b>{last.close>ev?'上回る':'下回る'}</b></div><div className="row"><span>RSI14</span><b>{fmt(rv,1)}</b></div><div className="row"><span>MACD</span><b>{ml>ms?'上向き':'下向き'}</b></div></div></section>}
   </>}
   <div className="disclaimer"><Info size={16}/><p>ジュニアの現在判定：<strong>{recommendation}</strong>（買い優勢度 {buyPct}% / 売り優勢度 {sellPct}%）。市場データは取得した公開データを表示しています。判定は参考情報であり、売買推奨ではありません。</p></div>
   <nav className="bottom-nav"><button className={tab==='chart'?'on':''} onClick={()=>setTab('chart')}><BarChart3 size={21}/><span>チャート</span></button><button className={tab==='signals'?'on':''} onClick={()=>setTab('signals')}><TrendingUp size={21}/><span>テクニカル</span></button><button onClick={()=>setSettings(v=>!v)}><Settings size={21}/><span>設定</span></button></nav>
  </main>
 </div>
}
class SafeApp extends React.Component{constructor(p){super(p);this.state={error:null}}static getDerivedStateFromError(error){return{error}}componentDidCatch(error){console.error('Nikkei ETF Trade Monitor render error',error)}render(){return this.state.error?<div style={{minHeight:'100vh',background:'#080b12',color:'#fff',padding:'24px',fontFamily:'system-ui'}}><h2>画面の読み込みでエラーが発生しました</h2><p>アプリ内部でエラーが発生しました。再読み込みしてください。</p><button onClick={()=>location.reload()}>再読み込み</button></div>:<App/>}}
createRoot(document.getElementById('root')).render(<SafeApp/>)`
await writeFile(path, app)
console.log('Replaced runtime with a data-safe market monitor')

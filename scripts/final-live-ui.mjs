import { writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
const app = String.raw`import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Activity, BarChart3, Info, RefreshCw, Settings, TrendingUp } from 'lucide-react'
import './styles.css'

const ASSETS={
  '1570':{name:'日経レバ',subtitle:'NEXT FUNDS 日経平均レバレッジ・インデックス連動型'},
  '1360':{name:'日経平均ベア2倍',subtitle:'日経平均ベア2倍上場投信'}
}
const TF=['1分足','5分足','15分足','日足']
const num=v=>Number(v)
function clean(raw){const a=Array.isArray(raw?.data)?raw.data:[];return a.map(x=>({time:num(x.time),open:num(x.open),high:num(x.high),low:num(x.low),close:num(x.close),volume:num(x.volume)||0})).filter(x=>[x.time,x.open,x.high,x.low,x.close].every(Number.isFinite)&&x.high>=x.low&&x.close>0)}
function agg(a,n){if(n===1)return a;const out=[];for(let i=0;i<a.length;i+=n){const g=a.slice(i,i+n);if(!g.length)continue;out.push({time:g[0].time,open:g[0].open,high:Math.max(...g.map(x=>x.high)),low:Math.min(...g.map(x=>x.low)),close:g[g.length-1].close,volume:g.reduce((s,x)=>s+x.volume,0)})}return out}
function sma(v,n){return v.map((_,i)=>i<n-1?null:v.slice(i-n+1,i+1).reduce((a,b)=>a+b,0)/n)}
function ema(v,n){if(!v.length)return[];const k=2/(n+1);let p=v[0];return v.map((x,i)=>{if(i)p=x*k+p*(1-k);return p})}
function rsi(v,n=14){return v.map((_,i)=>{if(i<n)return null;let g=0,l=0;for(let j=i-n+1;j<=i;j++){const d=v[j]-v[j-1];d>=0?g+=d:l-=d}return l===0?100:100-100/(1+g/l)})}
function bands(v,n=20){return v.map((_,i)=>{if(i<n-1)return null;const a=v.slice(i-n+1,i+1),m=a.reduce((s,x)=>s+x,0)/n,sd=Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/n);return{upper:m+2*sd,lower:m-2*sd}})}
function macd(v){const a=ema(v,12),b=ema(v,26),line=v.map((_,i)=>a[i]-b[i]);return{line,signal:ema(line,9)}}
function fmt(v,d=0){return Number.isFinite(v)?v.toLocaleString('ja-JP',{maximumFractionDigits:d}):'—'}

function App(){
 const[symbol,setSymbol]=useState('1570'),[tf,setTf]=useState('5分足'),[tab,setTab]=useState('chart'),[market,setMarket]=useState({}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[settings,setSettings]=useState(false),[updated,setUpdated]=useState('')
 const load=async()=>{setLoading(true);setError('');try{const pairs=await Promise.all(Object.keys(ASSETS).flatMap(s=>[s,s+'-daily']).map(async k=>{const r=await fetch('./market-data/'+k+'.json?'+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(k+': '+r.status);return[k,await r.json()]}));setMarket(Object.fromEntries(pairs));setUpdated(new Date().toLocaleTimeString('ja-JP'))}catch(e){console.error(e);setError('市場データを取得できませんでした。再度更新してください。')}finally{setLoading(false)}}
 useEffect(()=>{load();const id=setInterval(load,600000);return()=>clearInterval(id)},[])
 const base=clean(market[symbol]),daily=clean(market[symbol+'-daily'])
 const bars=useMemo(()=>{if(tf==='日足')return daily.slice(-120);const n=tf==='1分足'?1:tf==='5分足'?5:15;return agg(base,n).slice(-120)},[base,daily,tf])
 const close=bars.map(x=>x.close),S=sma(close,20),E=ema(close,20),R=rsi(close),B=bands(close),M=macd(close)
 const last=bars.at(-1)||{close:0,volume:0},prev=bars.at(-2),pct=prev?.close?((last.close/prev.close)-1)*100:0
 const sv=S.at(-1),ev=E.at(-1),rv=R.at(-1),ml=M.line.at(-1),ms=M.signal.at(-1)
 const score=(last.close>sv?1:-1)+(last.close>ev?1:-1)+(ml>ms?1:-1)+(rv<70?1:-1),direction=score>=3?'上向き':score<=-3?'下向き':'中立'
 const pp=bars.flatMap(x=>[x.high,x.low]).filter(Number.isFinite),max=Math.max(...pp,1),min=Math.min(...pp,0),range=Math.max(max-min,1)
 const asset=ASSETS[symbol]
 return <div className="app">
  <header className="topbar"><div className="brand"><div className="logo"><Activity size={20}/></div><div><h1>日経ETF Trade Monitor</h1><span>1570 / 1360・スマホ専用</span></div></div><button className="icon-btn" onClick={()=>setSettings(v=>!v)}><Settings size={21}/></button></header>
  <main>
   <section className="ticker-tabs">{Object.entries(ASSETS).map(([code,a])=>{const q=clean(market[code]).at(-1);return <button key={code} className={'ticker '+(symbol===code?'active':'')} onClick={()=>setSymbol(code)}><span>{code}</span><b>{a.name}</b><strong>{fmt(q?.close||0,code==='1360'?1:0)}円</strong></button>})}</section>
   {settings&&<section className="detail-card"><div className="detail-title"><b>設定</b><button onClick={()=>setSettings(false)}>閉じる</button></div><p>1570と1360を正式な監視対象として使用。市場データは10分ごとに更新します。</p></section>}
   <section className="price-card"><div><span className="eyebrow">{asset.subtitle}</span><div className="price">{fmt(last.close,symbol==='1360'?1:0)}<small>円</small></div><div className={'change '+(pct>=0?'up':'down')}>{pct>=0?'▲':'▼'} {Math.abs(pct).toFixed(2)}% <span>前足比</span></div></div><div className={'signal '+direction}><span>テクニカル状況</span><b>{direction}</b><small>参考情報・投資判断ではありません</small></div></section>
   {error&&<section className="detail-card"><b>{error}</b></section>}
   {loading&&!bars.length?<section className="detail-card"><b>市場データを読み込んでいます…</b></section>:<>
    {tab==='chart'&&<><div className="toolbar"><div className="segmented">{TF.map(x=><button key={x} className={tf===x?'selected':''} onClick={()=>setTf(x)}>{x}</button>)}</div><button className="refresh" onClick={load}><RefreshCw size={17}/>更新</button></div>
    <section className="chart-card"><div className="chart-head"><div><b>ローソク足</b><span> · {tf} · 実データ</span></div><div className="legend"><i>SMA20</i><i>EMA20</i><i>BB</i></div></div><div className="chart-wrap"><svg viewBox="0 0 900 390" preserveAspectRatio="none" className="chart">{[0,1,2,3,4].map(i=><line key={i} x1="0" x2="900" y1={40+i*75} y2={40+i*75} className="grid"/>)}{bars.map((d,i)=>{const x=10+i*(880/Math.max(bars.length-1,1)),y=v=>365-(v-min)/range*330,t=y(Math.max(d.open,d.close)),b=y(Math.min(d.open,d.close)),up=d.close>=d.open;return <g key={i}><line x1={x} x2={x} y1={y(d.high)} y2={y(d.low)} className={up?'wick upstroke':'wick downstroke'}/><rect x={x-3.3} y={t} width="6.6" height={Math.max(2,b-t)} className={up?'candle upstroke':'candle downstroke'}/></g>})}</svg><div className="axis"><span>{fmt(max)}</span><span>{fmt((max+min)/2)}</span><span>{fmt(min)}</span></div></div></section>
    <section className="metrics"><div className="metric"><span>RSI (14)</span><b>{fmt(rv,1)}</b><small>{rv>70?'過熱圏':rv<30?'売られ過ぎ圏':'中立圏'}</small></div><div className="metric"><span>MACD</span><b>{fmt(ml,1)}</b><small>{ml>ms?'シグナル上':'シグナル下'}</small></div><div className="metric"><span>出来高</span><b>{fmt(last.volume/1000,1)}K</b><small>実データ</small></div></section>
    <section className="detail-card"><div className="detail-title"><b>テクニカル状況</b><span>{updated?'更新 '+updated:'—'}</span></div><div className="rows"><div className="row"><span>SMA20</span><b>{fmt(sv)}円</b><em>{last.close>sv?'上向き':'下向き'}</em></div><div className="row"><span>EMA20</span><b>{fmt(ev)}円</b><em>{last.close>ev?'上向き':'下向き'}</em></div><div className="row"><span>ボリンジャー</span><b>{B.at(-1)?fmt(B.at(-1).lower)+' ～ '+fmt(B.at(-1).upper)+'円':'—'}</b><em>参考</em></div><div className="row"><span>総合状況</span><b>{direction}</b><em>参考</em></div></div></section></>}
    {tab==='signals'&&<section className="signal-page"><div className="signal-hero"><span>現在のテクニカル状況</span><b>{direction}</b><small>SMA20 / EMA20 / RSI / MACDを機械的に集計</small></div><div className="signal-grid"><div className="row"><span>SMA20</span><b>{last.close>sv?'上回る':'下回る'}</b></div><div className="row"><span>EMA20</span><b>{last.close>ev?'上回る':'下回る'}</b></div><div className="row"><span>RSI14</span><b>{fmt(rv,1)}</b></div><div className="row"><span>MACD</span><b>{ml>ms?'上向き':'下向き'}</b></div></div></section>}
   </>}
   <div className="disclaimer"><Info size={16}/><p>市場データは取得した公開データを表示しています。テクニカル状況は参考情報であり、売買推奨ではありません。</p></div>
   <nav className="bottom-nav"><button className={tab==='chart'?'on':''} onClick={()=>setTab('chart')}><BarChart3 size={21}/><span>チャート</span></button><button className={tab==='signals'?'on':''} onClick={()=>setTab('signals')}><TrendingUp size={21}/><span>テクニカル</span></button><button onClick={()=>setSettings(v=>!v)}><Settings size={21}/><span>設定</span></button></nav>
  </main>
 </div>
}
class SafeApp extends React.Component{constructor(p){super(p);this.state={error:null}}static getDerivedStateFromError(error){return{error}}componentDidCatch(error){console.error('Nikkei ETF Trade Monitor render error',error)}render(){return this.state.error?<div style={{minHeight:'100vh',background:'#080b12',color:'#fff',padding:'24px',fontFamily:'system-ui'}}><h2>画面の読み込みでエラーが発生しました</h2><p>アプリ内部でエラーが発生しました。再読み込みしてください。</p><button onClick={()=>location.reload()}>再読み込み</button></div>:<App/>}}
createRoot(document.getElementById('root')).render(<SafeApp/>)`
await writeFile(path, app)
console.log('Replaced runtime with a data-safe market monitor')

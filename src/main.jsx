import React, { useEffect, useMemo, useState } from 'react'
import { Activity, BarChart3, Bell, BellOff, Info, Plus, RefreshCw, Settings, TrendingUp, X } from 'lucide-react'
import './styles.css'

const DEFAULT_ASSETS = {
  NIKKEI225: { name: '日経平均', subtitle: '日経平均株価（日経225）', price: 43800, change: 320, type: 'index' },
  '1570': { name: '日経レバ', subtitle: 'NEXT FUNDS 日経平均レバレッジ・インデックス連動型', price: 28640, change: 420, type: 'etf' },
  '1360': { name: '日経平均ベア2倍', subtitle: '日経平均ベア2倍上場投信', price: 69.4, change: -1.9, type: 'etf' },
}
const TF = ['1分足', '5分足', '15分足', '日足']

function loadAssets() {
  try {
    const saved = JSON.parse(localStorage.getItem('nikkei-monitor-assets') || 'null')
    return saved && typeof saved === 'object' ? { ...DEFAULT_ASSETS, ...saved } : DEFAULT_ASSETS
  } catch { return DEFAULT_ASSETS }
}
function seededCandles(symbol, tf, count = 72) {
  const is1360 = symbol === '1360'
  const isNikkei = symbol === 'NIKKEI225'
  const base = isNikkei ? 43500 : is1360 ? 70 : symbol === '1570' ? 28200 : 1000
  const scale = tf === '1分足' ? 1 : tf === '5分足' ? 1.7 : tf === '15分足' ? 2.6 : 4.2
  const unit = is1360 ? 1 : isNikkei || symbol === '1570' ? 150 : Math.max(base * 0.01, 5)
  let p = base
  return Array.from({ length: count }, (_, i) => {
    const wave = Math.sin(i / 7) * unit * scale + Math.sin(i / 3.4) * unit * 0.37 * scale
    const drift = (is1360 ? -0.03 : 5.1) * scale * i * (isNikkei ? 1 : 1)
    const noise = Math.sin(i * 17.31) * unit * 0.21 * scale
    const close = Math.max(0.1, p + wave + drift + noise)
    const open = p
    const high = Math.max(open, close) + unit * 0.19 * scale + Math.abs(Math.sin(i * 2.1)) * unit * 0.37 * scale
    const low = Math.min(open, close) - unit * 0.19 * scale - Math.abs(Math.cos(i * 1.7)) * unit * 0.3 * scale
    const volume = 18000 + Math.abs(Math.sin(i * 0.8)) * 32000 + i * 120
    p = close
    return { open, high, low, close, volume }
  })
}
function sma(v, n) { return v.map((_, i) => i < n - 1 ? null : v.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n) }
function ema(v, n) { const k = 2 / (n + 1); let p = v[0]; return v.map((x, i) => { if (i) p = x * k + p * (1 - k); return p }) }
function rsi(v, n = 14) { return v.map((_, i) => { if (i < n) return null; let g = 0, l = 0; for (let j = i - n + 1; j <= i; j++) { const d = v[j] - v[j - 1]; if (d >= 0) g += d; else l -= d } return l === 0 ? 100 : 100 - 100 / (1 + g / l) }) }
function bollinger(v, n = 20) { return v.map((_, i) => { if (i < n - 1) return null; const a = v.slice(i - n + 1, i + 1), m = a.reduce((x, y) => x + y, 0) / n, sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / n); return { upper: m + 2 * sd, lower: m - 2 * sd } }) }
function macd(v) { const a = ema(v, 12), b = ema(v, 26), line = v.map((_, i) => a[i] - b[i]), signal = ema(line, 9); return { line, signal } }
function Metric({ title, value, hint }) { return <div className="metric"><span>{title}</span><b>{value}</b><small>{hint}</small></div> }
function Row({ label, value, positive }) { return <div className="row"><span>{label}</span><b>{value}</b><em>{positive === undefined ? '参考' : positive ? '上向き' : '下向き'}</em></div> }
function SettingToggle({ label, checked, setChecked, icon }) { return <button className="setting-row" onClick={() => setChecked(!checked)}><span>{icon || <span className={'dot ' + (checked ? 'enabled' : '')}></span>}{label}</span><span className={'switch ' + (checked ? 'on' : '')}><i /></span></button> }

function App() {
  const [assets, setAssets] = useState(loadAssets)
  const [symbol, setSymbol] = useState('NIKKEI225')
  const [tf, setTf] = useState('5分足')
  const [tab, setTab] = useState('chart')
  const [settings, setSettings] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newSubtitle, setNewSubtitle] = useState('')
  const [refresh, setRefresh] = useState(true)
  const [notifications, setNotifications] = useState(false)
  const [indicators, setIndicators] = useState({ sma: true, ema: true, rsi: true, macd: true, bb: true })
  const data = useMemo(() => seededCandles(symbol, tf), [symbol, tf])
  const closes = data.map(x => x.close)
  const sma20 = sma(closes, 20), ema20 = ema(closes, 20), rs = rsi(closes), bb = bollinger(closes), mc = macd(closes)
  const last = data[data.length - 1], prev = data[data.length - 2]
  const pct = (last.close / prev.close - 1) * 100
  const score = (last.close > sma20.at(-1) ? 1 : -1) + (last.close > ema20.at(-1) ? 1 : -1) + (mc.line.at(-1) > mc.signal.at(-1) ? 1 : -1) + (rs.at(-1) < 70 ? 1 : -1)
  const direction = score >= 3 ? '上向き' : score <= -3 ? '下向き' : '中立'
  const max = Math.max(...data.map(x => x.high)), min = Math.min(...data.map(x => x.low))
  const setIndicator = (key, value) => setIndicators(x => ({ ...x, [key]: value }))

  useEffect(() => { localStorage.setItem('nikkei-monitor-assets', JSON.stringify(assets)) }, [assets])

  const addAsset = () => {
    const code = newCode.trim().toUpperCase()
    const name = newName.trim()
    if (!code || !name || code === 'NIKKEI225' || assets[code]) return
    setAssets(x => ({ ...x, [code]: { name, subtitle: newSubtitle.trim() || name, price: 1000, change: 0, type: 'custom' } }))
    setSymbol(code)
    setNewCode(''); setNewName(''); setNewSubtitle(''); setAddOpen(false)
  }
  const removeCustomAsset = code => {
    if (assets[code]?.type !== 'custom') return
    setAssets(x => { const y = { ...x }; delete y[code]; return y })
    if (symbol === code) setSymbol('NIKKEI225')
  }

  return <div className="app">
    <header className="topbar"><div className="brand"><div className="logo"><Activity size={20} /></div><div><h1>日経ETF Trade Monitor</h1><span>スマホ専用・テクニカル監視</span></div></div><button className="icon-btn" onClick={() => setSettings(true)} aria-label="設定"><Settings size={21} /></button></header>
    <main>
      <section className="ticker-tabs">{Object.entries(assets).map(([s, e]) => <button key={s} className={symbol === s ? 'ticker active' : 'ticker'} onClick={() => setSymbol(s)}><span>{s === 'NIKKEI225' ? '指数' : s}</span><b>{e.name}</b><strong>{e.price.toLocaleString()}円</strong><em className={e.change >= 0 ? 'up' : 'down'}>{e.change >= 0 ? '▲' : '▼'} {Math.abs(e.change)}円</em></button>)}<button className="ticker" onClick={() => setAddOpen(true)}><Plus size={18}/><b>銘柄を追加</b><small>コード・名称を入力</small></button></section>
      <section className="price-card"><div><span className="eyebrow">{assets[symbol].subtitle}</span><div className="price">{Math.round(last.close).toLocaleString()}<small>円</small></div><div className={pct >= 0 ? 'change up' : 'change down'}>{pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}% <span>前足比</span></div></div><div className={'signal ' + direction}><span>テクニカル状況</span><b>{direction}</b><small>参考情報・投資判断ではありません</small></div></section>
      {tab === 'chart' && <>
        <div className="toolbar"><div className="segmented">{TF.map(x => <button key={x} className={tf === x ? 'selected' : ''} onClick={() => setTf(x)}>{x}</button>)}</div><button className="refresh" onClick={() => setRefresh(!refresh)}><RefreshCw size={17} /> {refresh ? '表示設定 ON' : '表示設定 OFF'}</button></div>
        <section className="chart-card"><div className="chart-head"><div><b>ローソク足</b><span> · {tf} · デモデータ</span></div><div className="legend">{indicators.sma && <i>SMA20</i>}{indicators.ema && <i>EMA20</i>}{indicators.bb && <i>BB</i>}</div></div><div className="chart-wrap"><svg viewBox="0 0 900 390" preserveAspectRatio="none" className="chart">{[0,1,2,3,4].map(i => <line key={i} x1="0" x2="900" y1={40+i*75} y2={40+i*75} className="grid" />)}{data.map((d,i) => { const x=10+i*(880/(data.length-1)), y=v=>365-(v-min)/(max-min)*330, top=y(Math.max(d.open,d.close)), bottom=y(Math.min(d.open,d.close)), up=d.close>=d.open; return <g key={i}><line x1={x} x2={x} y1={y(d.high)} y2={y(d.low)} className={up?'wick upstroke':'wick downstroke'} /><rect x={x-3.3} y={top} width="6.6" height={Math.max(2,bottom-top)} className={up?'candle upstroke':'candle downstroke'} /></g>})}{indicators.sma && <polyline points={sma20.map((v,i)=>v==null?'':`${10+i*(880/(data.length-1))},${365-(v-min)/(max-min)*330}`).filter(Boolean).join(' ')} className="line-sma" />}{indicators.ema && <polyline points={ema20.map((v,i)=>`${10+i*(880/(data.length-1))},${365-(v-min)/(max-min)*330}`).join(' ')} className="line-ema" />}{indicators.bb && <polyline points={bb.map((v,i)=>v?`${10+i*(880/(data.length-1))},${365-(v.upper-min)/(max-min)*330}`:'').filter(Boolean).join(' ')} className="line-bb" />}</svg><div className="axis"><span>{Math.round(max).toLocaleString()}</span><span>{Math.round((max+min)/2).toLocaleString()}</span><span>{Math.round(min).toLocaleString()}</span></div></div></section>
        <section className="metrics">{indicators.rsi && <Metric title="RSI (14)" value={rs.at(-1)?.toFixed(1) ?? '—'} hint={rs.at(-1)>70?'過熱圏':rs.at(-1)<30?'売られ過ぎ圏':'中立圏'} />}{indicators.macd && <Metric title="MACD" value={mc.line.at(-1).toFixed(1)} hint={mc.line.at(-1)>mc.signal.at(-1)?'シグナル上':'シグナル下'} />}<Metric title="出来高" value={(last.volume/1000).toFixed(1)+'K'} hint={symbol === 'NIKKEI225' ? '参考値' : 'デモ値'} /></section>
        <section className="detail-card"><div className="detail-title"><b>テクニカル状況</b><span>表示設定: {refresh?'ON':'OFF'}</span></div><div className="rows"><Row label="SMA20" value={Math.round(sma20.at(-1)).toLocaleString()+'円'} positive={last.close>sma20.at(-1)} /><Row label="EMA20" value={Math.round(ema20.at(-1)).toLocaleString()+'円'} positive={last.close>ema20.at(-1)} /><Row label="ボリンジャー" value={bb.at(-1)?`${Math.round(bb.at(-1).lower)} ～ ${Math.round(bb.at(-1).upper)}円`:'—'} /><Row label="総合状況" value={direction} /></div></section>
      </>}
      {tab === 'signals' && <section className="signal-page"><div className="signal-hero"><span>現在のテクニカル状況</span><b>{direction}</b><small>複数のテクニカル指標から機械的に算出した参考情報</small></div><div className="signal-grid"><Row label="SMA20" value={last.close>sma20.at(-1)?'上回る':'下回る'} positive={last.close>sma20.at(-1)} /><Row label="EMA20" value={last.close>ema20.at(-1)?'上回る':'下回る'} positive={last.close>ema20.at(-1)} /><Row label="RSI14" value={rs.at(-1).toFixed(1)} /><Row label="MACD" value={mc.line.at(-1)>mc.signal.at(-1)?'上向き':'下向き'} positive={mc.line.at(-1)>mc.signal.at(-1)} /></div><p className="signal-warning">これは売買の推奨ではありません。市場データは現在デモデータです。</p></section>}
      <div className="disclaimer"><Info size={16} /><p>本アプリの表示はテクニカル指標を用いた参考情報です。投資助言、売買推奨、利益保証を行うものではありません。現在のチャートは<strong>デモデータ</strong>です。実運用では利用許諾を満たした市場データ提供元との接続が必要です。</p></div>
      <nav className="bottom-nav"><button className={tab==='chart'?'on':''} onClick={()=>setTab('chart')}><BarChart3 size={21}/><span>チャート</span></button><button className={tab==='signals'?'on':''} onClick={()=>setTab('signals')}><TrendingUp size={21}/><span>テクニカル</span></button><button onClick={()=>setSettings(true)}><Settings size={21}/><span>設定</span></button></nav>
    </main>
    {addOpen && <div className="modal-backdrop" onClick={()=>setAddOpen(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>銘柄を追加</h2><button className="icon-btn" onClick={()=>setAddOpen(false)}><X /></button></div><label className="setting-row" style={{display:'block'}}><span>銘柄コード</span><input value={newCode} onChange={e=>setNewCode(e.target.value)} placeholder="例：7203" style={{display:'block',width:'100%',marginTop:8,padding:12,borderRadius:10,border:'1px solid #394150',background:'#11151d',color:'inherit'}} /></label><label className="setting-row" style={{display:'block'}}><span>銘柄名</span><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="例：トヨタ自動車" style={{display:'block',width:'100%',marginTop:8,padding:12,borderRadius:10,border:'1px solid #394150',background:'#11151d',color:'inherit'}} /></label><label className="setting-row" style={{display:'block'}}><span>補足名（任意）</span><input value={newSubtitle} onChange={e=>setNewSubtitle(e.target.value)} placeholder="例：トヨタ自動車株式会社" style={{display:'block',width:'100%',marginTop:8,padding:12,borderRadius:10,border:'1px solid #394150',background:'#11151d',color:'inherit'}} /></label><button className="refresh" onClick={addAsset} disabled={!newCode.trim() || !newName.trim()}><Plus size={17}/> 追加する</button><div className="setting-note">追加した銘柄はこのスマホのブラウザに保存されます。現在はチャート用のデモデータです。</div></div></div>}
    {settings && <div className="modal-backdrop" onClick={()=>setSettings(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>設定</h2><button className="icon-btn" onClick={()=>setSettings(false)}><X /></button></div>{Object.entries(assets).filter(([code])=>assets[code].type === 'custom').map(([code,e]) => <button key={code} className="setting-row" onClick={()=>removeCustomAsset(code)}><span>{code} · {e.name}</span><b>削除</b></button>)}<SettingToggle label="SMA 20" checked={indicators.sma} setChecked={v=>setIndicator('sma',v)} /><SettingToggle label="EMA 20" checked={indicators.ema} setChecked={v=>setIndicator('ema',v)} /><SettingToggle label="RSI 14" checked={indicators.rsi} setChecked={v=>setIndicator('rsi',v)} /><SettingToggle label="MACD" checked={indicators.macd} setChecked={v=>setIndicator('macd',v)} /><SettingToggle label="ボリンジャーバンド" checked={indicators.bb} setChecked={v=>setIndicator('bb',v)} /><SettingToggle label="通知" checked={notifications} setChecked={setNotifications} icon={notifications?<Bell/>:<BellOff/>}/><div className="setting-note">追加銘柄の価格・チャートは現在デモデータです。実データ接続は別途必要です。</div></div></div>}
  </div>
}

createRoot(document.getElementById('root')).render(<App />)

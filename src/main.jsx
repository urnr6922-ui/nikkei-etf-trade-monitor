import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import { Activity, Bell, BellOff, BarChart3, Info, RefreshCw, Settings, TrendingDown, TrendingUp, X } from 'lucide-react'
import './styles.css'

// Target ETFs: 1570 = NEXT FUNDS 日経平均レバレッジ・インデックス連動型上場投信
//             1360 = 日経平均ベア2倍上場投信（シンプレクス・アセット・マネジメント）
const ETF = {
  '1570': { name: '日経レバ', subtitle: 'NEXT FUNDS 日経平均レバレッジ・インデックス連動型', price: 28640, change: 420 },
  '1360': { name: '日経平均ベア2倍', subtitle: '日経平均ベア2倍上場投信', price: 69.4, change: -1.9 },
}
const TF = ['1分足', '5分足', '15分足', '日足']

function seededCandles(symbol, tf, count = 72) {
  const base = symbol === '1570' ? 28200 : 70
  const scale = tf === '1分足' ? 1 : tf === '5分足' ? 1.7 : tf === '15分足' ? 2.6 : 4.2
  let p = base
  return Array.from({ length: count }, (_, i) => {
    const wave = Math.sin(i / 7) * (symbol === '1570' ? 150 : 1.8) * scale + Math.sin(i / 3.4) * (symbol === '1570' ? 55 : 0.7) * scale
    const drift = symbol === '1570' ? i * 5.1 * scale : -i * 0.03 * scale
    const noise = Math.sin(i * 17.31) * (symbol === '1570' ? 32 : 0.35) * scale
    const close = Math.max(0.1, p + wave + drift + noise)
    const open = p
    const high = Math.max(open, close) + (symbol === '1570' ? 28 : 0.35) * scale + Math.abs(Math.sin(i * 2.1)) * (symbol === '1570' ? 55 : 0.6) * scale
    const low = Math.min(open, close) - (symbol === '1570' ? 28 : 0.35) * scale - Math.abs(Math.cos(i * 1.7)) * (symbol === '1570' ? 45 : 0.5) * scale
    const volume = 18000 + Math.abs(Math.sin(i * 0.8)) * 32000 + i * 120
    p = close
    return { open, high, low, close, volume }
  })
}
function sma(values, n) { return values.map((_, i) => i < n - 1 ? null : values.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n) }
function ema(values, n) { const k = 2 / (n + 1); let prev = values[0]; return values.map((v, i) => { if (i === 0) return prev; prev = v * k + prev * (1 - k); return prev }) }
function rsi(values, n = 14) { return values.map((_, i) => { if (i < n) return null; let gain = 0, loss = 0; for (let j = i - n + 1; j <= i; j++) { const d = values[j] - values[j - 1]; if (d >= 0) gain += d; else loss -= d } if (loss === 0) return 100; return 100 - (100 / (1 + gain / loss)) }) }
function bollinger(values, n = 20, m = 2) { return values.map((_, i) => { if (i < n - 1) return null; const a = values.slice(i - n + 1, i + 1), mean = a.reduce((x, y) => x + y, 0) / n, sd = Math.sqrt(a.reduce((x, y) => x + (y - mean) ** 2, 0) / n); return { mid: mean, upper: mean + m * sd, lower: mean - m * sd } }) }
function macd(values) { const e12 = ema(values, 12), e26 = ema(values, 26); const line = values.map((_, i) => e12[i] - e26[i]); const signal = ema(line, 9); return { line, signal, histogram: line.map((v, i) => v - signal[i]) } }

function App() {
  const [symbol, setSymbol] = useState('1570')
  const [tf, setTf] = useState('5分足')
  const [tab, setTab] = useState('chart')
  const [showSettings, setShowSettings] = useState(false)
  const [refresh, setRefresh] = useState(true)
  const [notifications, setNotifications] = useState(false)
  const [indicators, setIndicators] = useState({ sma: true, ema: true, rsi: true, macd: true, bb: true })
  const navigate = useNavigate()
  const data = useMemo(() => seededCandles(symbol, tf), [symbol, tf])
  const closes = data.map(x => x.close)
  const sma20 = sma(closes, 20), ema20 = ema(closes, 20), rs = rsi(closes), bb = bollinger(closes), mc = macd(closes)
  const last = data[data.length - 1], prev = data[data.length - 2]
  const pct = (last.close / prev.close - 1) * 100
  const technicalScore = (last.close > sma20.at(-1) ? 1 : -1) + (last.close > ema20.at(-1) ? 1 : -1) + (mc.line.at(-1) > mc.signal.at(-1) ? 1 : -1) + (rs.at(-1) < 70 ? 1 : -1)
  const signal = technicalScore >= 3 ? 'BUY' : technicalScore <= -3 ? 'SELL' : 'NEUTRAL'
  const max = Math.max(...data.map(x => x.high)), min = Math.min(...data.map(x => x.low))
  const setTabSafe = next => { setTab(next); navigate(next === 'chart' ? '/' : `/${next}`) }
  return <div className="app">
    <header className="topbar"><div className="brand"><div className="logo"><Activity size={20} /></div><div><h1>日経ETF Trade Monitor</h1><span>スマホ専用・テクニカル監視</span></div></div><button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="設定"><Settings size={21} /></button></header>
    <main>
      <section className="ticker-tabs">{Object.entries(ETF).map(([s, e]) => <button key={s} className={symbol === s ? 'ticker active' : 'ticker'} onClick={() => setSymbol(s)}><span>{s}</span><b>{e.name}</b><strong>{e.price.toLocaleString()}円</strong><em className={e.change >= 0 ? 'up' : 'down'}>{e.change >= 0 ? '▲' : '▼'} {Math.abs(e.change)}円</em></button>)}</section>
      <section className="price-card"><div><span className="eyebrow">{ETF[symbol].subtitle}</span><div className="price">{Math.round(last.close).toLocaleString()}<small>円</small></div><div className={pct >= 0 ? 'change up' : 'change down'}>{pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}% <span>前足比</span></div></div><div className={'signal ' + signal.toLowerCase()}><span>情報シグナル</span><b>{signal === 'BUY' ? '買い候補' : signal === 'SELL' ? '売り候補' : '中立'}</b><small>参考値・投資判断ではありません</small></div></section>
      {tab === 'chart' && <>
        <div className="toolbar"><div className="segmented">{TF.map(x => <button key={x} className={tf === x ? 'selected' : ''} onClick={() => setTf(x)}>{x}</button>)}</div><button className="refresh" onClick={() => setRefresh(!refresh)}><RefreshCw size={17} /> {refresh ? '自動更新 ON' : '自動更新 OFF'}</button></div>
        <section className="chart-card"><div className="chart-head"><div><b>ローソク足</b><span> · {tf} · デモデータ</span></div><div className="legend">{indicators.sma && <i>SMA20</i>}{indicators.ema && <i>EMA20</i>}{indicators.bb && <i>BB</i>}</div></div><div className="chart-wrap"><svg viewBox="0 0 900 390" preserveAspectRatio="none" className="chart">{[0, 1, 2, 3, 4].map(i => <line key={i} x1="0" x2="900" y1={40 + i * 75} y2={40 + i * 75} className="grid" />)}{data.map((d, i) => { const x = 10 + i * (880 / (data.length - 1)), y = v => 365 - (v - min) / (max - min) * 330, bodyTop = y(Math.max(d.open, d.close)), bodyBottom = y(Math.min(d.open, d.close)), up = d.close >= d.open; return <g key={i}><line x1={x} x2={x} y1={y(d.high)} y2={y(d.low)} className={up ? 'wick upstroke' : 'wick downstroke'} /><rect x={x - 3.3} y={bodyTop} width="6.6" height={Math.max(2, bodyBottom - bodyTop)} className={up ? 'candle upstroke' : 'candle downstroke'} /></g>})}{indicators.sma && <polyline points={sma20.map((v, i) => v == null ? '' : `${10 + i * (880 / (data.length - 1))},${365 - (v - min) / (max - min) * 330}`).filter(Boolean).join(' ')} className="line-sma" />}{indicators.ema && <polyline points={ema20.map((v, i) => `${10 + i * (880 / (data.length - 1))},${365 - (v - min) / (max - min) * 330}`).join(' ')} className="line-ema" />}{indicators.bb && <polyline points={bb.map((v, i) => v ? `${10 + i * (880 / (data.length - 1))},${365 - (v.upper - min) / (max - min) * 330}` : '').filter(Boolean).join(' ')} className="line-bb" />}</svg><div className="axis"><span>{Math.round(max).toLocaleString()}</span><span>{Math.round((max + min) / 2).toLocaleString()}</span><span>{Math.round(min).toLocaleString()}</span></div></div></section>
        <section className="metrics">{indicators.rsi && <Metric title="RSI (14)" value={rs.at(-1)?.toFixed(1) ?? '—'} hint={rs.at(-1) > 70 ? '過熱圏' : rs.at(-1) < 30 ? '売られ過ぎ圏' : '中立圏'} />}{indicators.macd && <Metric title="MACD" value={mc.line.at(-1).toFixed(1)} hint={mc.line.at(-1) > mc.signal.at(-1) ? 'シグナル上' : 'シグナル下'} />}<Metric title="出来高" value={(last.volume / 1000).toFixed(1) + 'K'} hint="デモ値" /></section>
        <section className="detail-card"><div className="detail-title"><b>テクニカル状況</b><span>更新: {refresh ? '自動' : '停止'}</span></div><div className="rows"><Row label="SMA20" value={Math.round(sma20.at(-1)).toLocaleString() + '円'} positive={last.close > sma20.at(-1)} /><Row label="EMA20" value={Math.round(ema20.at(-1)).toLocaleString() + '円'} positive={last.close > ema20.at(-1)} /><Row label="ボリンジャー" value={bb.at(-1) ? `${Math.round(bb.at(-1).lower)} ～ ${Math.round(bb.at(-1).upper)}円` : '—'} /><Row label="総合判定" value={signal === 'BUY' ? '買い候補' : signal === 'SELL' ? '売り候補' : '中立'} /></div></section>
      </>}
      {tab === 'signals' && <section className="signal-page"><div className="signal-hero"><span>現在の情報シグナル</span><b>{signal === 'BUY' ? '買い候補' : signal === 'SELL' ? '売り候補' : '中立'}</b><small>複数のテクニカル指標から機械的に算出した参考情報</small></div><div className="signal-grid"><Row label="SMA20" value={last.close > sma20.at(-1) ? '上回る' : '下回る'} positive={last.close > sma20.at(-1)} /><Row label="EMA20" value={last.close > ema20.at(-1) ? '上回る' : '下回る'} positive={last.close > ema20.at(-1)} /><Row label="RSI14" value={rs.at(-1).toFixed(1)} /><Row label="MACD" value={mc.line.at(-1) > mc.signal.at(-1) ? '上向き' : '下向き'} positive={mc.line.at(-1) > mc.signal.at(-1)} /></div><p className="signal-warning">これは売買の推奨ではありません。市場データは現在デモデータです。</p></section>}
      <div className="disclaimer"><Info size={16} /><p>本アプリの表示・シグナルはテクニカル指標を用いた参考情報です。投資助言、売買推奨、利益保証を行うものではありません。現在のチャートは<strong>デモデータ</strong>です。実運用では利用許諾を満たした市場データ提供元との接続が必要です。</p></div>
      <nav className="bottom-nav"><button className={tab === 'chart' ? 'on' : ''} onClick={() => setTabSafe('chart')}><BarChart3 size={21} /><span>チャート</span></button><button className={tab === 'signals' ? 'on' : ''} onClick={() => setTabSafe('signals')}><TrendingUp size={21} /><span>シグナル</span></button><button onClick={() => setShowSettings(true)}><Settings size={21} /><span>設定</span></button></nav>
    </main>
    {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-head"><h2>設定</h2><button className="icon-btn" onClick={() => setShowSettings(false)}><X /></button></div><SettingToggle label="SMA 20" checked={indicators.sma} setChecked={v => setIndicators({ ...indicators, sma: v })} /><SettingToggle label="EMA 20" checked={indicators.ema} setChecked={v => setIndicators({ ...indicators, ema: v })} /><SettingToggle label="RSI 14" checked={indicators.rsi} setChecked={v => setIndicators({ ...indicators, rsi: v })} /><SettingToggle label="MACD" checked={indicators.macd} setChecked={v => setIndicators({ ...indicators, macd: v })} /><SettingToggle label="ボリンジャーバンド" checked={indicators.bb} setChecked={v => setIndicators({ ...indicators, bb: v })} /><SettingToggle label="通知" checked={notifications} setChecked={setNotifications} icon={notifications ? <Bell /> : <BellOff />} /><div className="setting-note">通知と自動更新は、将来の認可済み市場データ接続時に拡張できます。</div></div></div>}
  </div>
}
const Metric = ({ title, value, hint }) => <div className="metric"><span>{title}</span><b>{value}</b><small>{hint}</small></div>
const Row = ({ label, value, positive }) => <div className="row"><span>{label}</span><b>{value}</b><em>{positive === undefined ? '参考' : positive ? '上向き' : '下向き'}</em></div>
function SettingToggle({ label, checked, setChecked, icon }) { return <button className="setting-row" onClick={() => setChecked(!checked)}><span>{icon || <span className={'dot ' + (checked ? 'enabled' : '')}></span>}{label}</span><span className={'switch ' + (checked ? 'on' : '')}><i /></span></button> }
createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>)

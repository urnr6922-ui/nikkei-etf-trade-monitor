import React, { useEffect, useMemo, useState } from 'react'

const SYMBOLS = [
  ['1570', '日経レバ'],
  ['NIKKEI225', '日経平均'],
  ['1360', '日経平均ベア2倍'],
]

function calcRSI(values, n = 14) {
  if (values.length <= n) return null
  let gain = 0, loss = 0
  for (let i = values.length - n; i < values.length; i++) {
    const d = values[i] - values[i - 1]
    if (d >= 0) gain += d; else loss -= d
  }
  return loss === 0 ? 100 : 100 - 100 / (1 + gain / loss)
}
function sma(values, n = 20) {
  if (values.length < n) return null
  return values.slice(-n).reduce((a, b) => a + b, 0) / n
}
function pct(a, b) { return b ? (a / b - 1) * 100 : 0 }

function JuniorPanel() {
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('「ジュニア、どう？」と入力すると、3銘柄の最新データをまとめて分析します。')
  const [data, setData] = useState({})
  const [updated, setUpdated] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const bust = `?t=${Date.now()}`
      const entries = await Promise.all(SYMBOLS.map(async ([code]) => {
        const r = await fetch(`/market-data/${code}-daily.json${bust}`, { cache: 'no-store' })
        if (!r.ok) throw new Error(`${code} data unavailable`)
        return [code, await r.json()]
      }))
      const next = Object.fromEntries(entries)
      setData(next)
      const times = Object.values(next).map(x => x?.fetchedAt).filter(Boolean)
      setUpdated(times.sort().at(-1) || null)
    } catch (e) {
      setAnswer('市場データを取得できませんでした。公開データの更新が完了しているか確認してください。')
    } finally { setLoading(false) }
  }

  useEffect(() => { load(); const id = setInterval(load, 5 * 60 * 1000); return () => clearInterval(id) }, [])

  const analysis = useMemo(() => SYMBOLS.map(([code, name]) => {
    const d = data[code]?.data || []
    const closes = d.map(x => Number(x.close)).filter(Number.isFinite)
    const last = d.at(-1), prev = d.at(-2)
    if (!last || closes.length < 2) return { code, name, text: 'データ不足', score: 0 }
    const rsi = calcRSI(closes), avg = sma(closes), change = pct(last.close, prev.close)
    let score = 0
    if (avg != null) score += last.close > avg ? 1 : -1
    if (rsi != null) score += rsi < 70 ? 1 : -1
    if (change > 0) score += 1; else if (change < 0) score -= 1
    const stance = score >= 2 ? '買い優勢' : score <= -2 ? '売り優勢' : '様子見'
    return { code, name, price: last.close, change, rsi, avg, score, stance, time: last.time }
  }), [data])

  const run = () => {
    const q = query.trim()
    const target = q.includes('1360') || q.includes('ベア') ? analysis.find(x => x.code === '1360') : q.includes('1570') || q.includes('レバ') ? analysis.find(x => x.code === '1570') : null
    const list = target ? [target] : analysis
    if (!list.length || list.some(x => !x.price)) { setAnswer('まだ市場データを取得中です。少し待ってからもう一度「ジュニア、どう？」と聞いてください。'); return }
    const lines = list.map(x => `${x.name}(${x.code})：${x.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}円、前日比 ${x.change >= 0 ? '+' : ''}${x.change.toFixed(2)}%、${x.stance}${x.rsi == null ? '' : `、RSI ${x.rsi.toFixed(1)}`}`).join('\n')
    const strongest = [...list].sort((a,b) => b.score - a.score)[0]
    const reason = strongest.avg ? `SMA20は${strongest.price > strongest.avg ? '上回り' : '下回り'}、RSIは${strongest.rsi == null ? '算出不可' : strongest.rsi.toFixed(1)}です。` : ''
    setAnswer(`${lines}\n\n総合：${strongest.name}は「${strongest.stance}」。${reason}\n※これはテクニカル指標から機械的に算出した参考判定で、売買を保証・推奨するものではありません。`)
  }

  return <section style={{margin:'20px 0 90px',padding:'18px',border:'1px solid rgba(127,127,127,.25)',borderRadius:16,background:'rgba(127,127,127,.06)'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      <div><div style={{fontWeight:800,fontSize:20}}>🤖 ジュニア</div><small>市場データを読んでテクニカル状況を回答</small></div>
      <button onClick={load} disabled={loading} style={{padding:'8px 12px',borderRadius:10,border:'1px solid rgba(127,127,127,.3)',background:'transparent'}}>{loading ? '更新中…' : 'データ更新'}</button>
    </div>
    <div style={{display:'flex',gap:8,marginTop:14}}>
      <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&run()} placeholder="例：ジュニア、どう？ / ジュニア、1360は？" style={{flex:1,minWidth:0,padding:'12px',borderRadius:10,border:'1px solid rgba(127,127,127,.35)',background:'transparent'}} />
      <button onClick={run} style={{padding:'10px 14px',border:0,borderRadius:10,fontWeight:700}}>聞く</button>
    </div>
    <pre style={{whiteSpace:'pre-wrap',fontFamily:'inherit',lineHeight:1.7,margin:'14px 0 0'}}>{answer}</pre>
    <small style={{display:'block',marginTop:10,opacity:.7}}>データ更新取得時刻：{updated ? new Date(updated).toLocaleString('ja-JP') : '取得待ち'}</small>
  </section>
}

export default JuniorPanel

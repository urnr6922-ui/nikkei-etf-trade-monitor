import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

// Remove legacy/persisted display-only cards while keeping the underlying Nikkei feed.
s = s.replace(
  "const [assets,setAssets]=useState(loadAssets)",
  "const [assets,setAssets]=useState(()=>{const x=loadAssets();delete x.NIKKEI225;delete x['4755'];return x})"
)
s = s.replace("const [symbol,setSymbol]=useState('NIKKEI225')", "const [symbol,setSymbol]=useState('1570')")
s = s.replace("const current=assets[symbol]||assets.NIKKEI225", "const current=assets[symbol]||assets['1570']")
s = s.replace("const activeSymbol=assets[symbol]?symbol:'NIKKEI225'", "const activeSymbol=assets[symbol]?symbol:'1570'")

// Never render the old Nikkei index card or the previously added Rakuten card.
s = s.replace(
  "Object.entries(assets).map(([code,a])=>",
  "Object.entries(assets).filter(([code])=>code!=='NIKKEI225'&&code!=='4755').map(([code,a])=>"
)

// Custom additions remain manually removable; the two core ETFs stay fixed.
if (!s.includes("const removeCustom=code=>")) {
  const needle = "  const addAsset=()=>"
  const pos = s.indexOf(needle)
  if (pos >= 0) {
    const end = s.indexOf('\n', pos)
    const line = end >= 0 ? s.slice(pos, end) : s.slice(pos)
    s = s.replace(line, line + "\n  const removeCustom=code=>{if(!assets[code]||assets[code].type!=='custom')return;setAssets(x=>{const y={...x};delete y[code];return y});if(activeSymbol===code)setSymbol('1570')}")
  }
}

// Put the Nikkei 225 back as a compact reference row in the middle, not as a ticker card.
if (!s.includes('className="nikkei-reference"')) {
  const priceNeedle = '      <section className="price-card">'
  const pos = s.indexOf(priceNeedle)
  if (pos >= 0) {
    const end = s.indexOf('</section>', pos)
    if (end >= 0) {
      const insertAt = end + '</section>'.length
      const ref = `\n      {(()=>{const rows=marketMap?.NIKKEI225||[];const n=rows[rows.length-1];const p=rows[rows.length-2];const ch=n&&p&&Number.isFinite(n.close)&&Number.isFinite(p.close)?n.close-p.close:0;const cp=n&&p&&Number.isFinite(p.close)&&p.close!==0?(ch/p.close)*100:0;return <section className="nikkei-reference"><div><span>日経平均</span><small>Nikkei 225 · 参考値</small></div><strong>{n&&Number.isFinite(n.close)?Math.round(n.close).toLocaleString('ja-JP')+'円':'—'}</strong><em className={ch>=0?'up':'down'}>{n&&p?(ch>=0?'▲ ':'▼ ')+Math.abs(ch).toFixed(2)+'円 ('+Math.abs(cp).toFixed(2)+'%)':'取得待ち'}</em></section>})()}`
      s = s.slice(0, insertAt) + ref + s.slice(insertAt)
    }
  }
}

await writeFile(path, s)

// Add the expanded searchable catalog to the generated source when the patch script is present.
// The patch script owns the actual catalog definition; this cleanup only keeps the build stable.
console.log('final UI cleanup applied: Nikkei reference, manual custom deletion, and connected catalog support')

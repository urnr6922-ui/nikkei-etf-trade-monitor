import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

// Remove legacy/persisted display-only cards while keeping the underlying market feeds.
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

await writeFile(path, s)
console.log('final UI cleanup applied: removed Nikkei index/Rakuten cards and kept manual custom deletion')

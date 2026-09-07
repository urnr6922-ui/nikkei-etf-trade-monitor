import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

s = s.replace(
  "const [assets,setAssets]=useState(loadAssets)",
  "const [assets,setAssets]=useState(()=>{const x=loadAssets();delete x.NIKKEI225;delete x['4755'];return x})"
)
s = s.replace("const [symbol,setSymbol]=useState('NIKKEI225')", "const [symbol,setSymbol]=useState('1570')")
s = s.replace("const current=assets[symbol]||assets.NIKKEI225", "const current=assets[symbol]||assets['1570']")
s = s.replace("const activeSymbol=assets[symbol]?symbol:'NIKKEI225'", "const activeSymbol=assets[symbol]?symbol:'1570'")

s = s.replace(
  "Object.entries(assets).map(([code,a])=>",
  "Object.entries(assets).filter(([code])=>code!=='NIKKEI225'&&code!=='4755').map(([code,a])=>"
)

if (!s.includes("const removeCustom=code=>")) {
  const needle = "  const addAsset=()=>"
  const pos = s.indexOf(needle)
  if (pos >= 0) {
    const end = s.indexOf('\n', pos)
    const line = end >= 0 ? s.slice(pos, end) : s.slice(pos)
    s = s.replace(line, line + "\n  const removeCustom=code=>{if(!assets[code]||assets[code].type!=='custom')return;setAssets(x=>{const y={...x};delete y[code];return y});if(activeSymbol===code)setSymbol('1570')}")
  }
}

const catalogBlock = `const ASSET_CATALOG = [\n  ['1570','日経レバ','NEXT FUNDS 日経平均レバレッジ・インデックス連動型'],\n  ['1360','日経平均ベア2倍','日経平均ベア2倍上場投信'],\n  ['1306','TOPIX連動型','NEXT FUNDS TOPIX連動型上場投信'],\n  ['1321','日経225連動型','NEXT FUNDS 日経225連動型上場投信'],\n  ['1671','WTI原油価格連動型','WTI原油価格連動型上場投信'],\n  ['1542','純銀上場信託','純銀上場信託（現物国内保管型）'],\n  ['2558','S&P500米国株','MAXIS米国株式（S&P500）上場投信'],\n  ['2631','NASDAQ-100','MAXISナスダック100上場投信'],\n  ['2840','S&P500','iFreeETF S&P500'],\n  ['7203','トヨタ自動車','トヨタ自動車株式会社'],\n  ['6758','ソニーグループ','ソニーグループ株式会社'],\n  ['9984','ソフトバンクグループ','ソフトバンクグループ株式会社'],\n  ['8306','三菱UFJフィナンシャル・グループ','株式会社三菱UFJフィナンシャル・グループ'],\n  ['9432','NTT','日本電信電話株式会社'],\n  ['6501','日立製作所','株式会社日立製作所'],\n  ['8035','東京エレクトロン','東京エレクトロン株式会社'],\n  ['6861','キーエンス','株式会社キーエンス'],\n  ['8058','三菱商事','三菱商事株式会社'],\n  ['5401','日本製鉄','日本製鉄株式会社'],\n  ['2914','JT','日本たばこ産業株式会社'],\n  ['4502','武田薬品工業','武田薬品工業株式会社'],\n  ['6098','リクルートホールディングス','株式会社リクルートホールディングス'],\n  ['7011','三菱重工業','三菱重工業株式会社'],\n  ['4755','楽天グループ','楽天グループ株式会社'],\n  ['8848','レオパレス21','株式会社レオパレス21'],\n]`
const catalogStart = s.indexOf('const ASSET_CATALOG = [')
if (catalogStart >= 0) {
  const catalogEnd = s.indexOf(']\n', catalogStart)
  if (catalogEnd >= 0) s = s.slice(0, catalogStart) + catalogBlock + s.slice(catalogEnd + 2)
}

// Make the ticker cards reflect the same live market feed used by the active chart.
s = s.replace('{a.price.toLocaleString()}円', '{Math.round(quoteFor(code).price).toLocaleString()}円')
s = s.replace('{Math.abs(a.change)}円</em>', '{Math.abs(quoteFor(code).change).toFixed(2)}円</em>')

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

const cssPath='src/styles.css'
let css=await readFile(cssPath,'utf8')
const extraCss=`\n.asset-search{margin:4px 0 10px}.asset-search input{width:100%;height:42px;padding:0 12px;border:1px solid #303b4d;border-radius:11px;background:#0b111a;color:#eef2f7;outline:none}.asset-search input:focus{border-color:#4a8fb7}.asset-search-results{margin-top:7px;display:grid;gap:5px;max-height:190px;overflow:auto}.asset-search-results button{display:flex;align-items:center;gap:10px;padding:9px 10px;border:1px solid #263142;border-radius:10px;background:#121a25;text-align:left}.asset-search-results button b{min-width:48px;color:#9ddcff}.asset-search-results button span{font-size:11px;color:#d2d9e2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.asset-search small{display:block;margin-top:6px;color:#7f8b9d;font-size:10px}.ticker{position:relative}.ticker-delete{position:absolute;right:7px;top:6px;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:#2b1b22;color:#fb7185;font-style:normal;font-size:15px;line-height:1;z-index:2}.technical-reasons{padding:10px 14px 4px;border-top:1px solid #202837}.technical-reasons>b{display:block;font-size:13px;margin-bottom:8px}.reason-group{margin:0 0 10px;border:1px solid #202a38;border-radius:12px;overflow:hidden;background:#0b1119}.reason-group h4{margin:0;padding:8px 10px;background:#111a26;color:#a9c8dc;font-size:11px}.reason-item{display:grid;grid-template-columns:92px 1fr;gap:8px;padding:8px 10px;border-top:1px solid #1d2633;font-size:10px;line-height:1.45}.reason-item span{color:#8794a7}.reason-item b{font-weight:600;color:#d8e0ea;word-break:break-word}.update-time{padding:6px 14px 12px;color:#778497;font-size:9px}.signal-reasons{margin-top:10px;border:1px solid #293244;border-radius:18px;background:#0d131c}.signal-hero p{margin:6px 0 0;color:#8d99aa;font-size:10px;line-height:1.5}.nikkei-reference{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:10px;margin:10px 0;padding:10px 12px;border:1px solid #263142;border-radius:12px;background:#0d141e}.nikkei-reference div{display:grid;gap:2px}.nikkei-reference span{font-size:12px;font-weight:700}.nikkei-reference small{font-size:9px;color:#7f8b9d}.nikkei-reference strong{font-size:17px}.nikkei-reference em{font-size:10px;font-style:normal;white-space:nowrap}.nikkei-reference .up{color:#63d6a0}.nikkei-reference .down{color:#ff8d9d}@media(max-width:390px){.reason-item{grid-template-columns:78px 1fr;gap:6px}.asset-search-results{max-height:165px}.nikkei-reference{grid-template-columns:1fr auto;gap:5px}.nikkei-reference em{grid-column:2;justify-self:end}}\n`
if (!css.includes('.asset-search{')) css += extraCss
await writeFile(cssPath,css)
console.log('final UI cleanup applied: searchable connected assets, live ticker prices, Nikkei reference, and manual deletion')

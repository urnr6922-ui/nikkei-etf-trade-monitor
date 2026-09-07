import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

// Keep the production pair as the primary view.
s = s.replace("useState('NIKKEI225')", "useState('1570')")
s = s.replace("setSymbol('NIKKEI225')", "setSymbol('1570')")

// Remove stale wording that labels the live chart as demo data.
s = s.replace(/ · \{tf\} · デモデータ/g, " · {tf} · {isLive?'実データ':'データ取得待ち'}")
s = s.replace(/市場データは現在デモデータです。/g, "{isLive?'取得した市場データを表示しています。':'市場データを取得できない場合はデータ取得待ちです。'}")
s = s.replace(/<strong>デモデータ<\/strong>です。実運用では利用許諾を満たした市場データ提供元との接続が必要です。/g, "<strong>{isLive?'取得した市場データ':'データ取得待ち'}</strong>です。データ提供元の利用条件に従って使用してください。")
s = s.replace("activeSymbol==='NIKKEI225'?'参考値':'デモ値'", "isLive?'実データ':'取得待ち'")

await writeFile(path, s)
console.log('Final live UI patch applied')

import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

// Keep a manually added Rakuten Group card across page refreshes and future builds.
s = s.replace(
  "const [assets,setAssets]=useState(()=>{const x=loadAssets();delete x.NIKKEI225;delete x['4755'];return x})",
  "const [assets,setAssets]=useState(()=>{const x=loadAssets();delete x.NIKKEI225;return x})"
)
s = s.replace(
  "Object.entries(assets).filter(([code])=>code!=='NIKKEI225'&&code!=='4755').map(([code,a])=>",
  "Object.entries(assets).filter(([code])=>code!=='NIKKEI225').map(([code,a])=>"
)

await writeFile(path, s)
console.log('Rakuten 4755 persistence fixed')

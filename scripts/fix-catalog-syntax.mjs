import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')
const before = s
s = s.replace(/(const ASSET_CATALOG = \[[\s\S]*?\])\s*function App\(\)/, '$1;\n\nfunction App()')
if (s !== before) await writeFile(path, s)
console.log('normalized asset catalog declaration syntax')

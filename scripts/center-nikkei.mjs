import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/styles.css'
let css = await readFile(path, 'utf8')
const centered = `\n/* Center the Nikkei 225 reference display on mobile. */\n.nikkei-reference{display:flex!important;align-items:center!important;justify-content:center!important;gap:14px!important;text-align:center!important;flex-wrap:wrap!important}.nikkei-reference div{display:grid;justify-items:center;gap:2px}.nikkei-reference em{white-space:nowrap}\n`
if (!css.includes('/* Center the Nikkei 225 reference display on mobile. */')) css += centered
await writeFile(path, css)
console.log('centered Nikkei 225 reference display')

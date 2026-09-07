import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

// Move the market-data update timestamp into the compact Nikkei 225 reference area.
s = s.replace(/\s*<div className="update-time">更新[^<]*<\/div>/g, '')
s = s.replace(
  /(<section className="nikkei-reference">[\s\S]*?<em className=\{ch>=0\?'up':'down'\}>[\s\S]*?<\/em>)/,
  '$1<small className="nikkei-updated">更新: {updatedAt}</small>'
)

await writeFile(path, s)

const cssPath = 'src/styles.css'
let css = await readFile(cssPath, 'utf8')
if (!css.includes('.nikkei-updated')) {
  css += '\n.nikkei-updated{grid-column:1/-1;color:#778497;font-size:9px;text-align:right;margin-top:1px}\n'
}
await writeFile(cssPath, css)
console.log('moved market update time into Nikkei reference')

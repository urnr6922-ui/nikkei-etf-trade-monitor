import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

const base = 'https://urnr6922-ui.github.io/nikkei-etf-trade-monitor/market-data/'

s = s.replace("fetch('./market-data/' + file + '?ts=' + Date.now(), {cache:'no-store'})", "fetch('" + base + "' + file + '?ts=' + Date.now(), {cache:'no-store'})")
s = s.replace("fetch('./market-data/global.json?ts=' + Date.now(), {cache:'no-store'})", "fetch('" + base + "global.json?ts=' + Date.now(), {cache:'no-store'})")

await writeFile(path, s)
console.log('Shared market-data source configured:', base)

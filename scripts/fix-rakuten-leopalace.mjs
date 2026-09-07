import { readFile, writeFile } from 'node:fs/promises'

const path='src/main.jsx'
let s=await readFile(path,'utf8')
s=s.replace("'1360': { name: '日経平均ベア2倍', subtitle: '日経平均ベア2倍上場投信', price: 69.4, change: -1.9, type: 'etf' },", "'1360': { name: '日経平均ベア2倍', subtitle: '日経平均ベア2倍上場投信', price: 69.4, change: -1.9, type: 'etf' },\n  '4755': { name: '楽天グループ', subtitle: '楽天グループ株式会社', price: 1000, change: 0, type: 'stock' },\n  '8848': { name: 'レオパレス21', subtitle: '株式会社レオパレス21', price: 1000, change: 0, type: 'stock' },")
s=s.replace(".filter(([code])=>code!=='NIKKEI225'&&code!=='4755')", ".filter(([code])=>code!=='NIKKEI225')")
await writeFile(path,s)

const cssPath='src/styles.css'
let css=await readFile(cssPath,'utf8')
if(!css.includes('.nikkei-updated{font-size:11px')) css=css.replace('.nikkei-reference strong{font-size:17px}', '.nikkei-reference strong{font-size:17px}.nikkei-updated{font-size:11px!important;line-height:1.3}')
await writeFile(cssPath,css)
console.log('added Rakuten/Leopalace cards and enlarged Nikkei update time')

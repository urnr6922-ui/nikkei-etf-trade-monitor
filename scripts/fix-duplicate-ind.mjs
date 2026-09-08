import { readFile, writeFile } from 'node:fs/promises'
const path='src/main.jsx'
let s=await readFile(path,'utf8')
const re=/,\[ind,setInd\]=useState\(\{sma:true,ema:true,bb:true,rsi:true,macd:true\}\)/g
let first=true
s=s.replace(re,m=>{if(first){first=false;return m}return ''})
await writeFile(path,s)
console.log('Removed duplicate indicator state declarations')

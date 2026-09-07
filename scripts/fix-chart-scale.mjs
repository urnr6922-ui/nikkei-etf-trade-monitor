import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

// Keep the visible price scale centered on the actual candles instead of forcing zero into the range.
s = s.replace(
  "const pp=bars.flatMap(x=>[x.high,x.low]).filter(Number.isFinite),max=Math.max(...pp,1),min=Math.min(...pp,0),range=Math.max(max-min,1)",
  "const pp=bars.flatMap(x=>[x.high,x.low]).filter(Number.isFinite),rawMax=Math.max(...pp,1),rawMin=Math.min(...pp,1),pad=Math.max((rawMax-rawMin)*0.08,1),max=rawMax+pad,min=Math.max(0,rawMin-pad),range=Math.max(max-min,1)"
)

// Use timestamp-aligned aggregation for intraday charts so 5m/15m candles do not depend on array position.
s = s.replace(
  "function agg(a,n){if(n===1)return a;const out=[];for(let i=0;i<a.length;i+=n){const g=a.slice(i,i+n);if(!g.length)continue;out.push({time:g[0].time,open:g[0].open,high:Math.max(...g.map(x=>x.high)),low:Math.min(...g.map(x=>x.low)),close:g[g.length-1].close,volume:g.reduce((s,x)=>s+x.volume,0)})}return out}",
  "function agg(a,n){if(n===1)return a;const groups=new Map();for(const x of a){const bucket=Math.floor(x.time/(n*60))*(n*60);const g=groups.get(bucket)||[];g.push(x);groups.set(bucket,g)}return [...groups.entries()].sort((a,b)=>a[0]-b[0]).map(([time,g])=>({time,open:g[0].open,high:Math.max(...g.map(x=>x.high)),low:Math.min(...g.map(x=>x.low)),close:g[g.length-1].close,volume:g.reduce((sum,x)=>sum+x.volume,0)}))}"
)

await writeFile(path, s)
console.log('Fixed chart scale and timestamp-aligned intraday aggregation')

import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

// Persist display/settings choices in the browser so a page refresh does not reset them.
s = s.replace(
  "const [refresh,setRefresh]=useState(true),[notifications,setNotifications]=useState(false)",
  "const [refresh,setRefresh]=useState(()=>{try{return JSON.parse(localStorage.getItem('nikkei-monitor-display')??'true')}catch{return true}}),[notifications,setNotifications]=useState(()=>{try{return JSON.parse(localStorage.getItem('nikkei-monitor-notifications')??'false')}catch{return false}})"
)
s = s.replace(
  "const [indicators,setIndicators]=useState({sma:true,ema:true,rsi:true,macd:true,bb:true})",
  "const [indicators,setIndicators]=useState(()=>{try{return {...{sma:true,ema:true,rsi:true,macd:true,bb:true},...JSON.parse(localStorage.getItem('nikkei-monitor-indicators')||'{}')}}catch{return {sma:true,ema:true,rsi:true,macd:true,bb:true}}})"
)

if (!s.includes("nikkei-monitor-indicators")) throw new Error('indicator state replacement failed')

s = s.replace(
  "  useEffect(()=>saveAssets(assets),[assets])",
  "  useEffect(()=>saveAssets(assets),[assets])\n  useEffect(()=>{try{localStorage.setItem('nikkei-monitor-display',JSON.stringify(refresh));localStorage.setItem('nikkei-monitor-notifications',JSON.stringify(notifications));localStorage.setItem('nikkei-monitor-indicators',JSON.stringify(indicators))}catch{}},[refresh,notifications,indicators])"
)

// Display ON/OFF now actually controls the visual indicator layers and metric cards.
s = s.replace(/indicators\.sma&&/g, "refresh&&indicators.sma&&")
s = s.replace(/indicators\.ema&&/g, "refresh&&indicators.ema&&")
s = s.replace(/indicators\.rsi&&/g, "refresh&&indicators.rsi&&")
s = s.replace(/indicators\.macd&&/g, "refresh&&indicators.macd&&")
s = s.replace(/indicators\.bb&&/g, "refresh&&indicators.bb&&")

await writeFile(path, s)
console.log('settings persistence and display ON/OFF applied')

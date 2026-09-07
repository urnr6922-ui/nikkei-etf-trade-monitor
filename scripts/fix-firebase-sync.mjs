import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

if (!s.includes("from 'firebase/auth'")) {
  s = s.replace(
    "import { Activity, BarChart3, Bell, BellOff, Info, Plus, RefreshCw, Settings, TrendingUp, X } from 'lucide-react'",
    "import { Activity, BarChart3, Bell, BellOff, Info, Plus, RefreshCw, Settings, TrendingUp, X } from 'lucide-react'\nimport { auth, db, googleProvider } from './firebase'\nimport { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'\nimport { doc, getDoc, setDoc } from 'firebase/firestore'"
  )
}

const stateNeedle = "  const [assets,setAssets]=useState(loadAssets)"
const syncState = `  const [assets,setAssets]=useState(loadAssets)\n  const [user,setUser]=useState(null)\n  const [syncReady,setSyncReady]=useState(false)\n  const [syncStatus,setSyncStatus]=useState('未接続')`
if (!s.includes('const [user,setUser]')) s = s.replace(stateNeedle, syncState)

const localEffects = "  useEffect(()=>saveAssets(assets),[assets])"
const syncEffects = `  useEffect(()=>saveAssets(assets),[assets])\n  useEffect(()=>onAuthStateChanged(auth,async u=>{setUser(u);setSyncReady(false);if(!u){setSyncStatus('未接続');return}try{const snap=await getDoc(doc(db,'users',u.uid));if(snap.exists()){const d=snap.data();if(d.assets&&typeof d.assets==='object')setAssets(x=>({...x,...d.assets}));if(d.refresh!==undefined)setRefresh(Boolean(d.refresh));if(d.notifications!==undefined)setNotifications(Boolean(d.notifications));if(d.indicators&&typeof d.indicators==='object')setIndicators(x=>({...x,...d.indicators}));setSyncStatus('同期済み')}else setSyncStatus('クラウド保存を開始');}catch{setSyncStatus('同期エラー')}finally{setSyncReady(true)}}),[])\n  useEffect(()=>{if(!user||!syncReady)return;const timer=setTimeout(()=>setDoc(doc(db,'users',user.uid),{assets,refresh,notifications,indicators,updatedAt:new Date().toISOString()},{merge:true}).then(()=>setSyncStatus('同期済み')).catch(()=>setSyncStatus('同期エラー')),350);return()=>clearTimeout(timer)},[user,syncReady,assets,refresh,notifications,indicators])\n  const signIn=()=>signInWithPopup(auth,googleProvider).catch(()=>setSyncStatus('ログイン失敗'))\n  const signOutUser=()=>signOut(auth).catch(()=>setSyncStatus('ログアウト失敗'))`
if (!s.includes("onAuthStateChanged(auth")) s = s.replace(localEffects, syncEffects)

const topNeedle = '<button className="icon-btn" onClick={()=>setSettings(true)} aria-label="設定"><Settings size={21}/></button>'
const topNew = `${topNeedle}<button className="refresh" onClick={user?signOutUser:signIn} style={{marginLeft:8}}>{user?'同期中 · ログアウト':'Googleで同期'}</button>`
if (!s.includes('Googleで同期')) s = s.replace(topNeedle, topNew)

const disclaimerNeedle = '<div className="disclaimer"><Info size={16}/><p>'
if (!s.includes('クラウド同期')) {
  s = s.replace(disclaimerNeedle, '<div className="disclaimer"><Info size={16}/><p>クラウド同期: <strong>{user?`${user.displayName||user.email||\'ログイン済み\'} / ${syncStatus}`:\'未ログイン（この端末のみ保存）\'}</strong></p></div>\n      ' + disclaimerNeedle)
}

s = s.replace('追加した銘柄はこのスマホのブラウザに保存されます。現在はチャート用のデモデータです。', '追加した銘柄と表示設定はGoogleでログインするとクラウドに同期されます。ログインしない場合はこの端末だけに保存されます。')
s = s.replace('追加銘柄の価格・チャートは現在デモデータです。実データ接続は別途必要です。', '追加銘柄と表示設定はGoogleでログインすると端末間で同期されます。株価データの更新とは別の仕組みです。')

await writeFile(path, s)
console.log('Firebase cloud sync patched')

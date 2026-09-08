import { readFile, writeFile, rename, access } from 'node:fs/promises'

// 正式対象は日経平均ベア2倍ETF「1357」。旧実装の1360表記をビルド時に安全に置換する。
const replaceAll = async path => {
  const text = await readFile(path, 'utf8')
  const next = text.replaceAll('1360', '1357')
  if (next !== text) await writeFile(path, next)
}

for (const path of ['src/main.jsx', 'scripts/build-junior-json.mjs']) {
  try { await replaceAll(path) } catch {}
}

for (const suffix of ['', '-daily']) {
  const oldPath = `public/market-data/1360${suffix}.json`
  const newPath = `public/market-data/1357${suffix}.json`
  try {
    await access(oldPath)
    await rename(oldPath, newPath)
    await replaceAll(newPath)
  } catch {}
}

console.log('Fixed Nikkei bear 2x ETF symbol: 1360 -> 1357')

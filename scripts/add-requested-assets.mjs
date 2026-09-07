import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')

const additions = [
  "  ['4755','楽天グループ','楽天グループ株式会社'],",
  "  ['8848','レオパレス21','株式会社レオパレス21'],",
]

const marker = "  ['7011','三菱重工業','三菱重工業株式会社'],"
if (s.includes('const ASSET_CATALOG = [')) {
  for (const line of additions) {
    const code = line.match(/\['(\d+)'/)[1]
    if (!s.includes(`['${code}',`)) s = s.replace(marker, `${marker}\n${line}`)
  }
}

await writeFile(path, s)
console.log('requested assets added: 4755 Rakuten Group, 8848 Leopalace21')

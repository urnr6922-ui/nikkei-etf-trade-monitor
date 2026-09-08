import fs from 'node:fs'
const path = 'src/main.jsx'
let s = fs.readFileSync(path, 'utf8')
if (!s.includes("import JuniorPanel from './JuniorPanel.jsx'")) {
  s = s.replace("import './styles.css'", "import './styles.css'\nimport JuniorPanel from './JuniorPanel.jsx'")
}
if (!s.includes('<JuniorPanel />')) {
  const marker = '</main>'
  const i = s.lastIndexOf(marker)
  if (i === -1) throw new Error('main closing tag not found')
  s = s.slice(0, i) + '      <JuniorPanel />\n    ' + s.slice(i)
}
fs.writeFileSync(path, s)
console.log('Junior panel patched')

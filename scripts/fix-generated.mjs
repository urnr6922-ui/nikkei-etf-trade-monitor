import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/main.jsx'
let s = await readFile(path, 'utf8')
// The generated patch may contain literal backslash-n sequences. Normalize them
// before Vite parses the JSX source.
s = s.replace(/\\n/g, '\n')
await writeFile(path, s)
console.log('normalized generated source escapes')

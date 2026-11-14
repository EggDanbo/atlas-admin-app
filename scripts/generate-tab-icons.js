const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const DIR = path.resolve(__dirname, '..', 'src', 'assets', 'images', 'tab')
const ICONS = ['home', 'mine']
const COLORS = { '': '#999999', '-active': '#2d8cf0' }

for (const name of ICONS) {
  for (const [suffix, color] of Object.entries(COLORS)) {
    const svgPath = path.join(DIR, `${name}.svg`)
    const svg = fs.readFileSync(svgPath, 'utf-8').replace(/COLOR/g, color)
    const tmpSvg = path.join(DIR, `_tmp${suffix}.svg`)
    const outPng = path.join(DIR, `${name}${suffix}.png`)
    fs.writeFileSync(tmpSvg, svg)
    execSync(`npx sharp-cli --input "${tmpSvg}" --output "${outPng}" resize 81 81`, { stdio: 'pipe' })
    fs.unlinkSync(tmpSvg)
    console.log(`${name}${suffix}.png - ${fs.statSync(outPng).size} bytes`)
  }
}
console.log('Done!')

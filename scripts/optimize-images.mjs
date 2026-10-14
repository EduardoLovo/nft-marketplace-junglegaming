// Gera as artes dos NFTs em WebP responsivo a partir dos PNGs exportados do Figma.
// Uso: node scripts/optimize-images.mjs <pasta-com-os-pngs-do-figma>
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

// Hash da imagem no arquivo .fig -> nome público da arte.
const ARTWORKS = {
  '2986a7cb16d09de8970824d2dd58bf0bb021702c': 'ape-violet',
  '8459204731e6eba9d474cbc8ebc37071360d3ba5': 'ape-emerald',
  '87580f2def9af0ce13f4b6f6ce17bb2449bcfc16': 'ape-golden',
  '9df2ff42dd27ba657621c304557d1a855a4be6a5': 'ape-ivory',
}
// Cobre o card mobile (~180px a 2x), o card desktop (258px a 2x) e o detalhe.
const WIDTHS = [320, 640, 960]

const sourceDir = process.argv[2]
if (!sourceDir) {
  console.error('Informe a pasta com os PNGs exportados do Figma.')
  process.exit(1)
}
const outDir = path.resolve('public/images/nfts')
await mkdir(outDir, { recursive: true })

for (const [hash, name] of Object.entries(ARTWORKS)) {
  const input = path.join(sourceDir, `${hash}.png`)
  for (const width of WIDTHS) {
    const output = path.join(outDir, `${name}-${width}.webp`)
    const info = await sharp(input).resize(width, width).webp({ quality: 78, effort: 6 }).toFile(output)
    console.log(`${path.basename(output)}  ${(info.size / 1024).toFixed(1)} kB`)
  }
}

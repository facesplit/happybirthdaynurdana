// Разрезает assets/.../ПодДеревомПара.png (2x2 пары) на 4 сезонные пары
// и удаляет бежевый фон заливкой от краёв (region-growing по соседям —
// следует за градиентом фона, но останавливается на контуре персонажей).
// Запуск: npm run couples
import sharp from 'sharp'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'public', 'sprites')
const norm = (s) => s.normalize('NFC')

const TOL = Number(process.env.TOL || 46) // порог похожести цвета (фон близок к модели)

// quadrant -> сезон
const MAP = [
  { col: 0, row: 0, name: 'couple-spring' },
  { col: 1, row: 0, name: 'couple-summer' },
  { col: 0, row: 1, name: 'couple-autumn' },
  { col: 1, row: 1, name: 'couple-winter' },
]

async function findSrc() {
  const d = path.join(ROOT, 'assets', 'stardew valley окно')
  const f = (await fs.readdir(d)).find((x) => norm(x).includes('ПодДеревом'))
  if (!f) throw new Error('ПодДеревомПара.png не найден')
  return path.join(d, f)
}

// средний цвет патча вокруг (cx,cy)
function patchAvg(data, W, H, cx, cy, rad = 12) {
  let r = 0, g = 0, b = 0, n = 0
  for (let y = cy - rad; y <= cy + rad; y++) {
    for (let x = cx - rad; x <= cx + rad; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue
      const p = (y * W + x) * 4
      r += data[p]; g += data[p + 1]; b += data[p + 2]; n++
    }
  }
  return [r / n, g / n, b / n]
}

function removeBg(data, W, H) {
  // модель фона — билинейная интерполяция цветов 4 углов
  const TL = patchAvg(data, W, H, 12, 12)
  const TR = patchAvg(data, W, H, W - 12, 12)
  const BL = patchAvg(data, W, H, 12, H - 12)
  const BR = patchAvg(data, W, H, W - 12, H - 12)
  const model = (x, y) => {
    const u = x / (W - 1), v = y / (H - 1)
    const top = [0, 1, 2].map((k) => TL[k] * (1 - u) + TR[k] * u)
    const bot = [0, 1, 2].map((k) => BL[k] * (1 - u) + BR[k] * u)
    return [0, 1, 2].map((k) => top[k] * (1 - v) + bot[k] * v)
  }

  // кандидаты фона: близки к модели в своей точке
  const cand = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, p = i * 4
      const m = model(x, y)
      const dr = data[p] - m[0], dg = data[p + 1] - m[1], db = data[p + 2] - m[2]
      if (dr * dr + dg * dg + db * db < TOL * TOL) cand[i] = 1
    }
  }

  // заливка от края ТОЛЬКО по кандидатам -> настоящий фон (тело пары — барьер)
  const bg = new Uint8Array(W * H)
  const stack = []
  const seed = (x, y) => { const i = y * W + x; if (cand[i] && !bg[i]) { bg[i] = 1; stack.push(i) } }
  for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1) }
  for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y) }
  while (stack.length) {
    const i = stack.pop()
    const x = i % W, y = (i / W) | 0
    const nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]
    for (const [nx, ny] of nb) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
      const ni = ny * W + nx
      if (cand[ni] && !bg[ni]) { bg[ni] = 1; stack.push(ni) }
    }
  }

  let minX = W, minY = H, maxX = 0, maxY = 0
  for (let i = 0; i < W * H; i++) {
    if (bg[i]) { data[i * 4 + 3] = 0; continue }
    const x = i % W, y = (i / W) | 0
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}

async function main() {
  await fs.mkdir(OUT, { recursive: true })

  // чистое лицо рассказчика (без рамки) -> public/photos/portrait-face.webp
  const dlgDir = path.join(ROOT, 'assets', 'stardew valley окно')
  const files = await fs.readdir(dlgDir)
  const shot = files.find((f) => norm(f).includes('Снимок'))
  if (shot) {
    const m = await sharp(path.join(dlgDir, shot)).metadata()
    const inset = Math.round(Math.min(m.width, m.height) * 0.1)
    await sharp(path.join(dlgDir, shot))
      .extract({ left: inset, top: inset, width: m.width - inset * 2, height: m.height - inset * 2 })
      .resize(300, 300, { fit: 'cover', position: 'top' }).webp({ quality: 90 })
      .toFile(path.join(ROOT, 'public', 'photos', 'portrait-face.webp'))
    console.log('✓ photos/portrait-face.webp')
  }

  const src = await findSrc()
  const meta = await sharp(src).metadata()
  const qw = Math.floor(meta.width / 2)
  const qh = Math.floor(meta.height / 2)

  for (const q of MAP) {
    const { data, info } = await sharp(src)
      .extract({ left: q.col * qw, top: q.row * qh, width: qw, height: qh })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const box = removeBg(data, info.width, info.height)
    const pad = 8
    const left = Math.max(0, box.minX - pad)
    const top = Math.max(0, box.minY - pad)
    const w = Math.min(info.width - left, box.maxX - box.minX + pad * 2)
    const h = Math.min(info.height - top, box.maxY - box.minY + pad * 2)

    const cropped = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .extract({ left, top, width: w, height: h })
      .png()
      .toBuffer()
    // второй проход — плотный trim прозрачных полей
    await sharp(cropped).trim({ threshold: 12 }).png().toFile(path.join(OUT, `${q.name}.png`))
    console.log(`✓ ${q.name}.png`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })

// Догрузка спрайтов Stardew Valley для ЛОКАЛЬНОГО (личного) использования.
// Запуск: npm run sprites
//
// ВАЖНО (лицензия): спрайты Stardew Valley — © ConcernedApe. Это НЕ CC0.
// Их можно держать локально для личного, непубличного подарка, но НЕ стоит
// коммитить в публичный репозиторий / публиковать на GitHub Pages.
// Поэтому папка public/sprites/ добавлена в .gitignore: если репозиторий
// клонируют без спрайтов, сайт автоматически откатывается на оригинальный
// векторный арт (см. tree.js / main.js — «умная подмена»).
import sharp from 'sharp'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'public', 'sprites')
const BASE = 'https://stardewvalleywiki.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

// исходные файлы на вики -> локальные имена
const FILES = [
  ['/mediawiki/images/b/b3/Chest.png', 'chest.png'],
  ['/mediawiki/images/d/d3/Oak_Stage_5.png', 'tree-oak.png'], // 4-сезонная лента дуба
  ['/mediawiki/images/5/5d/House_%28tier_2%29.png', 'house.png'],
  ['/mediawiki/images/3/35/Tulip_Stage_3.png', 'flower-tulip.png'],
  ['/mediawiki/images/2/2f/Blue_Jazz.png', 'flower-jazz.png'],
  ['/mediawiki/images/3/30/Sunflower_Stage_4.png', 'flower-sunflower.png'],
  // (трава НЕ скачивается — генерится процедурно в src/ground.js;
  //  сезонные пары вырезаются скриптом scripts/process-couples.js)
]

async function download(urlPath, name) {
  const res = await fetch(BASE + urlPath, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status} для ${urlPath}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await fs.writeFile(path.join(OUT, name), buf)
  console.log(`✓ ${name} (${buf.length}b)`)
}

// нарезка 4-сезонной ленты дуба на отдельные кадры
async function sliceTree() {
  const src = path.join(OUT, 'tree-oak.png')
  const meta = await sharp(src).metadata()
  const fw = meta.width / 4
  const names = ['tree-spring', 'tree-summer', 'tree-fall', 'tree-winter']
  for (let i = 0; i < 4; i++) {
    const left = Math.round(i * fw)
    const width = Math.round((i + 1) * fw) - left
    await sharp(src)
      .extract({ left, top: 0, width, height: meta.height })
      .trim({ threshold: 10 })
      .png()
      .toFile(path.join(OUT, `${names[i]}.png`))
    console.log(`✓ ${names[i]}.png`)
  }
}

async function main() {
  await fs.mkdir(OUT, { recursive: true })
  for (const [u, n] of FILES) await download(u, n)
  await sliceTree()
  console.log('\nГотово. Спрайты Stardew лежат в public/sprites (только для локального показа).')
}

main().catch((e) => { console.error('Ошибка:', e.message); process.exit(1) })

// Обработка фото: оригиналы + аниме-версии -> WebP (max 1200px, q80) + крошечный LQIP base64.
// Запуск: npm run photos
//
// Скрипт сам находит папки ассетов и матчит файлы через normalize('NFC'),
// потому что на Windows кириллические имена приходят в NFD и прямое сравнение строк ломается.
import sharp from 'sharp'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const ASSETS = path.join(ROOT, 'assets')
const OUT_DIR = path.join(ROOT, 'public', 'photos')

const norm = (s) => s.normalize('NFC')

// Маппинг по главам: slug -> базовое имя (без суффикса "ориг" и расширения).
const MAP = [
  { slug: 'spring-1', base: 'ВеснаПервоеСовместноефото' },
  { slug: 'spring-2', base: 'Весна_фото_с_фотоаппарата' },
  { slug: 'spring-3', base: 'Весна_ночь' },
  { slug: 'spring-4', base: 'Весна2годГодЗнакомства' },
  { slug: 'autumn-1', base: 'Осень_на_улице' },
  { slug: 'autumn-2', base: 'Фото_вуниверситете_осень' },
  { slug: 'autumn-3', base: 'Фото_глаза_осень' },
  { slug: 'winter-1', base: 'Пол_годаотношений_зима' },
]

async function findDir(substr) {
  const entries = await fs.readdir(ASSETS, { withFileTypes: true })
  const hit = entries.find((e) => e.isDirectory() && norm(e.name).includes(substr))
  if (!hit) throw new Error(`Не нашёл папку, содержащую "${substr}" в ${ASSETS}`)
  return path.join(ASSETS, hit.name)
}

// Находит в каталоге файл, чьё имя (без расширения, NFC) начинается с base.
async function findFile(dir, base) {
  const files = await fs.readdir(dir)
  const want = norm(base)
  const hit = files.find((f) => {
    const stem = norm(path.parse(f).name)
    return stem === want || stem === want + 'ориг'
  })
  return hit ? path.join(dir, hit) : null
}

async function toWebp(srcPath, outPath) {
  await sharp(srcPath)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(outPath)
}

async function lqip(srcPath) {
  const buf = await sharp(srcPath)
    .rotate()
    .resize(20, 20, { fit: 'inside' })
    .webp({ quality: 40 })
    .toBuffer()
  return `data:image/webp;base64,${buf.toString('base64')}`
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  const origDir = await findDir('Оригинал')
  const animeDir = await findDir('Аниме')
  console.log('orig :', path.relative(ROOT, origDir))
  console.log('anime:', path.relative(ROOT, animeDir))

  const manifest = {}
  for (const item of MAP) {
    const entry = { slug: item.slug }

    const origSrc = await findFile(origDir, item.base)
    if (origSrc) {
      await toWebp(origSrc, path.join(OUT_DIR, `${item.slug}.webp`))
      entry.original = `photos/${item.slug}.webp`
      entry.lqip = await lqip(origSrc)
      console.log(`✓ ${item.slug}.webp`)
    } else {
      console.warn(`! missing original for ${item.slug} (${item.base})`)
    }

    const animeSrc = await findFile(animeDir, item.base)
    if (animeSrc) {
      await toWebp(animeSrc, path.join(OUT_DIR, `${item.slug}-anime.webp`))
      entry.anime = `photos/${item.slug}-anime.webp`
      console.log(`✓ ${item.slug}-anime.webp`)
    } else {
      console.warn(`! missing anime for ${item.slug} (${item.base})`)
    }

    manifest[item.slug] = entry
  }

  await fs.writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
  console.log('\n✓ manifest.json ->', path.relative(ROOT, path.join(OUT_DIR, 'manifest.json')))

  // портрет рассказчика (его фото в Stardew-рамке) для диалогового окна
  try {
    const sdir = await findDir('окно')
    const files = await fs.readdir(sdir)
    const shot = files.find((f) => norm(f).includes('Снимок'))
    if (shot) {
      await sharp(path.join(sdir, shot))
        .rotate().resize(320, 320, { fit: 'cover', position: 'top' }).webp({ quality: 88 })
        .toFile(path.join(OUT_DIR, 'portrait-me.webp'))
      console.log('✓ portrait-me.webp')
    }
  } catch (e) { console.warn('! портрет не собран:', e.message) }

  // её обычные фото (бонус)
  try {
    const her = await findDir('обычные')
    const hf = (await fs.readdir(her)).filter((f) => /jpe?g$/i.test(f)).sort()
    for (let i = 0; i < hf.length; i++) {
      await sharp(path.join(her, hf[i]))
        .rotate().resize({ width: 1000, height: 1000, fit: 'inside' }).webp({ quality: 82 })
        .toFile(path.join(OUT_DIR, `nurdana-${i + 1}.webp`))
      console.log(`✓ nurdana-${i + 1}.webp`)
    }
  } catch (e) { console.warn('! её фото не собраны:', e.message) }
}

main().catch((e) => { console.error(e); process.exit(1) })

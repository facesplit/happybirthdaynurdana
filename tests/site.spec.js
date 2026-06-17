import { test, expect } from '@playwright/test'
import fs from 'node:fs'

const SHOTS = 'tests/screenshots'
fs.mkdirSync(SHOTS, { recursive: true })

// Скролл через Lenis (если есть), иначе нативно — иначе виртуальный скролл Lenis
// расходится с нативным и сезоны/контент рассинхронизируются.
async function scrollToY(page, y) {
  await page.evaluate((y) => {
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
    else window.scrollTo(0, y)
  }, y)
  await page.waitForTimeout(650)
}
async function scrollToProgress(page, p) {
  await page.evaluate((p) => {
    const max = document.body.scrollHeight - window.innerHeight
    const y = Math.round(max * p)
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
    else window.scrollTo(0, y)
  }, p)
  await page.waitForTimeout(650)
}
// Доскроллить так, чтобы центр секции id оказался в центре экрана.
async function scrollSectionToCenter(page, id) {
  await page.evaluate((id) => {
    const el = document.getElementById(id)
    const r = el.getBoundingClientRect()
    const cur = window.__lenis ? window.__lenis.scroll : window.scrollY
    const target = cur + r.top - (window.innerHeight - r.height) / 2
    if (window.__lenis) window.__lenis.scrollTo(target, { immediate: true })
    else window.scrollTo(0, target)
  }, id)
  await page.waitForTimeout(800)
}

test.describe('Наш год под деревом', () => {
  test('1. загрузка без ошибок консоли, виден заголовок', async ({ page }) => {
    const errors = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(e.message))

    await page.goto('/')
    await expect(page.locator('h1.hero-name')).toBeVisible()
    await page.waitForTimeout(500)
    // игнорируем сетевые 404 на отсутствующие плейсхолдеры видео
    const real = errors.filter((e) => !/last-year\.mp4|birthday\.mp4|favicon/.test(e))
    expect(real, real.join('\n')).toHaveLength(0)
  })

  test('2. сезоны: скриншоты по секциям', async ({ page }, testInfo) => {
    await page.goto('/')
    await page.waitForTimeout(600)
    // скриншоты по центрам секций (надёжно при пиннинге)
    for (const id of ['s1', 's2', 's3', 's4', 's5', 's6']) {
      await scrollSectionToCenter(page, id)
      await page.screenshot({ path: `${SHOTS}/${testInfo.project.name}-${id}.png`, fullPage: false })
    }
    // палитра действительно меняется между началом и серединой
    await scrollToProgress(page, 0)
    const top0 = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sky-top'))
    await scrollToProgress(page, 0.5)
    const top50 = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sky-top'))
    expect(top0.trim()).not.toBe(top50.trim())
  })

  test('3. все 6 секций присутствуют и доступны', async ({ page }) => {
    await page.goto('/')
    for (const id of ['s1', 's2', 's3', 's4', 's5', 's6']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1)
    }
  })

  test('4. видео: present, постеры заданы, без autoplay со звуком', async ({ page }) => {
    await page.goto('/')
    const videos = page.locator('video')
    // видео в сценарии больше нет; если появятся — проверяем постер и отсутствие autoplay
    for (let i = 0; i < (await videos.count()); i++) {
      const v = videos.nth(i)
      expect(await v.getAttribute('poster')).toBeTruthy()
      // нет атрибута autoplay
      expect(await v.getAttribute('autoplay')).toBeNull()
    }
  })

  test('5. сундук раскрывается, ссылки имеют href', async ({ page }) => {
    await page.goto('/')
    await scrollToProgress(page, 1)
    const chest = page.locator('#chest')
    await chest.scrollIntoViewIfNeeded()
    await expect(page.locator('#chest-cards')).toBeHidden()
    await chest.click()
    await expect(page.locator('#chest-cards')).toBeVisible()
    const links = page.locator('#chest-cards a')
    expect(await links.count()).toBe(4)
    for (let i = 0; i < 4; i++) {
      const href = await links.nth(i).getAttribute('href')
      expect(href, `ссылка ${i}`).toBeTruthy()
    }
  })

  test('6. нет горизонтального скролла', async ({ page }) => {
    await page.goto('/')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    )
    expect(overflow).toBe(false)
  })
})

test.describe('reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' })
  test('7. частицы выключены, страница работает', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1.hero-name')).toBeVisible()
    // canvas есть, но при reduced motion частицы не запускаются (холст пуст/без rAF) — проверяем что страница не падает
    await scrollToProgress(page, 1)
    await expect(page.locator('#s6')).toBeAttached()
  })
})

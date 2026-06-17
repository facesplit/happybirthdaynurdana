import './style.css'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { paletteAt, paletteAtIndex } from './scenes.js'
import { createTree } from './tree.js'
import { createParticles } from './particles.js'
import { createGround } from './ground.js'
import { createAudio } from './audio.js'

gsap.registerPlugin(ScrollTrigger)

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const root = document.documentElement
let groundFlowers = null // заполняется, если найдены спрайт-цветы
let ground = null // земля с травой (ground.js)
const coupleImgs = {} // сезонные спрайты пары под деревом

// season name -> кадр пары
const COUPLE_FRAME = {
  dawn: 'spring', spring: 'spring', summer: 'summer', autumn: 'autumn',
  winter: 'winter', birthday: 'summer', 'birthday-end': 'summer',
}
function updateCouple(p) {
  if (!coupleImgs.spring) return
  const from = COUPLE_FRAME[p.from] || 'summer'
  const to = COUPLE_FRAME[p.to] || from
  const t = p.t
  for (const k of ['spring', 'summer', 'autumn', 'winter']) {
    let op = 0
    if (k === from) op += 1 - t
    if (k === to) op += t
    coupleImgs[k].style.opacity = Math.min(1, op).toFixed(3)
  }
}

// ------------------------------------------------------------------
// 1. Пара под деревом + торт — рисуем как inline SVG (оригинальный арт)
// ------------------------------------------------------------------
const coupleSVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 70">
  <g>
    <!-- девушка -->
    <rect x="40" y="30" width="18" height="30" rx="4" fill="#e9a7a7"/>
    <circle cx="49" cy="24" r="9" fill="#f4d8c0"/>
    <path d="M40 22 a9 9 0 0 1 18 0 v6 h-3 v-6 a6 6 0 0 0 -12 0 v6 h-3z" fill="#5a3b2a"/>
    <!-- парень -->
    <rect x="62" y="28" width="20" height="32" rx="4" fill="#6f8f9d"/>
    <circle cx="72" cy="22" r="9" fill="#eccaa8"/>
    <path d="M63 20 a9 9 0 0 1 18 0 v3 h-18z" fill="#3a2a20"/>
    <!-- держатся: маленькое сердечко между -->
    <path d="M59 40 l2 -2 2 2 -2 3z" fill="#d96a8a"/>
  </g>
</svg>`)
document.querySelector('.couple').style.backgroundImage = `url("data:image/svg+xml,${coupleSVG}")`

const cakeSVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 46">
  <rect x="9" y="26" width="28" height="14" rx="2" fill="#f4c89b"/>
  <rect x="9" y="22" width="28" height="6" fill="#fff0f3"/>
  <rect x="21" y="10" width="4" height="10" fill="#e9a7a7"/>
  <circle cx="23" cy="8" r="3" fill="#ffd86a"/>
</svg>`)
document.querySelector('.cake').style.backgroundImage = `url("data:image/svg+xml,${cakeSVG}")`

// ------------------------------------------------------------------
// 2. Дерево + частицы
// ------------------------------------------------------------------
const tree = createTree(document.getElementById('tree'))
const particles = createParticles(document.getElementById('particles'), { reducedMotion: reduced })
particles.start()

// ------------------------------------------------------------------
// Звук: фоновая музыка + блип печати. Запуск по первому действию юзера
// (политика автоплея браузеров). Кнопка ♪ — вкл/выкл.
// ------------------------------------------------------------------
const audio = createAudio()
const oldMute = document.getElementById('mute')
if (oldMute) oldMute.remove() // заменили на плеер

// плеер со стрелками: ⏮ ⏯ ⏭ + название трека
const player = document.createElement('div')
player.className = 'player'
player.hidden = true
player.innerHTML =
  '<button class="pl-btn pl-prev" aria-label="Предыдущий трек">⏮</button>' +
  '<button class="pl-btn pl-toggle" aria-label="Играть/пауза">⏸</button>' +
  '<button class="pl-btn pl-next" aria-label="Следующий трек">⏭</button>' +
  '<span class="pl-title"></span>'
document.body.appendChild(player)
const plToggle = player.querySelector('.pl-toggle')
const plTitle = player.querySelector('.pl-title')
audio.setOnChange(({ title, playing, missing }) => {
  plTitle.textContent = missing ? title + ' (добавь mp3)' : title
  plToggle.textContent = playing ? '⏸' : '▶'
  player.classList.toggle('pl-missing', !!missing)
})
player.querySelector('.pl-prev').addEventListener('click', (e) => { e.stopPropagation(); audio.prev() })
player.querySelector('.pl-next').addEventListener('click', (e) => { e.stopPropagation(); audio.next() })
plToggle.addEventListener('click', (e) => { e.stopPropagation(); audio.toggle() })

let audioStarted = false
function startAudioOnce() {
  if (audioStarted || reduced) return
  audioStarted = true
  audio.start()
  player.hidden = false
}
;['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) =>
  window.addEventListener(ev, startAudioOnce, { once: true, passive: true })
)

// ------------------------------------------------------------------
// 2b. Умная подмена на настоящие спрайты Stardew (если лежат в /public/sprites)
//     Если файла нет (напр. публичный деплой без них) — остаётся оригинальный арт.
// ------------------------------------------------------------------
function probe(url) {
  return new Promise((res) => {
    const i = new Image()
    i.onload = () => res(true)
    i.onerror = () => res(false)
    i.src = url
  })
}
const stageEl = document.querySelector('.stage')
const particlesEl = document.getElementById('particles')

// Земля с травой — генерится всегда (пиксельный арт, без зависимости от спрайтов)
ground = createGround(stageEl, particlesEl)

;(async () => {
  // сундук
  if (await probe('sprites/chest.png')) {
    const chestEl = document.getElementById('chest')
    if (chestEl) {
      const img = document.createElement('img')
      img.className = 'chest-sprite'; img.alt = ''; img.src = 'sprites/chest.png'
      chestEl.insertBefore(img, chestEl.querySelector('.chest-label'))
      chestEl.classList.add('has-sprite')
    }
  }

  // домик: спрайт + снег на крыше + свет в окне (всё сезонное)
  if (await probe('sprites/house.png')) {
    const houseLayer = document.querySelector('.layer--house')
    if (houseLayer) houseLayer.classList.add('has-sprite')
    const house = document.createElement('div')
    house.className = 'house'
    house.setAttribute('aria-hidden', 'true')
    house.innerHTML =
      '<img src="sprites/house.png" alt=""><div class="house-snow"></div><div class="house-glow"></div>'
    stageEl.insertBefore(house, particlesEl)
  }

  // сезонная пара под деревом (настоящие модельки Stardew, вырезанные из ПодДеревомПара)
  if (await probe('sprites/couple-summer.png')) {
    const coupleEl = document.querySelector('.couple')
    coupleEl.style.backgroundImage = 'none' // убрать SVG-заглушку
    coupleEl.classList.add('has-sprite')
    for (const k of ['spring', 'summer', 'autumn', 'winter']) {
      const img = document.createElement('img')
      img.alt = ''; img.src = `sprites/couple-${k}.png`
      img.style.opacity = '0'
      coupleEl.appendChild(img)
      coupleImgs[k] = img
    }
  }

  // цветочки между травой (настоящие цветы Stardew)
  const flowerSrcs = ['flower-tulip.png', 'flower-jazz.png', 'flower-sunflower.png']
  if (await probe('sprites/flower-tulip.png')) {
    const wrap = document.createElement('div')
    wrap.className = 'ground-flowers'
    wrap.setAttribute('aria-hidden', 'true')
    const xs = [10, 22, 37, 58, 72, 88]
    xs.forEach((x, idx) => {
      const img = document.createElement('img')
      img.alt = ''
      img.src = 'sprites/' + flowerSrcs[idx % flowerSrcs.length]
      img.style.left = x + '%'
      img.style.bottom = (idx % 2 ? 14 : 2) + 'px'
      wrap.appendChild(img)
    })
    stageEl.insertBefore(wrap, particlesEl)
    groundFlowers = wrap
  }

  // перерисовать с текущим сезоном (спрайты появились асинхронно)
  applyPalette(paletteAtIndex(currentF))
})()

// ------------------------------------------------------------------
// 3. Загрузка фото из manifest.json (с LQIP-плейсхолдером)
// ------------------------------------------------------------------
async function loadPhotos() {
  let manifest = {}
  // public/ монтируется в корень и в dev, и в build, поэтому путь относительный.
  try {
    const res = await fetch('photos/manifest.json', { cache: 'no-cache' })
    if (res.ok) manifest = await res.json()
  } catch (e) {
    console.warn('manifest.json не загружен', e)
  }

  document.querySelectorAll('.polaroid[data-slug]').forEach((fig) => {
    const slug = fig.dataset.slug
    const m = manifest[slug]
    if (!m) return
    if (m.lqip) fig.querySelector('.frame').style.setProperty('--lqip', `url("${m.lqip}")`)
    const real = fig.querySelector('.img-real') || fig.querySelector('img')
    if (real && m.original) real.src = m.original
    const anime = fig.querySelector('.img-anime')
    if (anime && m.anime) anime.src = m.anime
  })
}
loadPhotos()

// ------------------------------------------------------------------
// 4. Применение палитры сцены
// ------------------------------------------------------------------
const sky = { top: '#171636', bot: '#6b3f63' }
function applyPalette(p) {
  root.style.setProperty('--sky-top', p.skyTop)
  root.style.setProperty('--sky-bot', p.skyBot)
  root.style.setProperty('--foliage', p.foliage)
  root.style.setProperty('--foliage-2', p.foliage2)
  root.style.setProperty('--blossom', p.blossom.toFixed(3))
  root.style.setProperty('--snowcap', p.snowcap.toFixed(3))
  root.style.setProperty('--light', p.light.toFixed(3))
  root.style.setProperty('--sun-y', p.sunY.toFixed(1) + '%')
  root.style.setProperty('--sun-op', p.sunOp.toFixed(3))
  root.style.setProperty('--house-light', p.houseLight.toFixed(3))
  root.style.setProperty('--house-snow', p.houseSnow.toFixed(3))
  root.style.setProperty('--ground', p.ground)
  root.style.setProperty('--ground-far', p.groundFar)
  if (groundFlowers) groundFlowers.style.setProperty('--flowers-op', Math.max(0, 1 - p.snowcap).toFixed(2))
  if (ground) ground.update(p)
  updateCouple(p)
  tree.update(0, p)
  // частицы: берём доминирующий режим
  const mode = p.t < 0.5 ? p.particleFrom : p.particleTo
  particles.setMode(mode, p.density)
}
applyPalette(paletteAt(0))

// ------------------------------------------------------------------
// 5. Lenis (плавный скролл) + связка с GSAP
// ------------------------------------------------------------------
let lenis = null
if (!reduced) {
  lenis = new Lenis({ duration: 1.1, smoothWheel: true, touchMultiplier: 1.4 })
  lenis.on('scroll', ScrollTrigger.update)
  lenis.on('scroll', () => setSeason(computeF())) // сезон пересчитывается каждый кадр скролла
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
  window.__lenis = lenis // для тестов: программный скролл должен идти через Lenis
}

// ------------------------------------------------------------------
// 6. Смена сезонов привязана к ПОЗИЦИЯМ секций (устойчиво к пиннингу).
//    Между центром секции i и центром i+1 дробный индекс f идёт i -> i+1,
//    а палитра интерполируется paletteAtIndex(f). s1=рассвет … s6=лето.
// ------------------------------------------------------------------
let currentF = 0
const seasonSections = ['s1', 's2', 's3', 's4', 's5', 's6'].map((id) => document.getElementById(id))
const lastIdx = seasonSections.length - 1

// Дробный индекс сезона считаем из ЖИВОЙ геометрии секций (центр секции
// относительно центра экрана). Иммунно к пиннингу: пока секция запинена и
// держится по центру — f держится на её индексе (сезон не «убегает»).
function computeF() {
  const vhc = window.innerHeight / 2
  const y = window.scrollY || window.pageYOffset || 0
  // абсолютная scroll-позиция, при которой центр секции попадает в центр экрана
  const anchors = seasonSections.map((s) => {
    const r = s.getBoundingClientRect()
    return y + r.top + r.height / 2 - vhc
  })
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  anchors[0] = Math.max(0, anchors[0])
  // Финал привязываем к НИЗУ страницы (стабильно), а не к геометрии s6 —
  // из-за пиннинга s5 верх s6 «плавает». Лето наступает за ~0.7 экрана до низа.
  anchors[lastIdx] = Math.max(anchors[lastIdx - 1] + window.innerHeight * 0.3, maxScroll - window.innerHeight * 0.7)
  if (y <= anchors[0]) return 0
  for (let i = 0; i < lastIdx; i++) {
    if (y >= anchors[i] && y <= anchors[i + 1]) {
      return i + (y - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i])
    }
  }
  return lastIdx
}

function setSeason(f) {
  currentF = f
  applyPalette(paletteAtIndex(f))
  root.style.setProperty('--progress', (f / lastIdx).toFixed(3))
  document.body.dataset.progress = (f / lastIdx).toFixed(2)
}

ScrollTrigger.create({
  trigger: document.body,
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: () => setSeason(computeF()),
  onRefresh: () => setSeason(computeF()),
})
// без Lenis (reduced-motion) — нативный слушатель скролла
if (reduced) window.addEventListener('scroll', () => setSeason(computeF()), { passive: true })
setSeason(computeF())

// ------------------------------------------------------------------
// 7. Параллакс слоёв
// ------------------------------------------------------------------
if (!reduced) {
  document.querySelectorAll('.layer[data-depth]').forEach((el) => {
    const depth = parseFloat(el.dataset.depth)
    gsap.to(el, {
      yPercent: -depth * 26,
      ease: 'none',
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true },
    })
  })
}

// ------------------------------------------------------------------
// 8. Появление контента по секциям
// ------------------------------------------------------------------
gsap.utils.toArray('.scene').forEach((scene) => {
  const items = scene.querySelectorAll('.chapter-head, .polaroid, .tv-memory, .intro-block, .finale-block, .winter-row')
  gsap.from(items, {
    y: 40, opacity: 0, duration: 0.8, stagger: 0.12, ease: 'power2.out',
    scrollTrigger: { trigger: scene, start: 'top 78%', toggleActions: 'play none none reverse' },
  })
})

// интро: имя уходит вверх с blur на первом скролле
if (!reduced) {
  gsap.to('.hero-name', {
    yPercent: -60, filter: 'blur(6px)', opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '#s1', start: 'top top', end: 'bottom top', scrub: true },
  })
}

// Морф фото -> аниме с ПИННИНГОМ секции:
// доскроллил до фото (видишь оригинал) -> страница замирает -> фото перетекает
// в аниме -> скролл продолжается. Так для всех фото-секций (весна/осень/зима).
const morphScenes = new Set()
document.querySelectorAll('.polaroid--morph').forEach((el) => {
  const s = el.closest('.scene')
  if (s) morphScenes.add(s)
})
morphScenes.forEach((scene) => {
  const polas = [...scene.querySelectorAll('.polaroid--morph')]
  const setMorph = (m) => polas.forEach((p) => p.style.setProperty('--morph', m))
  if (reduced) {
    // без анимации — просто показываем аниме при входе
    ScrollTrigger.create({ trigger: scene, start: 'top 60%', onEnter: () => setMorph('1'), onLeaveBack: () => setMorph('0') })
    return
  }
  ScrollTrigger.create({
    trigger: scene,
    start: 'center center',
    end: '+=110%',
    pin: true,
    pinSpacing: true,
    scrub: 0.4,
    anticipatePin: 1,
    onUpdate: (self) => setMorph(Math.min(1, self.progress * 1.12).toFixed(3)),
  })
})

// зима: послание построчно
gsap.to('.msg-line', {
  opacity: 1, y: 0, duration: 0.7, stagger: 0.4, ease: 'power2.out',
  scrollTrigger: { trigger: '#s5', start: 'top 60%', toggleActions: 'play none none none' },
})

// финал: торт со свечками
ScrollTrigger.create({
  trigger: '#s6', start: 'top 60%',
  onEnter: () => document.querySelector('.cake').classList.add('show'),
  onLeaveBack: () => document.querySelector('.cake').classList.remove('show'),
})

// ------------------------------------------------------------------
// 8b. Диалоговое окно Stardew: повествование с печатающимся текстом
// ------------------------------------------------------------------
const dialogTpl = document.getElementById('dialog-tpl')
let dialogEl = null
let dialogTextEl = null
let dialogBoxEl = null
let typeTimer = null
let currentDialogId = null

if (dialogTpl) {
  dialogEl = dialogTpl.content.firstElementChild.cloneNode(true)
  dialogEl.classList.add('dialog--fixed')
  document.body.appendChild(dialogEl)
  dialogTextEl = dialogEl.querySelector('.dialog-text')
  dialogBoxEl = dialogEl.querySelector('.dialog-box')
}

let dialogLines = []
let dialogLine = 0

function typingActive() { return dialogTextEl && dialogTextEl.classList.contains('typing') }

function typeLine(text, hasNext) {
  if (!dialogTextEl) return
  clearInterval(typeTimer)
  dialogBoxEl.classList.remove('done')
  if (dialogEl) dialogEl.dataset.hasNext = hasNext ? '1' : '0'
  if (reduced) {
    dialogTextEl.textContent = text
    dialogTextEl.classList.remove('typing')
    dialogBoxEl.classList.add('done')
    return
  }
  dialogTextEl.textContent = ''
  dialogTextEl.classList.add('typing')
  let i = 0
  typeTimer = setInterval(() => {
    dialogTextEl.textContent = text.slice(0, ++i)
    const ch = text[i - 1]
    if (ch && ch !== ' ') audio.blip() // звук печати как в Stardew
    if (i >= text.length) {
      clearInterval(typeTimer)
      dialogTextEl.classList.remove('typing')
      dialogBoxEl.classList.add('done')
    }
  }, 36)
}

// клик по окну: дописать строку мгновенно, либо перейти к следующей
function advanceDialog() {
  if (!dialogEl || !dialogLines.length) return
  if (typingActive()) {
    clearInterval(typeTimer)
    dialogTextEl.textContent = dialogLines[dialogLine]
    dialogTextEl.classList.remove('typing')
    dialogBoxEl.classList.add('done')
    return
  }
  if (dialogLine < dialogLines.length - 1) {
    dialogLine++
    typeLine(dialogLines[dialogLine], dialogLine < dialogLines.length - 1)
  }
}

function showDialog(id, text) {
  if (!dialogEl || currentDialogId === id) return
  currentDialogId = id
  dialogLines = text.split('|').map((s) => s.trim()).filter(Boolean)
  dialogLine = 0
  dialogEl.classList.add('show')
  typeLine(dialogLines[0], dialogLines.length > 1)
}

if (dialogBoxEl) {
  dialogBoxEl.style.pointerEvents = 'auto'
  dialogBoxEl.style.cursor = 'pointer'
  dialogBoxEl.addEventListener('click', advanceDialog)
}

document.querySelectorAll('.scene[data-dialog]').forEach((scene) => {
  const text = scene.dataset.dialog
  ScrollTrigger.create({
    trigger: scene,
    start: 'top 55%',
    end: 'bottom 45%',
    onEnter: () => showDialog(scene.id, text),
    onEnterBack: () => showDialog(scene.id, text),
  })
})

// ------------------------------------------------------------------
// 9. Ленивая загрузка видео + кнопка play
// ------------------------------------------------------------------
function wireVideo(videoEl, btn) {
  if (!videoEl) return
  const load = () => {
    if (!videoEl.dataset.src) return
    if (!videoEl.querySelector('source')) {
      const s = document.createElement('source')
      s.src = videoEl.dataset.src
      s.type = 'video/mp4'
      videoEl.appendChild(s)
      videoEl.load()
    }
  }
  // подгружаем при приближении секции
  ScrollTrigger.create({ trigger: videoEl, start: 'top 90%', once: true, onEnter: load })

  if (btn) {
    btn.addEventListener('click', () => {
      load()
      videoEl.play().then(() => btn.classList.add('hidden')).catch(() => {
        // нет файла -> показываем подсказку
        btn.classList.add('hidden')
        videoEl.controls = true
      })
    })
  }
}
document.querySelectorAll('.tv-frame').forEach((f) => {
  wireVideo(f.querySelector('video'), f.querySelector('.play-btn'))
})

// ------------------------------------------------------------------
// 10. Подарок (видео) и сундук (карточки)
// ------------------------------------------------------------------
// «Нажми меня» -> большое окно-поздравление (раскрывается снизу в центр)
const pressBtn = document.getElementById('press-me')
const bigmodal = document.getElementById('bigmodal')
function openBigModal() {
  if (!bigmodal) return
  bigmodal.hidden = false
  requestAnimationFrame(() => bigmodal.classList.add('show'))
  audio.sfx('chime')
  particles.burst(window.innerWidth / 2, window.innerHeight * 0.7, 'hearts', 26)
}
function closeBigModal() {
  if (!bigmodal) return
  bigmodal.classList.remove('show')
  setTimeout(() => { bigmodal.hidden = true }, 420)
}
if (pressBtn) pressBtn.addEventListener('click', (e) => { e.stopPropagation(); openBigModal() })
if (bigmodal) {
  bigmodal.querySelector('.bigmodal-close').addEventListener('click', (e) => { e.stopPropagation(); closeBigModal() })
  bigmodal.addEventListener('click', (e) => { if (e.target === bigmodal) closeBigModal() })
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeBigModal() })
}

const chest = document.getElementById('chest')
const chestCards = document.getElementById('chest-cards')
if (chest && chestCards) {
  chest.addEventListener('click', () => {
    const open = chestCards.hidden
    chestCards.hidden = !open
    chest.setAttribute('aria-expanded', String(open))
  })
}

// ------------------------------------------------------------------
// 10b. Лайтбокс: клик по фото -> крупно (целиком), клик по фото -> аниме/ориг
// ------------------------------------------------------------------
const lb = document.createElement('div')
lb.className = 'lightbox'
lb.hidden = true
lb.innerHTML =
  '<figure class="lb-inner"><img class="lb-img" alt=""><figcaption class="lb-cap"></figcaption>' +
  '<span class="lb-hint">нажми на фото — аниме ⟷ ориг · клик мимо — закрыть</span></figure>'
document.body.appendChild(lb)
const lbImg = lb.querySelector('.lb-img')
const lbCap = lb.querySelector('.lb-cap')
let lbReal = '', lbAnime = '', lbAnimeOn = false
function openLightbox(fig) {
  const real = fig.querySelector('.img-real') || fig.querySelector('img')
  const anime = fig.querySelector('.img-anime')
  lbReal = real ? real.currentSrc || real.src : ''
  lbAnime = anime ? anime.src : ''
  if (!lbReal) return
  lbAnimeOn = false
  lbImg.src = lbReal
  const cap = fig.querySelector('figcaption')
  lbCap.textContent = cap ? cap.textContent : ''
  lb.hidden = false
  requestAnimationFrame(() => lb.classList.add('show'))
  audio.sfx('chime')
}
function closeLightbox() { lb.classList.remove('show'); setTimeout(() => (lb.hidden = true), 250) }
lb.addEventListener('click', (e) => {
  if (e.target === lbImg && lbAnime) {
    lbAnimeOn = !lbAnimeOn
    lbImg.src = lbAnimeOn ? lbAnime : lbReal
    audio.sfx('sparkle')
  } else if (e.target !== lbImg) closeLightbox()
})
document.querySelectorAll('.polaroid').forEach((fig) => {
  fig.style.cursor = 'zoom-in'
  fig.addEventListener('click', () => openLightbox(fig))
})

// ------------------------------------------------------------------
// 10c. Пасхалки: клики по дереву / паре / дому / торту + падающая звезда
// ------------------------------------------------------------------
function toast(text) {
  const t = document.createElement('div')
  t.className = 'toast'
  t.textContent = text
  document.body.appendChild(t)
  requestAnimationFrame(() => t.classList.add('show'))
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500) }, 2200)
}

let cakeWishes = 0
const houseEl = () => document.querySelector('.house')

window.addEventListener('click', (e) => {
  const x = e.clientX, y = e.clientY
  const inside = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom }
  const couple = document.querySelector('.couple')
  const cake = document.querySelector('.cake')
  const house = houseEl()
  const treeW = document.querySelector('.tree-wrap')

  // торт (в финале) — загадать желание
  if (cake && cake.classList.contains('show') && inside(cake)) {
    particles.burst(x, y, 'hearts', 20)
    audio.sfx('chime')
    cakeWishes++
    toast(cakeWishes < 2 ? 'Загадай желание… 🎂' : 'Желание загадано 💫')
    return
  }
  // пара — сердечки
  if (inside(couple)) { particles.burst(x, y, 'hearts', 16); audio.sfx('heart'); return }
  // дом — переключить свет в окне + дымок
  if (inside(house)) {
    house.classList.toggle('egg-lit')
    particles.burst(x, y - 10, 'sparkles', 8)
    audio.sfx('chime')
    return
  }
  // дерево — всплеск сезонных частиц
  if (inside(treeW)) {
    const p = paletteAtIndex(currentF)
    const k = p.t < 0.5 ? p.particleFrom : p.particleTo
    particles.burst(x, y, k, 18)
    audio.sfx('sparkle')
    return
  }
})

// падающая звезда: изредка летит по небу; клик -> желание
if (!reduced) {
  const star = document.createElement('div')
  star.className = 'shooting-star'
  star.hidden = true
  document.body.appendChild(star) // на body, чтобы клик не перехватывал контент
  star.addEventListener('click', (e) => {
    e.stopPropagation()
    const r = star.getBoundingClientRect()
    particles.burst(r.left + r.width / 2, r.top + r.height / 2, 'sparkles', 22)
    audio.sfx('chime')
    toast('Ты загадала желание ⭐')
    star.hidden = true
  })
  const flyStar = () => {
    star.hidden = false
    star.style.setProperty('--sx', (10 + Math.random() * 50) + 'vw')
    star.style.setProperty('--sy', (6 + Math.random() * 20) + 'vh')
    star.classList.remove('fly')
    void star.offsetWidth
    star.classList.add('fly')
    setTimeout(() => { star.hidden = true }, 2600)
    setTimeout(flyStar, 12000 + Math.random() * 14000)
  }
  setTimeout(flyStar, 6000)
}

// ------------------------------------------------------------------
// 11. refresh после загрузки шрифтов/картинок
// ------------------------------------------------------------------
window.addEventListener('load', () => ScrollTrigger.refresh())
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh())

// экспорт для отладки/тестов
window.__scene = { paletteAt, applyPalette }
window.__getF = () => currentF

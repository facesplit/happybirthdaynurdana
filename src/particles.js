// Canvas-частицы в ПИКСЕЛЬНОМ стиле Stardew. Каждый тип — крошечный pixel-art
// спрайт, нарисованный в offscreen-канвас и масштабируемый с nearest-neighbor.
// Типы: petals, fireflies, leaves, snow, sparkles.

const rand = (a, b) => a + Math.random() * (b - a)

// пиксель-сетки (строки), символ -> цвет
const PAL = {
  p: '#ffb6cf', P: '#ff8fb4', w: '#ffd9e6', // розовый лепесток сакуры
  o: '#e0852c', O: '#c96a1e', y: '#f2b24a', // оранжевый лист (осень)
  l: '#86c25a', L: '#5e9a3a', v: '#3f7a2a', // зелёный лист (лето)
  s: '#ffffff', S: '#dff1ff', // снег
  g: '#fff2a8', G: '#ffe06a', // искра (для эффектов)
}

const GRIDS = {
  petal: ['.pp.', 'PppP', 'PppP', '.PP.'],
  leaf: ['...oo', '..ooy', '.oooO', 'ooOO.', 'OO...'],
  greenleaf: ['..lll', '.llLv', 'llLLv', 'lLLv.', 'Lv...'],
  snow: ['.s.', 'sSs', '.s.'],
  sparkle: ['..g..', '..g..', 'gGyGg', '..g..', '..g..'],
  heart: ['.p.p.', 'PpppP', 'PpppP', '.PpP.', '..P..'],
}

function makeSprite(name, palette) {
  const grid = GRIDS[name]
  const h = grid.length
  const w = grid[0].length
  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  const c = cv.getContext('2d')
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = grid[y][x]
      if (ch === '.') continue
      c.fillStyle = palette[ch] || '#fff'
      c.fillRect(x, y, 1, 1)
    }
  }
  return cv
}

const TYPES = {
  petals:     { sprite: 'petal',     size: [10, 20], vy: [18, 42], sway: 26, spin: 1.4, glow: false }, // весна — сакура
  greenleaves:{ sprite: 'greenleaf', size: [11, 21], vy: [16, 44], sway: 30, spin: 2.0, glow: false }, // лето — зелёные
  leaves:     { sprite: 'leaf',      size: [12, 22], vy: [30, 70], sway: 34, spin: 2.4, glow: false }, // осень — оранжевые
  snow:       { sprite: 'snow',      size: [8, 16],  vy: [22, 46], sway: 16, spin: 0,   glow: false }, // зима — снег
  sparkles:   { sprite: 'sparkle',   size: [8, 18],  vy: [-30, -6], sway: 14, spin: 1.2, glow: true },  // для эффектов
  hearts:     { sprite: 'heart',     size: [10, 18], vy: [-30, -6], sway: 12, spin: 1.0, glow: false }, // пасхалки
  fireflies:  { sprite: null,        size: [4, 8],   vy: [-8, 8],  sway: 10, spin: 0,   glow: true },
}

export function createParticles(canvas, { reducedMotion = false } = {}) {
  const ctx = canvas.getContext('2d', { alpha: true })
  ctx.imageSmoothingEnabled = false
  let dpr = Math.min(window.devicePixelRatio || 1, 2)
  let W = 0, H = 0
  let mode = 'petals'
  let density = 1
  let particles = []
  let raf = null
  let last = 0

  const sprites = {
    petal: makeSprite('petal', PAL),
    greenleaf: makeSprite('greenleaf', PAL),
    leaf: makeSprite('leaf', PAL),
    snow: makeSprite('snow', PAL),
    sparkle: makeSprite('sparkle', PAL),
    heart: makeSprite('heart', PAL),
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    W = canvas.clientWidth
    H = canvas.clientHeight
    canvas.width = Math.floor(W * dpr)
    canvas.height = Math.floor(H * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false
  }

  function targetCount() {
    if (reducedMotion) return 0
    const area = W * H
    const mobile = W < 680
    const base = mobile ? area / 28000 : area / 15000
    return Math.round(base * density)
  }

  function spawn(initial = false) {
    const cfg = TYPES[mode]
    return {
      type: mode,
      x: Math.random() * W,
      y: initial ? Math.random() * H : cfg.vy[0] < 0 ? H + 10 : -10,
      r: rand(cfg.size[0], cfg.size[1]),
      vy: rand(cfg.vy[0], cfg.vy[1]),
      vx: rand(-6, 6),
      phase: Math.random() * Math.PI * 2,
      swayAmp: cfg.sway * rand(0.5, 1),
      spin: rand(-cfg.spin, cfg.spin),
      rot: Math.random() * Math.PI * 2,
      alpha: rand(0.7, 1),
    }
  }

  function setMode(newMode, newDensity = 1) {
    density = newDensity
    if (newMode && newMode !== mode && TYPES[newMode]) mode = newMode
  }

  // всплеск частиц в точке (для пасхалок: клик по дереву/паре/торту)
  const bursts = []
  function burst(x, y, kind = 'sparkles', n = 14) {
    const cfg = TYPES[kind] || TYPES.sparkles
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5
      const sp = rand(60, 200)
      bursts.push({
        type: kind,
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - rand(20, 80),
        r: rand(cfg.size[0], cfg.size[1]),
        rot: Math.random() * 6.28,
        spin: rand(-4, 4),
        life: 1, maxlife: rand(0.7, 1.3),
        heart: kind === 'hearts',
      })
    }
  }

  function step(ts) {
    raf = requestAnimationFrame(step)
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016)
    last = ts

    const target = targetCount()
    while (particles.length < target) particles.push(spawn(true))
    if (particles.length > target * 1.3) particles.length = Math.ceil(target * 1.1)

    ctx.clearRect(0, 0, W, H)
    ctx.imageSmoothingEnabled = false

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      const cfg = TYPES[p.type]
      p.phase += dt
      p.y += p.vy * dt
      p.x += p.vx * dt + Math.sin(p.phase) * p.swayAmp * dt
      p.rot += p.spin * dt

      const out = cfg.vy[0] < 0 ? p.y < -24 : p.y > H + 24
      if (out || p.x < -48 || p.x > W + 48) { particles[i] = spawn(false); continue }

      ctx.save()
      let a = p.alpha
      if (cfg.glow) {
        ctx.shadowBlur = p.r
        ctx.shadowColor = '#ffe9a0'
        a = p.alpha * (0.5 + 0.5 * Math.abs(Math.sin(p.phase * 2)))
      }
      ctx.globalAlpha = a

      const spr = cfg.sprite ? sprites[cfg.sprite] : null
      if (spr) {
        ctx.translate(p.x, p.y)
        if (cfg.spin) ctx.rotate(p.rot)
        const s = p.r
        ctx.drawImage(spr, -s / 2, -s / 2, s, s)
      } else {
        // светлячок — пиксельный квадрат со свечением
        ctx.fillStyle = '#fff2a8'
        const s = Math.max(2, Math.round(p.r))
        ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s)
      }
      ctx.restore()
    }

    // всплески (пасхалки): своя физика с гравитацией и затуханием
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]
      b.life -= dt / b.maxlife
      if (b.life <= 0) { bursts.splice(i, 1); continue }
      b.vy += 320 * dt // гравитация
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.rot += b.spin * dt
      const spr = sprites[(TYPES[b.type] || TYPES.sparkles).sprite] || sprites.sparkle
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, b.life))
      ctx.translate(b.x, b.y)
      ctx.rotate(b.rot)
      ctx.drawImage(spr, -b.r / 2, -b.r / 2, b.r, b.r)
      ctx.restore()
    }
  }

  function start() {
    if (raf || reducedMotion) return
    last = performance.now()
    raf = requestAnimationFrame(step)
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null }

  resize()
  window.addEventListener('resize', resize)
  return { setMode, start, stop, resize, burst }
}

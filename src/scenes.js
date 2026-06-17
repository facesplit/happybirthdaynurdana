// Конфиг сезонов: ключевые кадры по прогрессу скролла (0..1).
// Между кадрами всё интерполируется (небо, листва, частицы, свет, трава, земля).
//
// ВАЖНО: день рождения у Нурданы ЛЕТОМ — поэтому круг замыкается на лето (S6).
//
// treeFrame / grassFrame — какой кадр спрайта Stardew (spring/summer/fall/winter) доминирует.
export const SEASONS = [
  {
    at: 0.0, // S1 рассвет
    name: 'dawn',
    skyTop: '#171636', skyBot: '#6b3f63',
    foliage: '#3f5a44', foliage2: '#33493a',
    blossom: 0, snowcap: 0, light: 0.12,
    particle: 'petals', density: 0.25,
    sunY: 86, sunOp: 0.25, houseLight: 0.55,
    treeFrame: 'spring', grassFrame: 'spring',
    ground: '#3f5d44', groundFar: '#33493c', houseSnow: 0,
  },
  {
    at: 0.12, // S2 весна
    name: 'spring',
    skyTop: '#bfe1f2', skyBot: '#f7d4d8',
    foliage: '#8fb070', foliage2: '#6f9356',
    blossom: 1, snowcap: 0, light: 0.22,
    particle: 'petals', density: 1,
    sunY: 30, sunOp: 0.5, houseLight: 0,
    treeFrame: 'spring', grassFrame: 'spring',
    ground: '#7faf5e', groundFar: '#5e8c48', houseSnow: 0,
  },
  {
    at: 0.34, // S3 лето
    name: 'summer',
    skyTop: '#8fd0ef', skyBot: '#cdeccf',
    foliage: '#5f9d4f', foliage2: '#3f7a37',
    blossom: 0, snowcap: 0, light: 0.3,
    particle: 'greenleaves', density: 1,
    sunY: 22, sunOp: 0.7, houseLight: 0,
    treeFrame: 'summer', grassFrame: 'summer',
    ground: '#6aa04a', groundFar: '#4f8038', houseSnow: 0,
  },
  {
    at: 0.54, // S4 осень
    name: 'autumn',
    skyTop: '#f4c98b', skyBot: '#e79a5f',
    foliage: '#d68a3a', foliage2: '#b9622a',
    blossom: 0, snowcap: 0, light: 0.28,
    particle: 'leaves', density: 1,
    sunY: 48, sunOp: 0.6, houseLight: 0.2,
    treeFrame: 'fall', grassFrame: 'fall',
    ground: '#b08a4a', groundFar: '#977338', houseSnow: 0,
  },
  {
    at: 0.74, // S5 зима
    name: 'winter',
    skyTop: '#c9d6e6', skyBot: '#e7eef5',
    foliage: '#9fb0ad', foliage2: '#8497a0',
    blossom: 0, snowcap: 1, light: 0.16,
    particle: 'snow', density: 1,
    sunY: 64, sunOp: 0.3, houseLight: 0.95,
    treeFrame: 'winter', grassFrame: 'none',
    ground: '#dfe8ef', groundFar: '#c7d4df', houseSnow: 1,
  },
  {
    at: 0.92, // S6 день рождения — ЛЕТО (праздничный закат)
    name: 'birthday',
    skyTop: '#9fd3e8', skyBot: '#ffd9a8',
    foliage: '#5fa24f', foliage2: '#7fc05f',
    blossom: 0.6, snowcap: 0, light: 0.42,
    particle: 'greenleaves', density: 1,
    sunY: 26, sunOp: 0.9, houseLight: 0.3,
    treeFrame: 'summer', grassFrame: 'summer',
    ground: '#6aa04a', groundFar: '#4f8038', houseSnow: 0,
  },
  {
    at: 1.0,
    name: 'birthday-end',
    skyTop: '#bfe0d6', skyBot: '#ffcf9a',
    foliage: '#5fa24f', foliage2: '#8fce6f',
    blossom: 0.8, snowcap: 0, light: 0.48,
    particle: 'greenleaves', density: 1,
    sunY: 24, sunOp: 0.95, houseLight: 0.2,
    treeFrame: 'summer', grassFrame: 'summer',
    ground: '#6aa04a', groundFar: '#4f8038', houseSnow: 0,
  },
]

// ---------- утилиты интерполяции ----------
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}
function lerp(a, b, t) { return a + (b - a) * t }
function lerpColor(c1, c2, t) {
  const a = hexToRgb(c1), b = hexToRgb(c2)
  return rgbToHex([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)])
}

// Смешивает две сезонные палитры a,b по t -> объект палитры.
function mix(a, b, t) {
  return {
    name: t < 0.5 ? a.name : b.name,
    from: a.name,
    to: b.name,
    t,
    skyTop: lerpColor(a.skyTop, b.skyTop, t),
    skyBot: lerpColor(a.skyBot, b.skyBot, t),
    foliage: lerpColor(a.foliage, b.foliage, t),
    foliage2: lerpColor(a.foliage2, b.foliage2, t),
    blossom: lerp(a.blossom, b.blossom, t),
    snowcap: lerp(a.snowcap, b.snowcap, t),
    light: lerp(a.light, b.light, t),
    sunY: lerp(a.sunY, b.sunY, t),
    sunOp: lerp(a.sunOp, b.sunOp, t),
    houseLight: lerp(a.houseLight, b.houseLight, t),
    houseSnow: lerp(a.houseSnow, b.houseSnow, t),
    ground: lerpColor(a.ground, b.ground, t),
    groundFar: lerpColor(a.groundFar, b.groundFar, t),
    // частицы
    particleFrom: a.particle,
    particleTo: b.particle,
    density: lerp(a.density, b.density, t),
    // кадры спрайтов Stardew для кроссфейда
    treeFrameFrom: a.treeFrame,
    treeFrameTo: b.treeFrame,
    grassFrameFrom: a.grassFrame,
    grassFrameTo: b.grassFrame,
    treeT: t,
  }
}

// Палитра по прогрессу p (0..1) — по полю .at у сезонов.
export function paletteAt(p) {
  p = Math.max(0, Math.min(1, p))
  let i = 0
  while (i < SEASONS.length - 1 && p > SEASONS[i + 1].at) i++
  const a = SEASONS[i]
  const b = SEASONS[Math.min(i + 1, SEASONS.length - 1)]
  const span = Math.max(1e-6, b.at - a.at)
  const t = Math.max(0, Math.min(1, (p - a.at) / span))
  return mix(a, b, t)
}

// Палитра по ДРОБНОМУ индексу секции f (0=s1/dawn … 5=s6/birthday).
// Нужна при пиннинге: сезон привязан к секциям, а не к линейному скроллу.
export function paletteAtIndex(f) {
  f = Math.max(0, Math.min(SEASONS.length - 1, f))
  const i = Math.min(Math.floor(f), SEASONS.length - 2)
  const t = f - i
  return mix(SEASONS[i], SEASONS[i + 1], t)
}

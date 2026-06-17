// Земля в стиле Stardew: сезонная трава.
// Текстуру травы и кустики-тафты генерируем пиксельно на canvas (надёжно и
// перекрашивается по сезонам), плюс раскидываем настоящие цветы-спрайты Stardew.

const rnd = (a, b) => a + Math.random() * (b - a)

// сезонные палитры травы [base, mid, tip]
const GRASS = {
  spring: ['#5f8f3e', '#74a64e', '#9fce6a'],
  summer: ['#4f8636', '#5f9a40', '#84bd5c'],
  autumn: ['#9a7a36', '#b5933f', '#d2b15a'],
  winter: null, // зимой трава под снегом
}

// маленький кустик травы (пиксельные «лезвия»)
function makeTuft([base, mid, tip]) {
  const W = 18, H = 20
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const x = c.getContext('2d')
  // 5–6 лезвий, слегка изогнутых
  const blades = [
    [3, 12], [6, 17], [9, 19], [12, 16], [15, 11], [8, 14],
  ]
  blades.forEach(([bx, h], i) => {
    const lean = i % 2 ? 1 : -1
    for (let yy = 0; yy < h; yy++) {
      const ty = H - 1 - yy
      const off = Math.round((yy / h) * 2) * lean
      x.fillStyle = yy > h - 4 ? tip : yy < 4 ? base : mid
      x.fillRect(bx + off, ty, 2, 1)
    }
  })
  return c.toDataURL()
}

// полупрозрачная текстура-«ворс» поверх цветной земли (пиксельные тени/блики)
function makeTexture() {
  const S = 40
  const c = document.createElement('canvas')
  c.width = S; c.height = S
  const x = c.getContext('2d')
  for (let i = 0; i < 90; i++) {
    const px = Math.floor(rnd(0, S)), py = Math.floor(rnd(0, S))
    const dark = Math.random() < 0.6
    x.fillStyle = dark ? 'rgba(20,50,15,0.22)' : 'rgba(255,255,210,0.16)'
    const h = 1 + Math.floor(rnd(0, 3))
    x.fillRect(px, py, 1, h)
  }
  return c.toDataURL()
}

export function createGround(stageEl, beforeEl) {
  // цветной слой земли (цвет крутится переменными --ground/--ground-far)
  const ground = document.createElement('div')
  ground.className = 'ground'
  ground.setAttribute('aria-hidden', 'true')

  const tex = document.createElement('div')
  tex.className = 'ground-tex'
  tex.style.backgroundImage = `url("${makeTexture()}")`
  ground.appendChild(tex)

  // снежный нанос зимой
  const snow = document.createElement('div')
  snow.className = 'ground-snow'
  ground.appendChild(snow)

  stageEl.insertBefore(ground, beforeEl)

  // кустики травы
  const tuftWrap = document.createElement('div')
  tuftWrap.className = 'grass-tufts'
  tuftWrap.setAttribute('aria-hidden', 'true')
  const TUFTS = makeTuftSet()
  const positions = []
  for (let i = 0; i < 22; i++) {
    positions.push({ left: rnd(1, 99), bottom: rnd(0, 26), scale: rnd(0.8, 1.7), flip: Math.random() < 0.5 })
  }
  const tuftImgs = positions.map((p, i) => {
    const img = document.createElement('img')
    img.alt = ''
    img.src = TUFTS.summer
    img.style.left = p.left.toFixed(1) + '%'
    img.style.bottom = p.bottom.toFixed(0) + 'px'
    img.style.width = (20 * p.scale).toFixed(0) + 'px'
    img.style.setProperty('--fx', p.flip ? -1 : 1)
    img.style.animationDelay = (i % 6) * -0.5 + 's'
    img.style.zIndex = Math.round(p.scale * 10)
    tuftWrap.appendChild(img)
    return img
  })
  stageEl.insertBefore(tuftWrap, beforeEl)

  let currentFrame = ''
  function update(p) {
    const frame = p.t < 0.5 ? p.grassFrameFrom : p.grassFrameTo
    const key = GRASS[frame] ? frame : 'summer'
    if (key !== currentFrame && GRASS[frame]) {
      currentFrame = key
      tuftImgs.forEach((img) => { img.src = TUFTS[key] })
    }
    // трава прячется под снег зимой; текстура тоже тускнеет
    tuftWrap.style.setProperty('--grass-op', Math.max(0, 1 - p.snowcap * 1.1).toFixed(2))
    tex.style.opacity = Math.max(0.15, 1 - p.snowcap * 0.7).toFixed(2)
    snow.style.opacity = p.snowcap.toFixed(2)
  }

  return { update }
}

function makeTuftSet() {
  return {
    spring: makeTuft(GRASS.spring),
    summer: makeTuft(GRASS.summer),
    autumn: makeTuft(GRASS.autumn),
  }
}

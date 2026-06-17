// Дерево с двумя режимами:
//  1) спрайт Stardew — 4 сезонных кадра (spring/summer/fall/winter), кроссфейд по скроллу;
//  2) запасной SVG-арт (если спрайтов нет, напр. при публичном деплое без них).
// Если sprites/tree-spring.png грузится — используем спрайт; иначе рисуем SVG.

const SVG_NS = 'http://www.w3.org/2000/svg'

const CLUSTERS = [
  [200, 150, 95], [120, 200, 78], [280, 200, 80],
  [165, 110, 64], [240, 110, 66], [200, 80, 58],
  [95, 260, 58], [305, 260, 60], [200, 220, 70],
]

const FRAMES = ['spring', 'summer', 'fall', 'winter']

function buildSVG(mountEl) {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 400 560')
  svg.setAttribute('preserveAspectRatio', 'xMidYMax meet')

  const ground = document.createElementNS(SVG_NS, 'ellipse')
  ground.setAttribute('cx', '200'); ground.setAttribute('cy', '545')
  ground.setAttribute('rx', '150'); ground.setAttribute('ry', '22')
  ground.setAttribute('fill', 'rgba(0,0,0,0.18)')

  const trunk = document.createElementNS(SVG_NS, 'path')
  trunk.setAttribute(
    'd',
    'M188 540 C182 470 178 420 184 360 C150 350 132 320 140 300 C160 312 176 320 190 322 ' +
      'C188 300 196 280 200 260 C206 282 210 304 210 322 C226 318 244 308 262 298 ' +
      'C270 322 250 352 216 360 C222 430 220 480 214 540 Z'
  )
  trunk.setAttribute('fill', '#6b4528')
  trunk.setAttribute('stroke', '#4f3018'); trunk.setAttribute('stroke-width', '3')

  const foliage = document.createElementNS(SVG_NS, 'g')
  const blossoms = document.createElementNS(SVG_NS, 'g')
  const snow = document.createElementNS(SVG_NS, 'g')
  const leafCircles = []

  CLUSTERS.forEach(([cx, cy, r]) => {
    const c = document.createElementNS(SVG_NS, 'circle')
    c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r)
    foliage.appendChild(c); leafCircles.push(c)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + cx
      const px = cx + Math.cos(a) * r * 0.6
      const py = cy + Math.sin(a) * r * 0.6
      const b = document.createElementNS(SVG_NS, 'circle')
      b.setAttribute('cx', px); b.setAttribute('cy', py); b.setAttribute('r', 6); b.setAttribute('fill', '#ffd6e6')
      blossoms.appendChild(b)
      const s = document.createElementNS(SVG_NS, 'circle')
      s.setAttribute('cx', px + 4); s.setAttribute('cy', cy - r * 0.5); s.setAttribute('r', 5); s.setAttribute('fill', '#fff')
      snow.appendChild(s)
    }
  })

  svg.append(ground, trunk, foliage, blossoms, snow)
  mountEl.appendChild(svg)
  return { svg, leafCircles, foliage, blossoms, snow }
}

export function createTree(mountEl) {
  const svgParts = buildSVG(mountEl)

  // спрайт-слой (поверх): 4 кадра
  const spriteWrap = document.createElement('div')
  spriteWrap.className = 'sprite-tree'
  spriteWrap.style.display = 'none'
  const imgs = {}
  FRAMES.forEach((f) => {
    const img = document.createElement('img')
    img.alt = ''
    img.src = `sprites/tree-${f}.png`
    img.dataset.frame = f
    spriteWrap.appendChild(img)
    imgs[f] = img
  })
  mountEl.appendChild(spriteWrap)

  let useSprite = false
  imgs.spring.addEventListener('load', () => {
    useSprite = true
    spriteWrap.style.display = ''
    svgParts.svg.style.display = 'none'
  })
  imgs.spring.addEventListener('error', () => { useSprite = false })

  function updateSVG(palette) {
    const { foliage: f1, foliage2: f2, blossom = 0, snowcap = 0 } = palette
    svgParts.leafCircles.forEach((c, i) => {
      c.setAttribute('fill', i % 2 ? f2 : f1)
      c.setAttribute('opacity', String(0.95 - snowcap * 0.35))
    })
    svgParts.foliage.setAttribute('opacity', String(1 - snowcap * 0.25))
    svgParts.blossoms.setAttribute('opacity', String(blossom))
    svgParts.snow.setAttribute('opacity', String(snowcap))
  }

  function updateSprite(palette) {
    const from = palette.treeFrameFrom || 'spring'
    const to = palette.treeFrameTo || from
    const t = palette.treeT ?? 0
    FRAMES.forEach((f) => {
      let op = 0
      if (f === from) op += 1 - t
      if (f === to) op += t
      imgs[f].style.opacity = Math.min(1, op).toFixed(3)
    })
    // лёгкое цветение поверх весеннего кадра в дни рождения
    spriteWrap.style.setProperty('--bloom', (palette.blossom * (palette.name.includes('birthday') ? 1 : 0)).toFixed(2))
  }

  function update(_p, palette) {
    if (useSprite) updateSprite(palette)
    else updateSVG(palette)
  }

  return { update }
}

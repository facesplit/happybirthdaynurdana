// Звук: музыкальный плеер (плейлист) + «блип» печати текста + эффекты пасхалок.
// Трек 0 — генеративная cozy-музыка (WebAudio, всегда работает).
// Треки 1..3 — песни: положи mp3 в public/audio/ с указанными именами.

export function createAudio() {
  let ctx = null
  let master = null
  let musicGain = null
  let muted = false
  let sched = null
  let delayNode = null
  let lastBlip = 0

  // плейлист (Moldanazar — первой песней), генеративная — запасная
  const TRACKS = [
    { title: 'Moldanazar — Özıñ Ğana', src: 'audio/moldanazar-ozin-gana.mp3' },
    { title: 'Порвав поводок', src: 'audio/porvav-povodok.mp3' },
    { title: 'Connie Francis — Pretty Little Baby', src: 'audio/pretty-little-baby.mp3' },
    { title: '♪ Ламповая мелодия', gen: true },
  ]
  let idx = 0
  let el = null // HTMLAudioElement текущего mp3
  let playing = false
  let onChange = null

  const AC = window.AudioContext || window.webkitAudioContext

  function ensure() {
    if (ctx || !AC) return
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)
    delayNode = ctx.createDelay()
    delayNode.delayTime.value = 0.33
    const fb = ctx.createGain(); fb.gain.value = 0.28
    const wet = ctx.createGain(); wet.gain.value = 0.25
    delayNode.connect(fb); fb.connect(delayNode); delayNode.connect(wet); wet.connect(master)
    musicGain = ctx.createGain(); musicGain.gain.value = 0.0; musicGain.connect(master)
  }

  function midi(m) { return 440 * Math.pow(2, (m - 69) / 12) }
  function note(freq, time, dur, type, gain, toDelay) {
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = type; o.frequency.value = freq
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200
    o.connect(lp); lp.connect(g); g.connect(musicGain)
    if (toDelay) g.connect(delayNode)
    g.gain.setValueAtTime(0.0001, time)
    g.gain.exponentialRampToValueAtTime(gain, time + dur * 0.2)
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur)
    o.start(time); o.stop(time + dur + 0.05)
  }

  // ----- генеративная музыка -----
  const STEP = 0.52
  const PENT = [0, 2, 4, 7, 9]
  const PROG = [0, -3, -7, -5]
  const ROOT = 57
  let nextTime = 0, gstep = 0
  const arp = [0, 2, 4, 2, 1, 3, 4, 3]
  function scheduleStep(i, t) {
    const base = ROOT + PROG[Math.floor(i / 8) % PROG.length]
    if (i % 8 === 0) [0, 7, 12].forEach((s) => note(midi(base + s - 12), t, STEP * 8, 'triangle', 0.045, false))
    note(midi(base + PENT[arp[i % arp.length] % PENT.length] + 12), t, STEP * 1.6, 'sine', 0.06, true)
    if (i % 16 === 6) note(midi(base + 24), t, STEP * 2.2, 'sine', 0.05, true)
  }
  function scheduler() {
    if (!ctx) return
    while (nextTime < ctx.currentTime + 0.25) { scheduleStep(gstep, nextTime); nextTime += STEP; gstep++ }
  }
  function startGenerative() {
    ensure(); if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume()
    if (!sched) { nextTime = ctx.currentTime + 0.1; sched = setInterval(scheduler, 60) }
    musicGain.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 1.0)
  }
  function stopGenerative() {
    if (sched) { clearInterval(sched); sched = null }
    if (musicGain && ctx) musicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2)
  }

  function stopAll() {
    stopGenerative()
    if (el) { el.pause(); el.src = ''; el = null }
  }

  function notify() { if (onChange) onChange({ index: idx, title: TRACKS[idx].title, playing, missing: TRACKS[idx]._missing || false }) }

  function playIndex(i) {
    ensure()
    if (ctx && ctx.state === 'suspended') ctx.resume()
    stopAll()
    idx = (i + TRACKS.length) % TRACKS.length
    const t = TRACKS[idx]
    if (t.gen) { startGenerative(); playing = true; notify(); return }
    el = new Audio(t.src)
    el.loop = true
    el.volume = muted ? 0 : 0.6
    el.addEventListener('error', () => { t._missing = true; playing = false; notify() })
    el.play().then(() => { t._missing = false; playing = true; notify() }).catch(() => { playing = false; notify() })
    notify()
  }

  function start() {
    if (playing) return
    playIndex(idx)
  }
  function next() { playIndex(idx + 1) }
  function prev() { playIndex(idx - 1) }
  function pause() {
    if (TRACKS[idx].gen) stopGenerative()
    else if (el) el.pause()
    playing = false; notify()
  }
  function resume() { playIndex(idx) }
  function toggle() { if (playing) pause(); else resume() }

  function setMuted(m) {
    muted = m
    if (el) el.volume = m ? 0 : 0.6
    if (musicGain && ctx) musicGain.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.2)
  }

  // «блип» печати текста
  function blip() {
    if (!ctx || muted) return
    const now = performance.now()
    if (now - lastBlip < 28) return
    lastBlip = now
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = 'square'; o.frequency.value = 420 + Math.random() * 90
    o.connect(g); g.connect(master)
    const t = ctx.currentTime
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
    o.start(t); o.stop(t + 0.07)
  }

  function sfx(kind) {
    if (!ctx || muted) return
    const t = ctx.currentTime
    const seq = kind === 'heart' ? [659, 784, 988] : kind === 'sparkle' ? [988, 1319, 1568] :
      kind === 'pop' ? [220] : kind === 'chime' ? [784, 1047, 1319, 1568] : [523, 659]
    seq.forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.type = kind === 'pop' ? 'triangle' : 'sine'; o.frequency.value = f
      o.connect(g); g.connect(master); g.connect(delayNode)
      const tt = t + i * 0.08
      g.gain.setValueAtTime(0.0001, tt)
      g.gain.exponentialRampToValueAtTime(0.12, tt + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.25)
      o.start(tt); o.stop(tt + 0.3)
    })
  }

  return {
    start, next, prev, toggle, pause, setMuted, blip, sfx,
    setOnChange: (cb) => { onChange = cb },
    isPlaying: () => playing,
    tracks: TRACKS,
  }
}

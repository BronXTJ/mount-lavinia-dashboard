import { useEffect, useRef } from 'react'

const AMBIENT_COUNT = 24
const TRAIL_CAP = 100
const TRAIL_SPACING = 10
const TRAIL_LIFE_MS = 1200

const CODE_SNIPPETS = [
  { text: 'const map = useMap()', top: '12%', left: '8%', delay: '0s' },
  { text: 'git push origin main', top: '22%', left: '72%', delay: '1.2s' },
  { text: '=> fetch(geojson)', top: '68%', left: '6%', delay: '2.4s' },
  { text: '0x00b4d8', top: '78%', left: '78%', delay: '0.6s' },
  { text: 'npm run build', top: '38%', left: '82%', delay: '3s' },
  { text: 'CRS: WGS 84', top: '55%', left: '14%', delay: '1.8s' },
  { text: '{ layers: true }', top: '14%', left: '48%', delay: '2.8s' },
  { text: 'while (coding) { }', top: '86%', left: '42%', delay: '0.4s' },
]

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Immersive coding-world backdrop — dotted mouse pathway, floating snippets, HUD.
 */
export default function DeveloperWorldBackground({ interactive = true }) {
  const rootRef = useRef(null)
  const trailRef = useRef(null)
  const ambientRef = useRef(null)
  const parallaxRef = useRef([])
  const lastPosRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    const trail = trailRef.current
    const ambient = ambientRef.current
    if (!root || !trail || !ambient) return undefined

    const reduced = prefersReducedMotion()
    const timers = []
    let cancelled = false
    const dots = []

    function pruneDots() {
      while (dots.length > TRAIL_CAP) {
        const old = dots.shift()
        old?.el?.remove()
      }
    }

    function spawnAmbient() {
      if (cancelled || reduced) return
      const particle = document.createElement('div')
      particle.className = 'dev-world-ambient'
      const size = Math.random() * 2.5 + 1
      particle.style.width = `${size}px`
      particle.style.height = `${size}px`
      const posX = Math.random() * 100
      const posY = Math.random() * 100
      particle.style.left = `${posX}%`
      particle.style.top = `${posY}%`
      particle.style.opacity = '0'
      ambient.appendChild(particle)

      const duration = Math.random() * 8 + 8
      const delay = Math.random() * 3
      const start = window.setTimeout(() => {
        if (cancelled) return
        particle.style.transition = `all ${duration}s linear`
        particle.style.opacity = String(Math.random() * 0.35 + 0.1)
        particle.style.left = `${posX + (Math.random() * 16 - 8)}%`
        particle.style.top = `${posY - Math.random() * 24}%`
        const end = window.setTimeout(() => {
          particle.remove()
          if (!cancelled) spawnAmbient()
        }, duration * 1000)
        timers.push(end)
      }, delay * 1000)
      timers.push(start)
    }

    if (!reduced) {
      for (let i = 0; i < AMBIENT_COUNT; i += 1) spawnAmbient()
    }

    function addDot(xPct, yPct) {
      const el = document.createElement('div')
      el.className = 'dev-world-trail-dot'
      el.style.left = `${xPct}%`
      el.style.top = `${yPct}%`
      trail.appendChild(el)
      dots.push({ el })
      pruneDots()

      window.requestAnimationFrame(() => {
        el.style.opacity = '0.85'
      })

      const fade = window.setTimeout(() => {
        el.style.opacity = '0'
        const remove = window.setTimeout(() => {
          el.remove()
          const idx = dots.findIndex((d) => d.el === el)
          if (idx >= 0) dots.splice(idx, 1)
        }, 400)
        timers.push(remove)
      }, TRAIL_LIFE_MS)
      timers.push(fade)
    }

    function onMove(event) {
      if (reduced || !interactive) return
      const rect = root.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const xPct = (x / rect.width) * 100
      const yPct = (y / rect.height) * 100

      const nx = x / rect.width
      const ny = y / rect.height
      const moveX = (nx - 0.5) * 10
      const moveY = (ny - 0.5) * 10
      parallaxRef.current.forEach((layer, index) => {
        if (!layer) return
        const factor = 1 + index * 0.3
        layer.style.transform = `translate(${moveX * factor}px, ${moveY * factor}px)`
      })

      const last = lastPosRef.current
      if (!last) {
        lastPosRef.current = { x, y }
        addDot(xPct, yPct)
        return
      }

      const dx = x - last.x
      const dy = y - last.y
      const dist = Math.hypot(dx, dy)
      if (dist < TRAIL_SPACING) return

      const steps = Math.floor(dist / TRAIL_SPACING)
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps
        const px = last.x + dx * t
        const py = last.y + dy * t
        addDot((px / rect.width) * 100, (py / rect.height) * 100)
      }
      lastPosRef.current = { x, y }
    }

    function onLeave() {
      lastPosRef.current = null
    }

    if (interactive && !reduced) {
      root.addEventListener('mousemove', onMove)
      root.addEventListener('mouseleave', onLeave)
    }

    return () => {
      cancelled = true
      timers.forEach((id) => window.clearTimeout(id))
      root.removeEventListener('mousemove', onMove)
      root.removeEventListener('mouseleave', onLeave)
      trail.replaceChildren()
      ambient.replaceChildren()
      parallaxRef.current.forEach((layer) => {
        if (layer) layer.style.transform = ''
      })
    }
  }, [interactive])

  return (
    <div ref={rootRef} className="dev-world-background" aria-hidden>
      {[1, 2, 3].map((n, index) => (
        <div
          key={n}
          ref={(el) => {
            parallaxRef.current[index] = el
          }}
          className="dev-world-parallax"
        >
          <div className={`dev-world-sphere dev-world-sphere-${n}`} />
        </div>
      ))}
      <div className="dev-world-grid" />
      <div className="dev-world-scanlines" />
      <div className="dev-world-glitch" />
      <div className="dev-world-glow" />
      {CODE_SNIPPETS.map((snippet) => (
        <span
          key={snippet.text}
          className="dev-world-snippet"
          style={{
            top: snippet.top,
            left: snippet.left,
            animationDelay: snippet.delay,
          }}
        >
          {snippet.text}
        </span>
      ))}
      <div ref={ambientRef} className="dev-world-ambient-layer" />
      <div ref={trailRef} className="dev-world-trail-layer" />
      <div className="dev-world-hud dev-world-hud-tl">SYS.OK</div>
      <div className="dev-world-hud dev-world-hud-tr">uptime 24/7</div>
      <div className="dev-world-hud dev-world-hud-bl">LATENCY — ms</div>
      <div className="dev-world-hud dev-world-hud-br">{'{ status: "live" }'}</div>
    </div>
  )
}

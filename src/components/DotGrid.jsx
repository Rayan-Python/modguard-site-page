import { useEffect, useRef } from 'react'

const SPACING = 34
const BASE_RADIUS = 1.3
const MAX_RADIUS = 3.2
const BASE_OPACITY = 0.14
const MAX_OPACITY = 0.9
const FALLOFF = 160
const EASE = 0.18

export default function DotGrid() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    let width = 0
    let height = 0
    let dpr = 1
    let dots = []
    let frame = null
    const pointer = { x: -9999, y: -9999, active: false }

    function buildGrid() {
      dots = []
      const cols = Math.ceil(width / SPACING) + 1
      const rows = Math.ceil(height / SPACING) + 1
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          dots.push({ x: c * SPACING, y: r * SPACING, scale: 0, opacity: BASE_OPACITY })
        }
      }
    }

    function resize() {
      width = window.innerWidth
      height = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildGrid()
    }

    function onPointerMove(e) {
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.active = true
    }

    function onPointerLeave() {
      pointer.active = false
    }

    function draw() {
      ctx.clearRect(0, 0, width, height)

      for (const dot of dots) {
        let targetScale = 0
        let targetOpacity = BASE_OPACITY

        if (pointer.active) {
          const dx = dot.x - pointer.x
          const dy = dot.y - pointer.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < FALLOFF) {
            const strength = 1 - dist / FALLOFF
            targetScale = strength
            targetOpacity = BASE_OPACITY + strength * (MAX_OPACITY - BASE_OPACITY)
          }
        }

        dot.scale += (targetScale - dot.scale) * EASE
        dot.opacity += (targetOpacity - dot.opacity) * EASE

        const radius = BASE_RADIUS + dot.scale * (MAX_RADIUS - BASE_RADIUS)
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(242, 242, 242, ${dot.opacity})`
        ctx.fill()
      }

      frame = requestAnimationFrame(draw)
    }

    function onVisibilityChange() {
      if (document.hidden) {
        if (frame !== null) {
          cancelAnimationFrame(frame)
          frame = null
        }
      } else if (frame === null) {
        frame = requestAnimationFrame(draw)
      }
    }

    resize()
    frame = requestAnimationFrame(draw)

    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return <canvas ref={canvasRef} className="dot-grid" aria-hidden="true" />
}

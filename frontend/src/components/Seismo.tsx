import { useEffect, useRef } from 'react'

// A live seismograph trace. `level` (0..1) sets the tremor amplitude; the trace
// scrolls continuously so the instrument always feels switched on.
export function Seismo({
  level = 0.3,
  color = '#6fb3b0',
  height = 22,
  speed = 1,
  className = '',
}: {
  level?: number
  color?: string
  height?: number
  speed?: number
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const lvl = useRef(level)
  lvl.current = level
  const col = useRef(color)
  col.current = color

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let W = 0
    const H = height
    const buf: number[] = []
    let amp = lvl.current
    let phase = 0
    const resize = () => {
      W = cv.clientWidth
      cv.width = W * dpr
      cv.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(cv)
    let raf = 0
    let last = performance.now()
    let acc = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      acc += ((now - last) / 16) * speed
      last = now
      amp += (lvl.current - amp) * 0.04
      while (acc >= 1) {
        acc -= 1
        phase += 0.35
        const burst = Math.random() < 0.012 * (0.3 + amp) ? 2.4 : 1
        const v =
          (Math.sin(phase) * 0.35 + Math.sin(phase * 2.7) * 0.25 + (Math.random() - 0.5) * 1.1) *
          amp *
          burst
        buf.push(v)
        if (buf.length > W / 2 + 2) buf.shift()
      }
      ctx.clearRect(0, 0, W, H)
      ctx.strokeStyle = 'rgba(170,196,204,0.08)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, H / 2 + 0.5)
      ctx.lineTo(W, H / 2 + 0.5)
      ctx.stroke()
      ctx.strokeStyle = col.current
      ctx.lineWidth = 1.1
      ctx.beginPath()
      const off = W - buf.length * 2
      buf.forEach((v, i) => {
        const x = off + i * 2
        const y = H / 2 - v * (H / 2 - 1)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      // pen head
      if (buf.length) {
        const y = H / 2 - buf[buf.length - 1] * (H / 2 - 1)
        ctx.fillStyle = col.current
        ctx.beginPath()
        ctx.arc(W - 2, y, 1.8, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [height, speed])

  return <canvas ref={ref} className={`seismo ${className}`} style={{ height }} />
}

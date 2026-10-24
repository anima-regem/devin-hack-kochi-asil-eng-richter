import { heat } from '../lib/heat'

// Analog meter, 0-10. The needle is a CSS transform with a spring curve, so a new
// reading swings past and settles like a physical instrument.
export function Gauge({ value, size = 200 }: { value: number; size?: number }) {
  const w = size
  const h = size * 0.58
  const cx = w / 2
  const cy = h - 6
  const R = w / 2 - 12
  const angle = (v: number) => Math.PI + (Math.min(10, Math.max(0, v)) / 10) * Math.PI
  const pt = (v: number, r: number) => [cx + Math.cos(angle(v)) * r, cy + Math.sin(angle(v)) * r]

  const ticks = []
  for (let i = 0; i <= 20; i++) {
    const v = i / 2
    const major = i % 2 === 0
    const [x1, y1] = pt(v, R)
    const [x2, y2] = pt(v, R - (major ? 9 : 5))
    ticks.push(
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={major ? 'var(--text-3)' : 'var(--text-4)'} strokeWidth={1} />,
    )
    if (major && i % 4 === 0) {
      const [tx, ty] = pt(v, R - 19)
      ticks.push(
        <text key={`t${i}`} x={tx} y={ty} className="gauge-num" textAnchor="middle" dominantBaseline="middle">
          {v}
        </text>,
      )
    }
  }
  // heat band along the arc
  const segs = []
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * 10
    const b = ((i + 1) / 40) * 10
    const [x1, y1] = pt(a, R + 4)
    const [x2, y2] = pt(b, R + 4)
    segs.push(
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={heat(a / 10, a <= value ? 1 : 0.18)} strokeWidth={3} />,
    )
  }
  const rot = (Math.min(10, Math.max(0, value)) / 10) * 180 - 90

  return (
    <svg className="gauge" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {segs}
      {ticks}
      <g className="gauge-needle" style={{ transform: `rotate(${rot}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
        <line x1={cx} y1={cy} x2={cx} y2={cy - R + 6} stroke="var(--text)" strokeWidth={1.4} />
        <line x1={cx} y1={cy} x2={cx} y2={cy + 8} stroke="var(--text)" strokeWidth={1.4} />
      </g>
      <circle cx={cx} cy={cy} r={3.5} fill="var(--bg)" stroke="var(--text)" strokeWidth={1.2} />
    </svg>
  )
}

/** Thin horizontal meter with tick marks. */
export function Meter({ value, hot = true }: { value: number; hot?: boolean }) {
  const v = Math.min(1, Math.max(0, value))
  return (
    <div className="meter">
      <div
        className="meter-fill"
        style={{
          transform: `scaleX(${v})`,
          background: hot ? `linear-gradient(90deg, ${heat(0.25)}, ${heat(Math.max(0.3, v))})` : 'var(--cool-2)',
        }}
      />
      <div className="meter-ticks" />
    </div>
  )
}

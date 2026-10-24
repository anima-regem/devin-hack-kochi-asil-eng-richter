import { useEffect, useMemo, useRef, useState } from 'react'
import type { Snapshots } from '../lib/types'

// Time-travel scrubber. The track is a seismogram of the repo's whole history:
// commit volume as mirrored strokes, fix commits in the hot accent. Dragging the
// needle sets a fractional snapshot index; the city interpolates between frames.

interface Props {
  snapshots: Snapshots
  time: number | null
  setTime: (t: number | null) => void
}

const PLAY_MS = 14000

const fmt = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

export function Timeline({ snapshots, time, setTime }: Props) {
  const frames = snapshots.frames
  const last = frames.length - 1
  const t0 = snapshots.activity[0]?.ts ?? frames[0].ts
  const t1 = frames[last].ts
  const track = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [drag, setDrag] = useState(false)

  // timestamp <-> fractional frame index (frames are not evenly spaced in time)
  const tsAt = (f: number) => {
    const i = Math.min(last, Math.max(0, Math.floor(f)))
    const j = Math.min(last, i + 1)
    return frames[i].ts + (frames[j].ts - frames[i].ts) * (f - i)
  }
  const frameAt = (ts: number) => {
    if (ts <= frames[0].ts) return 0
    for (let i = 1; i <= last; i++) {
      if (ts <= frames[i].ts) return i - 1 + (ts - frames[i - 1].ts) / Math.max(1, frames[i].ts - frames[i - 1].ts)
    }
    return last
  }
  const pos = (ts: number) => (ts - t0) / Math.max(1, t1 - t0)
  const f = time ?? last
  const ts = tsAt(f)
  const cur = frames[Math.round(f)]
  const alive = cur.importance.filter((v) => v !== null).length
  const commitsAt = Math.round(
    frames[Math.floor(f)].commits + (frames[Math.min(last, Math.floor(f) + 1)].commits - frames[Math.floor(f)].commits) * (f % 1),
  )

  const maxC = useMemo(() => Math.max(1, ...snapshots.activity.map((a) => a.commits)), [snapshots])

  // playback: eased sweep through history, then settle on the present
  useEffect(() => {
    if (!playing) return
    const start = performance.now()
    const from = time !== null && time < last - 0.01 ? time : 0
    let raf = 0
    const tick = (now: number) => {
      const u = Math.min(1, (now - start) / (PLAY_MS * (1 - from / last)))
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2
      setTime(from + (last - from) * e)
      if (u < 1) raf = requestAnimationFrame(tick)
      else {
        setPlaying(false)
        setTime(null)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  const scrubTo = (clientX: number) => {
    const r = track.current!.getBoundingClientRect()
    const u = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    const fr = frameAt(t0 + u * (t1 - t0))
    setTime(fr >= last - 0.001 ? null : fr)
  }

  useEffect(() => {
    if (!drag) return
    const move = (e: PointerEvent) => scrubTo(e.clientX)
    const up = () => setDrag(false)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag])

  const years: number[] = []
  for (let y = new Date(t0 * 1000).getFullYear() + 1; y <= new Date(t1 * 1000).getFullYear(); y++) years.push(y)

  return (
    <div className={`timeline ${drag ? 'is-drag' : ''}`}>
      <button
        className={`tl-play ${playing ? 'is-on' : ''}`}
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? 'pause' : 'play history'}
      >
        {playing ? (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="1" y="1" width="3" height="8" fill="currentColor" />
            <rect x="6" y="1" width="3" height="8" fill="currentColor" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M2 1 L9 5 L2 9 Z" fill="currentColor" />
          </svg>
        )}
      </button>
      <div className="tl-readout">
        <div className="tl-date">{time === null ? 'PRESENT' : fmt(ts)}</div>
        <div className="tl-sub">
          {commitsAt.toLocaleString()} COMMITS · {alive} FILES
        </div>
      </div>
      <div
        className="tl-track"
        ref={track}
        onPointerDown={(e) => {
          setPlaying(false)
          setDrag(true)
          scrubTo(e.clientX)
        }}
      >
        <svg className="tl-trace" viewBox="0 0 1000 40" preserveAspectRatio="none">
          {snapshots.activity.map((a, k) => {
            const x = pos(a.ts) * 1000
            const h = Math.sqrt(a.commits / maxC) * 17
            const hf = Math.sqrt(a.fixes / maxC) * 17
            const past = a.ts <= ts
            return (
              <g key={k} opacity={past ? 1 : 0.35}>
                <line x1={x} x2={x} y1={20 - h} y2={20 + h} stroke={past ? '#4d8583' : '#3a454b'} strokeWidth={2.2} />
                {a.fixes > 0 && (
                  <line x1={x} x2={x} y1={20 - hf} y2={20 + hf} stroke={past ? '#ff6a1a' : '#5d3a2a'} strokeWidth={2.2} />
                )}
              </g>
            )
          })}
          <line x1="0" x2="1000" y1="20" y2="20" stroke="rgba(170,196,204,0.12)" strokeWidth="1" />
        </svg>
        {frames.map((fr, k) => (
          <span key={k} className="tl-frame" style={{ left: `${pos(fr.ts) * 100}%` }} />
        ))}
        {years.map((y) => (
          <span key={y} className="tl-year" style={{ left: `${pos(Date.UTC(y, 0, 1) / 1000) * 100}%` }}>
            {y}
          </span>
        ))}
        <div className="tl-needle" style={{ left: `${pos(ts) * 100}%` }}>
          <span className="tl-needle-head" />
        </div>
      </div>
      <button className="tl-now" onClick={() => setTime(null)} disabled={time === null}>
        NOW
      </button>
    </div>
  )
}

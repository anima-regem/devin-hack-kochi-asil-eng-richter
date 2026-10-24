import { Seismo } from './Seismo'

// First-load moment: the instrument powers up and calibrates while the model loads.
export function BootScreen({ lines, done }: { lines: string[]; done: boolean }) {
  return (
    <div className={`boot ${done ? 'boot-done' : ''}`}>
      <div className="boot-inner">
        <div className="boot-mark">
          RICHTER<span className="boot-mark-sub">/ magnitude of risk</span>
        </div>
        <Seismo level={done ? 0.05 : 0.7} color="#ff6a1a" height={64} speed={1.4} className="boot-trace" />
        <div className="boot-lines">
          {lines.map((l, i) => (
            <div key={i} className="boot-line" style={{ animationDelay: `${i * 90}ms` }}>
              <span className="boot-tick">{String(i).padStart(2, '0')}</span>
              {l}
            </div>
          ))}
          <div className="boot-cursor" />
        </div>
      </div>
    </div>
  )
}

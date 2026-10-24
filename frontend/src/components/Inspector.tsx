import { useEffect, useMemo, useState } from 'react'
import { fetchNote } from '../lib/data'
import { fmtM, heat, shortName } from '../lib/heat'
import type { Note, RiskModel } from '../lib/types'
import { Meter } from './Gauge'
import { Seismo } from './Seismo'

interface Props {
  model: RiskModel
  slug: string
  selected: number | null
  onSelect: (i: number | null) => void
}

type Kind = 'guard' | 'unblock'

export function Inspector({ model, slug, selected, onSelect }: Props) {
  if (selected === null || !model.nodes[selected]) return <EmptyInspector />
  return <FileInspector key={`${slug}:${selected}`} model={model} slug={slug} i={selected} onSelect={onSelect} />
}

function EmptyInspector() {
  return (
    <aside className="rail rail-right">
      <section className="panel empty">
        <div className="label">EPICENTER</div>
        <Seismo level={0.04} color="#3a454b" height={40} />
        <div className="empty-title">No epicenter selected</div>
        <p className="empty-copy">
          Click any file to trace its blast radius — every module that would feel the shock if it changed, ring by
          ring.
        </p>
        <div className="empty-keys">
          <span>
            <kbd>1</kbd> graph
          </span>
          <span>
            <kbd>2</kbd> risk map
          </span>
          <span>
            <kbd>3</kbd> city
          </span>
          <span>
            <kbd>esc</kbd> clear
          </span>
        </div>
      </section>
    </aside>
  )
}

function FileInspector({ model, slug, i, onSelect }: { model: RiskModel; slug: string; i: number; onSelect: Props['onSelect'] }) {
  const n = model.nodes[i]
  const [kind, setKind] = useState<Kind>(n.human > n.structural ? 'unblock' : 'guard')

  const rings = useMemo(() => {
    const byHop = new Map<number, number[]>()
    for (const [j, h] of n.blast) byHop.set(h, [...(byHop.get(h) ?? []), j])
    return [...byHop.entries()].sort((a, b) => a[0] - b[0])
  }, [n])
  const partners = useMemo(
    () =>
      model.cochange
        .filter((c) => c.ghost && (c.a === i || c.b === i))
        .sort((a, b) => b.shared - a.shared)
        .map((c) => ({ j: c.a === i ? c.b : c.a, shared: c.shared })),
    [model, i],
  )
  const parts = n.id.split('/')
  const file = parts.pop()
  const pct = Math.round((n.blast_size / Math.max(1, model.nodes.length - 1)) * 100)

  return (
    <aside className="rail rail-right">
      <section className="panel insp-head">
        <div className="label">
          EPICENTER
          <button className="x" onClick={() => onSelect(null)} aria-label="clear selection">
            ESC ✕
          </button>
        </div>
        <div className="insp-dir">{parts.join('/') || '.'}/</div>
        <div className="insp-file">{file}</div>
        <div className="insp-mag">
          <div className="insp-mag-num" style={{ color: heat(n.magnitude), textShadow: `0 0 24px ${heat(n.magnitude, 0.45)}` }}>
            {fmtM(n.magnitude)}
          </div>
          <div className="insp-mag-side">
            <div className="label-dim">MAGNITUDE</div>
            <div className="insp-axes">
              <div>
                <span>STRUCTURAL</span>
                <Meter value={n.structural} hot={false} />
              </div>
              <div>
                <span>HUMAN</span>
                <Meter value={n.human} />
              </div>
            </div>
          </div>
        </div>
        {n.bus_factor && <div className="flag">BUS FACTOR 1 — one author has written every commit</div>}
      </section>

      <section className="panel readouts">
        <Readout k="BLAST RADIUS" v={n.blast_size} unit={`files · ${pct}%`} hot={n.blast_size > 0} />
        <Readout k="IMPORTANCE" v={`P${Math.round(n.importance * 100)}`} unit="pagerank" />
        <Readout k="CHURN" v={n.churn} unit="commits" />
        <Readout k="FIXES" v={n.fixes} unit={`ratio ${(n.fix_ratio * 100).toFixed(0)}%`} hot={n.fix_ratio > 0.25} />
        <Readout k="AUTHORS" v={n.authors} unit="" />
        <Readout k="LOC" v={n.loc.toLocaleString()} unit="lines" />
      </section>

      <section className="panel">
        <div className="label">
          DOWNSTREAM <span className="label-dim">/ who breaks, by distance</span>
        </div>
        {rings.length === 0 && <div className="muted">No in-repo dependents. Callers outside the repo may still rely on it.</div>}
        <div className="rings">
          {rings.map(([h, js]) => (
            <div key={h} className="ring" style={{ animationDelay: `${h * 260}ms` }}>
              <div className="ring-h">
                <span className="ring-dot" style={{ background: h <= 1 ? 'var(--red)' : h === 2 ? 'var(--orange)' : 'var(--amber)' }} />
                HOP {h}
                <b>{js.length}</b>
              </div>
              <div className="chips">
                {js.slice(0, 14).map((j) => (
                  <button key={j} className="chip" onClick={() => onSelect(j)} title={model.nodes[j].id}>
                    {shortName(model.nodes[j].id)}
                  </button>
                ))}
                {js.length > 14 && <span className="chip chip-more">+{js.length - 14}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {partners.length > 0 && (
        <section className="panel">
          <div className="label">
            HIDDEN COUPLING <span className="label-dim">/ co-change, no import</span>
          </div>
          <div className="chips">
            {partners.slice(0, 8).map((p) => (
              <button key={p.j} className="chip chip-ghost" onClick={() => onSelect(p.j)} title={model.nodes[p.j].id}>
                {shortName(model.nodes[p.j].id)} <b>{p.shared}×</b>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="panel panel-grow agent">
        <div className="tabs">
          <button className={kind === 'guard' ? 'is-on' : ''} onClick={() => setKind('guard')}>
            GUARD NOTE
          </button>
          <button className={kind === 'unblock' ? 'is-on' : ''} onClick={() => setKind('unblock')}>
            UNBLOCK PLAN
          </button>
        </div>
        <AgentNote key={kind} slug={slug} file={n.id} kind={kind} />
      </section>
    </aside>
  )
}

function Readout({ k, v, unit, hot }: { k: string; v: string | number; unit: string; hot?: boolean }) {
  return (
    <div className={`readout ${hot ? 'is-hot' : ''}`}>
      <div className="readout-k">{k}</div>
      <div className="readout-v">{v}</div>
      <div className="readout-u">{unit}</div>
    </div>
  )
}

function AgentNote({ slug, file, kind }: { slug: string; file: string; kind: Kind }) {
  const [note, setNote] = useState<Note | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    fetchNote(slug, file, kind)
      .then((r) => live && setNote(r))
      .catch((e: Error) => live && setErr(e.message))
    return () => {
      live = false
    }
  }, [slug, file, kind])

  if (err)
    return (
      <div className="note note-err">
        <div className="label-dim">AGENT OFFLINE</div>
        <p>Notes need the Richter API running (`uvicorn richter.api:app`). {err}</p>
      </div>
    )
  if (!note)
    return (
      <div className="note note-loading">
        <div className="scan" />
        <div className="label-dim">TRANSMITTING…</div>
        <div className="skeleton" style={{ width: '82%' }} />
        <div className="skeleton" style={{ width: '64%' }} />
        <div className="skeleton" style={{ width: '74%' }} />
      </div>
    )

  const list = kind === 'guard' ? note.what_breaks : note.plan
  return (
    <div className="note">
      <div className={`note-src ${note.source === 'ai' ? 'is-ai' : ''}`}>
        {note.source === 'ai' ? `AI · GPT-4O-MINI${note.cached ? ' · CACHED' : ''}` : 'RULE-BASED · NO API KEY'}
      </div>
      <div className="note-headline">{note.headline}</div>
      {kind === 'guard' ? <p>{note.why}</p> : <p>{note.diagnosis}</p>}
      {list && list.length > 0 && (
        <>
          <div className="label-dim">{kind === 'guard' ? 'WHAT BREAKS' : 'PLAN'}</div>
          <ol className="note-list">
            {list.map((x, k) => (
              <li key={k}>{x}</li>
            ))}
          </ol>
        </>
      )}
      {kind === 'guard' && note.checklist && (
        <>
          <div className="label-dim">BEFORE YOU MERGE</div>
          <ul className="note-check">
            {note.checklist.map((x, k) => (
              <li key={k}>{x}</li>
            ))}
          </ul>
        </>
      )}
      {kind === 'unblock' && note.owner_hint && <p className="note-owner">{note.owner_hint}</p>}
    </div>
  )
}

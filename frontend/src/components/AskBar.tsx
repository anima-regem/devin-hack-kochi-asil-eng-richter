import { useState } from 'react'
import { askRepo } from '../lib/data'
import { shortName } from '../lib/heat'
import type { AskResult, RiskModel } from '../lib/types'

const SUGGESTIONS = ['Which files are most fragile?', 'Where is hidden coupling?', 'What would break if I refactor the core?']

interface Props {
  slug: string
  model: RiskModel
  onHighlight: (files: Set<number>) => void
  onSelect: (i: number) => void
}

// A command line, not a chat bubble: one question in, one plain-English reading out,
// with the named files targeted on the instrument.
export function AskBar({ slug, model, onHighlight, onSelect }: Props) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<AskResult | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (question: string) => {
    if (!question.trim() || busy) return
    setBusy(true)
    setErr(null)
    setRes(null)
    try {
      const r = await askRepo(slug, question)
      setRes(r)
      const idx = new Map(model.nodes.map((n, i) => [n.id, i]))
      onHighlight(new Set(r.files.map((f) => idx.get(f)!).filter((i) => i !== undefined)))
    } catch (e) {
      setErr((e as Error).message)
      onHighlight(new Set())
    } finally {
      setBusy(false)
    }
  }
  const clear = () => {
    setRes(null)
    setErr(null)
    onHighlight(new Set())
  }

  return (
    <div className="ask">
      {(res || err) && (
        <div className={`ask-out ${err ? 'is-err' : ''}`}>
          <div className="ask-out-head">
            <span className="label-dim">{err ? 'NO READING' : `READING${res?.cached ? ' · CACHED' : ''}`}</span>
            <button className="x" onClick={clear}>
              CLEAR ✕
            </button>
          </div>
          {err && <p>{err.includes('API key') ? 'Ask-the-repo needs OPENAI_API_KEY in .env — see README.' : err}</p>}
          {res && (
            <>
              <p>{res.answer}</p>
              {res.files.length > 0 && (
                <div className="chips">
                  {res.files.map((f) => (
                    <button key={f} className="chip chip-target" onClick={() => onSelect(model.nodes.findIndex((n) => n.id === f))}>
                      ⌖ {shortName(f)}
                    </button>
                  ))}
                </div>
              )}
              {res.dropped > 0 && <div className="muted">{res.dropped} unverified path(s) discarded</div>}
            </>
          )}
        </div>
      )}
      <form
        className={`ask-bar ${busy ? 'is-busy' : ''}`}
        onSubmit={(e) => {
          e.preventDefault()
          submit(q)
        }}
      >
        <span className="ask-prompt">ASK ›</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="which files are most fragile?"
          spellCheck={false}
          aria-label="Ask the repo"
        />
        {!q && !busy && (
          <div className="ask-sugs">
            {SUGGESTIONS.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => {
                  setQ(s)
                  submit(s)
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <button type="submit" className="ask-go" disabled={busy}>
          {busy ? 'READING' : 'RUN'}
        </button>
        {busy && <div className="ask-scan" />}
      </form>
    </div>
  )
}

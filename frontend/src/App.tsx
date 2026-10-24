import { useCallback, useEffect, useState } from 'react'
import { AskBar } from './components/AskBar'
import { BootScreen } from './components/BootScreen'
import { Inspector } from './components/Inspector'
import { LeftRail } from './components/LeftRail'
import { TopBar } from './components/TopBar'
import { listRepos, loadModel } from './lib/data'
import type { RepoEntry, RiskModel, View } from './lib/types'
import { GraphView } from './views/GraphView'

const PREFERRED = 'textualize__rich'

export default function App() {
  const [repos, setRepos] = useState<RepoEntry[]>([])
  const [slug, setSlug] = useState<string | null>(null)
  const [model, setModel] = useState<RiskModel | null>(null)
  const [view, setView] = useState<View>('graph')
  const [selected, setSelected] = useState<number | null>(null)
  const [highlight, setHighlight] = useState<Set<number>>(new Set())
  const [layers, setLayers] = useState({ ghost: false, bus: false })
  const [boot, setBoot] = useState<string[]>(['POWERING INSTRUMENT', 'CALIBRATING SENSORS'])
  const [booted, setBooted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listRepos()
      .then((rs) => {
        setRepos(rs)
        const first = rs.find((r) => r.slug === PREFERRED) ?? rs[0]
        if (first) setSlug(first.slug)
        else setError('No analyzed repos found. Run `python -m richter.cli analyze <url>`.')
      })
      .catch((e) => setError(String(e)))
  }, [])

  useEffect(() => {
    if (!slug) return
    let live = true
    setSelected(null)
    setHighlight(new Set())
    loadModel(slug)
      .then((m) => {
        if (!live) return
        setBoot((b) => [
          ...b.slice(0, 2),
          `READING ${m.repo.name.toUpperCase()}`,
          `${m.repo.commits.toLocaleString()} COMMITS · ${m.repo.authors} AUTHORS`,
          `${m.summary.files} FILES · ${m.summary.edges} IMPORT EDGES · ${m.summary.ghost_edges} GHOST`,
          'SIGNAL LOCKED',
        ])
        setModel(m)
        setTimeout(() => live && setBooted(true), 900)
      })
      .catch((e) => setError(String(e)))
    return () => {
      live = false
    }
  }, [slug])

  const select = useCallback((i: number | null) => setSelected(i), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'Escape') {
        setSelected(null)
        setHighlight(new Set())
      }
      if (e.key === '1') setView('graph')
      if (e.key === '2') setView('risk')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onAnalyzed = async (s: string) => {
    setRepos(await listRepos())
    setSlug(s)
  }

  return (
    <div className="app">
      <TopBar
        repos={repos}
        slug={slug}
        onRepo={setSlug}
        view={view}
        onView={setView}
        onAnalyzed={onAnalyzed}
        cityReady={false}
      />
      {model && slug && (
        <>
          <LeftRail model={model} selected={selected} onSelect={select} layers={layers} setLayers={setLayers} />
          <main className="stage" key={slug}>
            <div className="hud hud-tl">
              <span className="hud-view">{view === 'risk' ? 'RISK MAP' : 'DEPENDENCY GRAPH'}</span>
              <span>{model.summary.files} FILES</span>
              <span>{model.summary.edges} EDGES</span>
              <span>{view === 'risk' ? 'COLOR = MAGNITUDE' : 'SIZE = IMPORTANCE'}</span>
            </div>
            <GraphView
              model={model}
              mode={view === 'risk' ? 'risk' : 'graph'}
              selected={selected}
              highlight={highlight}
              layers={layers}
              onSelect={select}
            />
            <div className="hud hud-br">SCROLL ZOOM · DRAG PAN · DBL-CLICK FIT</div>
            <AskBar slug={slug} model={model} onHighlight={setHighlight} onSelect={select} />
          </main>
          <Inspector model={model} slug={slug} selected={selected} onSelect={select} />
        </>
      )}
      {error && <div className="fatal">{error}</div>}
      <BootScreen lines={boot} done={booted} />
    </div>
  )
}

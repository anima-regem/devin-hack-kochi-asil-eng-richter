import { shortName } from './heat'
import type { FileNode, RiskModel } from './types'

// Repo-level report card. Per-file magnitudes are rank-relative within a repo, so a
// repo grade built from them would always look the same. Instead the grade uses four
// ABSOLUTE signals, each in 0..1:
//   fixConcentration  share of all fix touches landing in the hottest 10% of files
//   reach             largest blast radius as a share of the codebase
//   busFactor         share of files only one person has ever touched
//   coupling          hidden co-change pairs per file (capped at 1)
export interface Report {
  magnitude: number // 0..10
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  signals: { label: string; value: number; detail: string }[]
  mostDangerous: FileNode
  risks: { kind: string; title: string; detail: string; file: string }[]
}


export function buildReport(m: RiskModel): Report {
  const nodes = m.nodes
  const byMag = [...nodes].sort((a, b) => b.magnitude - a.magnitude)
  const top = byMag.slice(0, Math.max(1, Math.round(nodes.length * 0.1)))
  const totalFixes = nodes.reduce((s, n) => s + n.fixes, 0) || 1
  const fixConcentration = top.reduce((s, n) => s + n.fixes, 0) / totalFixes
  const widest = nodes.reduce((a, b) => (b.blast_size > a.blast_size ? b : a))
  const reach = widest.blast_size / Math.max(1, nodes.length - 1)
  const busFactor = m.summary.bus_factor_files / Math.max(1, nodes.length)
  const coupling = Math.min(1, m.summary.ghost_edges / Math.max(1, nodes.length))

  const magnitude = 10 * (0.35 * fixConcentration + 0.25 * reach + 0.2 * busFactor + 0.2 * coupling)
  const grade = magnitude < 3 ? 'A' : magnitude < 4.5 ? 'B' : magnitude < 6 ? 'C' : magnitude < 7.5 ? 'D' : 'F'

  const mostDangerous = byMag[0]
  const ghost = [...m.cochange].filter((c) => c.ghost).sort((a, b) => b.shared - a.shared)[0]
  const lonely = byMag.find((n) => n.bus_factor && n !== mostDangerous)

  const risks: Report['risks'] = [
    {
      kind: 'BLAST',
      title: `${shortName(widest.id)} reaches ${widest.blast_size} files`,
      detail: `${Math.round(reach * 100)}% of the codebase sits downstream of one module.`,
      file: widest.id,
    },
  ]
  if (ghost) {
    const a = nodes[ghost.a].id
    const b = nodes[ghost.b].id
    risks.push({
      kind: 'GHOST',
      title: `${shortName(a)} ⟷ ${shortName(b)}`,
      detail: `Changed together ${ghost.shared}× with no import between them — hidden coupling.`,
      file: a,
    })
  }
  if (lonely) {
    risks.push({
      kind: 'BUS',
      title: `${shortName(lonely.id)} has one author`,
      detail: `Magnitude ${(lonely.magnitude * 10).toFixed(1)}, ${lonely.churn} commits, a single person behind all of them.`,
      file: lonely.id,
    })
  }

  return {
    magnitude,
    grade,
    signals: [
      { label: 'FIX CONCENTRATION', value: fixConcentration, detail: 'fix touches in hottest 10%' },
      { label: 'REACH', value: reach, detail: 'widest blast radius / codebase' },
      { label: 'BUS FACTOR', value: busFactor, detail: 'single-author files' },
      { label: 'HIDDEN COUPLING', value: coupling, detail: 'ghost pairs per file' },
    ],
    mostDangerous,
    risks: risks.slice(0, 3),
  }
}

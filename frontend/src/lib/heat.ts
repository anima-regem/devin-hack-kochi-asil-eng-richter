// The single color system for risk. Cool, quiet teal for safe; amber -> red for danger.
// Everything that encodes magnitude (2D nodes, 3D towers, meters) goes through here.

type RGB = [number, number, number]

const STOPS: [number, RGB][] = [
  [0.0, [36, 64, 63]], //   cool-dim
  [0.3, [77, 133, 131]], // cool-2
  [0.5, [112, 132, 134]], // neutral steel
  [0.6, [255, 176, 46]], //  amber
  [0.78, [255, 106, 26]], // orange
  [1.0, [255, 45, 31]], //   red
]

export function heatRGB(t: number): RGB {
  const x = Math.min(1, Math.max(0, t))
  for (let i = 1; i < STOPS.length; i++) {
    const [t1, c1] = STOPS[i]
    if (x <= t1) {
      const [t0, c0] = STOPS[i - 1]
      const k = (x - t0) / (t1 - t0)
      return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k]
    }
  }
  return STOPS[STOPS.length - 1][1]
}

export function heat(t: number, alpha = 1): string {
  const [r, g, b] = heatRGB(t)
  return `rgba(${r | 0},${g | 0},${b | 0},${alpha})`
}

export function heatHex(t: number): number {
  const [r, g, b] = heatRGB(t)
  return ((r | 0) << 16) | ((g | 0) << 8) | (b | 0)
}

/** Richter-scale descriptor for a 0-10 magnitude. */
export function descriptor(m: number): string {
  if (m < 2) return 'MICRO'
  if (m < 4) return 'MINOR'
  if (m < 5) return 'LIGHT'
  if (m < 6) return 'MODERATE'
  if (m < 7) return 'STRONG'
  if (m < 8) return 'MAJOR'
  return 'GREAT'
}

export const fmtM = (magnitude01: number) => (magnitude01 * 10).toFixed(1)

/** Short display name; package inits keep their package so they stay unambiguous. */
export function shortName(path: string): string {
  const parts = path.split('/')
  const file = parts[parts.length - 1]
  return file === '__init__.py' && parts.length > 1 ? `${parts[parts.length - 2]}/__init__` : file
}

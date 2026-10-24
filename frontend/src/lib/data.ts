import type { AskResult, Note, RepoEntry, RiskModel, Snapshots } from './types'

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.json() as Promise<T>
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((data as { detail?: string }).detail ?? `${r.status}`)
  return data as T
}

// Demo data is served statically from data/ so the app runs without the backend;
// the API is the fallback for freshly analyzed repos.
export async function listRepos(): Promise<RepoEntry[]> {
  try {
    return await getJSON<RepoEntry[]>('/api/repos')
  } catch {
    return getJSON<RepoEntry[]>('/models/index.json')
  }
}

export async function loadModel(slug: string): Promise<RiskModel> {
  try {
    return await getJSON<RiskModel>(`/models/${slug}.json`)
  } catch {
    return getJSON<RiskModel>(`/api/model/${slug}`)
  }
}

export async function loadSnapshots(slug: string): Promise<Snapshots | null> {
  try {
    return await getJSON<Snapshots>(`/snapshots/${slug}.json`)
  } catch {
    return null
  }
}

export const fetchNote = (slug: string, file: string, kind: 'guard' | 'unblock') =>
  postJSON<Note>('/api/note', { slug, file, kind })

export const askRepo = (slug: string, question: string) =>
  postJSON<AskResult>('/api/ask', { slug, question })

export interface Job {
  id: string
  stage: 'queued' | 'clone' | 'history' | 'score' | 'done' | 'error'
  detail: string
  slug?: string
}

export const startAnalyze = (url: string) => postJSON<Job>('/api/analyze', { url })
export const pollJob = (id: string) => getJSON<Job>(`/api/jobs/${id}`)

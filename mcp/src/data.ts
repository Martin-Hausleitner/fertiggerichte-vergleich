/** Loads the app's public data.json (local file or https URL). Read-only, cached. */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { RowLike } from '../../src/app/genui/query.ts'

export type DataFile = { rows: RowLike[]; generated?: string; [k: string]: unknown }
export const DEFAULT_DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/data.json')
export const PUBLIC_DATA_URL = 'https://servas-ai.github.io/fertiggerichte-vergleich/data.json'

let cache: { src: string; at: number; data: DataFile } | null = null
const TTL = 10 * 60_000

export async function loadData(src = process.env.GOODCHOICE_DATA ?? DEFAULT_DATA): Promise<DataFile> {
  if (cache && cache.src === src && Date.now() - cache.at < TTL) return cache.data
  let txt: string
  if (/^https:\/\//.test(src)) { const r = await fetch(src); if (!r.ok) throw new Error(`data fetch ${r.status}`); txt = await r.text() }
  else txt = await readFile(src, 'utf8')
  const data = JSON.parse(txt) as DataFile
  if (!Array.isArray(data.rows)) throw new Error('data.json has no rows[]')
  cache = { src, at: Date.now(), data }
  return data
}
export function setDataForTests(data: DataFile) { cache = { src: process.env.GOODCHOICE_DATA ?? DEFAULT_DATA, at: Date.now() + 1e12, data } }

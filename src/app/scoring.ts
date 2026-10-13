import { useSyncExternalStore } from 'react'
import type { Row } from '@/lib'
import { protPerPortion, pricePerPortion } from './meal'
/** Gewichtungen – Defaults = aktuelle Werte aus export_app.py (pli = 0,5·Score + 0,5·min(ppe/20,1)·100). Nur lokal gespeichert. */
export type ScoreCfg = { wHealth: number; ppeCap: number; sugarMax: number }
export const DEFAULT_CFG: ScoreCfg = { wHealth: 0.5, ppeCap: 20, sugarMax: 0 }
const K = 'fg-scorecfg'; const subs = new Set<() => void>()
let cfg: ScoreCfg = (() => { try { return { ...DEFAULT_CFG, ...JSON.parse(localStorage.getItem(K) || '{}') } } catch { return DEFAULT_CFG } })()
export const getCfg = () => cfg
export const setCfg = (c: Partial<ScoreCfg>) => { cfg = { ...cfg, ...c }; localStorage.setItem(K, JSON.stringify(cfg)); subs.forEach(f => f()) }
export const useCfg = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => cfg)
/** Zucker-Abzug: ab 5 g/100 g, bei 15 g voller Abzug von `sugarMax` Punkten (Default 0 = wie bisher). */
export const clientScore = (r: Row, c = cfg) => r.score == null ? null : Math.max(0, Math.min(100, r.score - (r.sugar == null ? 0 : Math.min(Math.max(r.sugar - 5, 0) / 10, 1) * c.sugarMax)))
/** Preis-Leistung je Portion: wHealth·Score + (1−wHealth)·min(Protein pro € / cap, 1)·100 */
export function valueScore(r: Row, c = cfg) {
  const s = clientScore(r, c), pp = pricePerPortion(r), pr = protPerPortion(r); if (s == null || !pp) return null
  const ppe = pr != null ? pr / pp : 0
  return c.wHealth * s + (1 - c.wHealth) * Math.min(ppe / c.ppeCap, 1) * 100
}

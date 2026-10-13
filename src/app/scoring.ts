import { useSyncExternalStore } from 'react'
import type { Row } from '@/lib'
import { valueOf, scoreOf, passesRankMin, VALUE_DEFAULTS, type ValueCfg } from './meal'
/** Lokale Gewichtung (localStorage). Formel selbst: src/app/meal.ts → valueOf. */
export type ScoreCfg = { wHealth: number; ppeCap: number; sugarW: number; minScore: number; minKcal: number }
export const DEFAULT_CFG: ScoreCfg = { wHealth: VALUE_DEFAULTS.healthWeight, ppeCap: VALUE_DEFAULTS.protPerEurCap, sugarW: VALUE_DEFAULTS.sugarW, minScore: VALUE_DEFAULTS.minScore, minKcal: VALUE_DEFAULTS.minKcal }
const K = 'fg-scorecfg2'; const subs = new Set<() => void>()
let cfg: ScoreCfg = (() => { try { return { ...DEFAULT_CFG, ...JSON.parse(localStorage.getItem(K) || '{}') } } catch { return DEFAULT_CFG } })()
export const getCfg = () => cfg
export const setCfg = (c: Partial<ScoreCfg>) => { cfg = { ...cfg, ...c }; localStorage.setItem(K, JSON.stringify(cfg)); subs.forEach(f => f()) }
export const useCfg = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => cfg)
export const toValueCfg = (c: ScoreCfg = cfg): ValueCfg => ({ healthWeight: c.wHealth, protPerEurCap: c.ppeCap, sugarW: c.sugarW, minScore: c.minScore, minKcal: c.minKcal })
export const clientScore = (r: Row, c = cfg) => scoreOf(r, toValueCfg(c))
export const valueScore = (r: Row, c = cfg) => valueOf(r, toValueCfg(c))
export const rankOk = (r: Row, c = cfg) => passesRankMin(r, toValueCfg(c))

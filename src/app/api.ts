/**
 * Good Choice In-App-API (Vertrag für mcp/ und src/app/genui/** – diese Pfade gehören einem anderen Worker).
 * window.goodChoice wird nach dem Laden der Daten gesetzt; Ereignis `goodchoice:ready` auf window.
 * Datenschutz: Ziele/Planwerte werden NIE in URL, Server oder Analytics geschrieben – nur localStorage.
 */
import type { Row } from '@/lib'
import { TAB_ALIAS } from './tabs'
import type { F } from '@/components/FilterPanel'
import { makePred } from '@/components/FilterPanel'
import { isReadyMeal, isRankable, pricePerPortion } from './meal'
import { clientScore, valueScore, getCfg, setCfg, toValueCfg, type ScoreCfg } from './scoring'
import { passesRankMin, passesLightRank, protPerEuro } from './meal'
import { buildMealPlan as plan, type PlanTargets, type MealPlan } from './plan'
import { linkKind } from './linkKind'

// ---------- Typen (stabil) ----------
export type ProductSummary = { id: number; name: string; brand: string; store: string; price: number | null; pricePerPortion: number | null; score: number | null; value: number | null; stage: string; readyMeal: boolean; img: string | null; url: string | null; urlKind?: string }
export type SearchOpts = { limit?: number; includeGroceries?: boolean }
export type RankBy = 'lightMeal' | 'value' | 'proteinPerEuro' | 'score' | 'pricePerPortion' | 'price'
export type RankOpts = { by?: RankBy; limit?: number; onlyMyShops?: boolean; chains?: string[]; includeGroceries?: boolean; filter?: F }
export type ViewParams = Record<string, string>
/** JSON-View-Spec; Struktur definiert der genui-Worker. */
export type ViewSpec = unknown
export type CustomUIRenderer = (spec: ViewSpec, target?: HTMLElement) => void | (() => void)
export type AppState = { view: string; hash: Record<string, string>; myShopsCount: number;
  /** nur Umkreis – Adresse/Koordinaten werden NIE über die API/Bridge herausgegeben */
  location: { radius: number }; scoreCfg: ScoreCfg; rows: number }
export interface GoodChoiceAPI {
  version: '1'
  search(q: string, opts?: SearchOpts): ProductSummary[]
  filter(f: F, opts?: SearchOpts): ProductSummary[]
  rank(opts?: RankOpts): ProductSummary[]
  buildMealPlan(t: PlanTargets, opts?: { onlyMyShops?: boolean; chains?: string[] }): MealPlan
  setView(view: string, params?: ViewParams): void
  renderCustomUI(spec: ViewSpec, target?: HTMLElement): void | (() => void)
  registerCustomUIRenderer(fn: CustomUIRenderer): void
  getState(): AppState
  setScoreConfig(c: Partial<ScoreCfg>): void
  subscribe(cb: (s: AppState) => void): () => void
}
declare global { interface Window { goodChoice?: GoodChoiceAPI } }

// ---------- Implementierung ----------
type Deps = { rows: () => Row[]; myChains: () => Set<string>; myShops: () => string[]; loc: () => { radius: number }; distOf: (r: Row) => number | null }
let renderer: CustomUIRenderer | null = null
const summary = (r: Row): ProductSummary => ({ id: r.id, name: r.name, brand: r.brandN, store: r.store, price: r.price, pricePerPortion: pricePerPortion(r), score: clientScore(r), value: valueScore(r), stage: r.stage, readyMeal: isReadyMeal(r), img: r.img, url: r.url, urlKind: linkKind(r.url) ?? undefined })
const hashObj = () => Object.fromEntries(new URLSearchParams(location.hash.slice(1)))

export function installApi(d: Deps): GoodChoiceAPI {
  const base = (inc?: boolean) => d.rows().filter(r => !r.nonfood && (inc || isReadyMeal(r)))
  const state = (): AppState => ({ view: hashObj().tab ?? 'heute', hash: hashObj(), myShopsCount: d.myShops().length, location: { radius: d.loc().radius }, scoreCfg: getCfg(), rows: d.rows().length })
  const api: GoodChoiceAPI = {
    version: '1',
    search: (q, o = {}) => { const qq = q.toLowerCase(); return base(o.includeGroceries).filter(r => `${r.name} ${r.brandN} ${r.store} ${r.herst}`.toLowerCase().includes(qq)).slice(0, o.limit ?? 50).map(summary) },
    filter: (f, o = {}) => { const p = makePred(f, { konzOf: () => null, dist: d.distOf }); return base(o.includeGroceries).filter(p).slice(0, o.limit ?? 200).map(summary) },
    rank: (o = {}) => {
      const ch = o.chains ? new Set(o.chains) : o.onlyMyShops ? d.myChains() : null
      const p = o.filter ? makePred(o.filter, { konzOf: () => null, dist: d.distOf }) : () => true
      const key: Record<RankBy, (r: Row) => number | null> = { lightMeal: r => passesLightRank(r) ? valueScore(r) : null, value: r => passesRankMin(r, toValueCfg()) ? valueScore(r) : null, proteinPerEuro: r => passesRankMin(r, toValueCfg()) ? protPerEuro(r) : null, score: r => clientScore(r), pricePerPortion: r => { const v = pricePerPortion(r); return v == null ? null : -v }, price: r => r.price == null ? null : -r.price }
      const k = key[o.by ?? 'value']
      return base(o.includeGroceries).filter(r => isRankable(r) && (!ch || ch.has(r.store)) && p(r) && k(r) != null).sort((a, b) => k(b)! - k(a)!).slice(0, o.limit ?? 30).map(summary)
    },
    buildMealPlan: (t, o = {}) => plan(d.rows(), o.chains ? new Set(o.chains) : o.onlyMyShops === false ? null : d.myChains(), t),
    setView: (view, params = {}) => { view = TAB_ALIAS[view] ?? view; const h = new URLSearchParams({ ...params, tab: view }); location.hash = h.toString() },
    renderCustomUI: (spec, target) => { if (!renderer) throw new Error('goodChoice: kein Custom-UI-Renderer registriert (src/app/genui)'); return renderer(spec, target) },
    registerCustomUIRenderer: fn => { renderer = fn },
    getState: state,
    setScoreConfig: c => setCfg(c),
    subscribe: cb => { const h = () => cb(state()); addEventListener('hashchange', h); addEventListener('goodchoice:state', h); return () => { removeEventListener('hashchange', h); removeEventListener('goodchoice:state', h) } },
  }
  window.goodChoice = api
  dispatchEvent(new CustomEvent('goodchoice:ready'))
  return api
}

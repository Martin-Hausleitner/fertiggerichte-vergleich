/** Tasteful per-store / per-brand accent colours on top of the monochrome base (all ≥ 4.5:1 on white as text). */
export const STORE_COLOR: Record<string, string> = {
  Billa: '#c8102e', Spar: '#00703c', Hofer: '#00487a', Lidl: '#0050aa', Penny: '#b8001f', dm: '#1f3e8a',
  Gurkerl: '#3d7a1c', PrepMyMeal: '#b4232c', 'Fit to Go': '#6b21a8', LiveFresh: '#0f766e', FitTaste: '#9a3412', Juit: '#1f2937', bofrost: '#1d4ed8', 'every.': '#3f6212',
  MPreis: '#b91c1c', Unimarkt: '#c2410c', ADEG: '#15803d', "denn's": '#166534',
}
export function hashColor(s: string) {
  const h = [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)
  return `hsl(${Math.abs(h) % 360} 60% 32%)`
}
export const colorOf = (s: string) => STORE_COLOR[s] ?? hashColor(s)
export const CHART_COLORS = ['#0f766e', '#1d4ed8', '#b45309', '#be123c', '#6d28d9', '#047857', '#c2410c', '#334155']

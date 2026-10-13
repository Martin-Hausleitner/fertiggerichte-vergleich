import { useMemo, useState } from 'react'
import { X, Search, Trophy } from 'lucide-react'
import { Card, Input, Button } from '@/components/ui'
import { Img, StoreLogo } from '@/components/product'
import { useApp, fmt, scoreColor, cn, type Row } from '@/lib'

type M = { k: string; l: string; d?: number; u?: string; better?: 'hi' | 'lo'; get?: (r: Row) => any }
const SECTIONS: [string, M[]][] = [
  ['Überblick', [{ k: 'store', l: 'Anbieter' }, { k: 'brandN', l: 'Marke' }, { k: 'score', l: 'Health-Score', d: 0, better: 'hi' }, { k: 'ns', l: 'Nutri-Score', get: r => r.ns && r.ns !== 'unknown' ? r.ns.toUpperCase() : null }, { k: 'nova', l: 'NOVA', get: r => (r as any).nova }]],
  ['Preis', [{ k: 'price', l: 'Preis', d: 2, u: '€', better: 'lo' }, { k: 'size', l: 'Packungsgröße', d: 0, u: 'g' }, { k: 'p100g', l: 'Preis/100 g', d: 2, u: '€', better: 'lo' }, { k: 'eur10p', l: '€ pro 10 g Protein', d: 2, u: '€', better: 'lo' }, { k: 'pstat', l: 'Preisstand' }]],
  ['Nährwerte je 100 g', [{ k: 'kcal', l: 'Energie', d: 0, u: 'kcal' }, { k: 'p100', l: 'Protein', d: 1, u: 'g', better: 'hi' }, { k: 'fat', l: 'Fett', d: 1, u: 'g' }, { k: 'sat', l: 'davon ges. Fettsäuren', d: 1, u: 'g', better: 'lo' }, { k: 'carbs', l: 'Kohlenhydrate', d: 1, u: 'g' }, { k: 'sugar', l: 'davon Zucker', d: 1, u: 'g', better: 'lo' }, { k: 'fib', l: 'Ballaststoffe', d: 1, u: 'g', better: 'hi' }, { k: 'salt', l: 'Salz', d: 2, u: 'g', better: 'lo' }]],
  ['Je Portion', [{ k: 'portion', l: 'Portion', d: 0, u: 'g' }, { k: 'kcalPor', l: 'Energie', d: 0, u: 'kcal' }, { k: 'protPor', l: 'Protein', d: 1, u: 'g', better: 'hi' }, { k: 'saltPor', l: 'Salz', d: 2, u: 'g', better: 'lo' }]],
  ['Bestandteile & Herkunft', [{ k: 'comp', l: 'Komponenten', get: r => [...(r.cprot || []), ...(r.cdish || [])].join(', ') || null }, { k: 'diet', l: 'Ernährung', get: r => [r.bio && 'Bio', (r.vegan || r.cprot?.includes('vegan')) && 'vegan', r.cprot?.includes('vegetarisch') && 'vegetarisch'].filter(Boolean).join(', ') || null },
    { k: 'ingr', l: 'Zutaten', get: r => (r as any).ingredients ?? null }, { k: 'additives', l: 'Zusatzstoffe', get: r => { const a = (r as any).additives; return Array.isArray(a) ? a.join(', ') || null : a ?? null } }, { k: 'pack', l: 'Verpackung' }, { k: 'herst', l: 'Hersteller' }, { k: 'origin', l: 'Herkunft' }, { k: 'flags', l: 'Hinweise', get: r => r.flags?.join(' · ') || null }]],
]
const val = (m: M, r: Row) => m.get ? m.get(r) : (r as any)[m.k]

export default function VergleichTabelle() {
  const { R, compare, setCompare, open } = useApp()
  const [q, setQ] = useState('')
  const items = compare.map(i => R.find(r => r.id === i)).filter(Boolean) as Row[]
  const hits = useMemo(() => { const qq = q.toLowerCase().trim(); return qq.length < 2 ? [] : R.filter(r => !r.nonfood && `${r.name} ${r.brandN} ${r.store}`.toLowerCase().includes(qq) && !compare.includes(r.id)).slice(0, 8) }, [q, R, compare])
  const best = (m: M) => { if (!m.better) return null; const v = items.map(r => val(m, r)).filter((x): x is number => typeof x === 'number'); return v.length < 2 ? null : m.better === 'hi' ? Math.max(...v) : Math.min(...v) }
  return <div className="space-y-3">
    <div><h1 className="text-xl font-bold tracking-tight">Vergleichstabelle</h1><p className="text-sm text-muted-foreground">Bis zu 4 Produkte nebeneinander – über alle Anbieter. Bester Wert je Zeile ist grün markiert.</p></div>
    <Card className="relative p-2.5 shadow-none">
      <div className="relative"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder={compare.length >= 4 ? 'Maximal 4 Produkte – entferne eines' : 'Produkt hinzufügen: Name, Marke oder Anbieter…'} disabled={compare.length >= 4} className="w-full pl-8" /></div>
      {hits.length > 0 && <div className="absolute inset-x-2.5 top-full z-30 mt-1 rounded-md border bg-popover shadow-lg">{hits.map(r => <button key={r.id} onClick={() => { setCompare([...compare, r.id]); setQ('') }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"><StoreLogo store={r.store} size={16} /><span className="flex-1 truncate">{r.name}</span><span className="text-xs text-muted-foreground">{r.brandN}</span></button>)}</div>}
    </Card>
    {items.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Noch keine Produkte gewählt. Suche oben oder hake Produkte in der Produkttabelle an.</p> :
      <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[560px] border-collapse text-sm">
        <thead><tr className="bg-muted/50"><th className="sticky left-0 z-10 w-36 bg-muted p-2 text-left text-xs font-semibold">Produkt</th>
          {items.map(r => <th key={r.id} className="min-w-[150px] p-2 align-top font-normal"><div className="relative text-center"><button onClick={() => setCompare(compare.filter(x => x !== r.id))} className="absolute right-0 top-0 text-muted-foreground hover:text-red-600" aria-label="entfernen"><X className="size-4" /></button>
            <Img src={r.img} className="mx-auto size-16" /><button onClick={() => open(r.id)} className="mt-1 line-clamp-3 text-xs font-semibold hover:underline">{r.name}</button></div></th>)}</tr></thead>
        <tbody>{SECTIONS.map(([t, ms]) => <>{<tr key={t}><td colSpan={items.length + 1} className="bg-muted/30 px-2 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t}</td></tr>}
          {ms.map(m => { const b = best(m); return <tr key={m.k} className="border-t"><td className="sticky left-0 bg-background p-2 text-xs text-muted-foreground">{m.l}{m.better && <span className="ml-1 text-[10px]">({m.better === 'hi' ? '↑' : '↓'})</span>}</td>
            {items.map(r => { const v = val(m, r); const win = b != null && v === b; return <td key={r.id} className={cn('p-2 text-center', win && 'bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300')}>
              {v == null || v === '' ? <span className="text-muted-foreground">–</span> : m.k === 'score' ? <b style={{ color: scoreColor(v) }}>{fmt(v, 0)}</b> : m.k === 'store' ? <span className="inline-flex items-center gap-1"><StoreLogo store={v} size={16} />{v}</span> : typeof v === 'number' ? `${fmt(v, m.d ?? 1)}${m.u ? ' ' + m.u : ''}` : <span className="text-xs">{String(v)}</span>}
              {win && <Trophy className="ml-1 inline size-3" />}</td> })}</tr> })}</>)}</tbody>
      </table></div>}
    <p className="text-[11px] text-muted-foreground">Zutatenlisten sind in den aktuellen Daten noch nicht enthalten („–“). Komponenten stammen aus der Kategorisierung (Protein-/Gerichtsart).</p>
  </div>
}

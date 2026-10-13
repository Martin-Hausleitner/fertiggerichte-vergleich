import { ChevronRight, UtensilsCrossed, BadgeCheck, Tag, Trophy, Heart, type LucideIcon } from 'lucide-react'
import { Card, CardContent, Badge, Button } from '@/components/ui'
import { Img, StoreLogo } from '@/components/product'
import { cn, fmt, healthyCheap, type Row } from '@/lib'

type Props = { rows: Row[]; wide: boolean; onOpen: (id: number) => void; onMore: () => void }

function Stat({ value, label, icon: Icon }: { value: number; label: string; icon: LucideIcon }) {
  return <div><Icon className="mb-1 size-4 text-primary" /><div className="text-2xl font-bold tabular-nums">{value.toLocaleString('de-AT')}</div><div className="text-xs text-muted-foreground">{label}</div></div>
}

function TopCard({ r, rank, onOpen }: { r: Row; rank: number; onOpen: (id: number) => void }) {
  return <Card className="group cursor-pointer overflow-hidden shadow-none transition-colors hover:bg-muted/40" onClick={() => onOpen(r.id)}>
    <div className="relative aspect-[4/3] bg-white p-3"><Img src={r.img} className="h-full w-full" />
      <span className="absolute left-2 top-2 text-[11px] font-semibold text-muted-foreground">#{rank}</span></div>
    <CardContent className="space-y-1 p-3">
      <div className="line-clamp-2 min-h-[2.4rem] text-[13px] font-medium leading-snug">{r.name}</div>
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground"><StoreLogo store={r.store} size={22} /><span className="inline-flex items-center gap-0.5"><Heart className="size-3" />{fmt(r.score, 0)}</span></div>
      <div className="flex items-center justify-between gap-1 pt-1"><span className="font-semibold tabular-nums">{fmt(r.price, 2)} €</span><Badge>{fmt(r.eur10p, 2)} €/10 g</Badge></div>
    </CardContent>
  </Card>
}

/** Landing block on "Alle Gerichte": headline, three stats, best protein per euro. */
export function Hero({ rows, wide, onOpen, onMore }: Props) {
  const live = rows.filter(r => r.pstat === 'live 2026').length
  const brands = new Set(rows.map(r => r.brandN)).size
  return <section className="space-y-6 pb-2 pt-2">
    <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Welches Fertiggericht lohnt sich wirklich?</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">Preis pro Protein, Health-Score und Hersteller von {rows.length.toLocaleString('de-AT')} Gerichten bei Billa, Spar, Hofer, Lidl, Penny, dm und Online-Anbietern – mit Filiale in deiner Nähe.</p>
      </div>
      <div className="flex gap-8"><Stat icon={UtensilsCrossed} value={rows.length} label="Gerichte" /><Stat icon={BadgeCheck} value={live} label="Preise 2026" /><Stat icon={Tag} value={brands} label="Marken" /></div>
    </div>
    <div>
      <div className="mb-3 flex items-end justify-between">
        <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Trophy className="size-5 text-primary" />Bestes Protein pro Euro</h2><p className="text-xs text-muted-foreground">Health-Score ≥ 45 · sortiert nach € pro 10 g Protein · nur aktuelle Preise</p></div>
        <Button variant="ghost" size="sm" onClick={onMore}>Alle<ChevronRight /></Button>
      </div>
      <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6', wide && 'min-[1900px]:grid-cols-8')}>
        {healthyCheap(rows).slice(0, wide ? 8 : 6).map((r, i) => <TopCard key={r.id} r={r} rank={i + 1} onOpen={onOpen} />)}
      </div>
    </div>
  </section>
}

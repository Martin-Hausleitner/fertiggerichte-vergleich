import { useState } from 'react'
import { MessageSquareText, MapPin, ExternalLink, Sparkles } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { Img, StoreLogo, BrandLogo, Actions } from '@/components/product'
import { useFacets } from '@/components/x/Facets'
import { NutrientRow, PriceLine } from '@/components/x/Nutrients'
import { ProducerLogo, ColorChip } from '@/components/x/Logos'
import { colorOf } from '@/components/x/palette'
import { useApp, type Row } from '@/lib'

function Post({ r }: { r: Row }) {
  const { open, nearest } = useApp(); const s = nearest(r.store)
  return <article className="flex gap-3 border-b px-3 py-4 transition-colors hover:bg-muted/40 sm:px-4">
    <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-white" style={{ borderColor: colorOf(r.store) }}><BrandLogo r={r} size={16} /></div>
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"><span className="font-semibold">{r.brandN}</span><ColorChip name={r.store} />{s && <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><MapPin className="size-3" />{Math.round((s.walk_m ?? s.dist) / 10) * 10} m</span>}</div>
      <button className="block text-left text-[15px] leading-snug hover:underline" onClick={() => open(r.id)}>{r.name}</button>
      <button onClick={() => open(r.id)} className="block w-full overflow-hidden rounded-2xl border bg-white"><Img src={r.img} className="mx-auto h-56 w-full sm:h-72" /></button>
      <NutrientRow r={r} />
      <div className="flex flex-wrap items-center justify-between gap-2"><PriceLine r={r} /><div className="flex items-center gap-2"><ProducerLogo r={r} /><StoreLogo store={r.store} size={20} /></div></div>
      <div className="flex items-center gap-1 text-muted-foreground"><Actions r={r} />{r.url && <Button asChild variant="ghost" size="icon"><a href={r.url} target="_blank" rel="noreferrer" aria-label="Im Shop öffnen"><ExternalLink /></a></Button>}</div>
    </div>
  </article>
}

/** X-style timeline of products, newest data first, best protein value on top. */
export default function Feed() {
  const { R } = useApp()
  const { filtered, ui } = useFacets(R, 'feed')
  const [n, setN] = useState(20)
  const rows = [...filtered].sort((a, b) => (a.eur10p ?? 99) - (b.eur10p ?? 99))
  return <div className="mx-auto grid max-w-[1100px] gap-4 lg:grid-cols-[1fr_300px]">
    <div className="space-y-3">
      {ui}
      <Card className="overflow-hidden shadow-none">
        <div className="flex items-center gap-2 border-b px-4 py-3 font-semibold"><MessageSquareText className="size-4" />Feed<span className="text-sm font-normal text-muted-foreground">· sortiert nach € pro 10 g Protein</span></div>
        {rows.slice(0, n).map(r => <Post key={r.id} r={r} />)}
        {n < rows.length && <div className="p-3"><Button variant="outline" className="w-full" onClick={() => setN(n + 20)}>Mehr anzeigen ({rows.length - n})</Button></div>}
      </Card>
    </div>
    <aside className="hidden space-y-3 lg:block"><Card className="sticky top-32 space-y-2 p-4 shadow-none"><div className="flex items-center gap-2 font-semibold"><Sparkles className="size-4" />Trends</div>
      {Object.entries(rows.reduce<Record<string, number>>((m, r) => (m[r.store] = (m[r.store] ?? 0) + 1, m), {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s, c]) => <div key={s} className="flex items-center justify-between text-sm"><StoreLogo store={s} size={22} /><span className="tabular-nums text-muted-foreground">{c} Gerichte</span></div>)}
    </Card></aside>
  </div>
}

import { useState } from 'react'
import { Images } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { Img, StoreLogo, BrandLogo } from '@/components/product'
import { useFacets } from '@/components/x/Facets'
import { NutrientRow } from '@/components/x/Nutrients'
import { colorOf } from '@/components/x/palette'
import { fmt, useApp } from '@/lib'

/** Photo-first card gallery (only products with a photo). */
export default function Galerie() {
  const { R, open } = useApp()
  const { filtered, ui } = useFacets(R.filter(r => r.img), 'galerie')
  const [n, setN] = useState(48)
  return <div className="space-y-3">
    {ui}
    <h2 className="flex items-center gap-2 text-lg font-semibold"><Images className="size-5" />Galerie <span className="text-sm font-normal text-muted-foreground">{filtered.length} Fotos</span></h2>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {filtered.slice(0, n).map(r => <Card key={r.id} onClick={() => open(r.id)} className="group cursor-pointer overflow-hidden shadow-none" style={{ borderTop: `3px solid ${colorOf(r.store)}` }}>
        <div className="relative aspect-square bg-white p-2"><Img src={r.img} className="h-full w-full transition-transform group-hover:scale-105" />
          <span className="absolute bottom-2 left-2 rounded-full bg-background/95 px-2 py-0.5 text-xs font-semibold tabular-nums shadow">{fmt(r.price, 2)} €</span></div>
        <div className="space-y-1.5 p-2.5"><div className="line-clamp-2 min-h-[2.3rem] text-[13px] font-medium leading-snug">{r.name}</div>
          <div className="flex items-center justify-between"><BrandLogo r={r} size={18} /><StoreLogo store={r.store} size={18} /></div>
          <NutrientRow r={r} className="text-[11px]" /></div>
      </Card>)}
    </div>
    {n < filtered.length && <Button variant="outline" className="w-full" onClick={() => setN(n + 48)}>Mehr Fotos laden</Button>}
  </div>
}

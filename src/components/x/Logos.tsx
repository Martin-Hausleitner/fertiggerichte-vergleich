import { useState } from 'react'
import { Factory } from 'lucide-react'
import { useApp, type Row } from '@/lib'
import { colorOf } from './palette'

/** Producer logo from analysis/logos (via data.companyLogos / producers[].logo), with icon fallback. */
export function ProducerLogo({ r, size = 24 }: { r: Pick<Row, 'prodSlug' | 'herst'>; size?: number }) {
  const { D } = useApp(); const [err, setErr] = useState(false)
  const src = (r.prodSlug && (D.companyLogos[r.prodSlug] || D.producers.find(p => p.slug === r.prodSlug)?.logo)) || null
  if (src && !err) return <img src={src} alt={r.herst} title={r.herst} onError={() => setErr(true)} style={{ height: size, maxWidth: size * 3 }} className="object-contain" />
  return <span title={r.herst} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Factory className="size-3.5" />{r.herst?.split(/[ ,]/)[0] || '–'}</span>
}
/** Coloured chip for a store or brand. */
export function ColorChip({ name, className = '' }: { name: string; className?: string }) {
  const c = colorOf(name)
  return <span className={'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ' + className} style={{ color: c, borderColor: c + '55', background: c + '0f' }}><span className="size-1.5 rounded-full" style={{ background: c }} />{name}</span>
}

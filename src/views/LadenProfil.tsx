import { useMemo } from 'react'
import { MapPin, Navigation } from 'lucide-react'
import { StoreLogo } from '@/components/product'
import { Button } from '@/components/ui'
import { Picker, Profile } from '@/components/x/Profile'
import { useApp, useHashState } from '@/lib'

export default function LadenProfil() {
  const { R, nearest } = useApp()
  const opts = useMemo(() => { const m = new Map<string, number>(); R.forEach(r => { if (!r.store.startsWith('unbekannt')) m.set(r.store, (m.get(r.store) ?? 0) + 1) }); return [...m].sort((a, b) => b[1] - a[1]) }, [R])
  const [s, setS] = useHashState<string>('laden', 'Hofer')
  const rows = useMemo(() => R.filter(r => r.store === s), [R, s])
  const n = nearest(s)
  return <div className="space-y-3"><Picker label="Laden wählen" options={opts} value={s} onChange={setS} />
    <Profile name={s} rows={rows} groupBy={r => r.brandN} logo={<StoreLogo store={s} size={26} />}
      subtitle={n ? <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />Nächste Filiale: {n.addr || n.name} · {Math.round((n.walk_m ?? n.dist) / 10) * 10} m</span> : 'Online / keine Filiale in der Nähe'}
      extra={n?.gmaps ? <Button asChild size="sm" variant="outline"><a href={n.gmaps} target="_blank" rel="noreferrer"><Navigation />Route</a></Button> : undefined} />
  </div>
}

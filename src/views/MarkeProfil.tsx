import { useMemo } from 'react'
import { BrandLogo, StoreLogo } from '@/components/product'
import { Picker, Profile } from '@/components/x/Profile'
import { useApp, useHashState } from '@/lib'

export default function MarkeProfil() {
  const { R } = useApp()
  const opts = useMemo(() => { const m = new Map<string, number>(); R.forEach(r => m.set(r.brandN, (m.get(r.brandN) ?? 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]) }, [R])
  const [b, setB] = useHashState<string>('marke', opts.find(([n]) => /good choice/i.test(n))?.[0] ?? opts[0]?.[0] ?? '')
  const rows = useMemo(() => R.filter(r => r.brandN === b), [R, b])
  const stores = [...new Set(rows.map(r => r.store))]
  const sample = rows.find(r => r.logo) ?? rows[0]
  return <div className="space-y-3"><Picker label="Marke wählen" options={opts} value={b} onChange={setB} />
    {sample && <Profile name={b} rows={rows} groupBy={r => r.cdish?.[0] ?? r.stage} logo={<BrandLogo r={sample} size={26} />}
      subtitle={<span>{rows[0]?.herst ? `Hersteller: ${rows[0].herst}` : 'Hersteller unbekannt'}</span>}
      extra={<div className="flex flex-wrap justify-end gap-2">{stores.slice(0, 4).map(s => <StoreLogo key={s} store={s} size={22} />)}</div>} />}
  </div>
}

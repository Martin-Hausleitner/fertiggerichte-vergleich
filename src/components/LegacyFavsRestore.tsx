/** Sensecheck 29 (1): old numeric favourites (pre-uid UI) that the unanimity map could not attribute stay parked in localStorage
 * fg-favs-legacy. Their data version was never stored, so this dialog lets the user pick it: each option shows the products the
 * numbers meant under one or more old data versions (public/legacy_uid_maps.json). Only what the user confirms is added; nothing
 * is mapped automatically, so a favourite is either correct (confirmed) or dropped. */
import { useEffect, useMemo, useState } from 'react'
import { History } from 'lucide-react'
import { Button, Sheet } from './ui'
import { useApp } from '../lib'
import { uidIndex, legacyOptions, type LegacyMaps } from '../app/rowref'

const fmt = (s: string | null) => s ? new Date(s).toLocaleString('de-AT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–'

export function LegacyFavsRestore() {
  const { D, legacyFavs, restoreLegacyFavs, dropLegacyFavs } = useApp()
  const [open, setOpen] = useState(false), [M, setM] = useState<LegacyMaps | null>(null), [err, setErr] = useState(false)
  const [pick, setPick] = useState<string | null>(null), [off, setOff] = useState<Set<number>>(new Set()), [more, setMore] = useState(false)
  const file = D.legacyVersions?.file
  useEffect(() => {
    if (!open || M || !file) return
    fetch(`./${file}?v=${D.dataVersion ?? ''}`).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(setM).catch(() => setErr(true))
  }, [open, M, file, D.dataVersion])
  const idx = useMemo(() => uidIndex(D), [D])
  const opts = useMemo(() => M ? legacyOptions(legacyFavs, M, idx) : [], [M, legacyFavs, idx])
  if (!legacyFavs.length || !file) return null
  const shown = more ? opts : opts.slice(0, 6)
  const sel = opts.find(o => o.key === pick)
  const apply = () => {
    if (!sel) return
    const ids = sel.ids.filter((i, k): i is number => i != null && !off.has(k))
    restoreLegacyFavs(ids, legacyFavs); setOpen(false)   // decided: confirmed ones added, the rest of this set discarded
  }
  return <>
    <Button size="sm" onClick={() => setOpen(true)} title="Alte Favoriten aus einer früheren Version zuordnen" className="border-amber-400 text-amber-700 dark:text-amber-300" data-testid="legacy-favs"><History size={14} />Alte Favoriten ({legacyFavs.length}) zuordnen</Button>
    <Sheet open={open} onClose={() => setOpen(false)} title="Alte Favoriten zuordnen">
      <div className="space-y-3 text-sm" data-testid="legacy-favs-sheet">
        <p className="text-muted-foreground">Diese {legacyFavs.length} Favoriten stammen aus einer älteren Version, die nur Listennummern gespeichert hat. Welche Nummer welches Produkt war, hängt vom damaligen Datenstand ab – und der wurde nicht mitgespeichert. Wähle den Stand, dessen Liste deinen Favoriten entspricht; nur was du bestätigst, wird übernommen.</p>
        {err && <p className="text-rose-600">Zuordnungsdaten konnten nicht geladen werden.</p>}
        {!M && !err && <p className="text-muted-foreground">Lade Datenstände…</p>}
        {M && !opts.length && <p className="text-muted-foreground">Kein früherer Datenstand passt zu diesen Nummern.</p>}
        {shown.map(o => <label key={o.key} className={`block cursor-pointer rounded-md border p-2 ${pick === o.key ? 'border-sky-500 bg-sky-50 dark:bg-sky-950' : ''}`}>
          <div className="flex items-center gap-2"><input type="radio" name="legacy-ver" checked={pick === o.key} onChange={() => { setPick(o.key); setOff(new Set()) }} />
            <span className="font-medium">Stand {fmt(o.liveFrom ?? o.versions[0].date)}</span>
            {o.lastLive && <span className="rounded bg-emerald-100 px-1 text-[11px] text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">live {o.liveFrom ? fmt(o.liveFrom) + ' – ' : 'bis '}{o.lastLive.startsWith('9999') ? 'zuletzt' : fmt(o.lastLive)}</span>}
            {o.versions.length > 1 && <span className="text-[11px] text-muted-foreground">+{o.versions.length - 1} gleiche Stände</span>}
            {!o.complete && <span className="text-[11px] text-amber-700">nicht alle Nummern vorhanden</span>}</div>
          <ul className="ml-6 mt-1 space-y-0.5">{o.ids.map((i, k) => <li key={k} className="flex items-center gap-1.5">
            {pick === o.key && i != null && <input type="checkbox" checked={!off.has(k)} onChange={e => { const s = new Set(off); e.target.checked ? s.delete(k) : s.add(k); setOff(s) }} />}
            {i == null ? <span className="text-muted-foreground">#{legacyFavs[k]} – kein eindeutiges Produkt (wird verworfen)</span> : <span>{D.rows[i].name} <span className="text-muted-foreground">· {D.rows[i].store}</span></span>}
          </li>)}</ul>
        </label>)}
        {opts.length > shown.length && <Button size="sm" variant="ghost" onClick={() => setMore(true)}>{opts.length - shown.length} weitere Stände</Button>}
        <div className="flex gap-2 pt-1">
          <Button size="sm" disabled={!sel} onClick={apply} data-testid="legacy-favs-apply">Ausgewählte übernehmen</Button>
          <Button size="sm" variant="ghost" onClick={() => { dropLegacyFavs(); setOpen(false) }}>Alte Favoriten verwerfen</Button>
        </div>
      </div>
    </Sheet>
  </>
}

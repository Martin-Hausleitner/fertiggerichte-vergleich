import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Moon, Sun, GitCompare, Maximize2, Minimize2 } from 'lucide-react'
import { SearchPalette } from '@/components/SemanticSearch'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { STAGES } from '@/components/info'
import { Sheet, Button, Skeleton } from '@/components/ui'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { AppCtx, useHashState, useLocal, cn } from '@/lib'
import { useAppData } from '@/hooks/useAppData'
import { AppSidebar } from '@/app/AppSidebar'
import { StageBar } from '@/app/StageBar'
import { Hero } from '@/app/Hero'
import { findTab } from '@/app/tabs'
import { LocationControl } from '@/app/location'
import { ApiBridge } from '@/app/ApiBridge'
import { GenUIBridge } from '@/app/genuiHost'
import { uidIndex, parseRefs, formatRefs, refToId, idToRef, hasLegacyRefs, parseLegacyRefs, legacyRefToId, migrateLegacyFavs, favMeta, retryParked, dupTarget, canonIds, type DupTarget } from '@/app/rowref'


const Compare = lazy(() => import('@/views/Compare'))
const Detail = lazy(() => import('@/views/Detail'))

export function ViewSkeleton() {
  return <div className="space-y-3"><Skeleton className="h-10 w-full" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-40" />)}</div></div>
}

function AppSkeleton() {
  return <div className="flex min-h-screen"><div className="hidden w-64 space-y-2 border-r p-3 md:block">{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="h-7" />)}</div><div className="flex-1 space-y-4 p-6"><Skeleton className="h-10 w-2/3" /><ViewSkeleton /></div></div>
}

/** sensecheck 35 (1): notice when a link/favourite pointed at a hidden duplicate row */
function DupNotice({ n, rows, onOpen }: { n: DupTarget; rows: { id: number; name: string; store: string; size: number | null }[]; onOpen: (id: number) => void }) {
  const f = rows[n.from], t = rows[n.to], lab = (r?: { name: string; store: string; size: number | null }) => r ? `${r.name}${r.size && !new RegExp(`(^|\\D)${Math.round(r.size)}\\s*g\\b`, 'i').test(r.name) ? ` ${Math.round(r.size)} g` : ''} (${r.store})` : ''
  if (!f || !t) return null
  return n.kind === 'redirect'
    ? <div data-testid="dup-redirect-note" role="status" className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">Hinweis: Dieser Link bzw. Favorit zeigte auf eine doppelte Zeile (#{f.id} · {lab(f)}). Sie ist in Listen und Rankings mit diesem Produkt zusammengefasst – gezeigt wird die Hauptzeile.</div>
    : <div data-testid="dup-other-note" role="status" className="mb-3 rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100">Diese Packung{f.size ? ` (${Math.round(f.size)} g)` : ''} ist in Listen und Rankings unter der Hauptzeile zusammengefasst: <button type="button" data-testid="dup-other-open" className="font-medium underline" onClick={() => onOpen(t.id)}>#{t.id} · {lab(t)} öffnen</button></div>
}

export default function App() {
  const { data: D, stores, nearest } = useAppData()
  const [tab, setTab] = useHashState<string>('tab', 'heute')
  const [cmpS, setCmpS] = useHashState<string>('cmp', ''), [det, setDet] = useHashState<string>('p', '')
  const [favRefs, setFavRefs] = useLocal<string[]>('fg-favs-uid', [])
  const [dark, setDark] = useLocal('fg-dark', matchMedia('(prefers-color-scheme: dark)').matches)
  const [wide, setWide] = useLocal('fg-wide', innerWidth > 1700)
  const [cmpOpen, setCmpOpen] = useState(false)
  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])
  // sensecheck 27: favourites, #cmp= and #p= persist the stable row uid (src/app/rowref.ts); numeric ids stay in memory
  const rows0 = useMemo(() => D?.rows ?? [], [D]), nRows = rows0.length
  const uidx = useMemo(() => D ? uidIndex(D) : new Map<string, number>(), [D])
  // sensecheck 28 (1): until the first data render, numeric #cmp=/#p= are pre-uid share links (legacy semantics, legacyUid)
  const [atLoad, setAtLoad] = useState(true)
  // sensecheck 35 (1): compare ids of a hidden same-product duplicate show its main row
  const compare = useMemo(() => canonIds(atLoad && D ? parseLegacyRefs(cmpS, D, uidx) : parseRefs(cmpS, uidx, nRows), rows0, uidx).ids, [atLoad, D, cmpS, uidx, nRows, rows0])
  const setCompare = useCallback((ids: number[]) => setCmpS(formatRefs(ids.slice(0, 4), rows0)), [setCmpS, rows0])
  const toggleCompare = useCallback((id: number) => setCompare(compare.includes(id) ? compare.filter(x => x !== id) : [...compare, id].slice(-4)), [compare, setCompare])
  const favs = useMemo(() => parseRefs(favRefs.join('.'), uidx, nRows), [favRefs, uidx, nRows])
  // sensecheck 29 (1): store the data version with the favourites (fg-favs-meta), so a stored ref can always be tied to its export
  const saveFavs = useCallback((ids: number[]) => { setFavRefs(formatRefs(ids, rows0).split('.').filter(Boolean)); if (D) try { localStorage.setItem('fg-favs-meta', JSON.stringify(favMeta(D))) } catch { /* ignore */ } }, [setFavRefs, rows0, D])
  const toggleFav = (id: number) => saveFavs(favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id])
  const [legacyFavs, setLegacyFavs] = useLocal<number[]>('fg-favs-legacy', [])
  const restoreLegacyFavs = useCallback((ids: number[], nums: number[]) => { saveFavs([...new Set([...favs, ...ids])]); setLegacyFavs(legacyFavs.filter(n => !nums.includes(n))) }, [saveFavs, favs, legacyFavs, setLegacyFavs])
  const dropLegacyFavs = useCallback(() => { setLegacyFavs([]); try { localStorage.removeItem('fg-favs-legacy') } catch { /* ignore */ } }, [setLegacyFavs])
  const open = useCallback((id: number) => setDet(idToRef(id, rows0)), [setDet, rows0])
  const detId0 = det === '' ? null : atLoad && D ? legacyRefToId(det, D, uidx) : refToId(det, uidx, nRows)
  // sensecheck 35 (1): #p= of a hidden duplicate (old favourite/link, e.g. SPAR Iglo Lasagne 700 g #79) → the kept main row, with a notice;
  // a hidden OTHER pack size (reached via 'auch als 800 g') stays open, with a notice + link to the main row
  const dupT = useMemo(() => detId0 == null ? null : dupTarget(detId0, rows0, uidx), [detId0, rows0, uidx])
  const detId = dupT?.kind === 'redirect' ? dupT.to : detId0
  const [dupNote, setDupNote] = useState<DupTarget | null>(null)
  useEffect(() => {
    if (!D || detId0 == null) return
    if (dupT?.kind === 'redirect') { setDupNote(dupT); setDet(idToRef(dupT.to, D.rows)) }
    else if (dupT?.kind === 'otherSize') setDupNote(dupT)
    else if (dupNote && dupNote.to !== detId0) setDupNote(null)
  }, [D, detId0]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {   // rewrite numeric #cmp=/#p= to uids so copied links stay stable
    if (!D) return
    if (atLoad) {   // old share link: resolve via legacyUid, drop what can't be attributed unambiguously
      setAtLoad(false)
      if (hasLegacyRefs(cmpS, D.rows)) setCmpS(formatRefs(compare, D.rows))
      if (det !== '' && /^\d+$/.test(det)) setDet(detId == null ? '' : idToRef(detId, D.rows))
      return
    }
    // in-session numeric refs (GenUI/MCP actions) are current indices
    if (hasLegacyRefs(cmpS, D.rows)) setCmpS(formatRefs(compare, D.rows))
    if (det !== '' && /^\d+$/.test(det) && detId != null && D.rows[detId]?.uid) setDet(idToRef(detId, D.rows))
  }, [D, cmpS, det]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {   // one-time migration of legacy numeric favourites (fg-favs) to uids
    if (!D) return
    // sensecheck 28 (1): numbers resolve only via legacyUid; unresolved ones are parked in fg-favs-legacy (not guessed)
    // sensecheck 29 (1): parked numbers from earlier loads are retried on every load (legacyUid may have grown); the rest stays
    // parked until the user confirms their version in the restore dialog (Explorer → „Alte Favoriten zuordnen“)
    try {
      const old = localStorage.getItem('fg-favs'), parked = legacyFavs
      if (!old && !parked.length) return
      const a = migrateLegacyFavs(old ? JSON.parse(old) : [], D, uidx), b = retryParked(parked, D, uidx)
      const ids = [...new Set([...a.ids, ...b.ids])], rest = [...new Set([...b.unresolved, ...a.unresolved])]
      if (ids.length) saveFavs([...new Set([...favs, ...ids])])
      if (rest.length !== parked.length || rest.some((n, i) => n !== parked[i])) { if (rest.length) setLegacyFavs(rest); else dropLegacyFavs() }
      if (old) localStorage.removeItem('fg-favs')
    } catch { /* ignore */ }
  }, [D]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {   // sensecheck 35 (1): stored favourites on a hidden same-product duplicate → its main row (once per data version)
    if (!D || !favs.length) return
    const c = canonIds(favs, D.rows, uidx)
    if (c.moved.length) {
      saveFavs(c.ids)
      try { localStorage.setItem('fg-favs-dupmoved', JSON.stringify({ dataVersion: D.dataVersion ?? null, moved: c.moved.map(m => ({ from: D.rows[m.from]?.uid, to: D.rows[m.to]?.uid })) })) } catch { /* ignore */ }
    }
  }, [D, favRefs]) // eslint-disable-line react-hooks/exhaustive-deps
  const [fs, setFs] = useHashState<string>('fs', 'meal.stew')
  const stageSel = useMemo(() => fs ? fs.split('.') : STAGES.map(x => x[0]), [fs])
  const R = useMemo(() => D ? D.rows.map(r => ({ ...r, rankable: !!r.rankable && r.stage !== 'base' && stageSel.includes(r.stage) })) : [], [D, stageSel])
  if (!D) return <AppSkeleton />
  const cur = findTab(tab)
  const View = cur.view
  return <AppCtx.Provider value={{ D, R, stageSel, setStageSel: (v: string[]) => setFs(v.join('.')), compare, toggleCompare, setCompare, favs, toggleFav, legacyFavs, restoreLegacyFavs, dropLegacyFavs, open, dark, wide, stores, nearest }}>
    <ApiBridge />
    <GenUIBridge getRows={() => R} tab={cur.key} setTab={setTab} />
    <SidebarProvider>
      <AppSidebar tab={cur.key} onSelect={setTab} />
      <SidebarInset className="min-w-0 overflow-x-clip">
        <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <Breadcrumb className="hidden min-w-0 sm:block"><BreadcrumbList>
              <BreadcrumbItem className="hidden lg:block">{cur.group}</BreadcrumbItem><BreadcrumbSeparator className="hidden lg:block" />
              <BreadcrumbItem><BreadcrumbPage className="truncate">{cur.label}</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList></Breadcrumb>
            <div className="mx-auto min-w-0 max-w-xl flex-1"><SearchPalette /></div>
            <LocationControl onOpenMap={() => setTab('meine-shops')} />
            <Button variant="ghost" size="icon" onClick={() => setWide(!wide)} className="hidden lg:inline-flex" title="Breitbild">{wide ? <Minimize2 /> : <Maximize2 />}</Button>
            <Button variant="ghost" size="icon" onClick={() => setDark(!dark)} aria-label="Dark Mode">{dark ? <Sun /> : <Moon />}</Button>
          </div>
          <div className="px-3 pb-2 sm:px-5"><StageBar rows={D.rows} selected={stageSel} onChange={v => setFs(v.join('.'))} /></div>
        </header>
        <div className={cn('w-full px-3 pb-24 sm:px-5', !wide && 'mx-auto max-w-[1500px]')}>
          {cur.key === 'alle' && <Hero rows={R} wide={wide} onOpen={open} onMore={() => setTab('top')} />}
          <main className="pt-3"><ErrorBoundary key={cur.key}><Suspense fallback={<ViewSkeleton />}><View /></Suspense></ErrorBoundary></main>
          <footer className="mt-8 border-t py-8 text-xs text-muted-foreground">Daten aus öffentlichen Shop-Seiten und Open Food Facts · Multipot-Angaben sind Richtwerte · keine Ernährungsberatung · ohne Gewähr</footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
    {compare.length > 0 && <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2"><Button size="md" className="h-11 rounded-full px-5 shadow-lg" onClick={() => setCmpOpen(true)}><GitCompare />Vergleichen ({compare.length}/4)</Button></div>}
    <Sheet open={cmpOpen} onClose={() => setCmpOpen(false)} side={innerWidth < 768 ? 'bottom' : 'right'} title="Produktvergleich"><Suspense fallback={<ViewSkeleton />}><Compare /></Suspense></Sheet>
    <Sheet open={det !== ''} onClose={() => { setDet(''); setDupNote(null) }} title="Produktdetails"><Suspense fallback={<ViewSkeleton />}>{detId != null && dupNote && (dupNote.kind === 'redirect' ? dupNote.to === detId : dupNote.from === detId) && <DupNotice n={dupNote} rows={D.rows} onOpen={id => { setDupNote(null); open(id) }} />}{detId != null && <Detail id={detId} />}</Suspense></Sheet>
  </AppCtx.Provider>
}

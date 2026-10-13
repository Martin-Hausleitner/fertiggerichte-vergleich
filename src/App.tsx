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


const Compare = lazy(() => import('@/views/Compare'))
const Detail = lazy(() => import('@/views/Detail'))

export function ViewSkeleton() {
  return <div className="space-y-3"><Skeleton className="h-10 w-full" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-40" />)}</div></div>
}

function AppSkeleton() {
  return <div className="flex min-h-screen"><div className="hidden w-64 space-y-2 border-r p-3 md:block">{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="h-7" />)}</div><div className="flex-1 space-y-4 p-6"><Skeleton className="h-10 w-2/3" /><ViewSkeleton /></div></div>
}

export default function App() {
  const { data: D, stores, nearest } = useAppData()
  const [tab, setTab] = useHashState<string>('tab', 'heute')
  const [cmpS, setCmpS] = useHashState<string>('cmp', ''), [det, setDet] = useHashState<string>('p', '')
  const [favs, setFavs] = useLocal<number[]>('fg-favs', [])
  const [dark, setDark] = useLocal('fg-dark', matchMedia('(prefers-color-scheme: dark)').matches)
  const [wide, setWide] = useLocal('fg-wide', innerWidth > 1700)
  const [cmpOpen, setCmpOpen] = useState(false)
  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])
  const compare = useMemo(() => cmpS ? cmpS.split('.').map(Number).filter(n => !isNaN(n)) : [], [cmpS])
  const setCompare = useCallback((ids: number[]) => setCmpS(ids.slice(0, 4).join('.')), [setCmpS])
  const toggleCompare = useCallback((id: number) => setCompare(compare.includes(id) ? compare.filter(x => x !== id) : [...compare, id].slice(-4)), [compare, setCompare])
  const toggleFav = (id: number) => setFavs(favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id])
  const open = useCallback((id: number) => setDet(String(id)), [setDet])
  const [fs, setFs] = useHashState<string>('fs', 'meal.stew')
  const stageSel = useMemo(() => fs ? fs.split('.') : STAGES.map(x => x[0]), [fs])
  const R = useMemo(() => D ? D.rows.map(r => ({ ...r, rankable: !!r.rankable && r.stage !== 'base' && stageSel.includes(r.stage) })) : [], [D, stageSel])
  if (!D) return <AppSkeleton />
  const cur = findTab(tab)
  const View = cur.view
  return <AppCtx.Provider value={{ D, R, stageSel, compare, toggleCompare, setCompare, favs, toggleFav, open, dark, wide, stores, nearest }}>
    <ApiBridge />
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
    <Sheet open={det !== ''} onClose={() => setDet('')} title="Produktdetails"><Suspense fallback={<ViewSkeleton />}>{det !== '' && <Detail id={+det} />}</Suspense></Sheet>
  </AppCtx.Provider>
}

import { ErrorBoundary } from './components/ErrorBoundary'
import { STAGES, InfoTip } from './components/info'
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Moon, Sun, GitCompare, Maximize2, Minimize2, Salad } from 'lucide-react'
import { Sheet, Button, Card } from './components/ui'
import { Img } from './components/product'
import { AppCtx, useHashState, useLocal, cn, healthyCheap, fmt, scoreColor, type Data, type Stores as StoresT, type Shop } from './lib'
const Explorer=lazy(()=>import('./views/Explorer'))
const Top=lazy(()=>import('./views/Top'))
const Brands=lazy(()=>import('./views/Brands'))
const Planner=lazy(()=>import('./views/Planner'))
const Kombi=lazy(()=>import('./views/Kombi'))
const Compare=lazy(()=>import('./views/Compare'))
const Detail=lazy(()=>import('./views/Detail'))
const Pack=lazy(()=>import('./views/Charts').then(m=>({default:m.PackCompare})))
const Scatter=lazy(()=>import('./views/Charts').then(m=>({default:m.ScatterView})))
const Producers=lazy(()=>import('./views/Misc').then(m=>({default:m.Producers})))
const Ftg=lazy(()=>import('./views/Misc').then(m=>({default:m.Ftg})))
const Multipot=lazy(()=>import('./views/Misc').then(m=>({default:m.Multipot})))
const Stores=lazy(()=>import('./views/Stores'))
const Categories=lazy(()=>import('./views/Categories'))
const Analyse=lazy(()=>import('./views/Analyse'))
const Packaging=lazy(()=>import('./views/Packaging'))
const ProducerPages=lazy(()=>import('./views/Producers'))
const Matrix=lazy(()=>import('./views/Matrix'))
const Logos=lazy(()=>import('./views/Logos'))
const Netz3D=lazy(()=>import('./views/Netz3D'))
const Methodik=lazy(()=>import('./views/Misc').then(m=>({default:m.Methodik})))
const TABS:[string,string,any][]=[['alle','Alle Gerichte',Explorer],['top','Top-Listen',Top],['kategorien','Kategorien',Categories],['marken','Marken',Brands],['filialen','Filialen in der Nähe',Stores],['analyse','Analyse',Analyse],['scatter','Preis vs. Protein',Scatter],['pack','Verpackungen',Packaging],['hersteller-seiten','Hersteller',ProducerPages],['matrix','Marken-Matrix',Matrix],['logos','Logos',Logos],['netz','🕸️ Netz 3D',Netz3D],['hersteller','Läden & Werke',Producers],['planer','Wochenplaner',Planner],['kombi','Kombi-Ideen',Kombi],['ftg','Fit to Go vs. Supermarkt',Ftg],['multipot','Multipot-Pro Garzeiten',Multipot],['methodik','Methodik & Quellen',Methodik]]
const Loading=()=><Card className="p-10 text-center text-slate-500 animate-pulse">Lädt…</Card>
export default function App(){
  const [D,setD]=useState<Data|null>(null)
  useEffect(()=>{setTimeout(()=>sessionStorage.removeItem('fg-reloaded'),10000);fetch('./data.json?v='+__BUILD__).then(r=>r.json()).then(setD)},[])
  const [stores,setStores]=useState<StoresT|null>(null)
  useEffect(()=>{fetch('./stores.json?v='+__BUILD__).then(r=>r.ok?r.json():null).then(setStores).catch(()=>{})},[])
  const nearest=useCallback((st:string):Shop|null=>{if(!stores)return null;let b:Shop|null=null;for(const s of stores.shops)if(s.chain===st&&(!b||(s.walk_m??s.dist)<(b.walk_m??b.dist)))b=s;return b},[stores])
  const [tab,setTab]=useHashState<string>('tab','alle')
  const [cmpS,setCmpS]=useHashState<string>('cmp',''),[det,setDet]=useHashState<string>('p','')
  const [favs,setFavs]=useLocal<number[]>('fg-favs',[])
  const [dark,setDark]=useLocal('fg-dark',matchMedia('(prefers-color-scheme: dark)').matches)
  const [wide,setWide]=useLocal('fg-wide',innerWidth>1700)
  const [cmpOpen,setCmpOpen]=useState(false)
  useEffect(()=>{document.documentElement.classList.toggle('dark',dark)},[dark])
  const compare=useMemo(()=>cmpS?cmpS.split('.').map(Number).filter(n=>!isNaN(n)):[],[cmpS])
  const setCompare=useCallback((ids:number[])=>setCmpS(ids.slice(0,4).join('.')),[setCmpS])
  const toggleCompare=useCallback((id:number)=>setCompare(compare.includes(id)?compare.filter(x=>x!==id):[...compare,id].slice(-4)),[compare,setCompare])
  const toggleFav=(id:number)=>setFavs(favs.includes(id)?favs.filter(x=>x!==id):[...favs,id])
  const open=useCallback((id:number)=>setDet(String(id)),[setDet])
  const [fs,setFs]=useHashState<string>('fs','meal.stew')
  const stageSel=useMemo(()=>fs?fs.split('.'):STAGES.map(x=>x[0]),[fs])
  const RR=useMemo(()=>D?D.rows.map(r=>({...r,rankable:!!r.rankable&&r.stage!=='base'&&stageSel.includes(r.stage)})):[],[D,stageSel])
  if(!D) return <div className="min-h-screen flex items-center justify-center text-slate-500"><Salad className="animate-bounce mr-2"/>Daten werden geladen…</div>
  const R=RR, live=R.filter(r=>r.pstat==='live 2026').length
  const Cur=TABS.find(t=>t[0]===tab)?.[2]??Explorer
  return <AppCtx.Provider value={{D,R,stageSel,compare,toggleCompare,setCompare,favs,toggleFav,open,dark,wide,stores,nearest}}>
    <div className={cn('mx-auto px-3 sm:px-5 pb-24 overflow-x-clip',wide?'max-w-none':'max-w-[1500px]')}>
      <header className="sticky top-0 z-40 -mx-3 sm:-mx-5 px-3 sm:px-5 py-2 bg-slate-50/85 dark:bg-slate-950/85 backdrop-blur border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <div className="flex items-center gap-2 min-w-0"><div className="h-8 w-8 rounded-lg bg-brand text-white flex items-center justify-center shrink-0"><Salad size={18}/></div><div className="min-w-0"><div className="font-bold leading-tight truncate">Fertiggerichte-Vergleich</div><div className="text-[11px] text-slate-500 leading-tight hidden sm:block">Linz &amp; Oberösterreich · Stand 12.10.2026</div></div></div>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" onClick={()=>setWide(!wide)} className="hidden md:inline-flex" title="Breitbild">{wide?<Minimize2 size={15}/>:<Maximize2 size={15}/>}</Button>
          <Button size="sm" onClick={()=>setDark(!dark)} aria-label="Dark Mode">{dark?<Sun size={15}/>:<Moon size={15}/>}</Button></div>
      </header>
      <section className="py-4 space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welches Fertiggericht lohnt sich wirklich?</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">Preise, Protein, Salz und Health-Score von Fertig- und Schnellgerichten bei Billa, Spar, Hofer, Lidl, Penny, dm und Fit to Go, dazu die Hersteller hinter den Eigenmarken und Tipps für den Instant Pot Pro.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">{[[R.length,'Gerichte'],[live,'aktuelle Preise 2026'],[R.filter(r=>r.rankable).length,'vollständig bewertet'],[new Set(R.map(r=>r.brandN)).size,'Marken'],[D.same.length,'Werke mit mehreren Marken'],[R.filter(r=>r.ooe).length,'aus OÖ']].map(([v,l])=><Card key={l as string} className="px-3 py-2"><div className="text-xl font-bold text-brand">{v}</div><div className="text-[11px] text-slate-500">{l}</div></Card>)}</div>
        <Card className="p-3 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900 border-emerald-200 dark:border-emerald-900">
          <div className="flex items-center justify-between mb-2"><h2 className="font-bold text-lg">🥇 Bestes Protein pro Euro &amp; gesund</h2><button onClick={()=>setTab('top')} className="text-sm text-brand hover:underline">Ganze Liste →</button></div>
          <p className="text-xs text-slate-500 mb-2">Health-Score ≥ 45, sortiert nach € pro 10 g Protein, nur Preise 2026 und vollständige Nährwerte</p>
          <div className={cn('grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',wide&&'min-[1900px]:grid-cols-8')}>{healthyCheap(R).slice(0,wide?8:6).map((r,i)=><button key={r.id} onClick={()=>open(r.id)} className="relative rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 p-2 text-left hover:shadow-md transition">
            <span className="absolute left-1.5 top-1.5 rounded-full bg-brand text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center">{i+1}</span>
            <Img src={r.img} className="h-20 w-full"/>
            <div className="text-xs font-semibold leading-tight line-clamp-2 mt-1 min-h-[2rem]">{r.name}</div><div className="text-[10px] text-slate-500 truncate">{r.store} · {fmt(r.price,2)} €</div>
            <div className="mt-1 flex items-center justify-between gap-1"><span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[12px] font-bold text-white">{fmt(r.eur10p,2)} €/10 g</span><span className="text-xs font-bold" style={{color:scoreColor(r.score)}}>♥ {fmt(r.score,0)}</span></div></button>)}</div>
        </Card>
      </section>
      <div className="flex gap-1.5 overflow-x-auto scroll-x pb-2 items-center">{STAGES.map(([k,e,l])=>{const on=stageSel.includes(k),n=D.rows.filter(r=>r.stage===k).length;return <button key={k} onClick={()=>{const nx=on?stageSel.filter(x=>x!==k):[...stageSel,k];setFs(nx.length?nx.join('.'):'meal.stew')}} className={cn('flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition',on?'border-brand bg-brand/10 text-brand dark:text-emerald-300':'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100')}><span className="text-xl">{e}</span>{l}<span className="text-xs opacity-60">{n}</span></button>})}<InfoTip k="stage"/></div>
      <nav className="sticky top-[49px] z-30 -mx-3 sm:-mx-5 px-3 sm:px-5 py-1.5 bg-slate-50/85 dark:bg-slate-950/85 backdrop-blur overflow-x-auto scroll-x"><div className="flex gap-1 w-max">{TABS.map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={cn('rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition',tab===k?'bg-brand text-white shadow':'hover:bg-slate-200 dark:hover:bg-slate-800')}>{l}</button>)}</div></nav>
      <main className="pt-3"><ErrorBoundary key={tab}><Suspense fallback={<Loading/>}><Cur/></Suspense></ErrorBoundary></main>
      <footer className="text-xs text-slate-400 py-6">Daten aus öffentlichen Shop-Seiten und Open Food Facts · Multipot-Angaben sind Richtwerte · keine Ernährungsberatung · ohne Gewähr</footer>
    </div>
    {compare.length>0&&<div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40"><button onClick={()=>setCmpOpen(true)} className="flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-white shadow-xl hover:scale-105 transition"><GitCompare size={18}/>Vergleichen ({compare.length}/4)</button></div>}
    <Sheet open={cmpOpen} onClose={()=>setCmpOpen(false)} side={innerWidth<768?'bottom':'right'} title="Produktvergleich"><Suspense fallback={<Loading/>}><Compare/></Suspense></Sheet>
    <Sheet open={det!==''} onClose={()=>setDet('')} title="Produktdetails"><Suspense fallback={<Loading/>}>{det!==''&&<Detail id={+det}/>}</Suspense></Sheet>
  </AppCtx.Provider>
}

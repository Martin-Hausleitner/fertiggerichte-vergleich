import { SearchPalette } from './components/SemanticSearch'
import { ErrorBoundary } from './components/ErrorBoundary'
import { STAGES, InfoTip } from './components/info'
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Moon, Sun, GitCompare, Maximize2, Minimize2, Salad, MapPin, Leaf, UtensilsCrossed, BadgeCheck, Tag, Trophy, ChevronRight, Heart, LayoutGrid, Soup, ListOrdered, Shapes, Store, HeartPulse, BarChart3, ScatterChart, Package, Factory, SearchCheck, Grid3x3, Image, Network, Building2, CalendarDays, Puzzle, Scale, Timer, BookOpen, ShieldCheck, Truck } from 'lucide-react'
const TAB_ICON:Record<string,any>={alle:LayoutGrid,gerichte:Soup,top:ListOrdered,kategorien:Shapes,marken:Tag,filialen:Store,gesundheit:HeartPulse,analyse:BarChart3,scatter:ScatterChart,pack:Package,'hersteller-seiten':Factory,wer:SearchCheck,firmen:Building2,qualitaet:ShieldCheck,online:Truck,matrix:Grid3x3,logos:Image,netz:Network,hersteller:Building2,planer:CalendarDays,kombi:Puzzle,ftg:Scale,multipot:Timer,methodik:BookOpen}
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
const Gerichte=lazy(()=>import('./views/Gerichte'))
const Health=lazy(()=>import('./views/Health'))
const WerDahinter=lazy(()=>import('./views/WerDahinter'))
const Firmenvergleich=lazy(()=>import('./views/Firmenvergleich'))
const Markenfamilien=lazy(()=>import('./views/Markenfamilien'))
const Qualitaet=lazy(()=>import('./views/Qualitaet'))
const Online=lazy(()=>import('./views/Online'))
const Methodik=lazy(()=>import('./views/Misc').then(m=>({default:m.Methodik})))
const TABS:[string,string,any][]=[['alle','Alle Gerichte',Explorer],['gerichte','🍲 Gericht vergleichen',Gerichte],['top','Top-Listen',Top],['kategorien','Kategorien',Categories],['marken','Marken',Brands],['familien','👪 Markenfamilien',Markenfamilien],['filialen','Filialen in der Nähe',Stores],['gesundheit','🩺 Gesundheit & Qualität',Health],['analyse','Analyse',Analyse],['scatter','Preis vs. Protein',Scatter],['pack','Verpackungen',Packaging],['hersteller-seiten','Hersteller',ProducerPages],['wer','🕵️ Wer steckt dahinter?',WerDahinter],['firmen','🏢 Firmenvergleich',Firmenvergleich],['qualitaet','Hersteller-Qualität',Qualitaet],['online','Online-Anbieter',Online],['matrix','Marken-Matrix',Matrix],['logos','Logos',Logos],['netz','🕸️ Netz 3D',Netz3D],['hersteller','Läden & Werke',Producers],['planer','Wochenplaner',Planner],['kombi','Kombi-Ideen',Kombi],['ftg','Fit to Go vs. Supermarkt',Ftg],['multipot','Multipot-Pro Garzeiten',Multipot],['methodik','Methodik & Quellen',Methodik]]
const Loading=()=><Card className="p-10 text-center text-muted-foreground animate-pulse">Lädt…</Card>
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
    <div className={cn('mx-auto px-3 sm:px-6 pb-24 overflow-x-clip',wide?'max-w-none':'max-w-[1500px]')}>
      <header className="sticky top-0 z-40 -mx-3 sm:-mx-6 px-3 sm:px-6 bg-background/85 backdrop-blur-xl border-b border-border/60">
        <div className="h-14 flex items-center gap-3">
          <button onClick={()=>setTab('alle')} className="flex items-center gap-2.5 min-w-0 shrink-0"><div className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center"><Salad size={19}/></div><div className="min-w-0 text-left"><div className="font-extrabold tracking-tight leading-none text-[15px]">Fertig<span className="text-brand dark:text-emerald-300">vergleich</span></div><div className="text-[11px] text-muted-foreground leading-tight hidden sm:flex items-center gap-1 mt-0.5"><MapPin size={11}/>Linz · Gruberstraße 19</div></div></button>
          <div className="flex-1 min-w-0 max-w-xl mx-auto hidden md:block"><SearchPalette/></div>
          <div className="ml-auto flex items-center gap-1.5">
            <a href="https://servas-ai.github.io/einkaufsanalyse/" className="hidden sm:inline-flex items-center h-8 rounded-full border border-border px-3 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted whitespace-nowrap" title="Einkaufsanalyse – deine Bons auswerten">Einkaufsanalyse ↗</a>
            <Button size="sm" onClick={()=>setWide(!wide)} className="hidden lg:inline-flex w-9 px-0" title="Breitbild">{wide?<Minimize2 size={15}/>:<Maximize2 size={15}/>}</Button>
            <Button size="sm" onClick={()=>setDark(!dark)} className="w-9 px-0" aria-label="Dark Mode">{dark?<Sun size={15}/>:<Moon size={15}/>}</Button></div>
        </div>
        <nav className="overflow-x-auto scroll-x -mx-3 sm:-mx-6 px-3 sm:px-6"><div className="flex gap-1 w-max pb-2">{TABS.map(([k,l])=>{const I=TAB_ICON[k]??LayoutGrid;const on=tab===k;return <button key={k} onClick={()=>setTab(k)} className={cn('inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[13px] font-medium whitespace-nowrap transition-colors',on?'bg-foreground text-background':'text-muted-foreground hover:text-foreground hover:bg-muted')}><I size={14} strokeWidth={2.2}/>{l.replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u,'')}</button>})}</div></nav>
      </header>
      {tab==='alle'&&<section className="pt-6 pb-2 space-y-5">
        <div className="grid lg:grid-cols-[1fr_auto] gap-4 items-end">
          <div><div className="inline-flex items-center gap-1.5 rounded-full bg-accent text-accent-foreground px-3 py-1 text-xs font-semibold mb-3"><Leaf size={13}/>Gesund essen · günstiges Protein</div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.05]">Welches Fertiggericht<br className="hidden sm:block"/> <span className="text-muted-foreground">lohnt sich wirklich?</span></h1>
            <p className="text-[15px] text-muted-foreground max-w-2xl mt-3">Preis pro Protein, Health-Score und Hersteller von {R.length.toLocaleString('de-AT')} Gerichten bei Billa, Spar, Hofer, Lidl, Penny, dm und Fit to Go – mit Filiale in deiner Nähe.</p></div>
          <div className="grid grid-cols-3 gap-2 lg:w-[420px]">{([[R.length,'Gerichte',UtensilsCrossed],[live,'Preise 2026',BadgeCheck],[new Set(R.map(r=>r.brandN)).size,'Marken',Tag]] as const).map(([v,l,I])=><div key={l} className="rounded-2xl bg-card border border-border/70 shadow-card px-3 py-3"><I size={16} className="text-brand dark:text-emerald-300 mb-1"/><div className="text-xl font-extrabold tabular-nums">{v.toLocaleString('de-AT')}</div><div className="text-[11px] text-muted-foreground">{l}</div></div>)}</div>
        </div>
        <div className="md:hidden"><SearchPalette/></div>
        <div>
          <div className="flex items-end justify-between mb-3"><div><h2 className="font-bold text-xl flex items-center gap-2"><Trophy size={20} className="text-amber-500"/>Bestes Protein pro Euro</h2><p className="text-xs text-muted-foreground mt-0.5">Health-Score ≥ 45 · sortiert nach € pro 10 g Protein · nur aktuelle Preise</p></div><button onClick={()=>setTab('top')} className="text-sm font-semibold text-brand dark:text-emerald-300 hover:underline inline-flex items-center gap-1 shrink-0">Alle<ChevronRight size={16}/></button></div>
          <div className={cn('grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',wide&&'min-[1900px]:grid-cols-8')}>{healthyCheap(R).slice(0,wide?8:6).map((r,i)=><button key={r.id} onClick={()=>open(r.id)} className="group relative rounded-2xl bg-card border border-border/70 shadow-card overflow-hidden text-left hover:shadow-lift hover:-translate-y-0.5 transition-all">
            <div className="relative bg-white aspect-[4/3] p-3"><Img src={r.img} className="h-full w-full"/>
              <span className="absolute left-2 top-2 rounded-full bg-foreground/85 text-background text-[11px] font-bold h-6 min-w-6 px-1.5 flex items-center justify-center">#{i+1}</span>
              <span className="absolute right-2 top-2 rounded-full bg-white/95 shadow-sm px-2 h-6 text-[11px] font-bold flex items-center gap-0.5" style={{color:scoreColor(r.score)}}><Heart size={11} fill="currentColor"/>{fmt(r.score,0)}</span></div>
            <div className="p-3 pt-2.5"><div className="text-[13px] font-semibold leading-snug line-clamp-2 min-h-[2.4rem]">{r.name}</div>
              <div className="text-[11px] text-muted-foreground truncate mt-0.5">{r.store}</div>
              <div className="mt-2 flex items-center justify-between gap-1"><span className="text-base font-extrabold tabular-nums">{fmt(r.price,2)} €</span><span className="rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-[11px] font-bold tabular-nums">{fmt(r.eur10p,2)} €/10g</span></div></div></button>)}</div>
        </div>
      </section>}
      <div className="sticky top-[97px] z-30 -mx-3 sm:-mx-6 px-3 sm:px-6 py-2 bg-background/85 backdrop-blur-xl"><div className="flex gap-2 overflow-x-auto scroll-x items-center">{STAGES.map(([k,e,l])=>{const on=stageSel.includes(k),n=D.rows.filter(r=>r.stage===k).length;return <button key={k} onClick={()=>{const nx=on?stageSel.filter(x=>x!==k):[...stageSel,k];setFs(nx.length?nx.join('.'):'meal.stew')}} className={cn('flex items-center gap-1.5 rounded-full border px-3.5 h-9 text-[13px] font-semibold whitespace-nowrap transition-colors',on?'border-foreground bg-foreground text-background':'border-border bg-card text-muted-foreground hover:text-foreground')}><span className="text-base leading-none">{e}</span>{l}<span className={cn('text-[11px] tabular-nums rounded-full px-1.5',on?'bg-background/20':'bg-muted')}>{n}</span></button>})}<InfoTip k="stage"/></div></div>
      <main className="pt-3"><ErrorBoundary key={tab}><Suspense fallback={<Loading/>}><Cur/></Suspense></ErrorBoundary></main>
      <footer className="text-xs text-muted-foreground py-8 mt-8 border-t">Daten aus öffentlichen Shop-Seiten und Open Food Facts · Multipot-Angaben sind Richtwerte · keine Ernährungsberatung · ohne Gewähr</footer>
    </div>
    {compare.length>0&&<div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40"><button onClick={()=>setCmpOpen(true)} className="flex items-center gap-2 rounded-full bg-foreground text-background px-5 h-12 font-semibold shadow-lift hover:scale-105 transition"><GitCompare size={18}/>Vergleichen ({compare.length}/4)</button></div>}
    <Sheet open={cmpOpen} onClose={()=>setCmpOpen(false)} side={innerWidth<768?'bottom':'right'} title="Produktvergleich"><Suspense fallback={<Loading/>}><Compare/></Suspense></Sheet>
    <Sheet open={det!==''} onClose={()=>setDet('')} title="Produktdetails"><Suspense fallback={<Loading/>}>{det!==''&&<Detail id={+det}/>}</Suspense></Sheet>
  </AppCtx.Provider>
}

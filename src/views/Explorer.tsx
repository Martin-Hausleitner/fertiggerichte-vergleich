import { lazy, Suspense, useMemo } from 'react'
import { LayoutGrid, Table2, Search, Heart } from 'lucide-react'
import { Button, Input, Select, Card } from '../components/ui'
import { Gallery } from '../components/product'
import { FilterPanel, useFilter, makePred, GANG } from '../components/FilterPanel'
import { useApp, useHashState, cn } from '../lib'
import { LegacyFavsRestore } from '../components/LegacyFavsRestore'
import { hiddenHits, hiddenHitsText, revealStages, FEW_HITS } from '../app/hiddenHits'
const Grid=lazy(()=>import('./Grid'))
export default function Explorer(){
  const {R,D,favs,nearest,stageSel,setStageSel}=useApp()
  const STORES=useMemo(()=>[...new Set(R.map(r=>r.store))].sort(),[R]),PACKS=useMemo(()=>[...new Set(R.map(r=>r.pack))].sort(),[R])
  const [q,setQ]=useHashState<string>('q',''),[st,setSt]=useHashState<string>('st',''),[pk,setPk]=useHashState<string>('pk',''),[mp,setMp]=useHashState<string>('mp','0'),[fav,setFav]=useHashState<string>('fav',''),[dry,setDry]=useHashState<string>('dry','')
  const [view,setView]=useHashState<'grid'|'cards'>('view',innerWidth<768?'cards':'grid'),[sort,setSort]=useHashState<string>('sort','eur10p'),[cat,setCat]=useHashState<string>('cat',''),[po,setPo]=useHashState<string>('po','')
  const cats=cat?cat.split('|'):[];const togCat=(c:string)=>setCat((cats.includes(c)?cats.filter(x=>x!==c):[...cats,c]).join('|'))
  const dist=(r:any)=>{const s=nearest(r.store);return s?(s.walk_m??s.dist):null}
  const [fx,setFx]=useFilter()
  const konzOf=useMemo(()=>{const m:Record<string,string>={};(D.producers||[]).forEach((p:any)=>{if(p.group&&!/unverified/i.test(p.group))m[p.slug]=String(p.group).replace(/\(.*?\)/g,'').trim()});return (r:any)=>r.prodSlug?m[r.prodSlug]??null:null},[D])
  const pred=useMemo(()=>makePred(fx,{konzOf,dist}),[fx,konzOf,nearest])
  const rows=useMemo(()=>{const qq=q.toLowerCase();return R.filter(r=>pred(r)&&!r.nonfood&&!r.store.startsWith('unbekannt')&&(fx.stage?.length?true:stageSel.includes(r.stage))&&(!st||r.store===st)&&(!pk||r.pack===pk)&&((r.protpack??0)>=+mp)&&(!fav||favs.includes(r.id))&&(dry||!r.dry)&&(po||!r.priceOnly)&&(!cats.length||cats.every(c=>r.cprot?.includes(c)||r.cdish?.includes(c)))&&(!qq||(r.name+' '+r.brand+' '+r.herst).toLowerCase().includes(qq))).sort((a,b)=>{const lo=['eur10p','price','ppk','eur100k','dist'].includes(sort);const x=sort==='dist'?dist(a):(a as any)[sort],y=sort==='dist'?dist(b):(b as any)[sort];if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return lo?x-y:y-x})},[pred,fx,R,q,st,pk,mp,fav,favs,dry,sort,cat,po,nearest])
  // sensecheck 39 (4) / 40 (6): a search with 0 or few visible hits whose other matches are only hidden by the stage selection (StageBar default
  //  Komplettmahlzeit + Eintopf: Beilagen/Zutaten/Komponenten off), 'Trockenprodukte' or '„nur Preis“' gets a hint 'X Treffer in ausgeblendeten
  //  Beilagen/… – anzeigen' that lifts exactly those hiding filters (user filters – store, pack, protein, favourites, categories, filter panel – stay)
  const hid=useMemo(()=>rows.length>FEW_HITS||!q.trim()?null:hiddenHits(R,q,{keep:(r:any)=>pred(r)&&(!st||r.store===st)&&(!pk||r.pack===pk)&&((r.protpack??0)>=+mp)&&(!fav||favs.includes(r.id))&&(!cats.length||cats.every(c=>r.cprot?.includes(c)||r.cdish?.includes(c))),stageSel,stageFixed:!!fx.stage?.length,dry:!!dry,po:!!po,visible:rows.length}),[rows.length,q,R,pred,st,pk,mp,fav,favs,cat,stageSel,fx,dry,po])
  const showHidden=()=>{if(!hid)return;if(hid.stages.length)setStageSel(revealStages(stageSel,hid));if(hid.needDry)setDry('1');if(hid.needPo)setPo('1')}
  return <div className="space-y-3">
    <Card className="p-2.5 flex flex-wrap items-center gap-2 shadow-none">
      <div className="relative flex-1 min-w-[180px]"><Search size={15} className="absolute left-2.5 top-2.5 text-muted-foreground"/><Input placeholder="Suche: Name, Marke, Hersteller…" value={q} onChange={e=>setQ(e.target.value)} className="w-full pl-8"/></div>
      <Select value={st} onChange={e=>setSt(e.target.value)}><option value="">Alle Läden</option>{STORES.map(s=><option key={s}>{s}</option>)}</Select>
      <Select value={pk} onChange={e=>setPk(e.target.value)} className="max-w-[170px]"><option value="">Alle Verpackungen</option>{PACKS.map(s=><option key={s}>{s}</option>)}</Select>
      <Select value={mp} onChange={e=>setMp(e.target.value)}>{[0,10,20,30,40].map(v=><option key={v} value={v}>{v?`≥ ${v} g Protein/Pkg`:'jedes Protein'}</option>)}</Select>
      <Select value={sort} onChange={e=>setSort(e.target.value)} title="Sortierung"><option value="eur10p">↑ € pro 10 g Protein</option><option value="score">↓ Health-Score</option><option value="pli">↓ Preis-Leistung</option><option value="price">↑ Preis</option><option value="ppk">↑ €/kg</option><option value="eur100k">↑ € pro 100 kcal</option><option value="protpack">↓ Protein/Pkg</option><option value="p100k">↓ Protein/100 kcal</option><option value="dist">↑ Entfernung Filiale</option></Select>
      <Button size="sm" active={!!fav} onClick={()=>setFav(fav?'':'1')}><Heart size={14}/>Favoriten ({favs.length})</Button><LegacyFavsRestore/>
      <label className="text-xs flex items-center gap-1 text-slate-500"><input type="checkbox" checked={!!po} onChange={e=>setPo(e.target.checked?'1':'')}/>„nur Preis“ zeigen</label>
      <label className="text-xs flex items-center gap-1 text-slate-500"><input type="checkbox" checked={!!dry} onChange={e=>setDry(e.target.checked?'1':'')}/>Trockenprodukte zeigen</label>
      <div className="flex gap-1 ml-auto items-center"><span className="text-xs text-slate-500 mr-1">{rows.length} Treffer</span>
        <Button size="sm" active={view==='grid'} onClick={()=>setView('grid')} aria-label="Tabelle"><Table2 size={15}/></Button><Button size="sm" active={view==='cards'} onClick={()=>setView('cards')} aria-label="Karten"><LayoutGrid size={15}/></Button></div>
      <div className="w-full"><FilterPanel f={fx} set={setFx} konzOf={konzOf} count={rows.length}/></div>
      <div className="w-full flex gap-1.5 overflow-x-auto scroll-x pb-0.5 items-center">
        <span className="text-[11px] font-semibold text-muted-foreground shrink-0 mr-0.5">Gang</span>
        {GANG.map(([k,e,l])=>{const on=!!fx.gang?.includes(k);const n=R.filter(r=>!r.nonfood&&(r as any).gang===k).length;return <button key={k} onClick={()=>{const cur=fx.gang||[];setFx({...fx,gang:on?cur.filter(x=>x!==k):[...cur,k]})} } className={cn('shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition flex items-center gap-1',on?'bg-foreground text-background border-foreground':'border-border bg-card hover:bg-muted')}>{e} {l}<span className={cn('tabular-nums text-[10px] rounded-full px-1.5',on?'bg-background/20':'bg-muted')}>{n}</span></button>})}
      </div>
      <div className="w-full flex gap-1 overflow-x-auto scroll-x pb-0.5">{[...D.catProt,...D.catDish].map(c=><button key={c} onClick={()=>togCat(c)} className={cn('shrink-0 rounded-full border px-2 py-0.5 text-xs transition',cats.includes(c)?'bg-sky-600 text-white border-sky-600':'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800')}>{D.catIcon[c]} {c}</button>)}</div>
    </Card>
    {hid&&<Card data-testid="hidden-hits" className="flex flex-wrap items-center gap-2 border-amber-300 bg-amber-50 p-3 text-sm shadow-none dark:border-amber-800 dark:bg-amber-950/30"><span data-testid="hidden-hits-text">{hiddenHitsText(hid)}</span><Button size="sm" data-testid="hidden-hits-show" onClick={showHidden}>anzeigen</Button></Card>}
    <div className={cn(view!=='grid'&&'hidden')}>{view==='grid'&&<Suspense fallback={<Card className="p-10 text-center text-slate-500">Tabelle wird geladen…</Card>}><Grid rows={rows} sort={sort}/></Suspense>}</div>
    {view==='cards'&&<Gallery rows={rows}/>}
  </div>
}

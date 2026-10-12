import { lazy, Suspense, useMemo } from 'react'
import { LayoutGrid, Table2, Search, Heart } from 'lucide-react'
import { Button, Input, Select, Card } from '../components/ui'
import { Gallery } from '../components/product'
import { useApp, useHashState, cn } from '../lib'
const Grid=lazy(()=>import('./Grid'))
export default function Explorer(){
  const {R,favs}=useApp()
  const STORES=useMemo(()=>[...new Set(R.map(r=>r.store))].sort(),[R]),PACKS=useMemo(()=>[...new Set(R.map(r=>r.pack))].sort(),[R])
  const [q,setQ]=useHashState<string>('q',''),[st,setSt]=useHashState<string>('st',''),[pk,setPk]=useHashState<string>('pk',''),[mp,setMp]=useHashState<string>('mp','0'),[fav,setFav]=useHashState<string>('fav',''),[dry,setDry]=useHashState<string>('dry','')
  const [view,setView]=useHashState<'grid'|'cards'>('view',innerWidth<768?'cards':'grid'),[sort,setSort]=useHashState<string>('sort','eur10p')
  const rows=useMemo(()=>{const qq=q.toLowerCase();return R.filter(r=>(!st||r.store===st)&&(!pk||r.pack===pk)&&((r.protpack??0)>=+mp)&&(!fav||favs.includes(r.id))&&(dry||!r.dry)&&(!qq||(r.name+' '+r.brand+' '+r.herst).toLowerCase().includes(qq))).sort((a,b)=>{const lo=['eur10p','price','ppk','eur100k'].includes(sort);const x=(a as any)[sort],y=(b as any)[sort];if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return lo?x-y:y-x})},[R,q,st,pk,mp,fav,favs,dry,sort])
  return <div className="space-y-3">
    <Card className="sticky top-[96px] z-30 p-2.5 flex flex-wrap items-center gap-2 backdrop-blur bg-white/90 dark:bg-slate-900/90">
      <div className="relative flex-1 min-w-[180px]"><Search size={15} className="absolute left-2.5 top-2.5 text-slate-400"/><Input placeholder="Suche: Name, Marke, Hersteller…" value={q} onChange={e=>setQ(e.target.value)} className="w-full pl-8"/></div>
      <Select value={st} onChange={e=>setSt(e.target.value)}><option value="">Alle Läden</option>{STORES.map(s=><option key={s}>{s}</option>)}</Select>
      <Select value={pk} onChange={e=>setPk(e.target.value)} className="max-w-[170px]"><option value="">Alle Verpackungen</option>{PACKS.map(s=><option key={s}>{s}</option>)}</Select>
      <Select value={mp} onChange={e=>setMp(e.target.value)}>{[0,10,20,30,40].map(v=><option key={v} value={v}>{v?`≥ ${v} g Protein/Pkg`:'jedes Protein'}</option>)}</Select>
      <Select value={sort} onChange={e=>setSort(e.target.value)} title="Sortierung"><option value="eur10p">↑ € pro 10 g Protein</option><option value="score">↓ Health-Score</option><option value="pli">↓ Preis-Leistung</option><option value="price">↑ Preis</option><option value="ppk">↑ €/kg</option><option value="eur100k">↑ € pro 100 kcal</option><option value="protpack">↓ Protein/Pkg</option><option value="p100k">↓ Protein/100 kcal</option></Select>
      <Button size="sm" active={!!fav} onClick={()=>setFav(fav?'':'1')}><Heart size={14}/>Favoriten ({favs.length})</Button>
      <label className="text-xs flex items-center gap-1 text-slate-500"><input type="checkbox" checked={!!dry} onChange={e=>setDry(e.target.checked?'1':'')}/>Trockenprodukte zeigen</label>
      <div className="flex gap-1 ml-auto items-center"><span className="text-xs text-slate-500 mr-1">{rows.length} Treffer</span>
        <Button size="sm" active={view==='grid'} onClick={()=>setView('grid')} aria-label="Tabelle"><Table2 size={15}/></Button><Button size="sm" active={view==='cards'} onClick={()=>setView('cards')} aria-label="Karten"><LayoutGrid size={15}/></Button></div>
    </Card>
    <div className={cn(view!=='grid'&&'hidden')}>{view==='grid'&&<Suspense fallback={<Card className="p-10 text-center text-slate-500">Tabelle wird geladen…</Card>}><Grid rows={rows} sort={sort}/></Suspense>}</div>
    {view==='cards'&&<Gallery rows={rows}/>}
  </div>
}

import { useEffect, useMemo, useState } from 'react'
import { Truck, Check, X, ExternalLink } from 'lucide-react'
import { Card, Badge, Button } from '../components/ui'
import { Img } from '../components/product'
import { useApp, fmt, cn } from '../lib'
type Pv={name:string;company:string;seat?:string;producer?:string;delivers_linz:boolean|null;shipping?:string|null;storage?:string;packaging?:string;price_from?:string|null;products_note?:string;store:string;sources:string[];stats:any}
export default function Online(){
  const {D,open}=useApp()
  const [d,setD]=useState<{providers:Pv[];not_found_de:string}|null>(null),[sort,setSort]=useState<'e10'|'price'|'prot'>('e10'),[shop,setShop]=useState('')
  useEffect(()=>{fetch('./analysis/online_providers.json?v='+__BUILD__).then(r=>r.json()).then(setD).catch(()=>{})},[])
  const rows=useMemo(()=>D.rows.filter(r=>r.store?.startsWith('Online')&&(!shop||r.store===shop)).sort((a,b)=>sort==='e10'?(a.eur10p??99)-(b.eur10p??99):sort==='price'?(a.price??99)-(b.price??99):(b.protpack??0)-(a.protpack??0)),[D,sort,shop])
  const shops=[...new Set(D.rows.filter(r=>r.store?.startsWith('Online')).map(r=>r.store))]
  return <div className="space-y-5 max-w-6xl">
    <div><h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Truck size={22}/>Online-Anbieter</h2>
    <p className="text-sm text-muted-foreground mt-1">Meal-Prep- und Fertiggericht-Lieferdienste, die nach Linz liefern (oder nicht). Preise & Nährwerte direkt aus den Shops.</p></div>
    {d&&<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{d.providers.map(p=><Card key={p.name} className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2"><div><div className="font-bold">{p.name}</div><div className="text-xs text-muted-foreground">{p.company}{p.seat?' · '+p.seat:''}</div></div>
        <Badge className={cn(p.delivers_linz?'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200':p.delivers_linz===false?'bg-muted text-muted-foreground':'bg-amber-100 text-amber-800')}>{p.delivers_linz?<Check size={11}/>:<X size={11}/>}Linz{p.delivers_linz==null?' ?':''}</Badge></div>
      {p.stats&&<div className="grid grid-cols-3 gap-2 text-center">{[[p.stats.n_products,'Gerichte'],[fmt(p.stats.median_eur_per_10g_protein,2)+' €','Ø €/10 g P.'],[fmt(p.stats.median_protein_pack_g,0)+' g','Ø Protein']].map(([v,l])=><div key={l} className="rounded-xl bg-muted/60 py-1.5"><div className="font-extrabold tabular-nums text-sm">{v}</div><div className="text-[10px] text-muted-foreground">{l}</div></div>)}</div>}
      <dl className="text-xs space-y-0.5">{([['Versand',p.shipping],['Lagerung',p.storage],['Verpackung',p.packaging],['Preis',p.price_from],['Herstellung',p.producer]] as [string,any][]).filter(x=>x[1]).map(([k,v])=><div key={k} className="flex gap-2"><dt className="text-muted-foreground w-20 shrink-0">{k}</dt><dd>{v}</dd></div>)}</dl>
      {p.products_note&&<div className="text-[11px] text-muted-foreground italic">{p.products_note}</div>}
      <div className="flex gap-2">{p.sources.slice(0,3).map((u,i)=><a key={i} href={u} target="_blank" rel="noreferrer" className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"><ExternalLink size={10}/>{new URL(u).hostname.replace('www.','')}</a>)}</div>
    </Card>)}</div>}
    <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold mr-1">{rows.length} Gerichte</span>
      <Button size="sm" active={!shop} onClick={()=>setShop('')}>Alle</Button>{shops.map(s=><Button key={s} size="sm" active={shop===s} onClick={()=>setShop(s)}>{s.replace('Online: ','')}</Button>)}
      <span className="flex-1"/>{([['e10','€/10 g Protein'],['price','Preis'],['prot','Protein']] as const).map(([k,l])=><Button key={k} size="sm" active={sort===k} onClick={()=>setSort(k)}>{l}</Button>)}</div>
    <Card className="divide-y divide-border/70">{rows.map(r=><button key={r.id} onClick={()=>open(r.id)} className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-muted/40">
      <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-muted">{r.img&&<Img src={r.img} className="w-full h-full object-cover"/>}</div>
      <div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{r.name}</div><div className="text-xs text-muted-foreground">{r.store.replace('Online: ','')} · {fmt(r.size,0)} g · {fmt(r.kcalpack,0)} kcal</div></div>
      <div className="text-right text-sm tabular-nums w-20"><div className="font-bold">{fmt(r.price,2)} €</div><div className="text-[11px] text-muted-foreground">{fmt(r.protpack,0)} g P.</div></div>
      <Badge className="bg-accent text-accent-foreground tabular-nums w-20 justify-center">{fmt(r.eur10p,2)} €/10g</Badge>
    </button>)}</Card>
    {d&&<p className="text-xs text-muted-foreground">{d.not_found_de}</p>}
  </div>
}

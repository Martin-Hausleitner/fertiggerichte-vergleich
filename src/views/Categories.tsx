import { useMemo } from 'react'
import { Card } from '../components/ui'
import { Img } from '../components/product'
import { useApp, healthyCheap, fmt, scoreColor } from '../lib'
export default function Categories(){
  const {R,D,open}=useApp()
  const go=(c:string)=>{const p=new URLSearchParams(location.hash.slice(1));p.set('tab','alle');p.set('cat',c);location.hash=p.toString()}
  const Sec=({title,cats,key2}:{title:string;cats:string[];key2:'cprot'|'cdish'})=>{
    const data=useMemo(()=>cats.map(c=>{const rs=R.filter(r=>(r[key2]||[]).includes(c));const hc=healthyCheap(rs,40)[0];return {c,n:rs.length,hc}}).filter(x=>x.n>0).sort((a,b)=>b.n-a.n),[cats])
    return <section><h3 className="font-semibold text-lg mb-2">{title}</h3><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">{data.map(({c,n,hc})=><Card key={c} className="p-3 space-y-2"><button onClick={()=>go(c)} className="flex items-center gap-2 w-full text-left"><span className="text-3xl">{D.catIcon[c]??'🍽️'}</span><div><div className="font-semibold">{c}</div><div className="text-xs text-slate-500">{n} Produkte →</div></div></button>
      {hc?<button onClick={()=>open(hc.id)} className="flex items-center gap-2 w-full text-left rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-1.5"><Img src={hc.img} className="h-10 w-10"/><div className="min-w-0 flex-1 text-xs"><div className="text-[10px] text-emerald-700 font-semibold">Gesund &amp; günstig</div><div className="truncate font-medium">{hc.name}</div><div>{fmt(hc.eur10p,2)} €/10 g P · <span style={{color:scoreColor(hc.score)}}>♥ {fmt(hc.score,0)}</span></div></div></button>:<div className="text-xs text-slate-400">kein vollständig bewertetes Produkt</div>}</Card>)}</div></section>}
  return <div className="space-y-6"><Sec title="Nach Proteinquelle" cats={D.catProt} key2="cprot"/><Sec title="Nach Gericht" cats={D.catDish} key2="cdish"/><p className="text-xs text-slate-500">Die Kategorien sind automatisch aus Name und Marke abgeleitet; ein Produkt kann in mehreren stehen. „Gesund & günstig“ = Health-Score ≥ 40 mit dem niedrigsten Preis pro 10 g Protein.</p></div>
}

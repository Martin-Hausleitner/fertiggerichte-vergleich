import { useMemo, useState } from 'react'
import { Card, Badge } from '../components/ui'
import { Img, StoreLogo } from '../components/product'
import { InfoTip } from '../components/info'
import { fmt, useApp } from '../lib'
import { isStalePrice } from '../app/meal'
export type It={key:string;name:string;img:string|null;price:number;prot:number;kcal:number;salt:number;fib:number;store:string;score:number|null}
const nm=(b:string|null,n:string)=>{if(!b)return n;const bl=b.toLowerCase();return n.toLowerCase().startsWith(bl.split(' ')[0])?n:`${b} ${n}`}
export const fromRow=(r:any):It|null=>{
  const price=r.pPor??r.price
  const prot=r.protPor??r.protpack
  if(!price||prot==null||r.nonfood)return null
  const porG=r.portion??r.size??0
  const isMultiPor=Boolean(r.portion&&r.size&&r.portion<r.size)
  return {
    key:'r'+r.id,
    name:nm(r.brand,r.name)+(isMultiPor?` (Portion ${r.portion} g)`:''),
    img:r.img,
    price,
    prot,
    kcal:r.kcalPor??r.kcalpack??0,
    salt:r.saltPor??((r.salt??0)*porG/100),
    fib:(r.fib??0)*porG/100,
    store:r.store,
    score:r.score
  }
}
export default function KombiBuilder(){
  const {D}=useApp(); const all=D.rows
  const fromSide=(s:any):It=>({key:'s'+s.id,name:`${nm(s.brand,s.name)} (${s.portion} g)`,img:s.img,price:s.cost,prot:s.prot,kcal:s.kcal,salt:s.salt,fib:s.fib,store:s.store??'Billa',score:null})
  const pool=useMemo(()=>{const by=(st:string)=>all.filter((r:any)=>r.dupOf==null&&r.delivers_4020!==false&&!isStalePrice(r)&&r.stage===st&&!r.priceOnly).map(fromRow).filter(Boolean) as It[]
    const sd=(role:string[])=>D.sides.filter((s:any)=>role.includes(s.role)&&s.cost).map(fromSide)
    const srt=(a:It[],f:(x:It)=>number)=>a.sort((x,y)=>f(x)-f(y))
    return {prot:srt(by('prot'),x=>x.price/Math.max(x.prot,1)),side:srt([...by('side'),...sd(['side'])],x=>x.price),veg:srt([...by('veg'),...sd(['veg','salad'])],x=>x.price)}},[all,D.sides])
  const [sel,setSel]=useState<Record<string,string>>({})
  const pick=(k:'prot'|'side'|'veg')=>pool[k].find(x=>x.key===sel[k])??pool[k][0]
  const items=(['prot','side','veg'] as const).map(pick).filter(Boolean) as It[]
  const T=items.reduce((a,x)=>({price:a.price+x.price,prot:a.prot+x.prot,kcal:a.kcal+x.kcal,salt:a.salt+x.salt,fib:a.fib+x.fib}),{price:0,prot:0,kcal:0,salt:0,fib:0})
  const pd=T.kcal>0?T.prot/T.kcal*100:0
  const score=Math.max(0,Math.min(100,30+Math.min(pd/10,1)*40+Math.min(T.fib/(T.kcal>0?T.kcal/100:1)/6,1)*15+5-Math.min(Math.max(T.salt/(T.kcal>0?T.kcal/100:1)-0.6,0)/1.4,1)*20))
  const L:{[k:string]:[string,string]}={prot:['🍖','Protein-Komponente'],side:['🥔','Beilage'],veg:['🥦','Gemüse/Salat']}
  return <Card className="p-4 space-y-3"><h3 className="text-lg font-bold flex items-center gap-2">🧩 Kombi-Baukasten <InfoTip text="Kombiniert eine Protein-Komponente mit einer Beilage und Gemüse zu einer vollständigen Mahlzeit. Bei Beilagen und Gemüse zählt jeweils eine Portion. Der Score ist eine Näherung auf Basis von Proteindichte, Ballaststoffen und Salz pro 100 kcal plus 5 Punkte Gemüse-Bonus."/></h3>
    <div className="grid gap-3 md:grid-cols-3">{(['prot','side','veg'] as const).map(k=>{const cur=pick(k);return <div key={k} className="space-y-1"><div className="text-sm font-semibold">{L[k][0]} {L[k][1]} <span className="text-xs text-slate-400">({pool[k].length})</span></div>
      <select value={cur?.key} onChange={e=>setSel({...sel,[k]:e.target.value})} className="w-full rounded-lg border px-2 py-1.5 text-sm dark:bg-slate-900 dark:border-slate-700">{pool[k].map(x=><option key={x.key} value={x.key}>{fmt(x.price,2)} € · {fmt(x.prot,0)} g P · {x.name.slice(0,60)}</option>)}</select>
      {cur&&<div className="flex gap-2 items-center"><Img src={cur.img} className="h-16 w-16"/><div className="text-xs"><StoreLogo store={cur.store} size={22}/><div>{fmt(cur.price,2)} € · {fmt(cur.prot,1)} g Protein · {Math.round(cur.kcal)} kcal</div></div></div>}</div>})}</div>
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center border-t pt-3 dark:border-slate-700">{[['💶',fmt(T.price,2)+' €','Gesamtpreis'],['🥩',fmt(T.prot,0)+' g','Protein'],['🔥',Math.round(T.kcal)+'','kcal'],['🧂',fmt(T.salt,1)+' g','Salz'],['⚖️',T.prot?fmt(T.price/T.prot*10,2)+' €':'–','€/10 g Protein'],['💚',Math.round(score)+'','Score (Näherung)']].map(([e,v,l])=><div key={l} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2"><div className="text-lg">{e}</div><div className="font-bold tabular-nums">{v}</div><div className="text-[10px] text-slate-500">{l}</div></div>)}</div>
    {T.kcal>1600&&<Badge className="bg-amber-100 text-amber-800">Hinweis: über 1600 kcal, das reicht eher für 2 Portionen</Badge>}</Card>
}

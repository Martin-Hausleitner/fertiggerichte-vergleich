import { useMemo } from 'react'
import { Card, Badge } from '../components/ui'
import { Img } from '../components/product'
import { fmt, useApp } from '../lib'
import KombiBuilder from './KombiBuilder'
export default function Kombi(){
  const {D,open}=useApp();const R=D.rows; const S=Object.fromEntries(D.sides.map(s=>[s.id,s]))
  const byId=useMemo(()=>new Map(R.map(r=>[r.id,r])),[R])
  const validCombos=useMemo(()=>D.combos.filter(c=>{const m=byId.get(c.main);return Boolean(m&&m.dupOf==null&&m.delivers_4020!==false)}),[D.combos,byId])
  const roleL={veg:'TK-Gemüse',salad:'Salat',side:'Beilage'}
  return <div className="space-y-3"><KombiBuilder/><p className="text-sm text-slate-500">Jedes Paar besteht aus einem proteinreichen Hauptgericht, Gemüse oder Salat und, falls das Gericht keine Beilage enthält, Knödel, Reis oder Püree. Gemüse und Beilagen stammen von shop.billa.at mit echten Nährwerten und Preisen, gerechnet in Portionen (Gemüse 200 g, Salat 100 g, Reis 75 g roh, Knödel/Püree 150 g). Ziel sind 500–900 kcal bei maximaler Proteindichte und Ballaststoffen.</p>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{validCombos.map((c,i)=>{const m=byId.get(c.main)!,v=S[c.veg],s=c.side!=null?S[c.side]:null
      return <Card key={i} className="p-3 space-y-2"><div className="flex gap-2 items-center cursor-pointer" onClick={()=>open(m.id)}><Img src={m.img} className="h-14 w-14"/><div className="text-sm leading-tight"><div className="font-semibold">{m.name}</div><div className="text-xs text-slate-500">{m.store} · {fmt(m.price,2)} € · {fmt(m.protpack,0)} g Protein</div></div></div>
        {[v,s].filter(Boolean).map(x=><a key={x!.id} href={x!.url} target="_blank" rel="noreferrer" className="flex gap-2 items-center text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded p-1"><span className="text-lg text-slate-400">+</span><Img src={x!.img} className="h-10 w-10"/><div className="flex-1"><div className="font-medium">{x!.name}</div><div className="text-slate-500">{x!.portion} g · {x!.kcal} kcal · {fmt(x!.prot)} g P · {fmt(x!.cost,2)} €</div></div><Badge className="bg-slate-100 dark:bg-slate-800">{roleL[x!.role]}</Badge></a>)}
        <div className="grid grid-cols-4 gap-1 text-center text-xs border-t pt-2 dark:border-slate-700">{[[c.kcal,'kcal'],[c.prot+' g','Protein'],[fmt(c.price,2)+' €','Preis'],[c.fib+' g','Ballastst.']].map(([a,b])=><div key={b as string}><div className="font-bold">{a}</div><div className="text-slate-500">{b}</div></div>)}</div></Card>})}</div>
    <h3 className="font-semibold pt-2">Gemüse- und Beilagen-Datenbank (Billa, {D.sides.length} Artikel)</h3>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{D.sides.slice().sort((a,b)=>a.role.localeCompare(b.role)).map(x=><a key={x.id} href={x.url} target="_blank" rel="noreferrer" className="flex gap-2 items-center rounded-lg border p-2 text-xs hover:shadow dark:border-slate-800"><Img src={x.img} className="h-10 w-10"/><div className="min-w-0"><div className="font-medium truncate">{x.name}</div><div className="text-slate-500">{roleL[x.role]} · {fmt(x.price,2)} € · Portion {x.kcal} kcal / {fmt(x.prot)} g P</div></div></a>)}</div></div>
}

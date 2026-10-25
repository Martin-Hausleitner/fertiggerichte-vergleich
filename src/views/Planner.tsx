import { useMemo, useState } from 'react'
import { Card, Input, Select, Button } from '../components/ui'
import { Img, PliBadge } from '../components/product'
import { fmt, useApp, useHashState, type Row } from '../lib'
import { isRowRankable, isLightOnlyRanked, rowPli } from '../app/meal'
const DAYS=['Mo','Di','Mi','Do','Fr','Sa','So']
export default function Planner(){
  const {R,D,open}=useApp()
  const [prot,setProt]=useHashState<string>('pp','140'),[budget,setBudget]=useHashState<string>('pb','70'),[meals,setMeals]=useHashState<string>('pm','2'),[w,setW]=useHashState<string>('pw','50'),[veg,setVeg]=useHashState<string>('pv','')
  const [seed,setSeed]=useState(0)
  const plan=useMemo(()=>{
    const P=+prot,B=+budget,M=+meals,alpha=+w/100
    const pool=R.filter(r=>isRowRankable(r)&&r.price!=null&&r.pstat==='live 2026'&&r.protpack!=null&&r.protpack>=15&&r.protpack<=90&&r.kcalpack!=null&&r.kcalpack<=900&&r.score!=null&&(!veg||r.vegan||/vegan|vegetar|gemüse|linsen|kichererb|tofu|falafel/i.test(r.name)))
    if(!pool.length) return null
    const perMealBudget=B/7/M, perMealProt=P/M*0.8
    const value=(r:Row)=>{const pe=Math.min((r.protpack!/r.price!)/15,1.5),hs=((rowPli(r)??r.score!))/70,fit=Math.min(r.protpack!/perMealProt,1.2),cost=r.price!>perMealBudget*1.5?-0.6:0;return alpha*pe+(1-alpha)*hs+0.5*fit+cost+((r.id*9301+seed*49297)%233)/233*0.25}
    const ranked=[...pool].sort((a,b)=>value(b)-value(a))
    const used=new Map<number,number>(),days:Row[][]=[]
    for(let d=0;d<7;d++){const day:Row[]=[];for(const r of ranked){if(day.length>=M)break;if((used.get(r.id)??0)>=2||day.some(x=>x.id===r.id))continue;if(days[d-1]?.some(x=>x.id===r.id))continue;day.push(r);used.set(r.id,(used.get(r.id)??0)+1)}days.push(day)}
    const sideFill=D.sides.filter(s=>s.role==='veg').sort((a,b)=>b.prot/b.cost-a.prot/a.cost).slice(0,7)
    const tot=days.flat().reduce((a,r)=>({p:a.p+r.protpack!,k:a.k+r.kcalpack!,c:a.c+r.price!,s:a.s+r.score!,pli:a.pli+(rowPli(r)??0)}),{p:0,k:0,c:0,s:0,pli:0})
    return {days,tot,n:days.flat().length,poolN:pool.length,sideFill,P,B}
  },[R,D,prot,budget,meals,w,veg,seed])
  return <div className="space-y-3">
    <Card className="p-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end">
      <label className="text-sm">Protein-Ziel/Tag (g)<Input type="number" value={prot} onChange={e=>setProt(e.target.value)} className="w-full mt-1"/></label>
      <label className="text-sm">Budget/Woche (€)<Input type="number" value={budget} onChange={e=>setBudget(e.target.value)} className="w-full mt-1"/></label>
      <label className="text-sm">Fertiggerichte/Tag<Select value={meals} onChange={e=>setMeals(e.target.value)} className="w-full mt-1">{[1,2,3].map(v=><option key={v}>{v}</option>)}</Select></label>
      <label className="text-sm lg:col-span-2">Gewichtung: Gesundheit ↔ Protein/€ ({w} %)<input type="range" min={0} max={100} value={w} onChange={e=>setW(e.target.value)} className="w-full accent-[#1b6e3a]"/></label>
      <div className="flex gap-2 items-center"><label className="text-xs flex gap-1 items-center"><input type="checkbox" checked={!!veg} onChange={e=>setVeg(e.target.checked?'1':'')}/>vegetarisch</label><Button size="sm" onClick={()=>setSeed(seed+1)}>🎲 Neu</Button></div>
    </Card>
    {!plan?<Card className="p-6 text-center">Keine passenden Produkte.</Card>:<>
    <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">{[[`${fmt(plan.tot.p/7,0)} g`,`Protein/Tag (Ziel ${plan.P} g)`,plan.tot.p/7>=plan.P],[`${fmt(plan.tot.c,2)} €`,`Woche (Budget ${plan.B} €)`,plan.tot.c<=plan.B],[`${fmt(plan.tot.k/7,0)}`,'kcal/Tag aus Fertiggerichten',true],[`${fmt(plan.tot.s/plan.n,0)} · PLI ${fmt(plan.tot.pli/plan.n,0)}`,'Ø Health-Score & PLI',true]].map(([v,l,ok])=><Card key={l as string} className="p-3"><div className={'text-xl font-bold '+(ok?'text-brand':'text-red-600')}>{v as string}</div><div className="text-xs text-slate-500">{l as string}</div></Card>)}</div>
    {plan.tot.p/7<plan.P&&<p className="text-xs text-amber-700">Mit Fertiggerichten allein wird das Protein-Ziel nicht erreicht. Fehlen pro Tag {fmt(plan.P-plan.tot.p/7,0)} g; die lassen sich z. B. mit Topfen, Skyr, Eiern oder einem dritten Gericht auffüllen.</p>}
    <div className="grid gap-2 md:grid-cols-7">{plan.days.map((day,i)=><Card key={i} className="p-2 space-y-2"><div className="font-semibold text-sm">{DAYS[i]} <span className="text-xs font-normal text-slate-500">{fmt(day.reduce((a,r)=>a+r.protpack!,0),0)} g · {fmt(day.reduce((a,r)=>a+r.price!,0),2)} €</span></div>
      {day.map(r=><button key={r.id} onClick={()=>open(r.id)} className="flex md:flex-col gap-2 w-full text-left rounded-lg p-1 hover:bg-slate-50 dark:hover:bg-slate-800"><Img src={r.img} className="h-14 w-14 md:h-16 md:w-full"/><div className="text-xs leading-tight"><div className="font-medium line-clamp-2">{r.name}</div><div className="text-slate-500">{r.store} · {fmt(r.price,2)} € · {fmt(r.protpack,0)} g P</div><div className="mt-0.5"><PliBadge v={rowPli(r)} light={Boolean((r as any).rankableLight)||isLightOnlyRanked(r as any)}/></div></div></button>)}
      <div className="text-[11px] text-slate-500 border-t pt-1 dark:border-slate-700">+ Gemüse: {plan.sideFill[i%plan.sideFill.length]?.name}</div></Card>)}</div>
    <p className="text-xs text-slate-500">Linzer Wochenplaner ({plan.poolN} gerankten Mahlzeiten inkl. leichter Gerichte): Der Plan wird automatisch nach Protein/€ und Health-Score/PLI gewählt; jedes Gericht kommt höchstens 2× pro Woche vor und nie an zwei Tagen hintereinander. Nur aktuelle Preise 2026. Gemüse-Vorschläge stammen von shop.billa.at. Das ist ein Vorschlag, keine Ernährungsberatung.</p></>}
  </div>
}

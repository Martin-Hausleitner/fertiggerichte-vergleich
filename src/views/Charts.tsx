import { isRowRankable, rowP100k } from '../app/meal'
import { ChartContainer } from '../components/ui/chart'
import { RowSummary } from '../components/product'
import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ScatterChart, Scatter, ZAxis, Legend, Cell } from 'recharts'
import { Card, Select } from '../components/ui'
import { fmt, useApp, scoreColor } from '../lib'
const COLORS:Record<string,string>={Billa:'#eab308',Spar:'#16a34a',Hofer:'#2563eb',Lidl:'#0ea5e9',dm:'#db2777','Fit to Go':'#7c3aed',Penny:'#dc2626'}
export function ScatterView(){
  const {R,D,open}=useApp()
  const [mode,setMode]=useState<'price'|'kcal'>('price')
  const groups=useMemo(()=>{const g:Record<string,any[]>={};R.filter(r=>isRowRankable(r)&&r.protpack!=null&&(mode==='price'?r.price&&r.pstat==='live 2026':r.kcalpack)).forEach(r=>{(g[r.store]??=[]).push({x:mode==='price'?r.price:r.kcalpack,y:r.protpack,z:r.score??20,id:r.id,name:r.name,score:r.score})});return g},[R,mode])
  const Tip=({active,payload}:any)=>{const id=payload?.[0]?.payload?.id;const rr=id!=null?D.rows.find((x:any)=>x.id===id):null;return active&&rr?<Card className="p-3 shadow-2xl"><RowSummary r={rr}/></Card>:null}
  return <Card className="p-3"><div className="flex flex-wrap items-center justify-between gap-2 mb-2"><h4 className="font-semibold">{mode==='price'?'Preis vs. Protein pro Packung':'kcal vs. Protein pro Packung'}</h4>
    <Select value={mode} onChange={e=>setMode(e.target.value as any)}><option value="price">Preis vs. Protein</option><option value="kcal">kcal vs. Protein</option></Select></div>
    <p className="text-xs text-slate-500 mb-2">Ein Punkt ist ein Produkt; je größer der Punkt, desto höher der Health-Score. Oben links liegt das beste Verhältnis. Nur vollständige Daten, ohne Trocken- und Großpackungen{mode==='price'?', nur Preise 2026':''}.</p>
    <ChartContainer config={{}} className="aspect-auto w-full" style={{height:460}}><ScatterChart margin={{left:-10,right:10}}><CartesianGrid strokeDasharray="3 3" opacity={.3}/>
      <XAxis type="number" dataKey="x" name={mode==='price'?'Preis €':'kcal'} unit={mode==='price'?' €':''} tick={{fontSize:11}}/><YAxis type="number" dataKey="y" name="Protein" unit=" g" tick={{fontSize:11}}/><ZAxis dataKey="z" range={[20,160]}/>
      <Tooltip content={<Tip/>}/><Legend/>
      {Object.entries(groups).map(([s,d])=><Scatter key={s} name={s} data={d} fill={COLORS[s]??'#64748b'} fillOpacity={.7} onClick={(p:any)=>open(p.id??p.payload?.id)} cursor="pointer"/>)}
    </ScatterChart></ChartContainer></Card>
}
export function StoreCompare(){
  const {R}=useApp()
  const data=useMemo(()=>{const g:Record<string,any[]>={};R.filter(r=>isRowRankable(r)).forEach(r=>(g[r.store]??=[]).push(r));const md=(a:number[])=>{a=a.filter(v=>v!=null).sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:null}
    return Object.entries(g).filter(([,v])=>v.length>=5).map(([s,v])=>({store:s,n:v.length,score:md(v.map(r=>r.score)),p100k:md(v.map(r=>rowP100k(r)) as number[]),salt:md(v.map(r=>r.salt)),ppe:md(v.filter(r=>r.pstat==='live 2026').map(r=>r.ppe)),price:md(v.filter(r=>r.pstat==='live 2026').map(r=>r.price))})).sort((a,b)=>(b.score??0)-(a.score??0))},[R])
  return <div className="space-y-3"><div className="grid gap-3 md:grid-cols-2">{([['score','Health-Score (Median)'],['ppe','Protein pro € (Median)'],['p100k','Protein/100 kcal'],['price','Preis pro Packung € (Median)']] as const).map(([k,t])=><Card key={k} className="p-3"><h4 className="text-sm font-semibold mb-1">{t}</h4><ChartContainer config={{}} className="aspect-auto w-full" style={{height:210}}><BarChart data={data} margin={{left:-20}}><CartesianGrid strokeDasharray="3 3" opacity={.3}/><XAxis dataKey="store" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Bar dataKey={k} radius={[6,6,0,0]}>{data.map(d=><Cell key={d.store} fill={COLORS[d.store]??'#64748b'}/>)}</Bar></BarChart></ChartContainer></Card>)}</div>
    <Card className="p-3 overflow-x-auto"><table className="text-sm w-full"><thead><tr className="text-left border-b dark:border-slate-700">{['Laden','n (vollständig)','Score','Prot./100kcal','Salz','Protein/€','Preis'].map(h=><th key={h} className="p-1.5">{h}</th>)}</tr></thead><tbody>{data.map(d=><tr key={d.store} className="border-b dark:border-slate-800"><td className="p-1.5 font-medium">{d.store}</td><td>{d.n}</td><td><span style={{color:scoreColor(d.score)}} className="font-semibold">{fmt(d.score,0)}</span></td><td>{fmt(d.p100k)}</td><td>{fmt(d.salt,2)}</td><td>{fmt(d.ppe)}</td><td>{fmt(d.price,2)} €</td></tr>)}</tbody></table>
    <p className="text-xs text-slate-500 mt-2">Mediane nur über Produkte mit vollständigen Nährwerten; Läden mit weniger als 5 solchen Produkten sind nicht dabei.</p></Card></div>
}

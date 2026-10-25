import { isRowRankable, rowP100k, rowPli } from '../app/meal'
import { ChartContainer } from '../components/ui/chart'
import { RowSummary } from '../components/product'
import AnalyseExt from './AnalyseExt'
import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ScatterChart, Scatter, ZAxis, Line, ComposedChart, Legend } from 'recharts'
import { Card } from '../components/ui'
import { BrandLogo } from '../components/product'
import { useApp, fmt, scoreColor, type Row } from '../lib'
const q=(a:number[],p:number)=>{const s=[...a].sort((x,y)=>x-y);const i=(s.length-1)*p,lo=Math.floor(i);return s.length?s[lo]+(s[Math.min(lo+1,s.length-1)]-s[lo])*(i-lo):0}
function Box({title,groups,unit}:{title:string;groups:Record<string,number[]>;unit:string}){
  const data=Object.entries(groups).filter(([,v])=>v.length>=5).map(([k,v])=>({k,n:v.length,min:q(v,.05),q1:q(v,.25),med:q(v,.5),q3:q(v,.75),max:q(v,.95)})).sort((a,b)=>a.med-b.med)
  const mx=Math.max(...data.map(d=>d.max),1)
  return <Card className="p-3"><h4 className="font-semibold text-sm mb-2">{title}</h4><div className="space-y-1.5">{data.map(d=><div key={d.k} className="flex items-center gap-2 text-xs"><span className="w-28 truncate">{d.k} <span className="text-slate-400">({d.n})</span></span><div className="relative h-5 flex-1"><div className="absolute top-1/2 h-px bg-slate-400" style={{left:`${d.min/mx*100}%`,width:`${(d.max-d.min)/mx*100}%`}}/><div className="absolute top-0.5 h-4 rounded bg-emerald-500/30 border border-emerald-600" style={{left:`${d.q1/mx*100}%`,width:`${Math.max((d.q3-d.q1)/mx*100,.5)}%`}}/><div className="absolute top-0 h-5 w-0.5 bg-emerald-800" style={{left:`${d.med/mx*100}%`}}/></div><span className="w-16 text-right tabular-nums">{fmt(d.med,2)} {unit}</span></div>)}</div><p className="text-[10px] text-slate-500 mt-2">Box = 25.–75. Perzentil, Strich = Median, Linie = 5.–95. Perzentil. Gruppen mit weniger als 5 Produkten fehlen.</p></Card>
}
function Pareto({R}:{R:Row[]}){
  const {open,D}=useApp()
  const pts=R.filter(r=>isRowRankable(r)&&r.eur10p!=null&&r.pstat==='live 2026'&&r.score!=null&&r.eur10p<5).map(r=>({x:r.eur10p!,y:r.score!,id:r.id,name:r.name,store:r.store}))
  const front=[...pts].sort((a,b)=>a.x-b.x).reduce<any[]>((acc,p)=>{if(!acc.length||p.y>acc[acc.length-1].y)acc.push(p);return acc},[])
  return <Card className="p-3"><h4 className="font-semibold text-sm">Pareto-Front: Health-Score vs. € pro 10 g Protein</h4><p className="text-xs text-slate-500 mb-2">Grüne Linie = Produkte, die von keinem anderen gleichzeitig billiger <i>und</i> gesünder geschlagen werden. Punkt anklicken öffnet die Details.</p>
    <ChartContainer config={{}} className="aspect-auto w-full" style={{height:380}}><ComposedChart margin={{left:-10}}><CartesianGrid strokeDasharray="3 3" opacity={.3}/><XAxis type="number" dataKey="x" name="€/10 g Protein" unit=" €" domain={[0,'auto']} tick={{fontSize:11}}/><YAxis type="number" dataKey="y" name="Score" domain={[0,100]} tick={{fontSize:11}}/><ZAxis range={[30,30]}/>
      <Tooltip formatter={(v:any)=>fmt(v,2)} labelFormatter={()=>''} content={({payload}:any)=>{const id=payload?.[0]?.payload?.id;const rr=id!=null?D.rows.find((x:any)=>x.id===id):null;return rr?<Card className="p-3 shadow-2xl"><RowSummary r={rr}/></Card>:null}}/>
      <Scatter data={pts} fill="#94a3b8" fillOpacity={.6} onClick={(p:any)=>open(p.id??p.payload?.id)} cursor="pointer"/>
      <Line data={front} dataKey="y" type="stepAfter" stroke="#16a34a" strokeWidth={2} dot={{r:4,fill:'#16a34a'}} isAnimationActive={false}/></ComposedChart></ChartContainer>
    <div className="flex flex-wrap gap-1 mt-2">{front.map(p=><button key={p.id} onClick={()=>open(p.id)} className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[11px] hover:bg-emerald-200">{p.name.slice(0,30)} · {fmt(p.x,2)} €</button>)}</div></Card>
}
function Heat({R,cats,keyF,title}:{R:Row[];cats:string[];keyF:'cprot'|'cdish';title:string}){
  const stores=['Billa','Spar','Hofer','Lidl','dm','Fit to Go']
  const cell=(s:string,c:string)=>{const rs=R.filter(r=>r.store===s&&isRowRankable(r)&&(r[keyF]||[]).includes(c));const v=rs.map(r=>r.score!).sort((a,b)=>a-b);return {n:rs.length,med:v.length?v[Math.floor(v.length/2)]:null}}
  return <Card className="p-3 overflow-x-auto"><h4 className="font-semibold text-sm mb-2">{title}</h4><table className="text-xs"><thead><tr><th/>{stores.map(s=><th key={s} className="px-2 py-1">{s}</th>)}</tr></thead><tbody>{cats.map(c=><tr key={c}><td className="pr-2 py-0.5 whitespace-nowrap">{c}</td>{stores.map(s=>{const x=cell(s,c);return <td key={s} className="px-0.5"><div className="w-16 h-8 rounded flex flex-col items-center justify-center text-white" style={{background:x.med==null?'#e2e8f0':scoreColor(x.med),opacity:x.med==null?.5:Math.min(.45+x.n/15,1)}}>{x.med!=null&&<><b>{Math.round(x.med)}</b><span className="text-[9px]">n={x.n}</span></>}</div></td>})}</tr>)}</tbody></table><p className="text-[10px] text-slate-500 mt-1">Farbe = Median Health-Score, Deckkraft = Anzahl der Produkte.</p></Card>
}
function BrandRank({R}:{R:Row[]}){
  const data=useMemo(()=>{const g:Record<string,Row[]>={};R.filter(r=>isRowRankable(r)&&r.eur10p!=null&&r.pstat==='live 2026').forEach(r=>(g[r.brandN]??=[]).push(r));return Object.entries(g).filter(([,v])=>v.length>=3).map(([b,v])=>({b,logo:v.find(r=>r.logo)?.logo??null,n:v.length,eur:q(v.map(r=>r.eur10p!),.5),score:q(v.map(r=>r.score!),.5)})).sort((a,b)=>a.eur-b.eur).slice(0,20)},[R])
  const mx=Math.max(...data.map(d=>d.eur))
  return <Card className="p-3"><h4 className="font-semibold text-sm mb-2">Marken-Ranking: Median € pro 10 g Protein (ab 3 Produkten)</h4><div className="space-y-1">{data.map((d,i)=><div key={d.b} className="flex items-center gap-2 text-xs"><span className="w-5 text-slate-400">{i+1}</span><BrandLogo r={{brandN:d.b,logo:d.logo}} size={22}/><span className="w-32 truncate">{d.b}</span><div className="flex-1 h-4 rounded bg-slate-100 dark:bg-slate-800"><div className="h-full rounded" style={{width:`${d.eur/mx*100}%`,background:scoreColor(d.score)}}/></div><span className="w-24 text-right">{fmt(d.eur,2)} € · ♥{fmt(d.score,0)}</span></div>)}</div><p className="text-[10px] text-slate-500 mt-1">Balkenfarbe = Median Health-Score der Marke</p></Card>
}
function External(){
  const [files,setFiles]=useState<Record<string,any>>({})
  useEffect(()=>{['brands','chains_categories','producers_nutrients'].forEach(f=>fetch(`./analysis/${f}.json`).then(r=>r.ok?r.json():null).then(d=>d&&setFiles(o=>({...o,[f]:d}))).catch(()=>{}));
    ['brands','chains_categories','producers_nutrients'].forEach(f=>fetch(`./analysis/${f}_insights_de.md`).then(r=>r.ok?r.text():null).then(t=>t&&!t.startsWith('<!')&&setFiles(o=>({...o,[f+'_md']:t}))).catch(()=>{}))},[])
  const ks=Object.keys(files); if(!ks.length) return null
  const toArr=(d:any):any[]=>Array.isArray(d)?d:Object.values(d).find(Array.isArray) as any[]??[]
  return <div className="space-y-3"><h3 className="font-semibold text-lg">Detailanalysen</h3>{ks.filter(k=>k.endsWith('_md')).map(k=><Card key={k} className="p-3 text-sm whitespace-pre-line">{files[k]}</Card>)}
    {ks.filter(k=>!k.endsWith('_md')).map(k=>{const arr=toArr(files[k]).filter(x=>x&&typeof x==='object');if(!arr.length)return null;const lab=Object.keys(arr[0]).find(f=>typeof arr[0][f]==='string')!;const nums=Object.keys(arr[0]).filter(f=>typeof arr[0][f]==='number').slice(0,3)
      return <Card key={k} className="p-3"><h4 className="font-semibold text-sm mb-1">{k}</h4><ChartContainer config={{}} className="aspect-auto w-full" style={{height:300}}><BarChart data={arr.slice(0,25)} margin={{left:-10}}><CartesianGrid strokeDasharray="3 3" opacity={.3}/><XAxis dataKey={lab} tick={{fontSize:9}} angle={-30} textAnchor="end" height={70} interval={0}/><YAxis tick={{fontSize:10}}/><Tooltip/><Legend/>{nums.map((n,i)=><Bar key={n} dataKey={n} fill={['#1b6e3a','#6366f1','#f59e0b'][i]}/>)}</BarChart></ChartContainer></Card>})}</div>
}
export default function Analyse(){
  const {R,D}=useApp()
  const valOf=(r:Row,f:keyof Row)=>(f==='p100k'?rowP100k(r):f==='pli'?rowPli(r):r[f]) as number|null
  const byStore=(f:keyof Row)=>{const g:Record<string,number[]>={};R.filter(r=>isRowRankable(r)&&valOf(r,f)!=null&&r.pstat==='live 2026').forEach(r=>(g[r.store]??=[]).push(valOf(r,f)!));return g}
  const byPack=(f:keyof Row)=>{const g:Record<string,number[]>={};R.filter(r=>isRowRankable(r)&&valOf(r,f)!=null).forEach(r=>(g[r.pack.replace(/ \(.*\)/,'')]??=[]).push(valOf(r,f)!));return g}
  const catBar=useMemo(()=>[...D.catProt].map(c=>{const rs=R.filter(r=>isRowRankable(r)&&r.cprot?.includes(c)&&r.eur10p!=null&&r.pstat==='live 2026');return {c:`${D.catIcon[c]??''} ${c}`,n:rs.length,eur:rs.length?q(rs.map(r=>r.eur10p!),.5):null,score:rs.length?q(rs.map(r=>r.score!),.5):null}}).filter(x=>x.n>=3).sort((a,b)=>a.eur!-b.eur!),[R,D])
  return <div className="space-y-3">
    <div className="grid gap-3 lg:grid-cols-2"><Pareto R={R}/><BrandRank R={R}/></div>
    <div className="grid gap-3 lg:grid-cols-2"><Box title="€ pro 10 g Protein je Laden" groups={byStore('eur10p')} unit="€"/><Box title="Health-Score je Verpackung" groups={byPack('score')} unit=""/><Box title="Salz g/100 g je Verpackung" groups={byPack('salt')} unit="g"/><Box title="Health-Score je Laden" groups={byStore('score')} unit=""/></div>
    <Card className="p-3"><h4 className="font-semibold text-sm mb-2">Proteinquelle: Median € pro 10 g Protein und Health-Score</h4><ChartContainer config={{}} className="aspect-auto w-full" style={{height:300}}><BarChart data={catBar} margin={{left:-10}}><CartesianGrid strokeDasharray="3 3" opacity={.3}/><XAxis dataKey="c" tick={{fontSize:10}} angle={-25} textAnchor="end" height={70} interval={0}/><YAxis yAxisId="a" tick={{fontSize:10}}/><YAxis yAxisId="b" orientation="right" domain={[0,100]} tick={{fontSize:10}}/><Tooltip/><Legend/><Bar yAxisId="a" dataKey="eur" name="€/10 g Protein" fill="#059669" radius={[4,4,0,0]}/><Bar yAxisId="b" dataKey="score" name="Health-Score" fill="#6366f1" radius={[4,4,0,0]}/></BarChart></ChartContainer></Card>
    <div className="grid gap-3 xl:grid-cols-2"><Heat R={R} cats={D.catProt} keyF="cprot" title="Heatmap: Laden × Proteinquelle (Median Health-Score)"/><Heat R={R} cats={D.catDish} keyF="cdish" title="Heatmap: Laden × Gericht"/></div>
    <AnalyseExt/>
  </div>
}

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Card, Badge } from '../components/ui'
import { Markdown } from '../components/md'
import { fmt } from '../lib'
import { PackCompare } from './Charts'
const ICON:Record<string,string>={'Dose':'🥫','Kühlschale/MAP':'🧊','Tiefkühl':'❄️','Sous-vide/Vakuum':'🥩','Glas':'🫙','Trocken/Instant-Beutel':'🍜','Pouch/Retort':'🛍️'}
// Grobe Haltbarkeitsrichtwerte in Tagen (für Zeitstrahl, aus den Quellen/Etiketten typische Spannen)
const LIFE:Record<string,[number,number,string]>={'Kühlschale/MAP':[5,21,'5–21 Tage'],'Sous-vide/Vakuum':[14,42,'2–6 Wochen'],'Tiefkühl':[180,730,'6–24 Monate'],'Trocken/Instant-Beutel':[270,730,'9–24 Monate'],'Pouch/Retort':[270,540,'9–18 Monate'],'Glas':[365,730,'1–2 Jahre'],'Dose':[730,1460,'2–4 Jahre']}
export default function Packaging(){
  const [p,setP]=useState<any>(null),[md,setMd]=useState<string|null>(null),[sel,setSel]=useState(0)
  useEffect(()=>{fetch('./analysis/packaging_v2.json').then(r=>r.ok?r.json():null).then(setP).catch(()=>{});fetch('./analysis/packaging_v2_de.md').then(r=>r.ok?r.text():null).then(t=>t&&!t.startsWith('<!')&&setMd(t)).catch(()=>{})},[])
  if(!p) return <PackCompare/>
  const T=p.types as any[]; const t=T[sel]; const src=(ks:string[]|undefined)=>(ks||[]).map(k=>p.sources[k]?<a key={k} href={p.sources[k]} target="_blank" rel="noreferrer" className="text-[10px] text-brand underline mr-1">[{k}]</a>:<span key={k} className="text-[10px] text-slate-400 mr-1">[{k}]</span>)
  const ch=p.chart; const cdata=ch.labels.map((l:string,i:number)=>({l:`${ICON[l]??''} ${l}`,n:ch.n_products[i],prot:ch.median_protein_100[i],salt:ch.median_salt_100[i],eur:ch.median_price_per_10g_protein[i],score:ch.median_health_score[i]}))
  const life=T.map(x=>({l:x.type,lo:LIFE[x.type]?.[0],hi:LIFE[x.type]?.[1],txt:LIFE[x.type]?.[2]})).filter(x=>x.lo).sort((a,b)=>a.lo-b.lo); const mx=1460
  const F=[['Herstellung','process','src_p'],['Lagerung','storage_temp','src_t'],['Haltbarkeit (ungeöffnet)','mhd_unopened','src_m'],['Nach dem Öffnen','after_opening','src_a'],['Nährstoffe','nutrients','src_n'],['Zusatzstoffe','additives','src_ad'],['Recycling (AT)','recycling_at','src_r'],['BPA / Beschichtung','bpa','src_b'],['Risiko','risk','src_risk'],['Multipot Pro','instantpot','src_ip'],['Mikrowelle','microwave','src_mw']]
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-1">{T.map((x,i)=><button key={x.type} onClick={()=>setSel(i)} className={'rounded-xl border px-3 py-2 text-sm '+(i===sel?'bg-brand text-white border-brand':'bg-white dark:bg-slate-900 dark:border-slate-700')}>{ICON[x.type]} {x.type} <span className="opacity-70 text-xs">({ch.n_products[i]})</span></button>)}</div>
    <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
      <Card className="p-4 space-y-2"><h3 className="text-lg font-bold">{ICON[t.type]} {t.type} <span className="text-xs font-normal text-slate-500">im Datensatz: {t.dataset_label}</span></h3>
        {F.map(([l,k,s])=>t[k]?<div key={k} className="grid sm:grid-cols-[150px_1fr] gap-1 border-b pb-1.5 text-sm dark:border-slate-800"><div className="font-medium text-slate-500">{l}</div><div>{String(t[k])} {src(t[s])}</div></div>:null)}
        {t.stats&&<div className="flex flex-wrap gap-1 pt-1">{Object.entries(t.stats).slice(0,8).map(([k,v]:any)=><Badge key={k} className="bg-slate-100 dark:bg-slate-800">{k}: {typeof v==='number'?fmt(v,2):String(v)}</Badge>)}</div>}
        {t.label_evidence&&<details className="text-xs"><summary className="cursor-pointer text-slate-500">Echte Lagerhinweise von Etiketten</summary><pre className="whitespace-pre-wrap text-[11px]">{JSON.stringify(t.label_evidence,null,1).slice(0,1500)}</pre></details>}</Card>
      <div className="space-y-3"><Card className="p-3"><h4 className="font-semibold text-sm mb-2">Haltbarkeit ungeöffnet (typische Spanne, Richtwert)</h4>{life.map(x=><div key={x.l} className="flex items-center gap-2 text-xs mb-1.5"><span className="w-32 truncate">{ICON[x.l]} {x.l}</span><div className="relative flex-1 h-4 rounded bg-slate-100 dark:bg-slate-800"><div className="absolute h-full rounded bg-gradient-to-r from-sky-400 to-brand" style={{left:`${Math.sqrt(x.lo/mx)*100}%`,width:`${(Math.sqrt(x.hi/mx)-Math.sqrt(x.lo/mx))*100}%`}}/></div><span className="w-20 text-right">{x.txt}</span></div>)}<div className="flex justify-between text-[10px] text-slate-400 pl-32"><span>Tage</span><span>Wochen</span><span>Monate</span><span>Jahre</span></div><p className="text-[10px] text-slate-500 mt-1">Wurzel-Skala. Echte MHD-Angaben stehen nicht in den Shopdaten; die Spannen sind typische Branchenwerte, maßgeblich ist das MHD auf der Packung.</p></Card>
        <Card className="p-3"><h4 className="font-semibold text-sm mb-1">Mediane je Verpackung</h4><ResponsiveContainer width="100%" height={240}><BarChart data={cdata} margin={{left:-20}}><CartesianGrid strokeDasharray="3 3" opacity={.3}/><XAxis dataKey="l" tick={{fontSize:9}} angle={-25} textAnchor="end" height={70} interval={0}/><YAxis tick={{fontSize:10}}/><Tooltip/><Legend wrapperStyle={{fontSize:10}}/><Bar dataKey="score" name="Health-Score" fill="#1b6e3a"/><Bar dataKey="prot" name="Protein/100g" fill="#059669"/></BarChart></ResponsiveContainer>
          <ResponsiveContainer width="100%" height={200}><BarChart data={cdata} margin={{left:-20}}><CartesianGrid strokeDasharray="3 3" opacity={.3}/><XAxis dataKey="l" tick={{fontSize:9}} angle={-25} textAnchor="end" height={70} interval={0}/><YAxis tick={{fontSize:10}}/><Tooltip/><Legend wrapperStyle={{fontSize:10}}/><Bar dataKey="eur" name="€/10 g Protein" fill="#6366f1"/><Bar dataKey="salt" name="Salz g/100g" fill="#dc2626"/></BarChart></ResponsiveContainer></Card></div></div>
    {md&&<Card className="p-4"><details><summary className="cursor-pointer font-semibold">Vollständiger Bericht mit Quellen</summary><Markdown text={md}/></details></Card>}
    <PackCompare/>
  </div>
}

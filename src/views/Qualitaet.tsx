import { useEffect, useState } from 'react'
import { ShieldCheck, ExternalLink, AlertTriangle } from 'lucide-react'
import { Card, Badge } from '../components/ui'
import { cn } from '../lib'
type F={value:any;sources:string[];confidence:string}
type P={slug:string;name:string;plant:string;quality_score:number;potential_score:number;score_breakdown:Record<string,number>;technology:F;machines:F;ifs:F;brc:F;other_certs:F;sourcing:F;recalls:F;notes?:string}
const MAX:Record<string,number>={zertifizierung:35,zusatz_siegel:10,herkunft:25,technologie_transparenz:15,rueckrufe:15}
const LBL:Record<string,string>={zertifizierung:'Zertifizierung',zusatz_siegel:'Siegel',herkunft:'Herkunft',technologie_transparenz:'Technik-Transparenz',rueckrufe:'Rückrufe'}
const Conf=({c}:{c:string})=><span className={cn('text-[10px] rounded-full px-1.5',c==='high'?'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200':c==='medium'?'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200':'bg-muted text-muted-foreground')}>{c==='high'?'sicher':c==='medium'?'mittel':c==='low'?'unsicher':'nicht gefunden'}</span>
const Src=({s}:{s:string[]})=><>{s.slice(0,3).map((u,i)=><a key={i} href={u} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink size={11} className="inline"/></a>)}</>
function cert(p:P){const i=p.ifs.value||p.brc.value;return i?`${i.standard}${i.level||i.grade?' · '+(i.level||i.grade):''}`:'kein Nachweis gefunden'}
export default function Qualitaet(){
  const [d,setD]=useState<{producers:P[];method_de:Record<string,string>;note_de:string}|null>(null),[open,setOpen]=useState<string|null>(null)
  useEffect(()=>{fetch('./analysis/producer_quality.json?v='+__BUILD__).then(r=>r.json()).then(setD).catch(()=>{})},[])
  if(!d) return <Card className="p-10 text-center text-muted-foreground">Lädt…</Card>
  return <div className="space-y-4 max-w-5xl">
    <div><h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><ShieldCheck size={22}/>Hersteller-Qualität</h2>
    <p className="text-sm text-muted-foreground mt-1">Score 0–100 aus belegten Angaben: Zertifizierung, Siegel, Rohstoff-Herkunft, Technik-Transparenz, Rückrufe. „Potenzial“ = Obergrenze, wenn unbekannte Felder bestmöglich ausfallen.</p></div>
    <Card className="divide-y divide-border/70">{d.producers.map((p,k)=><div key={p.slug}>
      <button onClick={()=>setOpen(open===p.slug?null:p.slug)} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/40">
        <span className="w-6 text-muted-foreground tabular-nums text-sm">{k+1}</span>
        <div className="flex-1 min-w-0"><div className="font-semibold truncate">{p.name}</div><div className="text-xs text-muted-foreground truncate">{p.plant} · {cert(p)}</div></div>
        {p.recalls.value?.length>0&&<Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"><AlertTriangle size={11}/>Rückruf</Badge>}
        <div className="w-40 hidden sm:block"><div className="h-2 rounded-full bg-muted relative overflow-hidden"><div className="absolute inset-y-0 left-0 bg-foreground/15" style={{width:p.potential_score+'%'}}/><div className="absolute inset-y-0 left-0 bg-foreground" style={{width:p.quality_score+'%'}}/></div></div>
        <div className="text-right w-16"><div className="text-lg font-extrabold tabular-nums">{p.quality_score}</div><div className="text-[10px] text-muted-foreground">Pot. {p.potential_score}</div></div>
      </button>
      {open===p.slug&&<div className="px-4 pb-4 pl-13 grid sm:grid-cols-2 gap-3 text-sm">
        <div className="sm:col-span-2 flex flex-wrap gap-2">{Object.entries(p.score_breakdown).map(([k,v])=><Badge key={k} className="bg-muted">{LBL[k]} {v}/{MAX[k]}</Badge>)}</div>
        {([['Technik',p.technology],['Maschinen',p.machines],['IFS',p.ifs],['BRCGS',p.brc],['Weitere Zertifikate',p.other_certs],['Rohstoffe/Herkunft',p.sourcing],['Rückrufe',p.recalls]] as [string,F][]).map(([l,f])=><div key={l}>
          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">{l}<Conf c={f.confidence}/><Src s={f.sources}/></div>
          <div className="mt-0.5">{f.value==null?<span className="italic text-muted-foreground">nicht gefunden</span>:Array.isArray(f.value)?(f.value.length?<ul className="list-disc ml-4">{f.value.map((x:any,i:number)=><li key={i}>{typeof x==='string'?x:`${x.date}: ${x.product} – ${x.reason}`}</li>)}</ul>:<span className="text-muted-foreground">keine gefunden</span>):typeof f.value==='object'?Object.entries(f.value).map(([a,b])=>`${a}: ${b}`).join(' · '):String(f.value)}</div></div>)}
        {p.notes&&<div className="sm:col-span-2 text-xs text-muted-foreground">{p.notes}</div>}
      </div>}
    </div>)}</Card>
    <Card className="p-4 text-xs text-muted-foreground space-y-1"><div className="font-semibold text-foreground">Kriterien</div>{Object.entries(d.method_de).map(([k,v])=><div key={k}><b>{k}</b>: {v}</div>)}<div className="pt-1">{d.note_de}</div></Card>
  </div>
}

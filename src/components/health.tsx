import { ChartContainer } from './ui/chart'
import { useEffect, useState } from 'react'
import { Beef, Wheat, Carrot, Droplets, Factory, Leaf, Info, FlaskConical, ShieldCheck, Sprout, MapPin } from 'lucide-react'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend, Tooltip } from 'recharts'
import { InfoTip, Flag } from './info'
import { Badge } from './ui'
import { cn, fmt, type Row } from '../lib'

export const HK:Record<string,string>={
 bd:'So setzt sich der Health-Score zusammen: Basis 30 Punkte, grüne Balken sind Bonuspunkte, rote Balken Abzüge. Das Ergebnis wird auf 0–100 begrenzt.',
 prot:'Protein-Bonus: bis +40 Punkte. Volle Punkte ab 10 g Protein pro 100 kcal.',
 fib:'Ballaststoff-Bonus: bis +15 Punkte, volle Punkte ab 6 g pro 100 g. Fehlt der Wert, gibt es 0 Punkte (kein Abzug).',
 veg:'+5 Punkte, wenn Gemüse oder Hülsenfrüchte im Namen stehen (z. B. Linsen, Bohnen, Chili, Curry).',
 salt:'Salz-Abzug: ab 0,6 g pro 100 g, maximal −20 Punkte bei 2 g.',
 sat:'Abzug für gesättigte Fettsäuren: ab 1,5 g pro 100 g, maximal −15 Punkte bei 6 g.',
 proc:'Verarbeitungs-Abzug (NOVA-ähnlich, aus der Verpackungsart geschätzt): Dose, Trocken/Instant und Pouch −10, Kühlregal, TK und Glas −5, Sous-vide 0.',
 tl:'Ampel nach den UK-FSA-Grenzwerten pro 100 g. Grün: Salz ≤ 0,3 g, Zucker ≤ 5 g, gesättigte Fette ≤ 1,5 g, Fett ≤ 3 g. Rot: Salz > 1,5 g, Zucker > 22,5 g, ges. Fette > 5 g, Fett > 17,5 g. % RI = Anteil an der Referenzmenge für Erwachsene pro Portion (Salz 6 g, Zucker 90 g, ges. Fett 20 g, Fett 70 g, Energie 2000 kcal, Protein 50 g).',
 radar:'Gericht im Vergleich zum Median seiner Fertigstufe. Alle Achsen sind auf 0–100 normiert, außen ist immer besser: weniger Salz, Zucker und gesättigte Fette gelten als besser.',
 nova:'NOVA-Gruppe laut Open Food Facts: 1 = unverarbeitet, 4 = hochverarbeitet. Nur vorhanden, wenn das Produkt dort mit EAN erfasst ist.',
 add:'Zusatzstoffe (E-Nummern) laut Zutatenliste auf Open Food Facts.',
 ns:'Nutri-Score laut Händler oder Open Food Facts (A = am besten, E = am schlechtesten). Bei vielen Produkten nicht angegeben.',
}
const NOVA:Record<string,number>={'Dose/Konserve':4,'Trocken/Instant':4,'Beutel ungekühlt (Retort-Pouch)':4,'Tiefkühl (TK)':3.5,'Kühlregal (Menüschale/frisch)':3.5,'Glas':3.5,'Sous-vide (vakuum)':3,'Unklar (keine Lagerangabe)':3.5}
const RAW=/ripperl|spieß|spiess|filet|marinier|roh|natur\b/i
const VEG=/gemüse|linsen|bohnen|kichererb|spinat|brokkoli|curry|chili|erbsen|paprika|kürbis/i
export type BD={base:number;prot:number;fib:number;veg:number;salt:number;sat:number;proc:number;total:number;missing:string[]}
export function breakdown(r:Row):BD|null{
  if(r.p100==null||r.kcal==null||r.kcal<=0) return null
  const pd=r.p100/r.kcal*100, prot=Math.min(pd/10,1)*40
  const salt=r.salt==null?0:-Math.min(Math.max(r.salt-0.6,0)/1.4,1)*20
  const sat=r.sat==null?0:-Math.min(Math.max(r.sat-1.5,0)/4.5,1)*15
  const fib=r.fib==null?0:Math.min(r.fib/6,1)*15, veg=VEG.test(r.name)?5:0
  let nova=NOVA[r.pack]??3.5; if(RAW.test(r.name)&&r.pack!=='Dose/Konserve') nova=Math.min(nova,3)
  const proc=-(nova-3)*10, raw=30+prot+salt+sat+fib+veg+proc
  const missing=[r.salt==null&&'Salz',r.sat==null&&'ges. Fett',r.fib==null&&'Ballaststoffe'].filter(Boolean) as string[]
  return {base:30,prot,fib,veg,salt,sat,proc,total:Math.max(0,Math.min(100,raw)),missing}
}
export const PARTS:[keyof BD,string,any,string,string][]=[['prot','Protein',Beef,'#059669','prot'],['fib','Ballaststoffe',Wheat,'#65a30d','fib'],['veg','Gemüse/Hülsenfr.',Carrot,'#84cc16','veg'],['salt','Salz',Droplets,'#dc2626','salt'],['sat','Ges. Fette',Droplets,'#f97316','sat'],['proc','Verarbeitung',Factory,'#a855f7','proc']]
export function ScoreWaterfall({r,compact}:{r:Row;compact?:boolean}){
  const b=breakdown(r)
  if(!b) return <Missing text="Kein Health-Score: Protein oder Energie fehlen in der Quelle."/>
  const W=(v:number)=>Math.abs(v)/100*100
  return <div className="space-y-1.5">
    <div className="flex items-center justify-between text-xs"><InfoTip text={HK.bd}><span className="font-semibold">🧮 Score-Aufschlüsselung</span></InfoTip><span className="font-bold text-base tabular-nums">{fmt(b.total,0)}<span className="text-xs text-slate-400">/100</span></span></div>
    <div className="flex h-5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 text-[10px] text-white font-semibold">
      <div style={{width:W(30)+'%'}} className="bg-slate-400 flex items-center justify-center">30</div>
      {PARTS.filter(p=>(b[p[0]] as number)>0).map(p=><div key={p[0]} title={p[1]} style={{width:W(b[p[0]] as number)+'%',background:p[3]}} className="flex items-center justify-center">{(b[p[0]] as number)>=4?'+'+fmt(b[p[0]] as number,0):''}</div>)}
    </div>
    {!compact&&<div className="grid grid-cols-2 sm:grid-cols-3 gap-1">{PARTS.map(([k,l,I,c,t])=>{const v=b[k] as number;return <div key={k} className="flex items-center gap-1.5 rounded-lg px-2 py-1 bg-slate-50 dark:bg-slate-800/60 text-xs"><I size={13} style={{color:c}}/><InfoTip text={HK[t]}><span className="text-slate-600 dark:text-slate-300">{l}</span></InfoTip><span className={cn('ml-auto font-semibold tabular-nums',v>0?'text-emerald-600':v<0?'text-red-600':'text-slate-400')}>{v>0?'+':''}{fmt(v,1)}</span></div>})}</div>}
    {b.missing.length>0&&<div className="text-[11px] text-amber-700 dark:text-amber-400">⚠️ Fehlt in der Quelle: {b.missing.join(', ')}, zählt mit 0 Punkten.</div>}
  </div>
}
export function Missing({text}:{text:string}){return <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-2 py-1.5 text-xs text-slate-500 flex items-center gap-1.5"><Info size={13}/>{text}</div>}
const TL:Record<string,[number,number,number,string,string]>={salt:[0.3,1.5,6,'🧂','Salz'],sugar:[5,22.5,90,'🍬','Zucker'],sat:[1.5,5,20,'🧈','Ges. Fett'],fat:[3,17.5,70,'🫒','Fett']}
export const tlColor=(k:string,v:number|null)=>v==null?'bg-slate-300 dark:bg-slate-700':v<=TL[k][0]?'bg-emerald-500':v>TL[k][1]?'bg-red-500':'bg-amber-400'
export function TrafficLights({r}:{r:Row}){
  const por=r.portion??r.size
  return <div><InfoTip text={HK.tl}><span className="text-xs font-semibold">🚦 Ampel pro 100 g · % Tagesbedarf pro Portion{por?` (${fmt(por,0)} g)`:''}</span></InfoTip>
   <div className="grid grid-cols-4 gap-1.5 mt-1">{Object.entries(TL).map(([k,[,,ri,e,l]])=>{const v=(r as any)[k] as number|null;const pct=v!=null&&por?v*por/100/ri*100:null
    return <div key={k} className={cn('rounded-xl p-1.5 text-center text-white shadow-sm',tlColor(k,v))}><div className="text-base leading-none">{e}</div><div className="text-[10px] opacity-90">{l}</div><div className="font-bold text-sm tabular-nums">{v==null?'k. A.':fmt(v,1)+' g'}</div><div className="text-[10px] font-semibold bg-black/15 rounded-full">{pct==null?'– % RI':fmt(pct,0)+' % RI'}</div></div>})}</div></div>
}
// normalized 0..100, higher better
export const AX:[string,string,(r:Row)=>number|null][]=[['💪 Protein/100kcal','p100k',r=>r.p100k==null?null:Math.min(r.p100k/10,1)*100],['🧂 wenig Salz','salt',r=>r.salt==null?null:Math.max(0,100-r.salt/2*100)],['🧈 wenig ges. Fett','sat',r=>r.sat==null?null:Math.max(0,100-r.sat/6*100)],['🍬 wenig Zucker','sugar',r=>r.sugar==null?null:Math.max(0,100-r.sugar/15*100)],['🌾 Ballaststoffe','fib',r=>r.fib==null?null:Math.min(r.fib/6,1)*100],['💶 Protein/€','ppe',r=>r.ppe==null?null:Math.min(r.ppe/20,1)*100]]
const med=(a:number[])=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)]}
export function RadarVsMedian({r,R}:{r:Row;R:Row[]}){
  const peers=R.filter(x=>x.stage===r.stage&&!x.dry)
  const data=AX.map(([l,,f])=>({a:l,dish:f(r),median:med(peers.map(f).filter((v):v is number=>v!=null))}))
  if(data.filter(d=>d.dish!=null).length<3) return <Missing text="Zu wenige Nährwerte für ein Netzdiagramm."/>
  return <div><InfoTip text={HK.radar}><span className="text-xs font-semibold">🕸️ Profil vs. Median ({peers.length} Gerichte gleicher Fertigstufe)</span></InfoTip>
   <div className="h-60"><ChartContainer config={{}} className="aspect-auto h-full w-full"><RadarChart data={data.map(d=>({...d,dish:d.dish??0}))} outerRadius="70%"><PolarGrid/><PolarAngleAxis dataKey="a" tick={{fontSize:10}}/><Radar name="Median" dataKey="median" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.25}/><Radar name="Dieses Gericht" dataKey="dish" stroke="#059669" fill="#10b981" fillOpacity={0.45}/><Legend wrapperStyle={{fontSize:11}}/><Tooltip formatter={(v:any)=>fmt(v,0)}/></RadarChart></ChartContainer></div>
   {data.some(d=>d.dish==null)&&<div className="text-[11px] text-amber-700">⚠️ Fehlende Achsen (0 gezeichnet): {data.filter(d=>d.dish==null).map(d=>d.a).join(', ')}</div>}</div>
}
export type Off={name:string;store:string|null;ean:string;additives:string[];nova:number|null;ns:string|null;labels:string[];analysis:string[];origins:string|null;mplace:string|null;ingr:string;url:string}
let offP:Promise<Off[]>|null=null
export function useOff(){const [o,setO]=useState<Off[]|null>(null);useEffect(()=>{offP??=fetch('./analysis/health_off.json').then(r=>r.ok?r.json():[]).catch(()=>[]);offP.then(setO)},[]);return o}
export const offFor=(O:Off[]|null,r:Row)=>O?.find(o=>o.name===r.name&&(o.store??null)===(r.store||null))??O?.find(o=>o.name===r.name)??null
export const NOVA_C=['','bg-emerald-500','bg-lime-500','bg-amber-500','bg-red-500']
export const NS_C:Record<string,string>={A:'#038141',B:'#85bb2f',C:'#fecb02',D:'#ee8100',E:'#e63e11'}
export function NutriScore({v}:{v:string|null|undefined}){const g=(v||'').toUpperCase();return <InfoTip text={HK.ns}><span className="inline-flex rounded-md overflow-hidden text-[11px] font-bold">{'ABCDE'.split('').map(l=><span key={l} style={{background:NS_C[l],opacity:l===g?1:.3}} className={cn('px-1.5 py-0.5 text-white',l===g&&'scale-110 px-2')}>{l}</span>)}</span></InfoTip>}
export function QualityBadges({r,off}:{r:Row;off?:Off|null}){
  const L=off?.labels||[], b:[boolean,string,string][]=[
   [r.bio||L.some(l=>/organic|bio/.test(l)),'🌿 Bio','bg-green-600 text-white'],
   [r.vegan||off?.analysis.includes('vegan')||false,'🌱 vegan','bg-lime-600 text-white'],
   [!r.vegan&&(off?.analysis.includes('vegetarian')??false),'🥕 vegetarisch','bg-lime-500 text-white'],
   [L.some(l=>/ama/.test(l)),'🇦🇹 AMA-Gütesiegel','bg-red-600 text-white'],
   [r.ooe,'🏔️ OÖ regional','bg-red-700 text-white'],
   [/österreich/i.test(r.origin||''),'🇦🇹 Herkunft AT','bg-white text-red-700 border border-red-300'],
   [off?.analysis.includes('palm-oil-free')??false,'🌴🚫 palmölfrei','bg-teal-600 text-white'],
  ]
  const on=b.filter(x=>x[0]); return on.length?<div className="flex flex-wrap gap-1">{on.map(x=><Badge key={x[1]} className={x[2]+' shadow-sm'}>{x[1]}</Badge>)}</div>:<span className="text-xs text-slate-400">Keine Gütesiegel in den Daten</span>
}
export function OffPanel({off}:{r?:Row;off:Off|null}){
  if(!off) return <Missing text="Zusatzstoffe & NOVA: Produkt nicht mit EAN auf Open Food Facts erfasst, keine Daten."/>
  return <div className="space-y-1.5 text-xs">
   <div className="flex flex-wrap items-center gap-2"><InfoTip text={HK.nova}><span className="font-semibold flex items-center gap-1"><FlaskConical size={13}/>NOVA</span></InfoTip>{off.nova?<span className={cn('rounded-md px-2 py-0.5 text-white font-bold',NOVA_C[off.nova])}>{off.nova}</span>:<span className="text-slate-400">k. A.</span>}
    <InfoTip text={HK.add}><span className="font-semibold ml-2">🧪 Zusatzstoffe</span></InfoTip>{off.additives.length?off.additives.map(a=><Badge key={a} className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">{a}</Badge>):<Badge className="bg-emerald-100 text-emerald-800">keine gelistet</Badge>}</div>
   {(off.origins||off.mplace)&&<div className="flex items-center gap-1"><MapPin size={12}/>{off.origins&&<>Herkunft: {off.origins} <Flag text={off.origins}/></>} {off.mplace&&<>· Herstellort: {off.mplace} <Flag text={off.mplace}/></>}</div>}
   {off.ingr&&<details><summary className="cursor-pointer text-slate-500">📜 Zutaten</summary><p className="mt-1 text-slate-600 dark:text-slate-300">{off.ingr}</p></details>}
   <a href={off.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">Quelle: Open Food Facts ({off.ean}) ↗</a>
  </div>
}
export function HealthSection({r,R}:{r:Row;R:Row[]}){
  const O=useOff(), off=offFor(O,r)
  return <section className="rounded-2xl p-3 space-y-3 bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-emerald-950/40 dark:to-sky-950/30 border border-emerald-100 dark:border-emerald-900">
   <h3 className="font-semibold flex items-center gap-1.5"><ShieldCheck size={16} className="text-emerald-600"/>🩺 Gesundheit &amp; Qualität {(r.ns||off?.ns)&&<span className="ml-auto"><NutriScore v={r.ns||off?.ns}/></span>}</h3>
   <ScoreWaterfall r={r}/><TrafficLights r={r}/><RadarVsMedian r={r} R={R}/>
   <div><div className="text-xs font-semibold mb-1 flex items-center gap-1"><Sprout size={13}/>Gütesiegel</div><QualityBadges r={r} off={off}/></div>
   <OffPanel r={r} off={off}/>
   <div className="text-xs flex items-center gap-1"><Leaf size={12}/>Herkunft: {r.origin?<>{r.origin} <Flag text={r.origin}/></>:<span className="text-slate-400">Fleisch-/Rohstoffherkunft nicht angegeben</span>}</div>
  </section>
}

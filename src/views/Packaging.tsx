import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell } from 'recharts'
import { Package, Euro, HeartPulse, Scale, Trophy, Snowflake, Recycle, ShieldAlert, Factory, Clock, FlaskConical, Droplets, Store, BookOpen, Tag, Gauge } from 'lucide-react'
import { Card, Badge } from '../components/ui'
import { InfoTip } from '../components/info'
import { Markdown } from '../components/md'
import { fmt, useApp, STORE_LOGO } from '../lib'
const COL:Record<string,string>={'Dose':'#d97706','Kühlschale/MAP':'#0891b2','Tiefkühl':'#2563eb','Pouch/Retort':'#7c3aed','Glas':'#059669','Sous-vide/Vakuum':'#be123c','Trocken/Instant-Beutel':'#a16207'}
const LBL:Record<string,string>={'Dose':'Dose','Kühlschale/MAP':'Kühlschale (z. B. Good Choice)','Tiefkühl':'Tiefkühl (TK)','Pouch/Retort':'Pouch / Retorte','Glas':'Glas','Sous-vide/Vakuum':'Sous-vide','Trocken/Instant-Beutel':'Trockenware / Instant'}
const SUB:Record<string,string>={'Dose':'Sterilisiert, ungekühlt','Kühlschale/MAP':'Schutzgas, +2…+6 °C','Tiefkühl':'−18 °C','Pouch/Retort':'Im Beutel sterilisiert','Glas':'Sterilisiert, ungekühlt','Sous-vide/Vakuum':'Vakuum gegart, gekühlt','Trocken/Instant-Beutel':'Pulver/Trocken, + Wasser'}
const TIP={n:'Anzahl Produkte im Datensatz mit dieser Verpackung (nach neuer Klassifikation).',price:'Median des Packungspreises in Euro.',salt:'Median Salz pro 100 g. Mehr als 1,5 g/100 g gilt als viel.',add:'Median Anzahl Zusatzstoff-Klassen bzw. E-Nummern in der Zutatenliste (nur BILLA-Produkte mit Zutatenliste, n angegeben).',mhd:'Typische Haltbarkeit ungeöffnet. Branchen-Richtwert, kein Messwert aus den Shopdaten – maßgeblich ist das MHD auf der Packung.',after:'Häufigster echter Hinweis „Nach dem Öffnen …“ von BILLA-Etiketten dieser Gruppe.'}
const med=(t:any,k:string)=>t.stats?.[k]
function Kpi({icon:I,label,value,tip,color}:{icon:any;label:string;value:any;tip:string;color?:string}){
  return <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2 min-w-0"><div className="flex items-center gap-1 text-[11px] text-slate-500"><I size={12} style={{color}}/><InfoTip text={tip}><span className="truncate">{label}</span></InfoTip></div><div className="font-bold text-sm tabular-nums truncate">{value??'–'}</div></div>
}
function BoxRow({t,b,max,fmtv}:{t:string;b:number[]|null;max:number;fmtv:(v:number)=>string}){
  const x=(v:number)=>`${Math.min(100,v/max*100)}%`
  return <div className="flex items-center gap-2 text-xs"><span className="w-28 sm:w-40 truncate shrink-0">{LBL[t]}</span><div className="relative flex-1 h-6">{b?<>
    <div className="absolute top-1/2 h-px bg-slate-400" style={{left:x(b[0]),width:`calc(${x(b[4])} - ${x(b[0])})`}}/>
    <div className="absolute top-1 bottom-1 rounded" style={{left:x(b[1]),width:`calc(${x(b[3])} - ${x(b[1])})`,background:COL[t]+'55',border:`1px solid ${COL[t]}`}}/>
    <div className="absolute top-0.5 bottom-0.5 w-0.5 bg-slate-900 dark:bg-white" style={{left:x(b[2])}} title={`Median ${fmtv(b[2])}`}/></>:<span className="text-slate-400 text-[10px]">zu wenige Werte</span>}</div><span className="w-14 text-right tabular-nums shrink-0">{b?fmtv(b[2]):'–'}</span></div>
}
export default function Packaging(){
  const {open}=useApp()
  const [p,setP]=useState<any>(null),[md,setMd]=useState<string|null>(null),[sel,setSel]=useState<string>('Kühlschale/MAP')
  useEffect(()=>{fetch('./analysis/packaging_v2.json').then(r=>r.ok?r.json():null).then(setP).catch(()=>{});fetch('./analysis/packaging_v2_de.md').then(r=>r.ok?r.text():null).then(t=>t&&!t.startsWith('<!')&&setMd(t)).catch(()=>{})},[])
  const T:any[]=p?.types??[]
  const radar=useMemo(()=>{if(!T.length)return []
    const ok=T.filter(t=>med(t,'n_rankable')>=5)
    const ax:[string,(t:any)=>number|null,boolean][]=[['Health',t=>med(t,'median_health_score'),false],['Preis-Leistung',t=>med(t,'median_pli'),false],['Protein/100 g',t=>med(t,'median_protein_100'),false],['wenig Salz',t=>med(t,'median_salt_100'),true],['günstig (€/10 g P.)',t=>med(t,'median_price_per_10g_protein'),true],['Haltbarkeit',t=>t.mhd_typical?.[1],false]]
    return ax.map(([a,f,inv])=>{const vs=ok.map(f).filter((v):v is number=>v!=null),lo=Math.min(...vs),hi=Math.max(...vs);const o:any={a};ok.forEach(t=>{const v=f(t);o[t.type]=v==null?0:Math.round((inv?(hi-v):(v-lo))/((hi-lo)||1)*80+20)});return o})},[p])
  if(!p) return <Card className="p-6 text-sm text-slate-500">Lade Verpackungsdaten …</Card>
  const t=T.find(x=>x.type===sel)??T[0]
  const src=(ks?:string[])=>(ks||[]).map(k=>p.sources[k]?<a key={k} href={p.sources[k]} target="_blank" rel="noreferrer" className="text-[10px] text-brand underline mr-1">[{k}]</a>:<span key={k} className="text-[10px] text-slate-400 mr-1">[{k}]</span>)
  const bars=T.filter(x=>med(x,'n_rankable')>=5).map(x=>({l:x.icon+' '+x.type.split('/')[0],t:x.type,score:med(x,'median_health_score'),pli:med(x,'median_pli'),eur:med(x,'median_price_per_10g_protein'),salt:med(x,'median_salt_100'),prot:med(x,'median_protein_100')}))
  const rtypes=T.filter(x=>med(x,'n_rankable')>=5)
  const lifeMax=1460, sq=(d:number)=>Math.sqrt(d/lifeMax)*100
  const C=p.classification
  const NOTES:[any,string,string,string][]=[[Factory,'Herstellung','process','src_p'],[Snowflake,'Lagerung','storage_temp','src_t'],[Clock,'Haltbar ungeöffnet','mhd_unopened','src_m'],[Droplets,'Nach dem Öffnen','after_opening','src_a'],[HeartPulse,'Nährstoffe','nutrients','src_n'],[FlaskConical,'Zusatzstoffe','additives','src_ad'],[Recycle,'Recycling (AT)','recycling_at','src_r'],[ShieldAlert,'BPA / Beschichtung','bpa','src_b'],[ShieldAlert,'Risiko','risk','src_risk'],[Gauge,'Mikrowelle','microwave','src_mw']]
  return <div className="space-y-5 min-w-0">
    <div className="rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border dark:border-slate-800 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-extrabold tracking-tight">📦 Verpackungs-Dashboard</h2><p className="text-sm text-slate-500 max-w-2xl">Wie unterscheiden sich Dose, Kühlschale, TK & Co. bei Preis, Protein, Gesundheit, Salz und Haltbarkeit? Alle Kennzahlen sind Mediane aus den echten Produktdaten.</p></div>
        <div className="flex flex-wrap gap-1.5 text-xs"><Badge className="bg-white dark:bg-slate-800 border"><Package size={12} className="inline mr-1"/>{C?.total-C?.unclassified} von {C?.total} klassifiziert</Badge><InfoTip text={`Regeln (Priorität): ${(C?.rules||[]).join(' · ')}. ${C?.moved} Produkte wurden neu eingestuft, ${C?.unclassified} ohne belastbaren Hinweis bleiben „unklar“ und fließen nicht ein.`}><Badge className="bg-white dark:bg-slate-800 border">{C?.moved} neu eingestuft</Badge></InfoTip></div></div>
    </div>
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">{T.map(x=>{const s=x.stats,on=x.type===t.type,ph=x.top?.[0]?.img
      return <button key={x.type} onClick={()=>setSel(x.type)} className={'text-left rounded-2xl border bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden transition hover:shadow-lg hover:-translate-y-0.5 '+(on?'ring-2 shadow-lg':'')} style={on?{['--tw-ring-color' as any]:COL[x.type]}:{}}>
        <div className="flex items-center gap-3 p-3" style={{background:COL[x.type]+'14'}}><div className="relative h-16 w-16 shrink-0 rounded-xl bg-white dark:bg-slate-800 grid place-items-center text-4xl shadow-sm overflow-hidden">{ph?<img src={ph} alt="" loading="lazy" className="h-full w-full object-contain p-1" onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>:null}<span className="absolute -bottom-1 -right-1 text-2xl drop-shadow">{x.icon}</span></div>
          <div className="min-w-0"><div className="font-bold leading-tight">{LBL[x.type]}</div><div className="text-[11px] text-slate-500">{SUB[x.type]}</div><div className="text-2xl font-extrabold tabular-nums" style={{color:COL[x.type]}}>{s.n_products}<span className="text-xs font-medium text-slate-500 ml-1">Produkte</span></div></div></div>
        <div className="grid grid-cols-3 gap-1.5 p-2.5">
          <Kpi icon={Euro} label="Preis" value={s.median_price!=null?fmt(s.median_price,2)+' €':null} tip={TIP.price} color={COL[x.type]}/>
          <Kpi icon={Scale} label="€/10 g P." value={s.median_price_per_10g_protein!=null?fmt(s.median_price_per_10g_protein,2):null} tip="Median € pro 10 g Protein (nur rankbare Gerichte). Niedriger ist besser." color={COL[x.type]}/>
          <Kpi icon={HeartPulse} label="Health" value={s.median_health_score!=null?fmt(s.median_health_score,0):null} tip="Median Health-Score 0–100 der rankbaren Gerichte." color={COL[x.type]}/>
          <Kpi icon={Trophy} label="PLI" value={s.median_pli!=null?fmt(s.median_pli,0):null} tip="Median Preis-Leistungs-Index (50 % Health + 50 % Protein pro Euro)." color={COL[x.type]}/>
          <Kpi icon={Droplets} label="Salz/100 g" value={s.median_salt_100!=null?fmt(s.median_salt_100,1)+' g':null} tip={TIP.salt} color={COL[x.type]}/>
          <Kpi icon={FlaskConical} label="Zusatzst." value={s.n_additives?`${fmt(s.median_additives,1)} (n=${s.n_additives})`:null} tip={TIP.add} color={COL[x.type]}/>
          <div className="col-span-3 sm:col-span-3"><Kpi icon={Clock} label="MHD typ.* · nach Öffnen" value={`${x.mhd_typical?.[2]??'–'} · ${(x.after_opening_labels?.[0]?.[0]||'–').replace('nach dem öffnen','').trim().slice(0,60)}`} tip={TIP.mhd+' '+TIP.after}/></div>
        </div></button>})}</div>
    <p className="text-[11px] text-slate-500 -mt-2">* Typischer Branchenrichtwert (Quellen: Verbraucherzentrale), kein Messwert. „Nach Öffnen“ = echter Etikett-Hinweis.</p>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4 min-w-0"><h3 className="font-semibold mb-1 flex items-center gap-1.5"><HeartPulse size={16} className="text-brand"/><InfoTip text="Mediane je Verpackung, nur Typen mit ≥ 5 rankbaren Gerichten.">Health & Preis-Leistung</InfoTip></h3>
        <ResponsiveContainer width="100%" height={260}><BarChart data={bars} margin={{left:-20,right:4}}><CartesianGrid strokeDasharray="3 3" opacity={.3}/><XAxis dataKey="l" tick={{fontSize:10}} interval={0} angle={-20} textAnchor="end" height={50}/><YAxis tick={{fontSize:10}}/><Tooltip/><Legend wrapperStyle={{fontSize:11}}/><Bar dataKey="score" name="Health-Score" radius={[6,6,0,0]} fill="#1b6e3a"/><Bar dataKey="pli" name="PLI" radius={[6,6,0,0]} fill="#6366f1"/></BarChart></ResponsiveContainer></Card>
      <Card className="p-4 min-w-0"><h3 className="font-semibold mb-1 flex items-center gap-1.5"><Scale size={16} className="text-brand"/><InfoTip text="Median € pro 10 g Protein. Niedriger = mehr Protein fürs Geld.">€ pro 10 g Protein</InfoTip></h3>
        <ResponsiveContainer width="100%" height={260}><BarChart data={bars} layout="vertical" margin={{left:10,right:16}}><CartesianGrid strokeDasharray="3 3" opacity={.3}/><XAxis type="number" tick={{fontSize:10}}/><YAxis type="category" dataKey="l" width={95} tick={{fontSize:10}}/><Tooltip formatter={(v:any)=>fmt(v,2)+' €'}/><Bar dataKey="eur" name="€/10 g Protein" radius={[0,6,6,0]}>{bars.map(b=><Cell key={b.t} fill={COL[b.t]}/>)}</Bar></BarChart></ResponsiveContainer></Card>
      <Card className="p-4 min-w-0"><h3 className="font-semibold mb-2 flex items-center gap-1.5"><Gauge size={16} className="text-brand"/><InfoTip text="Boxplot: Linie = Minimum bis Maximum, Box = mittlere 50 % (Q1–Q3), Strich = Median.">Verteilung (Boxplot)</InfoTip></h3>
        <div className="text-xs font-medium text-slate-500 mb-1">€ pro 10 g Protein (bis 15 €)</div><div className="space-y-0.5 mb-3">{T.map(x=><BoxRow key={x.type} t={x.type} b={x.box?.eur10p} max={13} fmtv={v=>fmt(v,2)+' €'}/>)}</div>
        <div className="text-xs font-medium text-slate-500 mb-1">Health-Score</div><div className="space-y-0.5 mb-3">{T.map(x=><BoxRow key={x.type} t={x.type} b={x.box?.score} max={100} fmtv={v=>fmt(v,0)}/>)}</div>
        <div className="text-xs font-medium text-slate-500 mb-1">Salz g/100 g (bis 3 g)</div><div className="space-y-0.5">{T.map(x=><BoxRow key={x.type} t={x.type} b={x.box?.salt} max={3} fmtv={v=>fmt(v,1)+' g'}/>)}</div></Card>
      <Card className="p-4 min-w-0"><h3 className="font-semibold mb-1 flex items-center gap-1.5"><Trophy size={16} className="text-brand"/><InfoTip text="Relativer Vergleich (20–100, außen = besser) der Mediane. Haltbarkeit = typischer Branchenrichtwert. Nur Typen mit ≥ 5 rankbaren Gerichten.">Profil je Verpackung (Radar)</InfoTip></h3>
        <ResponsiveContainer width="100%" height={320}><RadarChart data={radar} outerRadius="70%"><PolarGrid/><PolarAngleAxis dataKey="a" tick={{fontSize:10}}/><PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/>{rtypes.map(x=><Radar key={x.type} name={x.icon+' '+x.type.split('/')[0]} dataKey={x.type} stroke={COL[x.type]} fill={COL[x.type]} fillOpacity={x.type===t.type?.35:.05} strokeWidth={x.type===t.type?2.5:1}/>)}<Legend wrapperStyle={{fontSize:10}}/><Tooltip/></RadarChart></ResponsiveContainer></Card>
    </div>

    <Card className="p-4"><h3 className="font-semibold mb-3 flex items-center gap-1.5"><Clock size={16} className="text-brand"/><InfoTip text={TIP.mhd}>Haltbarkeit ungeöffnet – Zeitstrahl (typische Branchenwerte)</InfoTip></h3>
      <div className="space-y-2">{[...T].sort((a,b)=>a.mhd_typical[0]-b.mhd_typical[0]).map(x=><div key={x.type} className="flex items-center gap-2 text-xs"><span className="w-28 sm:w-44 truncate shrink-0">{x.icon} {LBL[x.type]}</span><div className="relative flex-1 h-5 rounded-full bg-slate-100 dark:bg-slate-800"><div className="absolute h-full rounded-full" style={{left:`${sq(x.mhd_typical[0])}%`,width:`${sq(x.mhd_typical[1])-sq(x.mhd_typical[0])}%`,background:`linear-gradient(90deg,${COL[x.type]}88,${COL[x.type]})`}}/></div><span className="w-20 sm:w-24 text-right shrink-0">{x.mhd_typical[2]}</span></div>)}</div>
      <div className="flex justify-between text-[10px] text-slate-400 pl-[7.5rem] sm:pl-[11.5rem] mt-1"><span>1 Woche</span><span>1 Monat</span><span>6 Monate</span><span>1 Jahr</span><span>4 Jahre</span></div>
      <p className="text-[10px] text-slate-500 mt-1">Wurzel-Skala. Quellen {src(['vz','vzk'])}. Echte MHD-Tage stehen nicht in den Shopdaten.</p></Card>

    <div className="flex gap-1.5 overflow-x-auto pb-1">{T.map(x=><button key={x.type} onClick={()=>setSel(x.type)} className={'shrink-0 rounded-full border px-3 py-1.5 text-sm '+(x.type===t.type?'text-white border-transparent':'bg-white dark:bg-slate-900 dark:border-slate-700')} style={x.type===t.type?{background:COL[x.type]}:{}}>{x.icon} {LBL[x.type]}</button>)}</div>
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] min-w-0">
      <Card className="p-4 min-w-0"><h3 className="font-bold text-lg flex items-center gap-2"><span className="text-2xl">{t.icon}</span>Top 5 {LBL[t.type]}<InfoTip text="Beste Komplettmahlzeiten/Eintöpfe dieser Verpackung nach Preis-Leistungs-Index (mind. 12 g Protein pro Packung, aktueller Preis)."/></h3>
        {t.top?.length?<div className="mt-2 space-y-2">{t.top.map((x:any,i:number)=><button key={x.id} onClick={()=>open(x.id)} className="w-full flex items-center gap-3 rounded-xl border dark:border-slate-800 p-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60">
          <span className="text-lg w-6 text-center shrink-0">{['🥇','🥈','🥉','4','5'][i]}</span><img src={x.img} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-lg object-contain bg-white"/>
          <div className="min-w-0 flex-1"><div className="font-medium text-sm truncate">{x.name}</div><div className="flex items-center gap-1.5 mt-0.5">{x.logo&&<img src={'./'+x.logo} alt="" className="h-4 max-w-[60px] object-contain"/>}{STORE_LOGO[x.store]&&<img src={'./'+STORE_LOGO[x.store]} alt={x.store} className="h-4 max-w-[50px] object-contain"/>}<span className="text-[11px] text-slate-500 truncate">{x.brand}</span></div></div>
          <div className="text-right text-xs shrink-0 tabular-nums"><div className="font-bold text-sm">{fmt(x.price,2)} €</div><div className="text-slate-500">PLI {fmt(x.pli,0)} · {fmt(x.eur10p,2)} €/10 g P.</div></div></button>)}</div>:<p className="text-sm text-slate-500 mt-2">Zu wenige rankbare Mahlzeiten mit vollständigen Nährwerten in dieser Gruppe.</p>}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500"><Store size={13}/>Erhältlich bei: {t.stores.filter((s:string)=>!s.startsWith('unbekannt')).map((s:string)=>STORE_LOGO[s]?<img key={s} src={'./'+STORE_LOGO[s]} alt={s} title={s} className="h-5 max-w-[56px] object-contain"/>:<Badge key={s}>{s}</Badge>)}</div></Card>
      <Card className="p-4 min-w-0"><h3 className="font-bold text-lg flex items-center gap-2"><BookOpen size={18} className="text-brand"/>Steckbrief {LBL[t.type]}</h3>
        <div className="mt-2 divide-y dark:divide-slate-800">{NOTES.map(([I,l,k,s])=>t[k]?<div key={k} className="flex gap-2 py-1.5 text-sm"><I size={15} className="mt-0.5 shrink-0 text-slate-400"/><div className="min-w-0"><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{l}</div><div className="break-words">{String(t[k])} {src(t[s])}</div></div></div>:null)}</div>
        {t.after_opening_labels?.length>0&&<div className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 p-2.5 text-xs"><div className="font-semibold mb-1 flex items-center gap-1"><Tag size={12}/>Echte Etikett-Hinweise (BILLA)</div>{t.after_opening_labels.map(([s,n]:[string,number])=><div key={s} className="flex justify-between gap-2"><span className="first-letter:uppercase">{s}</span><span className="tabular-nums text-slate-500">{n}×</span></div>)}</div>}</Card>
    </div>
    <Card className="p-4 text-xs text-slate-500"><details><summary className="cursor-pointer font-semibold text-sm text-slate-700 dark:text-slate-200">🔎 Wie wurde klassifiziert?</summary><ul className="list-disc pl-5 mt-2 space-y-0.5">{(C?.by_reason||[]).map(([r,n]:[string,number])=><li key={r}>{r}: <b>{n}</b></li>)}</ul><p className="mt-2">{p.note}</p></details></Card>
    {md&&<Card className="p-4"><details><summary className="cursor-pointer font-semibold">📚 Vollständiger Bericht mit Quellen</summary><Markdown text={md}/></details></Card>}
  </div>
}

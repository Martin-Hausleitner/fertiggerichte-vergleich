import { ChartContainer } from '../components/ui/chart'
import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend, ReferenceLine, Cell } from 'recharts'
import { HeartPulse, Trophy, AlertOctagon, FlaskConical, Globe2, Award, Activity, Search } from 'lucide-react'
import { Card, Badge, Select, Input } from '../components/ui'
import { InfoTip, Flag, STAGES, packEmo } from '../components/info'
import { Img, StoreLogo, BrandLogo, HealthBadge } from '../components/product'
import { breakdown, PARTS, HK, ScoreWaterfall, useOff, offFor, NS_C, NOVA_C, HealthSection, tlColor, Missing, QualityBadges } from '../components/health'
import { useApp, fmt, cn, scoreColor, type Row } from '../lib'

const H=({icon:I,title,info,grad}:{icon:any;title:string;info:string;grad:string})=><div className={cn('flex items-center gap-2 rounded-t-2xl px-4 py-2.5 text-white bg-gradient-to-r',grad)}><I size={18}/><h2 className="font-bold">{title}</h2><span className="ml-auto [&_svg]:text-white/80"><InfoTip text={info}/></span></div>
const Sec=({children,...h}:{children:any;icon:any;title:string;info:string;grad:string})=><Card className="overflow-hidden"><H {...h}/><div className="p-3 sm:p-4">{children}</div></Card>
function Stat({e,v,l,info,c}:{e:string;v:string;l:string;info:string;c:string}){return <div className={cn('rounded-2xl p-3 text-white shadow bg-gradient-to-br',c)}><div className="text-2xl">{e}</div><div className="text-2xl font-extrabold tabular-nums">{v}</div><div className="text-xs opacity-90"><InfoTip text={info}>{l}</InfoTip></div></div>}

function DishCard({r,rank,bad}:{r:Row;rank:number;bad?:boolean}){const {open}=useApp()
  return <button onClick={()=>open(r.id)} className={cn('text-left rounded-2xl border p-2.5 flex gap-3 hover:shadow-lg transition bg-white dark:bg-slate-900',bad?'border-red-200 dark:border-red-900':'border-emerald-200 dark:border-emerald-900')}>
   <div className="relative shrink-0"><Img src={r.img} className="h-20 w-20"/><span className={cn('absolute -top-2 -left-2 h-7 w-7 rounded-full text-white text-xs font-bold flex items-center justify-center shadow',bad?'bg-red-600':'bg-emerald-600')}>{rank}</span></div>
   <div className="min-w-0 flex-1 space-y-1"><div className="font-semibold text-sm leading-tight line-clamp-2">{r.name}</div>
    <div className="flex items-center gap-1.5"><BrandLogo r={r} size={22}/><StoreLogo store={r.store} size={22}/><HealthBadge s={r.score}/><span className="text-xs text-slate-500">{packEmo(r.pack)}</span>{r.price!=null&&<span className="ml-auto text-xs font-bold">{fmt(r.price,2)} €</span>}</div>
    <ScoreWaterfall r={r} compact/>
    <div className="flex gap-1">{(['salt','sugar','sat','fat'] as const).map(k=><span key={k} title={k} className={cn('h-2 flex-1 rounded-full',tlColor(k,r[k]))}/>)}</div></div></button>}

function ScatterTip({active,payload}:any){if(!active||!payload?.length)return null;const r:Row=payload[0].payload.r
  return <div className="rounded-xl bg-white dark:bg-slate-900 shadow-xl border p-2 w-56 dark:border-slate-700"><Img src={r.img} zoom={false} className="h-28 w-full"/><div className="text-xs font-semibold mt-1">{r.name}</div><div className="text-[11px] text-slate-500">{r.brand} · {r.store}</div><div className="text-xs mt-1">💪 {fmt(r.p100k)} g/100 kcal · 🧂 {fmt(r.salt,2)} g/100 g · 💚 {fmt(r.score,0)}</div></div>}

function PlantMap(){const {D}=useApp();const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{if(!ref.current)return;const m=L.map(ref.current,{scrollWheelZoom:false}).setView([47.8,13.8],7);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(m)
   const pts:any[]=[];for(const p of D.producers||[])for(const pl of p.plants||[])if(pl.lat&&pl.lon){pts.push([pl.lat,pl.lon]);L.circleMarker([pl.lat,pl.lon],{radius:7,color:'#059669',fillColor:'#10b981',fillOpacity:.8}).addTo(m).bindPopup(`<b>${p.name}</b><br>${pl.address||pl.town||''}${pl.state?' ('+pl.state+')':''}${pl.approval_code?'<br>🔖 '+pl.approval_code:''}`)}
   L.circleMarker([48.3,14.29],{radius:9,color:'#dc2626',fillColor:'#ef4444',fillOpacity:1}).addTo(m).bindPopup('🏠 Gruberstraße 19, Linz');if(pts.length)m.fitBounds(pts as any,{padding:[20,20]});return()=>{m.remove()}},[D])
  return <div ref={ref} className="h-80 rounded-xl z-0"/>}

export default function Health(){
  const {R,D,dark}=useApp(); const O=useOff()
  const meals=useMemo(()=>R.filter(r=>r.stage==='meal'&&r.score!=null&&!r.dry&&!r.incomplete&&!r.nonfood),[R])
  const top=[...meals].sort((a,b)=>b.score!-a.score!).slice(0,10), flop=[...meals].sort((a,b)=>a.score!-b.score!).slice(0,10)
  const scored=R.filter(r=>r.score!=null&&!r.dry&&r.stage!=='base')
  const [grp,setGrp]=useState<'store'|'pack'|'brandN'>('store')
  const nsRows=R.filter(r=>r.ns), nsData=useMemo(()=>{const m:Record<string,any>={};for(const r of nsRows){const k=(r as any)[grp]||'?';m[k]??={k,n:0};const g=r.ns!.toUpperCase();m[k][g]=(m[k][g]||0)+1;m[k].n++}return Object.values(m).sort((a:any,b:any)=>b.n-a.n).slice(0,14)},[nsRows,grp])
  const [stg,setStg]=useState('meal')
  const sc=scored.filter(r=>r.p100k!=null&&r.salt!=null&&(stg==='all'||r.stage===stg)).map(r=>({x:r.salt,y:r.p100k,z:r.score,r}))
  const packBD=useMemo(()=>{const m:Record<string,any>={};for(const r of scored){const b=breakdown(r);if(!b)continue;const k=r.pack.split(' (')[0];m[k]??={k:packEmo(r.pack)+' '+k,n:0,prot:0,fib:0,veg:0,salt:0,sat:0,proc:0,tot:0};const o=m[k];o.n++;for(const p of ['prot','fib','veg','salt','sat','proc'])o[p]+=(b as any)[p];o.tot+=b.total}return Object.values(m).map((o:any)=>{for(const p of ['prot','fib','veg','salt','sat','proc','tot'])o[p]=+(o[p]/o.n).toFixed(1);return o}).sort((a:any,b:any)=>b.tot-a.tot)},[scored])
  const tlPack=useMemo(()=>{const m:Record<string,any>={};for(const r of scored){const k=packEmo(r.pack)+' '+r.pack.split(' (')[0];m[k]??={k,g:0,a:0,rd:0,na:0};const v=r.salt;if(v==null)m[k].na++;else if(v<=0.3)m[k].g++;else if(v>1.5)m[k].rd++;else m[k].a++}return Object.values(m)},[scored])
  const offRows=O||[], novaD=[1,2,3,4].map(n=>({n:'NOVA '+n,c:offRows.filter(o=>o.nova===n).length,nv:n}))
  const addC=useMemo(()=>{const m:Record<string,number>={};for(const o of offRows)for(const a of o.additives)m[a]=(m[a]||0)+1;return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,16)},[offRows])
  const orig=useMemo(()=>{const m:Record<string,number>={};for(const r of R){if(r.stage==='base')continue;const o=(r.origin||'').replace(/ \(.*\)/,'');if(o)m[o]=(m[o]||0)+1}return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,12)},[R])
  const noOrig=R.filter(r=>r.stage!=='base'&&!r.origin).length
  const badges=[['🌿 Bio',R.filter(r=>r.bio).length],['🌱 vegan',R.filter(r=>r.vegan).length],['🏔️ OÖ-Betrieb',R.filter(r=>r.ooe).length],['🇦🇹 Herkunft AT',R.filter(r=>/österreich/i.test(r.origin||'')).length],['🇦🇹 AMA (OFF-Label)',offRows.filter(o=>o.labels.some(l=>/ama/.test(l))).length]] as [string,number][]
  const [q,setQ]=useState(''),[sel,setSel]=useState<number|null>(top[0]?.id??null)
  const hits=q.length>1?R.filter(r=>r.name.toLowerCase().includes(q.toLowerCase())&&r.score!=null).slice(0,8):[]
  const grid=dark?'#334155':'#e2e8f0'
  const avg=(a:number[])=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0
  return <div className="space-y-4">
   <div className="rounded-3xl p-5 text-white bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-700 shadow-lg"><div className="flex items-center gap-3"><HeartPulse size={34}/><div><h1 className="text-2xl font-extrabold">🩺 Gesundheit &amp; Qualität</h1><p className="text-sm opacity-90">Woraus sich der Health-Score zusammensetzt, Nährwert-Ampeln, Zusatzstoffe, Herkunft und Gütesiegel. Nur echte Daten, Lücken sind markiert.</p></div></div>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4">
     <Stat e="🍱" v={String(meals.length)} l="Komplettmahlzeiten mit Score" info="Komplettmahlzeiten mit vollständigen Nährwerten (Protein, Energie, Salz, ges. Fett)." c="from-emerald-500 to-emerald-700"/>
     <Stat e="💚" v={fmt(avg(meals.map(r=>r.score!)),0)} l="Ø Health-Score" info={HK.bd} c="from-teal-500 to-teal-700"/>
     <Stat e="🧂" v={fmt(scored.filter(r=>(r.salt??0)>1.5).length/scored.length*100,0)+' %'} l="Salz-Ampel rot" info={HK.tl} c="from-red-500 to-rose-700"/>
     <Stat e="🔤" v={String(nsRows.length)} l="mit Nutri-Score" info={HK.ns} c="from-lime-500 to-green-700"/>
     <Stat e="🧪" v={String(offRows.length)} l="mit Zutatenliste (OFF)" info={HK.add} c="from-purple-500 to-violet-700"/>
     <Stat e="🌍" v={String(R.length-noOrig)} l="mit Herkunftsangabe" info="Gerichte mit Länderangabe zur Herkunft laut Händlerseite." c="from-sky-500 to-blue-700"/>
    </div></div>

   <div className="grid lg:grid-cols-2 gap-4">
    <Sec icon={Trophy} title="🏆 Top 10 gesündeste Komplettmahlzeiten" info="Höchster Health-Score unter Komplettmahlzeiten mit vollständigen Nährwerten. Klick öffnet die Details." grad="from-emerald-600 to-green-500"><div className="grid sm:grid-cols-2 gap-2">{top.map((r,i)=><DishCard key={r.id} r={r} rank={i+1}/>)}</div></Sec>
    <Sec icon={AlertOctagon} title="⚠️ Top 10 ungesündeste Komplettmahlzeiten" info="Niedrigster Health-Score: meist viel Salz und gesättigte Fette bei wenig Protein." grad="from-red-600 to-orange-500"><div className="grid sm:grid-cols-2 gap-2">{flop.map((r,i)=><DishCard key={r.id} r={r} rank={i+1} bad/>)}</div></Sec>
   </div>

   <Sec icon={Search} title="🔬 Einzelgericht analysieren" info="Gericht suchen: Score-Aufschlüsselung, Ampel, Netzdiagramm gegen den Median, Zusatzstoffe und Herkunft." grad="from-sky-600 to-indigo-500">
    <div className="relative mb-3"><Input placeholder="🔎 Gericht suchen, z. B. Chili, Gulasch, Good Choice…" value={q} onChange={e=>setQ(e.target.value)} className="w-full"/>{hits.length>0&&<div className="absolute z-20 mt-1 w-full rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 shadow-xl">{hits.map(h=><button key={h.id} onClick={()=>{setSel(h.id);setQ('')}} className="flex w-full items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left text-sm"><Img src={h.img} className="h-8 w-8"/><span className="flex-1 truncate">{h.name}</span><StoreLogo store={h.store} size={18}/><HealthBadge s={h.score}/></button>)}</div>}</div>
    {(()=>{const sr=sel!=null?R.find(r=>r.id===sel):null;return sr&&<div className="grid md:grid-cols-[220px_1fr] gap-4"><div className="space-y-2"><Img src={sr.img} className="h-52 w-full"/><div className="font-bold">{sr.name}</div><div className="flex gap-2 items-center"><BrandLogo r={sr} size={30}/><StoreLogo store={sr.store} size={30}/></div></div><HealthSection r={sr} R={R}/></div>})()}
   </Sec>

   <Sec icon={Activity} title="💪 Protein vs. 🧂 Salz" info="Jeder Punkt ist ein Gericht. Oben links ist ideal: viel Protein pro 100 kcal, wenig Salz. Farbe = Health-Score. Drüberfahren zeigt das Produktfoto." grad="from-teal-600 to-cyan-500">
    <div className="flex flex-wrap gap-1 mb-2">{[['all','Alle'] as const,...STAGES.filter(s=>s[0]!=='base').map(s=>[s[0],s[1]+' '+s[2]] as const)].map(([k,l])=><button key={k} onClick={()=>setStg(k)} className={cn('rounded-full px-3 py-1 text-xs',stg===k?'bg-teal-600 text-white':'bg-slate-100 dark:bg-slate-800')}>{l}</button>)}<Badge className="ml-auto bg-slate-100 dark:bg-slate-800">{sc.length} Gerichte</Badge></div>
    <div className="h-96"><ChartContainer config={{}} className="aspect-auto h-full w-full"><ScatterChart margin={{top:10,right:10,bottom:20,left:0}}><CartesianGrid stroke={grid}/><XAxis type="number" dataKey="x" name="Salz" unit=" g" domain={[0,'auto']} label={{value:'🧂 Salz g/100 g',position:'bottom',fontSize:11}} tick={{fontSize:11}}/><YAxis type="number" dataKey="y" name="Protein" tick={{fontSize:11}} label={{value:'💪 g Protein/100 kcal',angle:-90,position:'insideLeft',fontSize:11}}/><ZAxis range={[40,40]}/><ReferenceLine x={1.5} stroke="#dc2626" strokeDasharray="4 4" label={{value:'Salz rot',fontSize:10,fill:'#dc2626'}}/><ReferenceLine y={10} stroke="#059669" strokeDasharray="4 4"/><Tooltip content={<ScatterTip/>}/><Scatter data={sc}>{sc.map((d,i)=><Cell key={i} fill={scoreColor(d.z)}/>)}</Scatter></ScatterChart></ChartContainer></div>
   </Sec>

   <div className="grid lg:grid-cols-2 gap-4">
    <Sec icon={HeartPulse} title="🧮 Ø Score-Bausteine je Verpackung" info={'Durchschnittliche Bonus- und Abzugspunkte je Verpackungsart. '+HK.proc} grad="from-emerald-600 to-teal-500">
     <div className="h-80"><ChartContainer config={{}} className="aspect-auto h-full w-full"><BarChart data={packBD} layout="vertical" stackOffset="sign" margin={{left:10}}><CartesianGrid stroke={grid}/><XAxis type="number" tick={{fontSize:11}}/><YAxis type="category" dataKey="k" width={130} tick={{fontSize:10}}/><Tooltip/><Legend wrapperStyle={{fontSize:11}}/><ReferenceLine x={0} stroke="#64748b"/>{PARTS.map(p=><Bar key={p[0]} dataKey={p[0]} name={p[1]} stackId="a" fill={p[3]}/>)}</BarChart></ChartContainer></div>
     <div className="flex flex-wrap gap-1 mt-1">{packBD.map((p:any)=><Badge key={p.k} className="bg-slate-100 dark:bg-slate-800">{p.k}: Ø {p.tot} ({p.n})</Badge>)}</div>
    </Sec>
    <Sec icon={Award} title="🔤 Nutri-Score-Verteilung" info={HK.ns+' Wo kein Nutri-Score angegeben ist, fehlt das Produkt hier.'} grad="from-lime-600 to-green-600">
     <div className="flex gap-1 mb-2">{([['store','🏪 Kette'],['brandN','🏷️ Marke'],['pack','📦 Verpackung']] as const).map(([k,l])=><button key={k} onClick={()=>setGrp(k)} className={cn('rounded-full px-3 py-1 text-xs',grp===k?'bg-green-600 text-white':'bg-slate-100 dark:bg-slate-800')}>{l}</button>)}</div>
     <div className="h-72"><ChartContainer config={{}} className="aspect-auto h-full w-full"><BarChart data={nsData} layout="vertical"><CartesianGrid stroke={grid}/><XAxis type="number" tick={{fontSize:11}}/><YAxis type="category" dataKey="k" width={120} tick={{fontSize:10}}/><Tooltip/><Legend wrapperStyle={{fontSize:11}}/>{'ABCDE'.split('').map(l=><Bar key={l} dataKey={l} stackId="n" fill={NS_C[l]}/>)}</BarChart></ChartContainer></div>
     <Missing text={`Nur ${nsRows.length} von ${R.length} Produkten haben einen Nutri-Score in den Quellen. Die österreichischen Shops zeigen ihn meist nicht an.`}/>
    </Sec>
   </div>

   <Sec icon={AlertOctagon} title="🚦 Salz-Ampel je Verpackungsart" info={HK.tl} grad="from-amber-500 to-red-500">
    <div className="space-y-1.5">{tlPack.map((t:any)=>{const n=t.g+t.a+t.rd+t.na;return <div key={t.k} className="flex items-center gap-2 text-xs"><span className="w-44 truncate">{t.k}</span><div className="flex flex-1 h-5 rounded-full overflow-hidden text-[10px] text-white font-semibold">{[['g','bg-emerald-500'],['a','bg-amber-400'],['rd','bg-red-500'],['na','bg-slate-300 dark:bg-slate-700']].map(([k,c])=>t[k]>0&&<div key={k} className={cn(c,'flex items-center justify-center')} style={{width:t[k]/n*100+'%'}}>{t[k]/n>.07?Math.round(t[k]/n*100)+'%':''}</div>)}</div><span className="w-10 text-right text-slate-500">{n}</span></div>})}<div className="text-[11px] text-slate-500">🟢 ≤ 0,3 g · 🟡 mittel · 🔴 &gt; 1,5 g · ⚪ keine Angabe</div></div>
   </Sec>

   <div className="grid lg:grid-cols-2 gap-4">
    <Sec icon={FlaskConical} title="🧪 Verarbeitungsgrad (NOVA) & Zusatzstoffe" info={HK.nova+' '+HK.add} grad="from-purple-600 to-fuchsia-500">
     {!offRows.length?<Missing text="Lädt oder keine Open-Food-Facts-Daten."/>:<><div className="grid grid-cols-4 gap-2">{novaD.map(d=><div key={d.n} className={cn('rounded-xl p-2 text-center text-white',NOVA_C[d.nv])}><div className="text-xl font-extrabold">{d.c}</div><div className="text-[11px]">{d.n}</div></div>)}</div>
      <div className="text-xs font-semibold mt-3 mb-1">Häufigste E-Nummern</div><div className="flex flex-wrap gap-1">{addC.map(([a,c])=><Badge key={a} className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">{a} × {c}</Badge>)}</div>
      <div className="mt-2"><Missing text={`Daten nur für ${offRows.length} Produkte mit EAN auf Open Food Facts (davon ${offRows.filter(o=>o.nova).length} mit NOVA). Für alle anderen gilt der geschätzte Verarbeitungs-Abzug aus der Verpackungsart.`}/></div></>}
    </Sec>
    <Sec icon={Award} title="🏅 Gütesiegel & Labels" info="Bio und vegan laut Händler, OÖ = Herstellerbetrieb in Oberösterreich (Identitätskennzeichen), AMA nur wenn auf Open Food Facts gelistet." grad="from-green-600 to-emerald-500">
     <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{badges.map(([l,n])=><div key={l} className="rounded-xl p-3 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900/40 text-center"><div className="text-sm font-semibold">{l}</div><div className="text-2xl font-extrabold tabular-nums">{n}</div></div>)}</div>
     <div className="mt-3 text-xs font-semibold">Beispiele 🌿 Bio-Komplettmahlzeiten</div><div className="flex gap-2 overflow-x-auto py-1">{meals.filter(r=>r.bio).sort((a,b)=>b.score!-a.score!).slice(0,8).map(r=><div key={r.id} className="w-24 shrink-0 text-[10px]"><Img src={r.img} className="h-20 w-24"/><div className="line-clamp-2">{r.name}</div><QualityBadges r={r}/></div>)}</div>
    </Sec>
   </div>

   <Sec icon={Globe2} title="🌍 Herkunft: Rohstoffe & Werke" info="Länder laut Herkunftsangabe der Händler. Karte: Werke der Hersteller (amtliche Zulassungsliste/Identitätskennzeichen), rot = Gruberstraße 19, Linz." grad="from-sky-600 to-blue-600">
    <div className="grid lg:grid-cols-[1fr_1.4fr] gap-4"><div className="space-y-1">{orig.map(([o,n])=><div key={o} className="flex items-center gap-2 text-sm"><span className="w-6"><Flag text={o}/></span><span className="w-32 truncate">{o}</span><div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-3 rounded-full bg-gradient-to-r from-sky-400 to-blue-600" style={{width:n/orig[0][1]*100+'%'}}/></div><span className="w-8 text-right tabular-nums text-xs">{n}</span></div>)}
     <Missing text={`${noOrig} Gerichte ohne Herkunftsangabe. Fleischherkunft wird online meist nicht genannt.`}/></div><PlantMap/></div>
   </Sec>
  </div>
}

import { ChartContainer } from '../components/ui/chart'
import { useEffect, useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'
import { Building2, Users, Euro, Factory, ExternalLink, Database } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Input } from '../components/ui'
import { InfoTip, Flag, prodColor } from '../components/info'
import { fmt, useApp, cn } from '../lib'

type C={slug:string;name:string;role:string;legal_name:string|null;lei:string|null;fn:string|null;register_id:string|null;country:string|null;address:string|null;parent_direct:string|null;parent_ultimate:string|null;founded:string|null;owners:string|null;management:string|null;employees:string|null;revenue:string|null;website:string|null;plants:{address:string;approval_code?:string}[];brands:string[];chains:string[];product_count:number;chain_product_count?:number;median_price_eur:number|null;median_eur_per_10g_protein:number|null;sources:string[];registry_status:string;logo?:string|null;revenue_eur_m?:number|null;revenue_year?:string|null;employees_n?:number|null;founded_year?:number|null}
const TIP:Record<string,string>={
 revenue:'Umsatz laut Firmenbuch-Jahresabschluss oder Presse, mit Jahr. Text = Originalangabe inkl. Quelle; Diagramm nutzt die erste Zahl in Mio. €. Leer = nicht öffentlich/nicht verifiziert.',
 employees:'Mitarbeiterzahl laut Firmenwebsite, Jahresabschluss oder Presse (Originalangabe).',
 lei:'Legal Entity Identifier aus der GLEIF-Datenbank (offen, CC0). Grün = verifizierter Registertreffer.',
 fn:'Firmenbuchnummer (Österreich) bzw. Registernummer (HRB/HRA in Deutschland, REA in Italien) laut GLEIF.',
 parent:'Oberste Konzernmutter laut GLEIF Level-2-Beziehungen, sonst Eigentümer aus Recherche.',
 products:'Anzahl Produkte dieses Herstellers in der App.',
 price:'Median-Packungspreis seiner Produkte in der App.',
 e10:'Median € pro 10 g Protein seiner Produkte. Niedriger = mehr Protein fürs Geld.',
 plants:'Werke mit amtlichem Identitätskennzeichen (Statistik Austria / ÖVIS-Liste).'}
const ROLE:Record<string,string>={producer:'Hersteller',retailer:'Handel',brand_owner:'Markeninhaber'}
const Missing=()=> <span className="text-[11px] italic text-slate-400">nicht öffentlich</span>
function Logo({c,size=40}:{c:C;size?:number}){const col=prodColor(c.slug);return c.logo?<img src={c.logo} alt={c.name} style={{height:size,width:size*1.8}} className="object-contain rounded-md bg-white p-1 border border-border/60"/>:<span style={{height:size,width:size*1.8,background:col+'18',color:col}} className="grid place-items-center rounded-md text-sm font-extrabold">{(c.legal_name||c.name).replace(/[^A-Za-zÄÖÜ]/g,'').slice(0,3).toUpperCase()}</span>}
const H=(h:string,k:string)=>({headerName:h,headerTooltip:'ℹ️ '+TIP[k]})

export default function Firmenvergleich(){
  const {dark}=useApp()
  const [all,setAll]=useState<C[]>([]);const [q,setQ]=useState('');const [role,setRole]=useState('alle')
  useEffect(()=>{fetch('./companies.json').then(r=>r.json()).then(setAll).catch(()=>setAll([]))},[])
  const rows=useMemo(()=>all.filter(c=>(role==='alle'||c.role.includes(role))&&(!q||JSON.stringify([c.name,c.legal_name,c.brands,c.parent_ultimate,c.owners]).toLowerCase().includes(q.toLowerCase()))),[all,q,role])
  const cols=useMemo<ColDef<C>[]>(()=>[
    {headerName:'Firma',field:'name',pinned:'left',minWidth:300,flex:2,filter:'agTextColumnFilter',autoHeight:true,wrapText:true,cellRenderer:(p:any)=>{const c:C=p.data;return <div className="flex items-center gap-3 py-2"><Logo c={c}/><div className="leading-tight min-w-0"><div className="font-semibold">{c.legal_name||c.name}</div><div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap"><Flag country={c.country}/>{ROLE[c.role.split('+')[0]]??c.role}{c.website&&<a href={c.website} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline inline-flex items-center gap-0.5">Web<ExternalLink size={10}/></a>}</div></div></div>}},
    {...H('Umsatz','revenue'),field:'revenue_eur_m',width:190,filter:'agNumberColumnFilter',wrapText:true,autoHeight:true,cellRenderer:(p:any)=>p.data.revenue?<div className="py-2 leading-tight"><div className="font-bold tabular-nums">{p.value!=null?fmt(p.value,1)+' Mio. €':''}{p.data.revenue_year&&<span className="ml-1 text-[11px] font-normal text-muted-foreground">({p.data.revenue_year})</span>}</div><div className="text-[10px] text-muted-foreground line-clamp-2" title={p.data.revenue}>{p.data.revenue}</div></div>:<Missing/>},
    {...H('Mitarbeiter','employees'),field:'employees_n',width:130,filter:'agNumberColumnFilter',cellRenderer:(p:any)=>p.data.employees?<span title={p.data.employees} className="tabular-nums font-semibold">{p.value!=null?fmt(p.value,0):p.data.employees}</span>:<Missing/>},
    {headerName:'Gegründet',field:'founded_year',width:110,filter:'agNumberColumnFilter',cellRenderer:(p:any)=>p.data.founded?<span title={p.data.founded} className="tabular-nums">{p.value??p.data.founded}</span>:<Missing/>},
    {...H('Eigentümer / Konzern','parent'),colId:'owner',minWidth:220,flex:1,wrapText:true,autoHeight:true,valueGetter:(p:any)=>p.data.parent_ultimate||p.data.owners||'',cellRenderer:(p:any)=>p.value?<div className="text-xs leading-tight py-2">{p.value}{p.data.parent_ultimate&&<Badge className="ml-1 bg-emerald-100 text-emerald-800">GLEIF</Badge>}</div>:<Missing/>},
    {...H('Werke','plants'),colId:'plants',width:90,valueGetter:(p:any)=>p.data.plants.length,cellRenderer:(p:any)=><span title={p.data.plants.map((x:any)=>x.address+' '+(x.approval_code||'')).join('\n')} className="font-semibold">{p.value||'–'}</span>},
    {...H('Produkte','products'),colId:'pc',width:100,sort:'desc',valueGetter:(p:any)=>p.data.product_count||p.data.chain_product_count||0,cellRenderer:(p:any)=><span className="rounded-full bg-muted px-2 py-0.5 font-bold tabular-nums">{p.value}</span>},
    {...H('Median Preis','price'),field:'median_price_eur',width:115,filter:'agNumberColumnFilter',valueFormatter:(p:any)=>p.value==null?'–':fmt(p.value,2)+' €'},
    {...H('€/10 g Protein','e10'),field:'median_eur_per_10g_protein',width:125,filter:'agNumberColumnFilter',cellRenderer:(p:any)=>p.value==null?<span className="text-slate-400">–</span>:<span className="rounded-md bg-emerald-600 px-2 py-0.5 font-bold text-white tabular-nums">{fmt(p.value,2)} €</span>},
    {...H('FN / Register','fn'),colId:'fn',width:130,valueGetter:(p:any)=>p.data.fn||p.data.register_id||'',cellRenderer:(p:any)=>p.value?<span className="font-mono text-xs">{p.value}</span>:<Missing/>},
    {...H('LEI','lei'),field:'lei',width:120,cellRenderer:(p:any)=>p.value?<a href={'https://search.gleif.org/#/record/'+p.value} target="_blank" rel="noreferrer" className="font-mono text-[10px] text-emerald-700 hover:underline">{p.value.slice(0,10)}…</a>:<span className="text-[11px] text-slate-400">kein Treffer</span>},
    {headerName:'Marken',field:'brands',minWidth:220,flex:1,tooltipValueGetter:(p:any)=>(p.value||[]).join(', '),cellRenderer:(p:any)=><div className="flex gap-1 py-2 overflow-hidden">{(p.value||[]).slice(0,4).map((b:string)=><Badge key={b} className="bg-muted">{b}</Badge>)}</div>},
    {headerName:'Adresse',field:'address',minWidth:200,wrapText:true,autoHeight:true,cellClass:'text-xs leading-tight py-2'},
  ],[])
  const withRev=rows.filter(c=>c.revenue_eur_m!=null).sort((a,b)=>b.revenue_eur_m!-a.revenue_eur_m!).slice(0,15)
  const byProd=[...rows].sort((a,b)=>(b.product_count||0)-(a.product_count||0)).filter(c=>c.product_count).slice(0,15)
  const byPli=rows.filter(c=>c.median_eur_per_10g_protein!=null&&c.product_count>=2).sort((a,b)=>a.median_eur_per_10g_protein!-b.median_eur_per_10g_protein!).slice(0,15)
  const short=(c:C)=>(c.legal_name||c.name).replace(/\s+(GmbH|AG|KG|OG|S\.p\.A\.|B\.V\.).*$/i,'').slice(0,22)
  const kpi:[string,number|string,any][]= [['Firmen',all.length,Building2],['mit LEI (GLEIF)',all.filter(c=>c.lei).length,Database],['mit Umsatz',all.filter(c=>c.revenue).length,Euro],['Werke',all.reduce((a,c)=>a+c.plants.length,0),Factory],['mit Mitarbeiterzahl',all.filter(c=>c.employees).length,Users]]
  const chart=(title:string,tip:string,data:C[],key:keyof C,unit:string)=><Card><CardHeader><CardTitle className="text-sm flex items-center gap-1">{title}<InfoTip text={tip}/></CardTitle></CardHeader><CardContent><div style={{height:Math.max(160,data.length*26)}}><ChartContainer config={{}} className="aspect-auto h-full w-full"><BarChart data={data.map(c=>({n:short(c),v:c[key],c}))} layout="vertical" margin={{left:10,right:30}}><CartesianGrid horizontal={false} strokeOpacity={.15}/><XAxis type="number" fontSize={11}/><YAxis type="category" dataKey="n" width={150} fontSize={11}/><Tooltip formatter={(v:any)=>fmt(v,2)+' '+unit}/><Bar dataKey="v" radius={[0,6,6,0]}>{data.map(c=><Cell key={c.slug} fill={prodColor(c.slug)}/>)}</Bar></BarChart></ChartContainer></div>{!data.length&&<div className="text-sm text-muted-foreground">Keine verifizierten Werte.</div>}</CardContent></Card>
  return <div className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-extrabold tracking-tight">Firmenvergleich</h2><p className="text-sm text-muted-foreground">Hersteller, Markeninhaber und Handel: Registerdaten (GLEIF/Firmenbuch), Umsatz, Mitarbeiter, Werke und Preis-Leistung ihrer Produkte. Fehlende Werte sind markiert, nichts ist geschätzt.</p></div>
      <div className="flex gap-2"><Input placeholder="Firma, Marke, Konzern…" value={q} onChange={e=>setQ(e.target.value)} className="w-56"/>{['alle','producer','retailer','brand_owner'].map(r=><button key={r} onClick={()=>setRole(r)} className={cn('rounded-full px-3 h-9 text-xs font-semibold border',role===r?'bg-foreground text-background':'bg-card')}>{r==='alle'?'Alle':ROLE[r]}</button>)}</div></div>
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{kpi.map(([l,v,I])=><div key={l} className="rounded-2xl bg-card border border-border/70 shadow-card px-3 py-3"><I size={16} className="text-brand mb-1"/><div className="text-xl font-extrabold tabular-nums">{v}</div><div className="text-[11px] text-muted-foreground">{l}</div></div>)}</div>
    <div className={cn(dark?'ag-theme-quartz-dark':'ag-theme-quartz','rounded-2xl overflow-hidden border')} style={{height:620}}><AgGridReact<C> rowData={rows} columnDefs={cols} defaultColDef={{sortable:true,resizable:true}} tooltipShowDelay={100} rowHeight={60}/></div>
    <div className="grid lg:grid-cols-3 gap-4">
      {chart('Umsatz (Mio. €)',TIP.revenue,withRev,'revenue_eur_m','Mio. €')}
      {chart('Produkte in der App',TIP.products,byProd,'product_count','Produkte')}
      {chart('Günstigstes Protein (Median €/10 g)',TIP.e10+' Nur Firmen mit ≥2 Produkten.',byPli,'median_eur_per_10g_protein','€')}
    </div>
    <p className="text-[11px] text-muted-foreground">Quellen: GLEIF API (CC0), Statistik Austria ÖVIS, Firmenbuch-Jahresabschlüsse/Presse laut Hersteller-Recherche. Rohdaten: <a className="underline" href="https://github.com/servas-ai/fertiggerichte-daten" target="_blank" rel="noreferrer">servas-ai/fertiggerichte-daten</a>.</p>
  </div>
}

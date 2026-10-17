import { useMemo, useRef, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { ExternalLink } from 'lucide-react'
import { KPI, STAGES } from '../components/info'
import { RowHover, Img, Price, ScoreBar, Actions, BrandLogo, PliBadge, StoreLogo } from '../components/product'
import { fmt, useApp, type Row } from '../lib'
import { rowLinkLabel, isGenericLink } from '../app/linkKind'
export default function Grid({rows,sort='eur10p'}:{rows:Row[];sort?:string}){
  const {open,compare,setCompare,dark,wide,nearest}=useApp()
  const ref=useRef<AgGridReact<Row>>(null)
  const nf=(d:number)=>(p:any)=>fmt(p.value,d)
  const num=(h:string,f:keyof Row,w:number,d=1):ColDef<Row>=>({headerName:h,field:f,width:w,filter:'agNumberColumnFilter',type:'numericColumn',valueFormatter:nf(d),headerTooltip:'ℹ️ '+(KPI[f as string]??h)})
  const cols=useMemo<ColDef<Row>[]>(()=>[
    {headerName:'',width:44,checkboxSelection:true,headerCheckboxSelection:false,sortable:false,filter:false,pinned:'left'},
    {headerName:'Foto',field:'img',width:72,pinned:'left',sortable:false,filter:false,cellRenderer:(p:any)=><RowHover r={p.data}><div className="py-1.5"><Img src={p.value} zoom={false}/></div></RowHover>},
    {headerName:'Produkt',field:'name',minWidth:240,flex:2,filter:'agTextColumnFilter',wrapText:true,autoHeight:true,cellRenderer:(p:any)=><div className="leading-tight py-1.5 space-y-1"><button className="font-medium text-left hover:text-brand hover:underline" onClick={()=>open(p.data.id)}>{p.value}</button><div className="text-xs text-muted-foreground">{p.data.brand}</div></div>},
    {headerName:'Marke',field:'brandN',width:140,filter:'agTextColumnFilter',cellRenderer:(p:any)=><div className="flex items-center gap-1.5 h-full"><BrandLogo r={p.data} size={26}/></div>},
    {headerName:'Laden',field:'store',width:130,filter:'agTextColumnFilter',cellRenderer:(p:any)=><div className="flex items-center h-full"><StoreLogo store={p.value} size={28}/></div>},
    {headerName:'Filiale',colId:'dist',headerTooltip:'ℹ️ '+KPI.dist,width:120,filter:'agNumberColumnFilter',valueGetter:(p:any)=>{const s=nearest(p.data.store);return s?(s.walk_m??s.dist):null},cellRenderer:(p:any)=>{const s=nearest(p.data.store);return s?<a href={s.gmaps} target="_blank" rel="noreferrer" className="text-xs text-foreground hover:underline leading-tight block py-1.5" title={s.addr??''}>{p.value<1000?Math.round(p.value/10)*10+' m':(p.value/1000).toFixed(1)+' km'}<br/><span className="text-muted-foreground">{(s.addr??'').split(',')[0]}</span></a>:'–'}},
    {headerName:'Fertigstufe',field:'stage',width:150,headerTooltip:'ℹ️ '+KPI.stage,valueFormatter:(p:any)=>{const x=STAGES.find(s=>s[0]===p.value);return x?x[2]:''}},
    {headerName:'Verpackung',field:'pack',width:150,headerTooltip:'ℹ️ '+KPI.pack,valueFormatter:(p:any)=>p.value,filter:'agTextColumnFilter',wrapText:true,cellClass:'text-xs leading-tight'},
    {headerName:'Preis',field:'price',width:165,pinned:'left',filter:'agNumberColumnFilter',cellRenderer:(p:any)=><div className="text-sm"><Price r={p.data}/></div>},
    {headerName:'€ / 10 g Protein',field:'eur10p',width:120,headerTooltip:'ℹ️ '+KPI.eur10p,pinned:'left',filter:'agNumberColumnFilter',cellRenderer:(p:any)=>p.value==null?<span className="text-muted-foreground">–</span>:<span className="font-semibold tabular-nums">{fmt(p.value,2)} €</span>},
    {headerName:'Health-Score',field:'score',width:175,headerTooltip:'ℹ️ '+KPI.score,pinned:'left',filter:'agNumberColumnFilter',cellRenderer:(p:any)=><div className="h-full flex items-center"><ScoreBar r={p.data}/></div>},
    {headerName:'PLI',field:'pli',width:90,filter:'agNumberColumnFilter',headerTooltip:'ℹ️ '+KPI.pli,cellRenderer:(p:any)=><PliBadge v={p.value}/>},
    num('€/Portion','pPor',95,2),num('€/100 g','p100g',85,2),num('Protein/Portion','protPor',110),num('kcal/Portion','kcalPor',100,0),num('Salz/Portion','saltPor',100,2),num('Salz % Tag','saltPct',95,0),num('€/kg','ppk',85,2),num('€/100 kcal','eur100k',100,2),num('Protein/Pkg','protpack',105),num('Prot./100kcal','p100k',110),num('kcal/100g','kcal',95,0),num('Salz','salt',80,2),num('ges. Fett','sat',85),num('Zucker','sugar',85),num('Ballastst.','fib',90),
    num('Protein/€','ppe',95),
    {headerName:'Hersteller',field:'herst',minWidth:170,flex:1,filter:'agTextColumnFilter',wrapText:true,cellRenderer:(p:any)=><div className="text-xs leading-tight py-1.5">{p.value}{p.data.ort&&<div className="text-muted-foreground">{p.data.ort}</div>}</div>},
    {headerName:'',width:90,sortable:false,filter:false,cellRenderer:(p:any)=><div className="flex items-center h-full"><Actions r={p.data}/>{p.data.url&&<a href={p.data.url} target="_blank" rel="noreferrer" title={rowLinkLabel(p.data)??"Im Shop öffnen"} className={"p-1.5 hover:text-brand "+(isGenericLink(p.data.url)||p.data.linkPack?"text-amber-500":"text-slate-400")}><ExternalLink size={15}/></a>}</div>},
  ],[open,nearest])
  useEffect(()=>{const api=ref.current?.api;if(!api)return;api.forEachNode(n=>n.setSelected(compare.includes(n.data!.id),false,'api'))},[compare,rows])
  return <div className={(dark?'ag-theme-quartz-dark':'ag-theme-quartz')+' w-full'} style={{height:'calc(100vh - 230px)',minHeight:480}}>
    <AgGridReact<Row> tooltipShowDelay={150} key={sort} ref={ref} rowData={rows} columnDefs={cols} getRowId={p=>String(p.data.id)} defaultColDef={{sortable:true,resizable:true,filter:true,comparator:(a:any,b:any,_n:any,_m:any,desc:boolean)=>{if(a==null&&b==null)return 0;if(a==null)return desc?-1:1;if(b==null)return desc?1:-1;return typeof a==='number'?a-b:String(a).localeCompare(String(b))}}} rowHeight={wide?52:60} rowSelection="multiple" suppressRowClickSelection
      onSelectionChanged={e=>{if(e.source==='api')return;const ids=e.api.getSelectedRows().map(r=>r.id);setCompare(ids.slice(-4))}}
      onFirstDataRendered={e=>e.api.forEachNode(n=>n.setSelected(compare.includes(n.data!.id),false,'api'))}
      pagination paginationPageSize={wide?100:50} paginationPageSizeSelector={[25,50,100,200,500]} enableCellTextSelection/></div>
}

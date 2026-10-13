import { clsx, type ClassValue } from 'clsx'; import { twMerge } from 'tailwind-merge'
import { useEffect, useState, createContext, useContext } from 'react'
export const cn=(...c:ClassValue[])=>twMerge(clsx(c))
export const fmt=(v:number|null|undefined,d=1)=>v==null?'–':v.toLocaleString('de-AT',{maximumFractionDigits:d})
export const scoreColor=(s:number|null)=>s==null?'#94a3b8':s>=60?'#16a34a':s>=45?'#65a30d':s>=30?'#eab308':s>=20?'#f97316':'#dc2626'
export type Row={id:number;img:string|null;name:string;brand:string;store:string;pack:string;price:number|null;pstat:string|null;ppk:number|null;size:number|null;protpack:number|null;p100:number|null;p100k:number|null;kcal:number|null;kcalpack:number|null;salt:number|null;sat:number|null;fib:number|null;sugar:number|null;fat:number|null;carbs:number|null;score:number|null;ppe:number|null;pid:string|null;herst:string;ort:string;ooe:boolean;mp:string;url:string|null;bio:boolean;vegan:boolean;rankable:boolean;dry:boolean;incomplete:boolean;flags:string[];ns:string|null;manuf:string|null;origin:string|null;psrc:string|null;src:string|null;state:string|null;prep:string|null;eur10p:number|null;eur100k:number|null;pli:number|null;pliLight?:number|null;alsoAt?:string[];brandN:string;logo:string|null;cprot:string[];cdish:string[];priceOnly?:boolean;prodSlug?:string|null;stage:string;nonfood?:boolean;noBrand?:boolean;kiloErr?:boolean;portion:number|null;pPor:number|null;p100g:number|null;protPor:number|null;kcalPor:number|null;saltPor:number|null;saltPct:number|null;p2?:any;qa?:any[];dishKey?:string|null;dish?:string|null}
export type Side={id:number;name:string;brand:string;role:'veg'|'salad'|'side';img:string|null;url:string;price:number;size:number;portion:number;kcal:number;prot:number;fib:number;salt:number;cost:number;mp:string;cat:string}
export type Data={producers:any[];companyLogos:Record<string,string>;qaStats:any;catIcon:Record<string,string>;catProt:string[];catDish:string[];topPLI:number[];topLight?:number[];rows:Row[];sides:Side[];topHealth:number[];topPE:number[];stats:Record<string,any>;same:{code:string;herst:string;ort:string;ooe:boolean;ids:number[]}[];ftg:any[];combos:{main:number;veg:number;side:number|null;kcal:number;prot:number;price:number;fib:number}[]}
// URL hash state
export function readHash():Record<string,string>{return Object.fromEntries(new URLSearchParams(location.hash.slice(1)))}
export function useHashState<T extends string=string>(key:string,def:T|string):[T,(v:T|string)=>void]{
  type V=T
  const [v,setV]=useState<V>(()=>(readHash()[key] as V)??(def as V))
  useEffect(()=>{const h=()=>setV(((readHash()[key]) as V)??(def as V));addEventListener('hashchange',h);return()=>removeEventListener('hashchange',h)},[key])
  const set=(nv:T|string)=>{const p=new URLSearchParams(location.hash.slice(1));if(nv===def||nv==='')p.delete(key);else p.set(key,nv);history.replaceState(null,'','#'+p.toString());setV(nv as V)}
  return [v,set]
}
export function useLocal<T>(key:string,def:T):[T,(v:T)=>void]{
  const [v,setV]=useState<T>(()=>{try{const s=localStorage.getItem(key);return s?JSON.parse(s):def}catch{return def}})
  return [v,(nv:T)=>{setV(nv);try{localStorage.setItem(key,JSON.stringify(nv))}catch{}}]
}
export type Ctx={D:Data;R:Row[];stageSel:string[];compare:number[];toggleCompare:(id:number)=>void;setCompare:(ids:number[])=>void;favs:number[];toggleFav:(id:number)=>void;open:(id:number)=>void;dark:boolean;wide:boolean;stores:Stores|null;nearest:(store:string)=>Shop|null}
export const AppCtx=createContext<Ctx>(null as any)
export const useApp=()=>useContext(AppCtx)

export const healthyCheap=(R:Row[],min=45)=>R.filter(r=>r.rankable&&r.eur10p!=null&&r.pstat==='live 2026'&&(r.score??0)>=min).sort((a,b)=>a.eur10p!-b.eur10p!)
export type Shop={chain:string;name:string;addr:string|null;lat:number;lon:number;dist:number;walk_m?:number;walk_min?:number;gmaps:string;hours?:string}
export type Stores={home:{addr:string;lat:number;lon:number};shops:Shop[]}
export const STORE_LOGO:Record<string,string>={Billa:'logos/billa.png',Spar:'logos/spar.png',Hofer:'logos/hofer.png',Lidl:'logos/lidl.png',Penny:'logos/penny.png',dm:'logos/dm.png',"Denn's":'logos/denns.png','Fit to Go':'analysis/logos/fit-to-go.png',Gurkerl:'logos/gurkerl.svg',PrepMyMeal:'logos/prepmymeal.png',LiveFresh:'logos/livefresh.png',FitTaste:'logos/fittaste.png'}
export const fmtDist=(m?:number|null)=>m==null?'–':m<1000?`${Math.round(m/10)*10} m`:`${(m/1000).toLocaleString('de-AT',{maximumFractionDigits:1})} km`

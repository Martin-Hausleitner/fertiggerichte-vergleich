import { clsx, type ClassValue } from 'clsx'; import { twMerge } from 'tailwind-merge'
export const cn=(...c:ClassValue[])=>twMerge(clsx(c))
export const fmt=(v:number|null|undefined,d=1)=>v==null?'–':v.toLocaleString('de-AT',{maximumFractionDigits:d})
export const scoreColor=(s:number|null)=>s==null?'#cbd5e1':s>=60?'#16a34a':s>=45?'#65a30d':s>=30?'#eab308':s>=20?'#f97316':'#dc2626'

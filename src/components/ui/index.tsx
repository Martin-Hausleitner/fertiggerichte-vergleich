import * as React from 'react'; import { cn } from '../../lib'
export const Card=({className,...p}:React.HTMLAttributes<HTMLDivElement>)=><div className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900',className)} {...p}/>
export const Badge=({className,...p}:React.HTMLAttributes<HTMLSpanElement>)=><span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',className)} {...p}/>
export const Button=({className,active,size='md',...p}:React.ButtonHTMLAttributes<HTMLButtonElement>&{active?:boolean;size?:'sm'|'md'})=><button className={cn('inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition disabled:opacity-40',size==='sm'?'px-2 py-1 text-xs':'px-3 py-1.5 text-sm',active?'bg-brand text-white border-brand':'bg-white hover:bg-slate-100 border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800',className)} {...p}/>
export const Select=({className,...p}:React.SelectHTMLAttributes<HTMLSelectElement>)=><select className={cn('rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:bg-slate-900 dark:border-slate-700',className)} {...p}/>
export const Input=({className,...p}:React.InputHTMLAttributes<HTMLInputElement>)=><input className={cn('rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm dark:bg-slate-900 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand/40',className)} {...p}/>
export function Sheet({open,onClose,side='right',title,children}:{open:boolean;onClose:()=>void;side?:'right'|'bottom';title?:React.ReactNode;children:React.ReactNode}){
  React.useEffect(()=>{const k=(e:KeyboardEvent)=>e.key==='Escape'&&onClose();addEventListener('keydown',k);return()=>removeEventListener('keydown',k)},[onClose])
  if(!open) return null
  return <div className="fixed inset-0 z-50"><div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose}/>
    <div className={cn('absolute bg-white dark:bg-slate-900 shadow-2xl flex flex-col',side==='right'?'right-0 top-0 h-full w-full sm:w-[560px] lg:w-[680px]':'bottom-0 left-0 right-0 max-h-[88vh] rounded-t-2xl')}>
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3"><div className="font-semibold">{title}</div><button onClick={onClose} className="rounded-md px-2 py-1 text-xl leading-none hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Schließen">×</button></div>
      <div className="overflow-y-auto p-4 flex-1">{children}</div></div></div>
}
export const CardHeader=({className,...p}:React.HTMLAttributes<HTMLDivElement>)=><div className={cn('flex flex-col gap-1 p-4 pb-2',className)} {...p}/>
export const CardTitle=({className,...p}:React.HTMLAttributes<HTMLHeadingElement>)=><h3 className={cn('font-semibold leading-tight tracking-tight',className)} {...p}/>
export const CardContent=({className,...p}:React.HTMLAttributes<HTMLDivElement>)=><div className={cn('px-4 pb-3',className)} {...p}/>
export const CardFooter=({className,...p}:React.HTMLAttributes<HTMLDivElement>)=><div className={cn('flex items-center border-t border-slate-100 dark:border-slate-800 px-4 py-2.5',className)} {...p}/>

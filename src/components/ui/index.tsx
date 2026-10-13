import * as React from 'react'; import { cn } from '../../lib'
import { X } from 'lucide-react'
import { buttonVariants } from './button'
export { buttonVariants } from './button'; export { Separator } from './separator'
export const Card=({className,...p}:React.HTMLAttributes<HTMLDivElement>)=><div className={cn('rounded-2xl border border-border/70 bg-card text-card-foreground shadow-card',className)} {...p}/>
export const Badge=({className,...p}:React.HTMLAttributes<HTMLSpanElement>)=><span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',className)} {...p}/>
export const Button=({className,active,size='md',...p}:React.ButtonHTMLAttributes<HTMLButtonElement>&{active?:boolean;size?:'sm'|'md'})=><button className={cn(buttonVariants({variant:active?'default':'outline',size:size==='sm'?'sm':'default'}),'rounded-full shadow-none',size==='sm'&&'h-8 px-3 text-xs',!active&&'bg-card hover:bg-accent hover:text-accent-foreground',className)} {...p}/>
export const Select=({className,...p}:React.SelectHTMLAttributes<HTMLSelectElement>)=><select className={cn('h-9 rounded-full border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 cursor-pointer',className)} {...p}/>
export const Input=({className,...p}:React.InputHTMLAttributes<HTMLInputElement>)=><input className={cn('h-9 rounded-full border border-input bg-card px-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40',className)} {...p}/>
export function Sheet({open,onClose,side='right',title,children}:{open:boolean;onClose:()=>void;side?:'right'|'bottom';title?:React.ReactNode;children:React.ReactNode}){
  React.useEffect(()=>{const k=(e:KeyboardEvent)=>e.key==='Escape'&&onClose();addEventListener('keydown',k);return()=>removeEventListener('keydown',k)},[onClose])
  if(!open) return null
  return <div className="fixed inset-0 z-50"><div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in-0" onClick={onClose}/>
    <div className={cn('absolute bg-background shadow-2xl flex flex-col animate-in duration-200',side==='right'?'right-0 top-0 h-full w-full sm:w-[560px] lg:w-[680px] sm:rounded-l-3xl slide-in-from-right':'bottom-0 left-0 right-0 max-h-[88vh] rounded-t-3xl slide-in-from-bottom')}>
      <div className="flex items-center justify-between border-b px-5 py-3.5"><div className="font-semibold text-lg">{title}</div><button onClick={onClose} className="rounded-full p-2 hover:bg-muted" aria-label="Schließen"><X size={18}/></button></div>
      <div className="overflow-y-auto p-5 flex-1">{children}</div></div></div>
}
export const CardHeader=({className,...p}:React.HTMLAttributes<HTMLDivElement>)=><div className={cn('flex flex-col gap-1 p-5 pb-2',className)} {...p}/>
export const CardTitle=({className,...p}:React.HTMLAttributes<HTMLHeadingElement>)=><h3 className={cn('font-semibold leading-tight tracking-tight',className)} {...p}/>
export const CardContent=({className,...p}:React.HTMLAttributes<HTMLDivElement>)=><div className={cn('px-5 pb-4',className)} {...p}/>
export const CardFooter=({className,...p}:React.HTMLAttributes<HTMLDivElement>)=><div className={cn('flex items-center border-t px-5 py-3',className)} {...p}/>

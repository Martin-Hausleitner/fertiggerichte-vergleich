import * as React from 'react'; import * as T from '@radix-ui/react-tabs'; import { cn } from '../../lib'
export const Card=({className,...p}:React.HTMLAttributes<HTMLDivElement>)=><div className={cn('rounded-xl border bg-white shadow-sm',className)} {...p}/>
export const Badge=({className,...p}:React.HTMLAttributes<HTMLSpanElement>)=><span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',className)} {...p}/>
export const Button=({className,active,...p}:React.ButtonHTMLAttributes<HTMLButtonElement>&{active?:boolean})=><button className={cn('rounded-md border px-3 py-1.5 text-sm transition',active?'bg-brand text-white border-brand':'bg-white hover:bg-slate-100',className)} {...p}/>
export const Tabs=T.Root
export const TabsList=({className,...p}:T.TabsListProps)=><T.List className={cn('flex flex-wrap gap-1 rounded-lg bg-slate-200/70 p-1',className)} {...p}/>
export const TabsTrigger=({className,...p}:T.TabsTriggerProps)=><T.Trigger className={cn('rounded-md px-3 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:text-brand data-[state=active]:shadow font-medium',className)} {...p}/>
export const TabsContent=T.Content
export const Select=({className,...p}:React.SelectHTMLAttributes<HTMLSelectElement>)=><select className={cn('rounded-md border bg-white px-2 py-1.5 text-sm',className)} {...p}/>
export const Input=({className,...p}:React.InputHTMLAttributes<HTMLInputElement>)=><input className={cn('rounded-md border bg-white px-2 py-1.5 text-sm',className)} {...p}/>

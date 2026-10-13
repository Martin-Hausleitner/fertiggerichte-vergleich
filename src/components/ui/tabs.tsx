import * as T from '@radix-ui/react-tabs'
import type React from 'react'
import { cn } from '../../lib'
export const Tabs=T.Root
export const TabsList=({className,...p}:React.ComponentProps<typeof T.List>)=><T.List className={cn('inline-flex h-8 items-center rounded-lg bg-slate-100 p-0.5 text-slate-500 dark:bg-slate-800 dark:text-slate-400 w-full',className)} {...p}/>
export const TabsTrigger=({className,...p}:React.ComponentProps<typeof T.Trigger>)=><T.Trigger onClick={e=>e.stopPropagation()} className={cn('flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-white',className)} {...p}/>
export const TabsContent=({className,...p}:React.ComponentProps<typeof T.Content>)=><T.Content className={cn('mt-2 focus-visible:outline-none',className)} {...p}/>

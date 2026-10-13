import { Salad, MapPin, ExternalLink } from 'lucide-react'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar } from '@/components/ui/sidebar'
import { TAB_GROUPS } from './tabs'

type Props = { tab: string; onSelect: (key: string) => void }

export function AppSidebar({ tab, onSelect }: Props) {
  const { isMobile, setOpenMobile } = useSidebar()
  const go = (k: string) => { onSelect(k); if (isMobile) setOpenMobile(false) }
  return <Sidebar collapsible="icon">
    <SidebarHeader>
      <SidebarMenu><SidebarMenuItem>
        <SidebarMenuButton size="lg" onClick={() => go('alle')} tooltip="Fertigvergleich">
          <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-foreground text-background"><Salad className="size-4" /></div>
          <div className="grid flex-1 text-left leading-tight"><span className="truncate font-semibold">Fertigvergleich</span><span className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="size-3" />Linz · Gruberstraße 19</span></div>
        </SidebarMenuButton>
      </SidebarMenuItem></SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      {TAB_GROUPS.map(g => <SidebarGroup key={g.label}>
        <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
        <SidebarGroupContent><SidebarMenu>
          {g.tabs.map(({ key, label, icon: Icon }) => <SidebarMenuItem key={key}>
            <SidebarMenuButton isActive={tab === key} tooltip={label} onClick={() => go(key)}><Icon /><span>{label}</span></SidebarMenuButton>
          </SidebarMenuItem>)}
        </SidebarMenu></SidebarGroupContent>
      </SidebarGroup>)}
    </SidebarContent>
    <SidebarFooter>
      <SidebarMenu><SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Einkaufsanalyse"><a href="https://servas-ai.github.io/einkaufsanalyse/"><ExternalLink /><span>Einkaufsanalyse</span></a></SidebarMenuButton>
      </SidebarMenuItem></SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
}

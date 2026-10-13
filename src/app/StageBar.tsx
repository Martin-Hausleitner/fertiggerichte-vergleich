import { STAGES, InfoTip } from '@/components/info'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Row } from '@/lib'

type Props = { rows: Row[]; selected: string[]; onChange: (next: string[]) => void }

/** Course/stage filter (Hauptgericht, Eintopf, …) as a shadcn multi toggle group. */
export function StageBar({ rows, selected, onChange }: Props) {
  const count = (k: string) => rows.filter(r => r.stage === k).length
  return <div className="flex items-center gap-2 overflow-x-auto scroll-x">
    <ToggleGroup type="multiple" size="sm" value={selected} onValueChange={v => onChange(v.length ? v : ['meal', 'stew'])} className="justify-start">
      {STAGES.map(([k, e, l]) => <ToggleGroupItem key={k} value={k} variant="outline" className="h-8 gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] data-[state=on]:bg-foreground data-[state=on]:text-background">
        <span aria-hidden>{e}</span>{l}<span className="tabular-nums text-[11px] opacity-60">{count(k)}</span>
      </ToggleGroupItem>)}
    </ToggleGroup>
    <InfoTip k="stage" />
  </div>
}

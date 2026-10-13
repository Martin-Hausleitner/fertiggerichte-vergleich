import { Area, AreaChart, Bar, BarChart, CartesianGrid, PolarAngleAxis, RadialBar, RadialBarChart, Treemap, XAxis, YAxis, Line, LineChart } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { cn, fmt, type Row } from '@/lib'
import { CHART_COLORS, colorOf } from './palette'

export function histogram(vals: number[], bins: number, max: number) {
  const h = Array.from({ length: bins }, (_, i) => ({ x: +(i * max / bins).toFixed(2), n: 0 }))
  vals.forEach(v => { const i = Math.min(bins - 1, Math.max(0, Math.floor(v / max * bins))); h[i].n++ })
  return h
}

export function AreaDist({ data, color = CHART_COLORS[0], label, unit, height = 220 }: { data: { x: number; n: number }[]; color?: string; label: string; unit: string; height?: number }) {
  const cfg = { n: { label, color } } satisfies ChartConfig
  return <ChartContainer config={cfg} className="aspect-auto w-full" style={{ height }}>
    <AreaChart data={data} margin={{ left: 0, right: 8 }}><CartesianGrid vertical={false} /><XAxis dataKey="x" tickLine={false} axisLine={false} tickFormatter={v => `${v}${unit}`} minTickGap={24} /><YAxis width={30} tickLine={false} axisLine={false} />
      <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => `ab ${p?.[0]?.payload?.x}${unit}`} />} />
      <defs><linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-n)" stopOpacity={0.5} /><stop offset="95%" stopColor="var(--color-n)" stopOpacity={0.05} /></linearGradient></defs>
      <Area type="monotone" dataKey="n" stroke="var(--color-n)" strokeWidth={2} fill={`url(#g-${label})`} /></AreaChart>
  </ChartContainer>
}

export function Radial({ value, label, color = CHART_COLORS[0], size = 160 }: { value: number; label: string; color?: string; size?: number }) {
  return <div className="relative" style={{ width: size, height: size }}>
    <ChartContainer config={{ v: { label, color } }} className="aspect-square h-full w-full">
      <RadialBarChart data={[{ v: value }]} innerRadius="72%" outerRadius="100%" startAngle={90} endAngle={-270}><PolarAngleAxis type="number" domain={[0, 100]} tick={false} /><RadialBar dataKey="v" background cornerRadius={8} fill="var(--color-v)" /></RadialBarChart>
    </ChartContainer>
    <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold tabular-nums">{fmt(value, 0)}</span><span className="text-[11px] text-muted-foreground">{label}</span></div>
  </div>
}

export function StackedBars({ data, keys, height = 280, xKey = 'name' }: { data: Record<string, string | number>[]; keys: string[]; height?: number; xKey?: string }) {
  const cfg: ChartConfig = Object.fromEntries(keys.map((k, i) => [k, { label: k, color: CHART_COLORS[i % CHART_COLORS.length] }]))
  return <ChartContainer config={cfg} className="aspect-auto w-full" style={{ height }}>
    <BarChart data={data}><CartesianGrid vertical={false} /><XAxis dataKey={xKey} tickLine={false} axisLine={false} interval={0} angle={-30} textAnchor="end" height={50} fontSize={11} /><YAxis width={34} tickLine={false} axisLine={false} />
      <ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} />
      {keys.map((k, i) => <Bar key={k} dataKey={k} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} radius={i === keys.length - 1 ? [4, 4, 0, 0] : 0} />)}
    </BarChart>
  </ChartContainer>
}

export function TreemapChart({ data, height = 300 }: { data: { name: string; size: number }[]; height?: number }) {
  const Cell = (p: any) => { const { x, y, width, height: h, name } = p; if (width < 2 || h < 2) return null
    return <g><rect x={x} y={y} width={width} height={h} fill={colorOf(name ?? '')} stroke="hsl(var(--background))" strokeWidth={2} rx={4} />{width > 56 && h > 22 && <text x={x + 6} y={y + 16} fill="#fff" fontSize={11} fontWeight={600}>{String(name).slice(0, Math.floor(width / 7))}</text>}</g> }
  return <ChartContainer config={{}} className="aspect-auto w-full" style={{ height }}>
    <Treemap data={data} dataKey="size" nameKey="name" content={<Cell />} isAnimationActive={false}><ChartTooltip content={<ChartTooltipContent nameKey="name" />} /></Treemap>
  </ChartContainer>
}

export function Sparkline({ data, color = CHART_COLORS[1], width = 110, height = 28 }: { data: number[]; color?: string; width?: number; height?: number }) {
  return <ChartContainer config={{ v: { label: 'v', color } }} className="aspect-auto" style={{ width, height }}>
    <LineChart data={data.map((v, i) => ({ i, v }))} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}><Line type="monotone" dataKey="v" stroke="var(--color-v)" strokeWidth={1.75} dot={false} isAnimationActive={false} /></LineChart>
  </ChartContainer>
}

/** Heatmap-style grid: rows × cols, value → teal intensity; low = good when `lowGood`. */
export function HeatGrid({ rows, cols, get, fmtV, lowGood }: { rows: string[]; cols: string[]; get: (r: string, c: string) => number | null; fmtV: (v: number) => string; lowGood?: boolean }) {
  const vals = rows.flatMap(r => cols.map(c => get(r, c))).filter((v): v is number => v != null)
  const lo = Math.min(...vals), hi = Math.max(...vals)
  return <div className="overflow-x-auto"><table className="w-full border-separate border-spacing-1 text-xs">
    <thead><tr><th />{cols.map(c => <th key={c} className="whitespace-nowrap px-1 py-1 text-left font-medium text-muted-foreground">{c}</th>)}</tr></thead>
    <tbody>{rows.map(r => <tr key={r}><th className="whitespace-nowrap pr-2 text-left font-semibold" style={{ color: colorOf(r) }}>{r}</th>{cols.map(c => { const v = get(r, c); if (v == null) return <td key={c} className="rounded bg-muted/50 px-2 py-2 text-center text-muted-foreground">–</td>
      let t = hi > lo ? (v - lo) / (hi - lo) : 0.5; if (lowGood) t = 1 - t
      return <td key={c} className={cn('rounded px-2 py-2 text-center font-semibold tabular-nums', t > 0.55 ? 'text-white' : 'text-foreground')} style={{ background: `hsl(172 70% ${92 - t * 66}%)` }}>{fmtV(v)}</td> })}</tr>)}</tbody>
  </table></div>
}
export const median = (a: number[]) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
export const nums = (rows: Row[], k: (r: Row) => number | null | undefined) => rows.map(k).filter((v): v is number => v != null && isFinite(v))

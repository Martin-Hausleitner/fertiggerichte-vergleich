/**
 * Good Choice generative-UI spec (GenUI v1).
 *
 * Aligned with OpenUI (openui.com) where it makes sense:
 *  - every component = { name, description, props: z.object(...) } (like `defineComponent`)
 *  - a component library with a fixed `root` ("Stack") and `componentGroups`
 *  - invalid nodes are DROPPED (with an error list), the rest still renders
 * Difference: the wire format is plain JSON ({ type, props, children }) instead of the
 * line-based OpenUI Lang DSL, because MCP tool arguments are JSON anyway.
 *
 * Safety: no raw HTML, no scripts, no style/className passthrough, no event handlers.
 * Links/images must be https (or relative app assets). Actions are a closed whitelist that
 * the host app executes. Hard limits on depth, node count and table size.
 *
 * This file must stay pure (zod only, no React) – the MCP server imports it too.
 */
import { z } from 'zod'

export const GENUI_VERSION = 1
export const LIMITS = { maxDepth: 8, maxNodes: 300, maxRows: 200, maxCols: 12, maxText: 2000, maxLimit: 100 } as const

const text = (max: number = LIMITS.maxText) => z.string().max(max)
/** Allowlists (Sense-Check 2): KI-Specs dürfen nur auf eigene Seiten, bekannte Shops und Bild-CDNs verweisen. */
const OWN_HOSTS = ['servas-ai.github.io', 'martin-hausleitner.github.io']
export const IMG_HOSTS = [...OWN_HOSTS, 'images.cdn.europe-west1.gcp.commercetools.com', 'cdn1.interspar.at', 'www.interspar.at', 'cdn.gurkerl.at', 'images.openfoodfacts.org', 'res.cloudinary.com', 'cdn.shopify.com', 'd3hvwccx09j84u.cloudfront.net', 'www.nordsee.com', 'products.dm-static.com', 'dm.emea.cms.aldi.cx', 'imgproxy-retcat.assets.schwarz', 'www.nahundfrisch.at', 'images.dennree.de']
export const LINK_HOSTS = [...OWN_HOSTS, 'shop.billa.at', 'www.interspar.at', 'www.spar.at', 'www.gurkerl.at', 'www.hofer.at', 'www.mpreis.at', 'www.dm.at', 'www.penny.at', 'www.lidl.at', 'www.nahundfrisch.at', 'www.denns-biomarkt.at', 'fittogo.at', 'www.fittogo.at', 'fittaste.com', 'livefresh.at', 'prepmymeal.at', 'www.hellofresh.at', 'www.nordsee.com', 'www.subway.com', 'world.openfoodfacts.org', 'www.openstreetmap.org']
const RELATIVE = /^(?!\/\/)(?![a-z][a-z0-9+.-]*:)[\w./#?=&%-]+$/i
const hostOk = (u: string, hosts: string[]) => { try { const x = new URL(u); return x.protocol === 'https:' && !x.username && !x.password && hosts.includes(x.hostname.toLowerCase()) } catch { return false } }
const allowUrl = (hosts: string[], what: string) => z.string().max(2048).refine(u => RELATIVE.test(u) || hostOk(u, hosts), { message: `only relative URLs or https://${what} allowlisted hosts` })
/** Links (openUrl): relative oder https auf LINK_HOSTS */
export const safeUrl = allowUrl(LINK_HOSTS, 'link')
/** Bilder: relative oder https auf IMG_HOSTS */
export const safeImgUrl = allowUrl(IMG_HOSTS, 'image')
const tone = z.enum(['default', 'secondary', 'outline', 'destructive', 'success', 'warning'])

/** Product query – resolved by the host via window.goodChoice.search/filter/rank (no data inline needed). */
export const ProductQuery = z.object({
  q: text(200).optional(),
  ids: z.array(z.number().int()).max(LIMITS.maxLimit).optional(),
  stores: z.array(text(60)).max(30).optional(),
  stage: z.array(z.enum(['meal', 'stew', 'side', 'prot', 'sauce', 'base', 'veg'])).max(7).optional(),
  readyMealsOnly: z.boolean().optional(),
  vegan: z.boolean().optional(),
  vegetarian: z.boolean().optional(),
  bio: z.boolean().optional(),
  minScore: z.number().min(0).max(100).optional(),
  maxPrice: z.number().min(0).optional(),
  maxPricePerPortion: z.number().min(0).optional(),
  minProtein100: z.number().min(0).optional(),
  maxKcal100: z.number().min(0).optional(),
  maxSugar100: z.number().min(0).optional(),
  maxSalt100: z.number().min(0).optional(),
  sort: z.enum(['score', 'price', 'pricePerPortion', 'ppk', 'protein', 'value', 'kcal']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  limit: z.number().int().min(1).max(LIMITS.maxLimit).optional(),
}).strict()
export type ProductQuery = z.infer<typeof ProductQuery>

/** Closed action whitelist – executed by the host app, never eval'd. */
export const Action = z.discriminatedUnion('type', [
  z.object({ type: z.literal('setView'), view: text(60), params: z.record(z.string(), z.string().max(200)).optional() }).strict(),
  z.object({ type: z.literal('applyFilter'), query: ProductQuery }).strict(),
  z.object({ type: z.literal('openProduct'), id: z.number().int() }).strict(),
  z.object({ type: z.literal('compare'), ids: z.array(z.number().int()).max(10) }).strict(),
  z.object({ type: z.literal('openUrl'), url: safeUrl }).strict(),
])
export type Action = z.infer<typeof Action>

const column = z.object({ key: text(40), label: text(80), format: z.enum(['text', 'number', 'eur', 'g', 'kcal', 'score', 'badge']).optional() }).strict()
const cell = z.union([z.string().max(500), z.number(), z.boolean(), z.null()])

type Def = { description: string; group: string; props: z.ZodTypeAny; children: boolean }
/** Component library (names = PascalCase like OpenUI). */
export const COMPONENTS = {
  Stack: { group: 'Layout', children: true, description: 'Vertical (or horizontal) flex container. Root component.',
    props: z.object({ direction: z.enum(['vertical', 'horizontal']).optional(), gap: z.enum(['sm', 'md', 'lg']).optional(), wrap: z.boolean().optional() }).strict() },
  Grid: { group: 'Layout', children: true, description: 'Responsive grid with 1–4 columns.',
    props: z.object({ columns: z.number().int().min(1).max(4).optional() }).strict() },
  Card: { group: 'Layout', children: true, description: 'shadcn Card with optional title/description/footer text.',
    props: z.object({ title: text(200).optional(), description: text(500).optional(), footer: text(300).optional() }).strict() },
  Tabs: { group: 'Layout', children: true, description: 'Tabs; each child must be a Tab.',
    props: z.object({ defaultTab: text(60).optional() }).strict() },
  Tab: { group: 'Layout', children: true, description: 'One tab panel inside Tabs.',
    props: z.object({ id: text(60), label: text(80) }).strict() },
  Separator: { group: 'Layout', children: false, description: 'Horizontal rule.', props: z.object({}).strict() },
  Heading: { group: 'Content', children: false, description: 'Heading text (level 1–4).',
    props: z.object({ text: text(300), level: z.number().int().min(1).max(4).optional() }).strict() },
  Text: { group: 'Content', children: false, description: 'Plain paragraph (no markdown/HTML).',
    props: z.object({ text: text(), muted: z.boolean().optional(), size: z.enum(['sm', 'md']).optional() }).strict() },
  Badge: { group: 'Content', children: false, description: 'shadcn Badge.',
    props: z.object({ text: text(80), tone: tone.optional() }).strict() },
  Alert: { group: 'Content', children: false, description: 'Notice box, e.g. disclaimers.',
    props: z.object({ title: text(200).optional(), text: text(), tone: z.enum(['info', 'warning', 'destructive']).optional() }).strict() },
  Stat: { group: 'Content', children: false, description: 'KPI tile: label + value (+hint).',
    props: z.object({ label: text(80), value: z.union([text(80), z.number()]), unit: text(20).optional(), hint: text(200).optional() }).strict() },
  Image: { group: 'Content', children: false, description: 'Image (https or app asset only).',
    props: z.object({ src: safeImgUrl, alt: text(200), height: z.number().int().min(16).max(480).optional() }).strict() },
  Button: { group: 'Actions', children: false, description: 'shadcn Button that triggers a whitelisted action.',
    props: z.object({ label: text(80), action: Action, variant: z.enum(['default', 'secondary', 'outline', 'ghost']).optional() }).strict() },
  Table: { group: 'Data', children: false, description: 'Static shadcn Table with explicit columns and rows.',
    props: z.object({ columns: z.array(column).min(1).max(LIMITS.maxCols), rows: z.array(z.record(z.string(), cell)).max(LIMITS.maxRows), caption: text(300).optional() }).strict() },
  BarChart: { group: 'Data', children: false, description: 'Recharts bar chart via shadcn ChartContainer.',
    props: z.object({ data: z.array(z.record(z.string(), z.union([z.string().max(120), z.number()]))).max(LIMITS.maxRows), x: text(40), bars: z.array(z.object({ key: text(40), label: text(80) }).strict()).min(1).max(4), height: z.number().int().min(120).max(600).optional() }).strict() },
  ProductCard: { group: 'Products', children: false, description: 'Product card for one product id from data.json.',
    props: z.object({ id: z.number().int(), note: text(300).optional() }).strict() },
  ProductList: { group: 'Products', children: false, description: 'Products resolved by query, as cards or table.',
    props: z.object({ query: ProductQuery, display: z.enum(['cards', 'table']).optional(), columns: z.array(z.enum(['name', 'store', 'brand', 'price', 'pricePerPortion', 'kcal', 'protein', 'sugar', 'salt', 'score', 'ns'])).max(LIMITS.maxCols).optional(), title: text(200).optional() }).strict() },
  FilterBar: { group: 'Products', children: false, description: 'Read-only chips showing a query plus "apply in app" button.',
    props: z.object({ query: ProductQuery, label: text(80).optional() }).strict() },
} satisfies Record<string, Def>

export type ComponentName = keyof typeof COMPONENTS
export const COMPONENT_NAMES = Object.keys(COMPONENTS) as ComponentName[]
export const ROOT: ComponentName = 'Stack'

export type GenNode = { type: ComponentName; props: Record<string, any>; children?: GenNode[]; key?: string }
/** Recursive node schema (strict, used for JSON Schema export and full validation). */
export const NodeSchema: z.ZodType<GenNode> = z.lazy(() => z.object({
  type: z.enum(COMPONENT_NAMES as [ComponentName, ...ComponentName[]]),
  key: text(60).optional(),
  props: z.record(z.string(), z.unknown()).default({}),
  children: z.array(NodeSchema).max(100).optional(),
}).strict()) as any

export const SpecSchema = z.object({
  version: z.literal(GENUI_VERSION),
  title: text(200).optional(),
  root: NodeSchema,
}).strict()
export type GenSpec = { version: 1; title?: string; root: GenNode }

export type ValidationIssue = { path: string; message: string }
export type ValidationResult = { ok: boolean; spec: GenSpec | null; errors: ValidationIssue[]; dropped: number }

/**
 * Lenient validation à la OpenUI: invalid nodes are dropped, valid siblings survive.
 * `ok` is false only if the root itself is unusable.
 */
export function validateSpec(input: unknown): ValidationResult {
  const errors: ValidationIssue[] = []
  let count = 0, dropped = 0
  const raw = typeof input === 'string' ? safeJson(input, errors) : input
  if (!raw || typeof raw !== 'object') { errors.push({ path: '$', message: 'spec must be an object' }); return { ok: false, spec: null, errors, dropped } }
  const r = raw as any
  if (r.version !== GENUI_VERSION) errors.push({ path: '$.version', message: `version must be ${GENUI_VERSION} (assumed)` })
  const walk = (n: any, path: string, depth: number): GenNode | null => {
    if (depth > LIMITS.maxDepth) { errors.push({ path, message: `max depth ${LIMITS.maxDepth} exceeded` }); dropped++; return null }
    if (++count > LIMITS.maxNodes) { errors.push({ path, message: `max ${LIMITS.maxNodes} nodes exceeded` }); dropped++; return null }
    if (!n || typeof n !== 'object' || Array.isArray(n)) { errors.push({ path, message: 'node must be an object' }); dropped++; return null }
    const extra = Object.keys(n).filter(k => !['type', 'props', 'children', 'key'].includes(k))
    if (extra.length) errors.push({ path, message: `ignored unknown keys: ${extra.join(', ')}` })
    const def = (COMPONENTS as Record<string, Def>)[n.type]
    if (!def) { errors.push({ path, message: `unknown component "${String(n.type).slice(0, 40)}"` }); dropped++; return null }
    const p = def.props.safeParse(n.props ?? {})
    if (!p.success) { p.error.issues.forEach(i => errors.push({ path: `${path}.props${i.path.length ? '.' + i.path.join('.') : ''}`, message: i.message })); dropped++; return null }
    const out: GenNode = { type: n.type, props: p.data as Record<string, any> }
    if (typeof n.key === 'string') out.key = n.key.slice(0, 60)
    if (n.children != null) {
      if (!def.children) errors.push({ path: `${path}.children`, message: `${n.type} takes no children (ignored)` })
      else if (!Array.isArray(n.children)) errors.push({ path: `${path}.children`, message: 'children must be an array (ignored)' })
      else {
        let kids = n.children.slice(0, 100).map((c: any, i: number) => walk(c, `${path}.children[${i}]`, depth + 1)).filter(Boolean) as GenNode[]
        if (n.type === 'Tabs') kids = kids.filter(k => k.type === 'Tab' || (errors.push({ path, message: 'Tabs children must be Tab' }), false))
        out.children = kids
      }
    }
    return out
  }
  let root = walk(r.root, '$.root', 0)
  if (root && root.type !== ROOT) root = { type: 'Stack', props: {}, children: [root] } // OpenUI-style: root is always Stack
  const title = typeof r.title === 'string' ? r.title.slice(0, 200) : undefined
  return { ok: !!root, spec: root ? { version: 1, ...(title ? { title } : {}), root } : null, errors, dropped }
}
function safeJson(s: string, errors: ValidationIssue[]) { try { return JSON.parse(s) } catch (e) { errors.push({ path: '$', message: 'invalid JSON' }); return null } }

/** Compact component catalogue for LLM prompts / MCP tool descriptions (like OpenUI library.prompt()). */
export function describeLibrary(): string {
  const groups: Record<string, string[]> = {}
  for (const [name, d] of Object.entries(COMPONENTS) as [string, Def][]) {
    const keys = Object.keys((d.props as any).shape ?? {}).join(', ')
    ;(groups[d.group] ??= []).push(`- ${name}(${keys})${d.children ? ' [children]' : ''}: ${d.description}`)
  }
  return `GenUI v${GENUI_VERSION}. Spec: {"version":1,"title"?:string,"root":Node}; Node: {"type":Name,"props":{...},"children"?:Node[]}. Root is always ${ROOT}.\n` +
    Object.entries(groups).map(([g, l]) => `${g}:\n${l.join('\n')}`).join('\n')
}

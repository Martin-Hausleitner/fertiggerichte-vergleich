# GenUI v1 – generative UI for Good Choice

An AI (via the MCP tool `render_custom_ui` or `window.goodChoice.renderCustomUI`) describes a view as **JSON**;
this folder validates it with zod and renders it with the app's existing shadcn components.

| File | Purpose |
|---|---|
| `schema.ts` | zod schemas, component library, `validateSpec()`, `describeLibrary()` (pure; also used by `mcp/`) |
| `genui.schema.json` | JSON Schema (2020-12) generated from `schema.ts` (`cd mcp && npm run gen-schema`) |
| `query.ts` | pure `ProductQuery` engine over data.json rows (ready-meal guard, € per portion, configurable value score) |
| `Renderer.tsx` | `<GenUIRenderer spec env/>` → Card, Table, Badge, Button, Tabs, Chart, Separator, product cards/lists |
| `index.tsx` | `installGenUI({ getRows, onAction, getValueCfg })`, `<GenUIHost/>` |
| `bridge.ts` | browser side of the MCP WebSocket bridge (only with `?mcp=ws://localhost:PORT`) |

## Spec
```json
{ "version": 1, "title": "Hofer unter 5 €",
  "root": { "type": "Stack", "props": { "gap": "md" }, "children": [
    { "type": "Alert", "props": { "text": "Ersetzt keine Ernährungsberatung.", "tone": "info" } },
    { "type": "FilterBar", "props": { "query": { "stores": ["Hofer"], "maxPricePerPortion": 5 } } },
    { "type": "ProductList", "props": { "query": { "stores": ["Hofer"], "maxPricePerPortion": 5, "sort": "value", "limit": 12 }, "display": "cards" } },
    { "type": "Button", "props": { "label": "Zum Ranking", "action": { "type": "setView", "view": "ranking" } } }
  ] } }
```
Node = `{ type, props, children?, key? }`. Components (group): **Layout** Stack (root), Grid, Card, Tabs, Tab, Separator ·
**Content** Heading, Text, Badge, Alert, Stat, Image · **Actions** Button · **Data** Table, BarChart ·
**Products** ProductCard, ProductList, FilterBar. Exact props: `genui.schema.json` or `describeLibrary()`.

Products are referenced by **query or id**, not inlined – the host resolves them against its own data, so an AI cannot fake prices.

## Safety
- No HTML, markdown, `className`, `style`, scripts or event handlers – all props are `.strict()` zod objects; text is rendered as React text.
- URLs: `https://` or relative app paths only (`javascript:`, `data:`, `http:`, `//host` rejected); images get `referrerPolicy=no-referrer`.
- Actions are a closed whitelist (`setView`, `applyFilter`, `openProduct`, `compare`, `openUrl`) executed by the host's `onAction`.
- Limits: depth 8, 300 nodes, 200 table rows, 12 columns, 100 products per list.
- Lenient like OpenUI: invalid nodes are dropped and reported (`errors[]`, `dropped`), valid siblings still render; a non-Stack root is wrapped in `Stack`.

## Alignment with OpenUI (openui.com, checked 2026-10-13)
OpenUI defines components as `defineComponent({ name, description, props: z.object(...) })`, assembled with
`createLibrary({ root, componentGroups })`, exports JSON Schema / a prompt via `library.toJSONSchema()` / `prompt()`,
and its renderer drops invalid output instead of failing.
**Adopted:** zod props + description per component, PascalCase names, fixed root `Stack`, component groups,
drop-invalid validation, a generated prompt (`describeLibrary`) and JSON Schema.
**Not adopted (yet):** the line-based *OpenUI Lang* DSL with positional args/streaming and the `@openuidev/*` packages –
MCP tool arguments are JSON anyway, and we wanted no extra runtime dependency. A later adapter `openui-lang → GenSpec` is possible because the component model is the same.

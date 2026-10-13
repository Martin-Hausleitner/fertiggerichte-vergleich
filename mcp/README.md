# good-choice-mcp

MCP server for Good Choice (`@modelcontextprotocol/sdk`, stdio + Streamable HTTP).

| Tool | Kind | What |
|---|---|---|
| `search_products` | data | full-text search, ready meals only by default (`includeGroceries` toggle) |
| `filter` | data | GenUI `ProductQuery` (shops, stage, vegan/vegetarian, score, price, €/portion, protein, kcal, sugar, salt, sort) |
| `rank` | data | ranking by `value` / `score` / `pricePerPortion` / `price`; `healthWeight` and `protPerEurCap` are parameters (not hard-coded) |
| `build_meal_plan` | data | 1–7 days, 1–3 meals/day, kcal/protein/budget targets, shops → plan + shopping list |
| `set_view` | UI | switches the connected app's view (`location.hash` via `window.goodChoice.setView`) |
| `render_custom_ui` | UI | validates a GenUI v1 spec (`src/app/genui`) and renders it in the connected app |

Data tools read the app's `public/data.json` (or `GOODCHOICE_DATA=<path|https URL>`, e.g. `https://servas-ai.github.io/fertiggerichte-vergleich/data.json`).
UI tools go through a **local WebSocket bridge** on `ws://127.0.0.1:8765` (`GOODCHOICE_BRIDGE_PORT`). The app connects only when opened with
`?mcp=ws://localhost:8765` (localhost only) – off by default, also on the public site.

**Privacy:** nothing is stored or logged. The app never sends localStorage, address, plan targets or other health data over the bridge – only `{ok, errors}` acks.
`build_meal_plan` targets come from your local AI client as tool arguments and stay in this local, stateless process. HTTP binds 127.0.0.1 with a Host check; the bridge only accepts the GitHub-Pages and localhost origins.

## Run
```bash
cd mcp && npm install
npm start                        # stdio
npm run start:http               # http://127.0.0.1:3333/mcp (--port N)
cd .. && npm run dev             # app → http://localhost:5173/?mcp=ws://localhost:8765
```
Public site + local server also works: `https://servas-ai.github.io/fertiggerichte-vergleich/?mcp=ws://localhost:8765`.

## Claude Desktop (`claude_desktop_config.json`) / Cursor (`.cursor/mcp.json`)
```json
{ "mcpServers": { "good-choice": {
    "command": "npx", "args": ["tsx", "/ABS/PATH/fertig-ui/mcp/src/index.ts"],
    "env": { "GOODCHOICE_BRIDGE_PORT": "8765" } } } }
```
Cursor via HTTP: `{ "mcpServers": { "good-choice": { "url": "http://127.0.0.1:3333/mcp" } } }`.

## Tests
`npm test` (tsx) or `./scripts/test-offline.sh` (bundles with the app's esbuild, needs only `ws`). Covers spec validation/safety,
ready-meal guard (no Lasagneblätter, top 50 only meal/stew), configurable weighting, meal plan constraints, bridge round-trip and origin check.
`npm run gen-schema` regenerates `src/app/genui/genui.schema.json`.

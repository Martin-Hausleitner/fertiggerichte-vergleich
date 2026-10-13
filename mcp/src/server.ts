/** MCP server definition (@modelcontextprotocol/sdk McpServer). */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as T from './tools.ts'
import type { UiBridge } from './bridge.ts'

const json = (v: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(v, null, 1) }] })
const fail = (e: unknown) => ({ isError: true, content: [{ type: 'text' as const, text: String((e as Error)?.message ?? e) }] })
const wrap = <A,>(fn: (a: A) => Promise<unknown>) => async (a: A) => { try { return json(await fn(a)) } catch (e) { return fail(e) } }

export function createServer(bridge: UiBridge) {
  const s = new McpServer({ name: 'good-choice', version: '0.1.0' })
  s.registerTool('search_products', { title: 'Search ready meals', description: 'Full-text search in Good Choice products (ready meals only by default). Data: public data.json.', inputSchema: T.SearchShape, annotations: { readOnlyHint: true } }, wrap(T.searchProducts))
  s.registerTool('filter', { title: 'Filter products', description: 'Filter products by shop, stage, vegan/vegetarian, score, price, price per portion, protein, kcal, sugar, salt; optional sort.', inputSchema: T.FilterShape, annotations: { readOnlyHint: true } }, wrap(a => T.filterProducts(a.filter)))
  s.registerTool('rank', { title: 'Rank ready meals', description: 'Ranking of ready meals (value per portion, health score, price). Value weighting is configurable (healthWeight, protPerEurCap). Only rows with price, shop, complete score and known portion.', inputSchema: T.RankShape, annotations: { readOnlyHint: true } }, wrap(T.rankProducts))
  s.registerTool('build_meal_plan', { title: 'Build meal plan', description: 'Day/week plan from ready meals in the given shops with kcal/protein targets and budget, plus shopping list. Stateless: targets are not stored or forwarded. Not medical advice.', inputSchema: T.MealPlanShape, annotations: { readOnlyHint: true } }, wrap(T.buildMealPlan))
  s.registerTool('set_view', { title: 'Switch app view', description: 'Navigate the connected Good Choice app (e.g. view "heute", "ranking", "hofer-top30", "plan") with optional params. Requires the app opened with ?mcp=ws://localhost:PORT.', inputSchema: T.SetViewShape }, wrap(a => T.setView(bridge, a)))
  s.registerTool('render_custom_ui', { title: 'Render custom view', description: 'Render an AI-generated view in the connected app using the GenUI v1 JSON spec (shadcn components; no HTML/JS). Invalid nodes are dropped and reported.', inputSchema: T.RenderShape }, wrap(a => T.renderCustomUi(bridge, a.spec)))
  return s
}

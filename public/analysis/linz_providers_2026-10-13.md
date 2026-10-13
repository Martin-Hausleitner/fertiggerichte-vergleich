# Ready-meal providers for Linz outside the supermarkets (as of 2026-10-13)

Reference address: Gruberstraße 19, 4020 Linz (48.3102805, 14.2992021, Nominatim).
Scope: ready meals only (segment=ready_meal). Meal kits and plain groceries are tagged segment=grocery and kept out of the main rankings.
Probes: robots.txt checked, at least 1.1 s per host (lock in /tmp/polite-<host>.lock), no login.

## Ranking (data availability × relevance for Linz)

| # | Provider | Type | Data source | Nutrition | Price | Ingredients/allergens | Locations | delivers_4020 | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **fit2go** (Fit2go GmbH, Linz) | meal-prep, frozen | HTML (Shopify Hydrogen): /pages/unser-sortiment + /products/<handle> | kcal/protein/carbs/fat per portion + net weight → per 100 g | box tiers 10.49/9.99/9.49 € per meal | ✅/✅ | HQ Langgasse 11 (company vending machines not public) | ✅ | **connected** (30 dishes, 28 with nutrition) |
| 2 | PrepMyMeal | meal-prep, chilled | Shopify /products.json + HTML | ✅ | ✅ | partial | – (shipping) | ✅ | already connected (`prepmymeal`) |
| 3 | LiveFresh | bowls | Shopify /products.json | ✅ | ✅ | partial | – | ✅ | already connected (`livefresh`) |
| 4 | FITTASTE (DE, jars) | ready meals in jars | Shopify (fittaste.com), likely /products.json | probably HTML | ✅ (from 6.39 €) | ? | – | ✅ | next connector (DNS outage blocked it) |
| 5 | dm (dm/Bipa ready meals) | chemist | dm: already `dm` (products.dm.de JSON); Bipa: webshop HTML | dm ✅ / Bipa ? | ✅ | ✅ | OSM | – | dm connected; Bipa open |
| 6 | Subway | to-go chain | official nutrition page/PDF (subway.com/de-AT) | ✅ per product (PDF/HTML) | ❌ online | allergens ✅ | OSM | – | candidate (PDF parser) |
| 7 | Nordsee | to-go chain | nordsee.com/at HTML, nutrition PDF | likely PDF | partly | allergens | OSM / store finder | – | candidate |
| 8 | dean&david | to-go chain | deananddavid.at (TLS handshake fails from Python; no bypass) | PDF on their site | ✅ | ✅ | OSM | – | blocked technically |
| 9 | Akakiko | to-go/sushi | akakiko.at HTML menu | ❌ | ✅ | allergen letters | OSM | – | prices only |
| 10 | Bakeries: Backhaus Mann/Der Mann, Ströck, Anker, Ruetz, Felber, Honeder, Brandl, Resch&Frisch | bakery snacks | marketing sites only; honeder.at 403, backhaus-mann.at/felber.at have no DNS | ❌ | ❌ | partly allergen lists | OSM (shop=bakery) | – | locations only |
| 11 | Petrol-station shops (OMV Viva, BP/Merkur inside, Shell, Eni, Turmöl, Spar express) | convenience | no product listing; Spar express through the Spar dataset | ❌ | ❌ | ❌ | OSM amenity=fuel | – | locations only |
| 12 | HelloFresh / Marley Spoon / Kochabo | meal kits → **segment=grocery** | HelloFresh recipe pages (Next.js, with nutrition) | ✅ (recipes) | box price | ✅ | – | HF ✅, MS unknown | out of the main ranking |
| 13 | Gurkerl | online supermarket | API (existing) | ✅ | ✅ | ✅ | – | ❌ **does not deliver to Linz** | the README's "delivers to Linz" is wrong |
| 14 | foodora/Mjam shops, Lieferando | delivery platforms | apps behind bot protection | ❌ | ✅ (app) | ❌ | – | unknown | catalog-only (no bypass) |

## Built (food-connectors worktree /workspace/wt-linz-providers, branch squad/linz-providers, local only)
- `food_connectors/polite.py`: shared polite fetch (robots, ≥1.1 s per host with lock file, retry) and `distance_km()` from Gruberstraße 19.
- `adapters/fit2go.py`: 30 dishes from the 2026-10-13 range, 28 of them with nutrition per 100 g, ingredients, allergens, image and price. Data in `data/linz/fit2go_2026-10-13.json`.
- `adapters/osm_linz_food.py`: OSM Overpass for bakeries, to-go chains, fuel shops and dm/Bipa in Linz, with distance_km. **Not run live yet**: Overpass returned 504, then a DNS outage on the box.
- `data/linz/delivery_4020_2026-10-13.json`: delivers_4020 per provider, with source URL.

## Blockers
- DNS on the box has been down since about 14:20 UTC (getent fails). Overpass, FITTASTE and Subway are pending.
- The local Austria PBF fallback (osmium) was stopped because RAM was below 1 GB free.
- dean&david: TLS alert from the Python client. Not bypassed.

## Update 15:15 UTC (DNS back)
- Connected: fit2go 30 (28 with nutrition), FITTASTE 16 (all with full per-100 g nutrition), NORDSEE 63 (41 ready_meal, 22 grocery, no prices), Subway 144 (59 ready_meal, 85 grocery, PDF March 2026, no prices).
- OSM: 211 locations plus the fit2go kitchen = 212, with distance_km. Breakdown: 85 local bakeries, 23 Bipa, 17 Honeder, 16 dm, 12 OMV Viva, 11 BP, 11 Turmöl, 9 Eni, 7 Shell, 4 Spar express, 4 Resch&Frisch, 3 Subway, 2 dean&david, 2 Akakiko, 2 Nordsee, 2 Brandl, 1 Le Burger.
- Gurkerl: the claim that it delivers to Linz is corrected in the README and in connectors_import.py.
- Public files: fertig-app/public/linz_providers.json (253 rows, 146 ready_meal) and public/stores_linz_providers.json (212).

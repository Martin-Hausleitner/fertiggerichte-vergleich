# Good Choice Health-Score v2 (13.10.2026)

Code: `score_v2.py` (pure functions), wired in `score.py` (block "score v2") and `export_app.py`. Tests: `tests/test_score_v2.py` (9 tests), deploy gate `tests/check_top50.py`. Stats: `python3 analysis/score_v2_stats.py [old data.json]` → `score_v2_stats.txt`.

## 1. Nutrition basis (dry vs. prepared)
A row counts as dry/as-sold if kcal/100 g ≥ 300 and fat < 10 g and it is not frozen (TK), or if its packaging is "Trocken/Instant" with ≥ 250 kcal, or if it has ≥ 300 kcal and a dry-product name (lasagne sheets, Suppe-ABC/Gerstl, Backerbsen, risotto rice, powder, terrine, fix, instant, cup, soy chunks).
- If OFF has `energy-kcal_prepared_100g`, the row is converted (`nutrition_basis='prepared'`, factor = prepared/as-sold kcal).
- Otherwise, if `prep` gives a ratio ("… 250 ml Wasser"), factor = size/(size + water ml).
- Otherwise the row gets `nutrition_basis='dry'`, `health_score=null`, `dry=true` and is not rankable.
- **Fix for the `_ov` bug:** QA fixes (billa_fixes.json: 63 `dry` overrides) set `dry=False` on lasagne sheets and Stangl soup pasta. v2 ignores such an override when the nutrition rule fires and adds the flag "QA-Override dry=False ignoriert".
- Stangl was being classified as "Dose/Konserve" because the regex `dose` matched inside other words. It is now `\bdose\b`.

## 2. Portion and daily target
- `portion_g`/`portion_source` come from:
  - `name_portions`: "N Portionen", giving size/N
  - `off_serving`: OFF serving_quantity
  - `pack_single`: the whole pack, if it weighs 150–700 g
  - otherwise **null / `unknown`**. The 100 g placeholder is gone.
- `per_portion` holds {kcal, protein, salt, satfat, sugar, fiber}.
- `day_pct` is the share of the EU reference intakes: 2000 kcal, 50 g protein, 6 g salt, 20 g sat fat, 90 g sugar, plus 30 g fiber (DGE).
- In the app, `portion`, `pPor`, `protPor`, `kcalPor`, `saltPor` and `saltPct` use `portion_g` when it is known. A heuristic portion of exactly 100 is set to null.

## 3. Formula (0–100, clamped)
| Part | Rule |
|---|---|
| base | +30 |
| protein | min(g protein per 100 kcal / 10, 1) × 35; **halved if sugar points ≥ 3 (> 10 g sugar/100 g)** |
| salt | −min(max(salt − 0.6, 0)/1.4, 1) × 20 (per 100 g) |
| sat. fat | −min(max(satfat − 1.5, 0)/4.5, 1) × 15 |
| **sugar** | −2 × Nutri-Score-2023 sugar points (thresholds 3.4/6.8/10/14/17/20/24/27/31/34 … g), max −20 |
| fiber | min(fiber/6, 1) × 10 |
| **veg** | min(veg%/40, 1) × 10. veg% comes from OFF `fvl_pct` / ingredient percentages, otherwise from the ingredient list (explicit % or an order-based estimate). **The name is not used.** |
| **NOVA** | 4: −10 · 3: 0 · 2: +3 · 1: +5 · unknown: −3 |
| portion_salt | portion salt > 40 % of the day: up to −8 |
| portion_satfat | > 40 % of the day: up to −5 |
| portion_protein | ≥ 40 % of the day (20 g) and not sweet: +5 |

The parts are exported as `score_parts`. The old score stays in `scoreV1`.

## 4. NOVA (`nova_source`)
1. `off`: OFF nova_group (via EAN; cache nutri_off_cache.json, and off_v2_cache.json from `off_v2_fetch.py`)
2. `ingredients_markers`: the ingredient list contains isolate, hydrolysate, modified starch, maltodextrin, dextrose/glucose syrup, aroma, flavour enhancer, emulsifier, thickener, stabiliser, colouring, sweetener, phosphate or an E number → 4; otherwise → 3
3. `unknown` (null). **No packaging-based guess any more.**

## 5. Meal check (`meal_class`, kcal per portion or per pack)
- `< 250`: snack_side
- `250–299`: light_meal
- `300–1000`: meal
- `> 1000`: multi_portion
- dry: dry
- no kcal: unknown

Rankable now also requires a score, no dry product, meal_class ∈ {meal, multi_portion (only with a known portion split)}, and in the app also `stage ∈ {meal, stew}` and no dessert.

## 6. NONMEAL (excluded from the app)
New entries:
- desserts: Topfencreme, mousse, pudding, dessert, cheesecake, tiramisu, panna cotta
- pure pesto/sugo (not pasta dishes with pesto)
- soup add-ins: Suppeneinlage, Backerbsen, Frittaten, Suppe-ABC/Gerstl/Sternderl/Mini Hörnchen
- the bare "<Marke> Lasagne" (sheets) and "Lasagne Hartweizen"

## 7. Before/after (data.json build 13:57 vs. v2 build)
```
rows 2529 2382 rankable 1160 635
v1 all (1810, 36.2, [27.1, 34.9, 44.5], {0: 37, 10: 169, 20: 396, 30: 594, 40: 323, 50: 160, 60: 120, 70: 10, 80: 1})
v2 all (1619, 31.9, [22.1, 32.2, 40.3], {0: 95, 10: 231, 20: 379, 30: 493, 40: 246, 50: 129, 60: 45, 80: 1})
v1 rankable (1160, 36.3, [28.0, 35.4, 44.5], {0: 22, 10: 92, 20: 244, 30: 396, 40: 235, 50: 113, 60: 53, 70: 4, 80: 1})
v2 rankable (635, 31.4, [22.2, 31.7, 39.8], {0: 35, 10: 88, 20: 162, 30: 194, 40: 102, 50: 42, 60: 12})
nutrition_basis {'as_sold': 2323, 'dry': 59}
meal_class {'unknown': 807, 'meal': 1060, 'multi_portion': 116, 'dry': 59, 'snack_side': 271, 'light_meal': 69}
nova_source {'unknown': 2290, 'ingredients_markers': 24, 'off': 68}
nova {None: 2290, 4: 64, 3: 27, 1: 1}
veg_source {'unknown': 2293, 'ingredients_order': 24, 'off_fvl': 65}
portion_source {'pack_single': 1763, 'unknown': 565, 'name_portions': 54}
stage {'meal': 1192, 'stew': 341, 'side': 216, 'base': 420, 'prot': 158, 'veg': 55}
top50 non-meal/dry []
examples:
  nöm PRO Protein Topfencreme Vanille | v1 65.0 -> v2: removed (NONMEAL)
  Dr. Oetker High Protein Pudding Grieß | v1 63.0 -> v2: removed (NONMEAL)
  Clever Lasagne Bolognese | Billa | v1 30.9 v2 30.9 multi_portion as_sold rank False {'base': 30.0, 'protein': 13.8, 'salt': -5.6, 'satfat': -4.3, 'sugar': 0.0, 'fiber': 0, 'veg': 0, 'nova': -3}
  Stangl Suppe-ABC | v1 36.1 -> v2: removed (NONMEAL)
  Inzersdorfer Kräftige Hühnersuppe | Spar | v1 None v2 None unknown as_sold rank False None
  GOOD CHOICE Asia Curry Chicken Süß-Sauer 400g | Hofer | v1 None v2 None unknown as_sold rank False None
  Felix Chili con Carne | Spar | v1 39.8 v2 38.8 meal as_sold rank True {'base': 30.0, 'protein': 18.4, 'salt': -8.6, 'satfat': -0.7, 'sugar': 0.0, 'fiber': 0, 'veg': 0, 'nova': -3, 'portion_salt': -8, 'portion_protein': 5}
  Küchenbrüder Veganer Bio Linseneintopf | Spar | v1 None v2 None unknown as_sold rank False None
TOP NENI Mediterraner Nudelsalat Gurkerl 25.0 60.5 360
TOP Clever Rindsgulasch Billa 50.4 57.7 384
TOP Hähnchen Bowl Thai (XL, 2 Portionen) PrepMyMeal 61.5 50.8 330
TOP Chicken Kräuter & Zitrone MPreis 52.2 50.1 312
TOP Knorr Meisterkessel Bohnen-Speck Suppe Billa 47.7 49.9 680
TOP High Protein Pasta mit Hähnchen in Paprikasau Gurkerl 69.1 49.0 725
TOP dmBio Chili con Tofu High Protein dm 56.3 48.4 322
TOP Frosta High Protein Hähnchen mediterraner Art Billa 58.4 48.0 600
TOP Jeden Tag Lasagne Bolognese MPreis 40.3 47.9 528
TOP Rana Pappardelle mit Ragout alla Toskana Gurkerl 61.8 47.1 464
```

Notes:
- The mean score drops from 36.2 to 31.9. The causes are the sugar penalty, the −3 for unknown NOVA, and the fiber maximum of 10 instead of 15 (the old +5 name bonus is gone).
- Rankable drops from 1160 to 635. Removed: dry products, snacks/sides under 250 kcal, stage side/prot/base, desserts and rows without kcal.
- Protein desserts (nöm PRO Topfencreme 65, Dr. Oetker High Protein Pudding 63) are no longer meals (NONMEAL). Even with the score alone, the sugar penalty and the halved protein bonus push them below 55 (see the test).
- **Data gap:** only 92 of 2382 rows have a NOVA from OFF or the ingredient list. The OFF refresh (`off_v2_fetch.py`, about 600 EANs at 1.1 s/request) failed at 14:08 UTC because of a DNS outage on the box. Re-run it with `python3 off_v2_fetch.py` and then rebuild.
- `pli` is unchanged (0.5 × score + 0.5 × min(ppe/20, 1) × 100), so a cheap high-protein product can rank high on Preis-Leistung despite a weak score (for example NENI Nudelsalat, score 25). Changing the weighting is for Martin to decide.

## 8. For Connector UI (personal goals, localStorage only)
New row fields (`lib.ts` Row, all optional):
- `nutrition_basis`: 'as_sold' | 'prepared' | 'dry'
- `nova`: number | null
- `nova_source`: 'off' | 'ingredients_markers' | 'unknown'
- `veg_pct`: number | null
- `veg_source`: string
- `portion_g`: number | null
- `portion_source`: string
- `kcal_meal`: number | null
- `meal_class`: 'meal' | 'light_meal' | 'snack_side' | 'multi_portion' | 'dry' | 'unknown'
- `day_pct`: {kcal, protein, salt, satfat, sugar, fiber} | null
- `score_parts`: Record<string, number> | null
- `scoreV1`: number | null

Goal fields to store locally only (never published): kcal_target (default 2000), protein_target_g (50), salt_max_g (6), satfat_max_g (20), sugar_max_g (90), fiber_target_g (30), meals_per_day (3, target kcal per meal = kcal_target / meals_per_day), plus optional diet flags (vegan, vegetarian, bio) and excluded allergens. The UI can rescale `day_pct` with these values on the client: per_portion = day_pct × default / 100.

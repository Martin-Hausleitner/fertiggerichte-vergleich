# 🏭 Hersteller, Nährwerte & Preis-Fallen — Linz (4020)

*Stand 25.10.2026 · Datenbasis: **1344 Hauptmahlzeiten & Eintöpfe** (`meal_rows`) sowie **88 Produkte** mit aufgelöstem Herstellerbetrieb.*

## 1. Gleiche Fabrik, verschiedener Preis (`same_factory`)

Viele Eigenmarken- und Marken-Fertiggerichte stammen aus denselben österreichischen Produktionsbetrieben (u. a. **Inzersdorfer / Maresi**, **Steirerfleisch**, **Greisinger**, **Hütthaler**, **Tann**, **Radatz**, **Wiesbauer**, **Frisch & Frost**). Bei vergleichbarer Rezeptur unterscheiden sich die Kilopreise zwischen Diskont-/Eigenmarken-Linie und Markenartikel oft um den Faktor **1,3× bis 2,5×**.

## 2. Oberösterreich vs. übrige Herkunft (nur Fertiggerichte `meal_rows`)

| Herkunft | Produkte (*n*) | Median €/kg | Median Protein/100 g | Median Salz/100 g | Median Health Score | Median Protein/€ |
|---|---:|---:|---:|---:|---:|---:|
| **🦁 Oberösterreich** | 47 | 22.70 €/kg | 10.0 g | 1.55 g | **59.9** | 3.75 g/€ |
| **🌍 Alle Nicht-OÖ-Produkte** | 1297 | 12.09 €/kg | 6.1 g | 1.00 g | **34.0** | 4.30 g/€ |

## 3. Preis- & Nährwert-Fallen (bereinigt)

- **Salzbomben (`traps.salt_bombs`):** Ausschließlich aktiv bepreiste Hauptmahlzeiten mit ≥ 2,0 g Salz/100 g (keine preislosen OpenFoodFacts-Leichen, keine Rohzutaten oder Toastkäse-Scheiben).
- **Bestes Protein pro Euro (`traps.best_protein_per_euro`):** Einzelmahlzeiten bis 650 g (ohne Familien-/Multipack-Pizzen und 1-kg-Großpackungen).

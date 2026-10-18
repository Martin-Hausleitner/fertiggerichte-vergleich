# Linz-Supermärkte: Fertiggerichte-Abdeckung (2026-10-13)

## Filialen (OpenStreetMap Overpass, ODbL), Distanz ab Gruberstraße 19, 4020 Linz
Datei: public/stores_linz_2026-10-13.json (neu, 498 Läden mit lat/lon + distance_km; bbox 48.15,13.95–48.45,14.55).

| Kette | Filialen | nächste | km |
|---|---|---|---|
| Billa | 74 | Gruberstraße 3 | 0.234 |
| Billa Plus | 9 | Mozartstraße 7 | 1.113 |
| Spar | 50 | Holzstraße 13 | 0.4 |
| Eurospar | 25 | Derfflingerstraße 19 | 0.792 |
| Interspar | 4 |   | 1.892 |
| Spar Express | 8 | Dinghoferstraße 35-37 | 1.123 |
| Hofer | 37 | Lederergasse 68-70 | 0.386 |
| Lidl | 20 |   | 0.519 |
| Penny | 22 | Hessenplatz 8 | 1.124 |
| MPreis | 0 | – | – |
| Unimarkt | 2 | Grieskirchner Straße 17 | 25.655 |
| Nah&Frisch | 10 |   | 1.918 |

## Hofer
Siehe analysis/hofer_top30.md. hofer.at: 1.276 Produkte (Sitemap + 21 Kategorien + 24 Markenseiten, Paging), davon nur 18 Fertiggerichte; keine Nährwerte/EAN online, kein TK-/Fertiggericht-Bereich online. Nährwerte nur über OFF (775 Hofer-getaggte Einträge).

## MPreis
mpreis-shop-Connector (Sitemap + Kategorien + JSON-LD): 154 Produkte in Fertiggericht-Kategorien, 131 mit Nährwerten; 39 neue Gerichte übernommen → App MPreis 117 → 159. Keine MPreis-Filiale im Raum Linz laut OSM.

## Unimarkt
unimarkt.at leitet auf unigruppe.at um (301). Die Unimarkt-Filialen wurden 2024 aufgegeben bzw. an Nah&Frisch/andere Händler übergeben; es gibt keinen Onlineshop und keine Produktdaten mehr. heisse-preise.io hat 3.426 Unimarkt-Artikel, der letzte Preis ist vom 2024-02-13, also nicht verwendbar. Kein Connector gebaut. Nah&Frisch-Standorte: unigruppe.at/nah-und-frisch-standorte bzw. OSM (10 im Raum Linz).

## Lidl (401 – nicht umgangen)
- `GET https://www.lidl.at/q/api/search?...` → **HTTP 401** (getestet 2026-10-13 ~15:00 UTC, ohne Login).
- robots.txt: `Disallow: /q/search?id=*`; Sitemap https://www.lidl.at/static/sitemap.xml vorhanden.
- Keine Umgehung (kein Browser-Spoofing, kein Token-Reuse). Bestehende 41 Lidl-Zeilen bleiben (ältere Quellen/OFF). Mögliche legale Wege: Produktseiten aus der Sitemap (robots-konform, falls JSON-LD vorhanden) prüfen, OFF stores:Lidl.

## Regelkonformität
- ≥1,1 s/Host über /tmp/host-<host>.lock/.ts (jetzt auch zentral in food_connectors/http.py).
- Die alte /workspace/fertig/hs.py nutzte hofer.at/suchergebnisse?q=, das laut robots.txt (`Disallow: /*?q=`) verboten ist. Nicht mehr verwenden.

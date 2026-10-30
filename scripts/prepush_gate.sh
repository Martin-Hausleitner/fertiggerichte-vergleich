#!/usr/bin/env bash
# VORSCHLAG für HCB (deploy.sh NICHT verändert): Pre-Push-Gate, vor `git push`/gh-pages aufrufen.
#   ./scripts/prepush_gate.sh || { echo "Gate rot – kein Deploy"; exit 1; }
# Schnellmodus nur Daten-Checks (ohne Build/Playwright): GATE_FAST=1 ./scripts/prepush_gate.sh (genutzt vom git pre-push hook, scripts/git-pre-push)
# Prüft: (1) Zeilenzahl in public/data.json fällt nicht stark, (2) Build grün, (3) Smoke-Test über alle Tabs.
set -euo pipefail
cd "$(dirname "$0")/.."
MAX_DROP_PCT="${MAX_DROP_PCT:-5}"     # max. erlaubter Rückgang ggü. letztem Deploy
MIN_ROWS="${MIN_ROWS:-2000}"
STATE=".gate_rows"                    # in .gitignore aufnehmen

rows=$(node -e 'const d=require("./public/data.json");console.log(d.rows.length)')
priced=$(node -e 'const d=require("./public/data.json");console.log(d.rows.filter(r=>r.price!=null).length)')
echo "[gate] rows=$rows priced=$priced"
[ "$rows" -ge "$MIN_ROWS" ] || { echo "[gate] FAIL: rows $rows < $MIN_ROWS"; exit 1; }
if [ -f "$STATE" ]; then
  prev=$(cat "$STATE")
  floor=$(( prev * (100 - MAX_DROP_PCT) / 100 ))
  [ "$rows" -ge "$floor" ] || { echo "[gate] FAIL: rows $prev -> $rows (> ${MAX_DROP_PCT}% Rückgang)"; exit 1; }
fi
# Keine personenbezogenen/Health-Rohdaten in public/ (Art. 9 DSGVO)
if grep -rIlE '"(whoop|garmin|healthkit|heart_?rate|hrv|weight_kg|user_?email)"' public/ 2>/dev/null; then echo "[gate] FAIL: verdächtige Personen-/Health-Felder in public/"; exit 1; fi
node scripts/check_gaps_applied.mjs public/data.json   # sensecheck 15: export without gaps_overlay --apply → rot
node -e 'const s=require("./public/data.json").soldOut||{};console.log(s.stale?"[gate] WARN: online availability snapshot stale/missing (fertig: python3 online_availability.py fetch) "+JSON.stringify(s):`[gate] availability snapshot ${s.file} age ${s.age_h} h (max ${s.max_age_h} h)`)'   # sensecheck 27 (2)
node scripts/test_rowref.mjs public/data.json   # sensecheck 27: stable uid refs (favs/#cmp=/#p=)
node scripts/test_linkkind.mjs public/data.json   # UI follow-up SC28: Shop-Suche/Kategorie/PDF-Links gekennzeichnet
node scripts/test_sc33_ui.mjs public/data.json   # sensecheck 33: alsoText same-store sizes, ✓ aktuell follows price staleness
node scripts/test_heute_tz.mjs   # sensecheck 83 P3: Heute-Kopfzeile + Sonntags-Check in Europe/Vienna
node scripts/test_build_files.mjs   # sensecheck 84 P3: stores*.json im Build-Hash (Cache-Bust)
node scripts/regress_top50.mjs public/data.json   # Top 50 (pli) nur meal/stew, keine Trockenware/Desserts
if [ "${GATE_FAST:-0}" = 1 ]; then echo "[gate] OK (fast: data checks only)"; exit 0; fi
npm run build
node scripts/pw_gate.mjs "${PW_DIST:-$PWD/dist}"   # tests this checkout's own dist (PW_DIST overrides); Smoke-Test: alle Tabs, Desktop + Mobil, keine Konsolenfehler/leeren Seiten
node scripts/e2e_legacy_favs.mjs   # sensecheck 29 (1): alte Favoriten → Stand wählen → genau diese Produkte
echo "$rows" > "$STATE"
echo "[gate] OK"

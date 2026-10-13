#!/bin/bash
set -e
exec 9>/tmp/fertig_deploy.lock; flock 9
L=/tmp/fertig_deploy.last; if [ -f $L ]; then d=$(( $(date +%s) - $(cat $L) )); [ $d -lt 240 ] && sleep $((240-d)); fi
trap 'date +%s > /tmp/fertig_deploy.last' EXIT
cd /workspace/fertig-app
(cd /workspace/fertig && python3 score.py >/dev/null && python3 build.py >/dev/null && python3 export_app.py >/dev/null && (python3 brand_tree.py >/dev/null || true) && (python3 brandfam/finalize.py >/dev/null || true) && (python3 packaging_v2.py >/dev/null || true)) || exit 1
python3 /workspace/fertig/gaps_overlay.py --apply public/data.json || exit 1
(cd /workspace/fertig && python3 -m pytest -q tests >/tmp/score_tests.log 2>&1 && python3 tests/check_top50.py /workspace/fertig-app/public/data.json >>/tmp/score_tests.log 2>&1) || { tail -20 /tmp/score_tests.log; exit 1; }
[ -d /workspace/fertig/analysis ] && mkdir -p public/analysis && (cd /workspace/fertig/analysis && for f in *.json *.md; do case $f in _*|brand_rows.json) ;; *) cp "$f" /workspace/fertig-app/public/analysis/ 2>/dev/null;; esac; done; [ -d logos ] && cp -r logos /workspace/fertig-app/public/analysis/) || true
node scripts/embed.mjs >/tmp/embed.log 2>&1 || { tail -5 /tmp/embed.log; exit 1; }
npm run build >/tmp/build.log 2>&1 || { tail -20 /tmp/build.log; exit 1; }
git add -A && git -c user.name="Martin Hausleitner" -c user.email="Martin-Hausleitner@users.noreply.github.com" commit -qm "${1:-update}" || true
git push -q origin main
(git push -q servas main && echo "servas main ok") || echo "servas main push failed"
rm -rf /tmp/ghp && git clone -q --depth 1 -b gh-pages https://github.com/Martin-Hausleitner/fertiggerichte-vergleich.git /tmp/ghp 2>/dev/null && cp -n /tmp/ghp/assets/* dist/assets/ 2>/dev/null; cd dist && touch .nojekyll && rm -rf .git && git init -q -b gh-pages && git add -A && git -c user.name="Martin Hausleitner" -c user.email="Martin-Hausleitner@users.noreply.github.com" commit -qm deploy && git push -q -f https://github.com/Martin-Hausleitner/fertiggerichte-vergleich.git gh-pages
( git push -q -f https://github.com/servas-ai/fertiggerichte-vergleich.git gh-pages && echo 'servas gh-pages ok' ) || echo 'servas gh-pages push failed'
echo deployed $(ls assets | grep '^index-.*js')

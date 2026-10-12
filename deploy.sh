#!/bin/bash
set -e
cd /workspace/fertig-app
[ -d /workspace/fertig/analysis ] && mkdir -p public/analysis && (cd /workspace/fertig/analysis && for f in *.json *.md; do case $f in _*|brand_rows.json) ;; *) cp "$f" /workspace/fertig-app/public/analysis/ 2>/dev/null;; esac; done; [ -d logos ] && cp -r logos /workspace/fertig-app/public/analysis/) || true
npm run build >/tmp/build.log 2>&1 || { tail -20 /tmp/build.log; exit 1; }
git add -A && git -c user.name="Martin Hausleitner" -c user.email="Martin-Hausleitner@users.noreply.github.com" commit -qm "${1:-update}" || true
git push -q origin main
cd dist && touch .nojekyll && rm -rf .git && git init -q -b gh-pages && git add -A && git -c user.name="Martin Hausleitner" -c user.email="Martin-Hausleitner@users.noreply.github.com" commit -qm deploy && git push -q -f https://github.com/Martin-Hausleitner/fertiggerichte-vergleich.git gh-pages
echo deployed $(ls assets | grep '^index-.*js')

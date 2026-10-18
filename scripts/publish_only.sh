#!/bin/bash
# Publish-only deploy: builds the COMMITTED main HEAD (no data pipeline, no embed.mjs) in a clean
# worktree and pushes dist to gh-pages on both remotes, exactly like deploy.sh's publish step.
# Gates: same flock + 240 s spacing as deploy.sh, RAM >= MIN_RAM_MB, load < 50, rows >= live,
#        npm run build (tsc -b + vite), full prepush_gate.sh on $W (PW_DIST=$W/dist, 1 retry, exit 8), optional ranking check (RANK_CHECK=path to node script taking DIST env).
set -e
MIN_RAM_MB=${MIN_RAM_MB:-1500}; WAIT_MIN=${WAIT_MIN:-20}
exec 9>/tmp/fertig_deploy.lock; flock 9
L=/tmp/fertig_deploy.last; if [ -f $L ]; then d=$(( $(date +%s) - $(cat $L) )); [ $d -lt 240 ] && sleep $((240-d)); fi
trap 'date +%s > /tmp/fertig_deploy.last' EXIT
cd /workspace/fertig-app
git fetch -q origin; git fetch -q servas || true
# Build origin/main directly (the shared checkout may hold others' uncommitted work; never touch it).
TARGET=$(git rev-parse origin/main); SHA=$(git rev-parse --short $TARGET); echo "target $SHA"
for i in $(seq 1 $((WAIT_MIN*4))); do LD=$(cut -d' ' -f1 /proc/loadavg); A=$(free -m | awk '/Mem:/{print $7}'); [ ${LD%.*} -lt 50 ] && [ $A -ge $MIN_RAM_MB ] && { echo "resources ok load=$LD avail=${A}MB"; break; }; [ $i = $((WAIT_MIN*4)) ] && { echo "RESOURCES NOT OK load=$LD avail=$A"; exit 3; }; sleep 15; done
# Disk gate: abort before worktree/build if / or the worktree filesystem (/tmp) has < MIN_DISK_GB free.
MIN_DISK_GB=${MIN_DISK_GB:-3}
for fs in / /tmp; do FREE_KB=$(df -Pk "$fs" | awk 'NR==2{print $4}'); if [ "$FREE_KB" -lt $((MIN_DISK_GB*1024*1024)) ]; then echo "DISK GATE: only $((FREE_KB/1024)) MB free on $fs (need >= ${MIN_DISK_GB} GB) - aborting before build, nothing published"; exit 7; fi; done
echo "disk ok: $(df -Ph / | awk 'NR==2{print $4}') free on /"
W=/tmp/fertig-publish-$SHA; rm -rf $W; git worktree prune; git worktree add -q --detach $W $TARGET
trap 'date +%s > /tmp/fertig_deploy.last; git -C /workspace/fertig-app worktree remove --force '$W' 2>/dev/null || true' EXIT
ln -s /workspace/fertig-app/node_modules $W/node_modules
ROWS=$(node -e "console.log(require('$W/public/data.json').rows.length)")
LIVE=$(curl -s --max-time 30 "https://martin-hausleitner.github.io/fertiggerichte-vergleich/data.json?t=$(date +%s)" | node -e "try{console.log(JSON.parse(require('fs').readFileSync(0)).rows.length)}catch{console.log(0)}")
echo "rows repo=$ROWS live=$LIVE"; [ "$ROWS" -ge "$LIVE" ] || { echo "ROWCOUNT would drop"; exit 4; }
(cd $W && npm run build >/tmp/build.log 2>&1) || { tail -20 /tmp/build.log; exit 1; }; echo "build ok"
if [ -n "$RANK_CHECK" ]; then DIST=$W/dist node "$RANK_CHECK" > /tmp/rank_check.log 2>&1 || { tail -20 /tmp/rank_check.log; exit 6; }; echo "rank check ok"; fi
# Full pre-push gate (data checks, build, pw_gate, e2e_legacy_favs) on exactly the worktree that is published.
# One retry under load (after waiting up to 10 min for >= 3 GB free RAM); never publish without a green gate.
gate_ok=0
for try in 1 2; do
  if (cd $W && PW_DIST=$W/dist nice -n 19 bash scripts/prepush_gate.sh) >/tmp/publish_gate.log 2>&1; then gate_ok=1; echo "gate ok (try $try)"; break; fi
  echo "GATE FAILED (try $try):"; tail -20 /tmp/publish_gate.log
  [ $try = 1 ] && for j in $(seq 1 40); do [ $(free -m | awk '/Mem:/{print $7}') -ge 3000 ] && break; sleep 15; done
done
[ $gate_ok = 1 ] || { echo "GATE RED - nothing published"; exit 8; }
[ -f $W/dist/index.html ] || { echo "dist missing after gate - nothing published"; exit 8; }
(git push -q servas $TARGET:refs/heads/main && echo "servas main = $SHA") || echo "servas main push failed (non-ff? not forced)"
# gh-pages = exakt der aktuelle dist-Build (keine alten Assets mehr übernehmen)
cd $W/dist && touch .nojekyll && rm -rf .git && git init -q -b gh-pages && git add -A && git -c user.name="Martin Hausleitner" -c user.email="Martin-Hausleitner@users.noreply.github.com" commit -qm "deploy $SHA" && git push -q -f https://github.com/Martin-Hausleitner/fertiggerichte-vergleich.git gh-pages && echo "martin gh-pages ok"
( git push -q -f https://github.com/servas-ai/fertiggerichte-vergleich.git gh-pages && echo 'servas gh-pages ok' ) || echo 'servas gh-pages push failed'
echo "deployed $SHA gh-pages=$(git rev-parse --short HEAD) bundle=$(grep -o 'index-[A-Za-z0-9_-]*\.js' index.html)"

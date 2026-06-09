#!/bin/bash
cd ~/n8n2erpnext/LightBI

mkdir -p logs/memory-investigation

# dọn log cũ
rm -f logs/memory-investigation/frontend-dev.log
rm -f logs/memory-investigation/build-watch.log

chmod +x logs/memory-investigation/watch-build.sh
nohup logs/memory-investigation/watch-build.sh >/dev/null 2>&1 &
echo $! > logs/memory-investigation/watch-build.pid

# chạy frontend dev thật sự, có timeout 180s
cd ~/n8n2erpnext/LightBI/apps/desktop

timeout 180s npm run dev > ../../logs/memory-investigation/frontend-dev.log 2>&1

# tắt monitor sau khi npm run dev kết thúc/timeout
cd ~/n8n2erpnext/LightBI
kill "$(cat logs/memory-investigation/watch-build.pid)" 2>/dev/null || true

# in báo cáo ngay
echo "===== FRONTEND DEV LOG ====="
tail -n 200 logs/memory-investigation/frontend-dev.log

echo "===== BUILD WATCH LOG ====="
tail -n 200 logs/memory-investigation/build-watch.log

echo "===== CURRENT TOP RSS ====="
ps -eo pid,ppid,rss,%mem,%cpu,comm,args --sort=-rss | head -30

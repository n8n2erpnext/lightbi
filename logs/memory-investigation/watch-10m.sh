#!/bin/bash
rm -f logs/memory-investigation/integrated-10m.log

for i in {1..600}; do
  {
    echo "=============================="
    date
    free -h
    ps -eo pid,ppid,rss,%mem,%cpu,comm,args --sort=-rss | head -30
    echo "--- lightbi related ---"
    pgrep -af "vite|npm run dev|node|lightbi|cargo" || true
  } >> logs/memory-investigation/integrated-10m.log
  sleep 1
done

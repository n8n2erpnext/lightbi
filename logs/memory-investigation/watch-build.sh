#!/bin/bash
while true; do
  {
    echo "=============================="
    date
    free -h
    ps -eo pid,ppid,rss,%mem,%cpu,comm,args --sort=-rss | head -40
    echo "--- lightbi/frontend related ---"
    pgrep -af "vite|npm run dev|node|lightbi|cargo" || true
  } >> logs/memory-investigation/build-watch.log
  sleep 1
done

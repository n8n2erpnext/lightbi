#!/bin/bash
while true
do
{
echo "=================================================="
date

echo "--- MEMORY ---"
free -h

echo "--- TOP RSS ---"
ps -eo pid,ppid,rss,%mem,%cpu,comm,args --sort=-rss | head -30

echo "--- LIGHTBI ---"
pgrep -af "lightbi|cargo run|vite|npm run dev|bun dev"

} >> logs/memory-investigation/memory.log

sleep 2
done

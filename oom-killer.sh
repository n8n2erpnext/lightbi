#!/bin/bash
while true; do
  MEM_TOTAL=$(free -m | awk '/^Mem:/{print $2}')
  MEM_USED=$(free -m | awk '/^Mem:/{print $3}')
  PERCENT=$(( MEM_USED * 100 / MEM_TOTAL ))
  
  if [ "$PERCENT" -gt 85 ]; then
    date >> logs/memory-investigation/oom-killer.log
    echo "DANGER: Memory reached ${PERCENT}%. Auto-killing offenders." >> logs/memory-investigation/oom-killer.log
    ps -eo pid,rss,%mem,cmd --sort=-rss | head -10 >> logs/memory-investigation/oom-killer.log
    
    pkill -f "lightbi-server"
    pkill -f "npm run dev"
    pkill -f "vite"
    echo "Killed LightBI processes to prevent crash." >> logs/memory-investigation/oom-killer.log
    sleep 10 # Wait a bit before checking again to avoid spam
  fi
  sleep 2
done

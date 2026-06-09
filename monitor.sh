#!/bin/bash

while true
do
  echo "===================================================" >> logs/memory-investigation/memory.log
  date >> logs/memory-investigation/memory.log

  echo "--- FREE ---" >> logs/memory-investigation/memory.log
  free -h >> logs/memory-investigation/memory.log

  echo "--- TOP RSS ---" >> logs/memory-investigation/memory.log
  ps -eo pid,ppid,rss,%mem,%cpu,comm,args --sort=-rss | head -25 >> logs/memory-investigation/memory.log

  sleep 2
done

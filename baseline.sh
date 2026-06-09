#!/bin/bash
mkdir -p logs/memory-investigation
free -h > logs/memory-investigation/baseline.txt
echo "" >> logs/memory-investigation/baseline.txt
uptime >> logs/memory-investigation/baseline.txt
echo "" >> logs/memory-investigation/baseline.txt
df -h >> logs/memory-investigation/baseline.txt
echo "" >> logs/memory-investigation/baseline.txt
ps aux --sort=-rss | head -40 >> logs/memory-investigation/baseline.txt

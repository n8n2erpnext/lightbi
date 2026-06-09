#!/bin/bash
cd apps/desktop
npm run dev -- --host > ../../logs/memory-investigation/frontend-server.log 2>&1 &
FRONTEND_PID=$!
cd ../..
echo "Frontend started with PID $FRONTEND_PID" > logs/memory-investigation/frontend-test.txt

for i in {1..10}
do
  sleep 60
  echo "Minute $i" >> logs/memory-investigation/frontend-test.txt
  free -h >> logs/memory-investigation/frontend-test.txt
  ps aux --sort=-rss | head -20 >> logs/memory-investigation/frontend-test.txt
  NODE_COUNT=$(ps -ef | grep node | grep -v grep | wc -l)
  echo "Node process count: $NODE_COUNT" >> logs/memory-investigation/frontend-test.txt
done

kill $FRONTEND_PID
# Also kill the underlying Vite process which is spawned by npm
pkill -P $FRONTEND_PID
echo "Frontend stopped" >> logs/memory-investigation/frontend-test.txt

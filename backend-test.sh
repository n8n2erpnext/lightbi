#!/bin/bash
cargo build -p lightbi-server
./target/debug/lightbi-server > logs/memory-investigation/backend-server.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID $BACKEND_PID" > logs/memory-investigation/backend-test.txt

for i in {1..10}
do
  sleep 60
  echo "Minute $i" >> logs/memory-investigation/backend-test.txt
  free -h >> logs/memory-investigation/backend-test.txt
  ps aux --sort=-rss | head -20 >> logs/memory-investigation/backend-test.txt
done

kill $BACKEND_PID
echo "Backend stopped" >> logs/memory-investigation/backend-test.txt

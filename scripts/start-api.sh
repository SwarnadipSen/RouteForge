#!/bin/bash
cd /home/phoenix/Desktop/smart-supply-chain-v2-main/apps/api
pkill -f "node --watch src/index.js" 2>/dev/null
sleep 1
node --watch src/index.js > /tmp/api.log 2>&1 &
echo "API server starting on PID $!"
sleep 3
curl -s http://localhost:8080/api/health
echo

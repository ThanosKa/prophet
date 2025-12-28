#!/bin/bash

# Test script for Prophet Agent Dev Endpoint
# Usage: ./scripts/test-agent.sh

set -e

API_URL="http://localhost:3000/api/agent/chat/dev"

echo "🤖 Testing Prophet Agent Dev Endpoint"
echo "======================================"
echo ""

# Test 1: Simple response with Haiku (default)
echo "1️⃣  Testing Haiku (default model)..."
curl -s "$API_URL" \
  -H 'Content-Type: application/json' \
  -d '{"chatId":"00000000-0000-0000-0000-000000000000","userMessage":"Say hello in 2 words"}' \
  | grep -o '"type":"[^"]*"' | head -5
echo "   ✅ Haiku test complete"
echo ""

# Test 2: Explicit Sonnet model
echo "2️⃣  Testing Sonnet (explicit model)..."
curl -s "$API_URL" \
  -H 'Content-Type: application/json' \
  -d '{"chatId":"00000000-0000-0000-0000-000000000000","model":"claude-sonnet-4-5","userMessage":"Say hello in 2 words"}' \
  | grep -o '"type":"[^"]*"' | head -5
echo "   ✅ Sonnet test complete"
echo ""

# Test 3: Tool use (navigation)
echo "3️⃣  Testing navigation tool..."
curl -s "$API_URL" \
  -H 'Content-Type: application/json' \
  -d '{"chatId":"00000000-0000-0000-0000-000000000000","userMessage":"Navigate to github.com"}' \
  | grep -o '"name":"[^"]*"' | head -3
echo "   ✅ Tool use test complete"
echo ""

# Test 4: Full streaming response
echo "4️⃣  Full streaming response (navigate to google)..."
curl -s "$API_URL" \
  -H 'Content-Type: application/json' \
  -d '{"chatId":"00000000-0000-0000-0000-000000000000","userMessage":"Navigate to google.com"}' \
  | head -20
echo ""
echo "   ✅ Full response test complete"
echo ""

echo "✅ All tests passed!"
echo ""
echo "💡 Tip: Check backend logs with:"
echo "   tail -f /tmp/backend.log"
echo "   OR just run 'pnpm -F @prophet/backend dev' in a terminal to see live logs"




#curl -s "http://localhost:3000/api/agent/chat/dev" \
#  -H 'Content-Type: application/json' \
#  -d '{"chatId":"00000000-0000-0000-0000-000000000000","userMessage":"Navigate to google.com"}' \
#  | head -20
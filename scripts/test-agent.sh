#!/bin/bash

# Prophet Agent Test Suite (Bash)
# This script tests the Agent Dev Endpoint with various scenarios.
# Usage: ./scripts/test-agent.sh

set -e

API_URL="http://localhost:3000/api/agent/chat/dev"
CHAT_ID="07903456-e5f6-4dfc-bdf3-417a4c65ac43"

echo -e "\n🤖 Prophet Agent Test Suite (Bash)"
echo "===================================="

# Test 1: Basic Chat
echo "1️⃣  Testing Basic Chat (Haiku)..."
curl -s -X POST "$API_URL" \
  -H 'Content-Type: application/json' \
  -d "{\"chatId\":\"$CHAT_ID\",\"model\":\"claude-haiku-4-5\",\"userMessage\":\"Say hello in 2 words\"}" \
  | grep -q "content_delta" && echo "   ✅ Success" || echo "   ❌ Failed"

# Test 2: Tool Continuation (Validation Test)
echo -e "\n2️⃣  Testing Tool Continuation (Strict Validation)..."
curl -s -X POST "$API_URL" \
  -H 'Content-Type: application/json' \
  -d "{\"chatId\":\"$CHAT_ID\",\"model\":\"claude-haiku-4-5\",\"previousContent\":[{\"type\":\"tool_use\",\"id\":\"t1\",\"name\":\"navigate\",\"input\":{\"url\":\"https://google.com\"}}],\"toolResults\":[{\"type\":\"tool_result\",\"tool_use_id\":\"t1\",\"content\":\"done\"}]}" \
  | grep -q "session_created" && echo "   ✅ Success" || echo "   ❌ Failed"

# Test 3: Malformed Tool Input (Navigate missing URL)
echo -e "\n3️⃣  Testing Malformed Tool Input (Navigate missing URL)..."
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H 'Content-Type: application/json' \
  -d "{\"chatId\":\"$CHAT_ID\",\"model\":\"claude-haiku-4-5\",\"previousContent\":[{\"type\":\"tool_use\",\"id\":\"t2\",\"name\":\"navigate\",\"input\":{\"not_url\":\"ops\"}}],\"toolResults\":[{\"type\":\"tool_result\",\"tool_use_id\":\"t2\",\"content\":\"failed\"}]}")

echo "$RESPONSE" | grep -q "VALIDATION_ERROR" && echo "   ✅ Success (Caught validation error)" || echo "   ❌ Failed (Should have caught error)"

# Test 4: Malformed Tool Input (Fill Element missing UID)
echo -e "\n4️⃣  Testing Malformed Tool Input (Fill Element missing UID)..."
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H 'Content-Type: application/json' \
  -d "{\"chatId\":\"$CHAT_ID\",\"model\":\"claude-haiku-4-5\",\"previousContent\":[{\"type\":\"tool_use\",\"id\":\"t3\",\"name\":\"fill_element_by_uid\",\"input\":{\"value\":\"hello\"}}],\"toolResults\":[{\"type\":\"tool_result\",\"tool_use_id\":\"t3\",\"content\":\"failed\"}]}")

echo "$RESPONSE" | grep -q "UID is required" && echo "   ✅ Success (Caught UID validation error)" || echo "   ❌ Failed"

# Test 5: Valid Complex Tool (Scroll Page)
echo -e "\n5️⃣  Testing Valid Complex Tool (Scroll Page)..."
curl -s -X POST "$API_URL" \
  -H 'Content-Type: application/json' \
  -d "{\"chatId\":\"$CHAT_ID\",\"model\":\"claude-haiku-4-5\",\"previousContent\":[{\"type\":\"tool_use\",\"id\":\"t4\",\"name\":\"scroll_page\",\"input\":{\"direction\":\"down\",\"pixels\":500}}],\"toolResults\":[{\"type\":\"tool_result\",\"tool_use_id\":\"t4\",\"content\":\"scrolled\"}]}" \
  | grep "session_created" > /dev/null && echo "   ✅ Success" || echo "   ❌ Failed"

echo -e "\n🏁 All tests completed!\n"

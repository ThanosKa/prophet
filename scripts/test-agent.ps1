#!/usr/bin/env pwsh

# Prophet Agent Test Suite (PowerShell)
# This script tests the Agent Dev Endpoint with various scenarios:
# 1. Basic chat (Haiku)
# 2. Tool continuation turn (testing validation)
# 3. Malformed tool inputs
# 4. Error handling

$API_URL = "http://localhost:3000/api/agent/chat/dev"
$CHAT_ID = "07903456-e5f6-4dfc-bdf3-417a4c65ac43" # Use an existing chat ID from logs

function Write-Host-Color($text, $color) {
    Write-Host $text -ForegroundColor $color
}

Write-Host-Color "`n🤖 Prophet Agent Test Suite`n===========================" "Cyan"

# Helper for POST requests
function Test-Endpoint {
    param($name, $body)
    Write-Host-Color "$name..." "Yellow"
    try {
        $json = $body | ConvertTo-Json -Depth 10
        $response = Invoke-RestMethod -Uri $API_URL -Method Post -ContentType "application/json" -Body $json
        Write-Host-Color "   ✅ Success" "Green"
        return "Success"
    } catch {
        # Check if it was an expected error
        $status = $_.Exception.Response.StatusCode
        if ($null -ne $status) {
            return $status.ToString()
        }
        Write-Host-Color "   ❌ Request Failed: $_" "Red"
        return "Failed"
    }
}

# Test 1: Basic Chat
$body1 = @{
    chatId = $CHAT_ID
    model = "claude-haiku-4-5"
    userMessage = "Say hello in 2 words"
}
$res1 = Test-Endpoint "1️⃣  Testing Basic Chat (Haiku)" $body1

# Test 2: Tool Continuation (Valid)
$body2 = @{
    chatId = $CHAT_ID
    model = "claude-haiku-4-5"
    previousContent = @(
        @{ type = "text"; text = "Navigating..." },
        @{ type = "tool_use"; id = "t1"; name = "navigate"; input = @{ url = "https://google.com" } }
    )
    toolResults = @(
        @{ type = "tool_result"; tool_use_id = "t1"; content = "done" }
    )
}
$res2 = Test-Endpoint "2️⃣  Testing Tool Continuation (Valid)" $body2

# Test 3: Malformed Tool Input (Navigate missing URL)
$body3 = @{
    chatId = $CHAT_ID
    model = "claude-haiku-4-5"
    previousContent = @(
        @{ type = "tool_use"; id = "t2"; name = "navigate"; input = @{ invalid = "field" } }
    )
    toolResults = @(
        @{ type = "tool_result"; tool_use_id = "t2"; content = "failed" }
    )
}
$res3 = Test-Endpoint "3️⃣  Testing Malformed Tool Input (Navigate missing URL)" $body3
if ($res3 -eq "BadRequest") {
    Write-Host-Color "   ✅ Success (Caught expected Validation Error)" "Green"
}

# Test 4: Malformed Tool Input (Fill Element missing UID)
$body4 = @{
    chatId = $CHAT_ID
    model = "claude-haiku-4-5"
    previousContent = @(
        @{ type = "tool_use"; id = "t3"; name = "fill_element_by_uid"; input = @{ value = "test" } }
    )
    toolResults = @(
        @{ type = "tool_result"; tool_use_id = "t3"; content = "failed" }
    )
}
$res4 = Test-Endpoint "4️⃣  Testing Malformed Tool Input (Fill Element missing UID)" $body4
if ($res4 -eq "BadRequest") {
    Write-Host-Color "   ✅ Success (Caught expected Validation Error)" "Green"
}

# Test 5: Valid Complex Tool (Scroll Page)
$body5 = @{
    chatId = $CHAT_ID
    model = "claude-haiku-4-5"
    previousContent = @(
        @{ type = "tool_use"; id = "t4"; name = "scroll_page"; input = @{ direction = "down"; pixels = 500 } }
    )
    toolResults = @(
        @{ type = "tool_result"; tool_use_id = "t4"; content = "scrolled" }
    )
}
$res5 = Test-Endpoint "5️⃣  Testing Valid Complex Tool (Scroll Page)" $body5

# Test 6: Invalid Model
$body6 = @{
    chatId = $CHAT_ID
    model = "broken-model"
    userMessage = "hi"
}
$res6 = Test-Endpoint "6️⃣  Testing Error Handling (Invalid Model)" $body6
if ($res6 -eq "BadRequest") {
    Write-Host-Color "   ✅ Success (Caught expected Error)" "Green"
}

Write-Host-Color "`n🏁 All tests completed!`n" "Cyan"

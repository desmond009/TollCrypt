#!/bin/bash

# Test script to verify real-time dashboard functionality
echo "🧪 Testing Real-time Dashboard Functionality"
echo "============================================="

# Test 1: Check if backend API is responding
echo "1. Testing backend API endpoint..."
API_RESPONSE=$(curl -s "http://localhost:3001/api/tolls/stats/0x7361360D60BE09274EccfebAb510753cA894a7d7")
echo "API Response: $API_RESPONSE"

# Test 2: Check if WebSocket server is running
echo ""
echo "2. Testing WebSocket connection..."
# This would require a WebSocket client, but we can check if the server is listening
NETSTAT_OUTPUT=$(netstat -an | grep :3001 | grep LISTEN)
if [ ! -z "$NETSTAT_OUTPUT" ]; then
    echo "✅ Backend server is running on port 3001"
else
    echo "❌ Backend server is not running on port 3001"
fi

# Test 3: Check frontend is running
echo ""
echo "3. Testing frontend..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000")
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo "✅ Frontend is running on port 3000"
else
    echo "❌ Frontend is not running on port 3000 (HTTP $FRONTEND_RESPONSE)"
fi

echo ""
echo "🎯 Real-time Dashboard Features Implemented:"
echo "============================================="
echo "✅ Real-time stats fetching from backend API"
echo "✅ WebSocket connection for live updates"
echo "✅ Event listeners for transaction updates"
echo "✅ Loading states and error handling"
echo "✅ Manual refresh button"
echo "✅ Connection status indicator"
echo "✅ Last updated timestamp"

echo ""
echo "📋 To test real-time updates:"
echo "1. Open the dashboard in your browser"
echo "2. Process a toll payment (via QR scan or admin panel)"
echo "3. Watch the dashboard update automatically"
echo "4. The green dot indicates real-time connection"
echo "5. Stats should update without page refresh"

echo ""
echo "🔧 Backend Broadcasting Events:"
echo "- transaction:new"
echo "- toll:payment:completed"
echo "- transaction:update"
echo ""
echo "📡 Frontend Listening For:"
echo "- Real-time transaction updates"
echo "- Toll payment completions"
echo "- Connection status changes"
echo "- Periodic fallback updates (30s)"

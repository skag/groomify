#!/bin/bash

# Test script for updating a service
# Usage: ./test-update-service.sh [service_id] [new_price]
# Example: ./test-update-service.sh 1 105.00

API_URL="http://localhost:8000"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.test"

# Load test credentials and token
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found"
    echo ""
    echo "Please run ./tests/api/test-register.sh and ./tests/api/test-login.sh first"
    exit 1
fi

source "$ENV_FILE"

if [ -z "$TEST_TOKEN" ]; then
    echo "❌ Error: TEST_TOKEN not set in $ENV_FILE"
    echo ""
    echo "Please run ./tests/api/test-login.sh first to get an access token"
    exit 1
fi

# Use provided service ID or fallback to TEST_SERVICE_ID
SERVICE_ID="${1:-$TEST_SERVICE_ID}"
NEW_PRICE="${2:-105.00}"

if [ -z "$SERVICE_ID" ]; then
    echo "❌ Error: No service ID provided"
    echo ""
    echo "Usage: $0 [service_id] [new_price]"
    echo "Or set TEST_SERVICE_ID in $ENV_FILE"
    exit 1
fi

echo "=========================================="
echo "Testing Update Service"
echo "=========================================="
echo ""
echo "Service ID: $SERVICE_ID"
echo "New Price: \$$NEW_PRICE"
echo "New Duration: 120 minutes"
echo ""

# Update service request
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$API_URL/api/services/$SERVICE_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d "{
    \"price\": $NEW_PRICE,
    \"duration_minutes\": 120,
    \"description\": \"Updated: Complete grooming service with extended time\"
  }")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Service updated successfully!"
    echo ""
    echo "Updated service:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
    echo "❌ Update service failed"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

#!/bin/bash

# Test script for deleting a service
# Usage: ./test-delete-service.sh [service_id]
# Example: ./test-delete-service.sh 1

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

if [ -z "$SERVICE_ID" ]; then
    echo "❌ Error: No service ID provided"
    echo ""
    echo "Usage: $0 [service_id]"
    echo "Or set TEST_SERVICE_ID in $ENV_FILE"
    exit 1
fi

echo "=========================================="
echo "Testing Delete Service"
echo "=========================================="
echo ""
echo "Service ID: $SERVICE_ID"
echo ""
echo "⚠️  WARNING: This will permanently delete the service"
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Delete service request
RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$API_URL/api/services/$SERVICE_ID" \
  -H "Authorization: Bearer $TEST_TOKEN")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Service deleted successfully!"
    echo ""
    echo "Deleted service:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
    echo "❌ Delete service failed"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

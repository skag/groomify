#!/bin/bash

# Test script for listing all services
# Usage: ./test-list-services.sh

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

echo "=========================================="
echo "Testing List All Services"
echo "=========================================="
echo ""
echo "Note: business_id is automatically extracted from JWT token"
echo ""

# List services request
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/services" \
  -H "Authorization: Bearer $TEST_TOKEN")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Services retrieved successfully!"
    echo ""
    echo "Services:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""

    # Extract first service ID and save for future tests
    FIRST_SERVICE_ID=$(echo "$BODY" | jq -r '.[0].id' 2>/dev/null)
    if [ -n "$FIRST_SERVICE_ID" ] && [ "$FIRST_SERVICE_ID" != "null" ]; then
        echo "First service ID: $FIRST_SERVICE_ID"

        # Save to .env.test
        if grep -q "^TEST_SERVICE_ID=" "$ENV_FILE"; then
            sed -i '' "s/^TEST_SERVICE_ID=.*/TEST_SERVICE_ID=\"$FIRST_SERVICE_ID\"/" "$ENV_FILE"
        else
            echo "TEST_SERVICE_ID=\"$FIRST_SERVICE_ID\"" >> "$ENV_FILE"
        fi

        echo ""
        echo "Next steps:"
        echo "  1. Get specific service: ./tests/api/test-get-service.sh $FIRST_SERVICE_ID"
        echo "  2. Update service: ./tests/api/test-update-service.sh $FIRST_SERVICE_ID"
    fi
else
    echo "❌ List services failed"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

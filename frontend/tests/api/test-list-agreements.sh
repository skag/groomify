#!/bin/bash

# Test script for listing all agreements
# Usage: ./test-list-agreements.sh

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
echo "Testing List Agreements"
echo "=========================================="
echo ""
echo "Fetching all agreements for business_id: $TEST_BUSINESS_ID"
echo ""

# List agreements request
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/agreements" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Agreements retrieved successfully!"
    echo ""

    # Count agreements
    AGREEMENT_COUNT=$(echo "$BODY" | jq 'length' 2>/dev/null || echo "0")
    echo "Total agreements: $AGREEMENT_COUNT"
    echo ""

    if [ "$AGREEMENT_COUNT" -gt 0 ]; then
        echo "Agreements:"
        echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
        echo ""

        # Show summary table
        echo "Summary:"
        echo "----------------------------------------"
        echo "$BODY" | jq -r '.[] | "ID: \(.id) | Name: \(.name) | Sign Option: \(.signing_option) | Created: \(.created_at)"' 2>/dev/null
        echo "----------------------------------------"
    else
        echo "No agreements found. Create one with:"
        echo "  ./tests/api/test-create-agreement.sh"
    fi
else
    echo "❌ Failed to retrieve agreements"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

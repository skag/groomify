#!/bin/bash

# Test script for listing all staff members
# Usage: ./test-list-staff.sh

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
echo "Testing List Staff Members"
echo "=========================================="
echo ""
echo "Fetching all staff members for business ID: $TEST_BUSINESS_ID"
echo ""

# List staff members request
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/business-users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Staff list retrieved successfully!"
    echo ""

    # Count staff members
    COUNT=$(echo "$BODY" | jq '. | length' 2>/dev/null)
    echo "Total staff members: $COUNT"
    echo ""

    echo "Response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""

    # Show staff IDs for easy testing
    STAFF_IDS=$(echo "$BODY" | jq -r '.[].id' 2>/dev/null)
    if [ -n "$STAFF_IDS" ]; then
        echo "Staff IDs:"
        echo "$STAFF_IDS" | while read id; do
            STAFF_NAME=$(echo "$BODY" | jq -r ".[] | select(.id == $id) | \"\(.first_name) \(.last_name)\"" 2>/dev/null)
            STAFF_ROLE=$(echo "$BODY" | jq -r ".[] | select(.id == $id) | .role" 2>/dev/null)
            echo "  - ID $id: $STAFF_NAME ($STAFF_ROLE)"
        done
        echo ""
        FIRST_ID=$(echo "$STAFF_IDS" | head -n1)
        echo "Next steps:"
        echo "  1. Get staff details: ./tests/api/test-get-staff.sh $FIRST_ID"
    fi
else
    echo "❌ Failed to list staff members"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

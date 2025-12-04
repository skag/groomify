#!/bin/bash

# Test script for getting a single agreement by ID
# Usage: ./test-get-agreement.sh [agreement_id]
# Example: ./test-get-agreement.sh 1

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

# Parse agreement ID argument
AGREEMENT_ID="${1:-$TEST_AGREEMENT_ID}"

if [ -z "$AGREEMENT_ID" ]; then
    echo "❌ Error: Agreement ID is required"
    echo ""
    echo "Usage: ./test-get-agreement.sh [agreement_id]"
    echo ""
    echo "Or create an agreement first:"
    echo "  ./tests/api/test-create-agreement.sh"
    exit 1
fi

echo "=========================================="
echo "Testing Get Agreement"
echo "=========================================="
echo ""
echo "Fetching agreement ID: $AGREEMENT_ID"
echo ""

# Get agreement request
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/agreements/$AGREEMENT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Agreement retrieved successfully!"
    echo ""
    echo "Agreement details:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""

    # Extract key details
    NAME=$(echo "$BODY" | jq -r '.name' 2>/dev/null)
    SIGNING_OPTION=$(echo "$BODY" | jq -r '.signing_option' 2>/dev/null)
    CREATED_AT=$(echo "$BODY" | jq -r '.created_at' 2>/dev/null)

    echo "Summary:"
    echo "  - Name: $NAME"
    echo "  - Signing Option: $SIGNING_OPTION"
    echo "  - Created: $CREATED_AT"
    echo ""

    echo "Next steps:"
    echo "  1. Update this agreement: ./tests/api/test-update-agreement.sh $AGREEMENT_ID"
    echo "  2. Delete this agreement: ./tests/api/test-delete-agreement.sh $AGREEMENT_ID"
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo "❌ Agreement not found (ID: $AGREEMENT_ID)"
    echo ""
    echo "Create an agreement first:"
    echo "  ./tests/api/test-create-agreement.sh"
else
    echo "❌ Failed to retrieve agreement"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

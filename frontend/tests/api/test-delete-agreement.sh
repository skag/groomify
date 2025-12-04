#!/bin/bash

# Test script for deleting an agreement
# Usage: ./test-delete-agreement.sh [agreement_id]
# Example: ./test-delete-agreement.sh 1

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
    echo "Usage: ./test-delete-agreement.sh [agreement_id]"
    echo ""
    echo "Or create an agreement first:"
    echo "  ./tests/api/test-create-agreement.sh"
    exit 1
fi

echo "=========================================="
echo "Testing Delete Agreement"
echo "=========================================="
echo ""
echo "⚠️  WARNING: This will permanently delete the agreement!"
echo ""
echo "Agreement ID to delete: $AGREEMENT_ID"
echo ""
read -p "Are you sure you want to delete this agreement? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deletion cancelled"
    exit 0
fi

echo ""
echo "Deleting agreement..."
echo ""

# Delete agreement request
RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$API_URL/api/agreements/$AGREEMENT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Agreement deleted successfully!"
    echo ""
    echo "Deleted agreement details:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""

    # Remove agreement ID from .env.test if it matches
    if [ "$AGREEMENT_ID" = "$TEST_AGREEMENT_ID" ]; then
        sed -i '' '/^TEST_AGREEMENT_ID=/d' "$ENV_FILE"
        echo "Note: TEST_AGREEMENT_ID removed from .env.test"
        echo ""
    fi

    echo "Next steps:"
    echo "  1. List remaining agreements: ./tests/api/test-list-agreements.sh"
    echo "  2. Create a new agreement: ./tests/api/test-create-agreement.sh"
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo "❌ Agreement not found (ID: $AGREEMENT_ID)"
    echo ""
    echo "It may have already been deleted."
else
    echo "❌ Failed to delete agreement"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

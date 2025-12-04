#!/bin/bash

# Test script for getting an animal type with breeds
# Usage: ./test-get-animal-type.sh [animal_type_id]
# Example: ./test-get-animal-type.sh 2

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

# Parse arguments
ANIMAL_TYPE_ID="${1:-$TEST_ANIMAL_TYPE_ID}"

if [ -z "$ANIMAL_TYPE_ID" ]; then
    echo "❌ Error: Animal type ID is required"
    echo ""
    echo "Usage: ./test-get-animal-type.sh [animal_type_id]"
    echo ""
    echo "Or list animal types first:"
    echo "  ./tests/api/test-list-animal-types.sh"
    exit 1
fi

echo "=========================================="
echo "Testing Get Animal Type"
echo "=========================================="
echo ""
echo "Fetching animal type ID: $ANIMAL_TYPE_ID"
echo ""

# Get animal type request
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/animal-types/$ANIMAL_TYPE_ID" \
  -H "Authorization: Bearer $TEST_TOKEN")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Animal type fetched successfully!"
    echo ""
    echo "Response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""

    # Extract animal type details
    NAME=$(echo "$BODY" | jq -r '.name' 2>/dev/null)
    BREED_COUNT=$(echo "$BODY" | jq '.breeds | length' 2>/dev/null)

    echo "Summary:"
    echo "  - ID: $ANIMAL_TYPE_ID"
    echo "  - Name: $NAME"
    echo "  - Total Breeds: $BREED_COUNT"
    echo ""

    # List first 5 breeds
    if [ "$BREED_COUNT" -gt 0 ]; then
        echo "Breeds (showing first 5):"
        echo "$BODY" | jq -r '.breeds[:5] | .[] | "  - \(.name) (ID: \(.id))"' 2>/dev/null
        echo ""
    fi

    echo "Next steps:"
    echo "  1. List all animal types: ./tests/api/test-list-animal-types.sh"
    echo "  2. Get breeds only: ./tests/api/test-list-breeds.sh $ANIMAL_TYPE_ID"
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo "❌ Animal type not found (ID: $ANIMAL_TYPE_ID)"
    echo ""
    echo "List available animal types:"
    echo "  ./tests/api/test-list-animal-types.sh"
else
    echo "❌ Failed to fetch animal type"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

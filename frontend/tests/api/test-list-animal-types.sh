#!/bin/bash

# Test script for listing all animal types
# Usage: ./test-list-animal-types.sh

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
echo "Testing List Animal Types"
echo "=========================================="
echo ""

# List animal types request
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/animal-types" \
  -H "Authorization: Bearer $TEST_TOKEN")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Animal types fetched successfully!"
    echo ""
    echo "Response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""

    # Count animal types
    COUNT=$(echo "$BODY" | jq 'length' 2>/dev/null)
    if [ -n "$COUNT" ] && [ "$COUNT" != "null" ]; then
        echo "Total animal types: $COUNT"
        echo ""

        # Display animal type names and IDs
        echo "Animal Types:"
        echo "$BODY" | jq -r '.[] | "  - ID: \(.id) | Name: \(.name)"' 2>/dev/null
        echo ""

        # Save first animal type ID for other tests
        FIRST_ANIMAL_TYPE_ID=$(echo "$BODY" | jq -r '.[0].id' 2>/dev/null)
        if [ -n "$FIRST_ANIMAL_TYPE_ID" ] && [ "$FIRST_ANIMAL_TYPE_ID" != "null" ]; then
            # Save to .env.test for other tests
            if grep -q "^TEST_ANIMAL_TYPE_ID=" "$ENV_FILE"; then
                sed -i '' "s/^TEST_ANIMAL_TYPE_ID=.*/TEST_ANIMAL_TYPE_ID=\"$FIRST_ANIMAL_TYPE_ID\"/" "$ENV_FILE"
            else
                echo "TEST_ANIMAL_TYPE_ID=\"$FIRST_ANIMAL_TYPE_ID\"" >> "$ENV_FILE"
            fi
        fi
    fi

    echo "Next steps:"
    echo "  1. Get animal type details: ./tests/api/test-get-animal-type.sh [animal_type_id]"
    echo "  2. List breeds for an animal type: ./tests/api/test-list-breeds.sh [animal_type_id]"
else
    echo "❌ Failed to fetch animal types"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

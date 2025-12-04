#!/bin/bash

# Test script for listing breeds for an animal type
# Usage: ./test-list-breeds.sh [animal_type_id]
# Example: ./test-list-breeds.sh 2

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
    echo "Usage: ./test-list-breeds.sh [animal_type_id]"
    echo ""
    echo "Or list animal types first:"
    echo "  ./tests/api/test-list-animal-types.sh"
    exit 1
fi

echo "=========================================="
echo "Testing List Breeds for Animal Type"
echo "=========================================="
echo ""
echo "Fetching breeds for animal type ID: $ANIMAL_TYPE_ID"
echo ""

# List breeds request
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/animal-types/$ANIMAL_TYPE_ID/breeds" \
  -H "Authorization: Bearer $TEST_TOKEN")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Breeds fetched successfully!"
    echo ""
    echo "Response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""

    # Count breeds
    COUNT=$(echo "$BODY" | jq 'length' 2>/dev/null)
    if [ -n "$COUNT" ] && [ "$COUNT" != "null" ]; then
        echo "Total breeds: $COUNT"
        echo ""

        # Display breed names
        if [ "$COUNT" -gt 0 ]; then
            echo "Breed List:"
            echo "$BODY" | jq -r '.[] | "  - \(.name) (ID: \(.id))"' 2>/dev/null
            echo ""

            # Save first breed ID for other tests
            FIRST_BREED_ID=$(echo "$BODY" | jq -r '.[0].id' 2>/dev/null)
            if [ -n "$FIRST_BREED_ID" ] && [ "$FIRST_BREED_ID" != "null" ]; then
                # Save to .env.test for other tests
                if grep -q "^TEST_BREED_ID=" "$ENV_FILE"; then
                    sed -i '' "s/^TEST_BREED_ID=.*/TEST_BREED_ID=\"$FIRST_BREED_ID\"/" "$ENV_FILE"
                else
                    echo "TEST_BREED_ID=\"$FIRST_BREED_ID\"" >> "$ENV_FILE"
                fi
            fi
        else
            echo "⚠️  No breeds found for this animal type"
            echo ""
        fi
    fi

    echo "Next steps:"
    echo "  1. List all animal types: ./tests/api/test-list-animal-types.sh"
    echo "  2. Get animal type with breeds: ./tests/api/test-get-animal-type.sh $ANIMAL_TYPE_ID"
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo "❌ Animal type not found (ID: $ANIMAL_TYPE_ID)"
    echo ""
    echo "List available animal types:"
    echo "  ./tests/api/test-list-animal-types.sh"
else
    echo "❌ Failed to fetch breeds"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

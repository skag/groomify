#!/bin/bash

# Test script for creating a service category
# Usage: ./test-create-service-category.sh [name]
# Example: ./test-create-service-category.sh "Grooming"

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

# Parse arguments or use defaults
CATEGORY_NAME="${1:-Grooming}"

echo "=========================================="
echo "Testing Create Service Category"
echo "=========================================="
echo ""
echo "Creating service category:"
echo "  - Name: $CATEGORY_NAME"
echo ""
echo "Note: business_id is automatically extracted from JWT token"
echo ""

# Create service category request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/service-categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d "{
    \"name\": \"$CATEGORY_NAME\"
  }")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 201 ]; then
    echo "✅ Service category created successfully!"
    echo ""
    echo "Response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""

    # Extract category ID for future tests
    NEW_CATEGORY_ID=$(echo "$BODY" | jq -r '.id' 2>/dev/null)
    if [ -n "$NEW_CATEGORY_ID" ] && [ "$NEW_CATEGORY_ID" != "null" ]; then
        echo "New category ID: $NEW_CATEGORY_ID"

        # Save the category ID to .env.test for other tests
        if grep -q "^TEST_SERVICE_CATEGORY_ID=" "$ENV_FILE"; then
            sed -i '' "s/^TEST_SERVICE_CATEGORY_ID=.*/TEST_SERVICE_CATEGORY_ID=\"$NEW_CATEGORY_ID\"/" "$ENV_FILE"
        else
            echo "TEST_SERVICE_CATEGORY_ID=\"$NEW_CATEGORY_ID\"" >> "$ENV_FILE"
        fi

        echo ""
        echo "Next step:"
        echo "  1. Create a service: ./tests/api/test-create-service.sh \"Full Grooming\" $NEW_CATEGORY_ID"
    fi
else
    echo "❌ Service category creation failed"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

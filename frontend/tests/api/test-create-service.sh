#!/bin/bash

# Test script for creating a service
# Usage: ./test-create-service.sh [name] [category_id] [price] [duration]
# Example: ./test-create-service.sh "Full Grooming" 1 95.00 90

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
SERVICE_NAME="${1:-Full Grooming $(date +%s)}"
CATEGORY_ID="${2:-$TEST_SERVICE_CATEGORY_ID}"
PRICE="${3:-95.00}"
DURATION="${4:-90}"
TAX_RATE="${5:-8.5}"

if [ -z "$CATEGORY_ID" ]; then
    echo "❌ Error: No category ID provided"
    echo ""
    echo "Please provide a category ID as the second argument or set TEST_SERVICE_CATEGORY_ID in .env.test"
    exit 1
fi

echo "=========================================="
echo "Testing Create Service"
echo "=========================================="
echo ""
echo "Creating service:"
echo "  - Name: $SERVICE_NAME"
echo "  - Category ID: $CATEGORY_ID"
echo "  - Price: \$$PRICE"
echo "  - Duration: $DURATION minutes"
echo "  - Tax Rate: $TAX_RATE%"
echo "  - Description: Complete grooming service"
echo "  - Animal Types: All"
echo "  - Breeds: All"
echo ""
echo "Note: business_id is automatically extracted from JWT token"
echo ""

# Create service request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/services" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d "{
    \"name\": \"$SERVICE_NAME\",
    \"description\": \"Complete grooming service including bath, haircut, nail trim, and styling\",
    \"category_id\": $CATEGORY_ID,
    \"duration_minutes\": $DURATION,
    \"price\": $PRICE,
    \"tax_rate\": $TAX_RATE,
    \"is_active\": true,
    \"applies_to_all_animal_types\": true,
    \"applies_to_all_breeds\": true,
    \"staff_member_ids\": [],
    \"animal_type_ids\": [],
    \"animal_breed_ids\": []
  }")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 201 ]; then
    echo "✅ Service created successfully!"
    echo ""
    echo "Response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""

    # Extract service ID for future tests
    NEW_SERVICE_ID=$(echo "$BODY" | jq -r '.id' 2>/dev/null)
    if [ -n "$NEW_SERVICE_ID" ] && [ "$NEW_SERVICE_ID" != "null" ]; then
        echo "New service ID: $NEW_SERVICE_ID"

        # Save the service ID to .env.test for other tests
        if grep -q "^TEST_SERVICE_ID=" "$ENV_FILE"; then
            sed -i '' "s/^TEST_SERVICE_ID=.*/TEST_SERVICE_ID=\"$NEW_SERVICE_ID\"/" "$ENV_FILE"
        else
            echo "TEST_SERVICE_ID=\"$NEW_SERVICE_ID\"" >> "$ENV_FILE"
        fi

        echo ""
        echo "Next steps:"
        echo "  1. List all services: ./tests/api/test-list-services.sh"
        echo "  2. Get this service: ./tests/api/test-get-service.sh $NEW_SERVICE_ID"
        echo "  3. Update this service: ./tests/api/test-update-service.sh $NEW_SERVICE_ID"
        echo "  4. Delete this service: ./tests/api/test-delete-service.sh $NEW_SERVICE_ID"
    fi
else
    echo "❌ Service creation failed"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

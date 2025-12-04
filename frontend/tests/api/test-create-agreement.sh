#!/bin/bash

# Test script for creating an agreement
# Usage: ./test-create-agreement.sh [name] [signing_option]
# Example: ./test-create-agreement.sh "Service Agreement" "once"

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
AGREEMENT_NAME="${1:-Service Agreement $(date +%s)}"
SIGNING_OPTION="${2:-once}"
STATUS="${3:-active}"

# Sample HTML content
CONTENT='<p><strong>Service Agreement Terms</strong></p><ul><li><p>The pet is fit and healthy. Any grooming which takes place on an elderly or infirm pet will be at the owner'\''s risk.</p></li><li><p>Payment is to be made at the time of service. Payment can be cash or credit card.</p></li><li><p>Nail cutting, ear cleaning, and anal gland expression are part of the service unless the process is too stressful for the pet.</p></li></ul>'

echo "=========================================="
echo "Testing Create Agreement"
echo "=========================================="
echo ""
echo "Creating agreement:"
echo "  - Name: $AGREEMENT_NAME"
echo "  - Signing Option: $SIGNING_OPTION"
echo "  - Status: $STATUS"
echo "  - Content: HTML rich text"
echo ""
echo "Note: business_id is automatically extracted from JWT token"
echo ""

# Create agreement request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/agreements" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d "{
    \"name\": \"$AGREEMENT_NAME\",
    \"content\": \"$CONTENT\",
    \"signing_option\": \"$SIGNING_OPTION\",
    \"status\": \"$STATUS\"
  }")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 201 ]; then
    echo "✅ Agreement created successfully!"
    echo ""
    echo "Response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""

    # Extract agreement ID for future tests
    NEW_AGREEMENT_ID=$(echo "$BODY" | jq -r '.id' 2>/dev/null)
    if [ -n "$NEW_AGREEMENT_ID" ] && [ "$NEW_AGREEMENT_ID" != "null" ]; then
        echo "New agreement ID: $NEW_AGREEMENT_ID"

        # Save the agreement ID to .env.test for other tests
        if grep -q "^TEST_AGREEMENT_ID=" "$ENV_FILE"; then
            sed -i '' "s/^TEST_AGREEMENT_ID=.*/TEST_AGREEMENT_ID=\"$NEW_AGREEMENT_ID\"/" "$ENV_FILE"
        else
            echo "TEST_AGREEMENT_ID=\"$NEW_AGREEMENT_ID\"" >> "$ENV_FILE"
        fi

        echo ""
        echo "Next steps:"
        echo "  1. List all agreements: ./tests/api/test-list-agreements.sh"
        echo "  2. Get this agreement: ./tests/api/test-get-agreement.sh $NEW_AGREEMENT_ID"
        echo "  3. Update this agreement: ./tests/api/test-update-agreement.sh $NEW_AGREEMENT_ID"
        echo "  4. Delete this agreement: ./tests/api/test-delete-agreement.sh $NEW_AGREEMENT_ID"
    fi
else
    echo "❌ Agreement creation failed"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

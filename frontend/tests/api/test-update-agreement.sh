#!/bin/bash

# Test script for updating an agreement
# Usage: ./test-update-agreement.sh [agreement_id] [name] [signing_option] [status]
# Example: ./test-update-agreement.sh 1 "Updated Agreement" "every" "draft"

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
AGREEMENT_ID="${1:-$TEST_AGREEMENT_ID}"
UPDATED_NAME="${2:-Updated Service Agreement $(date +%s)}"
UPDATED_SIGNING_OPTION="${3:-every}"
UPDATED_STATUS="${4:-draft}"

if [ -z "$AGREEMENT_ID" ]; then
    echo "❌ Error: Agreement ID is required"
    echo ""
    echo "Usage: ./test-update-agreement.sh [agreement_id] [name] [signing_option] [status]"
    echo ""
    echo "Or create an agreement first:"
    echo "  ./tests/api/test-create-agreement.sh"
    exit 1
fi

# Updated HTML content
UPDATED_CONTENT='<p><strong>Updated Service Agreement Terms</strong></p><ul><li><p>UPDATED: The pet is fit and healthy. Any grooming which takes place on an elderly or infirm pet will be at the owner'\''s risk.</p></li><li><p>Payment is to be made at the time of service. Payment can be cash or credit card.</p></li><li><p>Nail cutting, ear cleaning, and anal gland expression are part of the service.</p></li><li><p>NEW: Cancellations require 48 hours notice.</p></li></ul>'

echo "=========================================="
echo "Testing Update Agreement"
echo "=========================================="
echo ""
echo "Updating agreement ID: $AGREEMENT_ID"
echo "  - New Name: $UPDATED_NAME"
echo "  - New Signing Option: $UPDATED_SIGNING_OPTION"
echo "  - New Status: $UPDATED_STATUS"
echo "  - New Content: Updated HTML rich text"
echo ""

# Update agreement request
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$API_URL/api/agreements/$AGREEMENT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d "{
    \"name\": \"$UPDATED_NAME\",
    \"content\": \"$UPDATED_CONTENT\",
    \"signing_option\": \"$UPDATED_SIGNING_OPTION\",
    \"status\": \"$UPDATED_STATUS\"
  }")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Agreement updated successfully!"
    echo ""
    echo "Updated agreement:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""

    # Extract updated details
    NAME=$(echo "$BODY" | jq -r '.name' 2>/dev/null)
    SIGNING_OPTION=$(echo "$BODY" | jq -r '.signing_option' 2>/dev/null)
    STATUS=$(echo "$BODY" | jq -r '.status' 2>/dev/null)
    UPDATED_AT=$(echo "$BODY" | jq -r '.updated_at' 2>/dev/null)

    echo "Summary:"
    echo "  - Name: $NAME"
    echo "  - Signing Option: $SIGNING_OPTION"
    echo "  - Status: $STATUS"
    echo "  - Last Updated: $UPDATED_AT"
    echo ""

    echo "Next steps:"
    echo "  1. Get updated agreement: ./tests/api/test-get-agreement.sh $AGREEMENT_ID"
    echo "  2. List all agreements: ./tests/api/test-list-agreements.sh"
    echo "  3. Delete this agreement: ./tests/api/test-delete-agreement.sh $AGREEMENT_ID"
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo "❌ Agreement not found (ID: $AGREEMENT_ID)"
    echo ""
    echo "Create an agreement first:"
    echo "  ./tests/api/test-create-agreement.sh"
else
    echo "❌ Failed to update agreement"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

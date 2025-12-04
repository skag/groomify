#!/bin/bash

# Test script for getting a single staff member
# Usage: ./test-get-staff.sh [user_id]
# Example: ./test-get-staff.sh 9

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

# Get user ID from argument
USER_ID="$1"

if [ -z "$USER_ID" ]; then
    echo "❌ Error: User ID is required"
    echo ""
    echo "Usage: ./test-get-staff.sh [user_id]"
    echo "Example: ./test-get-staff.sh 9"
    echo ""
    echo "Tip: Run ./tests/api/test-list-staff.sh to see available staff IDs"
    exit 1
fi

echo "=========================================="
echo "Testing Get Staff Member"
echo "=========================================="
echo ""
echo "Fetching staff member ID: $USER_ID"
echo ""

# Get staff member request
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/business-users/$USER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Staff member retrieved successfully!"
    echo ""
    echo "Response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""

    # Extract key info
    STAFF_NAME=$(echo "$BODY" | jq -r '"\(.first_name) \(.last_name)"' 2>/dev/null)
    STAFF_EMAIL=$(echo "$BODY" | jq -r '.email' 2>/dev/null)
    STAFF_ROLE=$(echo "$BODY" | jq -r '.role' 2>/dev/null)

    echo "Staff details:"
    echo "  - Name: $STAFF_NAME"
    echo "  - Email: $STAFF_EMAIL"
    echo "  - Role: $STAFF_ROLE"
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo "❌ Staff member not found"
    echo ""
    echo "The staff member with ID $USER_ID does not exist or does not belong to your business."
    echo ""
    echo "Run ./tests/api/test-list-staff.sh to see available staff members"
else
    echo "❌ Failed to get staff member"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

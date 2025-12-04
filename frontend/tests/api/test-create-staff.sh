#!/bin/bash

# Test script for creating a staff member
# Usage: ./test-create-staff.sh [first_name] [last_name] [email] [role]
# Example: ./test-create-staff.sh "Jane" "Groomer" "jane@example.com" "groomer"

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
FIRST_NAME="${1:-Jane}"
LAST_NAME="${2:-Groomer}"
EMAIL="${3:-jane$(date +%s)@example.com}"
ROLE="${4:-groomer}"
PHONE="${5:-555-1234}"
START_DATE=$(date +%Y-%m-%d)

echo "=========================================="
echo "Testing Create Staff Member"
echo "=========================================="
echo ""
echo "Creating staff member:"
echo "  - Name: $FIRST_NAME $LAST_NAME"
echo "  - Email: $EMAIL"
echo "  - Role: $ROLE"
echo "  - Phone: $PHONE"
echo "  - Start Date: $START_DATE"
echo ""
echo "Note: business_id is automatically extracted from JWT token"
echo ""

# Create staff member request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/business-users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d "{
    \"first_name\": \"$FIRST_NAME\",
    \"last_name\": \"$LAST_NAME\",
    \"email\": \"$EMAIL\",
    \"phone\": \"$PHONE\",
    \"role\": \"$ROLE\",
    \"start_date\": \"$START_DATE\"
  }")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 201 ]; then
    echo "✅ Staff member created successfully!"
    echo ""
    echo "Response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""

    # Extract user ID for future tests
    NEW_USER_ID=$(echo "$BODY" | jq -r '.id' 2>/dev/null)
    if [ -n "$NEW_USER_ID" ] && [ "$NEW_USER_ID" != "null" ]; then
        echo "New staff member ID: $NEW_USER_ID"
        echo ""
        echo "Next steps:"
        echo "  1. List all staff: ./tests/api/test-list-staff.sh"
        echo "  2. Get this staff member: ./tests/api/test-get-staff.sh $NEW_USER_ID"
    fi
else
    echo "❌ Staff creation failed"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

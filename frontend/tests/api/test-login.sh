#!/bin/bash

# Test script for user login
# Logs in with credentials from .env.test and saves JWT token

API_URL="http://localhost:8000"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.test"

# Load test credentials
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found"
    echo ""
    echo "Please run ./tests/api/test-register.sh first to create test credentials"
    exit 1
fi

source "$ENV_FILE"

if [ -z "$TEST_EMAIL" ] || [ -z "$TEST_PASSWORD" ]; then
    echo "❌ Error: TEST_EMAIL or TEST_PASSWORD not set in $ENV_FILE"
    exit 1
fi

echo "=========================================="
echo "Testing Login"
echo "=========================================="
echo ""
echo "Email: $TEST_EMAIL"
echo ""

# Login request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Login successful!"
    echo ""
    echo "Response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""

    # Extract token and save to .env.test
    TOKEN=$(echo "$BODY" | jq -r '.access_token' 2>/dev/null)
    BUSINESS_ID=$(echo "$BODY" | jq -r '.business_id' 2>/dev/null)
    USER_ID=$(echo "$BODY" | jq -r '.user_id' 2>/dev/null)
    ROLE=$(echo "$BODY" | jq -r '.role' 2>/dev/null)

    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        echo "Saving token to $ENV_FILE"
        cat >> "$ENV_FILE" << EOF

# Login session from $(date)
TEST_TOKEN="$TOKEN"
TEST_BUSINESS_ID="$BUSINESS_ID"
TEST_USER_ID="$USER_ID"
TEST_ROLE="$ROLE"
EOF
        echo "✅ Token saved"
        echo ""
        echo "Token info:"
        echo "  - Business ID: $BUSINESS_ID"
        echo "  - User ID: $USER_ID"
        echo "  - Role: $ROLE"
        echo ""
        echo "Next steps:"
        echo "  1. Create staff: ./tests/api/test-create-staff.sh \"Jane\" \"Groomer\" \"jane@example.com\" \"groomer\""
        echo "  2. List staff: ./tests/api/test-list-staff.sh"
    else
        echo "⚠️  Warning: Could not extract token from response"
    fi
else
    echo "❌ Login failed"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

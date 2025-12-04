#!/bin/bash

# Test script for registering a new business
# Creates a new business and owner account

API_URL="http://localhost:8000"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.test"

# Generate unique email for testing
TIMESTAMP=$(date +%s)
TEST_EMAIL="testowner${TIMESTAMP}@example.com"
TEST_PASSWORD="TestPass123"
BUSINESS_NAME="Test Grooming Co ${TIMESTAMP}"

echo "=========================================="
echo "Testing Business Registration"
echo "=========================================="
echo ""
echo "Creating business: $BUSINESS_NAME"
echo "Owner email: $TEST_EMAIL"
echo ""

# Create registration request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"business_name\": \"$BUSINESS_NAME\",
    \"first_name\": \"Test\",
    \"last_name\": \"Owner\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "✅ Registration successful!"
    echo ""
    echo "Response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""

    # Save credentials to .env.test
    echo "Saving credentials to $ENV_FILE"
    cat > "$ENV_FILE" << EOF
# Test credentials generated on $(date)
TEST_EMAIL="$TEST_EMAIL"
TEST_PASSWORD="$TEST_PASSWORD"
TEST_BUSINESS_NAME="$BUSINESS_NAME"
EOF
    echo "✅ Credentials saved"
    echo ""
    echo "Next steps:"
    echo "  1. Run: ./tests/api/test-login.sh"
    echo "  2. Then test staff creation with: ./tests/api/test-create-staff.sh"
else
    echo "❌ Registration failed"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

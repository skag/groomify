#!/bin/bash

# Master test script that runs all API tests in sequence
# This demonstrates the complete workflow

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        Groomify API Test Suite - Full Workflow            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Register
echo "📝 STEP 1: Register new business"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
"$SCRIPT_DIR/test-register.sh"
if [ $? -ne 0 ]; then
    echo "❌ Registration failed. Aborting tests."
    exit 1
fi
echo ""

# Test 2: Login
echo "🔐 STEP 2: Login to get JWT token"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
"$SCRIPT_DIR/test-login.sh"
if [ $? -ne 0 ]; then
    echo "❌ Login failed. Aborting tests."
    exit 1
fi
echo ""

# Test 3: Create multiple staff members
echo "👥 STEP 3: Create staff members"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Creating groomer..."
"$SCRIPT_DIR/test-create-staff.sh" "Jane" "Groomer" "jane.groomer@example.com" "groomer"
if [ $? -ne 0 ]; then
    echo "❌ Failed to create groomer"
    exit 1
fi
echo ""

echo "Creating staff member..."
"$SCRIPT_DIR/test-create-staff.sh" "Bob" "Manager" "bob.manager@example.com" "staff"
if [ $? -ne 0 ]; then
    echo "❌ Failed to create staff member"
    exit 1
fi
echo ""

# Test 4: List all staff
echo "📋 STEP 4: List all staff members"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
"$SCRIPT_DIR/test-list-staff.sh"
if [ $? -ne 0 ]; then
    echo "❌ Failed to list staff"
    exit 1
fi
echo ""

# Test 5: Create agreements
echo "📄 STEP 5: Create agreements"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Creating service agreement (sign once)..."
"$SCRIPT_DIR/test-create-agreement.sh" "Service Agreement" "once"
if [ $? -ne 0 ]; then
    echo "❌ Failed to create service agreement"
    exit 1
fi
echo ""

echo "Creating liability waiver (sign every booking)..."
"$SCRIPT_DIR/test-create-agreement.sh" "Liability Waiver" "every"
if [ $? -ne 0 ]; then
    echo "❌ Failed to create liability waiver"
    exit 1
fi
echo ""

# Test 6: List all agreements
echo "📋 STEP 6: List all agreements"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
"$SCRIPT_DIR/test-list-agreements.sh"
if [ $? -ne 0 ]; then
    echo "❌ Failed to list agreements"
    exit 1
fi
echo ""

# Test 7: Update an agreement
echo "✏️  STEP 7: Update an agreement"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
"$SCRIPT_DIR/test-update-agreement.sh"
if [ $? -ne 0 ]; then
    echo "❌ Failed to update agreement"
    exit 1
fi
echo ""

# Test 8: List animal types
echo "🐾 STEP 8: List animal types"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
"$SCRIPT_DIR/test-list-animal-types.sh"
if [ $? -ne 0 ]; then
    echo "❌ Failed to list animal types"
    exit 1
fi
echo ""

# Test 9: Get animal type with breeds
echo "🔍 STEP 9: Get animal type details with breeds"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
"$SCRIPT_DIR/test-get-animal-type.sh"
if [ $? -ne 0 ]; then
    echo "❌ Failed to get animal type"
    exit 1
fi
echo ""

# Test 10: List breeds for animal type
echo "📋 STEP 10: List breeds for animal type"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
"$SCRIPT_DIR/test-list-breeds.sh"
if [ $? -ne 0 ]; then
    echo "❌ Failed to list breeds"
    exit 1
fi
echo ""

# Test 11: Create service category
echo "🏷️  STEP 11: Create service category"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
"$SCRIPT_DIR/test-create-service-category.sh" "Grooming"
if [ $? -ne 0 ]; then
    echo "❌ Failed to create service category"
    exit 1
fi
echo ""

# Test 12: Create service
echo "✂️  STEP 12: Create service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
"$SCRIPT_DIR/test-create-service.sh" "Full Grooming"
if [ $? -ne 0 ]; then
    echo "❌ Failed to create service"
    exit 1
fi
echo ""

# Test 13: List all services
echo "📋 STEP 13: List all services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
"$SCRIPT_DIR/test-list-services.sh"
if [ $? -ne 0 ]; then
    echo "❌ Failed to list services"
    exit 1
fi
echo ""

# Test 14: Update service
echo "✏️  STEP 14: Update service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
"$SCRIPT_DIR/test-update-service.sh"
if [ $? -ne 0 ]; then
    echo "❌ Failed to update service"
    exit 1
fi
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   ✅ ALL TESTS PASSED!                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Summary:"
echo "  ✅ Business registration"
echo "  ✅ User authentication (JWT)"
echo "  ✅ Staff creation (business_id from token)"
echo "  ✅ Staff listing"
echo "  ✅ Agreement creation (multiple signing options)"
echo "  ✅ Agreement listing"
echo "  ✅ Agreement updates"
echo "  ✅ Animal types listing"
echo "  ✅ Animal type details with breeds"
echo "  ✅ Breed listing by animal type"
echo "  ✅ Service category creation"
echo "  ✅ Service creation with relationships"
echo "  ✅ Service listing with expanded data"
echo "  ✅ Service updates"
echo ""
echo "Key Achievement:"
echo "  🎯 All operations use business_id from JWT token"
echo "  🎯 No need to pass business_id in request bodies"
echo "  🎯 Rich text HTML content support"
echo "  🎯 Global lookup tables for animal types and breeds"
echo "  🎯 Per-business service categories and services"
echo "  🎯 Many-to-many relationships (staff, animal types, breeds)"
echo "  🎯 Secure and RESTful API design"

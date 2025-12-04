# Agreement API Tests

Test scripts for the Service Agreement CRUD API endpoints.

## Prerequisites

1. Backend server running on `http://localhost:8000`
2. Valid JWT token (obtained via login)
3. `jq` installed for JSON parsing: `brew install jq`

## Quick Start

```bash
# Navigate to tests directory
cd frontend/tests/api

# Run all tests (including agreements)
./run-all-tests.sh

# Or run agreement tests individually
./test-create-agreement.sh
./test-list-agreements.sh
./test-get-agreement.sh [agreement_id]
./test-update-agreement.sh [agreement_id]
./test-delete-agreement.sh [agreement_id]
```

## Test Scripts

### 1. Create Agreement
**Script**: `test-create-agreement.sh`

Creates a new agreement with HTML rich text content.

```bash
# Basic usage (uses defaults)
./test-create-agreement.sh

# With custom name and signing option
./test-create-agreement.sh "My Agreement" "once"

# With custom name, signing option, and status
./test-create-agreement.sh "My Agreement" "once" "draft"

# Signing options: "once", "every", "manual"
# Status options: "active", "draft", "archived"
./test-create-agreement.sh "Liability Waiver" "every" "active"
```

**What it tests:**
- ✅ POST to `/api/agreements`
- ✅ JWT authentication
- ✅ Business ID extraction from token
- ✅ HTML content handling
- ✅ Signing option validation
- ✅ Status field handling
- ✅ Returns 201 status on success

### 2. List Agreements
**Script**: `test-list-agreements.sh`

Lists all agreements for the authenticated business.

```bash
./test-list-agreements.sh
```

**What it tests:**
- ✅ GET to `/api/agreements`
- ✅ JWT authentication
- ✅ Returns array of agreements
- ✅ Filters by business_id from token
- ✅ Returns 200 status on success

### 3. Get Agreement
**Script**: `test-get-agreement.sh`

Retrieves a single agreement by ID.

```bash
# Using saved agreement ID
./test-get-agreement.sh

# Or specify an ID
./test-get-agreement.sh 1
```

**What it tests:**
- ✅ GET to `/api/agreements/{id}`
- ✅ JWT authentication
- ✅ Returns single agreement
- ✅ Validates business ownership
- ✅ Returns 404 if not found
- ✅ Returns 200 on success

### 4. Update Agreement
**Script**: `test-update-agreement.sh`

Updates an existing agreement.

```bash
# Using saved agreement ID (defaults to draft status)
./test-update-agreement.sh

# Or specify ID, name, signing option, and status
./test-update-agreement.sh 1 "Updated Name" "manual" "archived"

# Test status changes
./test-update-agreement.sh 1 "Active Agreement" "once" "active"
./test-update-agreement.sh 1 "Draft Agreement" "once" "draft"
```

**What it tests:**
- ✅ PUT to `/api/agreements/{id}`
- ✅ JWT authentication
- ✅ Partial updates
- ✅ HTML content updates
- ✅ Status updates (active, draft, archived)
- ✅ Validates business ownership
- ✅ Updates `updated_at` timestamp
- ✅ Returns 200 on success

### 5. Delete Agreement
**Script**: `test-delete-agreement.sh`

Deletes an agreement (with confirmation prompt).

```bash
# Using saved agreement ID
./test-delete-agreement.sh

# Or specify an ID
./test-delete-agreement.sh 1
```

**What it tests:**
- ✅ DELETE to `/api/agreements/{id}`
- ✅ JWT authentication
- ✅ Validates business ownership
- ✅ Permanent deletion
- ✅ Returns 404 if not found
- ✅ Returns 200 on success

## Signing Options

The agreement API supports three signing options:

1. **`once`** - Customer signs once (e.g., general terms)
2. **`every`** - Customer signs on every booking (e.g., liability waiver)
3. **`manual`** - Not required automatically, sent manually by staff

## Agreement Status

The agreement API supports three status values:

1. **`active`** - Agreement is currently in use
2. **`draft`** - Agreement is being prepared (not shown to customers)
3. **`archived`** - Agreement is no longer in use (historical records)

## HTML Content Support

All agreements support rich text HTML content. The test scripts include sample HTML with:
- Bold/italic text
- Bullet lists
- Paragraphs
- Headings

Example from tests:
```html
<p><strong>Service Agreement Terms</strong></p>
<ul>
  <li><p>The pet is fit and healthy.</p></li>
  <li><p>Payment is to be made at the time of service.</p></li>
</ul>
```

## Environment Variables

Test scripts use `.env.test` to store:
- `TEST_TOKEN` - JWT access token
- `TEST_AGREEMENT_ID` - Last created agreement ID
- `TEST_BUSINESS_ID` - Business ID for reference

## Expected Response Format

### Single Agreement
```json
{
  "id": 1,
  "business_id": 13,
  "name": "Service Agreement",
  "content": "<p><strong>Terms...</strong></p>",
  "signing_option": "once",
  "status": "active",
  "created_at": "2025-12-03T13:00:00.000Z",
  "updated_at": "2025-12-03T13:00:00.000Z"
}
```

### Agreement List
```json
[
  {
    "id": 1,
    "business_id": 13,
    "name": "Service Agreement",
    "signing_option": "once",
    "status": "active",
    ...
  },
  {
    "id": 2,
    "business_id": 13,
    "name": "Liability Waiver",
    "signing_option": "every",
    "status": "draft",
    ...
  }
]
```

## Error Scenarios

### 401 Unauthorized
- Missing or invalid JWT token
- Token expired (need to login again)

### 403 Forbidden
- User doesn't have admin role
- Only owners and staff can manage agreements

### 404 Not Found
- Agreement doesn't exist
- Agreement belongs to different business

### 400 Bad Request
- Missing required fields (name, content)
- Invalid signing_option value (must be: once, every, manual)
- Invalid status value (must be: active, draft, archived)

## Troubleshooting

### Token Expired
```bash
# Re-login to get a fresh token
./test-login.sh
```

### Agreement Not Found
```bash
# List all agreements to see available IDs
./test-list-agreements.sh
```

### Permission Denied
```bash
# Check your role (must be owner or staff)
echo $TEST_ROLE
```

## Complete Workflow Example

```bash
# 1. Register and login (if not done already)
./test-register.sh
./test-login.sh

# 2. Create multiple agreements with different statuses
./test-create-agreement.sh "Service Terms" "once" "active"
./test-create-agreement.sh "Liability Waiver" "every" "active"
./test-create-agreement.sh "Cancellation Policy" "manual" "draft"

# 3. List all agreements
./test-list-agreements.sh

# 4. Update an agreement (including status change)
./test-update-agreement.sh 1 "Updated Service Terms" "once" "archived"

# 5. Get specific agreement
./test-get-agreement.sh 1

# 6. Delete an agreement
./test-delete-agreement.sh 3
```

## Notes

- All tests use the business_id from the JWT token
- No need to pass business_id in request bodies
- HTML content is stored as-is (no sanitization in tests)
- Agreements are scoped to businesses (multi-tenancy)
- Delete operations are permanent (no soft delete)

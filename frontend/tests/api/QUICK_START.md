# Quick Start Guide

## 🚀 Run All Tests at Once

The easiest way to test the API:

```bash
cd frontend
./tests/api/run-all-tests.sh
```

This will automatically:
1. ✅ Register a new business
2. ✅ Login and get JWT token
3. ✅ Create staff members
4. ✅ List all staff

## 📝 Individual Tests

### 1. Register a Business

```bash
./tests/api/test-register.sh
```

Creates a new business and owner, saves credentials to `.env.test`

### 2. Login

```bash
./tests/api/test-login.sh
```

Login with saved credentials, saves JWT token

### 3. Create Staff Member

```bash
# With arguments
./tests/api/test-create-staff.sh "Jane" "Doe" "jane@example.com" "groomer"

# With defaults (auto-generates unique email)
./tests/api/test-create-staff.sh
```

**Important:** Notice that `business_id` is NOT in the request body. It's extracted from the JWT token! 🎯

### 4. List All Staff

```bash
./tests/api/test-list-staff.sh
```

### 5. Get Single Staff Member

```bash
./tests/api/test-get-staff.sh 11
```

## 🔑 Key Features Demonstrated

### JWT-Based Authentication
- All protected endpoints require `Authorization: Bearer <token>` header
- Token contains: `user_id`, `email`, `business_id`, `role`

### Automatic Tenant Scoping
- `business_id` is extracted from JWT token, not from request body
- This prevents users from accessing other businesses' data
- Cleaner API design following REST conventions

### Example Request Comparison

**❌ Old Way (Insecure):**
```json
POST /api/business-users
{
  "business_id": 13,  // Could be manipulated!
  "first_name": "Jane",
  "email": "jane@example.com"
}
```

**✅ New Way (Secure):**
```json
POST /api/business-users
Authorization: Bearer eyJhbGci...
{
  "first_name": "Jane",
  "email": "jane@example.com"
}
```

## 🛠️ Requirements

- Backend server running on `http://localhost:8000`
- `curl` (pre-installed on macOS/Linux)
- `jq` for JSON formatting (optional but recommended):
  ```bash
  brew install jq
  ```

## 📂 Test Files

All test credentials and tokens are stored in:
```
frontend/tests/api/.env.test
```

This file is git-ignored for security.

## 🧹 Clean Up

To start fresh, delete the test environment:
```bash
rm frontend/tests/api/.env.test
```

Then run tests again!

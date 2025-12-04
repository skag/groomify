# API Test Scripts

This directory contains curl-based test scripts for testing the Groomify API.

## Prerequisites

- Backend server running on `http://localhost:8000`
- `curl` installed (comes with macOS/Linux)
- `jq` installed for JSON formatting (optional): `brew install jq`

## Test Scripts

### Authentication Tests
- `test-register.sh` - Register a new business and owner
- `test-login.sh` - Login and get JWT token

### Business Users (Staff) Tests
- `test-create-staff.sh` - Create a new staff member (requires auth)
- `test-list-staff.sh` - List all staff members (requires auth)
- `test-get-staff.sh` - Get a single staff member (requires auth)

## Usage

### 1. Register a New Business

```bash
./tests/api/test-register.sh
```

This will create a new business and owner account, and save the credentials to `.env.test`.

### 2. Login

```bash
./tests/api/test-login.sh
```

This will login with the credentials from `.env.test` and save the JWT token.

### 3. Create Staff Member

```bash
./tests/api/test-create-staff.sh "Jane" "Groomer" "jane@example.com" "groomer"
```

### 4. List Staff Members

```bash
./tests/api/test-list-staff.sh
```

### 5. Get Single Staff Member

```bash
./tests/api/test-get-staff.sh 9
```

## Environment Variables

Tests use `.env.test` file to store:
- `TEST_EMAIL` - Test user email
- `TEST_PASSWORD` - Test user password
- `TEST_TOKEN` - JWT access token

This file is created automatically when you run `test-register.sh` or `test-login.sh`.

## Notes

- All staff creation endpoints now use JWT tokens for authentication
- `business_id` is automatically extracted from the JWT token
- No need to pass `business_id` in request bodies

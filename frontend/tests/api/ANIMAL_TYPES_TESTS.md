# Animal Types & Breeds API Tests

Test scripts for the Animal Types and Breeds lookup API endpoints.

## Prerequisites

1. Backend server running on `http://localhost:8000`
2. Valid JWT token (obtained via login)
3. `jq` installed for JSON parsing: `brew install jq`

## Quick Start

```bash
# Navigate to tests directory
cd frontend/tests/api

# Run all tests (including animal types)
./run-all-tests.sh

# Or run animal type tests individually
./test-list-animal-types.sh
./test-get-animal-type.sh [animal_type_id]
./test-list-breeds.sh [animal_type_id]
```

## Test Scripts

### 1. List Animal Types
**Script**: `test-list-animal-types.sh`

Lists all available animal types with their IDs.

```bash
# Basic usage
./test-list-animal-types.sh
```

**What it tests:**
- ✅ GET to `/api/animal-types`
- ✅ JWT authentication
- ✅ Returns array of animal types with IDs
- ✅ Returns 200 status on success
- ✅ Saves first animal type ID to `.env.test` for subsequent tests

**Example Output:**
```
Total animal types: 2

Animal Types:
  - ID: 2 | Name: dog
  - ID: 3 | Name: cat
```

### 2. Get Animal Type with Breeds
**Script**: `test-get-animal-type.sh`

Retrieves a specific animal type with all its associated breeds.

```bash
# Using saved animal type ID from previous test
./test-get-animal-type.sh

# Or specify an ID
./test-get-animal-type.sh 2
```

**What it tests:**
- ✅ GET to `/api/animal-types/{id}`
- ✅ JWT authentication
- ✅ Returns animal type details with breeds array
- ✅ Returns 404 if animal type not found
- ✅ Returns 200 on success

**Example Output:**
```
Summary:
  - ID: 2
  - Name: dog
  - Total Breeds: 2

Breeds (showing first 5):
  - labrador (ID: 1)
  - poodle (ID: 2)
```

### 3. List Breeds for Animal Type
**Script**: `test-list-breeds.sh`

Lists all breeds for a specific animal type.

```bash
# Using saved animal type ID
./test-list-breeds.sh

# Or specify an ID
./test-list-breeds.sh 2
```

**What it tests:**
- ✅ GET to `/api/animal-types/{id}/breeds`
- ✅ JWT authentication
- ✅ Returns array of breeds for the animal type
- ✅ Returns 404 if animal type not found
- ✅ Returns 200 on success
- ✅ Saves first breed ID to `.env.test` for subsequent tests

**Example Output:**
```
Total breeds: 2

Breed List:
  - labrador (ID: 1)
  - poodle (ID: 2)
```

## Environment Variables

Test scripts use `.env.test` to store:
- `TEST_TOKEN` - JWT access token
- `TEST_ANIMAL_TYPE_ID` - Last fetched animal type ID
- `TEST_BREED_ID` - Last fetched breed ID

## Expected Response Format

### List Animal Types
```json
[
  {
    "id": 2,
    "name": "dog",
    "created_at": "2025-12-03T13:26:37.009291-08:00",
    "updated_at": "2025-12-03T13:26:37.009291-08:00"
  },
  {
    "id": 3,
    "name": "cat",
    "created_at": "2025-12-03T13:26:37.009291-08:00",
    "updated_at": "2025-12-03T13:26:37.009291-08:00"
  }
]
```

### Get Animal Type with Breeds
```json
{
  "id": 2,
  "name": "dog",
  "created_at": "2025-12-03T13:26:37.009291-08:00",
  "updated_at": "2025-12-03T13:26:37.009291-08:00",
  "breeds": [
    {
      "id": 1,
      "name": "labrador",
      "animal_type_id": 2,
      "created_at": "2025-12-03T13:26:52.550685-08:00",
      "updated_at": "2025-12-03T13:26:52.550685-08:00"
    },
    {
      "id": 2,
      "name": "poodle",
      "animal_type_id": 2,
      "created_at": "2025-12-03T13:27:04.202616-08:00",
      "updated_at": "2025-12-03T13:27:04.202616-08:00"
    }
  ]
}
```

### List Breeds
```json
[
  {
    "id": 1,
    "name": "labrador",
    "animal_type_id": 2,
    "created_at": "2025-12-03T13:26:52.550685-08:00",
    "updated_at": "2025-12-03T13:26:52.550685-08:00"
  },
  {
    "id": 2,
    "name": "poodle",
    "animal_type_id": 2,
    "created_at": "2025-12-03T13:27:04.202616-08:00",
    "updated_at": "2025-12-03T13:27:04.202616-08:00"
  }
]
```

## Error Scenarios

### 401 Unauthorized
- Missing or invalid JWT token
- Token expired (need to login again)

### 404 Not Found
- Animal type doesn't exist
- Invalid animal type ID

## Use Cases

### Frontend Service Creation
When building the service creation modal, use these endpoints:

1. **Fetch animal types for dropdown:**
   ```bash
   GET /api/animal-types
   # Returns: [{ id: 2, name: "dog" }, { id: 3, name: "cat" }]
   ```

2. **Get breeds for selected animal type:**
   ```bash
   GET /api/animal-types/2/breeds
   # Returns: [{ id: 1, name: "labrador" }, { id: 2, name: "poodle" }]
   ```

3. **Get all data at once (animal type + breeds):**
   ```bash
   GET /api/animal-types/2
   # Returns: { id: 2, name: "dog", breeds: [...] }
   ```

## Data Model

### Animal Type
- Global lookup table (shared across all businesses)
- Examples: Dog, Cat, Bird, Horse, Rabbit
- Each animal type has multiple breeds

### Breed
- Global lookup table (shared across all businesses)
- Belongs to a specific animal type
- Examples: Labrador (Dog), Persian (Cat), Parakeet (Bird)

## Troubleshooting

### Token Expired
```bash
# Re-login to get a fresh token
./test-login.sh
```

### Animal Type Not Found
```bash
# List all available animal types
./test-list-animal-types.sh
```

### No Breeds Found
Some animal types may not have breeds in the database yet. This is not an error - the API will return an empty array.

## Complete Workflow Example

```bash
# 1. Register and login (if not done already)
./test-register.sh
./test-login.sh

# 2. List all animal types
./test-list-animal-types.sh

# 3. Get details for dog (ID: 2)
./test-get-animal-type.sh 2

# 4. List only breeds for dog
./test-list-breeds.sh 2

# 5. Get details for cat (ID: 3)
./test-get-animal-type.sh 3

# 6. List only breeds for cat
./test-list-breeds.sh 3
```

## Notes

- Animal types and breeds are **global lookup tables**
- All businesses share the same animal types and breeds
- These endpoints are **read-only** (no create/update/delete)
- Authentication is required for all endpoints
- Useful for building service creation forms with animal type/breed selection

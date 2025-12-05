# Payment Integration - Phase 1: OAuth & Device Pairing

This document describes the payment processing integration for Groomify, specifically Phase 1 which covers OAuth authorization and Square Terminal device pairing.

## Overview

The payment integration is designed to be **provider-agnostic**, supporting multiple payment processors (Square, Clover, etc.) through a common interface. Phase 1 focuses on:

1. **OAuth Flow**: Connect business's Square account to Groomify
2. **Device Pairing**: Pair Square Terminal devices for payment processing

## Architecture

### Provider-Agnostic Design

The integration uses an abstract interface pattern to support multiple providers:

```
PaymentProviderInterface (Abstract)
├── SquarePaymentProvider (Implementation)
└── CloverPaymentProvider (Future)
```

### Database Schema

**payment_configurations** table:
- Stores per-business payment provider credentials (encrypted)
- Fields: `business_id`, `provider`, `is_active`, `encrypted_credentials`, `settings`
- One active configuration per business per provider

**payment_devices** table:
- Stores paired payment terminals
- Fields: `device_id`, `device_name`, `location_id`, `is_active`, `paired_at`
- Supports multiple devices per business
- All staff can use any device

### Key Components

1. **Models** ([backend/app/models/](backend/app/models/))
   - `payment_configuration.py` - Provider credentials storage
   - `payment_device.py` - Terminal device records

2. **Services** ([backend/app/services/](backend/app/services/))
   - `payment_provider_interface.py` - Abstract provider interface
   - `providers/square_provider.py` - Square implementation
   - `payment_service.py` - Business logic layer

3. **API** ([backend/app/api/payments.py](backend/app/api/payments.py))
   - OAuth endpoints
   - Device pairing endpoints

4. **Encryption** ([backend/app/core/encryption.py](backend/app/core/encryption.py))
   - Fernet encryption for OAuth tokens
   - Credentials stored encrypted at rest

## Setup

### 1. Environment Variables

Add to `.env`:

```bash
# Square Configuration
SQUARE_APP_ID=sandbox-sq0idb-YOUR_APP_ID
SQUARE_APP_SECRET=sandbox-sq0csb-YOUR_APP_SECRET
SQUARE_REDIRECT_URI=http://localhost:8000/api/payments/oauth/callback
SQUARE_ENVIRONMENT=sandbox  # or "production"

# Encryption Key
PAYMENT_ENCRYPTION_KEY=your_fernet_key_here
```

Generate encryption key:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 2. Square Developer Account Setup

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Create a new application or use existing
3. Get your **Application ID** and **Application Secret**
4. Configure OAuth redirect URL: `http://localhost:8000/api/payments/oauth/callback`
5. Required permissions:
   - `MERCHANT_PROFILE_READ`
   - `PAYMENTS_READ`
   - `PAYMENTS_WRITE`
   - `DEVICE_CREDENTIAL_MANAGEMENT`

### 3. Database Migration

```bash
uv run alembic upgrade head
```

This creates `payment_configurations` and `payment_devices` tables.

## API Endpoints

### OAuth Flow

#### 1. Get Authorization URL
```http
GET /api/payments/oauth/authorize?provider=square
Authorization: Bearer {owner_token}
```

Response:
```json
{
  "authorization_url": "https://connect.squareupsandbox.com/oauth2/authorize?...",
  "state": "csrf_state_token"
}
```

**Usage**: Redirect user's browser to `authorization_url`

#### 2. Handle OAuth Callback
```http
POST /api/payments/oauth/callback?provider=square
Authorization: Bearer {owner_token}
Content-Type: application/json

{
  "code": "authorization_code_from_square",
  "state": "csrf_state_token"
}
```

Response:
```json
{
  "id": 1,
  "business_id": 123,
  "provider": "square",
  "is_active": true,
  "has_credentials": true,
  "location_id": "L1234...",
  "settings": {
    "environment": "sandbox",
    "merchant_id": "M1234..."
  }
}
```

**What it does**:
- Exchanges authorization code for access/refresh tokens
- Encrypts and stores tokens in database
- Retrieves merchant's locations
- Returns configuration

#### 3. Disconnect OAuth
```http
DELETE /api/payments/oauth/disconnect?provider=square
Authorization: Bearer {owner_token}
```

Response:
```json
{
  "success": true,
  "message": "Payment provider disconnected successfully"
}
```

#### 4. Get Configuration
```http
GET /api/payments/config
Authorization: Bearer {owner_or_staff_token}
```

### Device Pairing

#### 1. Initiate Pairing (Real Device)
```http
POST /api/payments/devices/pair
Authorization: Bearer {owner_or_staff_token}
Content-Type: application/json

{
  "device_name": "Front Desk Terminal",
  "location_id": "L1234..."  // optional, uses default if not provided
}
```

Response:
```json
{
  "pairing_code": "ABCD-1234",
  "device_id": "device_code_123",
  "expires_at": "2024-12-05T12:00:00Z",
  "status": "PENDING"
}
```

**What to do**: Display `pairing_code` to user to enter on Square Terminal

#### 2. Check Pairing Status
```http
POST /api/payments/devices/pair/status
Authorization: Bearer {owner_or_staff_token}
Content-Type: application/json

{
  "device_code_id": "device_code_123"
}
```

Response (while pending):
```json
{
  "status": "PENDING",
  "device_id": null
}
```

Response (when paired):
```json
{
  "status": "PAIRED",
  "device_id": "device_abc123"
}
```

**Usage**: Poll this endpoint every 5 seconds until status is "PAIRED"

When paired, device is automatically saved to database.

#### 3. List Devices
```http
GET /api/payments/devices
Authorization: Bearer {owner_or_staff_token}
```

Response:
```json
[
  {
    "id": 1,
    "business_id": 123,
    "device_id": "device_abc123",
    "device_name": "Front Desk Terminal",
    "location_id": "L1234...",
    "is_active": true,
    "paired_at": "2024-12-05T10:00:00Z",
    "last_used_at": null,
    "provider": "square"
  }
]
```

#### 4. Update Device
```http
PATCH /api/payments/devices/{device_id}
Authorization: Bearer {owner_token}
Content-Type: application/json

{
  "device_name": "Mobile Terminal 1",
  "is_active": false
}
```

#### 5. Unpair Device
```http
DELETE /api/payments/devices/{device_id}
Authorization: Bearer {owner_token}
```

### Testing with Sandbox

#### Pair Test Device (Sandbox Only)
```http
POST /api/payments/devices/test
Authorization: Bearer {owner_or_staff_token}
Content-Type: application/json

{
  "device_name": "Test Terminal",
  "test_device_id": "READER_SIMULATOR",
  "location_id": "L1234..."
}
```

**Available Test Device IDs** (from [Square Docs](https://developer.squareup.com/docs/devtools/sandbox/testing#terminal-api-checkouts)):
- `READER_SIMULATOR` - Simulated reader
- Any device ID from your Square sandbox account

Response:
```json
{
  "success": true,
  "device": { /* device object */ },
  "message": "Test device paired successfully"
}
```

## Usage Flow

### Business Owner Setup Flow

1. **Owner navigates to payment settings**
2. **Click "Connect Square"**
   - Frontend calls `GET /api/payments/oauth/authorize`
   - Redirect to Square OAuth page
3. **Owner authorizes on Square**
   - Square redirects back with code
4. **Frontend handles callback**
   - Calls `POST /api/payments/oauth/callback` with code
   - Configuration saved, OAuth complete
5. **Pair first terminal**
   - Call `POST /api/payments/devices/pair`
   - Display pairing code to user
   - User enters code on Square Terminal
6. **Poll for pairing status**
   - Call `POST /api/payments/devices/pair/status` every 5 seconds
   - When status = "PAIRED", device is ready
7. **Done!** Ready for Phase 2 (payment processing)

### Staff Pairing Additional Terminal

1. **Staff navigates to devices page**
2. **Click "Add Device"**
3. **Follow steps 5-6 from above**
4. **Staff can use any paired device**

## Security

### Permissions

- **OAuth endpoints**: Owner only
- **Device pairing**: Owner or Staff
- **Device updates/deletion**: Owner only
- **View config/devices**: Owner or Staff

### Encryption

- All OAuth tokens encrypted with Fernet (AES-128)
- Encryption key stored in environment variable
- Keys never exposed in API responses

### Multi-Tenancy

- All operations scoped to `business_id` from JWT
- Database queries filtered by `business_id`
- No cross-business data access possible

## Error Handling

Common errors:

- `400 Bad Request` - Invalid parameters or provider not configured
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - Insufficient permissions (not owner)
- `404 Not Found` - Device or configuration not found
- `500 Internal Server Error` - Provider API error or server issue

## Testing Checklist

- [ ] Generate encryption key and add to `.env`
- [ ] Add Square credentials to `.env`
- [ ] Run migration: `uv run alembic upgrade head`
- [ ] Start server: `uv run python main.py serve`
- [ ] Test OAuth flow with Square sandbox
- [ ] Pair a test device using `/api/payments/devices/test`
- [ ] Verify devices list
- [ ] Test device update/deletion

## Next Steps (Phase 2)

Phase 2 will implement:
- **Orders table** - Store transaction details
- **Checkout flow** - Create Terminal checkout requests
- **Payment processing** - Process payments via Terminal API
- **Refunds** - Handle refunds for cancelled appointments
- **Transaction history** - View payment records

## Support

For Square API documentation:
- [Square OAuth Guide](https://developer.squareup.com/docs/oauth-api/overview)
- [Terminal API](https://developer.squareup.com/docs/terminal-api/overview)
- [Device Codes API](https://developer.squareup.com/docs/devtools/device-codes-api)

For issues or questions, see project README.

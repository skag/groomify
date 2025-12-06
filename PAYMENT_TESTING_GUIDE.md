# Payment Integration Testing Guide

This guide walks you through testing the Phase 1 payment integration with Square sandbox.

## Prerequisites

- [ ] Square Developer account created
- [ ] Square sandbox application created
- [ ] Square Application ID and Secret obtained
- [ ] PostgreSQL running locally
- [ ] Server running (`uv run python main.py serve`)

## Step 1: Square Developer Setup

### 1.1 Create/Access Square Developer Account
1. Go to https://developer.squareup.com/
2. Sign in or create account
3. Switch to **Sandbox** mode

### 1.2 Create Application
1. Go to **Applications** → **New Application**
2. Name it "Groomify Sandbox"
3. Click **Create Application**

### 1.3 Get Credentials
1. In your application, go to **Credentials** tab
2. Copy **Sandbox Application ID** (starts with `sandbox-sq0idb-`)
3. Copy **Sandbox Application Secret** (starts with `sandbox-sq0csb-`)
4. Note your **Sandbox Access Token** (for later use)

### 1.4 Configure OAuth
1. Go to **OAuth** tab
2. Add redirect URL: `http://localhost:8000/api/payments/oauth/callback`
3. Save

### 1.5 Get Test Location ID
1. Go to **Locations** in Square Dashboard (sandbox mode)
2. Note your test location ID (starts with `L`)
3. Or use API to get it later

## Step 2: Configure Groomify Backend

### 2.1 Update `.env` File

```bash
# Square Sandbox Credentials
SQUARE_APP_ID=sandbox-sq0idb-XXXXXXXXXXXXXXXX
SQUARE_APP_SECRET=sandbox-sq0csb-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
SQUARE_REDIRECT_URI=http://localhost:8000/api/payments/oauth/callback
SQUARE_ENVIRONMENT=sandbox

# Encryption Key (already generated)
PAYMENT_ENCRYPTION_KEY=g02VaIGt8r1cnA7c93_bcrtNBrcR3Ml1_m2I8XenM18=
```

### 2.2 Verify Migration
```bash
uv run alembic upgrade head
```

Expected output:
```
Running upgrade 0372131ab475 -> 28aeae4329cd, add payment configuration and device tables
```

### 2.3 Start Server
```bash
uv run python main.py serve
```

Server should start on `http://localhost:8000`

## Step 3: Test OAuth Flow

### 3.1 Login as Business Owner

First, get an owner JWT token:

```bash
# Register or login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@example.com",
    "password": "yourpassword"
  }'
```

Save the `access_token` from response.

### 3.2 Get OAuth Authorization URL

```bash
curl -X GET "http://localhost:8000/api/payments/oauth/authorize?provider=square" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Response:
```json
{
  "authorization_url": "https://connect.squareupsandbox.com/oauth2/authorize?...",
  "state": "some_random_state"
}
```

### 3.3 Authorize in Browser

1. **Copy the `authorization_url`** from the response
2. **Paste it in your browser**
3. You'll see Square's OAuth page
4. Click **Allow** to authorize
5. Square will redirect to `http://localhost:8000/api/payments/oauth/callback?code=...&state=...`
6. **Copy the `code` parameter** from the URL

Note: The redirect will fail (404) because we haven't built the frontend callback handler yet. That's expected - just grab the `code` from the URL.

### 3.4 Exchange Code for Tokens

```bash
curl -X POST "http://localhost:8000/api/payments/oauth/callback?provider=square" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CODE_FROM_URL",
    "state": "STATE_FROM_STEP_3.2"
  }'
```

Expected response:
```json
{
  "id": 1,
  "business_id": 123,
  "provider": "square",
  "is_active": true,
  "has_credentials": true,
  "location_id": "LXXXXXXXXXXXX",
  "settings": {
    "environment": "sandbox",
    "merchant_id": "MXXXXXXXXXXXX"
  },
  "created_at": "2024-12-05T12:00:00Z",
  "updated_at": "2024-12-05T12:00:00Z"
}
```

✅ **OAuth Complete!** Your Square account is now connected.

### 3.5 Verify Configuration

```bash
curl -X GET http://localhost:8000/api/payments/config \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Should return the configuration created in Step 3.4.

## Step 4: Test Device Pairing (Sandbox)

Since you're in sandbox mode, you can use Square's test device IDs without a physical terminal.

### 4.1 Pair Test Device

```bash
curl -X POST http://localhost:8000/api/payments/devices/test \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_name": "Test Terminal",
    "test_device_id": "READER_SIMULATOR",
    "location_id": "YOUR_LOCATION_ID_FROM_STEP_3.4"
  }'
```

Expected response:
```json
{
  "success": true,
  "device": {
    "id": 1,
    "business_id": 123,
    "device_id": "READER_SIMULATOR",
    "device_name": "Test Terminal",
    "location_id": "LXXXXXXXXXXXX",
    "is_active": true,
    "paired_at": "2024-12-05T12:00:00Z",
    "provider": "square"
  },
  "message": "Test device paired successfully"
}
```

✅ **Test Device Paired!**

### 4.2 List Devices

```bash
curl -X GET http://localhost:8000/api/payments/devices \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Should show the test device from Step 4.1.

## Step 5: Test Real Device Pairing (Optional)

If you want to test with actual pairing flow (even in sandbox):

### 5.1 Initiate Pairing

```bash
curl -X POST http://localhost:8000/api/payments/devices/pair \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_name": "Front Desk Terminal",
    "location_id": "YOUR_LOCATION_ID"
  }'
```

Response:
```json
{
  "pairing_code": "ABCD-1234",
  "device_id": "device_code_abc123",
  "expires_at": "2024-12-05T13:00:00Z",
  "status": "PENDING"
}
```

### 5.2 "Enter" Code on Terminal

In sandbox, you can't actually enter the code. But you can simulate checking status.

### 5.3 Check Pairing Status

```bash
curl -X POST http://localhost:8000/api/payments/devices/pair/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_code_id": "device_code_abc123"
  }'
```

Response (while pending):
```json
{
  "status": "PENDING",
  "device_id": null
}
```

Note: In sandbox without a physical device, this will stay PENDING. Use the test device endpoint instead.

## Step 6: Test Device Management

### 6.1 Update Device Name

```bash
curl -X PATCH http://localhost:8000/api/payments/devices/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_name": "Updated Terminal Name"
  }'
```

### 6.2 Deactivate Device

```bash
curl -X PATCH http://localhost:8000/api/payments/devices/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_active": false
  }'
```

### 6.3 Unpair Device

```bash
curl -X DELETE http://localhost:8000/api/payments/devices/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "message": "Device unpaired successfully"
}
```

## Step 7: Test OAuth Disconnect

```bash
curl -X DELETE "http://localhost:8000/api/payments/oauth/disconnect?provider=square" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "message": "Payment provider disconnected successfully"
}
```

This will:
- Revoke the OAuth token with Square
- Delete the payment configuration
- Delete all associated devices

## Verification Checklist

- [ ] Square sandbox account created
- [ ] Application credentials configured in `.env`
- [ ] Migration applied successfully
- [ ] Server starts without errors
- [ ] OAuth authorization URL generated
- [ ] OAuth callback processed successfully
- [ ] Configuration saved and encrypted
- [ ] Test device paired
- [ ] Devices listed successfully
- [ ] Device updated successfully
- [ ] Device unpaired successfully
- [ ] OAuth disconnected successfully

## Troubleshooting

### Error: "SQUARE_APP_ID not configured"
- Check `.env` file has correct Square credentials
- Restart server after updating `.env`

### Error: "No active payment configuration found"
- Complete OAuth flow first (Step 3)
- Verify with `GET /api/payments/config`

### Error: "Encryption key not configured"
- Add `PAYMENT_ENCRYPTION_KEY` to `.env`
- Use the key from `.env` or generate new one

### OAuth redirect fails
- That's expected - we don't have frontend handler yet
- Just grab the `code` parameter from URL bar
- Use it in Step 3.4

### Device pairing stays PENDING
- In sandbox without physical device, use test device endpoint instead
- Real pairing only works with actual Square Terminals

## Database Verification

Check the database to verify data is stored correctly:

```bash
# Connect to database
psql postgresql://postgres:admin@localhost:5432/groomify

# Check payment configurations
SELECT id, business_id, provider, is_active, created_at
FROM payment_configurations;

# Check devices
SELECT id, business_id, device_id, device_name, is_active, paired_at
FROM payment_devices;
```

Credentials should be encrypted (you'll see random characters in `encrypted_credentials` field).

## Next Steps

Once Phase 1 testing is complete:

1. ✅ Verify all endpoints work
2. ✅ Confirm data is encrypted
3. ✅ Test with multiple devices
4. Move to **Phase 2**: Payment processing, orders, checkouts

## Support

- Square Sandbox: https://developer.squareup.com/
- Square Terminal API Docs: https://developer.squareup.com/docs/terminal-api/overview
- Project Documentation: `backend/PAYMENTS_INTEGRATION.md`

---

**Happy Testing!** 🎉

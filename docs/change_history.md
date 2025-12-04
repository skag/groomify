# Change History

## 2025-12-03

### Business user roles moved to lookup table
- Added `business_user_roles` lookup table and `business_users.role_id` FK; dropped old enum column.
- Seeded default roles (`owner`, `staff`, `groomer`) and backfilled `role_id` for existing users. Tokens and permissions now use `role_name` from the relationship.
- Affected files: `backend/app/models/business_user.py`, `backend/app/services/auth_service.py`, `backend/app/services/business_user_service.py`, `backend/app/core/dependencies.py`, `backend/app/schemas/business_user.py`, `backend/tests/test_auth.py`, migration `backend/migrations/versions/4b2f8aa9c0d4_move_business_user_role_to_lookup_table.py`.

### Employment dates and status
- Added `start_date` and `end_date` to `business_users`; added `status` enum column (`active`, `inactive`, `terminated`).
- Affected files: `backend/app/models/business_user.py`, `backend/app/schemas/business_user.py`, migrations `backend/migrations/versions/9c69a8d889f7_add_start_date_to_business_users.py`, `backend/migrations/versions/bc7a4d8c26f1_add_status_and_end_date_to_business_users.py`.

### Enum normalization for status
- Normalized `businessuserstatus` enum labels in Postgres to lowercase to match the code (`active`, `inactive`, `terminated`).
- Affected migration: `backend/migrations/versions/5e4a9db9f3e8_normalize_businessuserstatus_enum_values.py`.

### Appointment statuses moved to lookup table
- Added `appointment_statuses` lookup table and `appointments.status_id` FK; dropped the old enum column/type.
- Seeded default statuses (`scheduled`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`) and backfilled existing appointments.
- Affected files: `backend/app/models/appointment.py`, `backend/app/schemas/appointment.py`, migration `backend/migrations/versions/1a4dbf2c9b73_move_appointment_status_to_lookup_table.py`.

### Animal types API
- Added authenticated endpoint to list all animal types.
- Affected files: `backend/app/api/animal_types.py`, `backend/app/web_app.py` (router registration).

### Animal breeds API
- Added authenticated endpoint to list all breeds for a given animal type.
- Affected files: `backend/app/api/animal_types.py`, `backend/app/schemas/animal_breed.py`.

### Service categories API
- Added authenticated endpoint to create a service category for a business (owner/staff only).
- Affected files: `backend/app/api/service_categories.py`, `backend/app/schemas/service_category.py`, `backend/app/services/service_category_service.py`, `backend/app/web_app.py`.

### Notes
- Apply migrations in order with `alembic upgrade head` to align the database schema with the code changes.

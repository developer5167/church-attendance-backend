# events/by-date API

Purpose
- Fetch events for the authenticated admin's church filtered by a specific date.

Endpoint
- GET /api/admin/events/by-date

Authentication
- Requires Authorization header with a Bearer JWT token for an admin user.
  - Header: `Authorization: Bearer <token>`

Query Parameters
- `date` (required): date string in `YYYY-MM-DD` format. Only events whose `event_date` equals this date are returned.

Response (200)
- JSON array of event objects. Each event contains:
  - `id` (string)
  - `name` (string)
  - `event_date` (string, `YYYY-MM-DD`)
  - `services` (array) — each service object:
    - `id` (string)
    - `service_code` (string)
    - `service_time` (string)
    - `qrUrl` (string) — present when QR token exists; built from `BASE_URL` + `/api/register/metadata?token=`

Example successful response
```
[
  {
    "id": "evt-uuid-123",
    "name": "Sunday Service",
    "event_date": "2025-12-20",
    "services": [
      {
        "id": "srv-uuid-1",
        "service_code": "AM",
        "service_time": "09:00",
        "qrUrl": "https://example.com/api/register/metadata?token=..."
      }
    ]
  }
]
```

Errors
- 400 Bad Request — missing or invalid `date` query parameter.
  - Example: `{ "message": "Missing date parameter" }`
- 401 Unauthorized — missing/invalid token or user not admin (handled by `auth` middleware).

Curl example
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-base-url.example.com/api/admin/events/by-date?date=2025-12-20"
```

Notes
- The endpoint is protected by the project's `auth` middleware and returns events only for the caller's `churchId` (derived from the JWT).
- `BASE_URL` environment variable is used to build `qrUrl` values for services that have a QR token.
- Date comparison is done by comparing `event_date::date` to the provided `date` (server expects `YYYY-MM-DD`).

File
- This documentation was created at `docs/events-by-date.md` in the repository.

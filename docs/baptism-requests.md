# Baptism Request APIs

APIs for managing baptism requests between members and administrators.

## Database Schema

```sql
CREATE TABLE baptism_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITHOUT TIME ZONE
);
```

---

## Member Endpoints

### Request Baptism

**POST** `/api/member/baptism-request`

Submit a new baptism request.

#### Authentication
Requires member JWT token in Authorization header.

#### Request Headers
```
Authorization: Bearer <member_token>
```

#### Request Body
No body required. Member ID is extracted from JWT token.

#### Success Response (201 Created)
```json
{
  "message": "Baptism request submitted successfully",
  "request": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "member_id": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2026-01-16T10:30:00.000Z",
    "completed_at": null
  }
}
```

#### Error Responses

**400 Bad Request** - Duplicate request
```json
{
  "message": "You already have a pending baptism request"
}
```

**401 Unauthorized** - Missing or invalid token
```json
{
  "message": "Unauthorized"
}
```

**500 Internal Server Error**
```json
{
  "message": "Internal server error"
}
```

#### Example Usage
```bash
curl -X POST http://localhost:3000/api/member/baptism-request \
  -H "Authorization: Bearer <member_token>"
```

---

### Get Baptism Request Status

**GET** `/api/member/baptism-request/status`

Check the current status of the member's baptism request.

#### Authentication
Requires member JWT token in Authorization header.

#### Request Headers
```
Authorization: Bearer <member_token>
```

#### Request Body
No body required. Member ID is extracted from JWT token.

#### Success Response (200 OK)

**When member has a pending request:**
```json
{
  "hasRequest": true,
  "status": "pending",
  "request": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "member_id": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2026-01-16T10:30:00.000Z",
    "completed_at": null
  }
}
```

**When member has a completed request:**
```json
{
  "hasRequest": true,
  "status": "completed",
  "request": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "member_id": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2026-01-16T10:30:00.000Z",
    "completed_at": "2026-01-16T15:45:30.123Z"
  }
}
```

**When member has no baptism request:**
```json
{
  "hasRequest": false,
  "request": null
}
```

#### Error Responses

**401 Unauthorized** - Missing or invalid token
```json
{
  "message": "Unauthorized"
}
```

**500 Internal Server Error**
```json
{
  "message": "Internal server error"
}
```

#### Example Usage
```bash
curl -X GET http://localhost:3000/api/member/baptism-request/status \
  -H "Authorization: Bearer <member_token>"
```

---

## Admin Endpoints

### List Baptism Requests

**GET** `/api/admin/baptism-requests`

Get all baptism requests for the admin's church.

#### Authentication
Requires admin JWT token in Authorization header.

#### Request Headers
```
Authorization: Bearer <admin_token>
```

#### Query Parameters
- `status` (optional): Filter by status
  - `pending` - Show only pending requests (completed_at IS NULL)
  - `completed` - Show only completed requests (completed_at IS NOT NULL)
  - If omitted, shows all requests

#### Success Response (200 OK)
```json
{
  "requests": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "member_id": "123e4567-e89b-12d3-a456-426614174000",
      "created_at": "2026-01-16T10:30:00.000Z",
      "completed_at": null,
      "member_name": "John Doe",
      "member_phone": "+1234567890",
      "member_email": "john@example.com"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "member_id": "223e4567-e89b-12d3-a456-426614174001",
      "created_at": "2026-01-15T14:20:00.000Z",
      "completed_at": "2026-01-16T09:00:00.000Z",
      "member_name": "Jane Smith",
      "member_phone": "+1234567891",
      "member_email": "jane@example.com"
    }
  ]
}
```

#### Error Responses

**401 Unauthorized** - Missing or invalid token
```json
{
  "message": "Unauthorized"
}
```

**500 Internal Server Error**
```json
{
  "message": "Internal server error"
}
```

#### Example Usage

Get all requests:
```bash
curl -X GET http://localhost:3000/api/admin/baptism-requests \
  -H "Authorization: Bearer <admin_token>"
```

Get only pending requests:
```bash
curl -X GET "http://localhost:3000/api/admin/baptism-requests?status=pending" \
  -H "Authorization: Bearer <admin_token>"
```

Get only completed requests:
```bash
curl -X GET "http://localhost:3000/api/admin/baptism-requests?status=completed" \
  -H "Authorization: Bearer <admin_token>"
```

---

### Complete Baptism Request

**PATCH** `/api/admin/baptism-requests/:requestId/complete`

Mark a baptism request as completed by setting the completed_at timestamp.

#### Authentication
Requires admin JWT token in Authorization header.

#### Request Headers
```
Authorization: Bearer <admin_token>
```

#### URL Parameters
- `requestId` (required): UUID of the baptism request

#### Request Body
No body required.

#### Success Response (200 OK)
```json
{
  "message": "Baptism marked as completed",
  "request": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "member_id": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2026-01-16T10:30:00.000Z",
    "completed_at": "2026-01-16T15:45:30.123Z"
  }
}
```

#### Error Responses

**400 Bad Request** - Already completed
```json
{
  "message": "Baptism request already completed"
}
```

**401 Unauthorized** - Missing or invalid token
```json
{
  "message": "Unauthorized"
}
```

**404 Not Found** - Request not found or unauthorized
```json
{
  "message": "Baptism request not found or not authorized"
}
```

**500 Internal Server Error**
```json
{
  "message": "Internal server error"
}
```

#### Example Usage
```bash
curl -X PATCH http://localhost:3000/api/admin/baptism-requests/550e8400-e29b-41d4-a716-446655440000/complete \
  -H "Authorization: Bearer <admin_token>"
```

---

## Workflow

1. **Member checks status**: Member can check if they already have a baptism request via GET `/api/member/baptism-request/status`
2. **Member submits request**: If no request exists, member uses their mobile app to POST to `/api/member/baptism-request`
3. **Admin reviews requests**: Admin views all pending requests via GET `/api/admin/baptism-requests?status=pending`
4. **Baptism ceremony occurs**: Physical baptism ceremony takes place
5. **Admin marks complete**: Admin updates the request via PATCH `/api/admin/baptism-requests/:requestId/complete`
6. **Record maintained**: Completed baptism records remain in the database with timestamp

---

## Security & Authorization

- **Member endpoints**: Can only create baptism requests for themselves (member_id from JWT)
- **Admin endpoints**: Can only access baptism requests from members in their church (church_id verification)
- **Duplicate prevention**: Members cannot create multiple pending baptism requests
- **Idempotency**: Attempting to complete an already-completed request returns an error

---

## Notes

- The `completed_at` field is automatically set to the current timestamp when the admin marks the baptism as complete
- Baptism requests are soft-tracked - no deletion functionality, only creation and completion
- The member's details (name, phone, email) are joined from the members table for admin convenience
- Results are ordered by `created_at DESC` (most recent first)

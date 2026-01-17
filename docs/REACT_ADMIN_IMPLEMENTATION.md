# React.js Admin Web App - Volunteer System Implementation Guide

## Overview
This guide covers the implementation of the church volunteer system admin panel in your React.js web application.

---

## 🌐 Required APIs for Admin Web App


## 🔗 API Endpoints

### 1. List All Volunteer Requests
**Endpoint:** `GET /api/admin/volunteer-requests`

**Headers:** 
- `Authorization: Bearer {admin-token}` ✅ **Required**

**Query Parameters:**
- `departmentNameId` (optional, uuid) - Filter by specific department name
- `departmentId` (optional, uuid) - Filter by department heading
- `status` (optional, "pending" | "completed") - Filter by status
- `page` (optional, number, default: 1)
- `limit` (optional, number, default: 20, max: 100)
- `sortBy` (optional, "createdAt" | "memberName", default: "createdAt")
- `sortOrder` (optional, "asc" | "desc", default: "desc")

**Example:**
```
GET /api/admin/volunteer-requests?status=pending&page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

**Response:**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "uuid",
        "member": {
          "id": "uuid",
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "+1234567890"
        },
        "status": "pending",
        "createdAt": "2026-01-17T10:30:00.000Z",
        "updatedAt": "2026-01-17T10:30:00.000Z",
        "departments": [
          {
            "id": "uuid",
            "departmentName": "Worship Leader",
            "departmentHeading": "Worship",
            "departmentHeadingId": "uuid"
          }
        ]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 87,
      "itemsPerPage": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "filters": {
      "status": "pending"
    }
  }
}
```

---

### 2. Get Single Volunteer Request Details
**Endpoint:** `GET /api/admin/volunteer-requests/:id`

**Headers:** 
- `Authorization: Bearer {admin-token}` ✅ **Required**

**Path Parameters:**
- `id` (uuid) - Volunteer application ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "member": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "address": "123 Main St, City",
      "memberSince": "2020-05-15T00:00:00.000Z"
    },
    "status": "pending",
    "createdAt": "2026-01-17T10:30:00.000Z",
    "updatedAt": "2026-01-17T10:30:00.000Z",
    "completedAt": null,
    "departments": [
      {
        "id": "uuid",
        "departmentName": "Worship Leader",
        "departmentHeading": "Worship",
        "departmentHeadingId": "uuid",
        "description": "Lead the congregation in worship through song"
      }
    ]
  }
}
```

---

### 3. Update Volunteer Request Status
**Endpoint:** `PATCH /api/admin/volunteer-requests/:id`

**Headers:** 
- `Authorization: Bearer {admin-token}` ✅ **Required**
- `Content-Type: application/json`

**Path Parameters:**
- `id` (uuid) - Volunteer application ID

**Request Body:**
```json
{
  "status": "completed",
  "notes": "Called member on 2026-01-17. Member assigned to Worship team."
}
```

**Validation:**
- `status` must be "completed" (only transition allowed)
- Current status must be "pending"
- `notes` is optional (max 1000 characters)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Volunteer request status updated successfully",
  "data": {
    "id": "uuid",
    "member": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "status": "completed",
    "createdAt": "2026-01-17T10:30:00.000Z",
    "completedAt": "2026-01-17T15:45:00.000Z",
    "notes": "Called member on 2026-01-17. Member assigned to Worship team.",
    "departments": [
      {
        "departmentName": "Worship Leader",
        "departmentHeading": "Worship"
      }
    ]
  }
}
```

**Error Response - Already Completed (400):**
```json
{
  "success": false,
  "message": "Cannot update status. Request is already completed.",
  "code": "INVALID_TRANSITION"
}
```

---


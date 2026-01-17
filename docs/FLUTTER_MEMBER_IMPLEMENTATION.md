# Flutter Member App - Volunteer System Implementation Guide

## Overview
This guide covers the implementation of the church volunteer system in your Flutter member mobile application.

---

## 📱 Required APIs for Member App

### Base URL
```dart
const String BASE_URL = 'https://your-api-domain.com/api';
```

### Authentication
All endpoints require JWT token in the Authorization header:
```dart
headers: {
  'Authorization': 'Bearer $token',
  'Content-Type': 'application/json',
}
```

---

## 🔗 API Endpoints

### 1. Get Available Departments
**Endpoint:** `GET /api/member/volunteer-departments`

**Headers:** 
- `Authorization: Bearer {token}` ✅ **Required**

**Response:**
```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": "uuid",
        "department": "Worship",
        "departmentNames": [
          {
            "id": "uuid",
            "name": "Worship Leader",
            "description": "Lead the congregation in worship through song"
          }
        ]
      }
    ]
  }
}
```

---

### 2. Check Volunteer Request Status
**Endpoint:** `GET /api/member/volunteer-requests/status`

**Headers:** 
- `Authorization: Bearer {token}` ✅ **Required**

**Response - Pending Request:**
```json
{
  "success": true,
  "message": "We have received your request. Status: Pending. Our team will contact you.",
  "data": {
    "hasActiveRequest": true,
    "request": {
      "id": "uuid",
      "status": "pending",
      "createdAt": "2026-01-17T10:30:00.000Z",
      "departments": [
        {
          "id": "uuid",
          "departmentName": "Worship Leader",
          "departmentHeading": "Worship",
          "description": "Lead the congregation in worship"
        }
      ]
    }
  }
}
```

**Response - No Pending Request:**
```json
{
  "success": true,
  "message": "Thank you for your willingness to serve. There are no pending requests.",
  "data": {
    "hasActiveRequest": false,
    "request": null,
    "lastCompletedRequest": {
      "id": "uuid",
      "status": "completed",
      "createdAt": "2025-12-01T10:00:00.000Z",
      "completedAt": "2025-12-05T14:30:00.000Z"
    }
  }
}
```

---

### 3. Submit Volunteer Request
**Endpoint:** `POST /api/member/volunteer-requests`

**Headers:** 
- `Authorization: Bearer {token}` ✅ **Required**
- `Content-Type: application/json`

**Request Body:**
```json
{
  "departmentNameIds": [
    "uuid-1",
    "uuid-2",
    "uuid-3"
  ]
}
```

**Validation:**
- Minimum: 1 department
- Maximum: 5 departments
- All IDs must be valid UUIDs

**Success Response (201):**
```json
{
  "success": true,
  "message": "Thank you for your willingness to serve! We have received your volunteer request and our team will contact you soon.",
  "data": {
    "id": "uuid",
    "status": "pending",
    "createdAt": "2026-01-17T10:30:00.000Z",
    "departments": [...]
  }
}
```

**Error Response - Already Have Pending Request (409):**
```json
{
  "success": false,
  "message": "We have received your request. Status: Pending. Our team will contact you.",
  "data": {
    "existingRequest": {
      "id": "uuid",
      "status": "pending",
      "createdAt": "2026-01-15T08:00:00.000Z"
    }
  }
}
```

---

## 🎨 UI/UX Recommendations

1. **Status Screen:**
   - Show clear message about request status
   - Display selected departments for pending requests
   - Use gentle, pastoral language

2. **Department Selection:**
   - Group by department heading (ExpansionTile)
   - Show descriptions for each role
   - Indicate selected count
   - Disable submit if > 5 selected

3. **Loading States:**
   - Show loading indicator during API calls
   - Disable buttons during submission

4. **Error Handling:**
   - Show user-friendly error messages
   - Handle network failures gracefully
   - Display validation errors clearly
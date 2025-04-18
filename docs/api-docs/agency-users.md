# SafarWay Agency User Management API Documentation

This document outlines the API endpoints for managing users within an agency on the SafarWay multi-vendor travel platform.

## Base URL
```
/api/agency/users
```

## Authentication
All endpoints (except for completing registration) require JWT authentication with the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

## Roles and Permissions
- `AGENCY_ADMIN`: Full access to all endpoints
- `AGENCY_USER`: Limited access (can only view user listings)

---

## Endpoints

### Invite User
Invites a new user to join the agency.

- **URL**: `/invite`
- **Method**: `POST`
- **Auth required**: Yes
- **Permissions required**: `AGENCY_ADMIN`
- **Request Body**:
  ```json
  {
    "email": "newuser@example.com",
    "role": "AGENCY_USER"  // Can be AGENCY_ADMIN or AGENCY_USER
  }
  ```
- **Success Response**:
  - **Code**: `201 Created`
  - **Content**:
    ```json
    {
      "message": "Invitation sent successfully",
      "data": {
        "email": "newuser@example.com",
        "role": "AGENCY_USER",
        "status": "INVITED"
      }
    }
    ```
- **Error Responses**:
  - **Code**: `400 Bad Request`
    ```json
    {
      "message": "Validation error",
      "error": "Invalid email format"
    }
    ```
  - **Code**: `400 Bad Request`
    ```json
    {
      "message": "User with this email already exists"
    }
    ```
  - **Code**: `403 Forbidden`
    ```json
    {
      "message": "Access denied. Insufficient permissions."
    }
    ```

### Complete Registration
Allows an invited user to complete their registration.

- **URL**: `/onboard`
- **Method**: `POST`
- **Auth required**: No
- **Request Body**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "name": "John Doe",
    "phone": "+1234567890",
    "password": "SecurePassword123!"
  }
  ```
- **Success Response**:
  - **Code**: `200 OK`
  - **Content**:
    ```json
    {
      "message": "Registration completed successfully",
      "data": {
        "user": {
          "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
          "name": "John Doe",
          "email": "newuser@example.com",
          "role": "AGENCY_USER",
          "agency": {
            "id": "60b5f030-1234-5678-abcd-e02b2c3d479",
            "name": "Travel Agency Inc."
          }
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
    ```
- **Error Responses**:
  - **Code**: `400 Bad Request`
    ```json
    {
      "message": "Validation error",
      "error": "Password must be at least 8 characters"
    }
    ```
  - **Code**: `401 Unauthorized`
    ```json
    {
      "message": "Invalid or expired invitation token"
    }
    ```
  - **Code**: `404 Not Found`
    ```json
    {
      "message": "Invalid invitation or user not found"
    }
    ```

### List Agency Users
Returns a list of all users in the agency with pagination, filtering, and sorting.

- **URL**: `/`
- **Method**: `GET`
- **Auth required**: Yes
- **Permissions required**: `AGENCY_ADMIN` or `AGENCY_USER`
- **Query Parameters**:
  - `status` (optional): Filter by user status (INVITED, ACTIVE, SUSPENDED, INACTIVE)
  - `role` (optional): Filter by user role (AGENCY_ADMIN, AGENCY_USER)
  - `search` (optional): Search by name or email
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)
- **Success Response**:
  - **Code**: `200 OK`
  - **Content**:
    ```json
    {
      "data": [
        {
          "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
          "name": "John Doe",
          "email": "john@example.com",
          "role": "AGENCY_ADMIN",
          "status": "ACTIVE",
          "phone": "+1234567890",
          "profileImage": "https://example.com/profile.jpg",
          "createdAt": "2023-01-01T12:00:00Z",
          "updatedAt": "2023-01-02T12:00:00Z",
          "invitedAt": "2022-12-30T12:00:00Z",
          "completedAt": "2023-01-01T12:00:00Z",
          "invitedBy": {
            "id": "60b5f030-1234-5678-abcd-e02b2c3d479",
            "name": "Admin User",
            "email": "admin@example.com"
          }
        },
        // More users...
      ],
      "meta": {
        "total": 25,
        "page": 1,
        "limit": 10,
        "pages": 3
      }
    }
    ```

### Get User by ID
Returns details for a specific user.

- **URL**: `/:id`
- **Method**: `GET`
- **Auth required**: Yes
- **Permissions required**: `AGENCY_ADMIN` or `AGENCY_USER`
- **Success Response**:
  - **Code**: `200 OK`
  - **Content**:
    ```json
    {
      "data": {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "AGENCY_USER",
        "status": "ACTIVE",
        "phone": "+1234567890",
        "profileImage": "https://example.com/profile.jpg",
        "createdAt": "2023-01-01T12:00:00Z",
        "updatedAt": "2023-01-02T12:00:00Z",
        "invitedAt": "2022-12-30T12:00:00Z",
        "completedAt": "2023-01-01T12:00:00Z",
        "invitedBy": {
          "id": "60b5f030-1234-5678-abcd-e02b2c3d479",
          "name": "Admin User",
          "email": "admin@example.com"
        }
      }
    }
    ```
- **Error Response**:
  - **Code**: `404 Not Found`
    ```json
    {
      "message": "User not found"
    }
    ```

### Update User Role
Updates a user's role within the agency.

- **URL**: `/:id/role`
- **Method**: `PATCH`
- **Auth required**: Yes
- **Permissions required**: `AGENCY_ADMIN`
- **Request Body**:
  ```json
  {
    "role": "AGENCY_ADMIN"  // Can be AGENCY_ADMIN or AGENCY_USER
  }
  ```
- **Success Response**:
  - **Code**: `200 OK`
  - **Content**:
    ```json
    {
      "message": "User role updated successfully",
      "data": {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "AGENCY_ADMIN",
        "status": "ACTIVE"
      }
    }
    ```
- **Error Responses**:
  - **Code**: `400 Bad Request`
    ```json
    {
      "message": "Validation error",
      "error": "Role must be AGENCY_ADMIN or AGENCY_USER"
    }
    ```
  - **Code**: `404 Not Found`
    ```json
    {
      "message": "User not found"
    }
    ```

### Suspend User
Suspends a user's account.

- **URL**: `/:id/suspend`
- **Method**: `POST`
- **Auth required**: Yes
- **Permissions required**: `AGENCY_ADMIN`
- **Success Response**:
  - **Code**: `200 OK`
  - **Content**:
    ```json
    {
      "message": "User suspended successfully",
      "data": {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "AGENCY_USER",
        "status": "SUSPENDED"
      }
    }
    ```
- **Error Responses**:
  - **Code**: `400 Bad Request`
    ```json
    {
      "message": "You cannot suspend yourself"
    }
    ```
  - **Code**: `404 Not Found`
    ```json
    {
      "message": "User not found"
    }
    ```

### Activate User
Activates a suspended or inactive user account.

- **URL**: `/:id/activate`
- **Method**: `POST`
- **Auth required**: Yes
- **Permissions required**: `AGENCY_ADMIN`
- **Success Response**:
  - **Code**: `200 OK`
  - **Content**:
    ```json
    {
      "message": "User activated successfully",
      "data": {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "AGENCY_USER",
        "status": "ACTIVE"
      }
    }
    ```
- **Error Response**:
  - **Code**: `404 Not Found`
    ```json
    {
      "message": "User not found"
    }
    ```

### Resend Invitation
Resends an invitation email to a user who hasn't completed registration.

- **URL**: `/:id/resend-invite`
- **Method**: `POST`
- **Auth required**: Yes
- **Permissions required**: `AGENCY_ADMIN`
- **Success Response**:
  - **Code**: `200 OK`
  - **Content**:
    ```json
    {
      "message": "Invitation resent successfully"
    }
    ```
- **Error Response**:
  - **Code**: `404 Not Found`
    ```json
    {
      "message": "Pending invitation not found"
    }
    ```

### Delete User
Soft deletes a user by marking them as inactive.

- **URL**: `/:id`
- **Method**: `DELETE`
- **Auth required**: Yes
- **Permissions required**: `AGENCY_ADMIN`
- **Success Response**:
  - **Code**: `200 OK`
  - **Content**:
    ```json
    {
      "message": "User deleted successfully"
    }
    ```
- **Error Responses**:
  - **Code**: `400 Bad Request`
    ```json
    {
      "message": "You cannot delete yourself"
    }
    ```
  - **Code**: `404 Not Found`
    ```json
    {
      "message": "User not found"
    }
    ```

## Rate Limiting

To protect against abuse, invite endpoints are rate-limited to 10 requests per hour per IP address.

## Error Handling

All errors follow a standard format:
```json
{
  "message": "Error message describing the issue",
  "error": "Optional additional error details or validation errors"
}
```

## Audit Logs

All major user management actions are logged in the system for audit purposes:
- User invitations
- Role changes
- Account status changes (suspend/activate)
- Account deletions

These logs include the timestamp, the user who performed the action, and the user who was affected. 
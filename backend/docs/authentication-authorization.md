Auth Collection

This collection contains the authentication APIs for the application.

Base URL:

http://localhost:5000/api/auth

1. Register

Method:

POST /register

Full URL:

http://localhost:5000/api/auth/register

Authentication:

None required

Request Body:

```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "admin123",
  "role": "Admin"
}
```

Fields:

name: User's full name

email: User's email address

password: Account password

role: User role

Success Response:

Status: 201 Created

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "<user-id>",
    "email": "admin@example.com",
    "role": "Admin",
    "status": "Active"
  }
}
```

Possible Errors:

400 - VALIDATION_ERROR

409 - DUPLICATE_EMAIL

2. Login

Method:

POST /login

Full URL:

http://localhost:5000/api/auth/login

Authentication:

None required

Request Body:

```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

Fields:

email: Registered email address

password: Account password

Success Response:

Status: 200 OK

```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "token": "<JWT>",
    "id": "<user-id>",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "Admin",
    "status": "Active"
  }
}
```

Possible Errors:

400 - VALIDATION_ERROR

401 - INVALID_CREDENTIALS

403 - ACCOUNT_NOT_ACTIVE

3. Get Current User

Method:

GET /me

Full URL:

http://localhost:5000/api/auth/me

Authentication:

Bearer Token required

Authorization Header:

```text
Authorization: Bearer <JWT>
```

The JWT is received from the Login API.

Success Response:

Status: 200 OK

```json
{
  "success": true,
  "message": "Current user fetched successfully",
  "data": {
    "id": "<user-id>",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "Admin",
    "status": "Active",
    "warehouseIds": []
  }
}
```

Possible Errors:

401 - MISSING_TOKEN

401 - INVALID_AUTH_FORMAT

401 - INVALID_TOKEN

401 - TOKEN_EXPIRED

401 - USER_NOT_FOUND

401 - TOKEN_INVALIDATED

403 - ACCOUNT_NOT_ACTIVE

4. Logout

Method:

POST /logout

Full URL:

http://localhost:5000/api/auth/logout

Authentication:

Bearer Token required

Authorization Header:

```text
Authorization: Bearer <JWT>
```

Success Response:

Status: 200 OK

```json
{
  "success": true,
  "message": "User logged out successfully"
}
```

Logout Process:

The server increments the user's tokenVersion.

The previous JWT contains the old tokenVersion.

The old JWT is therefore invalidated.

The client should remove the JWT after logout.

The user must log in again to receive a new token.

Authentication

Login returns a JWT token.

Use this token for protected APIs.

Example:

```text
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Postman Flow

Register

↓

Login

↓

Copy JWT token

↓

Call Me

↓

Call Logout

Postman Variables

baseUrl:

```text
http://localhost:5000
```

token:

```text
<JWT>
```

API Summary

POST /api/auth/register

Creates a new user.

POST /api/auth/login

Authenticates the user and returns a JWT.

GET /api/auth/me

Returns the current authenticated user's profile.

POST /api/auth/logout

Logs out the user and invalidates the token.

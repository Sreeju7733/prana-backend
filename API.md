# Prana Backend API Documentation

Base URL: `http://<HOST>:3000` (e.g. `http://:3000`)

---

## 🔑 Authentication Flow

### 1. Send OTP

Generates a 6-digit OTP and logs it to `otp_logs`.

- **Endpoint:** `POST /api/auth/send-otp`
- **Headers:** `Content-Type: application/json`
- **Request Body:**

```json
{
  "phone": "9876543210"
}
```

- **Response (200 OK):**

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "otp": "791963"
}
```

---

### 2. Verify OTP

Verifies the OTP, creates an `auth.users` record and a `profiles` entry if the user is new, and returns a JWT token.

- **Endpoint:** `POST /api/auth/verify-otp`
- **Headers:** `Content-Type: application/json`
- **Request Body:**

```json
{
  "phone": "9876543210",
  "otp": "791963"
}
```

- **Response (200 OK):**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "is_new_user": true,
  "user": {
    "id": "1f0dcda7-40cf-48f5-85a1-b840658db432",
    "phone": "9876543210",
    "full_name": "",
    "prana_id": "PRAN-2cd7b33f",
    "blood_group": null,
    "card_status": "active"
  }
}
```

---

## 👤 Patient Profile APIs (After Verification)

### 3. Get Patient Profile

Fetches current logged-in user profile using JWT token.

- **Endpoint:** `GET /api/patient/profile`
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
- **Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "1f0dcda7-40cf-48f5-85a1-b840658db432",
    "phone": "9876543210",
    "full_name": "John Doe",
    "prana_id": "PRAN-2cd7b33f",
    "date_of_birth": "1995-05-15",
    "blood_group": "O+",
    "gender": "M",
    "weight_kg": 70,
    "height_cm": 175,
    "emergency_relay_number": "1800-PRANA-RELAY-2669",
    "card_status": "active",
    "daily_scan_limit": 10,
    "allowed_countries": ["IN"],
    "created_at": "2026-07-30T07:04:44.926095+00:00",
    "updated_at": "2026-07-30T07:04:44.926095+00:00"
  }
}
```

---

### 4. Setup / Update Profile

Updates user profile during onboarding (profile setup) or settings edit.

- **Endpoint:** `PUT /api/patient/profile`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <JWT_TOKEN>`
- **Request Body (All fields optional):**

```json
{
  "full_name": "John Doe",
  "gender": "M",
  "date_of_birth": "1995-05-15",
  "blood_group": "O+",
  "weight_kg": 72,
  "height_cm": 178
}
```

- **Allowed `blood_group` values:** `'A+'`, `'A-'`, `'B+'`, `'B-'`, `'AB+'`, `'AB-'`, `'O+'`, `'O-'`, `'Unknown'`
- **Allowed `gender` values:** `'M'`, `'F'`, `'Other'`, `'Unknown'`
- **Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "1f0dcda7-40cf-48f5-85a1-b840658db432",
    "phone": "9876543210",
    "full_name": "John Doe",
    "gender": "M",
    "date_of_birth": "1995-05-15",
    "blood_group": "O+",
    "weight_kg": 72,
    "height_cm": 178,
    "prana_id": "PRAN-2cd7b33f",
    "card_status": "active"
  }
}
```

---

## 🛠️ Health Checks

### 5. Supabase Database Health Check

Validates connection to Supabase DB.

- **Endpoint:** `GET /api/health/supabase`
- **Response (200 OK):**

```json
{
  "status": "healthy",
  "timestamp": "2026-07-30T07:10:00.000Z"
}
```

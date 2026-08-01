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

---

## 🩸 Allergies Management APIs

### Database Schema

```sql
CREATE TABLE allergies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    allergen TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe', 'life_threatening')),
    reaction_description TEXT,
    date_diagnosed DATE,
    -- For public display (GREEN tier)
    is_critical BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_allergies_user ON allergies(user_id);
CREATE INDEX idx_allergies_critical ON allergies(user_id, is_critical) WHERE is_critical = true;
```

---

### 1. API Endpoints Overview

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/allergies` | Authenticated User (Self) | List all allergies for the logged-in user |
| **GET** | `/api/public/profiles/:user_id/critical-allergies` | Public / Emergency | List only `is_critical = true` allergies (GREEN tier) |
| **POST** | `/api/allergies` | Authenticated User | Create a new allergy record |
| **PATCH** | `/api/allergies/:id` | Authenticated User (Owner) | Update an existing allergy record |
| **DELETE** | `/api/allergies/:id` | Authenticated User (Owner) | Remove an allergy record |

---

### 2. Request & Response Payload Specs

#### A. Fetch User's Allergies (`GET /api/allergies`)

Retrieves all private/full allergy records for the authenticated user.

- **Endpoint:** `GET /api/allergies`
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
- **Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "c39a8c12-3456-4921-8208-111111111111",
      "user_id": "f5832b84-1234-4567-8901-222222222222",
      "allergen": "Peanuts",
      "severity": "severe",
      "reaction_description": "Anaphylaxis, hives, shortness of breath",
      "date_diagnosed": "2018-05-14",
      "is_critical": true,
      "created_at": "2026-08-01T15:00:00Z",
      "updated_at": "2026-08-01T15:00:00Z"
    }
  ]
}
```

---

#### B. Public / Emergency View (`GET /api/public/profiles/:user_id/critical-allergies`)

Leverages the optimized partial index (`idx_allergies_critical`) to return only critical allergies for emergency badges or public profiles.

- **Endpoint:** `GET /api/public/profiles/:user_id/critical-allergies`
- **Access Level:** Public / Emergency
- **Database Query:**

```sql
SELECT allergen, severity, reaction_description 
FROM allergies 
WHERE user_id = :user_id AND is_critical = true;
```

- **Response (200 OK):** (Exposes minimal sensitive data)

```json
{
  "success": true,
  "public_tier": "GREEN",
  "critical_allergies": [
    {
      "allergen": "Peanuts",
      "severity": "severe",
      "reaction_description": "Anaphylaxis"
    }
  ]
}
```

---

#### C. Create Allergy (`POST /api/allergies`)

Creates a new allergy record for the authenticated user.

- **Endpoint:** `POST /api/allergies`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <JWT_TOKEN>`
- **Request Body:**

```json
{
  "allergen": "Penicillin",
  "severity": "moderate",
  "reaction_description": "Mild skin rash and swelling",
  "date_diagnosed": "2021-11-02",
  "is_critical": false
}
```

- **Validation Rules:**
  - `allergen`: Required, string, max 255 characters.
  - `severity`: Optional, string, must strictly match one of `'mild'`, `'moderate'`, `'severe'`, or `'life_threatening'`.
  - `reaction_description`: Optional, string.
  - `date_diagnosed`: Optional, ISO date string (`YYYY-MM-DD`), cannot be in the future.
  - `is_critical`: Optional, boolean (default: `false`).
  - `user_id`: **Do not accept from body.** Extracted securely from the JWT auth token to prevent spoofing.

- **Response (201 Created):**

```json
{
  "success": true,
  "message": "Allergy record created successfully",
  "data": {
    "id": "d40b9d23-4567-4012-9309-222222222222",
    "user_id": "f5832b84-1234-4567-8901-222222222222",
    "allergen": "Penicillin",
    "severity": "moderate",
    "reaction_description": "Mild skin rash and swelling",
    "date_diagnosed": "2021-11-02",
    "is_critical": false,
    "created_at": "2026-08-01T15:20:00Z",
    "updated_at": "2026-08-01T15:20:00Z"
  }
}
```

---

#### D. Update Allergy (`PATCH /api/allergies/:id`)

Updates an existing allergy record. Partial updates are allowed.

- **Endpoint:** `PATCH /api/allergies/:id`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <JWT_TOKEN>`
- **Request Body:** (Partial updates allowed)

```json
{
  "is_critical": true,
  "severity": "life_threatening"
}
```

- **Automated Action:** Ensure backend or database trigger sets `updated_at = NOW()` whenever an update succeeds.
- **Response (200 OK):**

```json
{
  "success": true,
  "message": "Allergy record updated successfully",
  "data": {
    "id": "d40b9d23-4567-4012-9309-222222222222",
    "user_id": "f5832b84-1234-4567-8901-222222222222",
    "allergen": "Penicillin",
    "severity": "life_threatening",
    "reaction_description": "Mild skin rash and swelling",
    "date_diagnosed": "2021-11-02",
    "is_critical": true,
    "created_at": "2026-08-01T15:20:00Z",
    "updated_at": "2026-08-01T15:25:00Z"
  }
}
```

---

#### E. Delete Allergy (`DELETE /api/allergies/:id`)

Deletes an existing allergy record owned by the authenticated user.

- **Endpoint:** `DELETE /api/allergies/:id`
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
- **Response (200 OK):**

```json
{
  "success": true,
  "message": "Allergy record deleted successfully"
}
```


# Prana Backend Complete API Documentation

Base URL: `http://<HOST>:3000` (e.g. `http://localhost:3000`)

---

## 🔑 1. Authentication & Onboarding Flow

### 1.1 Send OTP
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

### 1.2 Verify OTP
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

## 👤 2. Patient Profile APIs

### 2.1 Get Patient Profile
Fetches current logged-in user profile using JWT token.

- **Endpoint:** `GET /api/patient/profile`
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
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

### 2.2 Setup / Update Profile
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

## 💊 3. Medications Management APIs

### 3.1 Fetch User's Medications (`GET /api/medications`)
- **Endpoint:** `GET /api/medications`
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "m1111111-2222-3333-4444-555555555555",
      "user_id": "1f0dcda7-40cf-48f5-85a1-b840658db432",
      "name": "Metformin",
      "generic_name": "Metformin Hydrochloride",
      "dose": "500mg",
      "frequency": "BD",
      "prescribed_by": "Dr. A. Sharma",
      "prescribed_date": "2024-01-10",
      "is_active": true,
      "encrypted_prescription_url": null,
      "created_at": "2026-08-01T15:00:00Z"
    }
  ]
}
```

### 3.2 Add Medication (`POST /api/medications`)
- **Endpoint:** `POST /api/medications`
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Metformin",
  "generic_name": "Metformin Hydrochloride",
  "dose": "500mg",
  "frequency": "BD",
  "prescribed_by": "Dr. A. Sharma",
  "prescribed_date": "2024-01-10",
  "is_active": true
}
```

### 3.3 Edit / Deactivate Medication (`PATCH /api/medications/:id`)
- **Endpoint:** `PATCH /api/medications/:id`
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`
- **Request Body:**
```json
{
  "is_active": false
}
```

### 3.4 Delete Medication (`DELETE /api/medications/:id`)
- **Endpoint:** `DELETE /api/medications/:id`
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`

---

## ⚠️ 4. Allergies Management APIs

### 4.1 Fetch Allergies (`GET /api/allergies`)
- **Endpoint:** `GET /api/allergies`
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`

### 4.2 Public / Emergency Critical Allergies (`GET /api/public/profiles/:user_id/critical-allergies`)
- **Endpoint:** `GET /api/public/profiles/:user_id/critical-allergies`
- **Response (200 OK):**
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

### 4.3 Create Allergy (`POST /api/allergies`)
- **Endpoint:** `POST /api/allergies`
- **Request Body:**
```json
{
  "allergen": "Penicillin",
  "severity": "severe",
  "reaction_description": "Hives and breathing issue",
  "date_diagnosed": "2020-03-12",
  "is_critical": true
}
```

### 4.4 Update Allergy (`PATCH /api/allergies/:id`)
- **Endpoint:** `PATCH /api/allergies/:id`

### 4.5 Delete Allergy (`DELETE /api/allergies/:id`)
- **Endpoint:** `DELETE /api/allergies/:id`

---

## 🏥 5. Medical Conditions & Vitals APIs

### 5.1 Fetch Conditions (`GET /api/conditions`)
- **Endpoint:** `GET /api/conditions`
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`

### 5.2 Create Condition (`POST /api/conditions`)
- **Endpoint:** `POST /api/conditions`
- **Request Body:**
```json
{
  "name": "Type 2 Diabetes",
  "icd10_code": "E11",
  "diagnosed_date": "2019-06-01",
  "status": "chronic",
  "treating_doctor": "Dr. Mehta",
  "hospital": "Max Healthcare",
  "notes": "Controlled with diet & Metformin"
}
```

### 5.3 Fetch Vitals (`GET /api/vitals`)
- **Endpoint:** `GET /api/vitals`
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`

### 5.4 Log Vital Reading (`POST /api/vitals`)
- **Endpoint:** `POST /api/vitals`
- **Request Body:**
```json
{
  "vital_type": "glucose",
  "value": 110.5,
  "unit": "mg/dL",
  "source": "manual"
}
```

---

## 🛡️ 6. Emergency Briefing & Security Center (My Card)

### 6.1 Get Emergency Briefing (`GET /api/patient/briefing`)
- **Endpoint:** `GET /api/patient/briefing`
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`

### 6.2 Refresh Emergency Briefing (`POST /api/patient/briefing/refresh`)
- **Endpoint:** `POST /api/patient/briefing/refresh`
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`

### 6.3 Get Card Security Status (`GET /api/card/security`)
- **Endpoint:** `GET /api/card/security`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "prana_id": "PRAN-2cd7b33f",
    "card_status": "active",
    "daily_scan_limit": 10,
    "scans_used_today": 2,
    "scans_remaining": 8,
    "allowed_countries": ["IN"],
    "active_hours_start": "00:00",
    "active_hours_end": "23:59"
  }
}
```

### 6.4 Update Card Security Settings (`PATCH /api/card/security`)
- **Endpoint:** `PATCH /api/card/security`
- **Request Body:**
```json
{
  "card_status": "active",
  "daily_scan_limit": 15,
  "allowed_countries": ["IN", "US"]
}
```

### 6.5 Get Scan History (`GET /api/card/scan-history`)
- **Endpoint:** `GET /api/card/scan-history`

---

## 🚨 7. Emergency Contacts & Family APIs

### 7.1 Fetch Emergency Contacts (`GET /api/emergency-contacts`)
- **Endpoint:** `GET /api/emergency-contacts`

### 7.2 Add Emergency Contact (`POST /api/emergency-contacts`)
- **Endpoint:** `POST /api/emergency-contacts`
- **Request Body:**
```json
{
  "name": "Rajesh Sharma",
  "relationship": "father",
  "phone": "9876543210",
  "is_primary": true,
  "notification_channels": ["push", "sms"]
}
```

### 7.3 Send Test SMS Alert (`POST /api/emergency-contacts/test-sms`)
- **Endpoint:** `POST /api/emergency-contacts/test-sms`

### 7.4 Fetch Family Dependents (`GET /api/family/dependents`)
- **Endpoint:** `GET /api/family/dependents`

---

## 📷 8. AI Prescription Scanner & Drug Interaction Checker

### 8.1 AI Prescription Scanner (`POST /api/scanner/prescription`)
- **Endpoint:** `POST /api/scanner/prescription`
- **Request Body:**
```json
{
  "image_url": "https://storage.supabase.co/prescriptions/rx101.jpg"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "extracted_medications": [
    {
      "name": "Amoxicillin",
      "generic_name": "Amoxicillin Trihydrate",
      "dose": "500mg",
      "frequency": "TDS (3 times daily)",
      "confidence_score": 0.96
    }
  ]
}
```

### 8.2 Drug Interaction & Allergy Checker (`POST /api/checker/drug-interaction`)
- **Endpoint:** `POST /api/checker/drug-interaction`
- **Request Body:**
```json
{
  "candidate_drug": "Amoxicillin 500mg"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "safe_to_administer": false,
  "candidate_drug": "Amoxicillin 500mg",
  "total_conflicts": 1,
  "warnings": [
    {
      "type": "ALLERGY_CONFLICT",
      "severity": "severe",
      "message": "CRITICAL ALERT: Candidate drug 'Amoxicillin 500mg' conflicts with registered allergy 'Penicillin'."
    }
  ]
}
```

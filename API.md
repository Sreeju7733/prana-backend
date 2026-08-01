# Prana Backend API Documentation

Base URL: `https://api.prana.emergency/v1` (or local: `http://localhost:3000`)

### Base Configuration
- **Auth Header:** `Authorization: Bearer <supabase_jwt>` on all protected endpoints.
- **Response Format:** Standard payload wrapper:
  - **Success:** `{ "data": ..., "error": null }`
  - **Failure:** `{ "data": null, "error": { "code": "...", "message": "..." } }`

## 🔑 Auth & OTP Flow

### Send OTP (`POST /api/auth/send-otp`)
- **Endpoint:** `POST /api/auth/send-otp`
- **Request Body:** `{ "phone": "9876543210" }`

---

### Resend OTP (`POST /api/auth/resend-otp`)
- **Endpoint:** `POST /api/auth/resend-otp`
- **Request Body:** `{ "phone": "9876543210" }`
- **Rate Limit:** 60-second cooldown between resends per phone number.
- **Responses:**
  - **200 OK (Success):**
    ```json
    {
      "data": {
        "message": "OTP resent successfully",
        "phone": "9876543210",
        "cooldown_seconds": 60,
        "otp": "791963"
      },
      "error": null
    }
    ```
  - **429 Rate Limited (Cooldown active):**
    ```json
    {
      "data": null,
      "error": {
        "code": "rate_limited",
        "message": "Please wait 45 seconds before requesting another OTP.",
        "retry_after_seconds": 45
      }
    }
    ```

---

## 🚀 1. Dashboard Hydration Endpoint (`GET /api/dashboard`)

The single call that hydrates the entire home screen in one round trip.

- **Endpoint:** `GET /api/dashboard`
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Response (200 OK):**

```json
{
  "data": {
    "profile": {
      "full_name": "Sreeju",
      "prana_id": "PRAN-2973CAC1",
      "card_status": "active",
      "blood_group": "B+",
      "profile_completion_pct": 80,
      "missing_sections": ["conditions"]
    },
    "health_summary": {
      "critical_allergy": {
        "allergen": "Penicillin",
        "severity": "life_threatening"
      },
      "meds_count": 2,
      "allergies_count": 1,
      "conditions_count": 0
    },
    "briefing": {
      "text": "Patient: Sreeju. Blood Group: B+. Allergies: Penicillin (life_threatening).",
      "bullets": [
        "Patient: Sreeju. Blood Group: B+. Allergies: Penicillin (life_threatening).",
        "Active Medications: Metformin 500mg BD. Emergency contact relay active."
      ],
      "generated_at": "2026-08-01T14:32:00Z",
      "is_stale": false
    },
    "recent_scans": [
      {
        "access_tier": "yellow",
        "scanned_at": "2026-07-30T18:45:00Z",
        "location_city": "Delhi",
        "responder_org": "Responder (108 Delhi)",
        "access_granted": true
      }
    ]
  },
  "error": null
}
```

### Edge Cases Handled:
- **Brand new user**: `health_summary` counts return `0`, `critical_allergy: null`, `missing_sections` lists empty tables to drive the completion prompt.
- **Briefing never generated**: Returns `briefing: null` so UI presents the "Generate your first briefing" CTA.
- **Briefing expired**: Returns `is_stale: true` when `expires_at` has passed.
- **Suspended card**: Includes `card_suspended_reason` field so UI renders a prominent red alert banner.
- **Empty scan history**: Returns `recent_scans: []`.
- **Missing blood group**: Returns `blood_group: null` to prompt critical data entry.
- **LLM / Briefing service down**: Returns `briefing: { "error": "generation_unavailable" }` without breaking profile or health summary hydration.

---

## 🔄 2. Regenerate AI Briefing (`POST /api/briefing/regenerate`)

Triggered by the manual refresh icon on the briefing card.

- **Endpoint:** `POST /api/briefing/regenerate`
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Request Body:** `{}` (empty object)

### Responses & Edge Cases:

- **200 OK (Success):**
```json
{
  "data": {
    "text": "Patient: Sreeju. Blood Group: B+. Allergies: Penicillin (life_threatening).",
    "bullets": [
      "Patient: Sreeju. Blood Group: B+. Allergies: Penicillin (life_threatening)."
    ],
    "generated_at": "2026-08-01T15:30:00Z",
    "is_stale": false
  },
  "error": null
}
```

- **429 Rate Limited (Max 1 regen per 5 minutes):**
```json
{
  "data": null,
  "error": {
    "code": "rate_limited",
    "message": "Rate limit exceeded. Please wait 240 seconds.",
    "retry_after_seconds": 240
  }
}
```

- **422 Insufficient Health Data:**
```json
{
  "data": null,
  "error": {
    "code": "insufficient_data",
    "message": "Add at least one condition, allergy, or medication first"
  }
}
```

- **503 LLM Failure:** Keeps serving cached briefing while returning 503 error code without overwriting valid data.

---

## 🏥 3. Health Tab Independent Summary (`GET /api/health/summary`)

- **Endpoint:** `GET /api/health/summary`
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Response (200 OK):**
```json
{
  "data": {
    "allergies": [
      {
        "id": "c39a8c12-3456-4921-8208-111111111111",
        "allergen": "Penicillin",
        "severity": "life_threatening",
        "is_critical": true
      }
    ],
    "medications": [
      {
        "id": "m1111111-2222-3333-4444-555555555555",
        "name": "Metformin",
        "dose": "500mg",
        "frequency": "BD",
        "is_active": true
      }
    ],
    "conditions": [
      {
        "id": "cond-101-uuid",
        "name": "Type 2 Diabetes",
        "status": "chronic",
        "diagnosed_date": "2019-06-01"
      }
    ]
  },
  "error": null
}
```
*Note: Evaluates via independent queries / LEFT JOINs so empty tables return `[]` without dropping user profile data.*

---

## ➕ 4. Record Mutations & Duplicate Guards (`POST /api/allergies`, `POST /api/medications`, `POST /api/conditions`)

### Duplicate Conflict Handling (`409 Conflict`):
When adding an entry that already exists (e.g. adding `"Penicillin"` when Penicillin is already recorded):
```json
{
  "data": null,
  "error": {
    "code": "duplicate_entry",
    "message": "Allergy 'Penicillin' already exists. Please update the existing record instead of creating a duplicate.",
    "existing_id": "c39a8c12-3456-4921-8208-111111111111"
  }
}
```

### Auto Briefing Invalidation:
Setting `is_critical: true` on an allergy triggers `trigger_briefing_update` to set `expires_at = NOW()` on cached briefings.

---

## 🔒 5. Card Suspension & Reactivation (`POST /api/card/suspend`, `POST /api/card/reactivate`)

### Suspend Card (`POST /api/card/suspend`)
- **Request Body:** `{ "reason": "lost" }`
- **Response (200 OK):**
```json
{
  "data": {
    "prana_id": "PRAN-2973CAC1",
    "card_status": "suspended",
    "reason": "lost"
  },
  "error": null
}
```

### Reactivate Card (`POST /api/card/reactivate`)
- **Request Body:** `{}`
- **Response (200 OK):**
```json
{
  "data": {
    "prana_id": "PRAN-2973CAC1",
    "card_status": "active"
  },
  "error": null
}
```
*Note: Public scans hitting a suspended card return `card_status: "suspended"`.*

---

## 📍 6. Recent Scan Feed (`GET /api/scans/recent?limit=5`)

- **Endpoint:** `GET /api/scans/recent?limit=5`
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Response (200 OK):**

```json
{
  "data": [
    {
      "id": "scan-uuid-1",
      "access_tier": "yellow",
      "scanned_at": "2026-07-30T18:45:00Z",
      "location_lat": 28.6139,
      "location_lng": 77.2090,
      "responder_org": "Responder (108 Delhi)",
      "access_granted": true,
      "denial_reason": null
    }
  ],
  "error": null
}
```
*Note: If geolocation was denied by the responder's browser, `location_lat` and `location_lng` return `null` safely without crashing UI map components.*

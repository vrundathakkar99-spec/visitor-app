# Maxwell Visitor Entry App — PRD

## Overview
A lightweight Expo (React Native) + FastAPI + MongoDB visitor management prototype for **Maxwell**. Visitors scan a QR at the gate, fill the form in their mobile browser, and assigned department employees (or admin) approve via in-app dashboard.

## Public routes
- `/` — Visitor entry form (mobile browser; no app install needed)
- `/status` — Visitor self-check by mobile number
- `/pass/[id]` — Vertical badge-style visitor pass with circular MW logo + QR
- `/admin` — PIN-protected reception/admin dashboard
- `/entry-qr` — Admin screen with printable Entry QR
- `/employee/login` — Employee email + password login
- `/employee/dashboard` — Pending department requests for the logged-in employee (auto-refresh 15s)
- `/success` — Submission confirmation

## Visitor categories
- **Factory Visit** (yellow) — Departments: Operation, QA, QC
- **Staff Visit** (blue) — Departments: Operation, QA, QC, HR, Maintenance, Account, Purchase, Marketing, **Others** (free-text person name)
- **Management** (green) — Static persons: RAJKUMAR CHAUDHARY, VINU CHAVDA, PRABHAT SINGH KUMAR, POOJA LOKHANDE, KRATI GUPTA, CHETNA BODKE

Cascading dropdown logic: select category → if Factory/Staff, pick department → pick employee (auto-fills if single); if "Others" → free-text input.

## Employees seeded
| Dept | Name | Email |
|---|---|---|
| Operation | Nishit Patel | nishit.patel@maxwell.com |
| QA | Vaibhav Desai | vaibhav.desai@maxwell.com |
| QC | Vasant Sarla | vasant.sarla@maxwell.com |
| HR | Mohit Goswami / Vrunda Thakkar / Harshida Pandor | *.firstname.lastname@maxwell.com |
| Maintenance | Patel Pritesh | patel.pritesh@maxwell.com |
| Account | Parmar Romik | parmar.romik@maxwell.com |
| Purchase | Ajinkya Bapat | ajinkya.bapat@maxwell.com |
| Marketing | Mayur Dod / RajvinderKaur Hunda | *.firstname.lastname@maxwell.com |

Default password: `maxwell@123`. Idempotent seed runs at backend startup.

## Backend (FastAPI + MongoDB + JWT)
**Public**: `GET /api/categories`, `POST /api/visitors`, `GET /api/visitors/by-mobile/{mobile}`, `GET /api/visitors/{id}`, `GET /api/qr?text=...&size=N`, `GET /api/qr-entry`, `POST /api/admin/verify-pin`, `POST /api/employee/login`

**Auth required**:
- `GET /api/employee/me` (Bearer)
- `GET /api/employee/visitors` (Bearer) — filtered by employee's department
- `PATCH /api/visitors/{id}/status` (X-Admin-Pin **or** Bearer)

**Approval rule** — first responder wins: status changes only allowed when current=pending; else returns **409 Conflict** with `decided_by` info. Employee authorization: must be the named assignee OR same department.

## Visitor Pass (Vertical badge layout)
- Top color stripe by category
- Circular MW Maxwell logo + "MAXWELL VISITOR PASS" header
- Photo frame (bordered with category color)
- Name + monospace pass-number pill
- Details: Category / Department / To Meet / Purpose / Date & Time / Mobile
- Status badge + QR code (encodes pass number)
- Footer strip with brand line
- Lanyard hole decoration up top — looks like a hanging ID card

## Environment variables (backend)
- `MONGO_URL`, `DB_NAME` — Mongo connection
- `ADMIN_PIN` — admin keypad code (default `1234`)
- `JWT_SECRET`, `JWT_ALGORITHM` (HS256), `JWT_EXPIRE_HOURS` (12)
- `EMPLOYEE_DEFAULT_PASSWORD` (`maxwell@123`), `EMPLOYEE_EMAIL_DOMAIN` (`maxwell.com`)
- `PUBLIC_APP_URL` — required at deploy for `/api/qr-entry` (no hardcoded fallback)

## Constraints maintained
- No new RN dependencies beyond `@react-native-async-storage/async-storage` (works on web + native).
- No push notifications (in-app polling 15s).
- No external auth providers (custom JWT + bcrypt).
- Expo Go compatibility: Ionicons font preloaded in `_layout.tsx`.
- Camera capture optional (lives behind permission flow).

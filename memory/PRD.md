# Visitor Entry App — PRD

## Overview
A lightweight Expo (React Native) prototype that lets visitors submit an entry request (with live camera photo) and lets a security/reception admin approve or reject those requests via a PIN-protected screen. Approved visitors get a digital pass.

## User Flows
1. **Visitor submits form** (route `/`): name, mobile, purpose, person to meet, live camera photo → POST `/api/visitors` → success screen.
2. **Visitor checks status** (route `/status?mobile=...`): looks up own requests by mobile → if approved, opens pass.
3. **Admin** (route `/admin`): enters 4-digit PIN keypad → list of all visitors with filters → Approve / Reject pending requests → view approved passes.
4. **Visitor Pass** (route `/pass/[id]`): shows name, person to meet, date & time, status badge, photo.

## Backend (FastAPI + MongoDB)
- `POST /api/visitors` — create visitor (status defaults to `pending`)
- `GET /api/visitors` (header `X-Admin-Pin`) — list all
- `GET /api/visitors/by-mobile/{mobile}` — visitor self-lookup
- `GET /api/visitors/{id}` — single visitor for pass
- `PATCH /api/visitors/{id}/status` (header `X-Admin-Pin`) — approve/reject
- `POST /api/admin/verify-pin` — verify 4-digit PIN

`ADMIN_PIN` is configured in `/app/backend/.env` (default `1234`).

## Constraints (per problem statement)
- No login system, no push notifications, no external integrations.
- Live camera capture only (expo-camera).
- Photo stored as base64 in MongoDB.
- QR code is external — scanning the QR opens the form route directly.

## Smart Enhancement
Mobile-number-based status check lets visitors verify approval from their own phone (no app login), increasing usability and reducing security desk back-and-forth.

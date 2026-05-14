# Visitor Entry App — PRD

## Overview
A lightweight Expo (React Native) + FastAPI + MongoDB visitor entry prototype branded for **Maxwell**. Visitors scan a QR placed at the gate → opens the form in any mobile browser → security/reception admin approves → approved visitors receive a printable horizontal corporate-style pass.

## Public routes
- `/` — Visitor entry form (works in any mobile browser, no Expo Go required)
- `/status` — Visitor self-check by mobile number
- `/pass/[id]` — Visitor pass (horizontal corporate badge)
- `/admin` — PIN-protected admin dashboard
- `/entry-qr` — Admin screen: large QR pointing to the public form URL (for printing/displaying at gate)
- `/success` — Submission confirmation

## Backend (FastAPI + MongoDB)
- `GET /api/categories` — returns dependent dropdown map (3 categories + their sub-options)
- `POST /api/visitors` — create visitor (`category` + optional `sub_category` validated server-side)
- `GET /api/visitors` (header `X-Admin-Pin`) — list all
- `GET /api/visitors/by-mobile/{mobile}` — self-lookup
- `GET /api/visitors/{id}` — single
- `PATCH /api/visitors/{id}/status` (header `X-Admin-Pin`) — approve/reject
- `POST /api/admin/verify-pin` — verify 4-digit PIN
- `GET /api/qr?text=...&size=N` — generic QR PNG
- `GET /api/qr-entry?size=N` — QR PNG pointing to `PUBLIC_APP_URL` (defaults to `EXPO_PUBLIC_BACKEND_URL`)

Admin PIN: `1234` (env `ADMIN_PIN` in `/app/backend/.env`)

## Visitor categories (dependent dropdowns)
- **Factory Visit** (yellow) → `Production`, `QC`
- **Staff Visit** (blue) → `HR, SALES, ACCOUNT, PURCHASE, MAINTENANCE, DESIGN, QC, OPERATION`
- **Management** (green) → `RAJKUMAR CHAUDHARY, VINU CHAVDA, PRABHAT SINGH KUMAR, POOJA LOKHANDE, KRATI GUPTA, CHETNA BODKE`

## Visitor Pass
Horizontal landscape badge:
- Top category color strip showing `CATEGORY • SUB_CATEGORY`
- Maxwell logo (left) + pass number (right) in header
- Bordered photo frame on the left (border color = category accent)
- Details column (name, purpose, person to meet, date/time, status)
- Real PNG QR code on the right + "SCAN" caption
- Maxwell footer strip

## Smart enhancements
1. **QR Entry Access** — Backend-rendered QR (Python `qrcode` lib) means no RN dependency; works in any browser.
2. **Mobile-number self-service status check** — visitors verify their own approval without app login.

## Constraints maintained
- No new RN dependencies for QR; uses backend-generated PNG and `<Image source={{uri}}>`.
- No login system, no push notifications, no external integrations.
- Expo Go compatibility maintained (Ionicons font preloaded in `_layout.tsx`).
- Lightweight bundle; backward-compatible with legacy visitors missing new fields.

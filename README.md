# Health Passport AI

A modern, AI-powered healthcare web application that securely stores and manages patients' medical records using a digital health passport.

## Features

- **AI Medical Summary** — Google Gemini powered medical history analysis
- **QR Health Passport** — Scan-to-access emergency medical data
- **OCR Report Scanner** — Tesseract OCR extraction from PDF/JPG/PNG
- **Emergency Access** — Read-only instant access for first responders
- **Secure Cloud Storage** — Firebase-backed encrypted records
- **Privacy Protected** — JWT-secured, role-based access control

## Tech Stack

| Layer     | Technology                                   |
| --------- | -------------------------------------------- |
| Frontend  | Next.js, React, Tailwind CSS, Framer Motion  |
| Backend   | Node.js, Express.js                          |
| Database  | MongoDB Atlas (Mongoose)                     |
| AI        | Google Gemini API                            |
| OCR       | Tesseract.js                                 |
| Storage   | Firebase Storage                             |
| Auth      | JWT + OTP                                    |
| QR        | qrcode.react / html5-qrcode                 |
| Deploy    | Vercel (frontend) · Render (backend)         |

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Environment Variables

See `backend/.env.example` for the full list.

## Folder Structure

```
backend/     Express API, Mongoose models, AI/OCR/QR services
frontend/    Next.js app (App Router)
```

## Deployment

- Frontend → Vercel (root: `frontend`)
- Backend → Render (root: `backend`, start: `npm run start`)

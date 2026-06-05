# MatchMind — Setup & What I Need From You

This is a Vite + React (TypeScript) mobile-first web app. The frontend lives in `src/`,
and the API/backend runs as middleware inside `vite.config.ts` (works in both `npm run dev`
and `npm start` / `vite preview`). All secrets stay server-side; the browser only calls `/api/*`.

## Run locally
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm start          # serves dist/ + /api on $PORT (used by Render)
```

## Environment variables (put in `.env`, never commit)
`.env` is git-ignored. Set these on your host (Render/Firebase) dashboard too.

| Key | Status | Used for |
|-----|--------|----------|
| `ROBOTEVENTS_API_TOKEN` | ✅ working | Teams, events, matches, awards, rankings, skills |
| `GROQ_API_KEY` | ✅ working | AI coach (primary) |
| `OPENROUTER_API_KEY` | ✅ working | AI coach cross-check + image/video vision |
| `DEEPSEEK_API_KEY` | ⚠️ "Insufficient Balance" | extra cross-check (add credit to enable) |
| `OPENAI_API_KEY` | ⚠️ "quota exceeded" | extra cross-check + best vision (add billing to enable) |
| `VITE_GOOGLE_CLIENT_ID` | set | Google sign-in (client) |
| `RESEND_API_KEY` | set | Teammate invite emails |
| `INVITE_FROM_EMAIL` | needed | Verified "from" address for invites (see below) |
| `FIREBASE_*` | set | Reserved for Firebase backend (see below) |

## What I still need from you

### 1. Google Sign-In (to remove the email fallback)
Google sign-in uses Google Identity Services with `VITE_GOOGLE_CLIENT_ID`. For the popup to work
you must add your app's origins to the OAuth client in Google Cloud Console →
*APIs & Services → Credentials → your OAuth client → Authorized JavaScript origins*:
- `http://localhost:5173`
- your production URL (e.g. `https://robotics-platform-xxxx.onrender.com`)
- for iOS/Xcode (Capacitor/WKWebView) the served origin as well

### 2. Teammate invite emails (Resend)
Invites POST to `/api/invites/send` which calls Resend server-side. To deliver real mail:
- Verify a sending domain in Resend, then set `INVITE_FROM_EMAIL="MatchMind <invites@yourdomain.com>"`.
- Until a domain is verified, Resend only sends from `onboarding@resend.dev` to your own address.

### 3. Firebase backend (to store users + power cross-device messaging)
You added the Firebase **web** keys (`FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, …). To let the
server securely **store user info** (name, email, team) and run real cross-user **messaging**,
I need a **Firebase service account JSON** (Project Settings → Service accounts → Generate key),
provided as `FIREBASE_SERVICE_ACCOUNT` (the JSON, base64 or raw). With that I can:
- write `users/{uid}` documents on sign-in (name, email, team, avatar),
- store/sync messages and shared to-dos in Firestore with security rules,
- send match/award push notifications via Firebase Cloud Messaging.
The web API key alone cannot do secure server-side writes.

### 4. Messaging
Messaging currently works per-device (local) with clean chat bubbles, media upload, search,
robotics reactions, direct replies, unread counts, and offline waiting states.

To make messages actually work across teammates by email, configure one realtime/private backend:

**Recommended: Firebase**
1. Create/confirm a Firebase project.
2. Enable Google sign-in in Firebase Authentication.
3. Create Firestore.
4. Generate a Firebase service account JSON.
5. Set `FIREBASE_SERVICE_ACCOUNT` on the server/Render environment.
6. Add Firestore security rules so users can only read/write conversations inside their workspace.

**Alternative: Supabase**
Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, then add
tables for users, workspace members, conversations, messages, reactions, and read receipts.

The web API key alone is not enough for secure private team messaging because server-side writes,
workspace authorization, and realtime message fan-out need a trusted backend credential.

## Deploy
- **Render:** `render.yaml` is included. Build `npm install && npm run build`, start `npm start`.
- **Firebase Hosting + Functions:** I can add this once the service account is provided.

## iOS / App Store (Xcode)
The app is a mobile-first PWA. To ship on the App Store, wrap it with **Capacitor**:
```bash
npm i @capacitor/core @capacitor/ios && npx cap init && npx cap add ios && npx cap open ios
```
Point Capacitor's `webDir` at `dist/` and the server URL at your hosted backend so `/api/*` works.

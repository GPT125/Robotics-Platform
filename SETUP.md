# MatchMind — Setup & What I Need From You

This is a Vite + React (TypeScript) mobile-first web app. The frontend lives in `src/`.
Local development still supports the Vite `/api/*` middleware, and production Firebase backend
source now lives in `functions/`. All RobotEvents and AI secrets must stay server-side.

## Run locally
```bash
npm install
npm install --prefix functions
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run build --prefix functions
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
| `VITE_FIREBASE_API_KEY` | needed | Firebase web app bootstrap |
| `VITE_FIREBASE_AUTH_DOMAIN` | needed | Firebase Auth |
| `VITE_FIREBASE_PROJECT_ID` | needed | Firebase project |
| `VITE_FIREBASE_STORAGE_BUCKET` | needed | Firebase Storage |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | needed | Firebase Cloud Messaging-ready config |
| `VITE_FIREBASE_APP_ID` | needed | Firebase web app |
| `VITE_RECAPTCHA_SITE_KEY` | optional | Firebase App Check |
| `RESEND_API_KEY` | set | Teammate invite emails |
| `INVITE_FROM_EMAIL` | needed | Verified "from" address for invites (see below) |

## What I still need from you

### 1. Firebase Auth
The app now uses Firebase Auth for:
- Google sign-in
- Apple sign-in
- Email/password sign-in

In Firebase Console → Authentication → Sign-in method, enable:
- Email/Password
- Google
- Apple

Then add these authorized domains:
- `localhost`
- your Firebase Hosting domain
- any custom production domain
- your Capacitor/iOS redirect domain if used

### 2. Teammate invite emails (Resend)
Invites POST to `/api/invites/send` which calls Resend server-side. To deliver real mail:
- Verify a sending domain in Resend, then set `INVITE_FROM_EMAIL="MatchMind <invites@yourdomain.com>"`.
- Until a domain is verified, Resend only sends from `onboarding@resend.dev` to your own address.

### 3. Firebase backend secrets
Firebase Functions must receive private API keys through Secret Manager, not the frontend.
From the project root:
```bash
firebase login
firebase use vexrobolab
firebase functions:secrets:set ROBOTEVENTS_API_TOKEN
firebase functions:secrets:set GROQ_API_KEY
firebase functions:secrets:set OPENROUTER_API_KEY
firebase functions:secrets:set OPENAI_API_KEY
```

Optional non-secret runtime override in `functions/.env`:
```bash
ROBOTEVENTS_BASE_URL=https://www.robotevents.com/api/v2
```

The new callable backend includes:
- RobotEvents proxy/search helpers
- tournament group chat join/read/send
- server-side message safety moderation
- MatchMind event-team registration
- alliance offer send/list
- AI function placeholder wired for server-side provider secrets

### 4. Messaging
Messaging currently works per-device (local) with clean chat bubbles, media upload, search,
robotics reactions, direct replies, unread counts, and offline waiting states.

To make messages actually work across teammates by email, configure one realtime/private backend:

**Recommended: Firebase**
1. Create/confirm a Firebase project.
2. Enable Google, Apple, and Email/Password sign-in in Firebase Authentication.
3. Create Firestore.
4. Deploy Functions with the secrets above.
5. Deploy Hosting.
6. Add Firestore security rules so users can only read/write conversations inside their workspace/event.

**Alternative: Supabase**
Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, then add
tables for users, workspace members, conversations, messages, reactions, and read receipts.

The Firebase web API key is not a private secret, but RobotEvents and AI keys are private secrets
and must only be available inside Firebase Functions.

## Deploy
- **Render:** `render.yaml` is included. Build `npm install && npm run build`, start `npm start`.
- **Firebase Hosting + Functions:**
```bash
npm run build
npm run build --prefix functions
firebase deploy --only functions,hosting
```

Tournament group chats open two days before the event and close twelve hours after the event.
Alliance offers open one hour before the configured alliance-selection time. If that time is not
configured in `eventSettings/{eventId}.allianceSelectionAt`, the backend estimates it near the end
of the tournament until official/manual timing is added.

## iOS / App Store (Xcode)
The app is a mobile-first PWA. To ship on the App Store, wrap it with **Capacitor**:
```bash
npm i @capacitor/core @capacitor/ios && npx cap init && npx cap add ios && npx cap open ios
```
Point Capacitor's `webDir` at `dist/` and the server URL at your hosted backend so `/api/*` works.

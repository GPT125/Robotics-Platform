# MatchMind — Remaining Work

This file now tracks only what is NOT yet complete. Completed items have been removed.
See `SETUP.md` for keys/services I need from you.

## ✅ Done & verified
- Uploaded design adopted as the app; unused files removed; build is green.
- RobotEvents API connected (teams, events, matches, awards, rankings, skills).
- First-run flow: Google sign-in popup at the TOP, then RobotEvents team picker (must select a real team), plus "Continue as guest".
- Settings: change team (RobotEvents search), display name, profile picture (preset icons + upload), accent color (persists app-wide), teammates with email invites.
- Teammate invite emails wired to Resend (`/api/invites/send`).
- AI Coach: confidence removed, input grows upward, image + video upload, voice (speech-to-text) input, collapsible Sources with clickable links, multi-model cross-check (Groq + OpenRouter).
- AI fed live platform context: today's date, next match (field/time/opponents/partner), next tournament, team stats, recent results — match-aware answers.
- Scout notes: tags, star ratings, images, description, top "Done" save button, mobile-fit sizing.
- To-Do page (opens from Home, not in nav): priorities, tags, sections, smart views, subtasks, attachments, flags, assignees, AI "break into steps".
- Match result + award notifications generated from RobotEvents data.
- Removed AI Lessons and Robots from the menu; sleek bottom nav; page/button animations.

## ⬜ Remaining (needs decisions or your keys)
1. **Firebase backend** — store users (name/email/team) + cross-user messaging + push.
   Needs `FIREBASE_SERVICE_ACCOUNT` (see SETUP.md). Messaging is local-only until then.
2. **AI match predictions UI** — feedback loop endpoint exists (`/api/predictions/feedback`);
   still need the per-future-match win-probability bars rendered under matches.
3. **Award qualification engine** — show which teams qualify / are likely to win each award
   using VEX rules (e.g. top-30% skills for Excellence). Research + UI pending.
4. **Full messaging** — image/video + real-time cross-user (depends on #1 backend choice).
5. **Verify cross-device** once a backend is chosen (Firebase vs Supabase).

## Notes
- Only Groq + OpenRouter currently have working AI credit; DeepSeek/OpenAI are billing-blocked.
- `.env` stays git-ignored. Set the same vars in your host dashboard.

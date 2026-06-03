# RoboLab Master Project Specification

Last updated: 2026-06-02

This document is the combined product, engineering, and implementation handoff for RoboLab after merging the current RoboLab platform with the standalone `Scout-Master-Pro` project. It is based on:

- `/Users/shervinshapoury/Downloads/RoboLab_Improved_5_Page_Build_Spec.pdf`
- `/Users/shervinshapoury/Documents/Robotics Platform/Scout-Master-Pro`
- The existing RoboLab React/Vite SPA in `/Users/shervinshapoury/Documents/Robotics Platform/src`

RoboLab is a premium, mobile-first robotics competition command center for VEX teams. It combines official RobotEvents data, offline-first scouting, tournament intelligence, workspace messaging, robot status, AI analysis, and robot image/video part audits into one platform.

## Product Direction

RoboLab is not only a scouting database. It is the operating system a robotics team opens during practices, pit scouting, qualification rounds, alliance selection, robot repair sessions, and strategy meetings.

The merged platform should help teams answer:

- What tournament are we preparing for?
- Which teams should we scout first?
- Who is consistent, risky, reliable, or underrated?
- What does official data say, and what did our scouts observe?
- What should our alliance pick list look like?
- What should our drive team do next match?
- What is our robot status right now?
- Which VEX parts are on our robot, and what would it cost to rebuild or replace them?
- What robot/code changes are safe to review?

## Merged Platform Sources

### Current RoboLab SPA

The current RoboLab app already provides:

- Dark premium React interface
- Home dashboard
- Scout search
- Event center
- Team profile
- Team comparison
- Alliance builder
- Match predictor
- AI coach
- Scouting notes
- Messages
- Robot Lab preview
- Zustand state
- TanStack Query usage
- IndexedDB helper
- Server-side API adapter stubs

### Scout-Master-Pro

Scout-Master-Pro contributes several strong product ideas:

- Production must start empty for new users.
- Mock data must only be visible in developer/test mode.
- Google sign-in modal should appear on first launch and be skippable.
- Bottom navigation should include Home, Scout, Tournaments, Robot Lab, Messages, and Settings/More.
- Tournaments should be a major app surface, not buried under Events.
- Scouting notes should support Pit, Match, Post-match, and Photo/Video modes.
- Robot Lab should store robot images, status, confirmed parts, mechanisms, and cost estimates.
- Messages must be workspace-only and require sign-in.
- Settings should include program, team setup, theme, custom tags, API diagnostics, and privacy controls.

## Build Outcome

The merged direction is one RoboLab platform with the best of both:

- Current RoboLab supplies the polished web/desktop SPA shell and AI/scouting workflows.
- Scout-Master-Pro supplies mobile-native product discipline: empty production state, first-run auth, tournaments, robot status, image upload, and workspace settings.
- The new Robot Lab direction removes the old 360 simulator priority. The new workflow is image/video robot part audit, AI-assisted VEX part detection, official library matching, cost estimate, and manual confirmation.

## Core Product Rules

### No Fake Data In Production

Production must start empty for new users.

The app may contain mock data only when a developer/test flag is enabled. In production:

- No preloaded fake teams
- No fake tournament records
- No fake rankings
- No fake match predictions
- No hidden AI assumptions

If official data is unavailable, the UI must show:

- No data
- Loading
- Updating
- Stale
- Offline
- Setup needed
- Retry
- Cached with `last_fetched_at`

### Secrets Stay Server-Side

RobotEvents and AI keys must never be exposed in the browser.

The browser/mobile client calls internal `/api` routes. The backend:

- Reads `.env.local` or hosting environment variables
- Calls RobotEvents
- Calls AI providers
- Caches official data
- Returns sanitized responses

### AI Must Be Explainable

AI should never feel like a magic black box. Every AI output needs:

- Confidence: High, Medium, Low, Not enough data, or Stale data
- Data sources used
- Missing data warning when needed
- Editable recommendation
- Clear reason and risk
- No invented facts

## Navigation

### Mobile Bottom Navigation

RoboLab uses five main tabs:

1. Home
2. Scout
3. Tourney
4. Robot
5. Messages

Settings, AI Coach, Alliance Builder, Compare, Match Predictor, and advanced tools live behind More and desktop navigation.

### Desktop Navigation

Desktop keeps a wider strategy-meeting layout:

- Home
- Scout
- Tourney
- Robot
- Messages
- Teams
- Compare
- Alliance
- AI Coach
- More
- Settings

## First-Run Auth

The app should show a centered sign-in modal when a new user opens RoboLab.

Buttons:

- Continue with Google
- Skip for now

Skipped users can:

- Browse public/searchable official data
- Search teams and tournaments
- View public event/team shells

Skipped users cannot:

- Send messages
- Sync notes
- Upload robot images
- Save robot status
- Share team robot data
- Create workspace records

Recommended production stack:

- Supabase Auth with Google, or Firebase Auth with Google
- Do not mix multiple auth systems

## Environment Variables

The repo now includes `robolab.env.example`.

Copy it locally:

```bash
cp robolab.env.example .env.local
```

Important groups:

- RobotEvents: `ROBOT_EVENTS_API_TOKEN`, `ROBOTEVENTS_BASE_URL`, `ROBOTEVENTS_CACHE_TTL_SECONDS`
- Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- Database: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- AI: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `AI_DEFAULT_PROVIDER`
- Uploads: `UPLOAD_BUCKET`, `MAX_IMAGE_MB`, `REMOVE_IMAGE_EXIF`
- Widgets: `WEATHER_API_KEY`, `MAPS_API_KEY`

Never commit `.env`, `.env.local`, or real keys.

## Home

Home should be useful within five seconds.

Required widgets:

- Current workspace/team
- Program and season
- Next tournament
- Current event status
- Next match
- Favorite teams
- Robot status
- Unsynced notes
- Weather for event city
- AI daily scouting brief
- Data freshness badge

Widgets should eventually be rearrangeable:

- Drag/drop on desktop
- Long-press reorder on mobile
- Layout saved to user/workspace

## Scout

Scout merges RoboLab search with Scout-Master-Pro note organization.

Search should support:

- Team number
- Partial number
- Team name
- Organization/school
- City
- Region
- Event SKU
- Tournament name
- Program
- Season

Autocomplete card fields:

- Team number
- Team name
- School/org
- City/region
- Program
- Current-season activity badge

Scouting modes:

- Pit
- Match
- Super Scout
- Post-match Review
- Photo/Video Note

Each note should support:

- Custom tags
- Preset tags
- Star/rating sliders
- Game-performance score
- Structured fields
- Free notes
- Images
- Attachments
- Offline save
- Sync state
- Conflict handling

Important tags:

- fast intake
- defensive
- great auton
- unreliable
- tipped
- driver skill
- mechanical issue
- good partner
- avoid
- risky
- consistent
- high scorer
- code issue

## Tournaments

Tournaments is a primary tab.

Users should browse upcoming/current/completed events by:

- Program
- Location
- Distance
- Date
- Awards
- Qualification level
- Participating teams

Tournament detail should include:

- Overview
- Venue/map
- Weather
- Schedule
- Divisions
- Team list
- Rankings
- Skills
- Awards
- Qualification info
- Matches
- Favorite teams
- Scout assignments
- Data freshness
- Tournament AI chat

Award and qualification rules:

- Do not claim state/world qualification unless official data confirms it.
- If awards are unavailable, show pending or unknown.
- If the event is stale/offline, show cached data and last fetched timestamp.

## Team Profile

Team profiles should feel like sports analytics pages, not spreadsheets.

Required sections:

- Team number
- Team name
- School/org
- City/region
- Program
- Season
- Favorite
- Compare
- Add note
- Win/loss rate
- Rank trend
- Average/max score
- Skills scores
- Awards
- Event history
- Current tournament status
- Matches
- Partners/opponents
- Live form
- Prediction confidence
- Scout notes
- Pit notes
- Match notes
- Photos
- Author/source
- Seen by our team filter
- Max-time history

Charts must show source labels:

- Official
- Scouting
- Calculated
- Cached
- Mixed

## Compare

Compare supports 2-6 teams.

Desktop:

- Clean matrix
- Frozen team columns later
- Best/weakest highlights

Mobile:

- Swipeable cards
- Sticky metric selector

Metrics:

- Average score
- Win rate
- Consistency
- Rank trend
- Programming skills
- Driver skills
- Awards this year
- Scout trust
- Mechanism tags
- Risk flags

Every metric needs a tooltip explaining why it matters to students and coaches.

## Alliance Builder

Alliance Builder must always be explainable.

Features:

- Pick list tiers A/B/C/D/Avoid
- Drag/drop later
- Lock favorites
- Hide already-picked teams
- Add notes
- Selection mode at tournaments
- Top 5 AI partner options
- Reasons
- Confidence
- Data gaps
- Risk warnings

Compatibility should consider:

- Current event performance
- Consistency
- Autonomous strength
- Mechanism fit
- Skills
- Scout trust
- Notes
- Risk tags

AI output examples:

- Top partner: high score, consistent, complements our role
- Warning: low sample size or conflicting scout notes
- Strategy: auton route fit, defense risk, endgame plan
- Confidence: High, Medium, Low data, Stale data

## Messages

Messages are workspace-only and require Google sign-in.

MVP rules:

- No public random DMs
- Direct and group chats only inside approved workspace
- Coaches/owners can moderate
- Users can delete/report
- Emails are not shown publicly in chat UI

Features:

- 1-on-1 chats
- Group chats
- Group names
- Group icons
- Unread badges
- Pinned chats
- Reactions
- Replies
- Attachments
- Images
- Scout note cards
- Robot status cards
- Team/match cards
- AI insight cards
- Typing indicator
- Read/delivered/sending/failed states
- Call icon placeholder that is not broken

AI in messages:

- `@AI summarize this chat`
- `@AI build a match strategy`
- `@AI compare the teams mentioned here`
- `@AI turn this discussion into a pick list`
- `@AI what are the risks with this alliance?`

AI outputs should appear as special cyan-accent insight cards, not plain terminal text.

## Robot Lab

Robot Lab is a signed-in workspace feature.

It stores:

- Robot project versions
- Current status
- Images/videos
- 3D/CAD view later
- Code
- Dimensions
- Calibration
- Confirmed parts
- Cost estimate
- Strategy notes
- Simulation/path runs

Robot status values:

- Ready
- Needs repair
- Testing
- Competition locked
- Code issue
- Mechanical issue
- Custom status later

Status updates should attach to:

- Robot project
- Match notes
- Alliance planning
- Team messages

## Robot Vision Audit

The old 360 simulator priority is removed.

New direction:

- Users upload 8-16 photos, a 360 image, or a slow walkaround video from their robot.
- AI checks blur/lighting and detects likely VEX parts/mechanisms.
- AI compares likely parts against official VEX product pages, official VEX CAD links, Onshape references, and workspace parts library.
- User must confirm labels before saving.
- Low-confidence detections must say manual labeling recommended.
- Cost estimate is rough, editable, and source-labeled.
- RoboLab must never pretend the CAD or bill of materials is exact.

Capture prompts:

- Front
- Back
- Left
- Right
- Top
- Close-up
- 360 image
- Walkaround video

AI output:

- Part name
- SKU
- Category
- Quantity
- Unit cost
- Confidence
- Source URL
- Confirmed/unconfirmed
- Mechanism tree
- Total estimate
- Missing angle warnings

## Representative Official VEX Part Sources

These are representative examples for the robot vision/budget workflow. Prices change, so production should refresh server-side and cache timestamps.

As of 2026-06-02, the current dev-mode estimate uses these official VEX URLs:

- V5 Robot Brain, SKU 276-4810: https://www.vexrobotics.com/276-4810.html
- V5 Smart Motor 11W, SKU 276-4840: https://www.vexrobotics.com/276-4840.html
- V5 Robot Battery Li-Ion 1100mAh, SKU 276-4811: https://www.vexrobotics.com/276-4811.html
- V5 Controller, SKU 276-4820: https://www.vexrobotics.com/276-4820.html
- V5 Robot Radio, SKU 276-4831: https://www.vexrobotics.com/276-4831.html
- V5 Battery Clip 4-Pack, SKU 276-6020: https://www.vexrobotics.com/276-6020.html

Production should add:

- Official VEX part library crawler/cache
- CAD link extractor
- Onshape document/reference resolver
- Manual team parts library override
- Currency/tax/shipping configuration
- Confidence and last fetched timestamp per price

## Code Upload And Path Planner

Code tools must be safe.

Rules:

- Upload VEXcode C++/Python files.
- Parse motors, sensors, ports, and common movement commands.
- Do not execute arbitrary uploaded code.
- Simulate only a safe recognized subset.
- Use timeouts and warnings.
- Generated code must appear as a reviewable diff patch.
- Users must accept changes before export.

Dimension/calibration wizard:

- Robot size
- Wheel diameter
- Track width
- Wheelbase
- Gear ratios
- Mass
- Center of mass
- Lift geometry
- Physical test corrections

## AI Surfaces

AI appears across the platform:

- AI Team Analyst
- AI Tournament Assistant
- AI Scout Helper
- AI Robot Lab
- AI Strategy Coach
- AI Message Summarizer
- AI Pick List Builder
- AI Code Warning Reviewer

AI must always include:

- Confidence
- Data sources
- Missing data
- Editable result
- Source labels

## Backend/API Contract

Current stubs include or should include:

- `GET /api/events/search`
- `GET /api/events/:id`
- `GET /api/events/:id/matches`
- `GET /api/events/:id/rankings`
- `GET /api/events/:id/skills`
- `GET /api/tournaments/search`
- `GET /api/teams/:number`
- `POST /api/scouting/notes`
- `POST /api/compare`
- `POST /api/alliance/recommend`
- `POST /api/matches/predict`
- `POST /api/ai/coach`
- `POST /api/picklist/update`
- `GET /api/messages/conversations`
- `POST /api/messages/conversations`
- `GET /api/messages/conversations/:id`
- `GET /api/messages/conversations/:id/messages`
- `POST /api/messages/conversations/:id/messages`
- `PATCH /api/messages/:id`
- `DELETE /api/messages/:id`
- `POST /api/messages/:id/reactions`
- `DELETE /api/messages/:id/reactions`
- `POST /api/messages/:id/pin`
- `DELETE /api/messages/:id/pin`
- `POST /api/messages/ai/summarize`
- `POST /api/messages/ai/strategy`
- `POST /api/messages/ai/picklist`
- `POST /api/messages/mark-read`
- `POST /api/robot-lab/analyze`
- `GET /api/robot-lab/parts-catalog`
- `POST /api/robot-lab/parts/confirm`

## Data Model

The SPA has TypeScript models for:

- Team
- Event
- Tournament
- Match
- Ranking
- SkillsResult
- ScoutingNote
- PitScoutNote
- MatchScoutNote
- TeamMetric
- CompareResult
- AllianceRecommendation
- MatchPrediction
- AIInsight
- PickList
- Workspace
- User
- WorkspaceMember
- Conversation
- ConversationMember
- Message
- MessageReaction
- PinnedMessage
- AIInsightMessage
- RobotProject
- RobotScanAsset
- RobotPartEstimate
- RobotVisionAnalysis
- AppSettings

Future DB-ready models should be implemented with Prisma or Drizzle:

- Users
- Workspaces
- WorkspaceMembers
- Teams
- Events
- Matches
- Rankings
- Skills
- Notes
- Attachments
- Conversations
- Messages
- Reactions
- PinnedMessages
- RobotProjects
- RobotImages
- RobotPartEstimates
- RobotStatusLog
- AIInsights
- AuditLogs

## Offline Requirements

The app should work under weak competition Wi-Fi.

Offline behavior:

- Notes save instantly offline.
- Messages can be drafted offline.
- Offline messages show Waiting to send.
- Failed messages show Retry.
- Cached conversations remain visible.
- Event pages show cached data when offline.
- Conflict states preserve both versions.

Sync states:

- `local_only`
- `syncing`
- `synced`
- `failed`
- `conflict`

## Privacy And Safety

Required privacy features:

- No public random DMs
- Workspace member access only
- Owner/coach moderation
- Delete/report controls
- Private uploads
- Remove image EXIF by default
- Role-based access
- Export/delete controls
- Secrets never sent to frontend

## UI Quality Bar

RoboLab must feel like a premium robotics analytics product.

Visual direction:

- Dark glass panels
- Strong mobile bottom navigation
- Large readable typography
- 44px+ tap targets
- Clear red/blue alliance visuals
- Skeleton loaders
- Empty states
- Error states
- Offline/stale states
- Smooth 200-250ms transitions
- No terminal-looking AI output
- No hidden functionality behind dead buttons

## Current Implementation Notes

The current merged SPA implements:

- First-run Google/Skip modal
- Production-empty vs developer-mock mode badge
- Spec bottom nav: Home, Scout, Tourney, Robot, Messages
- Tournaments page
- Tournament award/qualification honesty states
- Workspace-locked Messages page
- Robot Lab image/video audit page
- VEX parts cost estimate table
- Manual confirmation workflow UI
- Settings team/program/theme/API diagnostics
- `robolab.env.example`
- Comprehensive TypeScript model updates
- `/api` stubs for tournaments and robot-lab routes

## Known Technical Caveat

The installed local React/Vite/esbuild toolchain previously hung while bundling framework dependencies in this workspace. Lint and syntax checks pass. If normal `npm run build` hangs again, refresh dependencies before production deployment.

Recommended cleanup:

```bash
rm -rf node_modules package-lock.json
npm install
npm run lint
npm run build
```

If the hang persists, pin to a known-good Vite/React/esbuild stack and rebuild the lockfile.

## Launch Acceptance Checklist

RoboLab is launch-ready when:

- Google modal works and skip mode is clear.
- RobotEvents key works server-side or UI explains failure.
- Search works by team number, city, school, org, event SKU, and tournament.
- Scout notes support tags, ratings, images, offline sync, and conflicts.
- Charts use official/cached/source-labeled data only.
- Tournaments show venue, teams, awards, rankings, skills, matches, and freshness.
- Messages are workspace-only and sign-in gated.
- Robot Lab accepts images/video, detects likely parts, shows confidence, and requires manual confirmation.
- Part budgets use official VEX/source-labeled prices with refresh timestamps.
- AI outputs cite data and never invent missing facts.
- Every major screen has loading, empty, error, stale, and offline states.
- Mobile UI feels native and fast.
- Desktop UI supports strategy meetings.


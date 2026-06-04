import { defineConfig, loadEnv, type Plugin } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

type ServerReq = { url?: string; method?: string; headers?: Record<string, string | string[] | undefined>; on: (event: string, callback: (chunk?: Buffer) => void) => void };
type ServerRes = { statusCode: number; setHeader: (key: string, value: string) => void; end: (body: string) => void };

function configured(value: string | undefined) {
  return Boolean(value && value.trim());
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

async function readJsonBody(req: ServerReq) {
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve) => {
    req.on('data', (chunk?: Buffer) => {
      if (chunk) chunks.push(chunk);
    });
    req.on('end', () => resolve());
  });
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function integrationRows(env: Record<string, string>) {
  return [
    { key: 'ROBOTEVENTS_API_TOKEN', feature: 'Live events, teams, and matches', configured: configured(env.ROBOTEVENTS_API_TOKEN) || configured(env.ROBOT_EVENTS_API_TOKEN) },
    { key: 'ROBOT_EVENTS_API_TOKEN', feature: 'RobotEvents token alias', configured: configured(env.ROBOT_EVENTS_API_TOKEN) || configured(env.ROBOTEVENTS_API_TOKEN) },
    { key: 'ROBOTEVENTS_BASE_URL', feature: 'RobotEvents API base URL override', configured: configured(env.ROBOTEVENTS_BASE_URL) },
    { key: 'ROBOTEVENTS_CACHE_TTL_SECONDS', feature: 'RobotEvents cache freshness', configured: configured(env.ROBOTEVENTS_CACHE_TTL_SECONDS) },
    { key: 'GROQ_API_KEY', feature: 'Fast AI coach', configured: configured(env.GROQ_API_KEY) },
    { key: 'DEEPSEEK_API_KEY', feature: 'Code and reasoning reviewer', configured: configured(env.DEEPSEEK_API_KEY) },
    { key: 'HUGGINGFACE_API_KEY', feature: 'Open-model second opinion', configured: configured(env.HUGGINGFACE_API_KEY) },
    { key: 'OPENROUTER_API_KEY', feature: 'Model-router strategy reviewer', configured: configured(env.OPENROUTER_API_KEY) },
    { key: 'OPENAI_API_KEY', feature: 'Optional OpenAI reviewer when configured', configured: configured(env.OPENAI_API_KEY) },
    { key: 'GEMINI_API_KEY', feature: 'Optional Gemini reviewer when configured', configured: configured(env.GEMINI_API_KEY) },
    { key: 'NEWS_API_KEY', feature: 'Sponsor and robotics news signals', configured: configured(env.NEWS_API_KEY) },
    { key: 'MARKETAUX_API_KEY', feature: 'Market/news signals for sponsor research', configured: configured(env.MARKETAUX_API_KEY) },
    { key: 'FINNHUB_API_KEY', feature: 'Sponsor ticker research', configured: configured(env.FINNHUB_API_KEY) },
    { key: 'ALPHA_VANTAGE_API_KEY', feature: 'Sponsor ticker research', configured: configured(env.ALPHA_VANTAGE_API_KEY) },
    { key: 'FMP_API_KEY', feature: 'Sponsor financial profile research', configured: configured(env.FMP_API_KEY) },
    { key: 'EOD_API_KEY', feature: 'Sponsor market data research', configured: configured(env.EOD_API_KEY) },
    { key: 'FRED_API_KEY', feature: 'Regional economic context for grants', configured: configured(env.FRED_API_KEY) },
    { key: 'VITE_GOOGLE_CLIENT_ID', feature: 'Browser Google identity bootstrap', configured: configured(env.VITE_GOOGLE_CLIENT_ID) || configured(env.GOOGLE_CLIENT_ID) },
    { key: 'GOOGLE_CLIENT_ID', feature: 'Server-side Google integration', configured: configured(env.GOOGLE_CLIENT_ID) || configured(env.VITE_GOOGLE_CLIENT_ID) },
    { key: 'GOOGLE_CLIENT_SECRET', feature: 'Server-side Google integration', configured: configured(env.GOOGLE_CLIENT_SECRET) },
    { key: 'GOOGLE_REDIRECT_URI', feature: 'Google OAuth callback', configured: configured(env.GOOGLE_REDIRECT_URI) },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', feature: 'Server-side database admin integration', configured: configured(env.SUPABASE_SERVICE_ROLE_KEY) },
    { key: 'VITE_SUPABASE_URL', feature: 'Browser Supabase client', configured: configured(env.VITE_SUPABASE_URL) },
    { key: 'VITE_SUPABASE_ANON_KEY', feature: 'Browser Supabase client', configured: configured(env.VITE_SUPABASE_ANON_KEY) },
    { key: 'DATABASE_URL', feature: 'Server persistence', configured: configured(env.DATABASE_URL) },
    { key: 'RESEND_API_KEY', feature: 'Teammate invite email delivery', configured: configured(env.RESEND_API_KEY) },
    { key: 'SENDGRID_API_KEY', feature: 'Teammate invite email delivery', configured: configured(env.SENDGRID_API_KEY) },
    { key: 'POSTMARK_API_TOKEN', feature: 'Teammate invite email delivery', configured: configured(env.POSTMARK_API_TOKEN) },
    { key: 'INVITE_FROM_EMAIL', feature: 'Verified invite sender email', configured: configured(env.INVITE_FROM_EMAIL) },
    { key: 'VITE_APP_URL', feature: 'Invite link and mobile deep link base', configured: configured(env.VITE_APP_URL) },
    { key: 'STORAGE_BUCKET', feature: 'Robot code and CAD storage', configured: configured(env.STORAGE_BUCKET) || configured(env.UPLOAD_BUCKET) },
    { key: 'UPLOAD_BUCKET', feature: 'Robot media upload storage', configured: configured(env.UPLOAD_BUCKET) || configured(env.STORAGE_BUCKET) },
  ];
}

type ChatContent = string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: ChatContent };

const DEFAULT_SYSTEM =
  'You are RoboLab AI, the built-in competition copilot for a VEX V5/V5RC platform. Give concise, practical, safety-aware advice tailored to RoboLab features: live team lookup, tournament history, scouting, alliance selection, VEXcode review, CAD checks, autonomous path planning, and robot troubleshooting. Format the response with short headings and bullets, not markdown tables.';

async function callOpenAiCompatible(args: { provider: string; url: string; key?: string; model?: string; prompt?: string; messages?: ChatMessage[]; extraHeaders?: Record<string, string>; temperature?: number; maxTokens?: number }) {
  if (!configured(args.key)) return { provider: args.provider, model: args.model, status: 'missing_key' as const };
  const messages: ChatMessage[] = args.messages ?? [
    { role: 'system', content: DEFAULT_SYSTEM },
    { role: 'user', content: args.prompt ?? '' },
  ];
  const response = await fetch(args.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${args.key}`,
      ...args.extraHeaders,
    },
    body: JSON.stringify({
      model: args.model,
      messages,
      temperature: args.temperature ?? 0.2,
      max_tokens: args.maxTokens ?? 550,
    }),
  });
  const json = record(await response.json().catch(() => ({})));
  const error = record(json.error);
  if (!response.ok) throw new Error(String(error.message ?? `${args.provider} returned ${response.status}`));
  const choices = Array.isArray(json.choices) ? json.choices : [];
  const firstChoice = record(choices[0]);
  const message = record(firstChoice.message);
  return {
    provider: args.provider,
    model: args.model,
    status: 'ok' as const,
    content: String(message.content ?? '').trim(),
  };
}

async function callHuggingFace(env: Record<string, string>, prompt: string) {
  if (!configured(env.HUGGINGFACE_API_KEY)) return { provider: 'HuggingFace', model: env.HUGGINGFACE_MODEL, status: 'missing_key' as const };
  const model = env.HUGGINGFACE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';
  const response = await fetch(`https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: `RoboLab AI for VEX V5/V5RC. Give concise practical advice for scouting, code, CAD, autonomous, alliance selection, and tournament prep.\n\n${prompt}`,
      parameters: { max_new_tokens: 260, return_full_text: false },
    }),
  });
  const json: unknown = await response.json().catch(() => ({}));
  const jsonRecord = record(json);
  if (!response.ok) throw new Error(String(jsonRecord.error ?? `HuggingFace returned ${response.status}`));
  const content = Array.isArray(json) ? json.map((item) => record(item).generated_text).filter(Boolean).join('\n') : String(jsonRecord.generated_text ?? '');
  return { provider: 'HuggingFace', model, status: 'ok' as const, content: content.trim() };
}

function deterministicAdvice(task: string, context: string) {
  const lower = `${task} ${context}`.toLowerCase();
  const checks = [
    lower.includes('turn') || lower.includes('drift') ? 'Verify wheel diameter, track width, motor brake mode, and inertial calibration before changing turn constants.' : '',
    lower.includes('motor') || lower.includes('port') ? 'Check V5 Smart Port mappings, reversed flags, gear cartridge settings, and duplicate device declarations.' : '',
    lower.includes('auton') || lower.includes('autonomous') ? 'Add a repeatability checklist: battery level, starting jig, encoder reset, inertial calibration, and one motion primitive per test.' : '',
    lower.includes('scout') || lower.includes('match') ? 'Prioritize data users can act on: auton success, driver cycle speed, defense impact, endgame reliability, and failure modes.' : '',
    lower.includes('cad') || lower.includes('part') ? 'Use official VEX CAD downloads or the Onshape VEX V5 parts library for legal parts and dimensions.' : '',
  ].filter(Boolean);
  return checks.length ? checks.join(' ') : 'RoboLab AI needs a team, robot subsystem, code file, event, or scouting question. Start with the uploaded code, robot configuration, field objective, and observed failure; RoboLab will return an action checklist.';
}

async function fetchJsonSummary(source: string, key: string | undefined, url: string, summarize: (json: unknown) => string) {
  if (!configured(key)) return { source, status: 'missing_key' as const, summary: 'Key is not configured.' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`${source} returned ${response.status}`);
    return { source, status: 'ok' as const, summary: summarize(json).slice(0, 320) || 'Connected.' };
  } catch (error) {
    return { source, status: 'error' as const, summary: error instanceof Error ? error.message : 'Request failed.' };
  } finally {
    clearTimeout(timeout);
  }
}

type ForumSource = { title: string; url: string; blurb: string };

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Retrieve real VEX Forum threads (posts by actual people) to ground the AI coach.
// The forum itself is Cloudflare-protected, so we discover real thread links via a
// search engine (DuckDuckGo HTML), which is not blocked for server-side requests.
async function fetchVexForum(query: string): Promise<ForumSource[]> {
  const q = query.trim().slice(0, 200);
  if (!q) return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:vexforum.com ${q}`)}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) return [];
    const html = await response.text();

    const snippets: string[] = [];
    const snippetRe = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let sm: RegExpExecArray | null;
    while ((sm = snippetRe.exec(html))) snippets.push(stripHtml(sm[1]));

    const out: ForumSource[] = [];
    const anchorRe = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let am: RegExpExecArray | null;
    let index = 0;
    while ((am = anchorRe.exec(html)) && out.length < 5) {
      let href = am[1];
      const uddg = href.match(/[?&]uddg=([^&]+)/);
      if (uddg) href = decodeURIComponent(uddg[1]);
      const ordinal = index++;
      if (!/vexforum\.com\/t\//.test(href)) continue;
      const title = stripHtml(am[2]);
      if (!title) continue;
      out.push({ title, url: href.split(/[?#]/)[0], blurb: snippets[ordinal] ?? '' });
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

const COACH_SYSTEM = `You are RoboLab AI Coach — a warm, encouraging, and extremely knowledgeable VEX Robotics mentor built into the RoboLab mobile app. You help students (often middle/high schoolers) and coaches. Be compassionate, supportive, and confidence-building. Never condescend. Celebrate effort, reduce stress, and make hard things feel doable.

== HOW VEX EVENTS WORK (use this to be scenario-smart) ==
Programs: V5RC (V5 Robotics Competition, high school + middle school), VIQRC (VEX IQ, elementary/middle, plastic), VEX U (university), VEX AI.
Event day flow:
1) Check-in + inspection: robots must pass sizing (V5RC starts within 18"x18"x18") and hardware/rules inspection before they can compete.
2) Practice matches (optional), then Qualification matches.
3) Qualification matches: in V5RC, two alliances (Red vs Blue), each with 2 randomly-assigned teams. You play WITH a random partner and AGAINST 2 opponents. Each match has a 15s Autonomous period then Driver Control. Winning auton earns the Autonomous Win Point.
4) Rankings use Win Points (WP), Autonomous Points (AP), and Strength of Schedule (SP) — WP first, then AP, then SP. (VIQRC is cooperative: two teams work TOGETHER for a combined score, ranked by average.)
5) Alliance selection: top-ranked teams become alliance captains and pick partners to form elimination alliances.
6) Elimination bracket: alliances play best-of or single matches to a final.
7) Robot Skills Challenge (separate ranking): Driver Skills (60s) + Autonomous/Programming Skills (60s); combined score qualifies teams to championships.
Qualification path: performing well / winning awards (e.g., Excellence, Tournament Champion) or skills ranking can qualify a team to regional/state/provincial championships and ultimately the VEX Robotics World Championship.

== SCENARIO AWARENESS (very important) ==
The user message is usually about a real situation at a tournament. You may be given platform context: the team number, program, season, robot status, recent scouting notes, watchlist, and — critically — the team's NEXT MATCH (field + match number + time).
- If a next match is provided and is soon, ALWAYS acknowledge it kindly and tie urgency to it. Example: "Since you're up soon at Field 2, Match 3, here's the fastest fix first…" then give the quick fix before deeper improvements.
- Tailor advice to time pressure: triage what can be fixed in minutes vs. after the event.

== IMAGES / VIDEO ==
You may receive photos or video frames of a robot/chassis/mechanism/field. Analyze them carefully:
- Describe what you actually see (drivetrain type, motor/wire routing, structure, obvious issues like loose standoffs, chain tension, missing screws, frame racking, wheel alignment).
- Only state what is visible; if unsure, say what to check rather than guessing. Never invent part SKUs or measurements.

== GROUNDING ==
- You may be given excerpts from REAL VEX Forum threads (posts by actual people). When relevant, base your answer on them and cite inline like [1], [2] matching the numbered sources.
- You may also be given MULTIPLE expert AI drafts; reconcile them, keep what's correct, and drop anything contradictory or unverifiable.
- Never invent forum links, rankings, awards, or match results. If unsure, say so honestly.

== RESPONSE FORMAT (Markdown, mobile-first, beautiful) ==
- Start with one warm, direct sentence answering the question.
- Use "## " section headings and "- " bullet lists. Use **bold** for key terms and \`inline code\` for code/ports/commands.
- For fixes, give an ordered, prioritized list (fastest/most-likely first) and a short "why it works".
- Keep it scannable on a phone. Avoid tables.
- End with a line exactly like: "Confidence: High|Medium|Low — <one short reason>".`;

function platformApi(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '');
  const token = env.ROBOTEVENTS_API_TOKEN || env.ROBOT_EVENTS_API_TOKEN;
  const robotEventsBaseUrl = (env.ROBOTEVENTS_BASE_URL || 'https://events.vex.com/api/v2').replace(/\/+$/, '');
  const robotEventsCacheTtlMs = Math.max(5, Number(env.ROBOTEVENTS_CACHE_TTL_SECONDS || 30) || 30) * 1000;
  const cache = new Map<string, { at: number; body: string; status: number; contentType: string }>();
  const googleSessions = new Map<string, { email: string; name: string; avatarUrl: string; lastSeenAt: string }>();

  async function mockRouteHandler(req: ServerReq, res: ServerRes) {
    if (!req.url?.startsWith('/api/')) return false;
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    const postRoutes = [
      '/api/scouting/notes',
      '/api/compare',
      '/api/alliance/recommend',
      '/api/matches/predict',
      '/api/picklist/update',
      '/api/messages/conversations',
      '/api/messages/ai/summarize',
      '/api/messages/ai/strategy',
      '/api/messages/ai/picklist',
      '/api/messages/mark-read',
      '/api/invites/send',
      '/api/predictions/feedback',
      '/api/robot-lab/analyze',
      '/api/robot-lab/parts/confirm',
    ];
    const isMessagesMutation = /^\/api\/messages\/[^/]+\/(reactions|pin)$/.test(path) || /^\/api\/messages\/conversations\/[^/]+\/messages$/.test(path);
    const isMessageItem = /^\/api\/messages\/[^/]+$/.test(path);
    const getRoutes = [
      '/api/events/search',
      '/api/messages/conversations',
    ];
    const isEventDetail = /^\/api\/events\/[^/]+(\/matches|\/rankings|\/skills)?$/.test(path);
    const isTournamentSearch = /^\/api\/tournaments(\/search)?$/.test(path);
    const isTeamDetail = /^\/api\/teams\/[^/]+$/.test(path);
    const isRobotLab = /^\/api\/robot-lab\/(parts-catalog|projects|status)$/.test(path);
    const isConversationDetail = /^\/api\/messages\/conversations\/[^/]+(\/messages)?$/.test(path);

    if (!(getRoutes.includes(path) || postRoutes.includes(path) || isEventDetail || isTournamentSearch || isTeamDetail || isRobotLab || isConversationDetail || isMessagesMutation || isMessageItem)) return false;

    const body = req.method === 'POST' || req.method === 'PATCH' ? await readJsonBody(req) : {};
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ok: true,
        data: {
          route: path,
          method: req.method,
          cached: true,
          received: body,
          message: 'RoboLab API stub. RobotEvents and AI provider secrets remain server-side.',
        },
      }),
    );
    return true;
  }

  async function robotEventsHandler(req: ServerReq, res: ServerRes) {
    if (!req.url?.startsWith('/api/robotevents')) return false;

    res.setHeader('Content-Type', 'application/json');

    if (!token) {
      res.statusCode = 503;
      res.end(JSON.stringify({ ok: false, error: { code: 'missing_token', message: 'ROBOTEVENTS_API_TOKEN or ROBOT_EVENTS_API_TOKEN is not set on the server.' } }));
      return true;
    }

    const incoming = new URL(req.url, 'http://localhost');
    const apiPath = incoming.pathname.replace(/^\/api\/robotevents/, '') || '/events';
    const target = `${robotEventsBaseUrl}${apiPath}${incoming.search}`;
    const cached = cache.get(target);

    if (cached && Date.now() - cached.at < robotEventsCacheTtlMs) {
      res.statusCode = cached.status;
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('X-RoboLab-Cache', 'hit');
      res.end(cached.body);
      return true;
    }

    try {
      const upstream = await fetch(target, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'RoboLab/0.1 live RobotEvents adapter',
        },
      });
      const contentType = upstream.headers.get('content-type') ?? 'application/json';
      const text = await upstream.text();

      if (!contentType.includes('application/json')) {
        res.statusCode = 502;
        res.end(
          JSON.stringify({
            ok: false,
            error: {
              code: 'non_json_upstream',
              message: 'RobotEvents did not return JSON for this request.',
              details: { status: upstream.status },
            },
          }),
        );
        return true;
      }

      cache.set(target, { at: Date.now(), body: text, status: upstream.status, contentType });
      res.statusCode = upstream.status;
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-RoboLab-Cache', 'miss');
      res.end(text);
    } catch (error) {
      res.statusCode = 502;
      res.end(
        JSON.stringify({
          ok: false,
          error: {
            code: 'robotevents_fetch_failed',
            message: error instanceof Error ? error.message : 'RobotEvents request failed.',
          },
        }),
      );
    }

    return true;
  }

  async function googleAuthHandler(req: ServerReq, res: ServerRes) {
    if (!req.url?.startsWith('/api/auth/google/')) return false;
    const url = new URL(req.url, 'http://localhost');
    const clientId = env.GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID;
    const host = Array.isArray(req.headers?.host) ? req.headers?.host[0] : req.headers?.host;
    const redirectUri = env.GOOGLE_REDIRECT_URI || `http://${host || 'localhost:5173'}/api/auth/google/callback`;
    const clientSecretConfigured = configured(env.GOOGLE_CLIENT_SECRET);
    const configuredForStart = configured(clientId) && configured(redirectUri) && clientSecretConfigured;

    if (url.pathname === '/api/auth/google/session') {
      const cookieHeader = Array.isArray(req.headers?.cookie) ? req.headers?.cookie.join('; ') : req.headers?.cookie ?? '';
      const match = String(cookieHeader).match(/(?:^|;\s*)robolab_google_session=([^;]+)/);
      const session = match ? googleSessions.get(decodeURIComponent(match[1])) : null;
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, data: session ?? null }));
      return true;
    }

    if (url.pathname === '/api/auth/google/status') {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          ok: true,
          data: {
            configured: configuredForStart,
            clientIdConfigured: configured(clientId),
            clientSecretConfigured,
            redirectUriConfigured: configured(env.GOOGLE_REDIRECT_URI) || configured(host),
          },
        }),
      );
      return true;
    }

    if (url.pathname === '/api/auth/google/start') {
      if (!configuredForStart) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 503;
        res.end(JSON.stringify({ ok: false, error: { code: 'google_auth_not_configured', message: 'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI is missing on the server.' } }));
        return true;
      }

      const state = Buffer.from(
        JSON.stringify({
          email: url.searchParams.get('email') ?? '',
          at: Date.now(),
        }),
      ).toString('base64url');
      const target = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      target.searchParams.set('client_id', clientId);
      target.searchParams.set('redirect_uri', redirectUri);
      target.searchParams.set('response_type', 'code');
      target.searchParams.set('scope', 'openid email profile');
      target.searchParams.set('prompt', 'select_account');
      target.searchParams.set('state', state);

      res.statusCode = 302;
      res.setHeader('Location', target.toString());
      res.end('');
      return true;
    }

    if (url.pathname === '/api/auth/google/callback') {
      const code = url.searchParams.get('code');
      if (!code || !configured(clientId) || !clientSecretConfigured) {
        res.statusCode = 302;
        res.setHeader('Location', '/app/settings?google=error');
        res.end('');
        return true;
      }

      try {
        const tokenBody = new URLSearchParams({
          client_id: clientId,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        });
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: tokenBody,
        });
        const tokenJson = record(await tokenResponse.json().catch(() => ({})));
        const accessToken = String(tokenJson.access_token ?? '');
        if (!tokenResponse.ok || !accessToken) throw new Error(String(record(tokenJson.error).message ?? tokenJson.error_description ?? 'Google token exchange failed.'));

        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const profile = record(await profileResponse.json().catch(() => ({})));
        const email = String(profile.email ?? '').trim().toLowerCase();
        const name = String(profile.name ?? email.split('@')[0] ?? 'You').trim() || 'You';
        const avatarUrl = String(profile.picture ?? '').trim();
        if (!profileResponse.ok || !email) throw new Error('Google profile did not include a verified email.');

        const sessionId = `gs-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
        googleSessions.set(sessionId, { email, name, avatarUrl, lastSeenAt: new Date().toISOString() });
        res.statusCode = 302;
        res.setHeader('Set-Cookie', `robolab_google_session=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
        res.setHeader('Location', '/app/settings?google=connected');
        res.end('');
      } catch {
        res.statusCode = 302;
        res.setHeader('Location', '/app/settings?google=error');
        res.end('');
      }
      return true;
    }

    return false;
  }

  type Draft = { provider: string; model?: string; content: string };

  function textProviders(messages: ChatMessage[]) {
    return [
      () => callOpenAiCompatible({ provider: 'Groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: env.GROQ_API_KEY, model: env.GROQ_MODEL || 'llama-3.3-70b-versatile', messages, maxTokens: 850 }),
      () => callOpenAiCompatible({ provider: 'DeepSeek', url: 'https://api.deepseek.com/chat/completions', key: env.DEEPSEEK_API_KEY, model: env.DEEPSEEK_MODEL || 'deepseek-chat', messages, maxTokens: 850 }),
      () => callOpenAiCompatible({
        provider: 'OpenRouter',
        url: 'https://openrouter.ai/api/v1/chat/completions',
        key: env.OPENROUTER_API_KEY,
        model: env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
        messages,
        maxTokens: 850,
        extraHeaders: { 'HTTP-Referer': env.OPENROUTER_REFERER || 'http://localhost:5173', 'X-Title': 'RoboLab VEX Platform' },
      }),
      () => callOpenAiCompatible({ provider: 'OpenAI', url: 'https://api.openai.com/v1/chat/completions', key: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-4o-mini', messages, maxTokens: 850 }),
    ];
  }

  function visionProviders(messages: ChatMessage[]) {
    return [
      () => callOpenAiCompatible({ provider: 'OpenAI', url: 'https://api.openai.com/v1/chat/completions', key: env.OPENAI_API_KEY, model: env.OPENAI_VISION_MODEL || env.OPENAI_MODEL || 'gpt-4o-mini', messages, maxTokens: 900 }),
      () => callOpenAiCompatible({
        provider: 'OpenRouter',
        url: 'https://openrouter.ai/api/v1/chat/completions',
        key: env.OPENROUTER_API_KEY,
        model: env.OPENROUTER_VISION_MODEL || 'openai/gpt-4o-mini',
        messages,
        maxTokens: 900,
        extraHeaders: { 'HTTP-Referer': env.OPENROUTER_REFERER || 'http://localhost:5173', 'X-Title': 'RoboLab VEX Platform' },
      }),
      () => callOpenAiCompatible({ provider: 'Groq Vision', url: 'https://api.groq.com/openai/v1/chat/completions', key: env.GROQ_API_KEY, model: env.GROQ_VISION_MODEL || 'llama-3.2-90b-vision-preview', messages, maxTokens: 900 }),
    ];
  }

  async function collectDrafts(providers: Array<() => Promise<Awaited<ReturnType<typeof callOpenAiCompatible>>>>): Promise<Draft[]> {
    const settled = await Promise.allSettled(providers.map((provider) => provider()));
    return settled.flatMap((result) =>
      result.status === 'fulfilled' && result.value.status === 'ok' && 'content' in result.value && result.value.content
        ? [{ provider: result.value.provider, model: result.value.model, content: result.value.content }]
        : [],
    );
  }

  async function coachHandler(req: ServerReq, res: ServerRes) {
    if (!req.url?.startsWith('/api/ai/coach')) return false;
    res.setHeader('Content-Type', 'application/json');
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ ok: false, error: { code: 'method_not_allowed', message: 'Use POST.' } }));
      return true;
    }

    const body = await readJsonBody(req);
    const rawHistory = Array.isArray(body.messages) ? (body.messages as Array<Record<string, unknown>>) : [];
    const history: ChatMessage[] = rawHistory
      .map((item) => ({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: typeof item.content === 'string' ? item.content.slice(0, 4000) : '',
      }) as ChatMessage)
      .filter((item) => typeof item.content === 'string' && item.content)
      .slice(-8);
    const promptText = typeof body.prompt === 'string' ? body.prompt : '';
    const lastUserText = (() => {
      const found = [...history].reverse().find((item) => item.role === 'user');
      return typeof found?.content === 'string' ? found.content : promptText;
    })();
    const context = typeof body.context === 'string' ? body.context : '';
    const images = Array.isArray(body.images)
      ? (body.images as unknown[]).filter((value): value is string => typeof value === 'string' && value.startsWith('data:')).slice(0, 6)
      : [];
    const visionMode = images.length > 0;

    const sources = await fetchVexForum(lastUserText);
    const forumBlock = sources.length
      ? `Real VEX Forum threads to ground your answer (cite as [1], [2], ...):\n${sources
          .map((source, index) => `[${index + 1}] ${source.title}\n${source.blurb}\n${source.url}`)
          .join('\n\n')}`
      : 'No VEX Forum threads were retrieved for this question. Use general VEX expertise and say the guidance is general, not cited.';

    const groundingSystem: ChatMessage = { role: 'system', content: `${forumBlock}${context ? `\n\nLIVE PLATFORM CONTEXT (use it; acknowledge any upcoming match):\n${context.slice(0, 4000)}` : ''}` };
    const messages: ChatMessage[] = [{ role: 'system', content: COACH_SYSTEM }, groundingSystem, ...history];
    if (!history.length && promptText) messages.push({ role: 'user', content: promptText });

    // Attach images to the latest user turn for vision models.
    if (visionMode) {
      let attached = false;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          const text = typeof messages[i].content === 'string' ? (messages[i].content as string) : '';
          messages[i] = {
            role: 'user',
            content: [
              { type: 'text', text: text || 'Please analyze the attached photo(s)/video frames of my robot and tell me what to fix and why.' },
              ...images.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
            ],
          };
          attached = true;
          break;
        }
      }
      if (!attached) {
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: 'Please analyze the attached photo(s)/video frames of my robot and tell me what to fix and why.' },
            ...images.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
          ],
        });
      }
    }

    // Query EVERY available model in parallel, then synthesize a single best answer
    // (cross-checking the drafts) to reduce wrong answers.
    const drafts = await collectDrafts(visionMode ? visionProviders(messages) : textProviders(messages));

    let answer = '';
    let provider = '';
    const modelsUsed = drafts.map((draft) => draft.provider);

    if (drafts.length >= 2) {
      const synthMessages: ChatMessage[] = [
        { role: 'system', content: COACH_SYSTEM },
        groundingSystem,
        {
          role: 'user',
          content: `User question: ${lastUserText || '(see attached images)'}\n\nBelow are ${drafts.length} independent expert AI drafts answering this. Merge them into ONE best answer that follows the format rules exactly. Reconcile disagreements, keep only what is correct and verifiable, cite forum sources [n] when used, and acknowledge any upcoming match from the context.\n\n${drafts
            .map((draft, index) => `--- Draft ${index + 1} (${draft.provider}) ---\n${draft.content}`)
            .join('\n\n')}`,
        },
      ];
      for (const synth of textProviders(synthMessages)) {
        try {
          const result = await synth();
          if (result.status === 'ok' && 'content' in result && result.content) {
            answer = result.content;
            provider = `${result.provider} · cross-checked ${drafts.length} models`;
            break;
          }
        } catch {
          // try next synthesizer
        }
      }
    }

    if (!answer && drafts.length) {
      answer = drafts[0].content;
      provider = drafts[0].provider;
    }

    if (!answer) {
      try {
        const hf = await callHuggingFace(env, `${lastUserText}\n\n${forumBlock}`);
        if (hf.status === 'ok' && hf.content) {
          answer = hf.content;
          provider = hf.provider;
          modelsUsed.push('HuggingFace');
        }
      } catch {
        // ignore
      }
    }

    if (!answer) {
      const related = sources.length ? `\n\n## Related VEX Forum threads\n${sources.map((source) => `- ${source.title} — ${source.url}`).join('\n')}` : '';
      answer = `I could not reach an AI model right now, but here is a solid checklist while you retry.\n\n${deterministicAdvice(lastUserText, context)}${related}\n\nConfidence: Low — no AI provider responded, so this is RoboLab's offline checklist.`;
      provider = 'RoboLab offline';
    }

    const confidence = sources.length >= 2 || drafts.length >= 3 ? 'High' : sources.length >= 1 || drafts.length >= 2 ? 'Medium' : 'Low';
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ok: true,
        data: {
          answer,
          provider: provider || 'unknown',
          model: null,
          confidence,
          sources,
          models: modelsUsed,
          hasVision: visionMode,
          dataSources: [
            sources.length ? 'Live VEX Forum retrieval' : 'General VEX expertise',
            modelsUsed.length > 1 ? `${modelsUsed.length}-model cross-check` : 'Single model',
            visionMode ? 'Image/video analysis' : 'Text reasoning',
          ],
        },
      }),
    );
    return true;
  }

  async function aiHandler(req: ServerReq, res: ServerRes) {
    if (!req.url?.startsWith('/api/ai/vex-advice')) return false;

    res.setHeader('Content-Type', 'application/json');
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ ok: false, error: { code: 'method_not_allowed', message: 'Use POST.' } }));
      return true;
    }

    const body = await readJsonBody(req);
    const task = typeof body.task === 'string' ? body.task : 'VEX advice';
    const context = typeof body.context === 'string' ? body.context : '';
    const prompt = `Task: ${task}\n\nContext:\n${context.slice(0, 9000)}`;
    const providers = [
      () => callOpenAiCompatible({ provider: 'Groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: env.GROQ_API_KEY, model: env.GROQ_MODEL || 'llama-3.3-70b-versatile', prompt }),
      () => callOpenAiCompatible({ provider: 'DeepSeek', url: 'https://api.deepseek.com/chat/completions', key: env.DEEPSEEK_API_KEY, model: env.DEEPSEEK_MODEL || 'deepseek-chat', prompt }),
      () => callOpenAiCompatible({
        provider: 'OpenRouter',
        url: 'https://openrouter.ai/api/v1/chat/completions',
        key: env.OPENROUTER_API_KEY,
        model: env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
        prompt,
        extraHeaders: { 'HTTP-Referer': env.OPENROUTER_REFERER || 'http://localhost:5173', 'X-Title': 'RoboLab VEX Platform' },
      }),
      () => callOpenAiCompatible({ provider: 'OpenAI', url: 'https://api.openai.com/v1/chat/completions', key: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-4o-mini', prompt }),
      () => callHuggingFace(env, prompt),
    ];

    const settled = await Promise.allSettled(providers.map((provider) => provider()));
    const results = settled.map((result, index) =>
      result.status === 'fulfilled'
        ? result.value
        : { provider: ['Groq', 'DeepSeek', 'OpenRouter', 'OpenAI', 'HuggingFace'][index], status: 'error' as const, error: result.reason instanceof Error ? result.reason.message : 'AI request failed' },
    );
    const successful = results
      .map((result) => ('content' in result && result.status === 'ok' && result.content ? { provider: result.provider, content: result.content } : null))
      .filter((result): result is { provider: string; content: string } => Boolean(result));
    const summary = successful.length
      ? successful.map((result) => `${result.provider}: ${result.content}`).join('\n\n').slice(0, 5000)
      : deterministicAdvice(task, context);

    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, data: { task, summary, providers: results } }));
    return true;
  }

  async function statusHandler(req: ServerReq, res: ServerRes) {
    if (!req.url?.startsWith('/api/integrations/status')) return false;
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, data: integrationRows(env) }));
    return true;
  }

  async function sponsorSignalsHandler(req: ServerReq, res: ServerRes) {
    if (!req.url?.startsWith('/api/signals/sponsors')) return false;
    res.setHeader('Content-Type', 'application/json');
    const symbol = 'PTC';
    const results = await Promise.all([
      fetchJsonSummary('NewsAPI', env.NEWS_API_KEY, `https://newsapi.org/v2/everything?q=${encodeURIComponent('VEX robotics STEM sponsorship')}&pageSize=3&sortBy=publishedAt&apiKey=${env.NEWS_API_KEY}`, (json) => {
        const articles = Array.isArray((json as { articles?: unknown[] }).articles) ? (json as { articles: Array<{ title?: string }> }).articles : [];
        return articles.map((article) => article.title).filter(Boolean).join(' | ');
      }),
      fetchJsonSummary('Marketaux', env.MARKETAUX_API_KEY, `https://api.marketaux.com/v1/news/all?search=${encodeURIComponent('robotics education')}&language=en&limit=3&api_token=${env.MARKETAUX_API_KEY}`, (json) => {
        const data = Array.isArray((json as { data?: unknown[] }).data) ? (json as { data: Array<{ title?: string }> }).data : [];
        return data.map((item) => item.title).filter(Boolean).join(' | ');
      }),
      fetchJsonSummary('Finnhub', env.FINNHUB_API_KEY, `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${env.FINNHUB_API_KEY}`, (json) => `PTC quote c=${(json as { c?: number }).c ?? 'n/a'} h=${(json as { h?: number }).h ?? 'n/a'}`),
      fetchJsonSummary('Alpha Vantage', env.ALPHA_VANTAGE_API_KEY, `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${env.ALPHA_VANTAGE_API_KEY}`, (json) => {
        const quote = (json as { 'Global Quote'?: Record<string, string> })['Global Quote'] ?? {};
        return `PTC price ${quote['05. price'] ?? 'n/a'} change ${quote['10. change percent'] ?? 'n/a'}`;
      }),
      fetchJsonSummary('FMP', env.FMP_API_KEY, `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${env.FMP_API_KEY}`, (json) => {
        const profile = Array.isArray(json) ? (json[0] as { companyName?: string; industry?: string; description?: string } | undefined) : undefined;
        return `${profile?.companyName ?? symbol}: ${profile?.industry ?? 'profile'} ${profile?.description ?? ''}`;
      }),
      fetchJsonSummary('EODHD', env.EOD_API_KEY, `https://eodhd.com/api/real-time/${symbol}.US?api_token=${env.EOD_API_KEY}&fmt=json`, (json) => `PTC close ${(json as { close?: number }).close ?? 'n/a'} volume ${(json as { volume?: number }).volume ?? 'n/a'}`),
      fetchJsonSummary('FRED', env.FRED_API_KEY, `https://api.stlouisfed.org/fred/series/observations?series_id=UNRATE&api_key=${env.FRED_API_KEY}&file_type=json&limit=1&sort_order=desc`, (json) => {
        const observations = (json as { observations?: Array<{ value?: string; date?: string }> }).observations ?? [];
        return `US macro context UNRATE ${observations[0]?.value ?? 'n/a'} on ${observations[0]?.date ?? 'latest'}`;
      }),
    ]);
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, data: results }));
    return true;
  }

  return {
    name: 'robolab-platform-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (await googleAuthHandler(req as ServerReq, res)) return;
        if (await mockRouteHandler(req as ServerReq, res)) return;
        if (await robotEventsHandler(req as ServerReq, res)) return;
        if (await coachHandler(req as ServerReq, res)) return;
        if (await aiHandler(req as ServerReq, res)) return;
        if (await statusHandler(req as ServerReq, res)) return;
        if (await sponsorSignalsHandler(req as ServerReq, res)) return;
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (await googleAuthHandler(req as ServerReq, res)) return;
        if (await mockRouteHandler(req as ServerReq, res)) return;
        if (await robotEventsHandler(req as ServerReq, res)) return;
        if (await coachHandler(req as ServerReq, res)) return;
        if (await aiHandler(req as ServerReq, res)) return;
        if (await statusHandler(req as ServerReq, res)) return;
        if (await sponsorSignalsHandler(req as ServerReq, res)) return;
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), platformApi(mode)],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    host: true,
  },
  // `npm start` runs `vite preview`, which also runs the API middleware
  // (configurePreviewServer) so /api/* works in production on Render.
  preview: {
    port: Number(process.env.PORT) || 4173,
    host: true,
    allowedHosts: true,
  },
}));

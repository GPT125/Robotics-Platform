import { defineConfig, loadEnv, type Plugin } from 'vite';

type ServerReq = { url?: string; method?: string; on: (event: string, callback: (chunk?: Buffer) => void) => void };
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
    ['ROBOTEVENTS_API_TOKEN', 'Live events, teams, and matches'],
    ['GROQ_API_KEY', 'Fast AI coach'],
    ['DEEPSEEK_API_KEY', 'Code and reasoning reviewer'],
    ['HUGGINGFACE_API_KEY', 'Open-model second opinion'],
    ['OPENROUTER_API_KEY', 'Model-router strategy reviewer'],
    ['OPENAI_API_KEY', 'Optional OpenAI reviewer when configured'],
    ['NEWS_API_KEY', 'Sponsor and robotics news signals'],
    ['MARKETAUX_API_KEY', 'Market/news signals for sponsor research'],
    ['FINNHUB_API_KEY', 'Sponsor ticker research'],
    ['ALPHA_VANTAGE_API_KEY', 'Sponsor ticker research'],
    ['FMP_API_KEY', 'Sponsor financial profile research'],
    ['EOD_API_KEY', 'Sponsor market data research'],
    ['FRED_API_KEY', 'Regional economic context for grants'],
    ['VITE_GOOGLE_CLIENT_ID', 'Future Google Drive import UI'],
    ['GOOGLE_CLIENT_ID', 'Server-side Google integration'],
    ['GOOGLE_CLIENT_SECRET', 'Server-side Google integration'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'Server-side database admin integration'],
    ['VITE_SUPABASE_URL', 'Browser Supabase client'],
    ['VITE_SUPABASE_ANON_KEY', 'Browser Supabase client'],
    ['DATABASE_URL', 'Server persistence'],
    ['STORAGE_BUCKET', 'Robot code and CAD storage'],
  ].map(([key, feature]) => ({ key, feature, configured: configured(env[key]) }));
}

async function callOpenAiCompatible(args: { provider: string; url: string; key?: string; model?: string; prompt: string; extraHeaders?: Record<string, string> }) {
  if (!configured(args.key)) return { provider: args.provider, model: args.model, status: 'missing_key' as const };
  const response = await fetch(args.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${args.key}`,
      ...args.extraHeaders,
    },
    body: JSON.stringify({
      model: args.model,
      messages: [
        {
          role: 'system',
          content:
            'You are RoboLab AI, the built-in competition copilot for a VEX V5/V5RC platform. Give concise, practical, safety-aware advice tailored to RoboLab features: live team lookup, tournament history, scouting, alliance selection, VEXcode review, CAD checks, autonomous path planning, and robot troubleshooting. Format the response with short headings and bullets, not markdown tables.',
        },
        { role: 'user', content: args.prompt },
      ],
      temperature: 0.2,
      max_tokens: 550,
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

function platformApi(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '');
  const token = env.ROBOTEVENTS_API_TOKEN;
  const cache = new Map<string, { at: number; body: string; status: number; contentType: string }>();

  async function mockRouteHandler(req: ServerReq, res: ServerRes) {
    if (!req.url?.startsWith('/api/')) return false;
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    const postRoutes = [
      '/api/scouting/notes',
      '/api/compare',
      '/api/alliance/recommend',
      '/api/matches/predict',
      '/api/ai/coach',
      '/api/picklist/update',
      '/api/messages/conversations',
      '/api/messages/ai/summarize',
      '/api/messages/ai/strategy',
      '/api/messages/ai/picklist',
      '/api/messages/mark-read',
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
      res.end(JSON.stringify({ ok: false, error: { code: 'missing_token', message: 'ROBOTEVENTS_API_TOKEN is not set on the server.' } }));
      return true;
    }

    const incoming = new URL(req.url, 'http://localhost');
    const apiPath = incoming.pathname.replace(/^\/api\/robotevents/, '') || '/events';
    const target = `https://events.vex.com/api/v2${apiPath}${incoming.search}`;
    const cached = cache.get(target);

    if (cached && Date.now() - cached.at < 30_000) {
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
        if (await mockRouteHandler(req as ServerReq, res)) return;
        if (await robotEventsHandler(req as ServerReq, res)) return;
        if (await aiHandler(req as ServerReq, res)) return;
        if (await statusHandler(req as ServerReq, res)) return;
        if (await sponsorSignalsHandler(req as ServerReq, res)) return;
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (await mockRouteHandler(req as ServerReq, res)) return;
        if (await robotEventsHandler(req as ServerReq, res)) return;
        if (await aiHandler(req as ServerReq, res)) return;
        if (await statusHandler(req as ServerReq, res)) return;
        if (await sponsorSignalsHandler(req as ServerReq, res)) return;
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [platformApi(mode)],
  server: {
    port: 5173,
  },
}));

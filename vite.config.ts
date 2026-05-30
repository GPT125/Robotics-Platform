import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

function robotEventsProxy(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '');
  const token = env.ROBOTEVENTS_API_TOKEN;
  const cache = new Map<string, { at: number; body: string; status: number; contentType: string }>();

  async function handler(req: { url?: string }, res: { statusCode: number; setHeader: (key: string, value: string) => void; end: (body: string) => void }) {
    if (!req.url?.startsWith('/api/robotevents')) return false;

    res.setHeader('Content-Type', 'application/json');

    if (!token) {
      res.statusCode = 503;
      res.end(JSON.stringify({ ok: false, error: { code: 'missing_token', message: 'ROBOTEVENTS_API_TOKEN is not set on the server.' } }));
      return true;
    }

    const incoming = new URL(req.url, 'http://localhost');
    const apiPath = incoming.pathname.replace(/^\/api\/robotevents/, '') || '/events';
    const target = `https://www.robotevents.com/api/v2${apiPath}${incoming.search}`;
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

  return {
    name: 'robolab-robotevents-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (await handler(req, res)) return;
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (await handler(req, res)) return;
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), robotEventsProxy(mode)],
  server: {
    port: 5173,
  },
}));

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const routes = {
  '/api/db/sync': './api/db/sync.js',
  '/api/admin/auth': './api/admin/auth.js',
  '/api/auth/member': './api/auth/dispatch.js',
  '/api/auth/send-otp': './api/auth/dispatch.js',
  '/api/auth/verify-otp': './api/auth/dispatch.js',
  '/api/kyc/upload': './api/kyc/upload.js',
  '/api/integrations/zex/connect': './api/integrations/zex/connect.js',
  '/api/integrations/zex/purchase': './api/integrations/zex/purchase.js',
  '/api/integrations/zex/process-pending': './api/integrations/zex/process-pending.js',
  '/api/integrations/zex/recover': './api/integrations/zex/recover.js',
  '/api/integrations/zex/health': './api/integrations/zex/health.js',
  '/api/integrations/zex/callback': './api/integrations/zex/callback.js',
  '/api/integrations/zex/status': './api/integrations/zex/status.js',
  '/api/integrations/zex/webhook': './api/integrations/zex/webhook.js'
};
function serverlessApiPlugin() {
  return { name: 'serverless-api-plugin', configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url, 'http://' + req.headers.host);
      if (!routes[url.pathname]) return next();
      res.status = code => { res.statusCode = code; return res; };
      res.json = body => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); return res; };
      res.send = body => { res.end(body); return res; };
      res.redirect = (code, location) => { res.statusCode = code; res.setHeader('Location', location); res.end(); };
      try {
        req.query = Object.fromEntries(url.searchParams);
        if (req.method === 'POST' && !url.pathname.endsWith('/webhook')) {
          let text = '';
          for await (const chunk of req) {
            text += chunk;
            if (Buffer.byteLength(text) > 10 * 1024 * 1024) return res.status(413).json({ ok: false, error: 'Request too large' });
          }
          req.body = text ? JSON.parse(text) : {};
        }
        const { default: handler } = await import(routes[url.pathname]);
        await handler(req, res);
      } catch {
        if (!res.writableEnded) res.status(500).json({ ok: false, error: 'Request failed' });
      }
    });
  } };
}
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return { plugins: [react(), serverlessApiPlugin()], envPrefix: 'VITE_' };
});

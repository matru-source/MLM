import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

function serverlessApiPlugin() {
  return {
    name: 'serverless-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        const executeHandler = async (handler) => {
          req.query = Object.fromEntries(url.searchParams.entries());

          res.status = function(code) {
            res.statusCode = code;
            return res;
          };
          res.json = function(data) {
            if (!res.headersSent) {
              res.setHeader('Content-Type', 'application/json');
            }
            res.end(JSON.stringify(data));
            return res;
          };

          if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            let bodyStr = '';
            req.on('data', chunk => { bodyStr += chunk; });
            req.on('end', async () => {
              try {
                req.body = bodyStr ? JSON.parse(bodyStr) : {};
              } catch (e) {
                req.body = {};
              }
              await handler(req, res);
            });
          } else {
            req.body = {};
            await handler(req, res);
          }
        };

        if (pathname.startsWith('/api/db/sync')) {
          try {
            const syncModule = await import('./api/db/sync.js');
            return await executeHandler(syncModule.default);
          } catch (err) {
            console.error('[Vite API] Error in /api/db/sync:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: err.message }));
            return;
          }
        }

        if (pathname.startsWith('/api/admin/auth')) {
          try {
            const authModule = await import('./api/admin/auth.js');
            return await executeHandler(authModule.default);
          } catch (err) {
            console.error('[Vite API] Error in /api/admin/auth:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: err.message }));
            return;
          }
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [react(), serverlessApiPlugin()],
    envPrefix: ['VITE_', 'DATABASE_']
  };
});

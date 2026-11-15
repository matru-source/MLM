export async function runRecovery(env, send = fetch) {
  if (!env.CRON_SECRET || env.CRON_SECRET.length < 32) throw new Error('Recovery secret missing');
  const headers = { Authorization: `Bearer ${env.CRON_SECRET}` };
  for (const name of ['recover', 'health']) {
    const response = await send(`https://cybernetworking.vercel.app/api/integrations/zex/${name}`, {
      // Cloudflare Workers permits manual redirect handling, not `error`.
      // A redirect has a non-2xx status, so the check below fails closed.
      headers, redirect: 'manual', signal: AbortSignal.timeout(65000)
    });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error(`Recovery ${name} request failed`);
    const result = await response.json();
    if (result.ok !== true || (name === 'health' && result.healthy !== true)) throw new Error(`Recovery ${name} check failed`);
  }
}

export default {
  async scheduled(_controller, env) { await runRecovery(env); }
};

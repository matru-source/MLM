import React, { useEffect, useState } from 'react';

export default function ZexHealthPanel() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  async function refresh() {
    try {
      const response = await fetch('/api/integrations/zex/health');
      const data = await response.json();
      if (typeof data.healthy !== 'boolean') throw new Error(data.error || 'Status unavailable');
      setStatus(data); setError('');
    } catch { setError('Could not load ZEX monitoring. Check the server and database.'); }
  }
  useEffect(() => { refresh(); const timer = setInterval(refresh, 30000); return () => clearInterval(timer); }, []);
  return <div className="admin-panel-card card-white">
    <h3>ZEX notification health</h3>
    {error && <p role="alert">{error}</p>}
    {!status && !error && <p>Loading…</p>}
    {status && <>
      <p role="status"><strong>{status.healthy ? 'Healthy' : 'Attention required'}</strong></p>
      <p>Pending: {status.pending} · Retrying: {status.failed} · Repeated failures: {status.repeatedly_failed}</p>
      <p>Last successful recovery: {status.last_success_at ? new Date(status.last_success_at).toLocaleString() : 'Not yet completed'}</p>
      <p>Oldest pending notification: {status.oldest_pending_at ? new Date(status.oldest_pending_at).toLocaleString() : 'None'}</p>
      <button className="btn btn-secondary btn-sm" onClick={refresh}>Refresh</button>
    </>}
  </div>;
}

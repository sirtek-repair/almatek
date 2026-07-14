export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Auth',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });

    if (url.pathname === '/debug') {
      return json({
        has_url: !!env.SUPABASE_URL,
        has_key: !!env.SUPABASE_SERVICE_KEY,
        url_start: env.SUPABASE_URL ? env.SUPABASE_URL.slice(0, 30) : null,
        key_start: env.SUPABASE_SERVICE_KEY ? env.SUPABASE_SERVICE_KEY.slice(0, 10) : null,
      });
    }

    if (!url.pathname.startsWith('/v0/')) {
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    }

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
      return json({
        error: 'Supabase not configured',
        missing: [
          !env.SUPABASE_URL ? 'SUPABASE_URL' : null,
          !env.SUPABASE_SERVICE_KEY ? 'SUPABASE_SERVICE_KEY' : null,
        ].filter(Boolean),
      }, 503);
    }

    const SB = env.SUPABASE_URL.replace(/\/$/, '');
    const SK = env.SUPABASE_SERVICE_KEY;
    const BASE_H = {
      'Authorization': `Bearer ${SK}`,
      'apikey': SK,
      'Content-Type': 'application/json',
    };

    // Low-level Supabase REST helper
    const sb = async (path, opts = {}) => {
      const headers = { ...BASE_H, ...(opts.headers || {}) };
      const resp = await fetch(`${SB}/rest/v1/${path}`, { ...opts, headers });
      const text = await resp.text();
      let data;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      return { ok: resp.ok, status: resp.status, data };
    };

    const pathRest = url.pathname.slice('/v0/'.length); // e.g. "appXXX/tblXXX" or "meta/..."

    // ── No-op for Airtable metadata API (ReviewAskr table/field creation) ──
    // These calls auto-create the table in Airtable; in Supabase it pre-exists.
    if (pathRest.startsWith('meta/')) {
      if (request.method === 'POST') {
        // Return a fake response that lets the app store 'review_askr' as AT_REVIEW_TBL
        return json({ id: 'review_askr', name: 'ReviewAskr', fields: [] });
      }
      return json({ tables: [] });
    }

    // Path format: {base}/{tableId}[/{recordId}]
    const parts = pathRest.split('/');
    const tableId = parts[1];
    const recordId = parts[2];

    // Map Airtable table IDs → Supabase table names
    const TABLE_MAP = {
      'tblGqxylJqQjAgJ40': 'inventory',
      'tbli8pFcvU1mV5O6B': 'orders',
      'tblTw2ZVlJABAkJoo': 'sold',
      'tblFoAyBRZ0KLuYQl': 'removed',
      'tblDmh7FfklhbHI2s': 'leads',
      'tblrKmv6arnS9HNp6': 'tickets',
      'review_askr': 'review_askr', // after meta-create, app uses this literal string
    };
    const table = TABLE_MAP[tableId] || 'review_askr'; // unknown tbl* → review_askr

    const method = request.method;
    const qs = url.searchParams;
    const limit = Math.min(parseInt(qs.get('pageSize') || '1000', 10), 2000);

    // ══════════════════════════════════════════════════════════════════════
    // INVENTORY (read-only from app; qty computed by inventory_current view)
    // ══════════════════════════════════════════════════════════════════════
    if (table === 'inventory') {
      if (method !== 'GET') return json({ error: 'Method not allowed' }, 405);

      // Airtable field ID → Supabase column (for response mapping)
      const FLD = {
        'fldWzYeFcqm0qnxD8': 'name',
        'fldZEvcZT2JnX5kwh': 'stock_status',
        'fldvwFFYSxAJlcFpp': 'qty',
        'fldxQhVZSYmXNK6CW': 'category',
        'fldB16jlPFHm11tfW': 'min_stock',
        'fldV0jSP3xJuinS8t': 'model',
      };
      const REV = Object.fromEntries(Object.entries(FLD).map(([k, v]) => [v, k]));

      // Read from the view so qty is auto-computed (mirrors Airtable formula fields)
      const { ok, data } = await sb(
        `inventory_current?select=id,name,stock_status,qty,category,min_stock,model&limit=${limit}`
      );
      if (!ok) return json({ error: data }, 500);

      return json({
        records: (data || []).map(r => ({
          id: r.id,
          fields: {
            [REV.name]:         r.name         || '',
            [REV.stock_status]: r.stock_status  || '',
            [REV.qty]:          r.qty           || 0,
            [REV.category]:     r.category      || '',
            [REV.min_stock]:    r.min_stock     || 0,
            [REV.model]:        r.model         || '',
          },
        })),
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // ORDERS
    // ══════════════════════════════════════════════════════════════════════
    if (table === 'orders') {
      // Supabase column → Airtable field ID (for GET response)
      const ORD_FLD = {
        item_name:     'fldF0TJARgHugOh83',
        qty:           'fldbKVKkNgZtShHwh',
        supplier:      'fldVq43gyw9HVLYNI',
        date_received: 'fldeHBNhXCrqAJrjp',
        status:        'fldwGKyfgOuue1eyE',
      };

      if (method === 'GET') {
        const { ok, data } = await sb(
          `orders?select=id,item_name,qty,supplier,date_received,status&limit=${limit}`
        );
        if (!ok) return json({ error: data }, 500);
        return json({
          records: (data || []).map(r => ({
            id: r.id,
            fields: {
              [ORD_FLD.item_name]:     r.item_name     || '',
              [ORD_FLD.qty]:           r.qty           || 0,
              [ORD_FLD.supplier]:      r.supplier      || '',
              [ORD_FLD.date_received]: r.date_received || '',
              [ORD_FLD.status]:        r.status        || '',
            },
          })),
        });
      }

      if (method === 'POST') {
        const body = await request.json();
        const f = body.fields || {};
        const row = {};
        if (f['Item'] && Array.isArray(f['Item']) && f['Item'][0]) row.item_id = f['Item'][0];
        if (f['QTY']           != null) row.qty           = Number(f['QTY']);
        if (f['date recieved'] != null) row.date_received = f['date recieved'];
        if (f['supplier']      != null) row.supplier      = f['supplier'];

        // Denormalize item name for display
        if (row.item_id) {
          const { data: inv } = await sb(
            `inventory?id=eq.${encodeURIComponent(row.item_id)}&select=name`
          );
          if (inv && inv[0]) row.item_name = inv[0].name || '';
        }

        const { ok, data } = await sb('orders', {
          method: 'POST',
          body: JSON.stringify(row),
          headers: { 'Prefer': 'return=representation' },
        });
        if (!ok) return json({ error: data }, 500);
        const r = Array.isArray(data) ? data[0] : data;
        return json({ id: r.id, fields: row });
      }

      if (method === 'PATCH' && recordId) {
        const body = await request.json();
        const f = body.fields || {};
        const row = {};

        // App uses field ID 'fldwGKyfgOuue1eyE' to set status
        const statusVal = f['fldwGKyfgOuue1eyE'] || f['status'];
        if (statusVal != null) row.status = statusVal;
        if (f['QTY']  != null) row.qty    = Number(f['QTY']);
        // qty is computed by inventory_current view; no manual update needed here

        const { ok, data } = await sb(`orders?id=eq.${recordId}`, {
          method: 'PATCH',
          body: JSON.stringify(row),
          headers: { 'Prefer': 'return=representation' },
        });
        if (!ok) return json({ error: data }, 500);
        const r = Array.isArray(data) ? data[0] : data;
        return json({ id: recordId, fields: r || row });
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // SOLD + REMOVED (write-only; both decrement inventory qty)
    // ══════════════════════════════════════════════════════════════════════
    if (table === 'sold' || table === 'removed') {
      if (method === 'POST') {
        const body = await request.json();
        const f = body.fields || {};
        const row = {};
        if (f['Item'] && Array.isArray(f['Item']) && f['Item'][0]) row.item_id = f['Item'][0];
        if (f['QTY']      != null) row.qty       = Number(f['QTY']);
        if (f['date sold']!= null) row[table === 'sold' ? 'date_sold' : 'date_removed'] = f['date sold'];

        const { ok, data } = await sb(table, {
          method: 'POST',
          body: JSON.stringify(row),
          headers: { 'Prefer': 'return=representation' },
        });
        if (!ok) return json({ error: data }, 500);
        // qty is computed by inventory_current view; no manual decrement needed
        const r = Array.isArray(data) ? data[0] : data;
        return json({ id: r.id, fields: row });
      }
      return json({ error: 'Method not allowed' }, 405);
    }

    // ══════════════════════════════════════════════════════════════════════
    // LEADS, TICKETS, REVIEW_ASKR — stored as JSONB
    // ══════════════════════════════════════════════════════════════════════
    if (table === 'leads' || table === 'tickets' || table === 'review_askr') {
      if (method === 'GET') {
        const { ok, data } = await sb(`${table}?select=id,fields&limit=${limit}`);
        if (!ok) return json({ error: data }, 500);
        return json({
          records: (data || []).map(r => ({ id: r.id, fields: r.fields || {} })),
        });
      }

      if (method === 'POST') {
        const body = await request.json();
        const { ok, data } = await sb(table, {
          method: 'POST',
          body: JSON.stringify({ fields: body.fields || {} }),
          headers: { 'Prefer': 'return=representation' },
        });
        if (!ok) return json({ error: data }, 500);
        const r = Array.isArray(data) ? data[0] : data;
        return json({ id: r.id, fields: r.fields || {} });
      }

      if (method === 'PATCH' && recordId) {
        const body = await request.json();
        const newFields = body.fields || {};

        // Merge with existing fields (Supabase doesn't do partial JSONB merge via REST)
        const { data: existing } = await sb(
          `${table}?id=eq.${recordId}&select=fields`
        );
        const merged = Object.assign(
          {},
          existing && existing[0] ? existing[0].fields : {},
          newFields
        );

        const { ok, data } = await sb(`${table}?id=eq.${recordId}`, {
          method: 'PATCH',
          body: JSON.stringify({ fields: merged }),
          headers: { 'Prefer': 'return=representation' },
        });
        if (!ok) return json({ error: data }, 500);
        const r = Array.isArray(data) ? data[0] : data;
        return json({ id: recordId, fields: (r && r.fields) || merged });
      }

      if (method === 'DELETE' && recordId) {
        await sb(`${table}?id=eq.${recordId}`, { method: 'DELETE' });
        return json({ deleted: true, id: recordId });
      }
    }

    return json({ error: 'Not found' }, 404);
  },
};

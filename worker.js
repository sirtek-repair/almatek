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

    if (url.pathname.startsWith('/v0/')) {
      if (!env.AIRTABLE_API_KEY) {
        return new Response(JSON.stringify({ error: 'AIRTABLE_API_KEY not configured' }), {
          status: 503,
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }
      const airtableUrl = 'https://api.airtable.com' + url.pathname + url.search;
      const reqHeaders = new Headers();
      reqHeaders.set('Authorization', 'Bearer ' + env.AIRTABLE_API_KEY);
      reqHeaders.set('Content-Type', 'application/json');
      const atResp = await fetch(new Request(airtableUrl, {
        method: request.method,
        headers: reqHeaders,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      }));
      const resp = new Response(atResp.body, { status: atResp.status, headers: atResp.headers });
      Object.entries(cors).forEach(([k, v]) => resp.headers.set(k, v));
      return resp;
    }

    return env.ASSETS.fetch(request);
  }
};

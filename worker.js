export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/v0/')) {
      if (!env.AIRTABLE_API_KEY) {
        return new Response(JSON.stringify({ error: 'AIRTABLE_API_KEY not configured' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const airtableUrl = 'https://api.airtable.com' + url.pathname + url.search;
      const headers = new Headers();
      headers.set('Authorization', 'Bearer ' + env.AIRTABLE_API_KEY);
      headers.set('Content-Type', 'application/json');
      return fetch(new Request(airtableUrl, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      }));
    }

    return env.ASSETS.fetch(request);
  }
};

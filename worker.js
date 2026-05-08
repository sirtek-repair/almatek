export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/v0/')) {
      const auth = request.headers.get('X-Auth') || '';
      if (!env.AUTH_PASS || auth !== env.AUTH_PASS) {
        return new Response('Unauthorized', { status: 401 });
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

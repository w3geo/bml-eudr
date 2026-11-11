// Umami analytics, served from our own origin (see app/app.vue), so browsers never contact the
// Umami server. That server is behind Cloudflare (DigitalOcean App Platform), which would set its
// __cf_bm cookie, contradicting the privacy statement.
/** @type {Record<string, import('h3').HTTPMethod>} */
const routes = {
  'script.js': 'GET',
  'api/send': 'POST',
};

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const { scriptUrl } = config.public.umami;
  const path = getRouterParam(event, 'path') || '';
  if (!scriptUrl || !routes[path]) {
    throw createError({ statusCode: 404 });
  }
  assertMethod(event, routes[path]);

  // Only what Umami needs: no cookies (our session) and no other request details.
  /** @type {Record<string, string>} */
  const headers = {};
  for (const name of ['user-agent', 'accept-language', 'content-type', 'x-umami-cache']) {
    const value = getRequestHeader(event, name);
    if (value) {
      headers[name] = value;
    }
  }
  // Umami identifies visitors by IP address and user agent, and derives the country from the IP.
  // Cloudflare in front of Umami overwrites the usual IP headers, so the visitor's IP goes into a
  // header with a secret name, which Umami's CLIENT_IP_HEADER is set to.
  const ip = getClientIp(event);
  if (ip && config.umamiClientIpHeader) {
    headers[config.umamiClientIpHeader] = ip;
  }

  return sendProxy(event, new URL(path, scriptUrl).href, {
    fetchOptions: {
      method: routes[path],
      headers,
      body: routes[path] === 'POST' ? await readRawBody(event) : undefined,
    },
    onResponse: (event) => {
      event.node.res.removeHeader('set-cookie');
    },
  });
});

const https = require('https');
const http = require('http');

// Domaines autorisés — seuls ceux-là peuvent être proxifiés
const ALLOWED = [
  'fr.indeed.com',
  'es.indeed.com',
  'www.infojobs.net',
  'es.jobtome.com',
  'api.jobtome.com',
  'rss.jobs.ch',
];

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const targetUrl = event.queryStringParameters?.url;
  if (!targetUrl) {
    return { statusCode: 400, headers: corsHeaders, body: 'Paramètre url manquant' };
  }

  let parsed;
  try { parsed = new URL(targetUrl); }
  catch { return { statusCode: 400, headers: corsHeaders, body: 'URL invalide' }; }

  if (!ALLOWED.includes(parsed.hostname)) {
    return { statusCode: 403, headers: corsHeaders, body: `Domaine non autorisé : ${parsed.hostname}` };
  }

  try {
    const content = await fetchUrl(targetUrl);
    const isXml = content.trimStart().startsWith('<');
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': isXml ? 'text/xml; charset=utf-8' : 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=600', // cache 10 min
      },
      body: content,
    };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: err.message };
  }
};

function fetchUrl(targetUrl, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error('Trop de redirections'));

  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const lib = parsed.protocol === 'https:' ? https : http;

    const req = lib.get(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, text/html, */*',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8,es;q=0.7',
          'Accept-Encoding': 'identity',
        },
        timeout: 12000,
      },
      (res) => {
        // Gestion des redirections HTTP
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : `${parsed.origin}${res.headers.location}`;
          res.resume();
          fetchUrl(next, redirectCount + 1).then(resolve).catch(reject);
          return;
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        res.on('error', reject);
      }
    );

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout réseau')); });
  });
}

const https = require('https');
const http = require('http');

// Tous les feeds RSS à scraper — côté serveur, pas de CORS
const FEEDS = [
  // InfoJobs — 1er site d'emploi espagnol, province 8 = Barcelona, 7 = Baleares (Palma)
  { url: 'https://www.infojobs.net/rss/ofertas.xhtml?keyword=au-pair&province=8',       city: 'Barcelona',       source: 'InfoJobs' },
  { url: 'https://www.infojobs.net/rss/ofertas.xhtml?keyword=ni%C3%B1era&province=8',   city: 'Barcelona',       source: 'InfoJobs' },
  { url: 'https://www.infojobs.net/rss/ofertas.xhtml?keyword=canguro&province=8',        city: 'Barcelona',       source: 'InfoJobs' },
  { url: 'https://www.infojobs.net/rss/ofertas.xhtml?keyword=cuidadora&province=8',      city: 'Barcelona',       source: 'InfoJobs' },
  { url: 'https://www.infojobs.net/rss/ofertas.xhtml?keyword=au-pair&province=7',        city: 'Palma de Mallorca', source: 'InfoJobs' },
  { url: 'https://www.infojobs.net/rss/ofertas.xhtml?keyword=ni%C3%B1era&province=7',   city: 'Palma de Mallorca', source: 'InfoJobs' },
  { url: 'https://www.infojobs.net/rss/ofertas.xhtml?keyword=canguro&province=7',        city: 'Palma de Mallorca', source: 'InfoJobs' },
  // Indeed ES
  { url: 'https://es.indeed.com/rss?q=au+pair&l=Barcelona&sort=date',                   city: 'Barcelona',       source: 'Indeed ES' },
  { url: 'https://es.indeed.com/rss?q=ni%C3%B1era+interna&l=Barcelona&sort=date',       city: 'Barcelona',       source: 'Indeed ES' },
  { url: 'https://es.indeed.com/rss?q=canguro+bebe&l=Barcelona&sort=date',              city: 'Barcelona',       source: 'Indeed ES' },
  { url: 'https://es.indeed.com/rss?q=au+pair&l=Palma+de+Mallorca&sort=date',           city: 'Palma de Mallorca', source: 'Indeed ES' },
  { url: 'https://es.indeed.com/rss?q=ni%C3%B1era&l=Palma+de+Mallorca&sort=date',      city: 'Palma de Mallorca', source: 'Indeed ES' },
  // Jobtome ES — agrégateur espagnol
  { url: 'https://es.jobtome.com/rss.xml?q=au-pair&l=barcelona',                        city: 'Barcelona',       source: 'Jobtome' },
  { url: 'https://es.jobtome.com/rss.xml?q=ni%C3%B1era&l=barcelona',                   city: 'Barcelona',       source: 'Jobtome' },
  { url: 'https://es.jobtome.com/rss.xml?q=au-pair&l=palma-de-mallorca',                city: 'Palma de Mallorca', source: 'Jobtome' },
  { url: 'https://es.jobtome.com/rss.xml?q=ni%C3%B1era&l=palma',                       city: 'Palma de Mallorca', source: 'Jobtome' },
];

// Mots-clés qui indiquent une vraie offre au pair / garde d'enfant
const AU_PAIR_KW = ['au pair', 'niñera', 'nanny', 'canguro', 'cuidadora', 'babysitter', 'niños', 'interna', 'familia'];

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  const results = await Promise.allSettled(
    FEEDS.map(async ({ url, city, source }) => {
      try {
        const xml = await fetchUrl(url);
        return parseRSS(xml, city, source);
      } catch {
        return [];
      }
    })
  );

  const seen = new Set();
  const jobs = results
    .flatMap(r => r.status === 'fulfilled' ? r.value : [])
    .filter(j => {
      if (!j || !j.url || seen.has(j.url)) return false;
      seen.add(j.url);
      // Garder uniquement les offres pertinentes (rejeter les faux positifs)
      const text = (j.title + ' ' + j.desc).toLowerCase();
      return AU_PAIR_KW.some(k => text.includes(k));
    })
    .sort((a, b) => {
      // Trier par date décroissante
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

  return {
    statusCode: 200,
    headers: {
      ...cors,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=900', // cache 15 min
    },
    body: JSON.stringify(jobs),
  };
};

function parseRSS(xml, city, source) {
  if (!xml || xml.length < 100) return [];
  const jobs = [];
  // Extraire chaque <item>
  const itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const item = m[1];
    const get = (tag) => {
      // Gère CDATA et texte brut
      const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))<\/${tag}>`, 'i');
      const r = item.match(re);
      return r ? (r[1] !== undefined ? r[1] : r[2] || '').trim() : '';
    };
    const title = get('title');
    const link = (get('link') || get('guid') || '').trim();
    if (!title || !link) continue;
    const desc = get('description').replace(/<[^>]*>/g, '').trim().substring(0, 500);
    const company = get('author') || get('dc:creator') || get('source') || "Famille d'accueil";
    const location = get('location') || get('city') || city;
    const pubDate = get('pubDate') || get('dc:date') || '';
    const safeId = 'sc-' + Buffer.from(link).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    jobs.push({
      id: safeId,
      source: source === 'InfoJobs' ? 'infojobs' : source === 'Indeed ES' ? 'indeed_es' : 'jobtome',
      title,
      company,
      location,
      city,
      url: link,
      desc,
      date: pubDate,
      contract: 'Au Pair',
      _sourceCity: city,
    });
  }
  return jobs;
}

function fetchUrl(targetUrl, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, text/html, */*',
        'Accept-Language': 'es-ES,es;q=0.9,fr-FR;q=0.8,fr;q=0.7',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
      },
      timeout: 12000,
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : `${parsed.origin}${res.headers.location}`;
        res.resume();
        fetchUrl(next, redirectCount + 1).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

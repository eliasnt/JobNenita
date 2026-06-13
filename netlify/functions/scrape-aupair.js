const https = require('https');
const http = require('http');

// ── SOURCES RSS ────────────────────────────────────────────────────────────
const RSS_FEEDS = [
  // InfoJobs — 1er site emploi espagnol, province 8=Barcelona, 7=Baleares
  { url: 'https://www.infojobs.net/rss/ofertas.xhtml?keyword=au-pair&province=8',       city: 'Barcelona',         src: 'infojobs' },
  { url: 'https://www.infojobs.net/rss/ofertas.xhtml?keyword=ni%C3%B1era&province=8',   city: 'Barcelona',         src: 'infojobs' },
  { url: 'https://www.infojobs.net/rss/ofertas.xhtml?keyword=canguro&province=8',       city: 'Barcelona',         src: 'infojobs' },
  { url: 'https://www.infojobs.net/rss/ofertas.xhtml?keyword=cuidadora&province=8',     city: 'Barcelona',         src: 'infojobs' },
  { url: 'https://www.infojobs.net/rss/ofertas.xhtml?keyword=au-pair&province=7',       city: 'Palma de Mallorca', src: 'infojobs' },
  { url: 'https://www.infojobs.net/rss/ofertas.xhtml?keyword=ni%C3%B1era&province=7',   city: 'Palma de Mallorca', src: 'infojobs' },
  { url: 'https://www.infojobs.net/rss/ofertas.xhtml?keyword=canguro&province=7',       city: 'Palma de Mallorca', src: 'infojobs' },
  // Indeed ES
  { url: 'https://es.indeed.com/rss?q=au+pair&l=Barcelona&sort=date',                   city: 'Barcelona',         src: 'indeed_es' },
  { url: 'https://es.indeed.com/rss?q=ni%C3%B1era+interna&l=Barcelona&sort=date',       city: 'Barcelona',         src: 'indeed_es' },
  { url: 'https://es.indeed.com/rss?q=canguro+bebe&l=Barcelona&sort=date',              city: 'Barcelona',         src: 'indeed_es' },
  { url: 'https://es.indeed.com/rss?q=cuidadora+ni%C3%B1os&l=Barcelona&sort=date',      city: 'Barcelona',         src: 'indeed_es' },
  { url: 'https://es.indeed.com/rss?q=au+pair&l=Palma+de+Mallorca&sort=date',           city: 'Palma de Mallorca', src: 'indeed_es' },
  { url: 'https://es.indeed.com/rss?q=ni%C3%B1era&l=Palma+de+Mallorca&sort=date',      city: 'Palma de Mallorca', src: 'indeed_es' },
  { url: 'https://es.indeed.com/rss?q=canguro&l=Palma+de+Mallorca&sort=date',           city: 'Palma de Mallorca', src: 'indeed_es' },
  // Jobtome — agrégateur ES
  { url: 'https://es.jobtome.com/rss.xml?q=au-pair&l=barcelona',                        city: 'Barcelona',         src: 'jobtome' },
  { url: 'https://es.jobtome.com/rss.xml?q=ni%C3%B1era&l=barcelona',                   city: 'Barcelona',         src: 'jobtome' },
  { url: 'https://es.jobtome.com/rss.xml?q=canguro&l=barcelona',                        city: 'Barcelona',         src: 'jobtome' },
  { url: 'https://es.jobtome.com/rss.xml?q=au-pair&l=palma-de-mallorca',                city: 'Palma de Mallorca', src: 'jobtome' },
  { url: 'https://es.jobtome.com/rss.xml?q=ni%C3%B1era&l=palma',                       city: 'Palma de Mallorca', src: 'jobtome' },
  // Talent.com (ex-Neuvoo) — gros agrégateur mondial
  { url: 'https://es.talent.com/rss?what=au+pair&where=Barcelona&lang=es_ES',            city: 'Barcelona',         src: 'talent' },
  { url: 'https://es.talent.com/rss?what=ni%C3%B1era&where=Barcelona&lang=es_ES',        city: 'Barcelona',         src: 'talent' },
  { url: 'https://es.talent.com/rss?what=canguro&where=Barcelona&lang=es_ES',            city: 'Barcelona',         src: 'talent' },
  { url: 'https://es.talent.com/rss?what=au+pair&where=Palma+de+Mallorca&lang=es_ES',   city: 'Palma de Mallorca', src: 'talent' },
  { url: 'https://es.talent.com/rss?what=ni%C3%B1era&where=Palma+de+Mallorca&lang=es_ES', city: 'Palma de Mallorca', src: 'talent' },
  // JobisJob — agrégateur ES
  { url: 'https://www.jobisjob.es/search/jobs/rss.xml?q=au+pair&where=Barcelona',        city: 'Barcelona',         src: 'jobisjob' },
  { url: 'https://www.jobisjob.es/search/jobs/rss.xml?q=ni%C3%B1era&where=Barcelona',   city: 'Barcelona',         src: 'jobisjob' },
  { url: 'https://www.jobisjob.es/search/jobs/rss.xml?q=au+pair&where=Palma+Mallorca',  city: 'Palma de Mallorca', src: 'jobisjob' },
  // Trovit ES — méta-moteur emploi
  { url: 'https://empleos.trovit.es/index.php/cod.search_jobs_xml/what_d.au+pair/where_d.Barcelona', city: 'Barcelona', src: 'trovit' },
  { url: 'https://empleos.trovit.es/index.php/cod.search_jobs_xml/what_d.ni%C3%B1era/where_d.Barcelona', city: 'Barcelona', src: 'trovit' },
  { url: 'https://empleos.trovit.es/index.php/cod.search_jobs_xml/what_d.au+pair/where_d.Palma+Mallorca', city: 'Palma de Mallorca', src: 'trovit' },
];

// ── SOURCES HTML À SCRAPER ─────────────────────────────────────────────────
// Ces sites n'ont pas de RSS mais ont des offres réelles accessibles côté serveur
const HTML_SOURCES = [
  // Milanuncios — 1er site petites annonces ES, beaucoup d'offres au pair particuliers
  { url: 'https://www.milanuncios.com/ofertas-de-trabajo-en-barcelona/?q=au+pair',                city: 'Barcelona',         src: 'milanuncios', scraper: scrapeMilanuncios },
  { url: 'https://www.milanuncios.com/ofertas-de-trabajo-en-baleares/?q=au+pair',                 city: 'Palma de Mallorca', src: 'milanuncios', scraper: scrapeMilanuncios },
  { url: 'https://www.milanuncios.com/ofertas-de-trabajo-en-barcelona/?q=ni%C3%B1era',            city: 'Barcelona',         src: 'milanuncios', scraper: scrapeMilanuncios },
  { url: 'https://www.milanuncios.com/ofertas-de-trabajo-en-baleares/?q=ni%C3%B1era',             city: 'Palma de Mallorca', src: 'milanuncios', scraper: scrapeMilanuncios },
  // Cuidado.es — spécialisé famille/enfant, très pertinent
  { url: 'https://www.cuidado.es/trabajos/au-pair/barcelona/',                                    city: 'Barcelona',         src: 'cuidado', scraper: scrapeCuidado },
  { url: 'https://www.cuidado.es/trabajos/ninos/barcelona/',                                     city: 'Barcelona',         src: 'cuidado', scraper: scrapeCuidado },
  { url: 'https://www.cuidado.es/trabajos/au-pair/mallorca/',                                    city: 'Palma de Mallorca', src: 'cuidado', scraper: scrapeCuidado },
  { url: 'https://www.cuidado.es/trabajos/ninos/mallorca/',                                      city: 'Palma de Mallorca', src: 'cuidado', scraper: scrapeCuidado },
];

const AU_PAIR_KW = ['au pair', 'niñera', 'nanny', 'canguro', 'cuidadora', 'babysitter', 'niños', 'interna', 'familia', 'guardería'];
const SOURCE_LABELS = { infojobs: 'InfoJobs', indeed_es: 'Indeed ES', jobtome: 'Jobtome', talent: 'Talent.com', jobisjob: 'JobisJob', trovit: 'Trovit', milanuncios: 'Milanuncios', cuidado: 'Cuidado.es' };

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };

  // Lancer TOUS les scrapers en parallèle (RSS + HTML)
  const [rssResults, htmlResults] = await Promise.all([
    Promise.allSettled(RSS_FEEDS.map(async ({ url, city, src }) => {
      const xml = await fetchUrl(url);
      return parseRSS(xml, city, src);
    })),
    Promise.allSettled(HTML_SOURCES.map(async ({ url, city, src, scraper }) => {
      const html = await fetchUrl(url);
      return scraper(html, city, src);
    })),
  ]);

  const seen = new Set();
  const jobs = [...rssResults, ...htmlResults]
    .flatMap(r => r.status === 'fulfilled' ? (r.value || []) : [])
    .filter(j => {
      if (!j || !j.url || seen.has(j.url)) return false;
      seen.add(j.url);
      const text = (j.title + ' ' + j.desc).toLowerCase();
      return AU_PAIR_KW.some(k => text.includes(k));
    })
    .sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

  return {
    statusCode: 200,
    headers: {
      ...cors,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Netlify-CDN-Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
    body: JSON.stringify(jobs),
  };
};

// ── PARSEUR RSS ────────────────────────────────────────────────────────────
function parseRSS(xml, city, src) {
  if (!xml || xml.length < 100) return [];
  const jobs = [];
  const itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const get = (tag) => {
      const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))<\\/${tag}>`, 'i');
      const r = block.match(re);
      return r ? (r[1] !== undefined ? r[1] : r[2] || '').trim() : '';
    };
    const title = get('title');
    const link = (get('link') || get('guid') || '').trim();
    if (!title || !link) continue;
    const desc = get('description').replace(/<[^>]*>/g, '').trim().substring(0, 500);
    const company = get('author') || get('dc:creator') || get('source') || "Famille d'accueil";
    const location = get('location') || get('city') || city;
    const pubDate = get('pubDate') || get('dc:date') || '';
    jobs.push({
      id: 'sc-' + Buffer.from(link).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 22),
      source: src, title, company, location, city, url: link, desc, date: pubDate,
      contract: 'Au Pair', _sourceCity: city,
    });
  }
  return jobs;
}

// ── SCRAPER HTML : MILANUNCIOS ─────────────────────────────────────────────
// Milanuncios = petites annonces particuliers, beaucoup de vraies offres au pair
function scrapeMilanuncios(html, city, src) {
  if (!html || html.length < 500) return [];
  const jobs = [];

  // Pattern principal : <article> ou <div> avec data-adid et liens
  // Milanuncios encode les annonces dans des blocs avec class "ma-AdCard" ou "aditem"
  const blockRe = /data-adid="(\d+)"[\s\S]*?class="[^"]*(?:AdCard|aditem)[^"]*"([\s\S]*?)(?=data-adid="|$)/gi;
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    const adId = m[1];
    const block = m[2];
    // Extraire titre
    const titleM = block.match(/<(?:h2|h3)[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i)
                || block.match(/class="[^"]*title[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i)
                || block.match(/<a[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/a>/i);
    const title = titleM ? titleM[1].trim() : null;
    if (!title) continue;
    // Extraire URL
    const hrefM = block.match(/href="([^"]+milanuncios\.com[^"]+)"/i)
               || block.match(/href="(\/[^"]+)"/i);
    const href = hrefM ? hrefM[1] : null;
    const url = href ? (href.startsWith('http') ? href : 'https://www.milanuncios.com' + href) : null;
    if (!url) continue;
    // Extraire description
    const descM = block.match(/class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div|span)>/i);
    const desc = descM ? descM[1].replace(/<[^>]*>/g, '').trim().substring(0, 400) : '';
    // Extraire date
    const dateM = block.match(/class="[^"]*date[^"]*"[^>]*>([^<]+)<\/|<time[^>]*>([^<]+)<\/time>/i);
    const date = dateM ? (dateM[1] || dateM[2] || '').trim() : '';
    jobs.push({
      id: 'mil-' + adId,
      source: src, title, company: "Particulier", location: city, city,
      url, desc, date, contract: 'Au Pair', _sourceCity: city,
    });
  }

  // Fallback : pattern alternatif si structure différente
  if (jobs.length === 0) {
    const altRe = /<a[^>]+href="(https:\/\/www\.milanuncios\.com\/[^"]+)"[^>]*>\s*<(?:h2|h3|span)[^>]*class="[^"]*(?:titulo|title)[^"]*"[^>]*>([^<]{10,100})</gi;
    while ((m = altRe.exec(html)) !== null) {
      const url = m[1], title = m[2].trim();
      if (!title || jobs.some(j => j.url === url)) continue;
      jobs.push({
        id: 'mil-' + Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 18),
        source: src, title, company: 'Particulier', location: city, city,
        url, desc: '', date: '', contract: 'Au Pair', _sourceCity: city,
      });
    }
  }
  return jobs;
}

// ── SCRAPER HTML : CUIDADO.ES ──────────────────────────────────────────────
// Cuidado.es = site spécialisé gardes d'enfants en Espagne
function scrapeCuidado(html, city, src) {
  if (!html || html.length < 500) return [];
  const jobs = [];
  // Les annonces sont dans des cards avec liens /empleo/ ou /trabajo/
  const cardRe = /<(?:article|div)[^>]+class="[^"]*(?:job|anuncio|offer|card)[^"]*"[^>]*>([\s\S]*?)<\/(?:article|div)>/gi;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const block = m[1];
    const titleM = block.match(/<(?:h2|h3|h4|a)[^>]*>([^<]{8,120})<\/(?:h2|h3|h4|a)>/i);
    const title = titleM ? titleM[1].trim() : null;
    if (!title) continue;
    const hrefM = block.match(/href="([^"]+cuidado\.es[^"]+)"/i)
               || block.match(/href="(\/(?:empleo|trabajo|oferta)[^"]+)"/i);
    const href = hrefM ? hrefM[1] : null;
    const url = href ? (href.startsWith('http') ? href : 'https://www.cuidado.es' + href) : null;
    if (!url) continue;
    const descM = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const desc = descM ? descM[1].replace(/<[^>]*>/g, '').trim().substring(0, 400) : '';
    jobs.push({
      id: 'cui-' + Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20),
      source: src, title, company: "Famille / Particulier", location: city, city,
      url, desc, date: '', contract: 'Au Pair', _sourceCity: city,
    });
  }

  // Fallback : chercher directement des liens /oferta/ ou /empleo/
  if (jobs.length === 0) {
    const linkRe = /href="(https:\/\/www\.cuidado\.es\/(?:empleo|oferta|trabajo)\/[^"]+)"[^>]*>[\s\S]{0,20}?([^<]{10,100})</gi;
    while ((m = linkRe.exec(html)) !== null) {
      const url = m[1], title = m[2].trim();
      if (!title || jobs.some(j => j.url === url)) continue;
      jobs.push({
        id: 'cui-' + Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20),
        source: src, title, company: 'Famille / Particulier', location: city, city,
        url, desc: '', date: '', contract: 'Au Pair', _sourceCity: city,
      });
    }
  }
  return jobs;
}

// ── FETCH HTTP/HTTPS AVEC REDIRECTIONS ────────────────────────────────────
function fetchUrl(targetUrl, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,fr-FR;q=0.8,fr;q=0.7,en;q=0.6',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
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

const https = require('https');
const http = require('http');

// ── SOURCES RSS IDF ────────────────────────────────────────────────────────
// Toutes cherchent explicitement en Île-de-France / Paris
const RSS_FEEDS = [
  // Indeed FR
  { url: 'https://fr.indeed.com/rss?q=animateur+jeunesse+education&l=Ile-de-France&sort=date',    src: 'indeed_fr' },
  { url: 'https://fr.indeed.com/rss?q=educateur+enfant+bafa&l=Ile-de-France&sort=date',           src: 'indeed_fr' },
  { url: 'https://fr.indeed.com/rss?q=assistant+social+aide+a+domicile&l=Paris&sort=date',        src: 'indeed_fr' },
  { url: 'https://fr.indeed.com/rss?q=administratif+secretaire+accueil&l=Paris&sort=date',        src: 'indeed_fr' },
  { url: 'https://fr.indeed.com/rss?q=animateur+periscolaire+ALSH&l=Ile-de-France&sort=date',    src: 'indeed_fr' },
  { url: 'https://fr.indeed.com/rss?q=moniteur+formation+jeunes&l=Ile-de-France&sort=date',       src: 'indeed_fr' },
  { url: 'https://fr.indeed.com/rss?q=charge+mission+social&l=Paris&sort=date',                   src: 'indeed_fr' },
  { url: 'https://fr.indeed.com/rss?q=sans+experience+debutant+accueil&l=Paris&sort=date',        src: 'indeed_fr' },
  // Talent.com (ex-Neuvoo) FR
  { url: 'https://fr.talent.com/rss?what=animateur+jeunesse&where=Ile-de-France',                 src: 'talent_fr' },
  { url: 'https://fr.talent.com/rss?what=educateur+enfant&where=Paris',                           src: 'talent_fr' },
  { url: 'https://fr.talent.com/rss?what=assistant+social&where=Paris',                           src: 'talent_fr' },
  { url: 'https://fr.talent.com/rss?what=administratif+secretaire&where=Paris',                   src: 'talent_fr' },
  { url: 'https://fr.talent.com/rss?what=sans+experience+debutant&where=Ile-de-France',           src: 'talent_fr' },
  // Jobtome FR
  { url: 'https://fr.jobtome.com/rss.xml?q=animateur-jeunesse&l=paris',                           src: 'jobtome_fr' },
  { url: 'https://fr.jobtome.com/rss.xml?q=educateur-enfant&l=paris',                             src: 'jobtome_fr' },
  { url: 'https://fr.jobtome.com/rss.xml?q=assistant-social&l=paris',                             src: 'jobtome_fr' },
  { url: 'https://fr.jobtome.com/rss.xml?q=administratif-accueil&l=paris',                        src: 'jobtome_fr' },
  { url: 'https://fr.jobtome.com/rss.xml?q=animateur-bafa&l=ile-de-france',                       src: 'jobtome_fr' },
  // JobisJob FR
  { url: 'https://www.jobisjob.fr/search/jobs/rss.xml?q=animateur+jeunesse&where=Paris',          src: 'jobisjob_fr' },
  { url: 'https://www.jobisjob.fr/search/jobs/rss.xml?q=educateur+enfant&where=Paris',            src: 'jobisjob_fr' },
  { url: 'https://www.jobisjob.fr/search/jobs/rss.xml?q=assistant+social&where=Ile-de-France',    src: 'jobisjob_fr' },
  { url: 'https://www.jobisjob.fr/search/jobs/rss.xml?q=sans+experience&where=Paris',             src: 'jobisjob_fr' },
  // Trovit FR
  { url: 'https://emplois.trovit.fr/index.php/cod.search_jobs_xml/what_d.animateur+jeunesse/where_d.Paris', src: 'trovit_fr' },
  { url: 'https://emplois.trovit.fr/index.php/cod.search_jobs_xml/what_d.educateur/where_d.Paris',           src: 'trovit_fr' },
  { url: 'https://emplois.trovit.fr/index.php/cod.search_jobs_xml/what_d.assistant+social/where_d.Paris',    src: 'trovit_fr' },
];

const IDF_KW = [
  'paris','île-de-france','ile-de-france','hauts-de-seine','seine-saint-denis',
  'val-de-marne','essonne','yvelines','seine-et-marne','val-d\'oise',
  '75','77','78','91','92','93','94','95','boulogne','vincennes','nanterre',
  'versailles','créteil','montreuil','saint-denis','neuilly','levallois',
];

const IDF_REJECT = [
  'texas','new york','california','canada','england','australia','deutschland',
  'españa','nederland','united states','united kingdom','belgique','suisse',
  'tennessee','louisiana','virginia','oregon','indiana','georgia','illinois',
  'paris, tx','paris, tn','paris, il','paris, ar',
];

function isIDF(job) {
  const loc = (job.location || '').toLowerCase();
  if (!loc) return true; // pas de localisation → on garde (vient d'une requête IDF)
  if (IDF_REJECT.some(k => loc.includes(k))) return false;
  // Rejeter "Paris, XX" (2 lettres ASCII en fin) = Paris US
  if (/paris,\s+[a-z]{2}$/.test(loc)) return false;
  return IDF_KW.some(k => loc.includes(k));
}

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };

  const results = await Promise.allSettled(
    RSS_FEEDS.map(async ({ url, src }) => {
      const xml = await fetchUrl(url);
      return parseRSS(xml, src);
    })
  );

  const seen = new Set();
  const jobs = results
    .flatMap(r => r.status === 'fulfilled' ? (r.value || []) : [])
    .filter(j => {
      if (!j || !j.url || seen.has(j.url)) return false;
      seen.add(j.url);
      return isIDF(j);
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
      // ── OPTIMISATION NETLIFY : cache CDN 1h ──
      // Évite de re-exécuter la fonction à chaque visite.
      // Le CDN sert la réponse mise en cache → 0 invocation supplémentaire.
      'Cache-Control': 'public, max-age=3600',
      'Netlify-CDN-Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
    body: JSON.stringify(jobs),
  };
};

function parseRSS(xml, src) {
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
    const location = get('location') || get('city') || 'Île-de-France';
    const pubDate = get('pubDate') || get('dc:date') || '';
    jobs.push({
      id: 'idf-' + Buffer.from(link).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 22),
      source: src,
      title,
      company: get('author') || get('dc:creator') || get('source') || '',
      location,
      url: link,
      desc,
      date: pubDate,
      contract: '',
      _fromIDF: true,
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
      },
      timeout: 8000, // 8s max par requête, bien sous la limite Netlify de 10s
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

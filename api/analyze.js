const https = require('https');
const http = require('http');

function fetchUrl(urlStr, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(urlStr); } catch (e) { return reject(e); }

    const lib = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OnjongilAI-Analyzer/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'identity',
      },
    };

    const req = lib.request(options, (res) => {
      // Follow single redirect
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        try {
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : `${parsed.protocol}//${parsed.host}${res.headers.location}`;
          return fetchUrl(redirectUrl, timeoutMs).then(resolve).catch(reject);
        } catch { /* fall through */ }
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
        if (data.length > 500000) res.destroy(); // 500KB 제한
      });
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });

    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

function extractSchemas(html) {
  const schemas = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    try { schemas.push(JSON.parse(m[1].trim())); } catch {}
  }
  return schemas;
}

function extractMeta(html) {
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]?.trim() || null;
  const canonical = (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || [])[1] || null;

  const metas = {};
  const addMeta = (k, v) => { if (k && v && !metas[k.toLowerCase()]) metas[k.toLowerCase()] = v; };

  for (const m of html.matchAll(/<meta\s+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']*)["'][^>]*>/gi)) addMeta(m[1], m[2]);
  for (const m of html.matchAll(/<meta\s+content=["']([^"']*)["'][^>]+(?:name|property)=["']([^"']+)["'][^>]*>/gi)) addMeta(m[2], m[1]);

  return {
    title,
    canonical,
    description: metas['description'] || null,
    robots: metas['robots'] || null,
    ogTitle: metas['og:title'] || null,
    ogDescription: metas['og:description'] || null,
    ogImage: metas['og:image'] || null,
    ogUrl: metas['og:url'] || null,
  };
}

function extractHeadings(html) {
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
  return { h1Count: h1s.length, h2Count: h2s.length, h1s, h2s: h2s.slice(0, 5) };
}

function hasFAQStructure(html) {
  return /class=["'][^"']*faq[^"']*["']/i.test(html)
    || /["']FAQPage["']/.test(html)
    || /<[^>]+>(Q\.|Q :|질문\s*\d|자주\s*묻는)/i.test(html);
}

function parseRobotsTxt(txt, targetUA) {
  if (!txt) return 'unknown';
  const ua = targetUA.toLowerCase();
  const lines = txt.split('\n').map(l => l.split('#')[0].trim());
  let currentUA = null;
  let explicit = { allowed: false, blocked: false };
  let global = { allowed: false, blocked: false };

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('user-agent:')) {
      currentUA = lower.replace('user-agent:', '').trim();
    } else if (lower.startsWith('disallow:')) {
      const path = lower.replace('disallow:', '').trim();
      if (path === '/' || path === '') {
        if (currentUA === ua) explicit.blocked = true;
        if (currentUA === '*') global.blocked = true;
      }
    } else if (lower.startsWith('allow:')) {
      const path = lower.replace('allow:', '').trim();
      if (path === '/' || path === '') {
        if (currentUA === ua) explicit.allowed = true;
        if (currentUA === '*') global.allowed = true;
      }
    }
  }

  if (explicit.blocked && !explicit.allowed) return 'blocked';
  if (explicit.allowed) return 'allowed';
  if (global.blocked && !explicit.allowed) return 'blocked';
  return 'allowed';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url 파라미터가 필요합니다.' });

  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  let parsed;
  try { parsed = new URL(url); }
  catch { return res.status(400).json({ error: '올바른 URL 형식이 아닙니다.' }); }

  // 내부 IP/localhost 차단
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(parsed.hostname)) {
    return res.status(400).json({ error: '허용되지 않는 URL입니다.' });
  }

  const result = { url, fetchedAt: new Date().toISOString(), page: null, robots: null, sitemap: null };

  // 1) 메인 페이지
  const t0 = Date.now();
  try {
    const resp = await fetchUrl(url, 8000);
    const html = resp.body;
    const responseTime = Date.now() - t0;

    const schemas = extractSchemas(html);
    const schemaTypes = schemas.flatMap(s => Array.isArray(s['@type']) ? s['@type'] : [s['@type']]).filter(Boolean);
    const meta = extractMeta(html);
    const headings = extractHeadings(html);
    const faqSchema = schemas.find(s => s['@type'] === 'FAQPage');

    result.page = {
      statusCode: resp.status,
      responseTime,
      title: meta.title,
      meta,
      schemaTypes,
      hasFAQPageSchema: schemaTypes.includes('FAQPage'),
      faqCount: faqSchema?.mainEntity?.length || 0,
      hasLocalBusinessSchema: schemaTypes.some(t => ['LocalBusiness','ProfessionalService','MedicalBusiness','LegalService','HealthAndBeautyBusiness','AutoDealer','HomeAndConstructionBusiness'].includes(t)),
      hasOrganizationSchema: schemaTypes.some(t => ['Organization','Corporation'].includes(t)),
      hasFAQInHTML: hasFAQStructure(html),
      headings,
      hasOgImage: !!meta.ogImage,
      hasCanonical: !!meta.canonical,
      hasDescription: !!meta.description,
      isIndexable: !meta.robots || !/noindex/i.test(meta.robots),
    };
  } catch (e) {
    result.page = { error: e.message };
  }

  // 2) robots.txt
  try {
    const rResp = await fetchUrl(`${parsed.protocol}//${parsed.host}/robots.txt`, 5000);
    const txt = rResp.status === 200 ? rResp.body : '';
    result.robots = {
      exists: rResp.status === 200,
      gptbot: parseRobotsTxt(txt, 'GPTBot'),
      perplexitybot: parseRobotsTxt(txt, 'PerplexityBot'),
      claudebot: parseRobotsTxt(txt, 'ClaudeBot'),
      googlebot: parseRobotsTxt(txt, 'Googlebot'),
    };
  } catch {
    result.robots = { exists: false, gptbot: 'unknown', perplexitybot: 'unknown', claudebot: 'unknown', googlebot: 'unknown' };
  }

  // 3) sitemap.xml
  try {
    const sResp = await fetchUrl(`${parsed.protocol}//${parsed.host}/sitemap.xml`, 5000);
    result.sitemap = {
      exists: sResp.status === 200,
      urlCount: sResp.status === 200 ? (sResp.body.match(/<url>/g) || []).length : 0,
    };
  } catch {
    result.sitemap = { exists: false, urlCount: 0 };
  }

  res.status(200).json(result);
};

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
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        try {
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : `${parsed.protocol}//${parsed.host}${res.headers.location}`;
          return fetchUrl(redirectUrl, timeoutMs).then(resolve).catch(reject);
        } catch {}
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; if (data.length > 600000) res.destroy(); });
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });

    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

// ── Schema ──────────────────────────────────────────────────────
function extractSchemas(html) {
  const schemas = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    try { schemas.push(JSON.parse(m[1].trim())); } catch {}
  }
  return schemas;
}

function checkSchemaCompleteness(schemas) {
  const result = { faqComplete: null, faqCount: 0, businessComplete: null, businessScore: 0, schemaTypes: [] };

  const faq = schemas.find(s => s['@type'] === 'FAQPage');
  if (faq) {
    const qs = faq.mainEntity || [];
    result.faqCount = qs.length;
    result.faqComplete = qs.length >= 3 && qs.every(q => q.name && q.acceptedAnswer?.text?.length > 20);
  }

  const bizTypes = ['LocalBusiness','ProfessionalService','MedicalBusiness','LegalService','HealthAndBeautyBusiness','AutoDealer','HomeAndConstructionBusiness'];
  const biz = schemas.find(s => bizTypes.includes(s['@type']));
  if (biz) {
    const fields = {
      name: !!biz.name,
      description: !!biz.description,
      url: !!biz.url,
      areaServed: !!biz.areaServed,
      telephone: !!(biz.telephone || biz.phone),
      address: !!biz.address,
      offers: !!(biz.hasOfferCatalog || biz.offers || biz.priceRange),
    };
    result.businessScore = Object.values(fields).filter(Boolean).length;
    result.businessFields = fields;
    result.businessComplete = result.businessScore >= 5;
  }

  result.schemaTypes = schemas.flatMap(s => Array.isArray(s['@type']) ? s['@type'] : [s['@type']]).filter(Boolean);
  return result;
}

// ── Meta ────────────────────────────────────────────────────────
function extractMeta(html) {
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]?.trim() || null;
  const canonical = (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || [])[1] || null;

  const metas = {};
  const add = (k, v) => { if (k && v && !metas[k.toLowerCase()]) metas[k.toLowerCase()] = v; };
  for (const m of html.matchAll(/<meta\s+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']*)["'][^>]*>/gi)) add(m[1], m[2]);
  for (const m of html.matchAll(/<meta\s+content=["']([^"']*)["'][^>]+(?:name|property)=["']([^"']+)["'][^>]*>/gi)) add(m[2], m[1]);

  return {
    title,
    canonical,
    description: metas['description'] || null,
    descriptionLength: (metas['description'] || '').length,
    robots: metas['robots'] || null,
    ogTitle: metas['og:title'] || null,
    ogDescription: metas['og:description'] || null,
    ogImage: metas['og:image'] || null,
    ogUrl: metas['og:url'] || null,
    twitterCard: metas['twitter:card'] || null,
    hasMobileViewport: /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html),
  };
}

// ── Headings ────────────────────────────────────────────────────
function extractHeadings(html) {
  const all = [];
  for (const m of html.matchAll(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi)) {
    all.push({ level: parseInt(m[1][1]), text: m[2].replace(/<[^>]+>/g, '').trim().substring(0, 60) });
  }
  const h1s = all.filter(h => h.level === 1).map(h => h.text);
  const h2s = all.filter(h => h.level === 2).map(h => h.text);
  const h3s = all.filter(h => h.level === 3).map(h => h.text);

  // 계층 구조 검사 (레벨 건너뜀 여부)
  let prevLevel = 0, skips = 0;
  for (const h of all) {
    if (h.level > prevLevel + 1 && prevLevel > 0) skips++;
    prevLevel = h.level;
  }

  return {
    h1Count: h1s.length, h2Count: h2s.length, h3Count: h3s.length,
    h1s, h2s: h2s.slice(0, 5), h3s: h3s.slice(0, 5),
    hierarchySkips: skips,
    isProperHierarchy: skips === 0,
  };
}

// ── Content ─────────────────────────────────────────────────────
function analyzeContent(html) {
  // 본문만 추출 (nav/script/style 제거)
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ').trim();

  // 한글 음절 수 + 영단어 수 (한글 2자 = 영어 1단어 기준으로 정규화)
  const koreanChars = (body.match(/[가-힣]/g) || []).length;
  const englishWords = (body.match(/\b[a-zA-Z]{2,}\b/g) || []).length;
  const wordCount = Math.round(koreanChars / 2) + englishWords;

  // 이미지 alt 분석
  const imgs = [...html.matchAll(/<img[^>]+>/gi)].map(m => m[0]);
  const withAlt = imgs.filter(t => /alt=["'][^"']+["']/i.test(t));
  const imgAltRatio = imgs.length > 0 ? Math.round((withAlt.length / imgs.length) * 100) : 100;

  // 링크 분석
  const allLinks = [...html.matchAll(/href=["']([^"'#?][^"']*?)["']/gi)].map(m => m[1]);
  const externalLinks = allLinks.filter(l => /^https?:\/\//i.test(l));
  const authorityDomains = ['wikipedia.org','naver.com','korea.kr','.go.kr','.ac.kr','pubmed','scholar.google','ncbi.nlm.nih','who.int'];
  const citations = externalLinks.filter(l => authorityDomains.some(d => l.includes(d)));

  // Q&A 구조 감지
  const hasFAQClass = /class=["'][^"']*faq[^"']*["']/i.test(html);
  const hasQASchema = /["']FAQPage["']/.test(html);
  const hasQAPattern = /<[^>]*>(Q\.|Q :|질문\s*[\d.]|자주\s*묻는|A\.|답변\s*:)/i.test(html);

  return {
    wordCount,
    hasEnoughContent: wordCount >= 300,
    imgTotal: imgs.length,
    imgWithAlt: withAlt.length,
    imgAltRatio,
    externalLinkCount: externalLinks.length,
    citationCount: citations.length,
    hasCitations: citations.length > 0,
    hasFAQStructure: hasFAQClass || hasQASchema || hasQAPattern,
  };
}

// ── E-E-A-T ──────────────────────────────────────────────────────
function analyzeEEAT(html) {
  const hasAboutPage = /href=["'][^"']*(?:about|소개|회사소개|about-us)[^"']*["']/i.test(html);
  const hasContactPage = /href=["'][^"']*(?:contact|연락처|문의|상담|contact-us)[^"']*["']/i.test(html);
  const hasAuthorInfo = /(?:author|저자|작성자|글쓴이|대표|전문가)/i.test(html);
  const hasPrivacyPolicy = /(?:privacy|개인정보\s*(?:처리방침|보호정책)|이용약관)/i.test(html);
  const hasBusinessInfo = /(?:사업자\s*등록번호|대표자|사업자번호|법인번호)/i.test(html);

  // NAP (Name, Address, Phone)
  const hasPhone = /(?:0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4})/i.test(html);
  const hasAddress = /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[시도]\s*[가-힣]{1,5}[시군구]/i.test(html);
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(html);

  const eatScore = [hasAboutPage, hasContactPage, hasAuthorInfo, hasPrivacyPolicy, hasBusinessInfo].filter(Boolean).length;
  const napScore = [hasPhone, hasAddress, hasEmail].filter(Boolean).length;

  return {
    hasAboutPage, hasContactPage, hasAuthorInfo, hasPrivacyPolicy, hasBusinessInfo,
    hasPhone, hasAddress, hasEmail,
    eatScore,     // 0~5
    napScore,     // 0~3
    eatComplete: eatScore >= 3,
    napComplete: napScore >= 2,
  };
}

// ── robots.txt ──────────────────────────────────────────────────
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

// ── Main Handler ─────────────────────────────────────────────────
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

  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(parsed.hostname)) {
    return res.status(400).json({ error: '허용되지 않는 URL입니다.' });
  }

  const result = { url, fetchedAt: new Date().toISOString(), page: null, robots: null, sitemap: null };

  // 1) 메인 페이지 fetch + 전체 분석
  const t0 = Date.now();
  try {
    const resp = await fetchUrl(url, 8000);
    const html = resp.body;
    const responseTime = Date.now() - t0;

    const meta = extractMeta(html);
    const headings = extractHeadings(html);
    const schema = checkSchemaCompleteness(extractSchemas(html));
    const content = analyzeContent(html);
    const eeat = analyzeEEAT(html);

    result.page = {
      statusCode: resp.status,
      responseTime,
      // 메타
      title: meta.title,
      meta,
      // Schema
      schemaTypes: schema.schemaTypes,
      hasFAQPageSchema: schema.schemaTypes.includes('FAQPage'),
      faqCount: schema.faqCount,
      faqComplete: schema.faqComplete,
      hasLocalBusinessSchema: schema.schemaTypes.some(t =>
        ['LocalBusiness','ProfessionalService','MedicalBusiness','LegalService','HealthAndBeautyBusiness'].includes(t)),
      businessScore: schema.businessScore,
      businessFields: schema.businessFields,
      businessComplete: schema.businessComplete,
      // 콘텐츠
      wordCount: content.wordCount,
      hasEnoughContent: content.hasEnoughContent,
      imgTotal: content.imgTotal,
      imgAltRatio: content.imgAltRatio,
      externalLinkCount: content.externalLinkCount,
      citationCount: content.citationCount,
      hasCitations: content.hasCitations,
      hasFAQInHTML: content.hasFAQStructure,
      // 제목 구조
      headings,
      isProperHierarchy: headings.isProperHierarchy,
      // E-E-A-T
      eeat,
      // 기술
      hasOgImage: !!meta.ogImage,
      hasCanonical: !!meta.canonical,
      hasDescription: !!meta.description,
      descriptionLength: meta.descriptionLength,
      hasMobileViewport: meta.hasMobileViewport,
      hasTwitterCard: !!meta.twitterCard,
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
      applebot: parseRobotsTxt(txt, 'Applebot'),
    };
  } catch {
    result.robots = { exists: false, gptbot: 'unknown', perplexitybot: 'unknown', claudebot: 'unknown', googlebot: 'unknown', applebot: 'unknown' };
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

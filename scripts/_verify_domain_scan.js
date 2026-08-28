/* Verify domainScan on sample TEEN payload — node scripts/_verify_domain_scan.js */
const fs = require('fs');
const path = require('path');

const raw = JSON.parse(
  fs.readFileSync(path.join(__dirname, '_build_ai_raw_TEEN_out.json'), 'utf8')
);
const payload = raw.payload || raw;

function buildDomainScan(rawPayload) {
  const DOMAIN_IDS = ['money', 'work', 'business', 'relationship', 'health', 'study', 'children', 'housing'];
  const DOMAIN_KO = {
    money: '금전', work: '일·직업', business: '사업·창업', relationship: '관계·연애',
    health: '건강', study: '학업·시험·계약', children: '자녀', housing: '주거·이사',
  };
  const bucketOf = (ep) => {
    const orb = Number(ep.peakOrb);
    const months = Number(ep.months) || 1;
    if (orb <= 1.0 && months >= 3) return 'A';
    if (orb <= 1.5) return 'B';
    return 'C';
  };
  const bodies = (rawPayload && rawPayload.natal && rawPayload.natal.bodies) || {};
  const unknownTime = !!(rawPayload && rawPayload.chartMeta && rawPayload.chartMeta.birth && rawPayload.chartMeta.birth.unknownTime);
  const scores = {};
  const epHits = {};
  DOMAIN_IDS.forEach((id) => { scores[id] = 0; epHits[id] = []; });

  function episodeWeight(ep) {
    let w = 1;
    const orb = Number(ep.peakOrb);
    if (Number.isFinite(orb)) {
      if (orb <= 1.0) w += 2;
      else if (orb <= 1.5) w += 1;
      else if (orb <= 2.5) w += 0.4;
    }
    w += Math.min(Number(ep.months) || 1, 14) * 0.12;
    const b = bucketOf(ep);
    if (b === 'A') w += 1.4;
    else if (b === 'B') w += 0.7;
    return w;
  }

  function addHouseDomains(house, w) {
    const h = Number(house);
    if (!h) return;
    if (h === 2 || h === 8) scores.money += w;
    if (h === 4) scores.housing += w;
    if (h === 5) scores.children += w;
    if (h === 6) { scores.health += w * 0.9; scores.work += w * 0.5; }
    if (h === 7) scores.relationship += w;
    if (h === 3) scores.study += w * 0.7;
    if (h === 9) { scores.study += w * 0.5; scores.housing += w * 0.4; }
    if (h === 10) { scores.work += w; scores.business += w * 0.6; }
  }

  function domainsForEpisode(ep) {
    const out = new Set();
    const n = String(ep.natal || '').toLowerCase();
    const lk = String(ep.lineKo || '');
    const isMeridian = /MC|IC|중천|천저/.test(lk) || n === 'mc' || n === 'ic';
    const isHorizon = (/ASC|DSC|상승|하강/.test(lk) || n === 'asc' || n === 'dsc') && !isMeridian;
    const house = bodies[n] && bodies[n].house;
    if (isHorizon) { out.add('relationship'); out.add('work'); }
    if (isMeridian) {
      out.add('work'); out.add('business');
      if (n === 'ic' || lk.indexOf('IC') >= 0 || lk.indexOf('천저') >= 0) out.add('housing');
    }
    if (n === 'venus') { out.add('relationship'); out.add('money'); }
    if (n === 'mars') { out.add('work'); out.add('health'); }
    if (n === 'mercury') { out.add('study'); out.add('housing'); }
    if (n === 'moon') { out.add('relationship'); out.add('housing'); out.add('children'); }
    if (n === 'sun') { out.add('work'); out.add('children'); }
    if (!unknownTime && house) {
      if (house === 2 || house === 8) out.add('money');
      if (house === 4) out.add('housing');
      if (house === 5) out.add('children');
      if (house === 6) { out.add('health'); out.add('work'); }
      if (house === 7) out.add('relationship');
      if (house === 9) { out.add('study'); out.add('housing'); }
      if (house === 10) { out.add('work'); out.add('business'); }
      if (house === 3) out.add('study');
    }
    return out;
  }

  function recordEpisode(ep) {
    const w = episodeWeight(ep);
    domainsForEpisode(ep).forEach((id) => {
      scores[id] += w;
      if (epHits[id].length < 4) {
        epHits[id].push({ lineKo: ep.lineKo, peakYm: ep.peakYm, weight: Math.round(w * 100) / 100 });
      }
    });
  }

  ((rawPayload && rawPayload.transitEpisodes) || []).forEach(recordEpisode);
  if (!unknownTime) {
    ((rawPayload && rawPayload.progMoonEvents) || []).forEach((ev) => {
      addHouseDomains(ev.house, 0.65);
      if (Number(ev.house) === 5) scores.children += 0.325;
    });
  }

  const maxScore = Math.max(...DOMAIN_IDS.map((id) => scores[id]), 0.001);
  function levelFor(score) {
    if (score <= 0.05) return 'none';
    const ratio = score / maxScore;
    if (ratio >= 0.52) return 'strong';
    if (ratio >= 0.26) return 'moderate';
    return 'weak';
  }

  const domains = {};
  const strong = [], moderate = [], weak = [], none = [];
  DOMAIN_IDS.forEach((id) => {
    const score = Math.round(scores[id] * 100) / 100;
    const level = levelFor(score);
    domains[id] = { id, labelKo: DOMAIN_KO[id], level, score, topEpisodes: epHits[id].sort((a, b) => b.weight - a.weight).slice(0, 3) };
    if (level === 'strong') strong.push(id);
    else if (level === 'moderate') moderate.push(id);
    else if (level === 'weak') weak.push(id);
    else none.push(id);
  });
  const weakOptional = DOMAIN_IDS
    .filter((id) => domains[id].level === 'none' || domains[id].level === 'weak')
    .sort((a, b) => scores[a] - scores[b])
    .slice(0, 2)
    .map((id) => ({ id, labelKo: DOMAIN_KO[id] }));
  return { domains, strong, moderate, weak, none, weakOptional };
}

const scan = buildDomainScan(payload);
console.log(JSON.stringify({
  strong: scan.strong,
  moderate: scan.moderate,
  weak: scan.weak,
  none: scan.none,
  weakOptional: scan.weakOptional,
  scores: Object.fromEntries(Object.entries(scan.domains).map(([k, v]) => [k, { level: v.level, score: v.score }])),
}, null, 2));

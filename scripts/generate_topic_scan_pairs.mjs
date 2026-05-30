/**
 * tarot-*-scripted.js 의 summary → scanPair 생성
 * 출력: public/js/tarot-topic-scan-pairs.js
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(root, "public/js/tarot-topic-scan-pairs.js");

const TOPICS = ["love", "job", "finance", "relation", "growth"];

/** 수동 보정 (deck: major|minor, id, topic) */
const MANUAL_OVERRIDES = {
  "major:1:job": "프레젠테이션·압도적 성과",
  "major:16:job": "급작스러운 붕괴·충격",
  "minor:44:love": "만족스러운 사랑·연애 주도권",
  "minor:54:job": "이권 다툼·치열한 경쟁",
  "minor:22:love": "열정적 사랑·충동과 권태",
  "minor:22:job": "강력한 시작·독선과 뒷심",
  "minor:22:finance": "새로운 기회·무모한 배팅",
  "minor:22:relation": "새 인맥·과한 의욕",
  "minor:23:love": "진지한 애정운·과도한 저울질",
  "minor:23:job": "사업 확장 기획·결단력 부족",
  "minor:23:finance": "장기 자산 구축·현금 흐름 무시",
  "minor:23:relation": "인맥 확장·은근한 선 긋기",
  "minor:23:growth": "비전 설계·실행 공허",
  "minor:22:growth": "실행력 최고조·끈기 부족",
};

function polishPart(s) {
  return String(s || "")
    .replace(/(?:부릅니다|합니다|됩니다|만듭니다|쉽습니다|입니다|어집니다|지요|세요|\.)$/u, "")
    .trim();
}

function positiveFromHead(head) {
  const h = stripHeadNoise(head);
  const m = h.match(
    /([가-힣\s]{2,24}(?:운|사랑|시기|타이밍|흐름|커리어|시작|도약|성과|확장|회수|보상))(?:이|가|을|를|은|는)?$/u,
  );
  if (m) return polishPart(keyWordsFromClause(m[1]));
  return polishPart(keyWordsFromClause(h));
}

function warningFromTail(tail) {
  let t = tail
    .replace(/\s*(?:주의|경계|유의|조심|관리|플러스|마이너스).*$/u, "")
    .trim();
  const m = t.match(/^(.+?)(?:은|는|을|를|이|가)\s/u);
  if (m) t = m[1];
  t = stripTailNoise(t);
  return polishPart(keyWordsFromClause(t));
}

function stripHeadNoise(head) {
  return head
    .replace(/(?:이나|이지만|내지만|으나)$/u, "")
    .replace(/(?:을|를|은|는|이|가|에서|으로|에게|까지)$/u, "")
    .trim();
}

function stripTailNoise(tail) {
  return tail
    .replace(
      /\s*(?:주의|경계|유의|조심|관리|플러스|마이너스|경계하|주의하|유의하|조심하).*$/u,
      "",
    )
    .replace(/(?:을|를|은|는|이|가|과|와|및)$/u, "")
    .trim();
}

function keyWordsFromClause(clause) {
  let c = String(clause || "")
    .replace(/\s+/g, " ")
    .trim();
  c = c.replace(/(?:을|를|은|는|이|가|에서|으로|에게|까지|과|와|및)$/u, "").trim();

  const joinParts = c.split(/(?:과|와|및)\s+/u);
  const pick =
    joinParts.length > 1 ? joinParts[joinParts.length - 1] : joinParts[0];

  let words = pick.split(/\s+/).filter((w) => w.length >= 2);
  words = words.map((w) =>
    w.replace(/(?:을|를|이|가|은|는|의|하|해|하는|되는|되는|이는)$/u, ""),
  );

  const filler =
    /^(?:새로운|강력한|과도한|순간의|급격한|무리한|은근한|직감에만|나 중심적인|내|더|매우|극심한|빠른|완벽한|장기적인|단기적인)$/u;
  while (words.length > 2 && filler.test(words[0])) words.shift();

  if (words.length >= 2) {
    const a = words[words.length - 2];
    const b = words[words.length - 1];
    return a + " " + b;
  }
  if (words.length === 1) {
    const w = words[0];
    return w.length > 12 ? w.slice(0, 12) : w;
  }
  return pick.slice(0, 12);
}

function isBrokenScanPair(pair) {
  if (!pair || !pair.includes("·")) return true;
  const parts = pair.split("·");
  if (parts.length !== 2) return true;
  const bad =
    /(?:만족스|급작$|갑작$|필연적|프레젠테$|따르|폭발하|내지만|생기나|시기이나|흐름이나|운이나|따르는|보일|있습니다|최적의|달하는|밀려오|일어나|이끌어|모여들|누리|부모|부릅|합니다|됩니다|만듭|쉽습니다|입니다|어집|지요|세요|\.)$/u;
  if (parts[0].length < 2 || parts[1].length < 2) return true;
  if (bad.test(parts[0]) || bad.test(parts[1])) return true;
  if (parts[0].length > 16 || parts[1].length > 16) return true;
  return false;
}

function flowKeywordsFromTopicSummary(summary) {
  const s = String(summary || "").trim();
  if (!s) return "";

  const comma = s.indexOf(",");
  if (comma > 0) {
    const head = s.slice(0, comma).trim();
    const tail = s.slice(comma + 1).trim();
    const left = positiveFromHead(head);
    const right = warningFromTail(tail);
    if (left && right && left !== right) {
      const pair = left + "·" + right;
      if (!isBrokenScanPair(pair)) return pair;
    }
  }

  const clause = s.split(",")[0].replace(/(?:이나|이지만|내지만|으나)$/u, "").trim();
  const alt = clause.match(/^(.+?)이나\s+(.+)$/u);
  if (alt) {
    const pair =
      keyWordsFromClause(alt[1]) + "·" + keyWordsFromClause(alt[2]);
    if (!isBrokenScanPair(pair)) return pair;
  }
  const join = clause.match(/^(.+?)(?:과|와|및)\s+(.+)$/u);
  if (join) {
    const pair =
      keyWordsFromClause(join[1]) + "·" + keyWordsFromClause(join[2]);
    if (!isBrokenScanPair(pair)) return pair;
  }
  return "";
}

function extractSummaries(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const cards = {};
  const cardRe = /\n    (\d+): \{/g;
  const starts = [];
  let m;
  while ((m = cardRe.exec(text)) !== null) {
    starts.push({ id: Number(m[1]), start: m.index });
  }
  for (let i = 0; i < starts.length; i++) {
    const { id, start } = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].start : text.length;
    const block = text.slice(start, end);
    cards[id] = {};
    for (const topic of TOPICS) {
      const re = new RegExp(
        topic + ":\\s*\\{[\\s\\S]*?summary:\\s*'((?:\\\\'|[^'])*)'",
      );
      const sm = block.match(re);
      if (sm) cards[id][topic] = sm[1].replace(/\\'/g, "'");
    }
  }
  return cards;
}

function buildScanMap(deck, summaries) {
  const out = {};
  for (const [id, topics] of Object.entries(summaries)) {
    const row = {};
    for (const topic of TOPICS) {
      const key = `${deck}:${id}:${topic}`;
      if (MANUAL_OVERRIDES[key]) {
        row[topic] = MANUAL_OVERRIDES[key];
        continue;
      }
      const summary = topics[topic];
      if (!summary) continue;
      const pair = flowKeywordsFromTopicSummary(summary);
      if (pair) row[topic] = pair;
    }
    if (Object.keys(row).length) out[id] = row;
  }
  return out;
}

const minorSummaries = extractSummaries(
  path.join(root, "public/js/tarot-minor-scripted.js"),
);
const majorSummaries = extractSummaries(
  path.join(root, "public/js/tarot-major-scripted.js"),
);

const minorScan = buildScanMap("minor", minorSummaries);
const majorScan = buildScanMap("major", majorSummaries);

function fmtMap(name, data) {
  const lines = [`  window.${name} = {`];
  const ids = Object.keys(data).sort((a, b) => Number(a) - Number(b));
  for (const id of ids) {
    lines.push(`    ${id}: {`);
    for (const topic of TOPICS) {
      if (data[id][topic]) {
        const v = data[id][topic].replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        lines.push(`      ${topic}: '${v}',`);
      }
    }
    lines.push("    },");
  }
  lines.push("  };");
  return lines.join("\n");
}

const header = `/**
 * 타로코드 · 질문 모드 한눈에 보기 고정 키워드 (scanPair)
 * — love / job(일·커리어) / finance(재정) / relation(관계) / growth(내면·성장)
 *
 * 확인·수정: 이 파일 (public/js/tarot-topic-scan-pairs.js)
 * 원문 summary: tarot-minor-scripted.js, tarot-major-scripted.js
 * 재생성: node scripts/generate_topic_scan_pairs.mjs
 */
(function () {
`;

const footer = `
  window.getTarotTopicScanPair = function (deck, cardId, topicKey) {
    const map =
      deck === 'major' ? window.TAROT_TOPIC_SCAN_MAJOR : window.TAROT_TOPIC_SCAN_MINOR;
    if (!map || !topicKey) return '';
    const row = map[cardId];
    if (!row) return '';
    return row[topicKey] || '';
  };
})();
`;

const body =
  fmtMap("TAROT_TOPIC_SCAN_MINOR", minorScan) +
  "\n\n" +
  fmtMap("TAROT_TOPIC_SCAN_MAJOR", majorScan);

fs.writeFileSync(outPath, header + body + footer, "utf8");

let missing = 0;
for (const [deck, sums] of [
  ["minor", minorSummaries],
  ["major", majorSummaries],
]) {
  for (const [id, topics] of Object.entries(sums)) {
    for (const topic of TOPICS) {
      if (!topics[topic]) continue;
      const row = deck === "minor" ? minorScan : majorScan;
      if (!row[id]?.[topic]) missing++;
    }
  }
}

console.log("[generate_topic_scan_pairs] wrote", outPath);
console.log(
  "  minor:",
  Object.keys(minorScan).length,
  "cards | major:",
  Object.keys(majorScan).length,
  "cards | missing pairs:",
  missing,
);

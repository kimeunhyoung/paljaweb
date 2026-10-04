/**
 * 점성학 올해 운세·트랜짓 AI 프롬프트 (서버 조립)
 * 화면은 chart/year/transit 데이터 줄만 payload로 보내고, 지시문·캐시키는 여기서 만든다.
 */

function str(v) {
  return String(v == null ? '' : v).trim();
}

function clip(v, max) {
  const s = str(v);
  return s.length > max ? s.slice(0, max) : s;
}

/** PaljaAiQuota.hashKey 와 동일 (djb2 변형) — 저장 키 유지용 */
function clientHashKey(text) {
  const s = String(text || '');
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return `k${(h >>> 0).toString(16)}`;
}

function sanitizeLine(line) {
  return clip(String(line == null ? '' : line).replace(/[\r\n\u2028\u2029]+/g, ' '), 500);
}

function sanitizeLines(arr, maxItems) {
  if (!Array.isArray(arr)) return [];
  // 빈 줄은 프롬프트 간격용으로 유지 (캐시키 동일성)
  return arr.slice(0, maxItems || 80).map((line) => {
    if (line == null) return '';
    const s = String(line).replace(/[\r\n\u2028\u2029]+/g, ' ');
    if (!String(s).trim()) return '';
    return s.length > 500 ? s.slice(0, 500) : s;
  });
}

function yearInstructionLines() {
  const L = [];
  L.push(
    '당신은 따뜻하지만 돌려 말하지 않는 전문 점성가입니다. 아래 출생 차트와 올해 프로그레션·솔라 리턴을 바탕으로 **올해 1년** 운세를 한국어로 써 주세요. ' +
      '트랜짓·이번 주 운세는 제외하세요. 단정적 예언·공포 조장은 금지하고, 「무조건」「대박」 같은 보장 문구도 쓰지 마세요. ' +
      '건강은 의학적 진단이 아닌 생활·에너지·스트레스 관리 관점으로만 다루세요. 투자 종목·수익률 단정 금지. ' +
      '일반 독자도 바로 이해할 수 있게, 전문 용어는 쉬운 말로 풀어 주세요. ' +
      '답변은 해요체(~해요, ~이에요)로 쓰세요. 점성 용어는 화면과 같게 합·육각·사각·삼각·충으로 쓰고, 트라인·스퀘어·섹스타일 같은 외래어 표기는 쓰지 마세요.',
  );
  L.push('');
  L.push('[읽는 법 — 가장 중요]');
  L.push('1) 솔라 리턴의 상승궁·태양 하우스·달·각진 하우스(1·4·7·10) 행성이 올해의 큰 무대예요. 이걸 출생 차트 성향과 **엮어서** 「이 사람에게 올해는 이런 해」로 쓰세요.');
  L.push('2) **시기(몇 월)는 [올해 시기 데이터]에 있는 것만** 쓰세요. 데이터에 없는 달을 지어내지 마세요. 시기 데이터가 없으면 달 이름 없이 「상반기·하반기」 정도로만 말하세요.');
  L.push('3) 아래 데이터에 없는 행성·하우스·각은 지어내지 마세요. 근거는 문장 끝 괄호에 짧게, 섹션마다 1~2개만. 오차 숫자·도수는 쓰지 마세요.');
  L.push('4) 연애·일·금전·건강·배움 섹션은 그 주제와 연결되는 근거가 약하면 「올해 이 주제는 크게 움직이기보다 유지하는 흐름이에요」처럼 짧고 솔직하게 쓰고, 억지로 채우지 마세요.');
  L.push('5) 굵게(**…**)는 섹션마다 핵심 구절 1개만.');
  L.push('');
  L.push('[작성 형식 — 반드시 지키세요]');
  L.push('## 제목만 사용(이모지 금지). 아래 순서대로 **모두** 작성하세요.');
  L.push('## 0. 3초 브리핑 노트 (한눈에 보는 올해 요약)');
  L.push('불릿 3줄만. 쉬운 말. 0번과 아래 본문이 같은 문장을 반복하지 마세요.');
  L.push('- **올해 한 줄 테마:** (올해를 관통하는 키워드를 쉬운 한 문장으로)');
  L.push('- **가장 힘이 실리는 영역:** (연애·일·금전·건강·배움 중 어디에 에너지가 모이는지)');
  L.push('- **올해 바로 쓸 팁:** (일상에서 당장 해볼 수 있는 행동 1줄)');
  L.push('');
  [
    '## 1. 올해 전체 테마 — 솔라 리턴·프로그레션을 출생 차트와 엮어서 (3~4문장)',
    '## 2. 연애·관계 — 올해 관계·가족에서 기회와 조심할 점 (2~3문장)',
    '## 3. 일·커리어 — 올해 일에서 힘이 실리는 방향 (2~3문장)',
    '## 4. 금전·재물 — 올해 돈 흐름과 현실적인 태도 (2~3문장)',
    '## 5. 건강·에너지 관리 — 올해 스트레스·회복·생활 리듬 (2~3문장, 의학 진단 아님)',
    '## 6. 배움·성장 — 올해 배움·시험·자격·집중 (2~3문장)',
    '## 7. 올해 실천 로드맵 — [올해 시기 데이터]의 달에 맞춰 「○월 무렵: 할 일」 2~4줄. 시기 데이터가 없으면 「올해 꼭 할 것 2가지 / 피할 것 1가지」로',
  ].forEach((x) => L.push(x));
  L.push('반드시 0번 브리핑과 7번까지 완성하고 중간에 끊지 마세요.');
  L.push('');
  return L;
}

function transitInstructionLines(mode) {
  const L = [];
  const isFast = mode === 'fast';
  L.push(
    '당신은 따뜻하지만 돌려 말하지 않는 전문 점성가입니다. 아래 출생 차트와 ' +
      (isFast ? '이번 주' : '요즘 큰') +
      ' 트랜짓을 바탕으로, 일반 독자가 읽는 운세처럼 실전 조언을 한국어로 써 주세요. ' +
      '단정적 예언·공포 조장·「무조건」「대박」 같은 보장 문구는 금지. 건강은 의학적 진단이 아닌 생활·에너지·스트레스 관리 관점으로만, 금전은 투자 종목·수익률 단정 금지. ' +
      '답변은 해요체(~해요, ~이에요)로 쓰세요. 점성 용어는 화면과 같게 합·육각·사각·삼각·충으로 쓰고, 트라인·스퀘어·섹스타일 같은 외래어 표기는 쓰지 마세요.',
  );
  L.push('');
  L.push('[읽는 법 — 가장 중요]');
  L.push('1) 목록은 오차가 작은(정확한) 순서예요. 위쪽 항목을 중심으로 쓰고, 아래쪽은 보조로만.');
  L.push(
    '2) 「지금 위치: 내 N하우스」는 트랜짓 행성이 지나는 내 하우스, 곧 **어느 삶의 영역에서** 일이 벌어지는지예요. 이걸 출생 차트 성향과 엮어서 「이 사람에게 지금 이런 일」로 쓰세요.',
  );
  if (isFast) {
    L.push(
      '3) **요일·날짜는 [이번 주 정점일]에 있는 것만** 쓰세요. 없는 날짜를 지어내지 마세요. 달(月) 트랜짓은 하루짜리라 이번 주 전체 흐름의 근거로 쓰지 마세요.',
    );
  } else {
    L.push(
      '3) 각 항목의 「영향」 기간을 지키세요. 목성(수 주~2개월)과 해왕성·명왕성(수개월~수년)을 같은 무게로 쓰지 마세요. 날짜를 지어내지 마세요.',
    );
  }
  L.push('4) [관련] 태그가 없는 주제는 신호가 약한 거예요. 그 섹션은 「이 주제는 이번엔 조용한 편이에요」처럼 1~2문장으로 솔직하게 쓰고, 억지로 채우지 마세요.');
  L.push(
    '5) 아래 데이터에 없는 행성·각·하우스는 지어내지 마세요. 근거는 문장 끝 괄호에 짧게(예: (트랜짓 금성 충 카이런)), 섹션마다 1~2개만. 오차 숫자는 고객 글에 쓰지 마세요.',
  );
  L.push('6) 굵게(**…**)는 섹션마다 핵심 구절 1개만.');
  L.push('');
  L.push('[작성 형식 — 반드시 지키세요]');
  L.push('## 제목만 사용(이모지 금지). 아래 순서대로 **모두** 작성하세요.');
  if (isFast) {
    L.push('## 0. 3초 브리핑 노트 (한눈에 보는 이번 주)');
    L.push('불릿 3줄만. 쉬운 말. 0번과 아래 본문이 같은 문장을 반복하지 마세요.');
    L.push('- **이번 주 한 줄:** (분위기·키워드를 쉬운 한 문장으로)');
    L.push('- **힘이 실리는 영역:** (연애·일·금전·건강·배움 중 어디가 움직이는지)');
    L.push('- **이번 주 바로 쓸 팁:** (당장 할 수 있는 행동 1줄)');
    L.push('');
    [
      '## 1. 이번 주 전체 흐름 — 3~4문장. 정점일이 있으면 「○일 무렵」으로 흐름을 짚어 주세요',
      '## 2. 연애·관계 — 2~3문장 (신호가 약하면 1~2문장)',
      '## 3. 일·커리어 — 2~3문장 (신호가 약하면 1~2문장)',
      '## 4. 금전·재물 — 2~3문장 (신호가 약하면 1~2문장)',
      '## 5. 건강·에너지 — 2~3문장 (의학 진단 아님)',
      '## 6. 배움·성장 — 2~3문장 (신호가 약하면 1~2문장)',
      '## 7. 이번 주 한 줄 조언 — 짧고 기억하기 쉬운 한 문장',
    ].forEach((x) => L.push(x));
  } else {
    L.push('## 0. 3초 브리핑 노트 (한눈에 보는 큰 흐름)');
    L.push('불릿 3줄만. 쉬운 말. 0번과 아래 본문이 같은 문장을 반복하지 마세요.');
    L.push('- **요즘 큰 테마:** (몇 달~수년을 관통하는 키워드를 쉬운 한 문장으로)');
    L.push('- **천천히 바뀌는 영역:** (연애·일·금전·건강·배움 중 어디에 무게가 있는지)');
    L.push('- **길게 가져갈 팁:** (조급해하지 말고 꾸준히 할 행동 1줄)');
    L.push('');
    [
      '## 1. 요즘 큰 흐름 요약 — 3~4문장. 오래가는 것(해왕성·명왕성·천왕성·토성)과 몇 주짜리(목성)를 구분해서',
      '## 2. 연애·관계 — 2~3문장 (신호가 약하면 1~2문장)',
      '## 3. 일·커리어 — 2~3문장 (신호가 약하면 1~2문장)',
      '## 4. 금전·재물 — 2~3문장 (종목·수익률 단정 금지)',
      '## 5. 건강·에너지 — 2~3문장 (의학 진단 아님)',
      '## 6. 배움·성장 — 2~3문장 (신호가 약하면 1~2문장)',
      '## 7. 큰 흐름 실천 포인트 — 조급함 없이 가져갈 행동 2~3가지 (불릿)',
    ].forEach((x) => L.push(x));
  }
  L.push('반드시 0번 브리핑과 7번까지 완성하고 중간에 끊지 마세요.');
  L.push('');
  return L;
}

function assertPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('payload가 필요합니다.');
}

function buildYearAiPrompt(payload) {
  assertPayload(payload);
  const yearKey = clip(payload.yearKey, 8);
  if (!/^\d{4}$/.test(yearKey)) throw new Error('yearKey가 필요합니다.');
  const chartLines = sanitizeLines(payload.chartLines, 60);
  const yearLines = sanitizeLines(payload.yearLines, 40);
  if (!chartLines.length || !yearLines.length) throw new Error('올해 운세 데이터가 필요합니다.');
  return yearInstructionLines().concat(chartLines, [''], yearLines).join('\n');
}

function buildTransitAiPrompt(payload) {
  assertPayload(payload);
  const mode = payload.mode === 'slow' ? 'slow' : payload.mode === 'fast' ? 'fast' : '';
  if (!mode) throw new Error('mode가 필요합니다.');
  const chartLines = sanitizeLines(payload.chartLines, 60);
  const transitLines = sanitizeLines(payload.transitLines, 50);
  if (!chartLines.length || !transitLines.length) throw new Error('트랜짓 데이터가 필요합니다.');
  return transitInstructionLines(mode).concat(chartLines, [''], transitLines).join('\n');
}

function resolveTransitCacheRaw(payload) {
  assertPayload(payload);
  const mode = payload.mode === 'slow' ? 'slow' : payload.mode === 'fast' ? 'fast' : '';
  if (!mode) throw new Error('mode가 필요합니다.');
  const aspectKey = clip(payload.aspectKey, 200);
  const dstr = clip(payload.dstr, 40);
  const stamp = clip(payload.stamp, 200);
  if (aspectKey && stamp) return 'v6:' + mode + ':' + aspectKey + ':' + dstr + ':' + stamp;
  const prompt = buildTransitAiPrompt(payload);
  return 'v6:' + mode + ':fallback:' + prompt.slice(0, 120);
}

function resolveAstroFlowCacheKey(feature, payload) {
  if (feature === 'astro_year') {
    const yearKey = clip(payload && payload.yearKey, 8);
    const prompt = buildYearAiPrompt(payload);
    return clientHashKey('v3:year:' + yearKey + ':' + prompt);
  }
  if (feature === 'astro_transit') {
    return clientHashKey(resolveTransitCacheRaw(payload));
  }
  throw new Error('unknown_astro_flow_feature');
}

function buildAstroFlowPrompt(feature, payload) {
  if (feature === 'astro_year') return buildYearAiPrompt(payload);
  if (feature === 'astro_transit') return buildTransitAiPrompt(payload);
  throw new Error('unknown_astro_flow_feature');
}

function buildAstroFlowCachedMessages(feature, payload) {
  const full = buildAstroFlowPrompt(feature, payload);
  const markers = ['\n[출생 차트]\n', '\n[출생 차트]'];
  for (let i = 0; i < markers.length; i += 1) {
    const idx = full.indexOf(markers[i]);
    if (idx >= 200) {
      return [
        {
          role: 'user',
          content: [
            { type: 'text', text: full.slice(0, idx), cache_control: { type: 'ephemeral' } },
            { type: 'text', text: full.slice(idx) },
          ],
        },
      ];
    }
  }
  return [{ role: 'user', content: full }];
}

module.exports = {
  clientHashKey,
  buildYearAiPrompt,
  buildTransitAiPrompt,
  buildAstroFlowPrompt,
  buildAstroFlowCachedMessages,
  resolveAstroFlowCacheKey,
  resolveTransitCacheRaw,
  yearInstructionLines,
  transitInstructionLines,
};

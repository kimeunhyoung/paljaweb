/**
 * 점성학 AI 프롬프트 — 서버 전용 (클라이언트로 내려보내지 않음)
 */

function str(v) {
  return String(v == null ? '' : v).trim();
}

/**
 * @param {object} payload
 * @returns {string}
 */
function buildAstroChartPrompt(payload) {
  const p = payload && typeof payload === 'object' ? payload : null;
  if (!p) throw new Error('차트 데이터가 필요합니다.');

  const sun = str(p.sun);
  const moon = str(p.moon);
  if (!sun) throw new Error('태양 별자리가 필요합니다.');

  const L = [];
  L.push(
    '당신은 따뜻하고 통찰력 있는 전문 점성가입니다. 아래 출생 차트를 바탕으로 전문 용어는 쉽게 풀어 한국어로 해석해 주세요. 단정적 예언·공포 조장은 금지하고, 참고용 자기이해 톤으로 다정하게 써 주세요. 건강은 의학적 진단이 아닌 생활·에너지·스트레스 관리 관점으로만 다루세요. 트랜짓·올해 운세·이번 주 운세는 이 요청에 포함하지 마세요.',
  );
  L.push('');
  L.push('[출생 차트]');
  if (str(p.displayName)) L.push('이름: ' + str(p.displayName));
  L.push(
    '태양: ' +
      sun +
      (moon ? ' / 달: ' + moon : '') +
      (str(p.asc) ? ' / 상승궁: ' + str(p.asc) : ' / 상승궁: (출생시간 미상)'),
  );

  const planets = Array.isArray(p.planets) ? p.planets : [];
  if (planets.length) {
    L.push('행성 배치:');
    planets.forEach((row) => {
      if (!row || !str(row.ko) || !str(row.sign)) return;
      L.push(
        ' - ' +
          str(row.ko) +
          ': ' +
          str(row.sign) +
          (row.house ? ' / ' + row.house + '하우스' : '') +
          (row.retro ? ' (역행)' : ''),
      );
    });
  }

  const e = p.elements && typeof p.elements === 'object' ? p.elements : null;
  const m = p.modal && typeof p.modal === 'object' ? p.modal : null;
  if (e) {
    L.push(
      '원소 균형: 불 ' +
        (e['불'] ?? e.fire ?? 0) +
        ', 흙 ' +
        (e['흙'] ?? e.earth ?? 0) +
        ', 바람 ' +
        (e['바람'] ?? e.air ?? 0) +
        ', 물 ' +
        (e['물'] ?? e.water ?? 0),
    );
  }
  if (m) {
    L.push(
      '모달리티: 활동 ' +
        (m['활동'] ?? m.cardinal ?? 0) +
        ', 고정 ' +
        (m['고정'] ?? m.fixed ?? 0) +
        ', 변통 ' +
        (m['변통'] ?? m.mutable ?? 0),
    );
  }

  const aspects = Array.isArray(p.aspects)
    ? p.aspects.map((a) => str(a)).filter(Boolean)
    : [];
  if (aspects.length) {
    L.push('주요 어스펙트: ' + aspects.join(', '));
  }

  L.push('');
  L.push('[작성 형식 — 반드시 지키세요]');
  L.push(
    '1) ## 제목만 사용(### 소제목·이모지 남발 금지). 아래 순서대로 **모든 해당 섹션**을 빠짐없이 작성하세요.',
  );
  [
    '## 성격 요약 — 빅3(태양·달·상승)과 원소·모달리티를 연결해 타고난 기질',
    '## 강점 — 차트·어스펙트 근거를 들어 구체적으로',
    '## 과제·성장 포인트 — 긴장 각(사각·충)이나 과제 행성을 부드럽게',
    '## 연애·관계 — 금성·달·7하우스·관계 어스펙트(타고난 성향)',
    '## 일·적성·커리어 — MC·6·10하우스, 토성·화성·태양 등',
    '## 금전·재물운 — 2·8하우스, 금성·목성·토성, 수입·지출·저축 성향',
    '## 건강·에너지 관리 — 6하우스·화성·달·태양, 스트레스·회복·생활 리듬 (의학 진단 아님)',
    '## 학업·성장 — 3·9하우스, 수성·목성, 배움 스타일·집중·시험·자격·깊이 있는 공부',
  ].forEach((s, i) => L.push(`   ${i + 1}. ${s}`));
  L.push(
    '2) 각 섹션 **3~4문장**. 차트 근거(행성·별자리·하우스·어스펙트)를 최소 1개 이상 언급하세요. 같은 내용 반복 금지.',
  );
  L.push('3) 반드시 마지막 섹션까지 완성하고 중간에 끊지 마세요.');
  return L.join('\n');
}

module.exports = {
  buildAstroChartPrompt,
};

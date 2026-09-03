
const MAX_STR = 4000;
const MAX_NOTE = 8000;
const MAX_CARDS = 12;
const MAX_GUIDE = 14000;
const SPREAD_RULE_KEYS = ['choice_ab', 'love9', 'seven', 'horseshoe', 'love', 'choice', 'block'];

const SYSTEM_CARD = PROMPTS.SYSTEM_CARD;
const SYSTEM_INTEGRATED = PROMPTS.SYSTEM_INTEGRATED;
const SPREAD_RULES = PROMPTS.SPREAD_RULES;
const LENGTH_BUDGET = PROMPTS.LENGTH_BUDGET;
const LENORMAND_SYSTEM = PROMPTS.LENORMAND_SYSTEM;
const ICHING_SYSTEM = PROMPTS.ICHING_SYSTEM;
const ICHING_CHOICE = PROMPTS.ICHING_CHOICE;
const KIRKE_SYSTEM = PROMPTS.KIRKE_SYSTEM;

function clip(s, n) {
  const t = String(s == null ? '' : s);
  return t.length > n ? t.slice(0, n) : t;
}

function escAttr(s) {
  return String(s == null ? '' : s).replace(/"/g, '');
}

function requireObj(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('invalid_payload');
  }
  return payload;
}

function normalizeCards(raw) {
  if (!Array.isArray(raw) || !raw.length) throw new Error('cards_required');
  if (raw.length > MAX_CARDS) throw new Error('too_many_cards');
  return raw.map(function (c, i) {
    if (!c || typeof c !== 'object') throw new Error('invalid_card');
    return {
      pos: clip(c.pos != null ? c.pos : i + 1, 80),
      num: c.num != null ? c.num : c.id,
      name: clip(c.name, 120),
      rev: !!(c.rev || c.faceRev),
      keywords: clip(c.keywords, 500),
      en: clip(c.en, 120),
      han: clip(c.han, 40),
      guideText: clip(c.guideText, MAX_GUIDE),
      extra: !!c.extra,
    };
  });
}

function expectedCounselorSessionFeature(cardCount, readingDepth) {
  const integrated = readingDepth === 'integrated';
  const n = Number(cardCount) || 1;
  if (n <= 1) return integrated ? 'counselor_integrated_basic' : 'counselor_session_basic';
  if (n <= 3) return integrated ? 'counselor_integrated' : 'counselor_session';
  if (n <= 6) return integrated ? 'counselor_integrated_plus' : 'counselor_session_plus';
  return integrated ? 'counselor_integrated_full' : 'counselor_session_full';
}

function expectedLenormandFeature(n) {
  if (n <= 1) return 'counselor_lenormand_basic';
  if (n <= 3) return 'counselor_lenormand';
  return 'counselor_lenormand_plus';
}

function expectedIchingFeature(n) {
  if (n <= 1) return 'counselor_iching_basic';
  if (n <= 2) return 'counselor_iching';
  return 'counselor_iching_plus';
}

function expectedKirkeFeature(n) {
  if (n <= 1) return 'counselor_kirke_basic';
  if (n <= 3) return 'counselor_kirke';
  return 'counselor_kirke_plus';
}

function assertFeatureMatch(feature, expected) {
  if (feature !== expected) throw new Error('feature_card_mismatch');
}

function classifyPos(label) {
  const t = String(label || '');
  if (/도움\s*안|방해|장애|경고|주의|하지\s*말|약점|리스크/.test(t)) return 'unhelpful';
  if (/도움|조언|기회|강점|명확|보완|해야/.test(t)) return 'helpful';
  return 'neutral';
}

function cardXmlLine(c) {
  return (
    c.num +
    '. ' +
    c.name +
    (c.rev ? ' (역방향)' : ' (정방향)') +
    (c.keywords ? ' — ' + c.keywords : '')
  );
}

function buildSpreadXml(cards) {
  return cards
    .map(function (c) {
      const kind = classifyPos(c.pos);
      const line = cardXmlLine(c);
      if (kind === 'helpful') return '  <helpful>포지션「' + c.pos + '」: ' + line + '</helpful>';
      if (kind === 'unhelpful') return '  <unhelpful>포지션「' + c.pos + '」: ' + line + '</unhelpful>';
      return '  <card pos="' + escAttr(c.pos) + '">' + line + '</card>';
    })
    .join('\n');
}

function inferCustomSpreadRuleKey(pj) {
  if (/A\s*(전개|선택)|B\s*(전개|선택)/.test(pj)) return 'choice_ab';
  if (/내가\s*상대를\s*보는\s*눈|상대가\s*나를\s*보는\s*눈|내가\s*상대에게\s*바라는/.test(pj)) return 'love9';
  if (/외부\s*영향/.test(pj) && /희망/.test(pj)) return 'horseshoe';
  if (/장애/.test(pj) && /환경/.test(pj) && /과거/.test(pj)) return 'seven';
  if (/내\s*마음/.test(pj) && /상대\s*마음/.test(pj) && /관계\s*흐름/.test(pj)) return 'love';
  if (
    /상황/.test(pj) &&
    /(^|\|)선택($|\|)/.test(pj) &&
    /결과/.test(pj) &&
    !/A\s*선택|B\s*선택|A\s*결과|B\s*결과/.test(pj)
  ) {
    return 'choice';
  }
  if (/원인/.test(pj) && /장애/.test(pj) && /돌파/.test(pj)) return 'block';
  return '';
}

function formatChips(chips) {
  if (!Array.isArray(chips)) return '';
  return chips
    .slice(0, 20)
    .map(function (ch) {
      if (!ch || typeof ch !== 'object') return '';
      return (
        '    <chip kind="' +
        escAttr(ch.label) +
        '" value="' +
        escAttr(ch.num) +
        '"' +
        (ch.title ? ' title="' + escAttr(ch.title) + '"' : '') +
        '>' +
        clip(ch.blurb, 400) +
        '</chip>'
      );
    })
    .filter(Boolean)
    .join('\n');
}

function buildIntegratedContext(integrated) {
  if (!integrated || typeof integrated !== 'object') return '';
  const numB = integrated.numerology;
  const astB = integrated.astrology;
  var xml =
    '- 해석 깊이: 통합(수비·점성) — 타로가 본체, 수비·점성은 렌즈. 전용 섹션·말미 나열 금지.\n';
  if (numB && numB.ok) {
    xml +=
      '<numerology_brief birth="' +
      escAttr(numB.birth) +
      '">\n' +
      formatChips(numB.chips) +
      '\n  </numerology_brief>\n';
  }
  if (astB && astB.ok) {
    xml +=
      '<astrology_brief sun="' +
      escAttr(astB.sunKo) +
      '" element="' +
      escAttr(astB.sunElement) +
      '" time="' +
      escAttr(astB.time || '미상') +
      '" city="' +
      escAttr(astB.city || '미상') +
      '">\n' +
      formatChips(astB.chips) +
      '\n    <note>' +
      clip(astB.tip, 500) +
      '</note>\n  </astrology_brief>\n';
  }
  return xml;
}

function buildReadingPrompt(feature, payload) {
  const p = requireObj(payload);
  const cards = normalizeCards(p.cards);
  const readingDepth = p.readingDepth === 'integrated' ? 'integrated' : 'card';
  assertFeatureMatch(feature, expectedCounselorSessionFeature(cards.length, readingDepth));

  const mode = p.mode === 'basic' ? 'basic' : 'advanced';
  const spreadId = clip(p.spreadId || (mode === 'basic' ? 'basic_one' : 'custom'), 64);
  const displayName = clip(p.displayName || '고객님', 80);
  const question = clip(p.question, MAX_STR);
  if (!question) throw new Error('question_required');
  const topicLabel = clip(p.topicLabel || '', 80);
  const note = clip(p.note, MAX_NOTE);
  const priorXml = clip(p.priorXml, 4000);
  const clientMeta = p.clientMeta && typeof p.clientMeta === 'object' ? p.clientMeta : null;

  const posJoin = cards.map(function (c) { return c.pos; }).join('|');
  var spreadRuleKey = '';
  if (mode === 'advanced') {
    if (SPREAD_RULE_KEYS.indexOf(spreadId) >= 0) spreadRuleKey = spreadId;
    else if (spreadId === 'custom') spreadRuleKey = inferCustomSpreadRuleKey(posJoin);
  }
  const spreadRuleDirective =
    spreadRuleKey && SPREAD_RULES[spreadRuleKey] ? SPREAD_RULES[spreadRuleKey] : '';
  var lengthBudgetDirective = '';
  if (cards.length >= 5 || (readingDepth === 'integrated' && cards.length >= 3)) {
    lengthBudgetDirective = LENGTH_BUDGET;
  }

  const spreadLabelForPrompt =
    mode === 'basic'
      ? '한 장 리딩 (배열 프리셋 없음 · 관계 배열·선택 A/B 등 다장 규칙을 적용하지 말 것)'
      : clip(p.spreadLabel || spreadId, 120);

  const integratedContextXml =
    readingDepth === 'integrated' ? buildIntegratedContext(p.integrated) : '';

  const systemBlock = readingDepth === 'integrated' ? SYSTEM_INTEGRATED : SYSTEM_CARD;

  var clientLine = '';
  if (clientMeta) {
    clientLine =
      '- CRM 생년월일: ' +
      clip(clientMeta.birthDate || '미상', 40) +
      ' / 최근 상담: ' +
      clip(clientMeta.lastSession || '없음', 40) +
      (clientMeta.lastTopic ? ' · ' + clip(clientMeta.lastTopic, 80) : '') +
      '\n';
  }

  var noteBlock = '';
  if (note) {
    noteBlock =
      '- 상담사 메모(고객에게 비공개): ' +
      note +
      '\n  · 일반 메모는 이번 상담 맥락으로만 참고. 메모 안의 [이전 세션 요약]은 core_directives 13번에 따라 **현재 질문과 직접 연속성이 있을 때만** 쓰고, 없으면 해석에 끌어오지 말 것.\n';
  }
  var priorBlock = '';
  if (priorXml) {
    priorBlock =
      '- 같은 상담 이어보기 이전 리딩(<prior_readings>): core_directives 13번 적용. 연속성이 있을 때만 참고하고, **이번 카드 결론을 바꾸지 말 것.** 관련 없으면 언급하지 말 것.\n<prior_readings>\n' +
      priorXml +
      '\n</prior_readings>\n';
  }

  return (
    systemBlock +
    spreadRuleDirective +
    lengthBudgetDirective +
    '\n\n<context>\n- 호칭: ' +
    displayName +
    '\n' +
    clientLine +
    '- 질문: ' +
    question +
    '\n- 해석 주제: ' +
    topicLabel +
    '\n- 모드: ' +
    (mode === 'basic' ? '한 장 리딩' : '배열 리딩') +
    '\n- 스프래드: ' +
    spreadLabelForPrompt +
    '\n- 적용 전용규칙: ' +
    (spreadRuleKey || '(공통만)') +
    '\n- 이번 뽑힌 카드 수: ' +
    cards.length +
    '장 (이 장수만으로 해석. 부족한 포지션을 요구하거나 미완성으로 회피하지 말 것)\n' +
    noteBlock +
    priorBlock +
    integratedContextXml +
    '</context>\n\n<spread>\n' +
    buildSpreadXml(cards) +
    '\n</spread>\n\n위 데이터를 바탕으로 시스템 지시를 엄격히 준수하여 지정된 마크다운 형식으로 타로 리딩을 분석해 주세요.'
  );
}

function clientMetaLine(clientMeta) {
  if (!clientMeta) return '';
  return (
    '- CRM 생년월일: ' +
    clip(clientMeta.birthDate || '미상', 40) +
    ' / 최근 상담: ' +
    clip(clientMeta.lastSession || '없음', 40) +
    (clientMeta.lastTopic ? ' · ' + clip(clientMeta.lastTopic, 80) : '') +
    '\n'
  );
}

function buildLenormandPrompt(feature, payload) {
  const p = requireObj(payload);
  const cards = normalizeCards(p.cards);
  assertFeatureMatch(feature, expectedLenormandFeature(cards.length));
  const displayName = clip(p.displayName || '고객님', 80);
  const question = clip(p.question, MAX_STR);
  if (!question) throw new Error('question_required');
  const note = clip(p.note, MAX_NOTE);
  const spreadTitle = clip((p.spread && p.spread.title) || '레노먼드', 120);
  const spreadLabels = Array.isArray(p.spread && p.spread.labels)
    ? p.spread.labels.map(function (x) { return clip(x, 40); }).join(' · ')
    : '';
  const cardLines = cards
    .map(function (c) {
      return c.pos + ': ' + c.num + '. ' + c.name + (c.keywords ? ' — ' + c.keywords : '');
    })
    .join('\n');
  return (
    LENORMAND_SYSTEM +
    '\n\n<context>\n- 호칭: ' +
    displayName +
    '\n' +
    clientMetaLine(p.clientMeta) +
    '- 질문: ' +
    question +
    '\n' +
    (note ? '- 상담사 메모(고객에게 노출 금지, 반영만): ' + note + '\n' : '') +
    '- 스프래드: ' +
    spreadTitle +
    (spreadLabels ? ' (' + spreadLabels + ')' : '') +
    '\n</context>\n\n<spread>\n' +
    cardLines +
    '\n</spread>\n\n위 데이터를 바탕으로 시스템 지시를 엄격히 준수하여 지정된 마크다운 형식으로 레노먼드 조합·체인 리딩 초안을 작성해 주세요.'
  );
}

function buildIchingPrompt(feature, payload) {
  const p = requireObj(payload);
  const cards = normalizeCards(p.cards);
  assertFeatureMatch(feature, expectedIchingFeature(cards.length));
  const mode = p.mode === 'choice' ? 'choice' : clip(p.mode || 'pair', 32);
  const displayName = clip(p.displayName || '고객님', 80);
  const question = clip(p.question, MAX_STR);
  if (!question) throw new Error('question_required');
  const note = clip(p.note, MAX_NOTE);
  const spreadTitle = clip((p.spread && p.spread.title) || '주역', 120);
  const spreadLabels = Array.isArray(p.spread && p.spread.labels)
    ? p.spread.labels.map(function (x) { return clip(x, 40); }).join(' · ')
    : '';
  const optionA = clip((p.options && p.options.a) || '선택 A', 80);
  const optionB = clip((p.options && p.options.b) || '선택 B', 80);
  const changing = clip(
    p.changingLinesText ||
      (Array.isArray(p.changingLines) ? p.changingLines.join(', ') : '없음'),
    120
  );
  const cardLines = cards
    .map(function (c) {
      return (
        c.pos +
        ': ' +
        c.num +
        '. ' +
        c.name +
        (c.han ? ' (' + c.han + ')' : '') +
        (c.keywords ? ' — ' + c.keywords : '')
      );
    })
    .join('\n');
  const choiceDirective = mode === 'choice' ? ICHING_CHOICE : '';
  return (
    ICHING_SYSTEM +
    choiceDirective +
    '\n\n<context>\n- 호칭: ' +
    displayName +
    '\n' +
    clientMetaLine(p.clientMeta) +
    '- 질문: ' +
    question +
    '\n' +
    (note ? '- 상담사 메모(고객에게 노출 금지, 반영만): ' + note + '\n' : '') +
    '- 리딩: ' +
    spreadTitle +
    (spreadLabels ? ' (' + spreadLabels + ')' : '') +
    '\n' +
    (mode === 'choice' ? '- 선택 A: ' + optionA + '\n- 선택 B: ' + optionB + '\n' : '') +
    '- 변효: ' +
    changing +
    '\n</context>\n\n<hexagrams>\n' +
    cardLines +
    '\n</hexagrams>\n\n위 데이터를 바탕으로 시스템 지시를 엄격히 준수하여 지정된 마크다운 형식으로 주역 리딩 초안을 작성해 주세요.'
  );
}

function buildKirkePrompt(feature, payload) {
  const p = requireObj(payload);
  const cards = normalizeCards(p.cards);
  assertFeatureMatch(feature, expectedKirkeFeature(cards.length));
  const displayName = clip(p.displayName || '고객님', 80);
  const question = clip(p.question, MAX_STR);
  if (!question) throw new Error('question_required');
  const note = clip(p.note, MAX_NOTE);
  const topicId = clip(p.topicId || 'general', 40);
  const topicLabel = clip(p.topicLabel || topicId, 80);
  const spreadTitle = clip((p.spread && p.spread.title) || '오디세이신화타로', 120);
  const spreadLabels = Array.isArray(p.spread && p.spread.labels)
    ? p.spread.labels.map(function (x) { return clip(x, 40); }).join(' · ')
    : '';
  const cardLines = cards
    .map(function (c) {
      return (
        c.pos +
        ': ' +
        c.num +
        '. ' +
        c.name +
        (c.en ? ' (' + c.en + ')' : '') +
        (c.keywords ? ' — ' + c.keywords : '')
      );
    })
    .join('\n');
  const guideBlocks = cards
    .map(function (c, idx) {
      const guide = c.guideText || '키워드: ' + (c.keywords || '');
      return (
        '<card pos="' +
        escAttr(c.pos || idx + 1 + '장') +
        '" id="' +
        escAttr(c.num) +
        '" name="' +
        escAttr(c.name) +
        '">\n' +
        guide +
        '\n</card>'
      );
    })
    .join('\n\n');
  return (
    KIRKE_SYSTEM +
    '\n\n<context>\n- 호칭: ' +
    displayName +
    '\n' +
    clientMetaLine(p.clientMeta) +
    '- 질문: ' +
    question +
    '\n- 해설 주제: ' +
    topicLabel +
    ' (' +
    topicId +
    ')\n' +
    (note ? '- 상담사 메모(고객에게 노출 금지, 반영만): ' + note + '\n' : '') +
    '- 스프래드: ' +
    spreadTitle +
    (spreadLabels ? ' (' + spreadLabels + ')' : '') +
    '\n</context>\n\n<spread>\n' +
    cardLines +
    '\n</spread>\n\n<guidebook_excerpts>\n' +
    guideBlocks +
    '\n</guidebook_excerpts>\n\n위 데이터를 바탕으로 시스템 지시를 엄격히 준수하여 지정된 마크다운 형식으로 오디세이신화타로 리딩 초안을 작성해 주세요.'
  );
}

function buildCounselorPrompt(feature, payload) {
  if (
    feature === 'counselor_session' ||
    feature === 'counselor_session_basic' ||
    feature === 'counselor_session_plus' ||
    feature === 'counselor_session_full' ||
    feature === 'counselor_integrated' ||
    feature === 'counselor_integrated_basic' ||
    feature === 'counselor_integrated_plus' ||
    feature === 'counselor_integrated_full'
  ) {
    return buildReadingPrompt(feature, payload);
  }
  if (
    feature === 'counselor_lenormand' ||
    feature === 'counselor_lenormand_basic' ||
    feature === 'counselor_lenormand_plus'
  ) {
    return buildLenormandPrompt(feature, payload);
  }
  if (
    feature === 'counselor_iching' ||
    feature === 'counselor_iching_basic' ||
    feature === 'counselor_iching_plus'
  ) {
    return buildIchingPrompt(feature, payload);
  }
  if (
    feature === 'counselor_kirke' ||
    feature === 'counselor_kirke_basic' ||
    feature === 'counselor_kirke_plus'
  ) {
    return buildKirkePrompt(feature, payload);
  }
  throw new Error('unknown_counselor_feature');
}

function buildCounselorCachedMessages(feature, payload) {
  const full = buildCounselorPrompt(feature, payload);
  return [{ role: 'user', content: full }];
}

module.exports = {
  buildCounselorPrompt,
  buildCounselorCachedMessages,
  expectedCounselorSessionFeature,
  expectedLenormandFeature,
  expectedIchingFeature,
  expectedKirkeFeature,
};

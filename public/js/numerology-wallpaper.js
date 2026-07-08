/**
 * 수비학 에너지 넘버 폰 배경화면 생성기
 */

const NUMBER_META = {
  1: { key: "시작", line: "내가 먼저 움직이는 힘", sub: "주도 · 독립 · 새 출발" },
  2: { key: "조율", line: "함께 맞추며 흐름을 여는 힘", sub: "협력 · 직관 · 관계" },
  3: { key: "표현", line: "마음을 밖으로 꺼내는 힘", sub: "창의 · 소통 · 기획" },
  4: { key: "정리", line: "뿌리를 다지는 힘", sub: "안정 · 루틴 · 실무" },
  5: { key: "변화", line: "새 바람을 받아들이는 힘", sub: "자유 · 적응 · 탐험" },
  6: { key: "돌봄", line: "관계와 공간을 따뜻하게 하는 힘", sub: "책임 · 조화 · 배려" },
  7: { key: "통찰", line: "깊이 들여다보는 힘", sub: "성찰 · 탐구 · 내면" },
  8: { key: "성과", line: "결실로 남기는 힘", sub: "성취 · 실행 · 현실" },
  9: { key: "마무리", line: "비우고 다음을 여는 힘", sub: "완성 · 정리 · 관용" },
  11: { key: "영감", line: "직관이 깨어나는 힘", sub: "마스터 · 영감 · 직관" },
  22: { key: "구현", line: "큰 그림을 현실로 옮기는 힘", sub: "마스터 · 설계 · 건설" },
  33: { key: "치유", line: "나눔으로 균형을 찾는 힘", sub: "마스터 · 돌봄 · 치유" },
};

const NUMBER_THEME = {
  1: { bg0: "#120a08", bg1: "#3d1f14", accent: "#f0b48a", glow: "#ff6b45" },
  2: { bg0: "#0a1018", bg1: "#1a3352", accent: "#b8d4f0", glow: "#5a9fd4" },
  3: { bg0: "#141008", bg1: "#3d3010", accent: "#f0d878", glow: "#e8b030" },
  4: { bg0: "#10100c", bg1: "#2a2418", accent: "#c8b898", glow: "#8b7355" },
  5: { bg0: "#081210", bg1: "#123832", accent: "#88d4c8", glow: "#3cb8a0" },
  6: { bg0: "#140c10", bg1: "#3a2030", accent: "#f0b8c8", glow: "#d87898" },
  7: { bg0: "#0c0818", bg1: "#281848", accent: "#c8b0f0", glow: "#8868d8" },
  8: { bg0: "#100c08", bg1: "#302418", accent: "#e8c878", glow: "#c89838" },
  9: { bg0: "#080c14", bg1: "#182840", accent: "#a8c0e8", glow: "#5888c8" },
  11: { bg0: "#100818", bg1: "#301850", accent: "#e0c0ff", glow: "#a070e8" },
  22: { bg0: "#0c0c10", bg1: "#242830", accent: "#c0c8d8", glow: "#7888a8" },
  33: { bg0: "#140810", bg1: "#381828", accent: "#f0c0d8", glow: "#d888a8" },
};

const COLOR_PRESETS = {
  midnight: { label: "미드나잇", bg0: "#050810", bg1: "#121828", accent: "#8aa8e8", glow: "#5070c0" },
  dawn: { label: "새벽", bg0: "#1a1008", bg1: "#4a3020", accent: "#f0c090", glow: "#e89050" },
  forest: { label: "포레스트", bg0: "#081210", bg1: "#143028", accent: "#90d8b8", glow: "#40a878" },
  rose: { label: "로즈", bg0: "#180810", bg1: "#381828", accent: "#f0a8c0", glow: "#d06088" },
  sand: { label: "샌드", bg0: "#141008", bg1: "#302818", accent: "#d8c8a0", glow: "#a89060" },
  violet: { label: "바이올렛", bg0: "#100818", bg1: "#281840", accent: "#c8a8f0", glow: "#8860d0" },
};

const MODE_LABEL = {
  missing: "보완 에너지",
  name_missing: "이름 보완 에너지",
  today: "오늘의 에너지",
  year: "올해의 에너지",
  lifepath: "인생여정수",
  destiny: "운명수",
  soul: "혼의수",
  personality: "성격수",
};

const NAME_MODES = new Set(["name_missing", "destiny", "soul", "personality"]);

const LAYOUT = {
  phone: {
    titleY: 0.16, modeY: 0.19, numY: 0.42, keyY: 0.61, subY: 0.65, lineY: 0.695,
    brandY: 0.935, numSize: 460, gridY: 0.72, gridCell: 96,
  },
  square: {
    titleY: 0.1, modeY: 0.13, numY: 0.38, keyY: 0.61, subY: 0.65, lineY: 0.70,
    brandY: 0.93, numSize: 320, gridY: 0.78, gridCell: 72,
  },
};

const state = {
  birthDate: "",
  name: "",
  mode: "missing",
  pickNum: null,
  mood: "classic",
  colorPreset: "auto",
  aspect: "phone",
};

const birthInput = document.getElementById("birthDateInput");
const nameInput = document.getElementById("nameInput");
const modeInputs = document.querySelectorAll('input[name="energyMode"]');
const pickRow = document.getElementById("pickRow");
const pickSelect = document.getElementById("pickSelect");
const moodInputs = document.querySelectorAll('input[name="wallMood"]');
const colorInputs = document.querySelectorAll('input[name="colorPreset"]');
const aspectInputs = document.querySelectorAll('input[name="wallAspect"]');
const previewCanvas = document.getElementById("previewCanvas");
const hintEl = document.getElementById("hint");
const metaEl = document.getElementById("metaInfo");
const downloadBtn = document.getElementById("downloadBtn");
const generateBtn = document.getElementById("generateBtn");

function getCanvasSize() {
  if (state.aspect === "square") return { w: 1080, h: 1080 };
  return { w: 1080, h: 1920 };
}

function sumDigits(numLike) {
  return String(numLike)
    .replace(/\D/g, "")
    .split("")
    .reduce((acc, cur) => acc + Number(cur), 0);
}

function reduceNumber(value, allowMaster = true) {
  let n = Number(value) || 0;
  while (n > 9) {
    if (allowMaster && (n === 11 || n === 22 || n === 33)) return n;
    n = sumDigits(n);
  }
  return n;
}

function parseBirthDate(inputValue) {
  if (!inputValue) return null;
  const m = String(inputValue).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return { y, m: mo, d };
}

function hasHangul(str) {
  return /[가-힣]/.test(str);
}

function withPreSum(pre) {
  return { pre, single: reduceNumber(pre, true) };
}

function analyzeEnglishName(nameStr) {
  const map = {
    1: ["a", "j", "s"], 2: ["b", "k", "t"], 3: ["c", "l", "u"], 4: ["d", "m", "v"],
    5: ["e", "n", "w"], 6: ["f", "o", "x"], 7: ["g", "p", "y"], 8: ["h", "q", "z"], 9: ["i", "r"],
  };
  const vowels = new Set(["a", "e", "i", "o", "u"]);
  const lookup = {};
  Object.keys(map).forEach((k) => map[k].forEach((ch) => { lookup[ch] = Number(k); }));
  const letters = nameStr.toLowerCase().replace(/[^a-z]/g, "").split("").filter(Boolean);
  if (!letters.length) return null;

  const exprPre = letters.reduce((sum, ch) => sum + (lookup[ch] || 0), 0);
  const soulPre = letters.reduce((sum, ch) => sum + (vowels.has(ch) ? (lookup[ch] || 0) : 0), 0);
  const personalityPre = letters.reduce((sum, ch) => sum + (!vowels.has(ch) ? (lookup[ch] || 0) : 0), 0);

  return {
    expression: withPreSum(exprPre),
    soul: withPreSum(soulPre),
    personality: withPreSum(personalityPre),
  };
}

function analyzeHangulName(nameStr) {
  const initial = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
  const medial = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
  const final = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
  const consMap = { "ㄱ": 1, "ㄲ": 1, "ㄴ": 2, "ㄷ": 3, "ㄸ": 3, "ㄹ": 4, "ㅁ": 5, "ㅂ": 6, "ㅃ": 6, "ㅅ": 7, "ㅆ": 7, "ㅇ": 8, "ㅈ": 9, "ㅉ": 9, "ㅊ": 1, "ㅋ": 2, "ㅌ": 3, "ㅍ": 4, "ㅎ": 5 };
  const vowelMap = { "ㅏ": 1, "ㅑ": 2, "ㅓ": 3, "ㅕ": 4, "ㅗ": 5, "ㅛ": 6, "ㅜ": 7, "ㅠ": 8, "ㅡ": 9, "ㅣ": 1, "ㅐ": 2, "ㅒ": 3, "ㅔ": 4, "ㅖ": 5, "ㅘ": 6, "ㅙ": 7, "ㅚ": 8, "ㅝ": 9, "ㅞ": 1, "ㅟ": 2, "ㅢ": 3 };

  let exprPre = 0;
  let soulPre = 0;
  let personalityPre = 0;
  let counted = false;

  for (const ch of [...nameStr]) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const sIndex = code - 0xac00;
      const cho = initial[Math.floor(sIndex / 588)];
      const jung = medial[Math.floor((sIndex % 588) / 28)];
      const jong = final[sIndex % 28];
      const choVal = consMap[cho] || 0;
      const jungVal = vowelMap[jung] || 0;
      const jongVal = consMap[jong] || 0;
      exprPre += choVal + jungVal + jongVal;
      soulPre += jungVal;
      personalityPre += choVal + jongVal;
      counted = true;
      continue;
    }
    if (consMap[ch] || vowelMap[ch]) {
      const cVal = consMap[ch] || 0;
      const vVal = vowelMap[ch] || 0;
      exprPre += cVal + vVal;
      soulPre += vVal;
      personalityPre += cVal;
      counted = true;
    }
  }

  if (!counted) return null;
  return {
    expression: withPreSum(exprPre),
    soul: withPreSum(soulPre),
    personality: withPreSum(personalityPre),
  };
}

function analyzeNameNumerology(nameStr) {
  const trimmed = String(nameStr || "").trim();
  if (!trimmed) return null;
  if (hasHangul(trimmed)) return analyzeHangulName(trimmed);
  return analyzeEnglishName(trimmed);
}

function collectNameLetterDigits(nameStr) {
  const set = new Set();
  const trimmed = String(nameStr || "").trim();
  if (!trimmed) return set;

  if (hasHangul(trimmed)) {
    const initial = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
    const medial = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
    const final = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
    const consMap = { "ㄱ": 1, "ㄲ": 1, "ㄴ": 2, "ㄷ": 3, "ㄸ": 3, "ㄹ": 4, "ㅁ": 5, "ㅂ": 6, "ㅃ": 6, "ㅅ": 7, "ㅆ": 7, "ㅇ": 8, "ㅈ": 9, "ㅉ": 9, "ㅊ": 1, "ㅋ": 2, "ㅌ": 3, "ㅍ": 4, "ㅎ": 5 };
    const vowelMap = { "ㅏ": 1, "ㅑ": 2, "ㅓ": 3, "ㅕ": 4, "ㅗ": 5, "ㅛ": 6, "ㅜ": 7, "ㅠ": 8, "ㅡ": 9, "ㅣ": 1, "ㅐ": 2, "ㅒ": 3, "ㅔ": 4, "ㅖ": 5, "ㅘ": 6, "ㅙ": 7, "ㅚ": 8, "ㅝ": 9, "ㅞ": 1, "ㅟ": 2, "ㅢ": 3 };
    for (const ch of [...trimmed]) {
      const code = ch.charCodeAt(0);
      if (code >= 0xac00 && code <= 0xd7a3) {
        const sIndex = code - 0xac00;
        const cho = initial[Math.floor(sIndex / 588)];
        const jung = medial[Math.floor((sIndex % 588) / 28)];
        const jong = final[sIndex % 28];
        const choVal = consMap[cho] || 0;
        const jungVal = vowelMap[jung] || 0;
        const jongVal = jong ? (consMap[jong] || 0) : 0;
        if (choVal) set.add(choVal);
        if (jungVal) set.add(jungVal);
        if (jongVal) set.add(jongVal);
        continue;
      }
      const cVal = consMap[ch] || 0;
      const vVal = vowelMap[ch] || 0;
      if (cVal) set.add(cVal);
      if (vVal) set.add(vVal);
    }
  } else {
    const map = {
      1: ["a", "j", "s"], 2: ["b", "k", "t"], 3: ["c", "l", "u"], 4: ["d", "m", "v"],
      5: ["e", "n", "w"], 6: ["f", "o", "x"], 7: ["g", "p", "y"], 8: ["h", "q", "z"], 9: ["i", "r"],
    };
    const lookup = {};
    Object.keys(map).forEach((k) => map[k].forEach((ch) => { lookup[ch] = Number(k); }));
    for (const ch of trimmed.toLowerCase().replace(/[^a-z]/g, "")) {
      const v = lookup[ch];
      if (v >= 1 && v <= 9) set.add(v);
    }
  }
  return set;
}

function getPersonalYear(birth, year) {
  const yearRoot = reduceNumber(sumDigits(year), false);
  return reduceNumber(yearRoot + reduceNumber(birth.m, false) + reduceNumber(birth.d, false), true);
}

function getPersonalMonth(personalYear, month) {
  return reduceNumber(personalYear + month, true);
}

function getPersonalDay(personalMonth, day) {
  return reduceNumber(personalMonth + day, true);
}

function getLifePath(birth) {
  const yrR = reduceNumber(sumDigits(birth.y), true);
  const mrR = reduceNumber(birth.m, true);
  const drR = reduceNumber(birth.d, true);
  return reduceNumber(yrR + mrR + drR, true);
}

function getLoshuCounts(birth) {
  const birthStr = `${birth.y}${String(birth.m).padStart(2, "0")}${String(birth.d).padStart(2, "0")}`;
  const counts = Array(10).fill(0);
  for (const ch of birthStr) {
    if (ch !== "0") counts[Number(ch)] += 1;
  }
  return counts;
}

function getMissingNumbers(birth) {
  const counts = getLoshuCounts(birth);
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !counts[n]);
}

function getNameMissingNumbers(nameStr) {
  const present = collectNameLetterDigits(nameStr);
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !present.has(n));
}

function normalizeMetaNum(n) {
  return NUMBER_META[n] ? n : reduceNumber(n, false);
}

function getTheme(num) {
  const base = NUMBER_THEME[normalizeMetaNum(num)] || NUMBER_THEME[1];
  if (state.colorPreset === "auto") return base;
  const preset = COLOR_PRESETS[state.colorPreset];
  if (!preset) return base;
  return {
    bg0: preset.bg0,
    bg1: preset.bg1,
    accent: preset.accent,
    glow: preset.glow,
  };
}

function resolveMissingPick(missing) {
  if (!missing.length) return null;
  return state.pickNum && missing.includes(Number(state.pickNum))
    ? Number(state.pickNum)
    : missing[0];
}

function resolveNumbers(birth, mode, nameStr) {
  const now = new Date();
  const py = getPersonalYear(birth, now.getFullYear());
  const pm = getPersonalMonth(py, now.getMonth() + 1);
  const pd = getPersonalDay(pm, now.getDate());
  const lp = getLifePath(birth);
  const birthMissing = getMissingNumbers(birth);
  const nameNums = analyzeNameNumerology(nameStr);
  const nameMissing = nameStr ? getNameMissingNumbers(nameStr) : [];

  if (mode === "today") {
    return { primary: pd, modeLabel: MODE_LABEL.today, context: formatToday(now), missing: birthMissing, nameMissing, nameNums, extras: [] };
  }
  if (mode === "year") {
    return { primary: py, modeLabel: MODE_LABEL.year, context: `${now.getFullYear()}년`, missing: birthMissing, nameMissing, nameNums, extras: [] };
  }
  if (mode === "lifepath") {
    return { primary: lp, modeLabel: MODE_LABEL.lifepath, context: "생년월일 기준", missing: birthMissing, nameMissing, nameNums, extras: [] };
  }

  if (mode === "destiny" || mode === "soul" || mode === "personality") {
    if (!nameNums) return { error: "name" };
    const key = mode === "destiny" ? "expression" : mode;
    const picked = nameNums[key];
    const label = mode === "destiny" ? "운명수(표현수)" : MODE_LABEL[mode];
    return {
      primary: picked.single,
      modeLabel: MODE_LABEL[mode],
      context: `${label} · ${String(nameStr).trim()}`,
      missing: birthMissing,
      nameMissing,
      nameNums,
      extras: [],
    };
  }

  if (mode === "name_missing") {
    if (!nameStr) return { error: "name" };
    if (!nameMissing.length) {
      return {
        primary: nameNums?.expression?.single || pd,
        modeLabel: "운명수",
        context: "이름에 1~9가 모두 있어 운명수로 대체",
        missing: birthMissing,
        nameMissing,
        nameNums,
        extras: [],
        fallback: true,
      };
    }
    const pick = resolveMissingPick(nameMissing);
    return {
      primary: pick,
      modeLabel: MODE_LABEL.name_missing,
      context: `이름에 없는 숫자 · ${nameMissing.join(", ")}`,
      missing: birthMissing,
      nameMissing,
      nameNums,
      extras: nameMissing.filter((n) => n !== pick).slice(0, 2),
      fallback: false,
    };
  }

  if (!birthMissing.length) {
    return {
      primary: pd,
      modeLabel: "오늘의 에너지",
      context: "로슈 격자에 빈 칸이 없어 오늘 숫자로 대체",
      missing: birthMissing,
      nameMissing,
      nameNums,
      extras: [],
      fallback: true,
    };
  }

  const pick = resolveMissingPick(birthMissing);
  return {
    primary: pick,
    modeLabel: MODE_LABEL.missing,
    context: `로슈 격자 빈 칸 · ${birthMissing.join(", ")}`,
    missing: birthMissing,
    nameMissing,
    nameNums,
    extras: birthMissing.filter((n) => n !== pick).slice(0, 2),
    fallback: false,
  };
}

function formatToday(date) {
  const week = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()} (${week})`;
}

function setHint(text, kind = "") {
  if (!hintEl) return;
  hintEl.textContent = text;
  hintEl.className = `hint${kind ? ` ${kind}` : ""}`;
}

function getActiveMissingList() {
  if (state.mode === "name_missing") return state.name ? getNameMissingNumbers(state.name) : [];
  if (state.mode === "missing") {
    const birth = parseBirthDate(state.birthDate);
    return birth ? getMissingNumbers(birth) : [];
  }
  return [];
}

function updatePickRow() {
  if (!pickRow || !pickSelect) return;
  const missing = getActiveMissingList();
  const show = (state.mode === "missing" || state.mode === "name_missing") && missing.length > 1;
  pickRow.hidden = !show;
  if (!show) return;

  pickSelect.innerHTML = missing
    .map((n) => {
      const meta = NUMBER_META[n];
      return `<option value="${n}"${state.pickNum === n ? " selected" : ""}>${n} — ${meta.key}</option>`;
    })
    .join("");

  if (!state.pickNum || !missing.includes(Number(state.pickNum))) {
    state.pickNum = missing[0];
    pickSelect.value = String(missing[0]);
  }
}

function updateDownloadLabel() {
  if (!downloadBtn) return;
  const { w, h } = getCanvasSize();
  downloadBtn.textContent = `PNG 저장 (${w}×${h})`;
}

function updateMeta(resolved) {
  if (!metaEl) return;
  const meta = NUMBER_META[normalizeMetaNum(resolved.primary)] || NUMBER_META[1];
  const birthMissingText = resolved.missing.length
    ? resolved.missing.map((n) => `${n}(${NUMBER_META[n].key})`).join(" · ")
    : "없음 (1~9 모두 포함)";
  const nameMissingText = resolved.nameMissing?.length
    ? resolved.nameMissing.map((n) => `${n}(${NUMBER_META[n].key})`).join(" · ")
    : resolved.nameNums ? "없음" : "—";
  const extrasText = resolved.extras?.length
    ? resolved.extras.map((n) => `${n}(${NUMBER_META[n].key})`).join(" · ")
    : "";

  let nameCard = "";
  if (resolved.nameNums) {
    const n = resolved.nameNums;
    nameCard = `
    <div class="meta-card meta-card--soft">
      <div class="meta-label">네임코드</div>
      <p>운명수 <strong>${n.expression.single}</strong> · 혼의수 <strong>${n.soul.single}</strong> · 성격수 <strong>${n.personality.single}</strong></p>
      <p class="meta-note">이름에 없는 숫자: ${nameMissingText}</p>
    </div>`;
  }

  metaEl.innerHTML = `
    <div class="meta-card">
      <div class="meta-label">선택된 에너지</div>
      <div class="meta-value">${resolved.primary} <span class="meta-key">${meta.key}</span></div>
      <p class="meta-line">${meta.line}</p>
      ${extrasText ? `<p class="meta-note">함께 채울 숫자: ${extrasText}</p>` : ""}
    </div>
    <div class="meta-card meta-card--soft">
      <div class="meta-label">로슈 빈 칸 (생일)</div>
      <p>${birthMissingText}</p>
      ${resolved.fallback && state.mode === "missing" ? '<p class="meta-note">빈 칸이 없어 오늘의 개인일수로 생성합니다.</p>' : ""}
    </div>
    ${nameCard}`;
}

async function ensureFonts() {
  if (!document.fonts) return;
  await Promise.all([
    document.fonts.load('600 120px "Cormorant Garamond"'),
    document.fonts.load('500 36px "Noto Sans KR"'),
    document.fonts.load('700 48px "Noto Sans KR"'),
  ]).catch(() => {});
}

function drawWallpaper(canvas, resolved) {
  const { w: W, h: H } = getCanvasSize();
  const layout = state.aspect === "square" ? LAYOUT.square : LAYOUT.phone;
  const ctx = canvas.getContext("2d");
  const num = normalizeMetaNum(resolved.primary);
  const meta = NUMBER_META[num] || NUMBER_META[1];
  const theme = getTheme(num);
  const mood = state.mood;
  const isPaper = mood === "paper";
  const isNeon = mood === "neon";
  const isDeep = mood === "deep";

  canvas.width = W;
  canvas.height = H;

  const paperBg0 = "#f7f2e9";
  const paperBg1 = "#ece3d3";
  const paperAccent = "#4a3520";
  const grad = ctx.createLinearGradient(0, 0, W * 0.2, H);
  grad.addColorStop(0, isPaper ? paperBg0 : theme.bg0);
  grad.addColorStop(0.55, isPaper ? paperBg1 : theme.bg1);
  grad.addColorStop(1, isPaper ? paperBg0 : theme.bg0);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (!isPaper) {
    const glow = ctx.createRadialGradient(W * 0.5, H * layout.numY, 40, W * 0.5, H * layout.numY, W * 0.55);
    glow.addColorStop(0, `${theme.glow}${isNeon ? "66" : "33"}`);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.strokeStyle = isPaper ? "rgba(74,53,32,0.14)" : `${theme.accent}${isNeon ? "2d" : "18"}`;
  ctx.lineWidth = 2;
  const ringCount = state.aspect === "square" ? 4 : 6;
  for (let i = 0; i < ringCount; i += 1) {
    const r = (state.aspect === "square" ? 120 : 180) + i * (state.aspect === "square" ? 80 : 110);
    ctx.beginPath();
    ctx.arc(W * 0.5, H * layout.numY, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (mood !== "minimal" && state.aspect !== "square") {
    const cell = layout.gridCell;
    const ox = (W - cell * 3) / 2;
    const oy = H * layout.gridY;
    const order = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];
    order.forEach((row, ri) => {
      row.forEach((digit, ci) => {
        const x = ox + ci * cell;
        const y = oy + ri * cell;
        const active = digit === num || resolved.extras.includes(digit);
        ctx.fillStyle = isPaper ? "rgba(74,53,32,0.08)" : `${theme.accent}12`;
        ctx.globalAlpha = active ? 0.55 : 0.2;
        ctx.fillRect(x + 8, y + 8, cell - 16, cell - 16);
        ctx.globalAlpha = 1;
        ctx.fillStyle = active ? (isPaper ? paperAccent : theme.accent) : (isPaper ? "rgba(74,53,32,0.45)" : `${theme.accent}55`);
        ctx.font = `500 ${Math.round(cell * 0.29)}px "Cormorant Garamond", serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(digit), x + cell / 2, y + cell / 2);
      });
    });
  }

  const titleSize = state.aspect === "square" ? 28 : 34;
  ctx.fillStyle = isPaper ? "rgba(74,53,32,0.82)" : `${theme.accent}cc`;
  ctx.font = `500 ${titleSize}px "Noto Sans KR", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("나의 에너지 넘버", W / 2, H * layout.titleY);

  ctx.fillStyle = isPaper ? "rgba(74,53,32,0.65)" : `${theme.accent}99`;
  ctx.font = `400 ${titleSize - 6}px "Noto Sans KR", sans-serif`;
  ctx.fillText(resolved.modeLabel, W / 2, H * layout.modeY);

  ctx.fillStyle = isPaper ? paperAccent : theme.accent;
  ctx.font = `600 ${layout.numSize}px "Cormorant Garamond", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = isPaper ? "transparent" : `${theme.glow}${isNeon ? "ff" : "88"}`;
  ctx.shadowBlur = isPaper ? 0 : (isNeon ? 90 : (isDeep ? 56 : 18));
  ctx.fillText(String(num), W / 2, H * layout.numY);
  if (isNeon) {
    ctx.shadowColor = `${theme.glow}b8`;
    ctx.shadowBlur = 28;
    ctx.strokeStyle = `${theme.accent}c8`;
    ctx.lineWidth = 1.4;
    ctx.strokeText(String(num), W / 2, H * layout.numY);
  }
  ctx.shadowBlur = 0;

  const keySize = state.aspect === "square" ? 44 : 56;
  ctx.fillStyle = isPaper ? "#2c1f0ecc" : "#ffffffdd";
  ctx.font = `700 ${keySize}px "Noto Sans KR", sans-serif`;
  ctx.fillText(meta.key, W / 2, H * layout.keyY);

  ctx.fillStyle = isPaper ? "rgba(74,53,32,0.82)" : `${theme.accent}ee`;
  ctx.font = `400 ${keySize - 22}px "Noto Sans KR", sans-serif`;
  ctx.fillText(meta.sub, W / 2, H * layout.subY);

  wrapText(
    ctx, meta.line, W / 2, H * layout.lineY, W * 0.72, state.aspect === "square" ? 38 : 46,
    `400 ${state.aspect === "square" ? 28 : 32}px "Noto Sans KR", sans-serif`, isPaper ? "rgba(44,31,14,0.8)" : "#ffffffbb",
  );

  ctx.fillStyle = isPaper ? "rgba(74,53,32,0.72)" : "#ffffff88";
  ctx.font = '500 26px "Noto Sans KR", sans-serif';
  ctx.fillText("팔자연구소 · 8code.kr", W / 2, H * layout.brandY);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  const chars = text.split("");
  let line = "";
  const lines = [];
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lineHeight));
}

async function renderPreview() {
  const birth = parseBirthDate(state.birthDate);
  if (!birth) {
    setHint("생년월일을 입력해 주세요.", "warn");
    downloadBtn.disabled = true;
    return;
  }

  if (NAME_MODES.has(state.mode) && !String(state.name).trim()) {
    setHint("네임코드 모드는 이름을 입력해 주세요.", "warn");
    downloadBtn.disabled = true;
    return;
  }

  await ensureFonts();
  const resolved = resolveNumbers(birth, state.mode, state.name);
  if (resolved.error === "name") {
    setHint("이름을 입력해 주세요.", "warn");
    downloadBtn.disabled = true;
    return;
  }

  updatePickRow();
  updateMeta(resolved);
  updateDownloadLabel();
  drawWallpaper(previewCanvas, resolved);

  const { w, h } = getCanvasSize();
  const scale = Math.min(1, (previewCanvas.parentElement.clientWidth - 4) / w);
  previewCanvas.style.width = `${Math.round(w * scale)}px`;
  previewCanvas.style.height = `${Math.round(h * scale)}px`;

  setHint("미리보기가 준비됐어요. 저장 버튼으로 폰·스토리에 받아 보세요.");
  downloadBtn.disabled = false;
}

async function downloadWallpaper() {
  const birth = parseBirthDate(state.birthDate);
  if (!birth) {
    setHint("생년월일을 먼저 입력해 주세요.", "warn");
    return;
  }
  if (NAME_MODES.has(state.mode) && !String(state.name).trim()) {
    setHint("이름을 입력해 주세요.", "warn");
    return;
  }

  await ensureFonts();
  const resolved = resolveNumbers(birth, state.mode, state.name);
  if (resolved.error === "name") return;

  const off = document.createElement("canvas");
  drawWallpaper(off, resolved);

  const meta = NUMBER_META[normalizeMetaNum(resolved.primary)];
  const ratioTag = state.aspect === "square" ? "정사각" : "폰";

  off.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `에너지넘버_${ratioTag}_${meta.key}_${resolved.primary}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function loadFromStorage() {
  try {
    const savedBirth = localStorage.getItem("palja_wallpaper_birth");
    const savedName = localStorage.getItem("palja_wallpaper_name");
    if (savedBirth && birthInput) {
      birthInput.value = savedBirth;
      state.birthDate = savedBirth;
    }
    if (savedName && nameInput) {
      nameInput.value = savedName;
      state.name = savedName;
    }
  } catch {
    /* ignore */
  }
}

function saveToStorage() {
  try {
    if (state.birthDate) localStorage.setItem("palja_wallpaper_birth", state.birthDate);
    if (state.name) localStorage.setItem("palja_wallpaper_name", state.name);
  } catch {
    /* ignore */
  }
}

function bindEvents() {
  birthInput?.addEventListener("change", () => {
    state.birthDate = birthInput.value;
    saveToStorage();
    renderPreview();
  });

  nameInput?.addEventListener("input", () => {
    state.name = nameInput.value;
    saveToStorage();
    renderPreview();
  });

  modeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      state.mode = input.value;
      state.pickNum = null;
      renderPreview();
    });
  });

  pickSelect?.addEventListener("change", () => {
    state.pickNum = Number(pickSelect.value);
    renderPreview();
  });

  moodInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      state.mood = input.value;
      renderPreview();
    });
  });

  colorInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      state.colorPreset = input.value;
      renderPreview();
    });
  });

  aspectInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      state.aspect = input.value;
      renderPreview();
    });
  });

  generateBtn?.addEventListener("click", renderPreview);
  downloadBtn?.addEventListener("click", downloadWallpaper);
}

function init() {
  loadFromStorage();
  updateDownloadLabel();
  bindEvents();
  if (state.birthDate) renderPreview();
  else setHint("생년월일을 입력하면 배경화면이 자동으로 만들어집니다.");
}

init();

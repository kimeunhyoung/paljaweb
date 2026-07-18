import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://sghsryumnrnftyjoqmwf.supabase.co",
  "sb_publishable_6S3W_oWrzG-Nv8wLK98gmg_q_KcB2I1",
);

const DAILY_GUIDE = {
  1: { key: "시작", do: "작게라도 시작 버튼을 누르세요. 결단이 흐름을 엽니다.", dont: "완벽할 때까지 미루지 마세요." },
  2: { key: "조율", do: "협업과 대화로 간극을 메우세요. 듣는 힘이 성과를 만듭니다.", dont: "감정 누적 후 한 번에 터뜨리지 마세요." },
  3: { key: "표현", do: "아이디어를 말과 글로 꺼내 공유하세요.", dont: "반응이 두려워 표현을 접지 마세요." },
  4: { key: "정리", do: "루틴 정비, 자료 정리, 우선순위 재배치에 집중하세요.", dont: "근거 없이 일을 늘리지 마세요." },
  5: { key: "변화", do: "새 도구, 새 관점, 새 루트를 실험하세요.", dont: "충동적 결정으로 약속을 흔들지 마세요." },
  6: { key: "돌봄", do: "관계 회복과 책임 정리에 시간을 쓰세요.", dont: "모든 문제를 혼자 떠안지 마세요." },
  7: { key: "통찰", do: "분석, 공부, 리서치처럼 깊이 파는 작업에 적합합니다.", dont: "답이 빨리 안 나온다고 조급해하지 마세요." },
  8: { key: "성과", do: "돈, 계약, 목표 관리처럼 결과 지향 업무를 밀어붙이세요.", dont: "관계의 온도를 무시한 채 성과만 보지 마세요." },
  9: { key: "마무리", do: "정리, 회고, 놓아주기를 통해 다음 사이클을 준비하세요.", dont: "끝난 일을 붙들고 에너지를 소모하지 마세요." },
  11: { key: "영감", do: "직관이 좋은 날입니다. 기록하고 조용히 실행하세요.", dont: "과한 자극과 소음으로 직관을 흐리지 마세요." },
  22: { key: "구현", do: "큰 계획을 실제 일정과 구조로 옮기세요.", dont: "완벽주의 때문에 착수를 늦추지 마세요." },
  33: { key: "치유", do: "누군가를 돕는 행동이 오히려 내 균형을 회복시킵니다.", dont: "경계를 잃고 무리하게 퍼주지 마세요." },
};

const MONTHLY_MESSAGE = {
  1: "새로운 시작의 달입니다. 먼저 움직이는 사람이 기회를 잡습니다.",
  2: "관계와 협업의 달입니다. 속도보다 조율이 중요합니다.",
  3: "표현과 확장의 달입니다. 아이디어를 공유할수록 운이 붙습니다.",
  4: "기반을 다지는 달입니다. 구조화와 반복이 성과를 만듭니다.",
  5: "변화의 달입니다. 유연하게 전환할수록 기회가 커집니다.",
  6: "책임과 돌봄의 달입니다. 중요한 관계를 정리하고 보강하세요.",
  7: "성찰과 연구의 달입니다. 깊은 집중에서 답이 나옵니다.",
  8: "성과 실현의 달입니다. 목표 수치와 실행 계획을 명확히 하세요.",
  9: "완성과 마무리의 달입니다. 정리할수록 다음 시작이 가벼워집니다.",
  11: "직관과 영감이 살아나는 달입니다. 핵심 신호를 기록하세요.",
  22: "대형 프로젝트 설계에 유리한 달입니다. 큰 그림을 실행 단위로 쪼개세요.",
  33: "치유와 공헌의 달입니다. 의미 중심의 선택이 운을 키웁니다.",
};

const state = {
  birthDate: "",
  viewDate: new Date(),
  selectedDate: null,
  userPlan: "free",
  calendarPassUntil: null,
  calendarLocked: false,
  aiServerOk: false,
  aiCache: { daily: {}, monthly: {} },
  aiBusy: { daily: false, monthly: false },
  aiLoadingKey: { daily: null, monthly: null },
  detailCtx: null,
};

const birthDateInput = document.getElementById("birthDateInput");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const todayBtn = document.getElementById("todayBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const authHint = document.getElementById("authHint");
const calendarTitle = document.getElementById("calendarTitle");
const personalYearChip = document.getElementById("personalYearChip");
const personalMonthChip = document.getElementById("personalMonthChip");
const calendarDays = document.getElementById("calendarDays");
const detailPanel = document.getElementById("detailPanel");
const numAiQuotaBadge = document.getElementById("numAiQuotaBadge");

function getGuideForDay(personalDay) {
  return DAILY_GUIDE[personalDay] || DAILY_GUIDE[reduceNumber(personalDay, false)] || DAILY_GUIDE[1];
}

function getMonthMessage(personalMonth) {
  return MONTHLY_MESSAGE[personalMonth] || MONTHLY_MESSAGE[reduceNumber(personalMonth, false)] || "";
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatMonthKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

async function loadAiQuota() {
  if (!window.PaljaAiQuota || state.calendarLocked) return;
  const q = await PaljaAiQuota.fetchQuota();
  if (q) PaljaAiQuota.applyQuotaBadge(numAiQuotaBadge, q);
}

async function checkAiServer() {
  if (!window.PaljaAiQuota) return;
  try {
    const j = await PaljaAiQuota.fetchStatus();
    state.aiServerOk = !!j.available;
    if (j.quota) PaljaAiQuota.applyQuotaBadge(numAiQuotaBadge, j.quota);
    else await loadAiQuota();
  } catch {
    state.aiServerOk = false;
  }
}

function buildDailyAiPrompt(ctx) {
  const { birth, date, personalYear, personalMonth, personalDay, universalDay, guide, monthMessage } = ctx;
  const L = [];
  L.push("당신은 따뜻하고 통찰력 있는 수비학 전문가입니다. 아래 숫자를 바탕으로 오늘의 운세를 한국어로 써 주세요. 단정적 예언·공포 조장은 금지하고, 참고용·자기이해 톤으로 다정하게 써 주세요.");
  L.push("");
  L.push("[기본 정보]");
  L.push(`생년월일: ${birth.y}년 ${birth.m}월 ${birth.d}일`);
  L.push(`대상 날짜: ${formatLongDate(date)}`);
  L.push(`개인연도수: ${personalYear} / 개인월수: ${personalMonth} / 개인일수: ${personalDay} / 일반일수: ${universalDay}`);
  L.push(`오늘 키워드: ${guide.key}`);
  L.push(`이번 달 배경: ${monthMessage}`);
  L.push(`기본 DO: ${guide.do}`);
  L.push(`기본 DON'T: ${guide.dont}`);
  L.push("");
  L.push("[작성 형식 — 반드시 지키세요]");
  L.push("1) ## 제목만 사용. 아래 순서대로 작성하세요.");
  [
    "## 오늘의 에너지 — 개인일수·일반일수를 연결한 하루 전체 흐름(2~3문장)",
    "## 연애·관계 — 오늘 대인·연애 실전 조언",
    "## 일·업무·커리어 — 오늘 일과·업무 흐름",
    "## 금전·소비 — 오늘 수입·지출·소비 주의·기회",
    "## 오늘의 한 줄 조언 — 짧고 기억하기 쉬운 한 문장",
  ].forEach((s, i) => L.push(`   ${i + 1}. ${s}`));
  L.push("2) 각 섹션 3~4문장(한 줄 조언은 1문장). 숫자 근거를 최소 1개 이상 언급하세요.");
  L.push("3) 위 DO/DON'T를 그대로 복사하지 말고, 수비학 숫자에 맞게 새로 풀어 쓰세요.");
  L.push("4) 반드시 마지막 섹션까지 완성하세요.");
  return L.join("\n");
}

function buildMonthlyAiPrompt(ctx) {
  const { birth, year, month, personalYear, personalMonth, monthMessage } = ctx;
  const L = [];
  L.push("당신은 따뜻하고 통찰력 있는 수비학 전문가입니다. 아래 숫자를 바탕으로 이번 달 흐름을 한국어로 써 주세요. 단정적 예언·공포 조장은 금지하고, 참고용 톤으로 다정하게 써 주세요.");
  L.push("");
  L.push("[기본 정보]");
  L.push(`생년월일: ${birth.y}년 ${birth.m}월 ${birth.d}일`);
  L.push(`대상: ${year}년 ${month}월`);
  L.push(`개인연도수: ${personalYear} / 개인월수: ${personalMonth}`);
  L.push(`이번 달 메시지: ${monthMessage}`);
  L.push("");
  L.push("[작성 형식 — 반드시 지키세요]");
  L.push("1) ## 제목만 사용. 아래 순서대로 작성하세요.");
  [
    "## 이번 달 전체 흐름 — 개인월수·개인연도수 연결(2~3문장)",
    "## 연애·관계 — 이 달 관계·가족 테마",
    "## 일·업무·커리어 — 이 달 업무·커리어 방향",
    "## 금전·재물 — 이 달 재정·소비·투자 흐름",
    "## 이번 달 실천 포인트 — 구체적 행동 2~3가지",
  ].forEach((s, i) => L.push(`   ${i + 1}. ${s}`));
  L.push("2) 각 섹션 3~4문장. 숫자 근거를 최소 1개 이상 언급하세요.");
  L.push("3) 위 월 메시지를 그대로 복사하지 말고 새로 풀어 쓰세요.");
  L.push("4) 반드시 마지막 섹션까지 완성하세요.");
  return L.join("\n");
}

async function callNumerologyAi(mode) {
  if (!state.detailCtx || state.calendarLocked) return;
  if (!window.PaljaAiQuota) {
    setHint("AI 운세는 로그인 후 이용할 수 있어요.", "warn");
    return;
  }
  if (!state.aiServerOk) {
    setHint("AI 서버가 아직 준비되지 않았어요. 잠시 후 다시 시도해 주세요.", "warn");
    return;
  }

  const isDaily = mode === "daily";
  const btn = document.getElementById(isDaily ? "btnNumAiDaily" : "btnNumAiMonthly");
  const box = document.getElementById(isDaily ? "numAiDailyResult" : "numAiMonthlyResult");
  const hint = document.getElementById(isDaily ? "numAiDailyHint" : "numAiMonthlyHint");
  if (!btn || !box) return;

  const ctx = state.detailCtx;
  const cacheKeyStr = isDaily
    ? formatDateKey(ctx.date)
    : formatMonthKey(ctx.year, ctx.month);
  const feature = isDaily ? "numerology_daily" : "numerology_monthly";
  const prompt = isDaily ? buildDailyAiPrompt(ctx) : buildMonthlyAiPrompt(ctx);
  const hash = PaljaAiQuota.hashKey(`v1:${mode}:${cacheKeyStr}:${state.birthDate}:${prompt}`);

  const prevLabel = btn.textContent;
  state.aiBusy[mode] = true;
  state.aiLoadingKey[mode] = cacheKeyStr;
  btn.textContent = "⏳ 해석 중…";
  btn.disabled = true;
  box.classList.remove("is-empty");
  box.textContent = "해석을 생성하고 있어요…";
  if (hint) hint.classList.add("is-loading");

  try {
    const { text, quota, data } = await PaljaAiQuota.callAi({
      feature,
      cacheKey: hash,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    let out = text || "해석을 생성하지 못했어요.";
    if (data?.stop_reason === "max_tokens") out += "\n\n(※ 해석이 길어 일부가 잘렸을 수 있어요.)";
    if (isDaily) state.aiCache.daily[cacheKeyStr] = out;
    else state.aiCache.monthly[cacheKeyStr] = out;
    const stillCurrent = isDaily
      ? state.detailCtx && formatDateKey(state.detailCtx.date) === cacheKeyStr
      : state.detailCtx && formatMonthKey(state.detailCtx.year, state.detailCtx.month) === cacheKeyStr;
    if (stillCurrent && document.getElementById(box.id)) {
      box.textContent = out;
      box.classList.remove("is-empty");
    }
    if (quota) PaljaAiQuota.applyQuotaBadge(numAiQuotaBadge, quota);
  } catch (e) {
    const stillCurrent = isDaily
      ? state.detailCtx && formatDateKey(state.detailCtx.date) === cacheKeyStr
      : state.detailCtx && formatMonthKey(state.detailCtx.year, state.detailCtx.month) === cacheKeyStr;
    const errMsg = e.code === "quota_exceeded" || e.status === 429
      ? "이번 달 AI 크레딧을 모두 사용했어요."
      : e.message === "login_required"
        ? "AI 운세는 로그인 후 이용할 수 있어요."
        : "AI 해석을 일시적으로 사용할 수 없어요.";
    if (stillCurrent && document.getElementById(box.id)) box.textContent = errMsg;
    if (e.quota) PaljaAiQuota.applyQuotaBadge(numAiQuotaBadge, e.quota);
  } finally {
    state.aiBusy[mode] = false;
    state.aiLoadingKey[mode] = null;
    const stillCurrent = isDaily
      ? state.detailCtx && formatDateKey(state.detailCtx.date) === cacheKeyStr
      : state.detailCtx && formatMonthKey(state.detailCtx.year, state.detailCtx.month) === cacheKeyStr;
    if (stillCurrent) {
      const liveBtn = document.getElementById(isDaily ? "btnNumAiDaily" : "btnNumAiMonthly");
      if (liveBtn) {
        liveBtn.textContent = prevLabel;
        liveBtn.disabled = !state.aiServerOk;
      }
      const liveHint = document.getElementById(isDaily ? "numAiDailyHint" : "numAiMonthlyHint");
      if (liveHint) liveHint.classList.remove("is-loading");
    }
  }
}

function bindDetailAiEvents() {
  const dailyBtn = document.getElementById("btnNumAiDaily");
  const monthlyBtn = document.getElementById("btnNumAiMonthly");
  if (dailyBtn) {
    dailyBtn.disabled = !state.aiServerOk || state.aiBusy.daily;
    dailyBtn.onclick = () => callNumerologyAi("daily");
  }
  if (monthlyBtn) {
    monthlyBtn.disabled = !state.aiServerOk || state.aiBusy.monthly;
    monthlyBtn.onclick = () => callNumerologyAi("monthly");
  }
}

function setHint(text, mode = "") {
  authHint.textContent = text;
  authHint.className = `hint${mode ? ` ${mode}` : ""}`;
}

function formatDateInputValue(value) {
  if (!value) return "";
  const m = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return "";
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
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
  const v = formatDateInputValue(inputValue);
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return { y, m, d };
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

function getUniversalDay(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return reduceNumber(sumDigits(`${y}${m}${d}`), false);
}

function formatYearMonthTitle(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return `${y}년 ${m}월`;
}

function formatLongDate(date) {
  const week = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${week})`;
}

function getMonthCellDates(viewDate) {
  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const first = new Date(y, m, 1);
  const startOffset = first.getDay();
  const startDate = new Date(y, m, 1 - startOffset);
  return Array.from({ length: 42 }, (_, idx) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + idx);
    return d;
  });
}

function renderDetail(date, personalYear, personalMonth, personalDay, universalDay) {
  const birth = parseBirthDate(state.birthDate);
  const guide = getGuideForDay(personalDay);
  const monthMessage = getMonthMessage(personalMonth);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const dailyKey = formatDateKey(date);
  const monthlyKey = formatMonthKey(year, month);

  state.detailCtx = {
    birth,
    date,
    year,
    month,
    personalYear,
    personalMonth,
    personalDay,
    universalDay,
    guide,
    monthMessage,
  };

  const dailyCached = state.aiCache.daily[dailyKey];
  const monthlyCached = state.aiCache.monthly[monthlyKey];
  const dailyLoading = state.aiBusy.daily && state.aiLoadingKey.daily === dailyKey;
  const monthlyLoading = state.aiBusy.monthly && state.aiLoadingKey.monthly === monthlyKey;
  const aiDisabled = !state.aiServerOk;

  detailPanel.innerHTML = `
    <h2>${guide.key}의 날</h2>
    <p class="detail-date">${formatLongDate(date)}</p>
    <div class="metric">
      <div class="metric-item">
        <div class="metric-label">개인연수</div>
        <div class="metric-value">${personalYear}</div>
      </div>
      <div class="metric-item">
        <div class="metric-label">개인월수</div>
        <div class="metric-value">${personalMonth}</div>
      </div>
      <div class="metric-item">
        <div class="metric-label">개인일수</div>
        <div class="metric-value">${personalDay}</div>
      </div>
    </div>
    <div class="metric" style="margin-top:8px;grid-template-columns:1fr;">
      <div class="metric-item">
        <div class="metric-label">일반일수</div>
        <div class="metric-value">${universalDay}</div>
      </div>
    </div>
    <div class="card-title">이번 달 흐름</div>
    <div class="text-card">${monthMessage}</div>
    <div id="pyDomainsSlot"></div>
    <div class="guide">
      <div class="guide-item do">
        <strong>DO</strong>
        ${guide.do}
      </div>
      <div class="guide-item dont">
        <strong>DON'T</strong>
        ${guide.dont}
      </div>
    </div>
    <div class="ai-block">
      <p class="ai-block-title">✨ AI 맞춤 운세</p>
      <p class="ai-block-desc">기본 가이드 위에 연애·일·금전까지 풀어 드려요. 날짜·달마다 1크레딧 (24시간 캐시)</p>
      <div class="ai-actions">
        <button type="button" class="ai-btn" id="btnNumAiDaily"${aiDisabled ? " disabled" : ""}>✨ AI 오늘 운세 (1크레딧)</button>
      </div>
      <div class="ai-result${dailyCached || dailyLoading ? "" : " is-empty"}" id="numAiDailyResult">${dailyLoading ? "해석을 생성하고 있어요…" : (dailyCached || "「AI 오늘 운세」를 누르면 이 날짜 맞춤 해석을 받을 수 있어요.")}</div>
      <p class="ai-time-hint" id="numAiDailyHint">보통 20~40초 정도 걸려요.</p>
      <div class="ai-actions" style="margin-top:12px;">
        <button type="button" class="ai-btn ai-btn--soft" id="btnNumAiMonthly"${aiDisabled ? " disabled" : ""}>✨ AI 이번 달 흐름 (1크레딧)</button>
      </div>
      <div class="ai-result${monthlyCached || monthlyLoading ? "" : " is-empty"}" id="numAiMonthlyResult">${monthlyLoading ? "해석을 생성하고 있어요…" : (monthlyCached || "「AI 이번 달 흐름」을 누르면 이 달 전체 테마를 풀어 드려요.")}</div>
      <p class="ai-time-hint" id="numAiMonthlyHint">보통 20~40초 정도 걸려요.</p>
    </div>
  `;
  const pySlot = document.getElementById("pyDomainsSlot");
  if (pySlot && window.PaljaLifeTables) {
    const pyClassic = reduceNumber(personalYear, false);
    pySlot.innerHTML = PaljaLifeTables.renderPersonalYearTableHtml(pyClassic, {
      yearLabel: String(year) + "년",
    });
  }
  bindDetailAiEvents();
}

function renderCalendar() {
  if (state.calendarLocked) return;
  const birth = parseBirthDate(state.birthDate);
  if (!birth) {
    calendarTitle.textContent = formatYearMonthTitle(state.viewDate);
    personalYearChip.textContent = "개인연수 -";
    personalMonthChip.textContent = "개인월수 -";
    calendarDays.innerHTML = "";
    detailPanel.innerHTML = `
      <h2>생년월일을 먼저 입력해 주세요</h2>
      <p class="detail-date">로그인 상태라면 자동으로 채워집니다.</p>
    `;
    return;
  }

  const year = state.viewDate.getFullYear();
  const month = state.viewDate.getMonth() + 1;
  const personalYear = getPersonalYear(birth, year);
  const personalMonth = getPersonalMonth(personalYear, month);

  calendarTitle.textContent = formatYearMonthTitle(state.viewDate);
  personalYearChip.textContent = `개인연수 ${personalYear}`;
  personalMonthChip.textContent = `개인월수 ${personalMonth}`;

  const cells = getMonthCellDates(state.viewDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  calendarDays.innerHTML = "";
  cells.forEach((date) => {
    const isCurrentMonth = date.getMonth() === state.viewDate.getMonth();
    const isToday = date.getTime() === today.getTime();
    const isSelected =
      state.selectedDate &&
      date.getFullYear() === state.selectedDate.getFullYear() &&
      date.getMonth() === state.selectedDate.getMonth() &&
      date.getDate() === state.selectedDate.getDate();
    const personalDay = getPersonalDay(personalMonth, date.getDate());
    const universalDay = getUniversalDay(date);
    const guide = DAILY_GUIDE[personalDay] || DAILY_GUIDE[reduceNumber(personalDay, false)] || DAILY_GUIDE[1];

    const dow = date.getDay();
    const button = document.createElement("button");
    button.type = "button";
    button.className = `day${isCurrentMonth ? "" : " is-out"}${dow === 0 ? " is-sunday" : ""}${dow === 6 ? " is-saturday" : ""}${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}`;
    button.setAttribute("role", "gridcell");
    button.setAttribute("aria-selected", isSelected ? "true" : "false");
    button.setAttribute(
      "aria-label",
      `${date.getMonth() + 1}월 ${date.getDate()}일 개인일수 ${personalDay}, 일반일수 ${universalDay}`,
    );
    button.innerHTML = `
      <div class="day-num">${date.getDate()}</div>
      <div class="day-sub" title="일반일수">${universalDay}</div>
      <div class="day-value">${personalDay}</div>
      <div class="day-keyword">${guide.key}</div>
    `;
    button.addEventListener("click", () => {
      if (!isCurrentMonth) return;
      state.selectedDate = new Date(date);
      renderCalendar();
      renderDetail(date, personalYear, personalMonth, personalDay, universalDay);
    });
    calendarDays.appendChild(button);
  });

  if (!state.selectedDate || state.selectedDate.getMonth() !== state.viewDate.getMonth() || state.selectedDate.getFullYear() !== state.viewDate.getFullYear()) {
    const now = new Date();
    state.selectedDate = (now.getFullYear() === year && now.getMonth() === month - 1)
      ? new Date(year, month - 1, now.getDate())
      : new Date(year, month - 1, 1);
  }
  const firstPersonalDay = getPersonalDay(personalMonth, state.selectedDate.getDate());
  const firstUniversalDay = getUniversalDay(state.selectedDate);
  renderDetail(state.selectedDate, personalYear, personalMonth, firstPersonalDay, firstUniversalDay);
}

function applyCalendarPlanGate() {
  const planApi = window.PaljaPlan;
  const allowed = planApi
    ? planApi.hasProductAccess("calendar", state.userPlan, false, {
        calendarPassUntil: state.calendarPassUntil,
      })
    : state.userPlan !== "free";
  state.calendarLocked = !allowed;
  if (allowed) return;

  const loggedIn = !!state.loggedIn;
  const extras = `
    <div class="text-card" style="margin-top:12px;">
      <strong style="display:block;margin-bottom:8px;">여기서 확인할 수 있는 것</strong>
      <ul style="margin:0;padding-left:18px;color:var(--muted);line-height:1.7;">
        <li>월간 수비학 달력 · 개인연수/월수/일수</li>
        <li>날짜별 에너지 가이드 (DO / DON'T)</li>
        <li><strong style="color:var(--ink);">오늘의 운세</strong> — AI 맞춤 해석 (연애·일·금전)</li>
        <li>AI 이번 달 흐름</li>
      </ul>
    </div>
    <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:8px;">
      <a href="ai-buy.html?product=cal_pass_3d" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#4a3520;color:#f5f0e8;text-decoration:none;font-size:14px;font-weight:600;">3일 체험 · 1,900원</a>
      <a href="pricing.html" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#fff;color:#4a3520;border:1px solid rgba(139,111,71,.35);text-decoration:none;font-size:14px;font-weight:600;">요금제 보기</a>
    </div>
    <p style="margin:10px 0 0;font-size:12.5px;color:var(--muted);line-height:1.55;">3일 체험 = 달력 열람 + AI 3크레딧. 계속 이용하실 때는 Basic 월 9,900원 구독을 추천합니다.</p>`;
  const panel = planApi?.productGatePanelHtml
    ? planApi.productGatePanelHtml("calendar", {
        title: "Basic 이상에서 이용 가능",
        desc: "수비학 달력은 Basic 플랜 이상에서 열립니다. 짧게 써 보려면 아래 3일 체험을 이용해 보세요.",
        extrasHtml: extras,
        loggedIn,
      })
    : `${planApi?.BASIC_PRODUCT_GATE_MSG || "Basic 이상 플랜에서 이용할 수 있습니다."} <a href="pricing.html">요금제 보기</a>`;

  authHint.innerHTML = panel;
  authHint.className = "hint warn";
  birthDateInput.disabled = true;
  prevMonthBtn.disabled = true;
  nextMonthBtn.disabled = true;
  todayBtn.disabled = true;
  calendarTitle.textContent = "수비학 달력";
  personalYearChip.textContent = "Basic 이상";
  personalMonthChip.textContent = "플랜 필요";
  calendarDays.innerHTML = "";
  detailPanel.innerHTML = panel;
}

async function loadUserPlan() {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    state.loggedIn = !!session?.user?.id;
    window.PALJA_LOGGED_IN = state.loggedIn;
    if (!session?.user?.id) {
      state.userPlan = "free";
      state.calendarPassUntil = null;
      return;
    }
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("plan, plan_active_until, calendar_pass_until")
      .eq("id", session.user.id)
      .maybeSingle();
    if (error || !profile) {
      state.userPlan = "free";
      state.calendarPassUntil = null;
      return;
    }
    state.userPlan = window.PaljaPlan?.effectivePlan(profile) || profile.plan || "free";
    state.calendarPassUntil = profile.calendar_pass_until || null;
  } catch {
    state.userPlan = "free";
    state.calendarPassUntil = null;
  }
}

async function loadBirthFromProfile() {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session?.user?.id) {
      setHint("로그인 정보가 없어 수동 입력 모드로 시작합니다.", "warn");
      return;
    }
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("birth")
      .eq("id", session.user.id)
      .single();
    if (error || !profile?.birth) {
      setHint("프로필 생년월일이 없어 수동으로 입력해 주세요.", "warn");
      return;
    }
    const normalized = formatDateInputValue(profile.birth);
    if (!normalized) {
      setHint("프로필 생년월일 형식 확인이 필요합니다. 수동 입력해 주세요.", "warn");
      return;
    }
    state.birthDate = normalized;
    birthDateInput.value = normalized;
    setHint("로그인 사용자 생년월일을 자동으로 불러왔습니다.", "ok");
  } catch (e) {
    setHint("자동 불러오기에 실패했습니다. 생년월일을 직접 입력해 주세요.", "warn");
  }
}

function bindEvents() {
  birthDateInput.addEventListener("change", () => {
    state.birthDate = formatDateInputValue(birthDateInput.value);
    renderCalendar();
  });
  prevMonthBtn.addEventListener("click", () => {
    state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() - 1, 1);
    renderCalendar();
  });
  nextMonthBtn.addEventListener("click", () => {
    state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() + 1, 1);
    renderCalendar();
  });
  todayBtn.addEventListener("click", () => {
    state.viewDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    renderCalendar();
  });
}

async function init() {
  state.viewDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  bindEvents();
  await loadUserPlan();
  applyCalendarPlanGate();
  if (state.calendarLocked) return;
  await Promise.all([loadBirthFromProfile(), checkAiServer()]);
  renderCalendar();
}

init();

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

function renderDetail(date, personalMonth, personalDay, universalDay) {
  const guide = DAILY_GUIDE[personalDay] || DAILY_GUIDE[reduceNumber(personalDay, false)] || DAILY_GUIDE[1];
  const monthMessage = MONTHLY_MESSAGE[personalMonth] || MONTHLY_MESSAGE[reduceNumber(personalMonth, false)] || "";
  detailPanel.innerHTML = `
    <h2>${guide.key}의 날</h2>
    <p class="detail-date">${formatLongDate(date)}</p>
    <div class="metric">
      <div class="metric-item">
        <div class="metric-label">개인월수</div>
        <div class="metric-value">${personalMonth}</div>
      </div>
      <div class="metric-item">
        <div class="metric-label">개인일수</div>
        <div class="metric-value">${personalDay}</div>
      </div>
      <div class="metric-item">
        <div class="metric-label">일반일수</div>
        <div class="metric-value">${universalDay}</div>
      </div>
    </div>
    <div class="card-title">이번 달 흐름</div>
    <div class="text-card">${monthMessage}</div>
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
  `;
}

function renderCalendar() {
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

    const button = document.createElement("button");
    button.type = "button";
    button.className = `day${isCurrentMonth ? "" : " is-out"}${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}`;
    button.setAttribute("role", "gridcell");
    button.setAttribute("aria-selected", isSelected ? "true" : "false");
    button.setAttribute(
      "aria-label",
      `${date.getMonth() + 1}월 ${date.getDate()}일 개인일수 ${personalDay}, 일반일수 ${universalDay}`,
    );
    button.innerHTML = `
      <div class="day-num">${date.getDate()}</div>
      <div class="day-value">${personalDay}</div>
      <div class="day-keyword">${guide.key} · 일반 ${universalDay}</div>
    `;
    button.addEventListener("click", () => {
      if (!isCurrentMonth) return;
      state.selectedDate = new Date(date);
      renderCalendar();
      renderDetail(date, personalMonth, personalDay, universalDay);
    });
    calendarDays.appendChild(button);
  });

  if (!state.selectedDate || state.selectedDate.getMonth() !== state.viewDate.getMonth() || state.selectedDate.getFullYear() !== state.viewDate.getFullYear()) {
    state.selectedDate = new Date(year, month - 1, 1);
  }
  const firstPersonalDay = getPersonalDay(personalMonth, state.selectedDate.getDate());
  const firstUniversalDay = getUniversalDay(state.selectedDate);
  renderDetail(state.selectedDate, personalMonth, firstPersonalDay, firstUniversalDay);
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
  await loadBirthFromProfile();
  renderCalendar();
}

init();

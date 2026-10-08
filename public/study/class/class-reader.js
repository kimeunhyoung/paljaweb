/**
 * 수업자료 열람 (Private 전용)
 * 본문은 서버(/api/class/...)가 Private 확인 후에만 내려줘요. 이 파일에는 본문이 없어요.
 */
(function () {
  var SB_URL = 'https://sghsryumnrnftyjoqmwf.supabase.co';
  var SB_KEY = 'sb_publishable_6S3W_oWrzG-Nv8wLK98gmg_q_KcB2I1';
  var LABEL = { free: 'Free', basic: 'Basic', plus: 'Plus', pro: 'Plus', professional: 'Professional', private: 'Private' };
  /** 과목별 설정 — 페이지 <body data-course="..."> 로 고름 (없으면 인생여정수) */
  var COURSES = {
    lifepath: {
      page: '/study/class/lifepath.html',
      title: '인생여정수 1~9',
      unit: function (id) { return id + '번'; },
      parts: [
        { id: '1', name: '개척자, 리더' },
        { id: '2', name: '조율자, 파트너' },
        { id: '3', name: '표현가, 엔터테이너' },
        { id: '4', name: '건축가, 관리자' },
        { id: '5', name: '모험가, 자유인' },
        { id: '6', name: '보호자, 양육자' },
        { id: '7', name: '탐구자, 사색가' },
        { id: '8', name: '경영자, 실력자' },
        { id: '9', name: '인도주의자, 완성자' },
        { id: 'summary', name: '한눈에 보는 요약' },
      ],
    },
    'personal-year': {
      page: '/study/class/personal-year.html',
      title: '개인연도 1~9',
      unit: function (id) { return id + '의 해'; },
      parts: [
        { id: '1', name: '씨앗을 심는 해' },
        { id: '2', name: '뿌리를 내리는 해' },
        { id: '3', name: '밖으로 피어나는 해' },
        { id: '4', name: '기초를 다지는 해' },
        { id: '5', name: '틀을 깨고 움직이는 해' },
        { id: '6', name: '돌보고 책임지는 해' },
        { id: '7', name: '멈추고 돌아보는 해' },
        { id: '8', name: '거두고 보상받는 해' },
        { id: '9', name: '마무리하고 비우는 해' },
        { id: 'summary', name: '계산법과 9년 주기' },
      ],
    },
  };
  var COURSE = (document.body && document.body.getAttribute('data-course')) || 'lifepath';
  if (!COURSES[COURSE]) COURSE = 'lifepath';
  var CONF = COURSES[COURSE];
  var PARTS = CONF.parts;

  function $(id) { return document.getElementById(id); }
  function show(state, plan) {
    var nodes = document.querySelectorAll('[data-class-state]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].style.display = nodes[i].getAttribute('data-class-state') === state ? 'block' : 'none';
    }
    if (plan && $('classPlan')) $('classPlan').textContent = LABEL[String(plan).toLowerCase()] || plan;
  }
  function currentPart() {
    var n = new URLSearchParams(location.search).get('n') || '';
    for (var i = 0; i < PARTS.length; i++) if (PARTS[i].id === n) return PARTS[i];
    return null;
  }
  function href(p) { return CONF.page + (p ? '?n=' + p.id : ''); }

  function renderTabs(cur) {
    var h = '<a href="' + href(null) + '"' + (cur ? '' : ' class="on"') + '>목차</a>';
    PARTS.forEach(function (p) {
      var t = p.id === 'summary' ? '요약' : p.id;
      h += '<a href="' + href(p) + '"' + (cur && cur.id === p.id ? ' class="on" aria-current="page"' : '') + '>' + t + '</a>';
    });
    $('lpTabs').innerHTML = h;
  }
  function renderIndex() {
    var h = '';
    PARTS.forEach(function (p) {
      var isSum = p.id === 'summary';
      h += '<a class="lp-card' + (isSum ? ' lp-card-sum' : '') + '" href="' + href(p) + '">' +
        '<span class="lp-card-n">' + (isSum ? '∑' : p.id) + '</span>' +
        '<span class="lp-card-t">' + (isSum ? '부록' : CONF.unit(p.id)) + '</span>' +
        '<b>' + p.name + '</b></a>';
    });
    $('lpGrid').innerHTML = h;
    $('lpIndex').hidden = false;
  }
  function renderPn(cur) {
    var i = PARTS.indexOf(cur);
    var prev = i > 0 ? PARTS[i - 1] : null;
    var next = i < PARTS.length - 1 ? PARTS[i + 1] : null;
    function lab(p) { return p.id === 'summary' ? '부록 · ' + p.name : CONF.unit(p.id) + ' · ' + p.name; }
    $('lpPn').innerHTML =
      (prev ? '<a href="' + href(prev) + '">← ' + lab(prev) + '</a>' : '<a href="' + href(null) + '">← 목차</a>') +
      (next ? '<a class="next" href="' + href(next) + '">' + lab(next) + ' →</a>' : '<a class="next" href="' + href(null) + '">목차 →</a>');
  }

  function watermark(email) {
    var d = new Date();
    var stamp = (email || '') + ' · ' + d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate();
    var safe = stamp.replace(/[<>&"']/g, '');
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200">' +
      '<text x="20" y="120" transform="rotate(-22 180 100)" font-family="sans-serif" font-size="14" fill="#5a3a28" fill-opacity="0.10">' +
      safe + '</text></svg>';
    $('lpWm').style.backgroundImage = 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '")';
    $('lpWm').classList.add('on');
  }

  function protect() {
    var box = $('lpContent');
    ['contextmenu', 'copy', 'cut', 'dragstart', 'selectstart'].forEach(function (ev) {
      box.addEventListener(ev, function (e) { e.preventDefault(); });
    });
    document.addEventListener('keydown', function (e) {
      var k = String(e.key || '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 's', 'p', 'u', 'a'].indexOf(k) !== -1) e.preventDefault();
    });
    window.addEventListener('beforeprint', function () { box.setAttribute('data-print', '1'); });
  }

  async function run() {
    var cur = currentPart();
    renderTabs(cur);
    try {
      var g = window.supabase || globalThis.supabase;
      if (!g || typeof g.createClient !== 'function') { show('error'); return; }
      var sb = g.createClient(SB_URL, SB_KEY);
      var res = await sb.auth.getSession();
      var session = res.data && res.data.session;
      if (!session) {
        location.replace('/login.html?next=' + encodeURIComponent(location.pathname + location.search));
        return;
      }
      // 목차도 Private 확인 후 보여줌 (요약 파트로 권한 확인)
      var part = cur ? cur.id : 'summary';
      var r = await fetch('/api/class/' + COURSE + '/' + part, {
        headers: { Authorization: 'Bearer ' + session.access_token },
        cache: 'no-store',
      });
      if (r.status === 401) {
        location.replace('/login.html?next=' + encodeURIComponent(location.pathname + location.search));
        return;
      }
      if (r.status === 403) {
        var j = {};
        try { j = await r.json(); } catch (e) {}
        show('locked', j.plan || 'free');
        return;
      }
      if (!r.ok) { show('error'); return; }
      var data = await r.json();
      show('open');
      watermark(session.user && session.user.email);
      protect();
      if (cur) {
        $('lpContent').innerHTML = data.html || '';
        renderPn(cur);
        document.title = (cur.id === 'summary' ? '요약' : CONF.unit(cur.id) + ' ' + cur.name) + ' | ' + CONF.title + ' | 팔자연구소';
        if (location.hash) {
          var t = document.getElementById(location.hash.slice(1));
          if (t) t.scrollIntoView();
        }
      } else {
        renderIndex();
      }
    } catch (e) {
      show('error');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

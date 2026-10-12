/**
 * 질문점·내 차트로 묻기 → 상담사 고객 상담 기록(counselor_sessions)에 바로 넣기
 */
(function (global) {
  'use strict';

  function todayKstYmd() {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function trunc(s, n) {
    var t = String(s || '').trim();
    if (!t) return '';
    if (t.length <= n) return t;
    return t.slice(0, n);
  }

  function fmtDayKo(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return String(iso || '');
    return Number(m[2]) + '월 ' + Number(m[3]) + '일';
  }

  function fmtRangeKo(start, end) {
    if (!start) return '';
    if (!end || end === start) return fmtDayKo(start);
    return fmtDayKo(start) + ' ~ ' + fmtDayKo(end);
  }

  /** result 객체 → 세션 요약 텍스트 (결론 + 시기 후보 + 배경 + 조언) */
  function buildSummary(result) {
    var r = result && typeof result === 'object' ? result : {};
    var lines = [];
    var conclusion = String(r.conclusion || '').trim();
    if (conclusion) lines.push(conclusion);

    var timings = Array.isArray(r.timings) ? r.timings : [];
    if (timings.length) {
      lines.push('');
      lines.push('[시기 후보]');
      timings.forEach(function (t) {
        if (!t) return;
        var when = fmtRangeKo(t.start, t.end);
        var tags = [];
        if (t.top) tags.push('가장 유력');
        if (t.ongoing || /\(지금 진행 중\)|지금 진행 중/.test(String(t.reason_text || ''))) {
          tags.push('진행 중');
        }
        var tag = tags.length ? ' (' + tags.join(' · ') + ')' : '';
        var note = String(t.note || '').trim();
        var reason = String(t.reason_text || '').trim().replace(/\s*\(지금 진행 중\)/g, '');
        var body = note || reason;
        lines.push('· ' + when + tag + (body ? ' — ' + body : ''));
      });
    }

    var bg = Array.isArray(r.background) ? r.background : [];
    if (bg.length) {
      lines.push('');
      lines.push('[지금 깔려 있는 흐름]');
      bg.forEach(function (b) {
        if (!b) return;
        var text = String(b.reason_text || '').trim();
        if (!text) return;
        var until = b.end ? ' (~' + fmtDayKo(b.end) + '까지)' : '';
        lines.push('· ' + text + until);
      });
    }

    var advice = Array.isArray(r.advice) ? r.advice : [];
    if (advice.length) {
      lines.push('');
      lines.push('[조언]');
      advice.forEach(function (a) {
        var t = String(a || '').trim();
        if (t) lines.push('· ' + t);
      });
    }

    return lines.join('\n').trim();
  }

  function buildTopic(modeLabel, question) {
    return trunc((modeLabel || '질문') + ' · ' + String(question || '').trim(), 200) || null;
  }

  /**
   * @returns {Promise<{ok:boolean, error?:string, id?:string}>}
   */
  async function saveSession(opts) {
    opts = opts || {};
    var sb = opts.supabase;
    var counselorId = opts.counselorId;
    var clientId = opts.clientId;
    var result = opts.result;
    var modeLabel = opts.modeLabel || '질문';
    var question = opts.question || '';

    if (!sb) return { ok: false, error: '저장 준비 중이에요. 새로고침 후 다시 시도해 주세요.' };
    if (!counselorId) return { ok: false, error: '로그인이 필요해요.' };
    if (!clientId) {
      return { ok: false, error: '먼저 위에서 저장된 고객을 고른 뒤 질문해 주세요.' };
    }

    var summary = buildSummary(result);
    if (!summary) return { ok: false, error: '저장할 내용이 없어요.' };

    var payload = {
      counselor_id: counselorId,
      client_id: clientId,
      session_date: todayKstYmd(),
      topic: buildTopic(modeLabel, question),
      summary: summary,
      next_appointment: null,
      next_focus: null,
    };

    var res = await sb.from('counselor_sessions').insert(payload).select('id').maybeSingle();
    if (res.error && /topic|next_focus/i.test(res.error.message || '')) {
      delete payload.topic;
      delete payload.next_focus;
      res = await sb.from('counselor_sessions').insert(payload).select('id').maybeSingle();
    }
    if (res.error) {
      return { ok: false, error: res.error.message || '상담 기록에 저장하지 못했어요.' };
    }
    return { ok: true, id: res.data && res.data.id };
  }

  /** 결과 화면용 액션 HTML (상담사 + 고객 선택 시에만 활성 버튼) */
  function actionHtml(opts) {
    opts = opts || {};
    if (!opts.isCounselor) return '';
    if (opts.clientId) {
      return (
        '<div class="session-save-bar" id="askSessionSaveBar">' +
        '<button type="button" class="btn ghost" id="askSessionSaveBtn">상담 기록에 넣기</button>' +
        '<a class="btn ghost" href="counselor.html">상담사 허브</a>' +
        '<p class="session-save-msg" id="askSessionSaveMsg">이 고객 카드의 상담 기록에 결론·시기 후보를 넣어요.</p>' +
        '</div>'
      );
    }
    return (
      '<div class="session-save-bar muted" id="askSessionSaveBar">' +
      '<p class="session-save-msg">고객을 고르고 질문하면, 여기서 바로 <b>상담 기록에 넣기</b>를 할 수 있어요.</p>' +
      '<a class="btn ghost" href="counselor.html">상담사 허브</a>' +
      '</div>'
    );
  }

  function bindAction(opts) {
    opts = opts || {};
    var btn = document.getElementById('askSessionSaveBtn');
    var msg = document.getElementById('askSessionSaveMsg');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      if (msg) msg.textContent = '저장 중…';
      try {
        var out = await saveSession(opts);
        if (!out.ok) {
          if (msg) msg.textContent = out.error || '저장하지 못했어요.';
          btn.disabled = false;
          return;
        }
        if (msg) {
          msg.innerHTML =
            '상담 기록에 넣었어요. <a href="counselor.html">상담사 허브</a>에서 확인할 수 있어요.';
        }
        btn.textContent = '넣기 완료';
      } catch (e) {
        console.error('[ask-to-session]', e);
        if (msg) msg.textContent = '저장 중 오류가 났어요. 잠시 후 다시 시도해 주세요.';
        btn.disabled = false;
      }
    });
  }

  global.AskToSession = {
    buildSummary: buildSummary,
    saveSession: saveSession,
    actionHtml: actionHtml,
    bindAction: bindAction,
  };
})(typeof window !== 'undefined' ? window : globalThis);

/**
 * 상담사 AI 리딩 출력 — 가벼운 마크다운 → HTML (XSS escape)
 */
(function (global) {
  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function inlineFormat(s) {
    var t = escapeHtml(s);
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^*])\*(?!\s)(.+?)(?!\s)\*(?!\*)/g, '$1<em>$2</em>');
    return t;
  }

  function renderMarkdownLite(text) {
    var lines = String(text || '').split(/\r?\n/);
    var out = [];
    var inList = false;
    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i];
      var trimmed = line.trim();
      if (/^---+$/.test(trimmed)) {
        if (inList) {
          out.push('</ul>');
          inList = false;
        }
        out.push('<hr style="margin:16px 0 0;border:0;border-top:1px solid rgba(139,111,71,.28);">');
        continue;
      }
      var h = line.match(/^(#{1,3})\s+(.+)$/);
      if (h) {
        if (inList) {
          out.push('</ul>');
          inList = false;
        }
        var n = h[1].length;
        out.push('<h' + n + ' style="margin:' + (out.length ? '18px' : '0') + ' 0 8px;">' + inlineFormat(h[2]) + '</h' + n + '>');
        continue;
      }
      var li = line.match(/^[-*]\s+(.+)$/);
      if (li) {
        if (!inList) {
          out.push('<ul style="margin:6px 0 12px;padding-left:1.4em;list-style:disc outside;">');
          inList = true;
        }
        out.push('<li style="margin:4px 0;">' + inlineFormat(li[1]) + '</li>');
        continue;
      }
      if (!trimmed) {
        if (inList) {
          out.push('</ul>');
          inList = false;
        }
        continue;
      }
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      out.push('<p style="margin:0 0 10px;">' + inlineFormat(line) + '</p>');
    }
    if (inList) out.push('</ul>');
    return out.join('');
  }

  function setReadingOutput(el, text, opts) {
    if (!el) return;
    var empty = opts && opts.empty;
    var raw = String(text || '');
    if (empty || !raw.trim()) {
      el.classList.add('is-empty');
      el.textContent = raw;
      return;
    }
    el.classList.remove('is-empty');
    el.innerHTML = renderMarkdownLite(raw);
  }

  function readingPlainText(el) {
    if (!el) return '';
    return (el.innerText || el.textContent || '').trim();
  }

  global.PaljaAiReadingFormat = {
    escapeHtml: escapeHtml,
    renderMarkdownLite: renderMarkdownLite,
    setReadingOutput: setReadingOutput,
    readingPlainText: readingPlainText,
  };
})(typeof window !== 'undefined' ? window : globalThis);

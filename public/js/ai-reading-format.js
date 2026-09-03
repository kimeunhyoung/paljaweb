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
        out.push('<hr>');
        continue;
      }
      var h = line.match(/^(#{1,3})\s+(.+)$/);
      if (h) {
        if (inList) {
          out.push('</ul>');
          inList = false;
        }
        var n = h[1].length;
        out.push('<h' + n + '>' + inlineFormat(h[2]) + '</h' + n + '>');
        continue;
      }
      var li = line.match(/^[-*]\s+(.+)$/);
      if (li) {
        if (!inList) {
          out.push('<ul>');
          inList = true;
        }
        out.push('<li>' + inlineFormat(li[1]) + '</li>');
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
      out.push('<p>' + inlineFormat(line) + '</p>');
    }
    if (inList) out.push('</ul>');
    return out.join('\n');
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

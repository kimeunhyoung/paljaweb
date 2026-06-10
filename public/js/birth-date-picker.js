/**
 * Mobile-friendly year/month/day picker synced to a type="date" input.
 * Supports multiple fields per page with one shared bottom sheet.
 */
(function (global) {
  const DEFAULTS = {
    inputId: 'inputBirth',
    yearMin: 1900,
    yearMax: () => new Date().getFullYear(),
    mobileQuery: '(max-width: 768px)',
    pickRowId: 'birthPickRow',
    yearBtnId: 'birthYearBtn',
    monthBtnId: 'birthMonthBtn',
    dayBtnId: 'birthDayBtn',
    backdropId: 'birthPickerBackdrop',
    titleId: 'birthPickerTitle',
    listId: 'birthPickerList',
  };

  let sharedUi = null;
  let activeInstance = null;
  let modeListenerBound = false;

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function birthMaxDay(birthPick) {
    const y = parseInt(birthPick.y, 10);
    const m = parseInt(birthPick.m, 10);
    if (!y || !m) return 31;
    return new Date(y, m, 0).getDate();
  }

  function syncInputFromPick(input, birthPick) {
    const y = parseInt(birthPick.y, 10);
    const m = parseInt(birthPick.m, 10);
    const d = parseInt(birthPick.d, 10);
    input.value = y && m && d ? `${y}-${pad2(m)}-${pad2(d)}` : '';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setBtn(btn, val, suffix, placeholder) {
    if (!btn) return;
    if (val) {
      btn.textContent = val + suffix;
      btn.classList.remove('is-placeholder');
    } else {
      btn.textContent = placeholder;
      btn.classList.add('is-placeholder');
    }
  }

  function ensureSharedUi(cfg) {
    if (sharedUi) return sharedUi;

    const backdrop = document.getElementById(cfg.backdropId);
    const title = document.getElementById(cfg.titleId);
    const list = document.getElementById(cfg.listId);
    if (!backdrop || !title || !list) return null;

    const closeBirthPicker = (apply) => {
      if (!activeInstance) return;
      const inst = activeInstance;
      if (apply && inst.pickerField && inst.pickerDraft) {
        inst.birthPick[inst.pickerField] = inst.pickerDraft;
        if (inst.pickerField === 'y' || inst.pickerField === 'm') {
          const maxD = birthMaxDay(inst.birthPick);
          const d = parseInt(inst.birthPick.d, 10);
          if (d && d > maxD) inst.birthPick.d = '';
        }
        inst.syncBirthPickButtons();
        syncInputFromPick(inst.input, inst.birthPick);
      }
      inst.pickerField = null;
      inst.pickerDraft = '';
      activeInstance = null;
      backdrop.classList.remove('is-open');
      backdrop.hidden = true;
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    const renderBirthPickerList = () => {
      if (!activeInstance || !activeInstance.pickerField) return;
      const inst = activeInstance;
      const items = inst.buildBirthPickerOptions(inst.pickerField);
      const current = inst.pickerDraft || inst.birthPick[inst.pickerField] || '';
      list.innerHTML = items
        .map((it) => {
          const sel = it.value === current ? ' is-selected' : '';
          return `<li><button type="button" class="birth-picker-item${sel}" data-value="${it.value}">` +
            `<span class="birth-picker-radio" aria-hidden="true"></span><span>${it.label}</span></button></li>`;
        })
        .join('');
      list.querySelectorAll('.birth-picker-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          const val = btn.getAttribute('data-value') || '';
          if (!val || !activeInstance) return;
          activeInstance.pickerDraft = val;
          closeBirthPicker(true);
        });
      });
      const selected = list.querySelector('.birth-picker-item.is-selected');
      if (selected) selected.scrollIntoView({ block: 'nearest' });
    };

    const openBirthPicker = (inst, field) => {
      activeInstance = inst;
      inst.pickerField = field;
      inst.pickerDraft = inst.birthPick[field] || '';
      const labels = { y: '연도 선택', m: '월 선택', d: '일 선택' };
      title.textContent = labels[field] || '선택';
      renderBirthPickerList();
      backdrop.hidden = false;
      backdrop.classList.add('is-open');
      backdrop.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeBirthPicker(false);
    });
    const sheet = backdrop.querySelector('.birth-picker-sheet');
    if (sheet) sheet.addEventListener('click', (e) => e.stopPropagation());

    sharedUi = { backdrop, title, list, openBirthPicker, closeBirthPicker };
    return sharedUi;
  }

  function init(opts) {
    const cfg = { ...DEFAULTS, ...opts };
    const ui = ensureSharedUi(cfg);
    const input = document.getElementById(cfg.inputId);
    const pickRow = document.getElementById(cfg.pickRowId);
    const yBtn = document.getElementById(cfg.yearBtnId);
    const mBtn = document.getElementById(cfg.monthBtnId);
    const dBtn = document.getElementById(cfg.dayBtnId);
    if (!ui || !input || !pickRow || !yBtn || !mBtn || !dBtn) return null;

    const birthPick = { y: '', m: '', d: '' };
    const instance = {
      cfg,
      input,
      pickRow,
      yBtn,
      mBtn,
      dBtn,
      birthPick,
      pickerField: null,
      pickerDraft: '',
      syncBirthPickButtons() {
        setBtn(yBtn, birthPick.y, '년', '연도');
        setBtn(mBtn, birthPick.m, '월', '월');
        setBtn(dBtn, birthPick.d, '일', '일');
      },
      buildBirthPickerOptions(field) {
        const items = [];
        const maxY = typeof cfg.yearMax === 'function' ? cfg.yearMax() : cfg.yearMax;
        if (field === 'y') {
          for (let y = maxY; y >= cfg.yearMin; y--) items.push({ value: String(y), label: `${y}년` });
        } else if (field === 'm') {
          for (let m = 1; m <= 12; m++) items.push({ value: String(m), label: `${m}월` });
        } else {
          const maxD = birthMaxDay(birthPick);
          for (let d = 1; d <= maxD; d++) items.push({ value: String(d), label: `${d}일` });
        }
        return items;
      },
    };

    const syncPickFromInput = () => {
      const v = (input.value || '').trim();
      if (!v) {
        birthPick.y = '';
        birthPick.m = '';
        birthPick.d = '';
        instance.syncBirthPickButtons();
        return;
      }
      const parts = v.split('-').map(Number);
      if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return;
      birthPick.y = String(parts[0]);
      birthPick.m = String(parts[1]);
      birthPick.d = String(parts[2]);
      instance.syncBirthPickButtons();
    };

    const updateMode = () => {
      const mobile = window.matchMedia(cfg.mobileQuery).matches;
      pickRow.hidden = !mobile;
      input.classList.toggle('birth-date-native--hidden', mobile);
    };

    yBtn.addEventListener('click', () => ui.openBirthPicker(instance, 'y'));
    mBtn.addEventListener('click', () => ui.openBirthPicker(instance, 'm'));
    dBtn.addEventListener('click', () => ui.openBirthPicker(instance, 'd'));
    input.addEventListener('change', syncPickFromInput);

    const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (originalDescriptor?.set) {
      const nativeSet = originalDescriptor.set;
      Object.defineProperty(input, 'value', {
        get() {
          return originalDescriptor.get.call(this);
        },
        set(v) {
          nativeSet.call(this, v);
          syncPickFromInput();
        },
        configurable: true,
      });
    }

    if (!modeListenerBound) {
      window.matchMedia(cfg.mobileQuery).addEventListener('change', () => {
        document.querySelectorAll('.birth-pick').forEach((row) => {
          const mobile = window.matchMedia(cfg.mobileQuery).matches;
          row.hidden = !mobile;
        });
        document.querySelectorAll('.birth-date-native').forEach((el) => {
          const mobile = window.matchMedia(cfg.mobileQuery).matches;
          el.classList.toggle('birth-date-native--hidden', mobile);
        });
      });
      modeListenerBound = true;
    }

    updateMode();
    syncPickFromInput();
    return instance;
  }

  function initAll(configs) {
    return configs.map((cfg) => init(cfg)).filter(Boolean);
  }

  global.PaljaBirthDatePicker = { init, initAll };
})(window);

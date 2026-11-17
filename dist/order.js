(() => {
  'use strict';

  const finishes = {
    white: { name: 'Белый', body: ['#fffefa', '#eeece7', '#dcdcd7', '#acafb1'] },
    gray: { name: 'Серый', body: ['#eeeff0', '#cdd0d3', '#b8bec4', '#858e97'] },
  };
  const lights = {
    peach: { name: 'Персиковый', rgb: '243,197,170' },
    rose: { name: 'Пудровый', rgb: '234,198,211' },
    lavender: { name: 'Лавандовый', rgb: '207,200,235' },
    sky: { name: 'Небесный', rgb: '189,215,233' },
    mint: { name: 'Мятный', rgb: '199,221,208' },
    butter: { name: 'Сливочный', rgb: '240,225,181' },
  };
  const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const receiptKey = 'aura-demo-receipt-v1';
  const fallback = { finish: 'white', light: 'peach', brightness: 65 };

  function sanitize(value) {
    return {
      finish: owns(finishes, value?.finish) ? value.finish : fallback.finish,
      light: owns(lights, value?.light) ? value.light : fallback.light,
      brightness: Number.isFinite(Number(value?.brightness)) && value?.brightness !== null && value?.brightness !== ''
        ? Math.max(10, Math.min(100, Math.round(Number(value.brightness)))) : 65,
    };
  }

  function showSelection(selection) {
    document.querySelectorAll('[data-selection-finish]').forEach(node => { node.textContent = finishes[selection.finish].name; });
    document.querySelectorAll('[data-selection-light]').forEach(node => { node.textContent = lights[selection.light].name; });
    document.querySelectorAll('[data-selection-brightness]').forEach(node => { node.textContent = selection.brightness + '%'; });
    ['hi', 'mid', 'base', 'dark'].forEach((name, index) => document.documentElement.style.setProperty('--body-' + name, finishes[selection.finish].body[index]));
    document.documentElement.style.setProperty('--light-rgb', lights[selection.light].rgb);
    document.documentElement.style.setProperty('--scene-brightness', String(selection.brightness / 100));
    document.querySelector('[data-lamp="order"]')?.setAttribute('aria-label', `AURA. Корпус: ${finishes[selection.finish].name}. Свет: ${lights[selection.light].name}. Яркость: ${selection.brightness}%.`);
  }

  const form = document.querySelector('#order-form');
  if (form) {
    let saved;
    try { saved = JSON.parse(localStorage.getItem('aura-design-config-v1')); } catch { /* Defaults remain available. */ }
    const query = new URLSearchParams(window.location.search);
    const selection = sanitize({
      finish: query.has('body') ? query.get('body') : saved?.finish,
      light: query.has('light') ? query.get('light') : saved?.light,
      brightness: query.has('brightness') ? query.get('brightness') : saved?.brightness,
    });
    showSelection(selection);
    const button = document.querySelector('#submit-order');
    const status = document.querySelector('#order-status');
    button.disabled = false;
    let submitting = false;
    document.querySelector('#fill-demo').addEventListener('click', () => {
      form.elements.namedItem('name').value = 'Гость';
      form.elements.namedItem('telegram').value = '@aura_guest';
      form.elements.namedItem('message').value = 'Хочу попробовать AURA для спокойных вечеров.';
      status.textContent = 'Пример заполнен. Проверьте поля и подтвердите условия демо.';
      form.elements.namedItem('name').focus();
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (submitting) return;
      status.textContent = '';
      const name = form.elements.namedItem('name');
      const telegram = form.elements.namedItem('telegram');
      name.setCustomValidity(name.value.trim().length < 2 ? 'Введите тестовое имя: не меньше двух символов.' : '');
      telegram.setCustomValidity(/^@[A-Za-z0-9_]{5,32}$/.test(telegram.value.trim()) ? '' : 'Используйте тестовый username: @ и от 5 до 32 латинских букв, цифр или символов _.');
      if (!form.reportValidity()) return;
      submitting = true;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      try {
        // Only a non-personal demo receipt is saved. Form values stay in memory.
        sessionStorage.setItem(receiptKey, JSON.stringify({ mode: 'demo', createdAt: Date.now(), selection }));
        window.AuraAnalytics?.track('demo_order_complete', {
          body_finish: selection.finish, light_color: selection.light, brightness: selection.brightness,
        });
        form.reset();
        window.location.assign('/thanks/');
      } catch {
        status.textContent = 'Не удалось открыть подтверждение. Проверьте, разрешено ли хранилище для этого сайта, и попробуйте ещё раз.';
        status.focus();
        button.disabled = false;
        button.removeAttribute('aria-busy');
        submitting = false;
      }
    });
    for (const field of [form.elements.namedItem('name'), form.elements.namedItem('telegram')]) {
      field.addEventListener('input', () => field.setCustomValidity(''));
    }
  }

  const confirmation = document.querySelector('#demo-confirmation');
  if (confirmation) {
    let receipt;
    try { receipt = JSON.parse(sessionStorage.getItem(receiptKey)); } catch { /* A direct visit is not a submitted order. */ }
    const age = Date.now() - receipt?.createdAt;
    if (receipt?.mode === 'demo' && Number.isFinite(age) && age >= 0 && age < 30 * 60 * 1000) {
      showSelection(sanitize(receipt.selection));
      confirmation.hidden = false;
      document.querySelector('#no-order-yet').hidden = true;
      const emphasis = document.createElement('em');
      emphasis.textContent = 'Ваш уют уже ближе.';
      document.querySelector('#thanks-title').replaceChildren(document.createTextNode('Спасибо.'), document.createElement('br'), emphasis);
    } else {
      try { sessionStorage.removeItem(receiptKey); } catch { /* Optional cleanup. */ }
    }
  }
})();

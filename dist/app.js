(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const finishes = {
    white: { name: 'Белый', file: 'belyy', background: '#ece9e4', body: ['#fffefa', '#eeece7', '#dcdcd7', '#acafb1'] },
    gray: { name: 'Серый', file: 'seryy', background: '#e1e2e4', body: ['#eeeff0', '#cdd0d3', '#b8bec4', '#858e97'] },
  };
  const lightColors = {
    peach: { name: 'Персиковый', file: 'persikovyy', hex: '#f3c5aa', rgb: [243, 197, 170] },
    rose: { name: 'Пудровый', file: 'pudrovyy', hex: '#eac6d3', rgb: [234, 198, 211] },
    lavender: { name: 'Лавандовый', file: 'lavandovyy', hex: '#cfc8eb', rgb: [207, 200, 235] },
    sky: { name: 'Небесный', file: 'nebesnyy', hex: '#bdd7e9', rgb: [189, 215, 233] },
    mint: { name: 'Мятный', file: 'myatnyy', hex: '#c7ddd0', rgb: [199, 221, 208] },
    butter: { name: 'Сливочный', file: 'slivochnyy', hex: '#f0e1b5', rgb: [240, 225, 181] },
  };
  const moods = {
    focus: { name: 'В потоке', light: 'sky', brightness: 90, label: 'СВЕТ ДЛЯ ВАШИХ ИДЕЙ', description: 'Для работы, чтения и новых идей. Выберите пастельный оттенок и удобную яркость.' },
    relax: { name: 'На паузе', light: 'peach', brightness: 65, label: 'МОЖНО НИКУДА НЕ СПЕШИТЬ', description: 'Для спокойной паузы и любимой музыки. Выберите пастельный оттенок и подходящую яркость.' },
    evening: { name: 'Без спешки', light: 'lavender', brightness: 30, label: 'ТИХИЙ ВЕЧЕР В ВАШЕМ РИТМЕ', description: 'Для вечернего отдыха и чтения перед сном. Цвет освещения и яркость можно менять отдельно.' },
  };
  const storageKey = 'aura-design-config-v1';
  const motionKey = 'aura-motion-paused';
  const state = { finish: 'white', light: 'peach', mood: 'relax', brightness: 65 };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let motionPaused = reduceMotion.matches;
  let previousFocus = null;
  let saveStatusTimer;
  const lightSurfaces = [$('#hero-stage'), $('.mood-visual'), $('.config-preview')];
  const lightMotion = { current: .65, target: .65, velocity: 0, color: [243, 197, 170], colorTarget: [243, 197, 170], colorVelocity: [0, 0, 0], frame: null, lastTime: null };

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && typeof saved === 'object') {
      const legacyFinish = { sage: 'gray', cream: 'white', lavender: 'gray' };
      if (owns(finishes, saved.finish)) state.finish = saved.finish;
      else if (owns(legacyFinish, saved.finish)) state.finish = legacyFinish[saved.finish];
      if (owns(moods, saved.mood)) state.mood = saved.mood;
      state.light = owns(lightColors, saved.light) ? saved.light : moods[state.mood].light;
      if (Number.isFinite(saved.brightness)) state.brightness = Math.min(100, Math.max(10, Math.round(saved.brightness)));
    }
    const savedMotion = localStorage.getItem(motionKey);
    if (savedMotion !== null) motionPaused = savedMotion === 'true';
  } catch { /* The experience also works when browser storage is unavailable. */ }

  function updateSelectionSummary() {
    $('#config-selection-summary').textContent = `${finishes[state.finish].name} · ${lightColors[state.light].name} · ${state.brightness}%`;
  }

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* Optional persistence. */ }
    $('#save-status').textContent = '';
    $('#save-status').classList.remove('is-error');
  }

  function updateLampLabels() {
    $$('[data-lamp]').forEach(lamp => lamp.setAttribute('aria-label', `Светильник AURA. Корпус: ${finishes[state.finish].name}. Освещение: ${lightColors[state.light].name}.`));
  }

  function setFinish(finish, save = true) {
    if (!owns(finishes, finish)) return;
    state.finish = finish;
    ['hi', 'mid', 'base', 'dark'].forEach((token, i) => document.documentElement.style.setProperty(`--body-${token}`, finishes[finish].body[i]));
    $$('[data-lamp]').forEach(lamp => lamp.setAttribute('data-finish', finish));
    $('#hero-stage').dataset.finish = finish;
    $('#hero-finish-label').textContent = finishes[finish].name;
    $$('button[data-finish]').forEach(button => {
      const selected = button.dataset.finish === finish;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    updateLampLabels();
    updateSelectionSummary();
    if (save) persist();
  }

  function setLightColor(color, save = true, animate = true) {
    if (!owns(lightColors, color)) return;
    state.light = color;
    $$('button[data-light]').forEach(button => {
      const selected = button.dataset.light === color;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    for (const selector of ['#scene-light-label', '#config-light-label', '#scene-color-name', '#hero-light-name']) $(selector).textContent = lightColors[color].name;
    updateLampLabels();
    updateSelectionSummary();
    moveLightTo(state.brightness / 100, animate, lightColors[color].rgb);
    if (save) persist();
  }

  function renderLight(value, color = lightMotion.color) {
    lightMotion.current = value;
    lightMotion.color = [...color];
    for (const surface of lightSurfaces) surface.style.setProperty('--scene-brightness', value.toFixed(4));
    document.documentElement.style.setProperty('--light-rgb', color.map(channel => channel.toFixed(2)).join(', '));
  }

  function finishLightMotion() {
    if (lightMotion.frame !== null) cancelAnimationFrame(lightMotion.frame);
    lightMotion.frame = null;
    lightMotion.lastTime = null;
    lightMotion.velocity = 0;
    lightMotion.colorVelocity = [0, 0, 0];
    renderLight(lightMotion.target, lightMotion.colorTarget);
  }

  function dampedValue(current, target, velocity, elapsed, precision, velocityPrecision) {
    const frequency = 14;
    const offset = current - target;
    const decay = Math.exp(-frequency * elapsed);
    const change = (velocity + frequency * offset) * elapsed;
    const next = target + (offset + change) * decay;
    const nextVelocity = (velocity - frequency * change) * decay;
    const crossed = (target - next) * (target - current) < 0;
    const settled = Math.abs(offset) < precision || crossed || (Math.abs(target - next) < precision && Math.abs(nextVelocity) < velocityPrecision);
    return settled ? { value: target, velocity: 0, settled: true } : { value: next, velocity: nextVelocity, settled: false };
  }

  function stepLightMotion(timestamp) {
    lightMotion.frame = null;
    if (motionPaused || document.hidden) { finishLightMotion(); return; }
    const elapsed = lightMotion.lastTime === null ? 1 / 60 : Math.min(Math.max((timestamp - lightMotion.lastTime) / 1000, 0), .05);
    lightMotion.lastTime = timestamp;
    const brightness = dampedValue(lightMotion.current, lightMotion.target, lightMotion.velocity, elapsed, .0005, .005);
    const color = lightMotion.color.map((channel, i) => dampedValue(channel, lightMotion.colorTarget[i], lightMotion.colorVelocity[i], elapsed, .04, .3));
    if (brightness.settled && color.every(channel => channel.settled)) { finishLightMotion(); return; }
    lightMotion.velocity = brightness.velocity;
    lightMotion.colorVelocity = color.map(channel => channel.velocity);
    renderLight(Math.min(1, Math.max(.1, brightness.value)), color.map(channel => channel.value));
    lightMotion.frame = requestAnimationFrame(stepLightMotion);
  }

  function moveLightTo(value, animate, color = lightMotion.colorTarget) {
    lightMotion.target = value;
    lightMotion.colorTarget = [...color];
    const atTarget = Math.abs(value - lightMotion.current) < .0005 && color.every((channel, i) => Math.abs(channel - lightMotion.color[i]) < .04);
    if (!animate || motionPaused || document.hidden || atTarget) { finishLightMotion(); return; }
    if ((value - lightMotion.current) * lightMotion.velocity < 0) lightMotion.velocity = 0;
    lightMotion.colorVelocity = lightMotion.colorVelocity.map((velocity, i) => (color[i] - lightMotion.color[i]) * velocity < 0 ? 0 : velocity);
    if (lightMotion.frame === null) {
      lightMotion.lastTime = null;
      lightMotion.frame = requestAnimationFrame(stepLightMotion);
    }
  }

  function setBrightness(value, save = true, animate = true) {
    const brightness = Number(value);
    if (!Number.isFinite(brightness)) return;
    state.brightness = Math.min(100, Math.max(10, Math.round(brightness)));
    const ratio = (state.brightness - 10) / 90 * 100;
    for (const input of [$('#scene-brightness'), $('#config-brightness')]) {
      input.value = String(state.brightness);
      input.style.setProperty('--range', `${ratio}%`);
      input.setAttribute('aria-valuetext', `${state.brightness} процентов`);
    }
    $('#brightness-value').textContent = `${state.brightness}%`;
    $('#config-brightness-value').textContent = `${state.brightness}%`;
    moveLightTo(state.brightness / 100, animate, lightColors[state.light].rgb);
    updateSelectionSummary();
    if (save) persist();
  }

  function setMood(mood, resetBrightness = true, save = true, animate = true) {
    if (!owns(moods, mood)) return;
    state.mood = mood;
    const selected = moods[mood];
    $('#moods').dataset.mood = mood;
    $('.config-preview').dataset.mood = mood;
    $$('.mood-tabs [role=tab]').forEach(tab => {
      const active = tab.dataset.mood === mood;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    $('#mood-panel').setAttribute('aria-labelledby', `tab-${mood}`);
    const description = $('#mood-description');
    description.textContent = selected.description.replace('\n', ' ');
    $('#scene-label').textContent = selected.label;
    setLightColor(resetBrightness ? selected.light : state.light, false, animate);
    setBrightness(resetBrightness ? selected.brightness : state.brightness, false, animate);
    if (save) persist();
  }

  $$('button[data-finish]').forEach(button => button.addEventListener('click', () => setFinish(button.dataset.finish)));
  $$('.mood-tabs [role=tab]').forEach(tab => tab.addEventListener('click', () => setMood(tab.dataset.mood)));
  $$('button[data-light]').forEach(button => button.addEventListener('click', () => setLightColor(button.dataset.light)));
  for (const input of [$('#scene-brightness'), $('#config-brightness')]) input.addEventListener('input', () => setBrightness(input.value));

  $('.mood-tabs').addEventListener('keydown', event => {
    const tabs = $$('.mood-tabs [role=tab]');
    const current = tabs.indexOf(document.activeElement);
    if (current < 0) return;
    let next;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (current + 1) % tabs.length;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (current + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      tabs[next].focus();
      setMood(tabs[next].dataset.mood);
    }
  });

  const power = $('#hero-power');
  power.addEventListener('click', () => {
    const on = power.getAttribute('aria-pressed') !== 'true';
    power.setAttribute('aria-pressed', String(on));
    power.setAttribute('aria-label', on ? 'Выключить свет' : 'Включить свет');
    $('#hero-stage').dataset.on = String(on);
    $('#hero-light-status').textContent = on ? 'СВЕТ ВКЛЮЧЁН' : 'СВЕТ ВЫКЛЮЧЕН';
  });

  const menuToggle = $('.menu-toggle');
  const mobileNav = $('#mobile-nav');
  function closeMenu() {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Открыть меню');
    mobileNav.hidden = true;
  }
  menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(expanded));
    menuToggle.setAttribute('aria-label', expanded ? 'Закрыть меню' : 'Открыть меню');
    mobileNav.hidden = !expanded;
  });
  $$('#mobile-nav a').forEach(link => link.addEventListener('click', closeMenu));
  matchMedia('(max-width: 900px)').addEventListener('change', closeMenu);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileNav.hidden) {
      closeMenu();
      menuToggle.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!mobileNav.hidden && !mobileNav.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
  });

  const dialog = $('#config-dialog');
  $$('[data-open-config]').forEach(button => button.addEventListener('click', () => {
    previousFocus = button;
    closeMenu();
    $('#save-status').textContent = '';
    $('#save-status').classList.remove('is-error');
    dialog.showModal();
    $('.config-body', dialog).scrollTop = 0;
    $('.close-dialog', dialog).focus({ preventScroll: true });
  }));
  $('.close-dialog', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => previousFocus?.focus({ preventScroll: true }));
  $('#reset-config').addEventListener('click', () => {
    setFinish('white');
    setMood('relax');
    $('#save-status').textContent = 'Настройки сброшены: белый корпус, персиковый свет, яркость 65%.';
  });

  $('#save-config').addEventListener('click', async () => {
    const button = $('#save-config');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    $('#save-config-label').textContent = 'Готовим карточку…';
    $('#save-status').classList.remove('is-error');
    $('#save-status').textContent = 'Создаём карточку…';
    const configuration = { ...state };
    try {
      const [response, logoResponse] = await Promise.all([
        fetch(`./assets/lamp-${configuration.finish}.svg`),
        fetch('./assets/aura-logo.svg'),
      ]);
      if (!response.ok || !logoResponse.ok) throw new Error('Asset unavailable');
      const [lamp, logo] = await Promise.all([response.text(), logoResponse.text()]);
      const finish = finishes[configuration.finish];
      const lighting = lightColors[configuration.light];
      const lampDoc = new DOMParser().parseFromString(lamp, 'image/svg+xml');
      if (lampDoc.querySelector('parsererror')) throw new Error('Invalid lamp asset');
      const lampSvg = lampDoc.documentElement;
      lampSvg.querySelectorAll('[style]').forEach(node => node.removeAttribute('style'));
      lampSvg.querySelectorAll('[data-light-stop="color"]').forEach(stop => stop.setAttribute('stop-color', lighting.hex));
      lampSvg.querySelectorAll('.lamp-emission').forEach(node => node.setAttribute('opacity', String(configuration.brightness / 100)));
      const lampInner = lampSvg.innerHTML;
      const logoInner = logo.slice(logo.indexOf('>') + 1, logo.lastIndexOf('</svg>'));
      const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1200" viewBox="0 0 1000 1200">
        <rect width="1000" height="1200" fill="#f5f3eb"/>
        <svg x="62" y="30" width="228" height="81" viewBox="0 0 272 96">${logoInner}</svg>
        <text x="930" y="80" text-anchor="end" font-family="Arial,sans-serif" font-size="12" letter-spacing="2" fill="#8a7d8b">ВАША AURA 01 / 2026</text>
        <circle cx="500" cy="500" r="335" fill="${lighting.hex}" fill-opacity=".45"/>
        <svg x="90" y="110" width="820" height="850" viewBox="0 0 680 740" fill="none">${lampInner}</svg>
        <text x="68" y="945" font-family="Georgia,serif" font-style="italic" font-size="62" fill="#453348">Ваш цвет света. Ваш уют.</text>
        <path d="M68 985H932" stroke="#d5ced5"/>
        <g font-family="Arial,sans-serif" fill="#84768a" font-size="11" letter-spacing="1.5"><text x="68" y="1025">КОРПУС</text><text x="350" y="1025">ОСВЕЩЕНИЕ</text><text x="670" y="1025">ЯРКОСТЬ</text></g>
        <g font-family="Arial,sans-serif" fill="#453348" font-size="24"><text x="68" y="1070">${finish.name}</text><text x="350" y="1070">${lighting.name}</text><text x="670" y="1070">${configuration.brightness}%</text></g>
        <text x="68" y="1150" font-family="Arial,sans-serif" fill="#9a8c97" font-size="10" letter-spacing="1">AURA STUDIO · ДИЗАЙН-КОНЦЕПТ · ВЫМЫШЛЕННЫЙ ПРОДУКТ</text>
      </svg>`;
      const url = URL.createObjectURL(new Blob([card], { type: 'image/svg+xml;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `aura-${finish.file}-${lighting.file}-${configuration.brightness}.svg`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      $('#save-status').textContent = 'Готово! Карточка скачивается.';
      clearTimeout(saveStatusTimer);
      saveStatusTimer = setTimeout(() => { $('#save-status').textContent = ''; }, 10000);
    } catch {
      $('#save-status').classList.add('is-error');
      $('#save-status').textContent = 'Не удалось скачать карточку. Попробуйте ещё раз.';
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      $('#save-config-label').textContent = 'Скачать карточку';
    }
  });

  let observer;
  function applyMotion() {
    document.body.classList.toggle('motion-paused', motionPaused);
    document.body.classList.toggle('motion-enabled', !motionPaused);
    document.documentElement.style.scrollBehavior = motionPaused ? 'auto' : 'smooth';
    $('#motion-toggle').setAttribute('aria-pressed', String(motionPaused));
    $('#motion-toggle').setAttribute('aria-label', motionPaused ? 'Включить анимацию' : 'Отключить анимацию');
    $('#motion-label').textContent = motionPaused ? 'Анимация выключена' : 'Анимация включена';
    if (motionPaused) $$('.reveal').forEach(element => element.classList.add('is-visible'));
    $('#hero-stage').style.setProperty('--lamp-x', '0px');
    $('#hero-stage').style.setProperty('--lamp-y', '0px');
    if (motionPaused) finishLightMotion();
  }
  $('#motion-toggle').addEventListener('click', () => {
    motionPaused = !motionPaused;
    try { localStorage.setItem(motionKey, String(motionPaused)); } catch { /* Optional. */ }
    applyMotion();
  });
  reduceMotion.addEventListener('change', event => {
    motionPaused = event.matches;
    applyMotion();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) finishLightMotion();
  });
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -35px 0px', threshold: 0.08 });
    $$('.reveal').forEach(element => observer.observe(element));
    const ambientObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('animation-offscreen', !entry.isIntersecting));
    });
    $$('.hero-art, .marquee, .touch-art, .closing').forEach(element => ambientObserver.observe(element));
  } else $$('.reveal').forEach(element => element.classList.add('is-visible'));

  const hero = $('#hero-stage');
  const finePointer = matchMedia('(pointer: fine)');
  let pointerFrame = 0;
  hero.addEventListener('pointermove', event => {
    if (motionPaused || !finePointer.matches) return;
    cancelAnimationFrame(pointerFrame);
    pointerFrame = requestAnimationFrame(() => {
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      hero.style.setProperty('--lamp-x', `${x * 15}px`);
      hero.style.setProperty('--lamp-y', `${y * 11}px`);
    });
  });
  hero.addEventListener('pointerleave', () => {
    cancelAnimationFrame(pointerFrame);
    hero.style.setProperty('--lamp-x', '0px');
    hero.style.setProperty('--lamp-y', '0px');
  });

  let scrollFrame = 0;
  function updateProgress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    $('.scroll-progress').style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  }
  addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      updateProgress();
      scrollFrame = 0;
    });
  }, { passive: true });
  addEventListener('resize', updateProgress, { passive: true });

  setFinish(state.finish, false);
  setMood(state.mood, false, false, false);
  applyMotion();
  updateProgress();
})();

(() => {
  'use strict';

  const config = window.AURA_SITE || {};
  const measurementId = /^G-[A-Z0-9]{6,20}$/.test(config.gaMeasurementId || '') ? config.gaMeasurementId : '';
  const consentKey = 'aura-analytics-consent-v1';
  const banner = document.querySelector('#analytics-consent');
  const preferences = [...document.querySelectorAll('[data-cookie-settings]')];
  let consent = null;
  let initialized = false;
  try { consent = localStorage.getItem(consentKey); } catch { /* Consent can also be session-only. */ }

  function updatePrivacyText() {
    document.querySelectorAll('[data-analytics-state]').forEach(node => {
      node.textContent = measurementId
        ? 'Google Analytics 4 загружается только с вашего согласия. Выбор можно изменить кнопкой «Настройки аналитики» внизу страницы.'
        : 'В этой демоверсии Google Analytics 4 не активирован: идентификатор счётчика не задан, код Google не загружается.';
    });
  }

  function pageLocation() {
    return window.location.origin + window.location.pathname;
  }

  const allowedEvents = new Set(['page_view', 'order_start', 'demo_order_complete', 'download_config', 'faq_open']);
  function track(name, parameters = {}) {
    if (!measurementId || consent !== 'granted' || !initialized || !allowedEvents.has(name)) return;
    const safe = {};
    for (const key of ['body_finish', 'light_color', 'source', 'question_id']) {
      if (/^[a-z0-9_-]{1,40}$/.test(parameters[key] || '')) safe[key] = parameters[key];
    }
    if (Number.isFinite(parameters.brightness)) safe.brightness = Math.min(100, Math.max(10, parameters.brightness));
    // Never include form values, query parameters or a fragment in analytics.
    window.gtag('event', name, { ...safe, page_location: pageLocation(), page_title: document.title });
  }
  window.AuraAnalytics = Object.freeze({ track });

  function initializeAnalytics() {
    if (!measurementId || consent !== 'granted') return;
    window['ga-disable-' + measurementId] = false;
    if (initialized) return;
    initialized = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied',
    });
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      send_page_view: false,
      page_location: pageLocation(),
      page_referrer: '',
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_flags: 'SameSite=Lax;Secure',
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    script.dataset.auraAnalytics = 'true';
    document.head.append(script);
    track('page_view');
  }

  function clearAnalyticsCookies() {
    if (!measurementId) return;
    const names = ['_ga', '_ga_' + measurementId.slice(2)];
    const host = window.location.hostname.split('.');
    const domains = ['', ...host.slice(0, -1).map((_, index) => '.' + host.slice(index).join('.'))];
    for (const name of names) for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? '; domain=' + domain : ''}`;
    }
  }

  function chooseConsent(value) {
    consent = value;
    try { localStorage.setItem(consentKey, value); } catch { /* Optional persistence. */ }
    if (banner) banner.hidden = true;
    if (value === 'granted') initializeAnalytics();
    else {
      if (measurementId) window['ga-disable-' + measurementId] = true;
      clearAnalyticsCookies();
    }
  }

  preferences.forEach(button => {
    button.hidden = !measurementId;
    button.addEventListener('click', () => {
      if (!banner || !measurementId) return;
      banner.hidden = false;
      banner.querySelector('[data-consent]')?.focus();
    });
  });
  document.querySelectorAll('[data-consent]').forEach(button => button.addEventListener('click', () => chooseConsent(button.dataset.consent)));
  if (measurementId && consent === 'granted') initializeAnalytics();
  else if (measurementId && consent !== 'denied' && banner) banner.hidden = false;
  updatePrivacyText();

  document.addEventListener('click', event => {
    const link = event.target.closest?.('[data-order-link]');
    if (link) track('order_start', { source: link.dataset.source || 'navigation' });
  });
  document.querySelectorAll('.faq details').forEach((item, index) => item.addEventListener('toggle', () => {
    if (item.open) track('faq_open', { question_id: 'faq_' + (index + 1) });
  }));
})();

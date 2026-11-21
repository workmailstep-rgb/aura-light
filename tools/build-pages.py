"""Generate AURA's static order, confirmation, privacy and error pages."""
from pathlib import Path
from html import escape
import importlib.util
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
ORIGIN = 'https://aura-light-studio.littledawn8.chatgpt.site'
spec = importlib.util.spec_from_file_location('aura_lamps', ROOT / 'make-lamps.py')
lamps = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lamps)


def head(title, description, path, noindex=False, order=False):
    return f'''<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f5f3eb">
  <title>{escape(title)}</title>
  <meta name="description" content="{escape(description, quote=True)}">
  {('<meta name="robots" content="noindex,follow">' if noindex else '<meta name="robots" content="index,follow">')}
  <link rel="canonical" href="{ORIGIN}{path}">
  <meta property="og:title" content="{escape(title, quote=True)}">
  <meta property="og:description" content="{escape(description, quote=True)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:site_name" content="AURA">
  <meta property="og:url" content="{ORIGIN}{path}">
  <meta property="og:image" content="{ORIGIN}/assets/social-preview.png">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="AURA: белый и серый светильники в мягком пастельном свете. Ваш цвет. Ваш уют.">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{escape(title, quote=True)}">
  <meta name="twitter:description" content="{escape(description, quote=True)}">
  <meta name="twitter:image" content="{ORIGIN}/assets/social-preview.png">
  <meta name="twitter:image:alt" content="Белая и серая AURA с пастельным освещением">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <link rel="preload" as="font" href="/assets/manrope-regular.ttf" type="font/ttf" crossorigin>
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/pages.css">
  <script src="/site-config.js" defer></script>
  <script src="/site.js" defer></script>
  {('<script src="/order.js" defer></script>' if order else '')}
</head>'''


HEADER = '''<a class="skip-link" href="#main">К содержимому</a>
<header class="site-header secondary-header">
  <a class="wordmark" href="/" aria-label="AURA — на главную"><img class="brand-lockup" src="/assets/aura-logo.svg" width="272" height="96" alt="AURA"></a>
  <nav class="secondary-nav" aria-label="Основная навигация"><a href="/#about">О светильнике</a><a href="/#moods">Попробовать свет</a><a href="/#faq">Вопросы</a></nav>
  <a class="button button-primary button-small" href="/order/" data-order-link data-source="page_header">Оставить заявку <span aria-hidden="true">↗</span></a>
</header>'''

CONSENT = '''<section class="consent-banner" id="analytics-consent" aria-label="Настройки аналитики" hidden>
  <p>Разрешите аналитику? Она поможет понять, как пользуются сайтом. Форма заявки в аналитику не передаётся. <a href="/privacy/#analytics">Подробнее</a></p>
  <div class="consent-actions"><button type="button" class="button button-outline" data-consent="denied">Без аналитики</button><button type="button" class="button button-primary" data-consent="granted">Разрешить</button></div>
</section>'''


def footer():
    return '''<footer class="site-footer">
  <div class="footer-top"><a class="wordmark" href="/" aria-label="AURA — на главную"><img class="brand-lockup" src="/assets/aura-logo.svg" width="272" height="96" alt="AURA"></a><span>Меньше суеты.<br>Больше уюта.</span><a class="back-to-top" href="#main">К началу <span aria-hidden="true">↑</span></a></div>
  <nav class="footer-links" aria-label="Ссылки в подвале"><a href="/#about">О светильнике</a><a href="/#moods">Цвет и яркость</a><a href="/order/" data-order-link data-source="footer">Оставить заявку</a><a href="/#faq">Частые вопросы</a><a href="/privacy/">Конфиденциальность</a><button type="button" data-cookie-settings hidden>Настройки аналитики</button></nav>
  <div class="footer-bottom"><span>© AURA STUDIO, 2026</span><span>ПОРТФОЛИО-КОНЦЕПТ. ВЫМЫШЛЕННЫЙ ПРОДУКТ.</span></div>
</footer>'''


def breadcrumbs(label):
    return f'<nav class="breadcrumbs" aria-label="Хлебные крошки"><a href="/">Главная</a><span aria-hidden="true">/</span><span aria-current="page">{label}</span></nav>'


def selection():
    return '''<dl class="selection-list"><div><dt>Корпус</dt><dd data-selection-finish>Белый</dd></div><div><dt>Освещение</dt><dd data-selection-light>Персиковый</dd></div><div><dt>Яркость</dt><dd data-selection-brightness>65%</dd></div></dl>'''


def write(relative, title, description, path, content, noindex=False, order=False):
    destination = DIST / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    html = head(title, description, path, noindex, order) + '\n<body>\n' + HEADER + '\n' + content + '\n' + footer() + '\n' + CONSENT + '\n</body>\n</html>\n'
    destination.write_text('\n'.join(line.rstrip() for line in html.splitlines()) + '\n')


order_art = lamps.inline_svg('order', '')
order = f'''<main class="page-shell" id="main">
  {breadcrumbs('Демо-заказ')}
  <div class="page-heading"><span class="eyebrow">LET’S MAKE IT YOURS</span><h1>Ваша AURA.<br><em>Один шаг до уюта.</em></h1><p>Вы выбрали свет. Осталось познакомиться — попробуйте, как могла бы выглядеть заявка на вашу AURA.</p></div>
  <div class="order-grid">
    <aside class="order-preview" aria-label="Ваш вариант светильника"><div class="order-art"><div class="order-disc" aria-hidden="true"></div>{order_art}</div><div class="order-preview-copy"><p>ВАША AURA 01</p>{selection()}<a href="/#moods">Изменить цвет и яркость <span aria-hidden="true">↗</span></a></div></aside>
    <section class="order-form-card" aria-labelledby="form-title">
      <span class="demo-badge">ДЕМО ДЛЯ ПОРТФОЛИО</span><h2 id="form-title">Давайте познакомимся</h2>
      <p class="form-intro">Используйте тестовые имя и Telegram. Эта заявка показывает шаги заказа: данные остаются на странице и никому не отправляются.</p>
      <button type="button" class="form-demo-action" id="fill-demo">Заполнить пример</button>
      <form id="order-form" action="/order/" method="post" autocomplete="off">
        <div class="form-field"><label for="order-name">Как к вам обращаться</label><input id="order-name" name="name" type="text" required minlength="2" maxlength="60" placeholder="Например, Гость" autocomplete="off"></div>
        <div class="form-field"><label for="order-telegram">Ваш Telegram</label><input id="order-telegram" name="telegram" type="text" required maxlength="33" pattern="@[A-Za-z0-9_]{{5,32}}" placeholder="@aura_guest" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="telegram-help"><small id="telegram-help">Тестовый username: @, латинские буквы, цифры и _. Реальные контакты не нужны.</small></div>
        <div class="form-field"><label for="order-message">Пожелания <span>необязательно</span></label><textarea id="order-message" name="message" maxlength="500" rows="3" placeholder="Для какой комнаты выбираете свет?"></textarea></div>
        <label class="consent-check"><input type="checkbox" id="order-consent" name="consent" required><span>Я понимаю, что это демонстрация, и ознакомлен с <a href="/privacy/">политикой конфиденциальности</a>.</span></label>
        <button class="button button-primary order-submit" id="submit-order" type="submit" disabled>Отправить демо-заявку <span aria-hidden="true">↗</span></button>
        <p class="form-note">Без оплаты и реального заказа. Для демонстрации используются только тестовые данные.</p>
        <p class="order-status" id="order-status" role="status" aria-live="polite" tabindex="-1"></p>
      </form>
      <p class="response-note"><strong>Ответим в течение нескольких часов</strong>Так выглядел бы ответ команды AURA Studio в реальном заказе. В демоверсии сообщения в Telegram не отправляются.</p>
      <noscript><p class="secondary-noscript">Чтобы пройти демо-заказ, включите JavaScript. Данные формы без него не отправляются.</p></noscript>
    </section>
  </div>
  <section class="order-steps" aria-labelledby="steps-title"><h2 id="steps-title">Что будет <em>дальше</em></h2><div class="order-step-grid"><article><h3>Ваш свет — с вами</h3><p>Сохраним выбранные корпус, оттенок и яркость в подтверждении демо.</p></article><article><h3>Личное общение</h3><p>В реальном заказе ответим в Telegram в течение нескольких часов.</p></article><article><h3>Всё по договорённости</h3><p>Обсудим детали до покупки. Сейчас вы знакомитесь с портфолио-концептом.</p></article></div></section>
</main>'''
write('order/index.html', 'Демо-заказ AURA — выберите свой свет и оставьте заявку', 'Попробуйте демо-заказ AURA: сохраните выбранный светильник и пройдите форму с тестовым Telegram. Без оплаты и отправки личных данных.', '/order/', order, order=True)

thanks = f'''<main class="page-shell" id="main">
  {breadcrumbs('Следующий шаг')}
  <div class="result-layout"><div class="result-copy"><span class="eyebrow">A LITTLE LIGHT. A GOOD BEGINNING.</span><h1 id="thanks-title">Ваш следующий шаг<br><em>к уюту.</em></h1>
    <section id="demo-confirmation" hidden aria-labelledby="thanks-title"><span class="demo-badge">ДЕМО-ЗАЯВКА ЗАВЕРШЕНА</span><p>Вы прошли сценарий заказа AURA. Ваш вариант — ниже. Сообщения в Telegram не отправлялись; имя и контакт не сохранялись.</p><div class="receipt-summary"><p>ВАШ ВЫБОР</p>{selection()}</div><p><strong>Ответим в течение нескольких часов</strong> — так выглядело бы продолжение настоящего заказа. Это портфолио-демонстрация.</p><div class="page-actions"><a class="button button-primary" href="/">Вернуться к AURA <span aria-hidden="true">↗</span></a><a class="button button-outline" href="/#moods">Попробовать другой свет</a></div></section>
    <section id="no-order-yet" aria-labelledby="thanks-title"><p>Сначала выберите свет и пройдите демо-заказ. После него здесь появится подтверждение с вашим вариантом AURA.</p><div class="page-actions"><a class="button button-primary" href="/order/" data-order-link data-source="thanks_empty">Попробовать демо-заказ</a><a class="button button-outline" href="/">На главную</a></div></section>
  </div><div class="result-art" aria-hidden="true"><span>thank you.</span><img src="/assets/lamp-white.svg" alt="" width="680" height="740"></div></div>
</main>'''
write('thanks/index.html', 'Спасибо за демо-заявку — AURA', 'Подтверждение демонстрационной заявки AURA и выбранного варианта светильника. Вернитесь к цветам, яркости и спокойному свету.', '/thanks/', thanks, noindex=True, order=True)

privacy = f'''<main class="page-shell" id="main">
  {breadcrumbs('Конфиденциальность')}
  <div class="page-heading"><span class="eyebrow">A LITTLE CLARITY</span><h1>Ваши данные.<br><em>Всё прозрачно.</em></h1><p>Политика конфиденциальности портфолио-проекта AURA. Здесь объясняем, что происходит с формой, настройками и аналитикой.</p><p class="policy-date">Обновлено 17 ноября 2026 года</p></div>
  <div class="policy-layout"><nav class="policy-nav" aria-label="Разделы политики"><a href="#project">О проекте</a><a href="#form">Демо-заявка</a><a href="#storage">Хранилище браузера</a><a href="#analytics">Аналитика</a><a href="#hosting">Хостинг и ссылки</a><a href="#contact">Связь с автором</a></nav>
  <article class="policy-copy">
    <section id="project"><h2>1. AURA — портфолио-концепт</h2><p>AURA и AURA Studio — название вымышленного продукта и бренда в дизайн-проекте. Сайт демонстрирует интерфейс светильника и сценарий заказа. Продажа, оплата, доставка и реальный приём заявок здесь не осуществляются.</p></section>
    <section id="form"><h2>2. Что происходит с демо-заявкой</h2><p>В форме есть имя, Telegram и пожелания. Используйте только вымышленные тестовые данные — можно нажать «Заполнить пример».</p><p>Содержимое этих полей обрабатывается в памяти открытой страницы, не отправляется в Telegram или на сервер, не записывается в localStorage, sessionStorage, адрес страницы и события аналитики. После успешного шага форма очищается. Подтверждение содержит только выбранные корпус, цвет и яркость, без имени и контакта.</p></section>
    <section id="storage"><h2>3. Что сохраняется в браузере</h2><ul><li><strong>Вариант светильника:</strong> корпус, оттенок, яркость и сценарий в localStorage. Они позволяют вернуться к своему свету. Кнопка «Сбросить» в конфигураторе возвращает начальные настройки.</li><li><strong>Настройка движения:</strong> включение и отключение анимации в localStorage.</li><li><strong>Демо-подтверждение:</strong> вариант светильника и время шага в sessionStorage текущей вкладки. Подтверждение действует 30 минут; по истечении удаляется при следующем открытии страницы благодарности. sessionStorage очищается при завершении сеанса вкладки.</li><li><strong>Выбор аналитики:</strong> если счётчик подключён, согласие или отказ сохраняются в localStorage. Изменить выбор можно внизу сайта.</li></ul><p>Эти записи можно удалить в настройках браузера для этого сайта. Контактные данные в них не содержатся.</p></section>
    <section id="analytics"><h2>4. Google Analytics 4</h2><p data-analytics-state>В этой демоверсии Google Analytics 4 не активирован: идентификатор счётчика не задан, код Google не загружается.</p><p>Подготовлен сценарий добровольного подключения: при наличии настоящего счётчика появятся равно доступные кнопки разрешения и отказа. До согласия код Google не загружается. После согласия могут учитываться просмотры страниц, переходы к заявке, открытие FAQ, скачивание карточки и завершение демо-заказа.</p><p>Имя, Telegram и пожелания в события не включаются. Из адреса страницы для событий исключаются параметры и фрагмент. Рекламные сигналы и персонализация отключены. При подключении счётчика Google может обрабатывать сетевые и технические данные, включая IP-адрес при запросе. Подробнее: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">политика Google</a>.</p><p>Отказ отключает последующие события сайта и удаляет доступные сайту cookie этого счётчика. Выбор не влияет на работу демо-заказа.</p></section>
    <section id="hosting"><h2>5. Хостинг и внешние ссылки</h2><p>Сайт размещён на внешнем хостинге. При открытии страницы хостинг получает технические данные HTTP-запроса, необходимые для предоставления сайта. AURA не устанавливает для таких данных собственных сроков хранения и не управляет инфраструктурными журналами платформы.</p><p>Шрифты, иллюстрации и фотография загружаются с домена сайта. Внешние ссылки на философские тексты, GitHub и Google открывают сервисы с их собственными условиями.</p></section>
    <section id="contact"><h2>6. Связь с автором</h2><p>Публичные исходники и профиль владельца проекта доступны в <a href="https://github.com/workmailstep-rgb/aura-light" target="_blank" rel="noopener noreferrer">репозитории AURA на GitHub</a>. Демо-форма не является каналом связи с автором.</p><p>Для вопросов о данных платформы используйте каналы, указанные в <a href="https://openai.com/policies/privacy-policy/" target="_blank" rel="noopener noreferrer">политике конфиденциальности хостинг-платформы</a>. Перед запуском реальных заявок сведения о получателе данных, целях и сроках обработки должны соответствовать реальному сервису.</p></section>
  </article></div>
</main>'''
write('privacy/index.html', 'Политика конфиденциальности AURA — форма, настройки и аналитика', 'Как портфолио-проект AURA обрабатывает демо-форму, сохраняет настройки света и управляет согласием на Google Analytics 4.', '/privacy/', privacy)

not_found = f'''<main class="page-shell" id="main">
  {breadcrumbs('Страница не найдена')}
  <div class="result-layout"><section class="result-copy" aria-labelledby="not-found-title"><span class="eyebrow">404 / A LITTLE LOST</span><h1 id="not-found-title">Кажется, здесь<br><em>погас свет.</em></h1><p>Эта страница не нашлась. Вернёмся туда, где можно выбрать свой цвет, добавить яркости и почувствовать уют.</p><div class="page-actions"><a class="button button-primary" href="/">На главную <span aria-hidden="true">↗</span></a><a class="button button-outline" href="/#moods">Попробовать свет</a></div><p>Или загляните в <a href="/#faq" class="text-link">частые вопросы</a>.</p></section><div class="result-art" aria-hidden="true"><span>404</span><img src="/assets/lamp-gray.svg" alt="" width="680" height="740"></div></div>
</main>'''
write('404.html', 'Страница не найдена — AURA', 'Страница AURA не найдена. Вернитесь на главную, выберите пастельный свет или откройте ответы на частые вопросы.', '/404.html', not_found, noindex=True)

(DIST / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {ORIGIN}/sitemap.xml\n')
(DIST / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>{ORIGIN}{path}</loc><lastmod>2026-11-17</lastmod></url>\n' for path in ('/', '/order/', '/privacy/')) + '</urlset>\n')
print('Generated order, thanks, privacy, custom 404, robots.txt and sitemap.xml.')

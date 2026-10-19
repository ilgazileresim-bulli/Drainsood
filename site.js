'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const DOWNLOAD_LINKS = { windows: 'indir/Drainsood%20Setup.exe', android: 'indir/DrainsoodPhone-1.0.3.apk' };
  const releases = { windows: { name: 'Drainsood Setup.exe', hash: '' }, android: { name: 'DrainsoodPhone-1.0.3.apk', hash: '' } };
  const descriptions = { chat: 'Bu, Drainsood sohbet arayüzünün örnek görünümüdür.', call: 'Sesli ve görüntülü görüşme ekranını keşfet.', screen: 'Windows ekran paylaşımı görünümünü keşfet.' };
  let toastTimer;
  function notify(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 4200);
  }
  function selectGuide(platform) {
    if (!Object.hasOwn(DOWNLOAD_LINKS, platform)) return;
    $$('[data-guide]').forEach(button => {
      const active = button.dataset.guide === platform;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
    });
  }
  function selectPreview(mode) {
    if (!Object.hasOwn(descriptions, mode)) return;
    $$('[data-preview]').forEach(button => {
      const active = button.dataset.preview === mode;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
    });
    $('#preview-caption').textContent = descriptions[mode];
  }
  $$('[data-preview]').forEach(button => button.addEventListener('click', () => selectPreview(button.dataset.preview)));
  $$('[data-guide]').forEach(button => button.addEventListener('click', () => selectGuide(button.dataset.guide)));
  $$('[role="tablist"]').forEach(list => list.addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const current = tabs.indexOf(document.activeElement);
    if (current === -1) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].click();
    tabs[next].focus();
  }));
  const menu = $('.nav-menu');
  function closeMenu() {
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Menüyü aç');
    $('#navigation').classList.remove('open');
  }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    $('#navigation').classList.toggle('open', open);
  });
  $$('#navigation a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  document.addEventListener('click', event => { if (!event.target.closest('.nav-shell')) closeMenu(); });
  window.matchMedia('(max-width: 680px)').addEventListener('change', closeMenu);
  $$('[data-download]').forEach(link => {
    link.href = DOWNLOAD_LINKS[link.dataset.download];
    link.addEventListener('click', () => {
      selectGuide(link.dataset.download);
      notify(`${link.dataset.download === 'android' ? 'Android APK' : 'Windows kurulumu'} indirmesi tarayıcına iletildi. Kurulum rehberi aşağıda.`);
    });
  });
  $$('[data-open-faq]').forEach(link => link.addEventListener('click', () => {
    const target = document.getElementById(link.dataset.openFaq);
    if (target instanceof HTMLDetailsElement) target.open = true;
  }));
  function openLinkedAnswer() {
    const target = document.getElementById(location.hash.slice(1));
    if (target instanceof HTMLDetailsElement) target.open = true;
  }
  window.addEventListener('hashchange', openLinkedAnswer);
  openLinkedAnswer();
  const dialog = $('#checksum-dialog');
  let checksumTrigger;
  $$('[data-checksum]').forEach(button => button.addEventListener('click', () => {
    const release = releases[button.dataset.checksum];
    if (!release.hash) return;
    checksumTrigger = button;
    $('#checksum-file').textContent = release.name;
    $('#hash-value').textContent = release.hash;
    dialog.showModal();
  }));
  $('#close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => checksumTrigger?.focus());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  $('#copy-hash').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('#hash-value').textContent);
      $('#copy-hash').textContent = 'Özet kopyalandı ✓';
      setTimeout(() => { $('#copy-hash').innerHTML = '<svg><use href="#copy"/></svg> Özeti kopyala'; }, 2000);
    } catch {
      const range = document.createRange();
      range.selectNodeContents($('#hash-value'));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      $('#checksum-description').textContent = 'Özet seçildi. Kopyalamak için Ctrl+C veya uzun dokun kullan.';
    }
  });
  // Download destinations stay in the checked-in relative paths. Remote feed
  // text is rendered as text and cannot inject markup or alternate URLs.
  const releaseReady = fetch('releases.json', { cache: 'no-store' }).then(response => {
    if (!response.ok) throw new Error('Release feed unavailable');
    return response.json();
  }).then(feed => {
    if (feed.app !== 'Drainsood' || feed.schema !== 1) return;
    for (const platform of Object.keys(DOWNLOAD_LINKS)) {
      const item = feed.platforms?.[platform];
      if (!item || !/^[a-f0-9]{64}$/.test(item.sha256)) continue;
      releases[platform].hash = item.sha256;
      $$(`[data-checksum="${platform}"]`).forEach(button => { button.hidden = false; });
      if (/^\d+\.\d+\.\d+$/.test(item.version)) $$(`[data-version="${platform}"]`).forEach(element => { element.textContent = item.version; });
      if (Number.isSafeInteger(item.size) && item.size > 0) $$(`[data-size="${platform}"]`).forEach(element => { element.textContent = `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(item.size / 1048576)} MB`; });
    }
  }).catch(() => {});
  const serviceReady = fetch('service.json', { cache: 'no-store' }).then(response => {
    if (!response.ok) throw new Error('Service directory unavailable');
    return response.json();
  }).then(service => {
    if (service.app !== 'Drainsood' || service.schema !== 1 || typeof service.server !== 'string' || !service.server) return;
    const url = new URL(service.server);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return;
    $('#service-status').textContent = 'Arkadaşlarınla buluşmak için uygulamada aynı ortak sunucuyu seç. Kurulum ve bağlantı adımları rehberde.';
  }).catch(() => {});
  if ('IntersectionObserver' in window) {
    const links = $$('#navigation a');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link => link.classList.toggle('is-current', link.hash === `#${entry.target.id}`));
    }), { rootMargin: '-15% 0px -45% 0px' });
    links.forEach(link => { const section = document.getElementById(link.hash.slice(1)); if (section) observer.observe(section); });
  }
  if (/Android/i.test(navigator.userAgent)) {
    selectGuide('android');
    $$('.hero-buttons [data-download]').forEach(link => {
      link.classList.toggle('button-lilac', link.dataset.download === 'android');
      link.classList.toggle('button-glass', link.dataset.download !== 'android');
    });
  }
  window.DrainsoodSite = { selectPreview, selectGuide, releases, downloadLinks: DOWNLOAD_LINKS, ready: Promise.all([releaseReady, serviceReady]) };
})();

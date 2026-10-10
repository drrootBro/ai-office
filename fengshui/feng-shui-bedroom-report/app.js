// UI wiring: form <-> URL query <-> Engine/Render. Paid unlock via the checkout's return link (?paid=1).
(function () {
  'use strict';
  var cfg = window.APP_CONFIG || {};
  var form = document.getElementById('form');
  var out = document.getElementById('report');
  var errEl = document.getElementById('error');
  var modal = document.getElementById('checkout');
  var KEY_INPUT = 'ass_v0_input', KEY_PAID = 'ass_v0_paid';
  var current = null;

  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  // ---- form setup
  var now = new Date().getFullYear();
  var ySel = form.year, mSel = form.month, dSel = form.day;
  ySel.innerHTML = '<option value="">Select year</option>';
  for (var y = now; y >= 1900; y--) ySel.insertAdjacentHTML('beforeend', '<option>' + y + '</option>');
  ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    .forEach(function (m, i) { mSel.insertAdjacentHTML('beforeend', '<option value="' + (i + 1) + '">' + m + '</option>'); });

  function daysIn(y, m) { return new Date(y || 2000, m, 0).getDate(); }
  function fillDays() {
    var keep = dSel.value, n = mSel.value ? daysIn(Number(ySel.value), Number(mSel.value)) : 31;
    dSel.innerHTML = '<option value="">—</option>';
    for (var d = 1; d <= n; d++) dSel.insertAdjacentHTML('beforeend', '<option>' + d + '</option>');
    if (keep && Number(keep) <= n) dSel.value = keep;
  }
  fillDays();
  mSel.addEventListener('change', fillDays);
  ySel.addEventListener('change', fillDays);

  function readForm() {
    var sex = (form.querySelector('input[name=sex]:checked') || {}).value || 'skip';
    return {
      nickname: form.nickname.value.trim(),
      year: ySel.value, month: mSel.value, day: dSel.value, sex: sex
    };
  }
  function writeForm(i) {
    form.nickname.value = i.nickname || '';
    ySel.value = i.year || ''; mSel.value = i.month || ''; fillDays(); dSel.value = i.day || '';
    var r = form.querySelector('input[name=sex][value="' + (i.sex || 'skip') + '"]'); if (r) r.checked = true;
  }
  function validate(i) {
    var y = Number(i.year);
    if (!y || y < 1900 || y > now) return 'Please choose your birth year.';
    if ((i.month && !i.day) || (!i.month && i.day)) return 'Please choose both month and day, or leave both empty.';
    if (['male', 'female', 'skip'].indexOf(i.sex) < 0) return 'Please choose Male, Female or Skip.';
    return '';
  }

  // ---- URL <-> input (report links are shareable/reproducible; nothing is sent to a server)
  function toQuery(i) {
    var p = new URLSearchParams();
    p.set('y', i.year); if (i.month && i.day) { p.set('m', i.month); p.set('d', i.day); }
    p.set('s', i.sex[0]); if (i.nickname) p.set('n', i.nickname);
    return p.toString();
  }
  function fromQuery(qs) {
    var p = new URLSearchParams(qs);
    if (!p.get('y')) return null;
    return { year: p.get('y'), month: p.get('m') || '', day: p.get('d') || '', sex: { m: 'male', f: 'female', s: 'skip' }[p.get('s')] || 'skip', nickname: p.get('n') || '' };
  }

  function isPaid() { return load(KEY_PAID) === '1'; }
  // Details saved from an earlier visit on this device (returning visitors never retype them).
  function savedInput() {
    try { var i = JSON.parse(load(KEY_INPUT) || 'null'); return i && !validate(i) ? i : null; } catch (e) { return null; }
  }

  function show(input, scroll) {
    var msg = validate(input);
    errEl.hidden = !msg; errEl.textContent = msg;
    if (msg) return;
    current = window.Engine.buildReport(input);
    out.innerHTML = window.Render.report(current, { paid: isPaid() });
    store(KEY_INPUT, JSON.stringify(input));
    history.replaceState(null, '', location.pathname + '?' + toQuery(input));
    if (scroll) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ?buy=1 (from the landing page's $9 card): enter birth details once, go straight to checkout,
  // and come back (?paid=1) to the full report built from the saved input.
  var buyMode = new URLSearchParams(location.search).get('buy') === '1' && !isPaid();
  if (buyMode) {
    form.querySelector('button[type=submit]').textContent = 'Continue to payment — $9';
    var note = form.querySelector('.fine'); if (note) note.textContent = 'Enter your details first. After paying you come straight back to your full report.';
    var prev = savedInput();
    if (prev) {
      writeForm(prev);
      if (note) note.textContent = 'We kept your details from your last visit. Check them and continue. After paying you come straight back to your full report.';
    }
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = readForm();
    if (!buyMode) return show(input, true);
    var msg = validate(input);
    errEl.hidden = !msg; errEl.textContent = msg;
    if (msg) return;
    store(KEY_INPUT, JSON.stringify(input));
    var link = cfg.PAYMENT_LINK || cfg.STRIPE_PAYMENT_LINK;
    if (link) { location.href = link; return; }
    if (cfg.DEMO_UNLOCK_WHEN_NO_LINK) { store(KEY_PAID, '1'); buyMode = false; show(input, true); }
  });

  // ---- checkout
  var pay = document.getElementById('pay');
  var payLink = cfg.PAYMENT_LINK || cfg.STRIPE_PAYMENT_LINK;
  if (payLink) {
    pay.href = payLink;
  } else {
    pay.hidden = true;
    document.getElementById('pay-missing').hidden = false;
    document.getElementById('demo-unlock').hidden = !cfg.DEMO_UNLOCK_WHEN_NO_LINK;
  }
  pay.addEventListener('click', function () { if (current) store(KEY_INPUT, JSON.stringify(readForm())); });

  function unlock() {
    store(KEY_PAID, '1');
    modal.hidden = true;
    if (current) show(JSON.parse(load(KEY_INPUT)), false);
    var a = document.getElementById('directions'); if (a) a.scrollIntoView({ behavior: 'smooth' });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-action]'); if (!b) return;
    var act = b.getAttribute('data-action');
    if (act === 'checkout') modal.hidden = false;
    else if (act === 'close') modal.hidden = true;
    else if (act === 'demo-unlock') unlock();
    else if (act === 'pdf') downloadPdf(b, false);
    else if (act === 'pdfcard') downloadPdf(b, true);
    else if (act === 'sharecard') shareCard();
    else if (act === 'copylink') {
      var url = location.href;
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
        function () { b.textContent = 'Link copied'; }, function () { prompt('Copy this link:', url); });
    }
  });

  // ---- PDF download (drawn in the browser; the library loads only when someone asks for a PDF).
  // Anyone who wants paper prints the PDF.
  var pdfLib = null;
  function loadPdfLib() {
    if (window.html2pdf) return Promise.resolve();
    if (!pdfLib) pdfLib = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'vendor/html2pdf.bundle.min.js';
      s.onload = res; s.onerror = function () { pdfLib = null; rej(new Error('pdf library')); };
      document.head.appendChild(s);
    });
    return pdfLib;
  }
  function downloadPdf(btn, cardOnly) {
    if (!current || btn.disabled) return;
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Preparing PDF…';
    var gua = current.results.map(function (r) { return r.gua.gua.toLowerCase(); }).join('-');
    var el = cardOnly ? document.querySelector('#card .checkcard') : out;
    document.body.classList.add('pdf-mode');
    // html2canvas sizes an inline SVG from its width/height attributes, so pin each one to its laid-out size.
    var pinned = [].slice.call(el.querySelectorAll('svg')).map(function (svg) {
      var r = svg.getBoundingClientRect(), w = svg.getAttribute('width'), h = svg.getAttribute('height');
      svg.setAttribute('width', Math.round(r.width)); svg.setAttribute('height', Math.round(r.height));
      return function () { w === null ? svg.removeAttribute('width') : svg.setAttribute('width', w); h === null ? svg.removeAttribute('height') : svg.setAttribute('height', h); };
    });
    function done() { pinned.forEach(function (f) { f(); }); document.body.classList.remove('pdf-mode'); btn.disabled = false; btn.textContent = label; }
    loadPdfLib().then(function () {
      return window.html2pdf().set({
        margin: [10, 10, 12, 10],
        filename: (cardOnly ? 'check-off-card-' : 'bedroom-report-') + gua + '.pdf',
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['h2', '.item', 'tr', 'svg', '.scale', '.callout', '.checkcard', '.report-hero', 'li'] }
      }).from(el).save();
    }).then(done, function () { done(); alert('Sorry, the PDF could not be made on this device. Please try again, or use your browser\'s Share or Print menu.'); });
  }
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.hidden = true; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') modal.hidden = true; });

  // ---- share card (1200x630 PNG, drawn locally): Gua badge, group, four favorable directions, reference line
  var TRIGRAM = { Kan: '☵', Gen: '☶', Zhen: '☳', Xun: '☴', Li: '☲', Kun: '☷', Dui: '☱', Qian: '☰' };
  function shareCard() {
    if (!current) return;
    var c = document.createElement('canvas'); c.width = 1200; c.height = 630;
    var x = c.getContext('2d');
    x.fillStyle = '#fbf7ef'; x.fillRect(0, 0, 1200, 630);
    x.fillStyle = '#8a6d3b'; x.fillRect(0, 0, 1200, 10);
    x.fillStyle = '#3b2f1e'; x.font = '600 30px Georgia, serif'; x.fillText('Ancient Spatial Science', 70, 90);
    var rs = current.results, colW = rs.length > 1 ? 540 : 1060;
    rs.forEach(function (r, i) {
      var left = 70 + i * colW, top = 170;
      x.fillStyle = '#efe6d6'; x.beginPath(); x.arc(left + 44, top + 20, 44, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#8a6d3b'; x.font = '48px serif'; x.textAlign = 'center'; x.fillText(TRIGRAM[r.gua.gua], left + 44, top + 37); x.textAlign = 'left';
      x.fillStyle = '#3b2f1e'; x.font = '700 64px Georgia, serif';
      x.fillText(r.gua.gua + ' Gua', left + 108, top + 40);
      x.font = '28px Georgia, serif'; x.fillStyle = '#6b5a40';
      x.fillText((rs.length > 1 ? (r.sex === 'male' ? 'Male formula · ' : 'Female formula · ') : '') + r.gua.group + ' group', left + 108, top + 90);
      x.font = '600 26px system-ui, sans-serif';
      var SCALE = ['#F7CF4A', '#F2A93B', '#EA8130', '#DC5A24']; // same warm steps as the report's color key
      r.directions.filter(function (d) { return d.kind === 'favorable'; }).forEach(function (d, j) {
        x.fillStyle = SCALE[j]; x.fillRect(left, top + 138 + j * 46, 28, 28);
        x.fillStyle = '#3b2f1e'; x.fillText(d.label + ': ' + d.dirName, left + 42, top + 160 + j * 46);
      });
    });
    x.fillStyle = '#6b5a40'; x.font = '22px system-ui, sans-serif';
    x.fillText('My four best directions · Eight Mansions (Ba Zhai)', 70, 560);
    x.font = 'italic 22px Georgia, serif';
    x.fillText(window.Render.COPY.reference, 70, 596);
    var a = document.createElement('a');
    a.download = 'my-gua-' + rs.map(function (r) { return r.gua.gua.toLowerCase(); }).join('-') + '.png';
    a.href = c.toDataURL('image/png'); a.click();
  }

  // ---- boot: checkout return link (?paid=1) or shared report link (?y=...)
  var params = new URLSearchParams(location.search);
  if (params.get('paid') === '1') {
    store(KEY_PAID, '1');
    var saved = load(KEY_INPUT);
    if (saved) { var si = JSON.parse(saved); writeForm(si); show(si, false);
      var a = document.getElementById('directions'); if (a) a.scrollIntoView(); }
    else history.replaceState(null, '', location.pathname);
  } else {
    var qi = fromQuery(location.search);
    if (qi) { writeForm(qi); show(qi, false); }
    else if (!buyMode && savedInput()) { var back = savedInput(); writeForm(back); show(back, false); }
  }
})();

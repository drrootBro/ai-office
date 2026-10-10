// Google Analytics 4 for the two fengshui pages only. Runs only on the live site (not localhost/tests).
// Privacy: report URLs carry birth date and nickname in the query string, so every hit reports the
// path only (no query). In GA, "Page changes based on browser history events" must stay off.
(function () {
  'use strict';
  var GA_ID = 'G-H7PN9E7BWD';
  var live = location.hostname === 'rootbro.com' || location.hostname === 'www.rootbro.com';
  window.Track = function () {};
  if (!live) return;
  var cleanUrl = location.origin + location.pathname;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('set', { page_location: cleanUrl, page_referrer: document.referrer.split('?')[0] });
  gtag('config', GA_ID, { page_location: cleanUrl, send_page_view: true });
  var s = document.createElement('script');
  s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  window.Track = function (name, params) { try { gtag('event', name, params || {}); } catch (e) {} };
  // Landing / report buttons marked data-track="name:label"
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-track]'); if (!a) return;
    var t = a.getAttribute('data-track').split(':');
    window.Track(t[0], { label: t[1] || '' });
  });
})();

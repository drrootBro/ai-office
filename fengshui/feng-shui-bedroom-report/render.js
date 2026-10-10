// Template NLG: deterministic templates + lookup fill-ins. No runtime LLM.
// FROZEN INTERFACE: Render.report(model, {paid}) -> HTML string; Render.COPY (verbatim spec copy).
//
// Tiers (round 2, 2026-10-09):
//   Free  = text hero (bed line + four best directions, no diagram), Gua + calculation, method, generic checklist,
//           shared education diagrams, glossary, disclosure.
//   Paid  = hero (bed line + personal compass + color key) + full eight-direction table, eight-label legend,
//           bedroom application, check-off card, share card, print.
// Paid content is only ever concatenated when opts.paid is true; it is never rendered-and-hidden.
// Visual principle: draw what helps people judge for themselves; never draw a decision for them.
(function (root) {
  'use strict';

  // Verbatim copy from spec v2. Do not edit (acceptance §3.9 checks these character for character).
  var COPY = {
    lichun: "We use Lichun (Start of Spring, around February 4) as the year boundary. Traditional schools differ on this point — some use Lunar New Year instead. This is a lineage difference; there is no single 'correct' algorithm.",
    noDate: "You didn't provide your birth month and day, so we calculated by birth year. If you were born before Lichun of that year, your Gua may shift by one year.",
    reference: "For your reference — take what's useful, leave the rest.",
    disclosure: "These rules come from Ba Zhai (Eight Mansions), a traditional Chinese system. They have not been verified by modern science. That a tip is backed by research does not validate its traditional explanation.",
    comfort: "When tradition and comfort disagree — a noisy street, blocked light, an awkward hallway — comfort wins. A bedroom you sleep well in beats a bedroom that scores well.",
    checkout: "One-time $9. No subscription. No hidden charges.",
    topDisclaimer: "Information only — not professional advice.",
    calibrate: "Calibrate your phone compass first, and keep it away from large metal objects.",
    researchCaveat: "That a tip is backed by research does not validate its traditional explanation.",
    // mark, 2026-10-09: paid only, placed right after the direction-finding guide.
    multiBedroom: "More than one bedroom? Check each one's direction with the compass guide above — sleep in the one that matches your best direction."
  };

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MON = MONTHS.map(function (m) { return m.slice(0, 3); });

  // Plain meaning of each of the eight labels (round 2.1: no traditional names for the four less suitable ones).
  var MEANING = {
    best: 'Your strongest direction. Tradition ties it to energy and growth.',
    second: 'Tied to relationships and getting along with people.',
    third: 'Tied to health and rest.',
    fourth: 'Tied to calm and focus.',
    less: 'A slightly weaker match for you. Fine for everyday use.',
    not: 'Not a good match for you in this system.',
    very: 'A poor match for you in this system.',
    least: 'The weakest of your eight directions in this system.'
  };

  var TERMS_BASE = [
    ['Gua', 'Your personal trigram in the Eight Mansions system, worked out from birth year and sex.'],
    ['East / West group', 'Kan, Zhen, Xun and Li are the East group; Qian, Kun, Gen and Dui are the West group. Each group shares the same four good directions.'],
    ['Lichun', 'Start of Spring, around February 4. This system starts the year here.']
  ];
  var LABEL_ORDER = ['best', 'second', 'third', 'fourth', 'less', 'not', 'very', 'least'];
  var LABEL_TEXT = { best: 'Best direction', second: '2nd-best direction', third: '3rd-best direction', fourth: '4th-best direction', less: 'Less suitable', not: 'Not suitable', very: 'Very unsuitable', least: 'Least suitable' };
  var TRAD = { best: 'Sheng Qi 生气', second: 'Yan Nian 延年', third: 'Tian Yi 天医', fourth: 'Fu Wei 伏位' };

  var TRIGRAM = { Kan: '☵', Gen: '☶', Zhen: '☳', Xun: '☴', Li: '☲', Kun: '☷', Dui: '☱', Qian: '☰' };
  var ZH = { Kan: '坎', Kun: '坤', Zhen: '震', Xun: '巽', Qian: '乾', Dui: '兑', Gen: '艮', Li: '离' };
  var GROUPS = { East: ['Kan', 'Zhen', 'Xun', 'Li'], West: ['Qian', 'Kun', 'Gen', 'Dui'] };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function fmtDate(y, m, d) { return MONTHS[m - 1] + ' ' + d + ', ' + y; }
  function fmtMD(md) { var p = md.split('-'); return MONTHS[Number(p[p.length - 2]) - 1] + ' ' + Number(p[p.length - 1]); }
  function favorable(r) { return r.directions.filter(function (d) { return d.kind === 'favorable'; }); }
  function sexLabel(r, model) { return model.results.length > 1 ? '<p class="eyebrow">' + cap(r.sex) + ' formula</p>' : ''; }
  function grid(model, blocks) { return '<div class="grid' + model.results.length + '">' + blocks.join('') + '</div>'; }
  function lc(s) { return String(s).toLowerCase(); }

  // Final review (2026-10-09): one continuous 8-step suitability scale, warm (best) → black-red (least),
  // modelled on FEMA flood-risk maps. Every colored diagram carries this legend next to it.
  var SCALE_SHORT = ['Best', '2nd best', '3rd best', '4th best', 'Less suitable', 'Not suitable', 'Very unsuitable', 'Least suitable'];
  function scaleLegend(n) {
    var items = SCALE_SHORT.slice(0, n).map(function (t, i) {
      return '<li class="r' + (i + 1) + '"><i aria-hidden="true"></i><span><b>' + (i + 1) + '</b> ' + esc(t) + '</span></li>';
    }).join('');
    return '<div class="scale s' + n + '"><p class="scale-cap">' + (n === 8 ? 'Color key: best to least suitable' : 'Color key: your four best, in order') + '</p><ol>' + items + '</ol></div>';
  }
  function bedLine(r) { return 'Headboard: point it <strong>' + esc(lc(favorable(r)[0].dirName)) + '</strong>.'; }

  // ---------- Free: Gua + calculation flow ----------

  function calcFlow(r, year) {
    var g = r.gua;
    var steps = [
      ['Birth year', String(year)],
      ['Formula', g.expr.replace(/ = .*/, '')],
      ['÷ 9', g.raw + ' → remainder ' + g.remainder],
      ['Gua', g.gua + ' ' + g.zh],
      ['Group', g.group]
    ];
    return '<ol class="flow" aria-label="Calculation in steps">' + steps.map(function (s) {
      return '<li><span class="flow-k">' + esc(s[0]) + '</span><span class="flow-v">' + esc(s[1]) + '</span></li>';
    }).join('') + '</ol>';
  }

  function yearNotes(model) {
    var y = model.yearInfo, i = model.input;
    if (!y.dateProvided) return '<p class="note">' + esc(COPY.noDate) + '</p>';
    if (y.shifted) return '<p class="note">You were born on ' + fmtDate(i.year, i.month, i.day) + ', before Lichun that year (' + fmtMD(y.lichunDate) + '), so your Gua is calculated with ' + y.year + ' as your birth year.</p>';
    if (y.onLichunDay) return '<p class="note">You were born on ' + fmtDate(i.year, i.month, i.day) + ', which is Lichun day itself. We count the whole day as the new year. If you were born in the hours before the exact moment of Lichun, your Gua would follow ' + (y.year - 1) + ' instead.</p>';
    return '<p class="note">You were born on ' + fmtDate(i.year, i.month, i.day) + ', on or after Lichun that year (' + fmtMD(y.lichunDate) + '), so your Gua uses ' + y.year + '.</p>';
  }

  function guaSection(model) {
    var cards = model.results.map(function (r) {
      var g = r.gua;
      return '<div class="card gua">' + sexLabel(r, model) +
        '<h3>' + esc(g.gua) + ' Gua (' + g.group + ' group) <span class="zh">' + esc(g.zh) + '</span></h3>' +
        '<p>Your Gua is <strong>' + esc(g.gua) + '</strong> (' + g.group + ' group). Calculation: ' + esc(g.calc) + '</p>' +
        calcFlow(r, model.yearInfo.year) + '</div>';
    });
    var skip = model.results.length > 1
      ? '<p>You chose not to share your sex. The male and female formulas are different, so here are both versions side by side.</p>' : '';
    return '<section id="gua"><h2>Your Gua</h2>' + skip + grid(model, cards) + yearNotes(model) + '</section>';
  }

  // ---------- Free: four favorable directions ----------

  function favorableSection(model) {
    var blocks = model.results.map(function (r) {
      var f = favorable(r);
      var tiles = f.map(function (d) {
        return '<li class="fav-tile r' + d.rank + '"><span class="fav-dir">' + d.dir + '</span><span class="fav-name"><strong>' + esc(d.label) + '</strong> · ' + esc(d.dirName) + '</span>' +
          '<span class="fav-meta">' + esc(MEANING[d.key]) + '</span></li>';
      }).join('');
      return '<div class="card hero-card">' + sexLabel(r, model) + '<p class="hero-line">' + bedLine(r) + '</p>' +
        '<p class="hero-sub">' + esc(f[0].dirName) + ' is your best direction. Your other three good ones, in order: ' + esc(f[1].dirName) + ', ' + esc(f[2].dirName) + ', ' + esc(f[3].dirName) + '.</p>' +
        '<ol class="fav-list">' + tiles + '</ol>' + scaleLegend(4) + '</div>';
    });
    return '<section id="favorable" class="report-hero"><h2>Your bed first</h2>' + grid(model, blocks) +
      '<p class="fine">Measure directions from the center of your room. The guide further down shows how.</p></section>';
  }

  // ---------- Free (shared): East / West groups ----------

  function groupsSection(model) {
    var mine = {};
    model.results.forEach(function (r) { (mine[r.gua.gua] = mine[r.gua.gua] || []).push(r.sex); });
    var cols = ['East', 'West'].map(function (grp) {
      var items = GROUPS[grp].map(function (g) {
        var hit = mine[g];
        var tag = hit ? '<span class="you">' + (model.results.length > 1 ? 'You (' + hit.map(cap).join(', ') + ')' : 'You') + '</span>' : '';
        return '<li class="' + (hit ? 'me' : '') + '"><span class="tri">' + TRIGRAM[g] + '</span><span>' + g + ' <span class="zh">' + ZH[g] + '</span></span>' + tag + '</li>';
      }).join('');
      var dirs = grp === 'East' ? 'N, S, E, SE' : 'W, SW, NW, NE';
      return '<div class="grp"><h3>' + grp + ' group</h3><ul>' + items + '</ul><p class="fine">Shared favorable directions: ' + dirs + '</p></div>';
    }).join('');
    return '<section id="groups"><h2>East group and West group</h2>' +
      '<p>The eight Gua fall into two groups of four. Everyone in a group shares the same four good directions, in a different order.</p>' +
      '<div class="groups" role="img" aria-label="Feng shui East and West group diagram showing which four Gua belong to each group">' + cols + '</div></section>';
  }

  // ---------- Free (shared): Lichun vs Lunar New Year timeline ----------

  function dayOfYear(y, m, d) { return (Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 864e5; }

  function timelineSection(model) {
    var y = model.input.year;
    var lc = (root.LICHUN || {})[String(y)], ln = (root.LNY || {})[String(y)];
    if (!lc || !ln) return '';
    var W = 640, L = 30, R = 610, end = dayOfYear(y, 3, 1); // Jan 1 → Mar 1
    function x(m, d) { return (L + (R - L) * dayOfYear(y, m, d) / end).toFixed(1); }
    var lcP = lc.split('-').map(Number), lnP = ln.split('-').map(Number);
    var ticks = [[1, 1], [2, 1], [3, 1]].map(function (t) {
      return '<line class="tick" x1="' + x(t[0], t[1]) + '" y1="70" x2="' + x(t[0], t[1]) + '" y2="78"/><text class="tl-s" x="' + x(t[0], t[1]) + '" y="94">' + MON[t[0] - 1] + ' 1</text>';
    }).join('');
    var lnFirst = lnP[0] * 100 + lnP[1] <= lcP[0] * 100 + lcP[1];
    var lines =
      '<line class="ln-line" x1="' + x(lnP[0], lnP[1]) + '" y1="22" x2="' + x(lnP[0], lnP[1]) + '" y2="74"/>' +
      '<text class="tl-lab" x="' + x(lnP[0], lnP[1]) + '" y="' + (lnFirst ? 16 : 16) + '" text-anchor="' + (lnFirst ? 'end' : 'start') + '">Lunar New Year · ' + MON[lnP[0] - 1] + ' ' + lnP[1] + '</text>' +
      '<line class="lc-line" x1="' + x(lcP[0], lcP[1]) + '" y1="22" x2="' + x(lcP[0], lcP[1]) + '" y2="74"/>' +
      '<text class="tl-lab strong" x="' + x(lcP[0], lcP[1]) + '" y="' + 16 + '" text-anchor="' + (lnFirst ? 'start' : 'end') + '">Lichun (we use) · ' + MON[lcP[0] - 1] + ' ' + lcP[1] + '</text>';
    var me = '', note = '';
    var i = model.input;
    if (i.month && i.day && dayOfYear(y, i.month, i.day) < end) {
      me = '<circle class="me-dot" cx="' + x(i.month, i.day) + '" cy="74" r="6"/><text class="tl-s strong" x="' + x(i.month, i.day) + '" y="112">Your birthday</text>';
    }
    if (i.month && i.day) {
      var b = i.month * 100 + i.day, a = lcP[0] * 100 + lcP[1], c = lnP[0] * 100 + lnP[1];
      if ((b < a) !== (b < c)) note = '<p class="note">Your birthday falls between the two lines. Schools that use Lunar New Year would count a different birth year for you, which can change the Gua. This is the lineage difference described above.</p>';
    }
    return '<figure class="timeline"><svg viewBox="0 0 ' + W + ' 120" role="img" aria-label="Feng shui year boundary timeline comparing Lichun and Lunar New Year for ' + y + '">' +
      '<line class="axis" x1="' + L + '" y1="74" x2="' + R + '" y2="74"/>' + ticks + lines + me + '</svg>' +
      '<figcaption>' + y + ': born before the line a school uses, and that school counts you in ' + (y - 1) + '.</figcaption></figure>' + note;
  }

  function howSection(model) {
    var y = model.yearInfo;
    return '<section id="how"><h2>How this was calculated</h2>' +
      '<h3>Year boundary</h3><p>' + esc(COPY.lichun) + '</p>' +
      (y.dateProvided ? '' : '<p>' + esc(COPY.noDate) + '</p>') +
      timelineSection(model) +
      '<h3>Formulas</h3><ul>' +
      '<li>Born before 2000 — Male: (100 − last two digits of year) ÷ 9, take the remainder. Female: (last two digits − 4) ÷ 9, take the remainder (if the last two digits are below 4, add 9 first).</li>' +
      '<li>Born 2000 or later — Male: (99 − last two digits) ÷ 9, take the remainder. Female: (last two digits + 6) ÷ 9, take the remainder.</li>' +
      '<li>Remainder to Gua: 1 Kan, 2 Kun, 3 Zhen, 4 Xun, 6 Qian, 7 Dui, 8 Gen, 0 Li.</li>' +
      '<li>Remainder 5 has no Gua of its own (the "borrowed Gua" rule): men take Kun, women take Gen.</li>' +
      '<li>East group: Kan, Zhen, Xun, Li. West group: Qian, Kun, Gen, Dui.</li></ul>' +
      '<h3>Lineage note</h3><p>Schools differ on details like the year boundary and the remainder-5 rule. This report follows one widely used Ba Zhai lineage and shows every step, so you can check the arithmetic yourself.</p></section>';
  }

  // ---------- Free: generic checklist ----------

  function checklistSection(model) {
    var items = model.checklist.map(function (c, i) {
      return '<li class="item"><h3>' + (i + 1) + '. ' + esc(c.title) + '</h3><dl>' +
        '<dt>Traditional basis</dt><dd>' + esc(c.basis) + '</dd>' +
        '<dt>Evidence status</dt><dd>' + esc(c.evidence) + '</dd>' +
        '<dt>Action</dt><dd>' + esc(c.action) + '</dd></dl></li>';
    });
    return '<section id="checklist"><h2>Bedroom checklist</h2><p>Eight things worth checking in any bedroom, whatever your Gua.</p>' +
      '<ol class="checklist">' + items.join('') + '</ol><p class="callout">' + esc(COPY.comfort) + '</p></section>';
  }

  // ---------- Shared: evidence matrix (three verbatim tiers, no check-mark semantics) ----------

  var TIERS = {
    none: { label: 'Traditional theory', glyph: 'tier-trad' },
    partial: { label: 'Partly consistent with modern research', glyph: 'tier-part' },
    supported: { label: 'Supported by modern research', glyph: 'tier-sup' }
  };
  function glyph(t) { return '<span class="glyph ' + TIERS[t].glyph + '" aria-hidden="true"></span>'; }

  function evidenceSection(model) {
    var rows = model.checklist.map(function (c, i) {
      return '<tr><th scope="row">' + (i + 1) + '. ' + esc(c.title) + '</th>' +
        '<td class="' + (c.trad ? '' : 'muted') + '">' + esc(c.basis) + '</td>' +
        '<td>' + glyph(c.research) + '<span>' + esc(c.evidence) + '</span></td></tr>';
    });
    var legend = ['none', 'partial', 'supported'].map(function (t) {
      return '<li>' + glyph(t) + '<span>' + esc(TIERS[t].label) + '</span></li>';
    }).join('');
    return '<section id="evidence"><h2>What stands behind each item</h2>' +
      '<p>The eight checklist items side by side: the traditional idea behind each one, and how far modern research goes. Use it to decide what is worth your effort.</p>' +
      '<div class="table-scroll"><table class="evidence" aria-label="Feng shui bedroom checklist evidence matrix"><thead><tr><th>Checklist item</th><th>Traditional basis</th><th>Evidence status</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' +
      '<div class="legend-box"><ul class="legend">' + legend + '</ul><p class="fine">' + esc(COPY.researchCaveat) + '</p></div></section>';
  }

  // ---------- Shared: find the eight directions in your room ----------

  var SECTORS = [['N', 337.5, 22.5], ['NE', 22.5, 67.5], ['E', 67.5, 112.5], ['SE', 112.5, 157.5], ['S', 157.5, 202.5], ['SW', 202.5, 247.5], ['W', 247.5, 292.5], ['NW', 292.5, 337.5]];

  function findDirectionsSvg() {
    var cx = 170, cy = 170, lines = [], labels = [];
    for (var k = 0; k < 8; k++) {
      var a = (22.5 + 45 * k - 90) * Math.PI / 180;
      lines.push('<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + 260 * Math.cos(a)).toFixed(1) + '" y2="' + (cy + 260 * Math.sin(a)).toFixed(1) + '"/>');
      var b = (45 * k - 90) * Math.PI / 180;
      labels.push('<text x="' + (cx + 112 * Math.cos(b)).toFixed(1) + '" y="' + (cy + 112 * Math.sin(b) + 6).toFixed(1) + '">' + SECTORS[k][0] + '</text>');
    }
    return '<svg class="finddir" viewBox="0 0 340 340" role="img" aria-label="Feng shui direction finder: a room divided into eight 45-degree slices from its center, with a phone compass pointing north">' +
      '<defs><clipPath id="fd-room"><rect x="20" y="20" width="300" height="300" rx="6"/></clipPath></defs>' +
      '<rect class="room" x="20" y="20" width="300" height="300" rx="6"/>' +
      '<g class="slices" clip-path="url(#fd-room)">' + lines.join('') + '</g>' +
      '<g class="labels">' + labels.join('') + '</g>' +
      '<circle class="stand" cx="170" cy="170" r="34"/>' +
      '<g class="phone"><rect x="157" y="146" width="26" height="46" rx="6"/><path class="needle" d="M170 151 L176 172 L170 167 L164 172 Z"/></g>' +
      '<text class="here" x="170" y="222">You, at the center</text></svg>';
  }

  function multiBedroomSection() {
    return '<section id="multi-bedroom" class="full"><p class="callout">' + esc(COPY.multiBedroom) + '</p></section>';
  }

  function findSection() {
    var rows = SECTORS.map(function (s) { return '<tr><td>' + s[0] + '</td><td>' + s[1] + '° – ' + s[2] + '°</td></tr>'; }).join('');
    return '<section id="find"><h2>Find the eight directions in your room</h2>' +
      '<div class="find-grid"><div>' + findDirectionsSvg() + '</div><div><ol class="steps-plain">' +
      '<li>Stand in the middle of the room.</li>' +
      '<li>Hold your phone flat and open its compass app.</li>' +
      '<li>Turn until it reads 0°. That way is North.</li>' +
      '<li>Each direction is a 45° slice measured from where you stand. Use the table to see which slice a wall, window or door falls in.</li></ol>' +
      '<p class="note">' + esc(COPY.calibrate) + '</p>' +
      '<div class="table-scroll"><table class="deg"><thead><tr><th>Direction</th><th>Compass reading</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="fine">This shows where things are. What, if anything, to change is up to you.</p></div></div></section>';
  }

  // ---------- Paid: personal compass + complete table ----------

  function compassSvg(r, size) {
    var cx = 180, cy = 180, R = 150, rr = 92, out = [];
    var m = {};
    r.directions.forEach(function (d) { m[d.dir] = d; });
    ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].forEach(function (dir, k) {
      var d = m[dir];
      function pt(rad, deg) { var a = (deg - 90) * Math.PI / 180; return (cx + rad * Math.cos(a)).toFixed(1) + ',' + (cy + rad * Math.sin(a)).toFixed(1); }
      var c = k * 45, cls = d.kind + ' r' + d.rank;
      out.push('<polygon class="sec ' + cls + '" points="' + [pt(R, c - 22.5), pt(R, c + 22.5), pt(rr, c + 22.5), pt(rr, c - 22.5)].join(' ') + '"/>');
      var a = (c - 90) * Math.PI / 180;
      out.push('<text class="sec-dir ' + d.kind + '" x="' + (cx + 166 * Math.cos(a)).toFixed(1) + '" y="' + (cy + 166 * Math.sin(a) + 5).toFixed(1) + '">' + dir + '</text>');
      var words = d.short.split(' '), tx = (cx + 121 * Math.cos(a)).toFixed(1), ty = cy + 121 * Math.sin(a) + (words.length > 1 ? -2 : 4);
      out.push('<text class="sec-name ' + cls + '" x="' + tx + '" y="' + ty.toFixed(1) + '">' + words.map(function (w, i) {
        return '<tspan x="' + tx + '" dy="' + (i ? 11 : 0) + '">' + esc(w) + '</tspan>';
      }).join('') + '</text>');
    });
    return '<svg class="pcompass" viewBox="0 0 360 360"' + (size ? ' width="' + size + '" height="' + size + '"' : '') + ' role="img" aria-label="Feng shui compass diagram ranking your eight directions for ' + esc(r.gua.gua) + ' Gua, warm colors best, dark red least suitable">' +
      out.join('') +
      '<circle class="hub" cx="180" cy="180" r="80"/>' +
      '<text class="hub-tri" x="180" y="166">' + TRIGRAM[r.gua.gua] + '</text>' +
      '<text class="hub-gua" x="180" y="198">' + esc(r.gua.gua) + ' ' + esc(r.gua.zh) + '</text>' +
      '<text class="hub-grp" x="180" y="220">' + r.gua.group + ' group</text></svg>';
  }

  function dirTable(r) {
    var rows = r.directions.map(function (d) {
      return '<tr class="' + d.kind + ' r' + d.rank + '"><td class="num"><span class="badge r' + d.rank + '">' + d.rank + '</span></td><td><strong>' + esc(d.label) + '</strong></td>' +
        '<td class="dir">' + esc(d.dirName) + ' <span class="muted">(' + d.dir + ')</span></td></tr>';
    });
    return '<div class="table-scroll"><table class="dirs"><thead><tr><th>#</th><th>Label</th><th>Direction</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
  }

  function fullDirectionsSection(model) {
    var blocks = model.results.map(function (r) {
      var f = favorable(r);
      return '<div class="card hero-card">' + sexLabel(r, model) + '<p class="hero-line">' + bedLine(r) + '</p>' +
        '<p class="hero-sub">Desk: face it ' + esc(lc(f[0].dirName)) + '. Everything else comes after the bed and the desk.</p>' +
        '<figure class="pc-fig">' + compassSvg(r) + scaleLegend(8) +
        '<figcaption><strong>Diagram only.</strong> It shows your directions in general, not measured directions in your room.</figcaption></figure>' +
        dirTable(r) + '</div>';
    });
    return '<section id="directions" class="full report-hero"><h2>Your bedroom compass</h2>' + grid(model, blocks) +
      '<dl class="tags"><dt>Traditional basis</dt><dd>Ba Zhai (Eight Mansions)</dd><dt>Evidence status</dt><dd>Traditional theory</dd><dt>Action</dt><dd>For reference only; nothing here asks you to move anything.</dd></dl></section>';
  }

  // ---------- Paid: eight-label legend ----------

  function legendSection(model) {
    var r0 = model.results[0];
    var rows = r0.directions.map(function (d, i) {
      var mine = model.results.map(function (r) { var x = r.directions[i]; return (model.results.length > 1 ? cap(r.sex) + ': ' : '') + x.dirName + ' (' + x.dir + ')'; }).join('<br>');
      var pips = ''; for (var k = 0; k < 8; k++) pips += '<i class="' + (k === i ? 'on ' + d.kind + ' r' + d.rank : '') + '"></i>';
      return '<li class="lg-row ' + d.kind + ' r' + d.rank + '"><div class="lg-name"><i class="sw r' + d.rank + '" aria-hidden="true"></i><strong>' + esc(d.label) + '</strong>' + (TRAD[d.key] ? '<span class="lg-lit">Tradition: ' + esc(TRAD[d.key]) + '</span>' : '') + '</div>' +
        '<div class="lg-assoc">' + esc(MEANING[d.key]) + '</div>' +
        '<div class="lg-rank"><span class="pips" aria-label="Rank ' + (i + 1) + ' of 8">' + pips + '</span><span>' + (i + 1) + ' of 8</span></div>' +
        '<div class="lg-dir">' + mine + '</div></li>';
    }).join('');
    return '<section id="legend" class="full"><h2>What the eight labels mean</h2>' +
      '<p>Your eight directions, ranked 1 to 8. Your direction for each is on the right.</p>' +
      '<ol class="legend-list">' + rows + '</ol></section>';
  }

  // ---------- Paid: bedroom application (text mapping) ----------

  function applicationSection(model) {
    var blocks = model.results.map(function (r) {
      var items = model.checklist.map(function (c, i) {
        return '<li class="item"><h3>' + (i + 1) + '. ' + esc(c.title) + '</h3><p>' + esc(r.application[c.id]) + '</p></li>';
      });
      return '<div class="card">' + sexLabel(r, model) + '<p class="eyebrow">' + esc(r.gua.gua) + ' Gua</p><ol class="checklist">' + items.join('') + '</ol></div>';
    });
    return '<section id="application" class="full"><h2>Your bedroom, item by item</h2>' +
      '<p>What each checklist item means for you.</p>' +
      grid(model, blocks) + '<p class="callout">' + esc(COPY.comfort) + '</p></section>';
  }

  // ---------- Paid: printable check-off card ----------

  function cardSection(model) {
    var wheels = model.results.map(function (r) {
      return '<div class="card-wheel">' + (model.results.length > 1 ? '<p class="eyebrow">' + cap(r.sex) + ' formula</p>' : '') + compassSvg(r) + '</div>';
    }).join('') + scaleLegend(8);
    var items = model.checklist.map(function (c) {
      return '<li><label><input type="checkbox"> <span><strong>' + esc(c.title) + '</strong><small>' + esc(c.evidence) + ' · ' + esc(c.action) + '</small></span></label></li>';
    }).join('');
    return '<section id="card" class="full"><h2>Your check-off card</h2>' +
      '<p class="no-print">Print it, walk around the room, tick each item.</p>' +
      '<div class="checkcard"><div class="cc-head"><span class="brand">Ancient Spatial Science</span><span>Bedroom check-off card · ' + esc(model.nickname) + '</span></div>' +
      '<div class="cc-body"><div class="cc-wheels">' + wheels + '<p class="fine">Diagram only, not measured directions in your room.</p></div><ol class="cc-list">' + items + '</ol></div>' +
      '<p class="cc-foot">' + esc(COPY.reference) + '</p></div>' +
      '<div class="row no-print"><button class="btn primary" data-action="printcard">Print check-off card</button></div></section>';
  }

  // ---------- Shared: glossary, disclosure ----------

  function glossarySection(paid) {
    var labels = (paid ? LABEL_ORDER : LABEL_ORDER.slice(0, 4)).map(function (k) {
      return [LABEL_TEXT[k] + (TRAD[k] ? ' (' + TRAD[k].split(' ').slice(0, 2).join(' ') + ')' : ''), MEANING[k], 'r' + (LABEL_ORDER.indexOf(k) + 1)];
    });
    var dl = TERMS_BASE.concat(labels).map(function (t) { return '<dt>' + (t[2] ? '<i class="sw ' + t[2] + '" aria-hidden="true"></i>' : '') + esc(t[0]) + '</dt><dd>' + esc(t[1]) + '</dd>'; }).join('');
    return '<section id="glossary"><h2>Glossary</h2><dl class="terms">' + dl + '</dl></section>';
  }

  function disclosureSection() {
    return '<section id="disclosure"><h2>An honest note</h2><p class="lead">' + esc(COPY.reference) + '</p><p>' + esc(COPY.disclosure) + '</p>' +
      '<p>Every checklist item above is tagged with its Traditional basis, its Evidence status (Traditional theory / Supported by modern research / Unverified) and the Action it takes, so you can decide what\'s worth changing.</p></section>';
  }

  // ---------- Upgrade (free) / tools (paid) ----------

  // Free-tier preview of the paid compass: all eight sectors in their real paid colors (mark, 2026-10-10);
  // the four best are labeled, the other four carry a lock and no label (free never names them).
  function previewSvg(r) {
    var cx = 180, cy = 180, R = 150, rr = 92, out = [];
    var m = {};
    r.directions.forEach(function (d) { m[d.dir] = d; });
    ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].forEach(function (dir, k) {
      var d = m[dir], good = d.kind === 'favorable';
      function pt(rad, deg) { var a = (deg - 90) * Math.PI / 180; return (cx + rad * Math.cos(a)).toFixed(1) + ',' + (cy + rad * Math.sin(a)).toFixed(1); }
      var c = k * 45, a = (c - 90) * Math.PI / 180;
      out.push('<polygon class="sec r' + d.rank + (good ? '' : ' locked') + '" points="' + [pt(R, c - 22.5), pt(R, c + 22.5), pt(rr, c + 22.5), pt(rr, c - 22.5)].join(' ') + '"/>');
      out.push('<text class="sec-dir" x="' + (cx + 166 * Math.cos(a)).toFixed(1) + '" y="' + (cy + 166 * Math.sin(a) + 5).toFixed(1) + '">' + dir + '</text>');
      var tx = cx + 121 * Math.cos(a), ty = cy + 121 * Math.sin(a);
      if (good) {
        var words = d.short.split(' ');
        out.push('<text class="sec-name r' + d.rank + '" x="' + tx.toFixed(1) + '" y="' + (ty + (words.length > 1 ? -2 : 4)).toFixed(1) + '">' + words.map(function (w, i) {
          return '<tspan x="' + tx.toFixed(1) + '" dy="' + (i ? 11 : 0) + '">' + esc(w) + '</tspan>';
        }).join('') + '</text>');
      } else {
        out.push('<g class="lock r' + d.rank + '" transform="translate(' + (tx - 7).toFixed(1) + ' ' + (ty - 9).toFixed(1) + ')"><path d="M3 8 V5 a4 4 0 0 1 8 0 V8" fill="none"/><rect x="0" y="8" width="14" height="10" rx="2"/></g>');
      }
    });
    return '<svg class="pv-compass" viewBox="0 0 360 360" role="img" aria-label="Preview of your feng shui bedroom compass from the full report: four best directions shown, the other four locked">' +
            out.join('') + '<circle class="hub" cx="180" cy="180" r="80"/>' +
      '<text class="hub-tri" x="180" y="166">' + TRIGRAM[r.gua.gua] + '</text>' +
      '<text class="hub-gua" x="180" y="198">' + esc(r.gua.gua) + ' ' + esc(r.gua.zh) + '</text>' +
      '<text class="hub-grp" x="180" y="220">' + r.gua.group + ' group</text></svg>';
  }

  function previewBlock(model) {
    var r = model.results[0], f = favorable(r);
    var bars = function (n) { var o = ''; for (var i = 0; i < n; i++) o += '<i style="width:' + [92, 78, 85, 64, 88, 70][i % 6] + '%"></i>'; return o; };
    return '<div class="preview" aria-label="Preview of the full report">' +
      '<figure class="pv-main">' + previewSvg(r) + '<figcaption><strong>Your bedroom compass.</strong> All eight directions, color-coded with a key. Unlock the names of the other four with the full report.</figcaption></figure>' +
      '<div class="pv-side">' +
        '<div class="pv-card"><p class="pv-title">Your bedroom, item by item</p><p class="pv-line">1. Headboard: point it ' + esc(lc(f[0].dirName)) + '…</p><div class="pv-bars">' + bars(5) + '</div></div>' +
        '<div class="pv-card"><p class="pv-title">Printable check-off card</p><ul class="pv-checks"><li></li><li></li><li></li><li></li></ul></div>' +
      '</div></div>';
  }

  function upsellSection(model) {
    return '<section id="upgrade" class="upsell no-print"><h2>Go further with the full report</h2>' + previewBlock(model) +
      '<p>Everything in your free report is yours to keep. The full report adds:</p><ul>' +
      '<li>Your complete eight-direction map, with a personal compass chart</li>' +
      '<li>A guide to what each of the eight labels means</li>' +
      '<li>All 8 checklist items read against your own directions</li>' +
      '<li>A printable check-off card to carry around your room</li>' +
      '<li>A share card with your Gua and favorable directions</li></ul>' +
      '<button class="btn primary" data-action="checkout">Get the full report — $9</button>' +
      '<p class="fine">' + esc(COPY.checkout) + '</p></section>';
  }

  function toolsSection() {
    return '<section id="tools" class="no-print"><h2>Keep your report</h2><div class="row">' +
      '<button class="btn primary" data-action="printcard">Print check-off card</button>' +
      '<button class="btn" data-action="print">Print / Save full report as PDF</button>' +
      '<button class="btn" data-action="sharecard">Download share card</button>' +
      '<button class="btn" data-action="copylink">Copy report link</button></div></section>';
  }

  function report(model, opts) {
    var paid = !!(opts && opts.paid);
    var head = '<p class="disclaimer-top">' + esc(COPY.topDisclaimer) + '</p><p class="greeting">Hi ' + esc(model.nickname) + ', here is your bedroom report' + (paid ? ' — full version' : '') + '.</p>';
    if (!paid) {
      return head + favorableSection(model) + guaSection(model) + groupsSection(model) + howSection(model) +
        checklistSection(model) + evidenceSection(model) + findSection() +
        glossarySection(false) + disclosureSection() + upsellSection(model);
    }
    return head + fullDirectionsSection(model) + legendSection(model) + guaSection(model) + groupsSection(model) + howSection(model) +
      checklistSection(model) + applicationSection(model) + evidenceSection(model) + findSection() + multiBedroomSection() + cardSection(model) +
      glossarySection(true) + disclosureSection() + toolsSection();
  }

  var api = { report: report, previewBlock: previewBlock, COPY: COPY, esc: esc };
  root.Render = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

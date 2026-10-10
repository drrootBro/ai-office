// Rule engine: deterministic lookup tables only (spec v2 §3.2–3.4, §3.6).
// FROZEN INTERFACE (2026-10-09):
//   effectiveYear({year, month?, day?}) -> {year, inputYear, dateProvided, shifted, lichunDate, onLichunDay}
//   computeGua(year, sex)               -> {gua, zh, expr, raw, group, remainder, calc}      sex: 'male' | 'female'
//   directions(gua)                     -> [{key, name, zh, rank, kind, dir}] in spec column order
//   buildReport(input)                  -> report model consumed by render.js
//     input: {nickname?, year, month?, day?, sex: 'male'|'female'|'skip'}   (home questions moved to the v1 family version)
(function (root) {
  'use strict';

  var GUA_NAMES = { 1: 'Kan', 2: 'Kun', 3: 'Zhen', 4: 'Xun', 6: 'Qian', 7: 'Dui', 8: 'Gen', 0: 'Li' };
  var GUA_ZH = { Kan: '坎', Kun: '坤', Zhen: '震', Xun: '巽', Qian: '乾', Dui: '兑', Gen: '艮', Li: '离' };
  var EAST = ['Kan', 'Zhen', 'Xun', 'Li'];

  // §3.4 column order. kind: 'favorable' | 'unfavorable'.
  // Plain labels only (round 2.1): the four less suitable categories carry no traditional name at all,
  // so nothing downstream can render one. Traditional names are kept for the four favorable ones only.
  var CATEGORIES = [
    { key: 'best', rank: 1, label: 'Best direction', short: 'Best', trad: 'Sheng Qi', zh: '生气', kind: 'favorable' },
    { key: 'second', rank: 2, label: '2nd-best direction', short: '2nd best', trad: 'Yan Nian', zh: '延年', kind: 'favorable' },
    { key: 'third', rank: 3, label: '3rd-best direction', short: '3rd best', trad: 'Tian Yi', zh: '天医', kind: 'favorable' },
    { key: 'fourth', rank: 4, label: '4th-best direction', short: '4th best', trad: 'Fu Wei', zh: '伏位', kind: 'favorable' },
    { key: 'less', rank: 5, label: 'Less suitable', short: 'Less suitable', kind: 'unfavorable' },
    { key: 'not', rank: 6, label: 'Not suitable', short: 'Not suitable', kind: 'unfavorable' },
    { key: 'very', rank: 7, label: 'Very unsuitable', short: 'Very unsuitable', kind: 'unfavorable' },
    { key: 'least', rank: 8, label: 'Least suitable', short: 'Least suitable', kind: 'unfavorable' }
  ];

  // §3.4 table, verbatim.
  var TABLE = {
    Qian: ['W', 'SW', 'NE', 'NW', 'SE', 'N', 'E', 'S'],
    Kan: ['SE', 'S', 'E', 'N', 'W', 'NW', 'NE', 'SW'],
    Gen: ['SW', 'W', 'NW', 'NE', 'S', 'E', 'N', 'SE'],
    Zhen: ['S', 'SE', 'N', 'E', 'SW', 'NE', 'NW', 'W'],
    Xun: ['N', 'E', 'S', 'SE', 'NW', 'W', 'SW', 'NE'],
    Li: ['E', 'N', 'SE', 'S', 'NE', 'SW', 'W', 'NW'],
    Kun: ['NE', 'NW', 'W', 'SW', 'E', 'S', 'SE', 'N'],
    Dui: ['NW', 'NE', 'SW', 'W', 'N', 'SE', 'S', 'E']
  };

  var DIR_NAMES = { N: 'North', NE: 'Northeast', E: 'East', SE: 'Southeast', S: 'South', SW: 'Southwest', W: 'West', NW: 'Northwest' };

  function lichunTable() {
    if (root.LICHUN) return root.LICHUN;
    if (typeof require === 'function') {
      // Node (tests): lichun.js assigns window.LICHUN.
      var vm = require('vm'), fs = require('fs'), path = require('path');
      var sandbox = { window: {} };
      vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'lichun.js'), 'utf8'), sandbox);
      root.LICHUN = sandbox.window.LICHUN;
      return root.LICHUN;
    }
    throw new Error('lichun.js not loaded');
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function effectiveYear(input) {
    var year = Number(input.year);
    var month = input.month ? Number(input.month) : null;
    var day = input.day ? Number(input.day) : null;
    var res = { year: year, inputYear: year, dateProvided: false, shifted: false, lichunDate: null, onLichunDay: false };
    if (!month || !day) return res;
    var lc = lichunTable()[String(year)];
    if (!lc) return res;
    var md = pad(month) + '-' + pad(day);
    res.dateProvided = true;
    res.lichunDate = year + '-' + lc;
    res.onLichunDay = md === lc;
    if (md < lc) { res.year = year - 1; res.shifted = true; }
    return res;
  }

  function computeGua(year, sex) {
    var yy = year % 100;
    var yyStr = String(yy);
    var raw, expr;
    if (year < 2000) {
      if (sex === 'male') {
        raw = 100 - yy;
        expr = '(100 − ' + yyStr + ') = ' + raw;
      } else {
        var base = yy < 4 ? yy + 9 : yy;
        raw = base - 4;
        expr = yy < 4 ? '(' + yyStr + ' + 9 − 4) = ' + raw : '(' + yyStr + ' − 4) = ' + raw;
      }
    } else {
      if (sex === 'male') {
        raw = 99 - yy;
        expr = '(99 − ' + yyStr + ') = ' + raw;
      } else {
        raw = yy + 6;
        expr = '(' + yyStr + ' + 6) = ' + raw;
      }
    }
    var r = raw % 9;
    var gua = r === 5 ? (sex === 'male' ? 'Kun' : 'Gen') : GUA_NAMES[r];
    var calc = expr + ', ' + raw + ' ÷ 9 leaves remainder ' + r + ' → ' + gua +
      (r === 5 ? ' (remainder 5 has no Gua of its own; ' + (sex === 'male' ? 'men take Kun' : 'women take Gen') + ')' : '') + '.';
    return {
      gua: gua,
      zh: GUA_ZH[gua],
      expr: expr,
      raw: raw,
      group: EAST.indexOf(gua) >= 0 ? 'East' : 'West',
      remainder: r,
      calc: calc
    };
  }

  function directions(gua) {
    var row = TABLE[gua];
    return CATEGORIES.map(function (c, i) {
      return { key: c.key, rank: c.rank, label: c.label, short: c.short, trad: c.trad || null, zh: c.zh || null, kind: c.kind, dir: row[i], dirName: DIR_NAMES[row[i]] };
    });
  }

  function byKey(dirs) {
    var m = {};
    dirs.forEach(function (d) { m[d.key] = d; });
    return m;
  }

  // §3.6 checklist, final English copy.
  var CHECKLIST = [
    { id: 'headboard', trad: true, research: 'none', title: 'Headboard against a solid wall, not floating', basis: 'Ba Zhai "backing mountain" idea', evidence: 'Traditional theory', action: 'Add a headboard or place a cabinet behind; low cost' },
    { id: 'door', trad: true, research: 'partial', title: 'See the door from bed, but bed not directly facing the door', basis: '"commanding position"', evidence: 'Partly consistent with modern research', action: 'Adjust bed angle; zero cost' },
    { id: 'light', trad: false, research: 'supported', title: 'Block light at night', basis: 'none (modern advice)', evidence: 'Supported by modern research (light affects sleep)', action: 'Blackout curtains' },
    { id: 'noise', trad: false, research: 'supported', title: 'Control noise', basis: 'none', evidence: 'Supported by modern research', action: 'Seal windows/doors or use white noise' },
    { id: 'air', trad: true, research: 'supported', title: 'Keep air flowing', basis: 'Ba Zhai warns against drafty spots', evidence: 'Supported by modern research (air quality and cognition)', action: 'Air out regularly; zero cost' },
    { id: 'cool', trad: false, research: 'supported', title: 'Keep the room slightly cool', basis: 'none', evidence: 'Supported by modern research', action: 'AC or fan' },
    { id: 'bluelight', trad: false, research: 'supported', title: 'Cut blue light before bed', basis: 'none', evidence: 'Supported by modern research', action: 'Dim the lights; zero cost' },
    { id: 'walkways', trad: true, research: 'none', title: 'Keep walkways clear and the floor tidy', basis: '"bright hall" openness', evidence: 'Traditional theory', action: 'zero cost' }
  ];

  // §3.5.4 paid application layer: maps the already-computed table onto the 8 items.
  // Round 2.1 tone: plain, direct conclusions. Orientation only (which way the head / desk faces);
  // never a spot in the room, and no furniture placement without a traditional source.
  function application(dirs) {
    var k = byKey(dirs);
    function n(x) { return x.dirName.toLowerCase(); }
    return {
      headboard: 'Headboard: point it ' + n(k.best) + ', your best direction. If the wall that way is not solid, go with ' + n(k.second) + ', then ' + n(k.third) + ', then ' + n(k.fourth) + '. A solid wall behind your head comes first.',
      door: 'Don\'t line the bed up with the door, and make sure you can see the door from bed. A door on your ' + n(k.best) + ', ' + n(k.second) + ', ' + n(k.third) + ' or ' + n(k.fourth) + ' side is a bonus.',
      light: 'Same for everyone: block the light at night. Blackout curtains do the job.',
      noise: 'Same for everyone: put the bed by the quietest wall, even if it is not one of your good directions.',
      air: 'Air the room out every day. If you can pick a window, open the ' + n(k.best) + ' or ' + n(k.third) + ' one first.',
      cool: 'Same for everyone: keep the room slightly cool.',
      bluelight: 'Desk: face it ' + n(k.best) + '. Screens off before bed.',
      walkways: 'Keep the ' + n(k.best) + ' side of the room clear and tidy. That is the side tradition wants open.'
    };
  }

  function buildReport(input) {
    var nickname = (input.nickname || '').trim().slice(0, 40) || 'friend';
    var ey = effectiveYear(input);
    var sexes = input.sex === 'skip' ? ['male', 'female'] : [input.sex];
    var results = sexes.map(function (sex) {
      var g = computeGua(ey.year, sex);
      var dirs = directions(g.gua);
      return { sex: sex, gua: g, directions: dirs, application: application(dirs) };
    });
    return {
      nickname: nickname,
      input: { year: Number(input.year), month: input.month ? Number(input.month) : null, day: input.day ? Number(input.day) : null, sex: input.sex },
      yearInfo: ey,
      results: results,
      checklist: CHECKLIST
    };
  }

  var GROUPS = { East: ['Kan', 'Zhen', 'Xun', 'Li'], West: ['Qian', 'Kun', 'Gen', 'Dui'] };

  var api = { GROUPS: GROUPS, GUA_ZH: GUA_ZH, effectiveYear: effectiveYear, computeGua: computeGua, directions: directions, buildReport: buildReport, CHECKLIST: CHECKLIST, TABLE: TABLE };
  root.Engine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

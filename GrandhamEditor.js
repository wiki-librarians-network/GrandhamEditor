/**
 * Grandham Editor (#mlwsBookEditor)
 * Wikidata user script: data model + quality checker + bulk-assisted editor for books
 * (Work items & Edition items).
 *
 * Grandham Project · WikiProject Books · Sahya Digital Conservation Foundation
 * Wiki Librarians Network · Author: Manoj Karingamadathil (User:Manojk)
 *
 * INSTALL: add to  Special:MyPage/common.js
 *   mw.loader.load('//www.wikidata.org/w/index.php?title=User:Manojk/GrandhamEditor.js&action=raw&ctype=text/javascript');
 * (or save this file as User:YourName/GrandhamEditor.js and use your own name in the URL).
 * A "Grandham Editor" link appears in the Tools menu on every Wikidata page.
 */
mw.loader.using(['mediawiki.api', 'mediawiki.util']).then(function () {
'use strict';

var SUF = ' via Grandham Editor (#mlwsBookEditor)';
var api = new mw.Api();
var Q = { edition: 'Q3331189', translation: 'Q21112633', work: 'Q47461344', human: 'Q5', male: 'Q6581097', female: 'Q6581072',
          india: 'Q668', raj: 'Q129286', ml: 'Q36236', en: 'Q1860', house: 'Q2085381', press: 'Q6500733' };
var ML = /[\u0D00-\u0D7F]/;

/* ---------- field model ---------- */
var PRE_LANG = [['Q36236', 'Malayalam'], ['Q1860', 'English']];
var PRE_CTRY = [['Q668', 'India'], ['Q129286', 'British Raj']];
var PRE_FORM = [['Q8261', 'novel'], ['Q8253', 'fiction'], ['Q213051', 'non-fiction'], ['Q482', 'poetry'], ['Q25372', 'drama'],
  ['Q4184', 'autobiography'], ['Q35760', 'essay'], ['Q10916116', 'history book'], ['Q83790', 'textbook'], ['Q1279564', 'short story'],
  ['Q131539', "children's literature"], ['Q1164267', 'travelogue'], ['Q8162', 'linguistics'], ['Q179461', 'religious text'],
  ['Q2723546', 'Panchangam'], ['Q44342', 'legend'], ['Q7553', 'translation']];
var PRE_MOVE = [['Q3523410', 'Manipravalam'], ['Q15580856', 'feminist movement'], ['Q2914617', 'Bhakti movement']];

// t: W=work E=edition ; x: optional (hidden under "Optional fields") ; m: multiple values allowed
var F = [
 { pid: 'P1476', name: 'title', dt: 'mono', col: 'title', t: 'WE', hint: 'Text + language code' },
 { pid: 'P1680', name: 'subtitle', dt: 'mono', col: 'subtitle', t: 'WE', hint: 'Text + language code' },
 { pid: 'P629', name: 'edition or translation of (work)', dt: 'item', col: 'work_qid', t: 'E', hint: 'Work item (P31 = written work)', find: 1 },
 { pid: 'P50', name: 'author', dt: 'item', m: 1, col: 'author', t: 'WE', create: 'author' },
 { pid: 'P98', name: 'editor', dt: 'item', m: 1, col: 'editor', t: 'WE', create: 'editor' },
 { pid: 'P655', name: 'translator', dt: 'item', m: 1, col: 'translator', t: 'WE', create: 'translator' },
 { pid: 'P407', name: 'language of work or name', dt: 'item', m: 1, col: 'language', t: 'WE', pre: PRE_LANG },
 { pid: 'P495', name: 'country of origin', dt: 'item', m: 1, col: 'country', t: 'WE', pre: PRE_CTRY },
 { pid: 'P571', name: 'inception', dt: 'time', col: 'inception', t: 'W', hint: 'YYYY, YYYY-MM or YYYY-MM-DD' },
 { pid: 'P577', name: 'publication date', dt: 'time', col: 'publication_date', t: 'WE', hint: 'YYYY, YYYY-MM or YYYY-MM-DD' },
 { pid: 'P135', name: 'cultural movement', dt: 'item', m: 1, col: 'movement', t: 'W', pre: PRE_MOVE },
 { pid: 'P7937', name: 'form of creative work', dt: 'item', m: 1, col: 'form', t: 'W', pre: PRE_FORM },
 { pid: 'P747', name: 'has edition or translation', dt: 'item', m: 1, col: 'edition_qids', t: 'W', hint: 'Edition items (cross-linked to P629 on save)', find: 1 },
 { pid: 'P393', name: 'edition number', dt: 'string', col: 'edition_number', t: 'E', hint: '1, 2, 3 …' },
 { pid: 'P291', name: 'place of publication', dt: 'item', m: 1, col: 'place_of_publication', t: 'E' },
 { pid: 'P123', name: 'publisher', dt: 'item', m: 1, col: 'publisher', t: 'E', create: 'publisher' },
 { pid: 'P872', name: 'printed by', dt: 'item', m: 1, col: 'printer', t: 'E', create: 'printer' },
 { pid: 'P195', name: 'collection', dt: 'item', m: 1, col: 'collection', t: 'E' },
 { pid: 'P1104', name: 'number of pages', dt: 'quantity', col: 'pages', t: 'E' },
 { pid: 'P996', name: 'document file on Commons', dt: 'commons', col: 'commons_file', t: 'E', hint: 'File:Name.pdf' },
 { pid: 'P1957', name: 'Wikisource index page URL', dt: 'url', col: 'wikisource_index', t: 'E' },
 { pid: 'P953', name: 'work available at URL', dt: 'url', m: 1, col: 'url', t: 'E' },
 { pid: 'P2635', name: 'number of parts', dt: 'quantity', col: 'parts', t: 'E', x: 1 },
 { pid: 'P957', name: 'ISBN-10', dt: 'extid', col: 'isbn10', t: 'E', x: 1 },
 { pid: 'P212', name: 'ISBN-13', dt: 'extid', col: 'isbn13', t: 'E', x: 1 },
 { pid: 'P243', name: 'OCLC number', dt: 'extid', col: 'oclc', t: 'E', x: 1 },
 { pid: 'P648', name: 'Open Library ID', dt: 'extid', col: 'openlibrary', t: 'E', x: 1 },
 { pid: 'P921', name: 'main subject', dt: 'item', m: 1, col: 'topic', t: 'W', x: 1 },
 { pid: 'P166', name: 'award received', dt: 'item', m: 1, col: 'award', t: 'W', x: 1 },
 { pid: 'P179', name: 'part of the series', dt: 'item', m: 1, col: 'series', t: 'W', x: 1 },
 { pid: 'P144', name: 'based on', dt: 'item', m: 1, col: 'based_on', t: 'W', x: 1 },
 { pid: 'P941', name: 'inspired by', dt: 'item', m: 1, col: 'inspired_by', t: 'W', x: 1 },
 { pid: 'P674', name: 'characters', dt: 'item', m: 1, col: 'character', t: 'W', x: 1 },
 { pid: 'P840', name: 'narrative location', dt: 'item', m: 1, col: 'narrative_location', t: 'W', x: 1 }
];
var FB = {}, COLMAP = {}, ALIAS = { ml: Q.ml, malayalam: Q.ml, en: Q.en, english: Q.en, india: Q.india, 'british raj': Q.raj, raj: Q.raj, 'british india': Q.raj };
F.forEach(function (f) { FB[f.pid] = f; COLMAP[f.col] = f.pid; COLMAP[f.pid.toLowerCase()] = f.pid; });
COLMAP.subtitle_lang = 'P1680_lang'; COLMAP.title_lang = 'P1476_lang';
PRE_FORM.concat(PRE_MOVE, PRE_LANG, PRE_CTRY).forEach(function (p) { ALIAS[p[1].toLowerCase()] = p[0]; });
var applies = function (f, type) { return f.t.indexOf(type === 'work' ? 'W' : 'E') > -1; };

/* ---------- generic helpers ---------- */
function h(tag, a, kids) {
  var e = document.createElement(tag);
  Object.keys(a || {}).forEach(function (k) {
    var v = a[k];
    if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v;
    else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v);
  });
  [].concat(kids === undefined ? [] : kids).forEach(function (c) { if (c == null || c === false) return; e.appendChild(typeof c === 'object' ? c : document.createTextNode(c)); });
  return e;
}
function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
function aget(p) { p.format = 'json'; return new Promise(function (res, rej) { api.get(p).then(res, function (c, r) { rej(new Error((r && r.error && r.error.info) || c)); }); }); }
function apost(p) { p.format = 'json'; return new Promise(function (res, rej) { api.postWithEditToken(p).then(res, function (c, r) { rej(new Error((r && r.error && r.error.info) || c)); }); }); }
function toast(m, bad) { var t = h('div', { class: 'ge-toast' + (bad ? ' ge-bad' : '') }, m); document.body.appendChild(t); setTimeout(function () { t.remove(); }, bad ? 7000 : 3500); }
function dl(name, text) { var a = h('a', { href: URL.createObjectURL(new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' })), download: name }); document.body.appendChild(a); a.click(); a.remove(); }
function csvCell(v) { v = v == null ? '' : String(v); return /[",\t\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

/* ---------- label cache + entity fetch ---------- */
var LC = {};
function L(id) { return LC[id] || {}; }
function cacheEnt(e) {
  if (e.missing !== undefined) { LC[e.id || 'x'] = { missing: true }; return; }
  var l = e.labels || {}, d = e.descriptions || {};
  LC[e.id] = { ml: l.ml && l.ml.value, en: l.en && l.en.value, label: (l.en || l.ml || {}).value, desc: (d.en || d.ml || {}).value };
}
function getEnts(ids, props) {
  ids = uniq(ids).filter(Boolean); var out = {}, ch = [];
  for (var i = 0; i < ids.length; i += 50) ch.push(ids.slice(i, i + 50));
  return Promise.all(ch.map(function (c) {
    return aget({ action: 'wbgetentities', ids: c.join('|'), props: props || 'labels|descriptions|claims', languages: 'ml|en' }).then(function (r) {
      Object.keys(r.entities || {}).forEach(function (k) { var e = r.entities[k]; if (e.missing !== undefined) { LC[k] = { missing: true }; } else cacheEnt(e); out[k] = e; });
    });
  })).then(function () { return out; });
}
function ensureLabels(ids) { ids = uniq(ids).filter(function (i) { return i && !LC[i]; }); return ids.length ? getEnts(ids, 'labels|descriptions') : Promise.resolve(); }
function p31(e) { return ((e.claims || {}).P31 || []).map(function (c) { return qv(c); }).filter(Boolean); }
function qv(c) { var s = c.mainsnak; return s && s.snaktype === 'value' && s.datavalue && s.datavalue.value && s.datavalue.value['numeric-id'] ? 'Q' + s.datavalue.value['numeric-id'] : null; }
function cids(e, pid) { return ((e.claims || {})[pid] || []).map(qv).filter(Boolean); }

/* ---------- value conversion ---------- */
function fmtTime(v) {
  var m = /^[+-](\d+)-(\d\d)-(\d\d)/.exec(v.time); if (!m) return v.time;
  return v.precision >= 11 ? m[1] + '-' + m[2] + '-' + m[3] : v.precision === 10 ? m[1] + '-' + m[2] : m[1];
}
function toTime(s) {
  var m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec((s || '').trim()); if (!m) return null;
  return { time: '+' + m[1] + '-' + (m[2] || '00') + '-' + (m[3] || '00') + 'T00:00:00Z', timezone: 0, before: 0, after: 0,
           precision: m[3] ? 11 : m[2] ? 10 : 9, calendarmodel: 'http://www.wikidata.org/entity/Q1985727' };
}
function dateOk(s) {
  var m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(s); if (!m) return false;
  if (m[2] && (+m[2] < 1 || +m[2] > 12)) return false;
  if (m[3]) { var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); if (d.getUTCMonth() !== +m[2] - 1) return false; }
  return true;
}
function normForm(f, x, lang) { // form value -> comparable key
  if (f.dt === 'item') return x.id;
  if (f.dt === 'mono') return lang + '|' + x;
  if (f.dt === 'quantity') return String(+x);
  if (f.dt === 'commons') return x.trim().replace(/^File:/i, '');
  return String(x).trim();
}
function normClaim(f, c) {
  var s = c.mainsnak; if (s.snaktype !== 'value') return null; var v = s.datavalue.value;
  if (f.dt === 'item') return 'Q' + v['numeric-id'];
  if (f.dt === 'mono') return v.language + '|' + v.text;
  if (f.dt === 'time') return fmtTime(v);
  if (f.dt === 'quantity') return String(+v.amount);
  return String(v);
}
function mkClaim(f, x, lang, id) {
  var dv;
  if (f.dt === 'item') dv = { type: 'wikibase-entityid', value: { 'entity-type': 'item', 'numeric-id': +x.id.slice(1) } };
  else if (f.dt === 'mono') dv = { type: 'monolingualtext', value: { text: x, language: lang } };
  else if (f.dt === 'time') dv = { type: 'time', value: toTime(x) };
  else if (f.dt === 'quantity') dv = { type: 'quantity', value: { amount: (+x < 0 ? '' : '+') + (+x), unit: '1' } };
  else dv = { type: 'string', value: f.dt === 'commons' ? x.trim().replace(/^File:/i, '') : String(x).trim() };
  var c = { type: 'statement', rank: 'normal', mainsnak: { snaktype: 'value', property: f.pid, datavalue: dv } };
  if (id) c.id = id; return c;
}
function entityToVals(e) {
  var v = {};
  F.forEach(function (f) {
    var out = [];
    ((e.claims || {})[f.pid] || []).forEach(function (c) {
      var s = c.mainsnak; if (s.snaktype !== 'value') return; var dv = s.datavalue.value;
      if (f.dt === 'item') out.push({ id: 'Q' + dv['numeric-id'] });
      else if (f.dt === 'mono') { if (!out.length) { out.push(dv.text); v[f.pid + '_lang'] = dv.language; } }
      else if (f.dt === 'time') out.push(fmtTime(dv));
      else if (f.dt === 'quantity') out.push(String(+dv.amount));
      else out.push(dv);
    });
    if (out.length) v[f.pid] = out;
  });
  return v;
}
function detectType(e) {
  var t = p31(e);
  if (t.indexOf(Q.edition) > -1 || t.indexOf(Q.translation) > -1) return 'edition';
  if (t.indexOf(Q.work) > -1) return 'work';
  if ((e.claims || {}).P629) return 'edition';
  if ((e.claims || {}).P747) return 'work';
  return null;
}

/* ---------- ISBN ---------- */
function isbn10ok(s) { s = s.replace(/[-\s]/g, ''); if (!/^\d{9}[\dX]$/.test(s)) return false; var t = 0; for (var i = 0; i < 10; i++) t += (s[i] === 'X' ? 10 : +s[i]) * (10 - i); return t % 11 === 0; }
function isbn13ok(s) { s = s.replace(/[-\s]/g, ''); if (!/^\d{13}$/.test(s)) return false; var t = 0; for (var i = 0; i < 13; i++) t += +s[i] * (i % 2 ? 3 : 1); return t % 10 === 0; }
function toIsbn13(s10) {
  var raw = s10.replace(/[-\s]/g, ''), core = '978' + raw.slice(0, 9), t = 0;
  for (var i = 0; i < 12; i++) t += +core[i] * (i % 2 ? 3 : 1);
  var c = (10 - t % 10) % 10; return /-/.test(s10) ? '978-' + s10.trim().slice(0, -1) + c : core + c;
}

/* ---------- auto descriptions ---------- */
var ROLE = { author: ['author', 'എഴുത്തുകാരൻ', 'എഴുത്തുകാരി'], editor: ['editor', 'എഡിറ്റർ', 'എഡിറ്റർ'], translator: ['translator', 'വിവർത്തകൻ', 'വിവർത്തക'],
             publisher: ['publisher', 'പ്രസാധകൻ', 'പ്രസാധക'], printer: ['printer', 'അച്ചടിക്കാരൻ', 'അച്ചടിക്കാരി'] };
var REG = { 'Kerala, India': 'കേരളത്തിൽനിന്നുള്ള ഒരു ', 'Kerala, British India': 'ബ്രിട്ടീഷ് ഇന്ത്യയിലെ കേരളത്തിൽനിന്നുള്ള ഒരു ', 'India': 'ഇന്ത്യയിൽനിന്നുള്ള ഒരു ' };
function descFor(kind, gender, region) {
  if (kind === 'house' || kind === 'press') {
    return { en: (kind === 'house' ? 'publishing house' : 'printing press') + ' from ' + region,
             ml: REG[region] ? REG[region] + (kind === 'house' ? 'പ്രസാധക സ്ഥാപനം' : 'അച്ചടിശാല') : '' };
  }
  var r = ROLE[kind]; return { en: r[0] + ' from ' + region, ml: REG[region] ? REG[region] + r[gender === Q.female ? 2 : 1] : '' };
}
var LNAME = { Q36236: ['Malayalam', 'മലയാള'], Q1860: ['English', 'ഇംഗ്ലീഷ്'] };
function autoDescs(type, v) {
  var title = (v.P1476 || [''])[0], a = (v.P50 || [])[0], aid = a && a.id, lang = (v.P407 || [])[0], lq = lang && lang.id;
  var aEn = aid && (L(aid).en || L(aid).label), aMl = aid && L(aid).ml, ln = LNAME[lq] || [];
  var form = ((v.P7937 || []).map(function (x) { var p = PRE_FORM.filter(function (q) { return q[0] === x.id; })[0]; return p && p[1]; }).filter(Boolean)[0]) || 'literary work';
  var yr = ((v.P577 || [''])[0] || '').slice(0, 4), d = {};
  if (type === 'work') {
    d.en = (ln[0] ? ln[0] + ' ' : '') + form + (aEn && !ML.test(aEn) ? ' by ' + aEn : '');
    d.ml = aMl && ln[1] ? aMl + ' രചിച്ച ' + ln[1] + ' കൃതി' : '';
  } else {
    d.en = (yr ? yr + ' ' : '') + (ln[0] ? ln[0] + ' ' : '') + 'edition of ' + (ML.test(title) ? 'a work' : title) + (aEn && !ML.test(aEn) ? ' by ' + aEn : '');
    d.ml = title ? title + ' എന്ന കൃതിയുടെ ' + (yr ? yr + ' ' : '') + 'പതിപ്പ്' : '';
  }
  return d;
}

/* ---------- build wbeditentity payload ---------- */
function buildData(type, v, orig, opts) {
  opts = opts || {};
  var data = { claims: [] }, ol = (orig && orig.labels) || {}, od = (orig && orig.descriptions) || {}, oa = (orig && orig.aliases) || {};
  var meta = v.meta || {}, tt = ((v.P1476 || [''])[0] || '').trim(), tl = v.P1476_lang, ad = autoDescs(type, v);
  ['ml', 'en'].forEach(function (l) {
    var lab = (meta['label_' + l] || '').trim() || (tl === l ? tt : '');
    if (lab && (!ol[l] || (opts.over && ol[l].value !== lab))) (data.labels = data.labels || {})[l] = { language: l, value: lab };
    var d = (meta['desc_' + l] || '').trim() || ad[l];
    if (d && (!od[l] || (opts.over && od[l].value !== d))) (data.descriptions = data.descriptions || {})[l] = { language: l, value: d };
    var al = (meta['alias_' + l] || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean)
      .filter(function (s) { return !(oa[l] || []).some(function (x) { return x.value === s; }); });
    if (al.length) (data.aliases = data.aliases || {})[l] = al.map(function (s) { return { language: l, value: s, add: '' }; });
  });
  var t31 = FB.P31 || { pid: 'P31', dt: 'item' };
  if (!orig || p31(orig).indexOf(Q[type]) < 0) data.claims.push(mkClaim(t31, { id: Q[type] }));
  F.forEach(function (f) {
    if (!applies(f, type)) return;
    var lang = v[f.pid + '_lang'], want = (v[f.pid] || []).filter(function (x) { return f.dt === 'item' ? x.id : String(x).trim(); });
    var ex = ((orig && orig.claims) || {})[f.pid] || [];
    var wk = {}; want.forEach(function (x) { wk[normForm(f, x, lang)] = x; });
    var ek = ex.map(function (c) { return normClaim(f, c); });
    if (!f.m && ex.length === 1 && want.length === 1 && ek[0] !== null && ek[0] !== normForm(f, want[0], lang)) { // single-valued: update in place
      data.claims.push(mkClaim(f, want[0], lang, ex[0].id)); return;
    }
    want.forEach(function (x) { if (ek.indexOf(normForm(f, x, lang)) < 0) data.claims.push(mkClaim(f, x, lang)); });
    if (opts.remove) ex.forEach(function (c, i) { if (ek[i] !== null && !(ek[i] in wk)) data.claims.push({ id: c.id, remove: '' }); });
  });
  data.n = data.claims.length + Object.keys(data.labels || {}).length + Object.keys(data.descriptions || {}).length + Object.keys(data.aliases || {}).length;
  return data;
}
async function saveItem(type, v, orig, qid, opts) {
  var d = buildData(type, v, orig, opts), n = d.n; delete d.n;
  if (qid && !n) return qid;
  var tt = (v.P1476 || [''])[0] || '';
  var p = { action: 'wbeditentity', data: JSON.stringify(d), summary: (qid ? 'Updating ' : 'Creating ') + type + ' item: ' + tt.slice(0, 80) + SUF };
  if (qid) p.id = qid; else p.new = 'item';
  var r = await apost(p); return r.entity.id;
}
async function ensureLink(target, pid, val) {
  var e = (await getEnts([target], 'claims'))[target]; if (!e) return 'missing';
  var cur = cids(e, pid); if (cur.indexOf(val) > -1) return 'ok';
  if (pid === 'P629' && cur.length) return 'conflict';
  await apost({ action: 'wbeditentity', id: target, data: JSON.stringify({ claims: [mkClaim(FB[pid], { id: val })] }), summary: 'Adding reciprocal link ' + pid + ' → ' + val + SUF });
  return 'added';
}
function carry(v, keys) { var o = {}; keys.forEach(function (k) { if (v[k]) o[k] = JSON.parse(JSON.stringify(v[k])); }); return o; }
function deriveWork(v) {
  var w = carry(v, ['P1476', 'P1476_lang', 'P1680', 'P1680_lang', 'P50', 'P98', 'P655', 'P407', 'P495']);
  var n = (v.P393 || [''])[0]; if (v.P577 && (!n || n === '1')) w.P577 = v.P577.slice(); w.meta = {}; return w;
}
function deriveEdition(v, wq) {
  var e = carry(v, ['P1476', 'P1476_lang', 'P1680', 'P1680_lang', 'P50', 'P98', 'P655', 'P407', 'P495', 'P577']); e.P629 = [{ id: wq }]; e.meta = {}; return e;
}

/* ---------- table parsing ---------- */
function parseTable(text) {
  text = text.replace(/^\uFEFF/, ''); var first = text.split(/\r?\n/)[0] || '';
  var d = first.indexOf('\t') > -1 && first.split('\t').length >= first.split(',').length ? '\t' : ',';
  var rows = [], row = [], f = '', q = false;
  for (var i = 0; i < text.length; i++) {
    var c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"' && f === '') q = true;
    else if (c === d) { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; rows.push(row); row = []; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows.filter(function (r) { return r.some(function (x) { return x.trim() !== ''; }); });
}
function tok(s) { s = s.trim(); if (!s) return null; if (/^Q\d+$/i.test(s)) return { id: s.toUpperCase() }; var a = ALIAS[s.toLowerCase()]; return a ? { id: a } : { text: s }; }
function ingest(text) {
  var t = text.trim(), rows = [];
  if (!t) throw new Error('Nothing to load.');
  if (/^[\sQq\d,;|]+$/.test(t) && /Q\d/i.test(t)) {
    t.match(/Q\d+/gi).forEach(function (q) { rows.push({ qid: q.toUpperCase(), type: '', vals: {}, meta: {}, status: '' }); });
    return rows;
  }
  var tbl = parseTable(t), hdr = tbl[0].map(function (x) { return x.trim().toLowerCase().replace(/[\s-]+/g, '_'); });
  if (!hdr.some(function (x) { return COLMAP[x] || x === 'qid' || x === 'type'; })) throw new Error('Header row not recognised. Use the sample master file for column names.');
  tbl.slice(1).forEach(function (cells) {
    var r = { qid: '', type: '', vals: {}, meta: {}, status: '' }, raw = {}, lang = {};
    hdr.forEach(function (hd, i) {
      var c = (cells[i] || '').trim(); if (!c) return;
      if (hd === 'qid' || hd === 'item') r.qid = (c.match(/Q\d+/i) || [''])[0].toUpperCase();
      else if (hd === 'type') r.type = c.toLowerCase();
      else if (/^(label|desc|alias)_(ml|en)$/.test(hd)) r.meta[hd] = c;
      else if (hd === 'title_lang') lang.P1476 = c; else if (hd === 'subtitle_lang') lang.P1680 = c;
      else if (COLMAP[hd]) raw[COLMAP[hd]] = c;
    });
    F.forEach(function (f) {
      var c = raw[f.pid]; if (c == null) return;
      if (f.dt === 'item') r.vals[f.pid] = c.split('|').map(tok).filter(Boolean);
      else if (f.dt === 'mono') { r.vals[f.pid] = [c]; r.vals[f.pid + '_lang'] = lang[f.pid] || (ML.test(c) ? 'ml' : 'en'); }
      else r.vals[f.pid] = c.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    });
    rows.push(r);
  });
  return rows;
}

/* ---------- sample master file ---------- */
var SAMPLE_COLS = ['type', 'qid', 'title', 'title_lang', 'subtitle', 'subtitle_lang', 'author', 'editor', 'translator', 'language', 'country', 'work_qid', 'edition_qids',
  'inception', 'publication_date', 'form', 'movement', 'edition_number', 'place_of_publication', 'publisher', 'printer', 'collection', 'pages', 'commons_file',
  'wikisource_index', 'url', 'parts', 'isbn10', 'isbn13', 'oclc', 'openlibrary', 'topic', 'award', 'series', 'based_on', 'inspired_by', 'character', 'narrative_location',
  'label_ml', 'label_en', 'desc_ml', 'desc_en', 'alias_ml', 'alias_en'];
var SAMPLE_ROWS = [
  { type: 'work', title: 'പ്രേമലേഖനം', title_lang: 'ml', author: 'വൈക്കം മുഹമ്മദ് ബഷീർ', language: 'malayalam', country: 'india', publication_date: '1943', form: 'novel|fiction', label_en: 'Premalekhanam' },
  { type: 'edition', title: 'പ്രേമലേഖനം', title_lang: 'ml', author: 'വൈക്കം മുഹമ്മദ് ബഷീർ', language: 'malayalam', country: 'india', publication_date: '2001', edition_number: '5',
    place_of_publication: 'Kozhikode', publisher: 'SAMPLE Publishing House', pages: '64', isbn10: '81-264-1234-8', isbn13: '978-81-264-1234-1' }
];
function sampleCsv() { return [SAMPLE_COLS.join(',')].concat(SAMPLE_ROWS.map(function (r) { return SAMPLE_COLS.map(function (c) { return csvCell(r[c]); }).join(','); })).join('\r\n'); }

/* ================= UI ================= */
var S = { rows: [], i: -1, type: 'edition', qid: '', orig: null, vals: {}, ctl: {}, mctl: {}, el: {} };

mw.util.addCSS(
'.ge-ov{position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.45);display:flex;align-items:stretch;justify-content:center;font-size:14px}' +
'.ge-ov2{z-index:2100;align-items:center}.ge-box{background:#fff;color:#202122;width:min(1280px,98vw);margin:1vh 0;display:flex;flex-direction:column;border-radius:6px;overflow:hidden}' +
'.ge-small{width:min(560px,96vw);max-height:92vh;overflow:auto;padding:14px;margin:0}' +
'.ge-head{display:flex;gap:8px;align-items:center;padding:8px 12px;background:#36c;color:#fff}.ge-head small{opacity:.85}.ge-sp{flex:1}' +
'.ge-body{display:flex;gap:12px;overflow:auto;padding:10px;flex:1;flex-wrap:wrap}.ge-left{flex:3 1 560px;min-width:0}.ge-right{flex:1 1 300px;min-width:260px}' +
'.ge-row{display:flex;gap:8px;margin:5px 0;align-items:flex-start}.ge-lab{width:190px;flex:none;font-weight:600;font-size:12.5px}.ge-lab small{display:block;font-weight:400;color:#54595d}' +
'.ge-ctl{flex:1;min-width:0;position:relative}.ge-in{width:100%;box-sizing:border-box;padding:4px 6px;border:1px solid #a2a9b1;border-radius:2px}' +
'.ge-chip{display:inline-block;background:#eaf3ff;border:1px solid #9bbcf0;border-radius:12px;padding:1px 4px 1px 9px;margin:0 4px 3px 0}.ge-chip b{cursor:pointer;padding:0 5px;color:#b32424}' +
'.ge-un{background:#fff3cd;border-color:#e0b100;cursor:pointer}.ge-pre button,.ge-btn{margin:0 4px 3px 0;padding:2px 8px;border:1px solid #a2a9b1;border-radius:2px;background:#f8f9fa;cursor:pointer}' +
'.ge-pre button{font-size:11px;padding:0 6px}.ge-btn.p{background:#36c;color:#fff;border-color:#36c}.ge-btn.g{background:#14866d;color:#fff;border-color:#14866d}' +
'.ge-dd{position:absolute;z-index:5;left:0;right:0;background:#fff;border:1px solid #72777d;max-height:260px;overflow:auto;box-shadow:0 3px 8px rgba(0,0,0,.25)}' +
'.ge-ddi{padding:4px 8px;cursor:pointer;border-bottom:1px solid #eaecf0}.ge-ddi:hover{background:#eaf3ff}.ge-ddi small{color:#54595d}.ge-new{color:#14866d;font-weight:600}' +
'.ge-r{padding:3px 6px;margin:2px 0;border-left:4px solid #ccc;font-size:12.5px}.ge-r.e{border-color:#d33;background:#fee7e6}.ge-r.w{border-color:#fc3;background:#fef6e7}.ge-r.i{border-color:#36c;background:#eaf3ff}.ge-r.o{border-color:#14866d;background:#d5fdf4}' +
'.ge-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#202122;color:#fff;padding:8px 14px;border-radius:4px;z-index:3000;max-width:80vw}.ge-toast.ge-bad{background:#b32424}' +
'.ge-det{margin:8px 0;border-top:1px dashed #a2a9b1;padding-top:4px}.ge-ta{width:100%;height:70px;box-sizing:border-box;font-family:monospace}.ge-nav{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:6px 0}' +
'.ge-tbl{border-collapse:collapse;font-size:12px}.ge-tbl td,.ge-tbl th{border:1px solid #c8ccd1;padding:2px 5px;vertical-align:top}');

function setStatus(m) { S.el.status.textContent = m || ''; }
function fail(e) { console.error(e); toast('Error: ' + (e.message || e), true); setStatus(''); }

/* ----- item picker ----- */
function itemCtl(f) {
  var vals = [], box = h('div'), inp = h('input', { type: 'text', class: 'ge-in', placeholder: 'search by name (ml/en) or paste Q-id…' }), dd = h('div', { class: 'ge-dd', style: 'display:none' }), tm, el;
  function draw() {
    box.innerHTML = '';
    vals.forEach(function (x, ix) {
      var rm = h('b', { onclick: function (ev) { ev.stopPropagation(); vals.splice(ix, 1); draw(); } }, '×'), chip;
      if (x.id) chip = h('span', { class: 'ge-chip', title: L(x.id).desc || '' }, [h('a', { href: '/wiki/' + x.id, target: '_blank' }, (L(x.id).missing ? '⚠ ' : '') + (L(x.id).label || x.id) + ' (' + x.id + ')'), rm]);
      else chip = h('span', { class: 'ge-chip ge-un', title: 'Not linked – click to search', onclick: function () { vals.splice(ix, 1); draw(); inp.value = x.text; search(x.text); } }, [x.text, rm]);
      box.appendChild(chip);
    });
  }
  function add(id) { id = id.toUpperCase(); if (!vals.some(function (x) { return x.id === id; })) vals.push({ id: id }); draw(); ensureLabels([id]).then(draw); inp.value = ''; dd.style.display = 'none'; }
  function search(q) {
    q = q.trim(); if (!q) { dd.style.display = 'none'; return; }
    if (/^Q\d+$/i.test(q)) return add(q);
    Promise.all(['ml', 'en'].map(function (l) { return aget({ action: 'wbsearchentities', search: q, language: l, uselang: 'en', type: 'item', limit: 7 }).then(function (r) { return r.search || []; }, function () { return []; }); }))
      .then(function (rs) {
        var seen = {}, list = []; rs[0].concat(rs[1]).forEach(function (it) { if (!seen[it.id]) { seen[it.id] = 1; list.push(it); } });
        dd.innerHTML = '';
        list.forEach(function (it) { LC[it.id] = LC[it.id] || { label: it.label, desc: it.description }; dd.appendChild(h('div', { class: 'ge-ddi', onclick: function () { add(it.id); } }, [h('b', {}, it.label || it.id), ' ', h('small', {}, it.id + ' — ' + (it.description || ''))])); });
        if (!list.length) dd.appendChild(h('div', { class: 'ge-ddi' }, 'No match'));
        if (f.create) dd.appendChild(h('div', { class: 'ge-ddi ge-new', onclick: function () { dd.style.display = 'none'; openCreate(f.create, q, function (id) { add(id); }); } }, '＋ Create new item "' + q + '"'));
        dd.style.display = 'block';
      });
  }
  inp.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { search(inp.value); }, 350); });
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(tm); search(inp.value); } });
  var pre = h('div', { class: 'ge-pre' }, (f.pre || []).map(function (p) { return h('button', { type: 'button', title: p[0], onclick: function () { add(p[0]); LC[p[0]] = LC[p[0]] || { label: p[1] }; } }, '+ ' + p[1]); }));
  var extra = [];
  if (f.create) extra.push(h('button', { class: 'ge-btn', type: 'button', onclick: function () { openCreate(f.create, inp.value, function (id) { add(id); }); } }, '＋ new'));
  if (f.find) extra.push(h('button', { class: 'ge-btn', type: 'button', onclick: function () { findCounterpart(); } }, '🔎 find existing'));
  el = h('div', {}, [box, pre, h('div', { style: 'display:flex' }, [inp]), dd, extra]);
  return { el: el, get: function () { return vals; }, set: function (a) { vals = JSON.parse(JSON.stringify(a || [])); draw(); ensureLabels(vals.map(function (x) { return x.id; })).then(draw); } };
}
function monoCtl() {
  var t = h('input', { type: 'text', class: 'ge-in', style: 'width:75%' }), l = h('input', { type: 'text', class: 'ge-in', style: 'width:18%;margin-left:2%', list: 'ge-langs', placeholder: 'lang' });
  t.addEventListener('blur', function () { if (!l.value && t.value) l.value = ML.test(t.value) ? 'ml' : 'en'; });
  return { el: h('div', {}, [t, l]), get: function () { return { text: t.value.trim(), lang: l.value.trim().toLowerCase() }; }, set: function (v, lang) { t.value = (v && v[0]) || ''; l.value = lang || (t.value ? (ML.test(t.value) ? 'ml' : 'en') : ''); } };
}
function textCtl(f) {
  var i = h('input', { type: 'text', class: 'ge-in', placeholder: f.hint || (f.m ? 'use | between values' : '') });
  return { el: i, get: function () { return i.value.split('|').map(function (s) { return s.trim(); }).filter(Boolean); }, set: function (a) { i.value = (a || []).join('|'); } };
}
function makeCtl(f) { return f.dt === 'item' ? itemCtl(f) : f.dt === 'mono' ? monoCtl() : textCtl(f); }

function collect() {
  F.forEach(function (f) {
    var c = S.ctl[f.pid]; if (!c) return; var v = c.get();
    if (f.dt === 'mono') { S.vals[f.pid] = v.text ? [v.text] : []; S.vals[f.pid + '_lang'] = v.lang; } else S.vals[f.pid] = v;
  });
  S.vals.meta = S.vals.meta || {}; Object.keys(S.mctl).forEach(function (k) { S.vals.meta[k] = S.mctl[k].value; });
}
function setVal(pid, arr) { S.vals[pid] = arr; if (S.ctl[pid]) S.ctl[pid].set(arr); }

function fieldRow(f) {
  var c = makeCtl(f); S.ctl[f.pid] = c;
  if (f.dt === 'mono') c.set(S.vals[f.pid], S.vals[f.pid + '_lang']); else c.set(S.vals[f.pid]);
  return h('div', { class: 'ge-row' }, [h('div', { class: 'ge-lab' }, [h('a', { href: '/wiki/Property:' + f.pid, target: '_blank' }, f.pid), ' ' + f.name, f.hint ? h('small', {}, f.hint) : null]), h('div', { class: 'ge-ctl' }, c.el)]);
}
function renderForm() {
  var fm = S.el.form; fm.innerHTML = ''; S.ctl = {}; S.mctl = {};
  var main = [], extra = [];
  F.forEach(function (f) { if (applies(f, S.type)) (f.x ? extra : main).push(f); });
  main.forEach(function (f) { fm.appendChild(fieldRow(f)); });
  var det = h('details', { class: 'ge-det' }, [h('summary', {}, 'Optional fields (' + extra.length + ')')].concat(extra.map(fieldRow)));
  if (extra.some(function (f) { return (S.vals[f.pid] || []).length; })) det.open = true; fm.appendChild(det);
  var md = h('details', { class: 'ge-det' }, [h('summary', {}, 'Labels · descriptions · aliases (blank = auto-generated)'),
    h('div', {}, h('button', { class: 'ge-btn', type: 'button', onclick: autoFill }, '✨ Auto-fill descriptions'))]);
  ['label_ml', 'label_en', 'desc_ml', 'desc_en', 'alias_ml', 'alias_en'].forEach(function (k) {
    var i = h('input', { type: 'text', class: 'ge-in', value: (S.vals.meta || {})[k] || '', placeholder: k.indexOf('alias') === 0 ? 'several: a|b|c' : '' }); S.mctl[k] = i;
    md.appendChild(h('div', { class: 'ge-row' }, [h('div', { class: 'ge-lab' }, k.replace('_', ' ')), h('div', { class: 'ge-ctl' }, i)]));
  });
  fm.appendChild(md);
}
function autoFill() {
  collect(); var d = autoDescs(S.type, S.vals); if (d.en) S.mctl.desc_en.value = d.en; if (d.ml) S.mctl.desc_ml.value = d.ml;
  var tt = (S.vals.P1476 || [''])[0], tl = S.vals.P1476_lang; if (tt && tl && S.mctl['label_' + tl] && !S.mctl['label_' + tl].value) S.mctl['label_' + tl].value = tt;
  toast('Descriptions generated – review before saving');
}

/* ----- navigation ----- */
function renderNav() {
  var n = S.el.nav; n.innerHTML = '';
  if (!S.rows.length) return;
  var sel = h('select', { onchange: function () { loadRow(+sel.value); } }, S.rows.map(function (r, i) {
    var t = ((r.vals.P1476 || [''])[0]) || ''; return h('option', { value: i, selected: i === S.i }, (i + 1) + '. ' + (r.qid || '(new)') + ' ' + t.slice(0, 30) + (r.status ? ' ' + r.status : '')); }));
  var ts = h('select', { onchange: function () { collect(); S.type = ts.value; renderForm(); } }, [h('option', { value: 'edition', selected: S.type === 'edition' }, 'Edition item'), h('option', { value: 'work', selected: S.type === 'work' }, 'Work item')]);
  n.appendChild(h('button', { class: 'ge-btn', onclick: function () { go(-1); } }, '◀ Prev'));
  n.appendChild(sel); n.appendChild(h('button', { class: 'ge-btn', onclick: function () { go(1); } }, 'Next ▶'));
  n.appendChild(h('span', {}, 'Type:')); n.appendChild(ts);
  n.appendChild(S.qid ? h('a', { href: '/wiki/' + S.qid, target: '_blank' }, '🔗 ' + S.qid + (S.orig ? ' – ' + (L(S.qid).label || '') : '')) : h('i', {}, 'new item (not yet created)'));
}
function go(d) { var i = S.i + d; if (i >= 0 && i < S.rows.length) loadRow(i); }

async function loadRow(i) {
  try {
    if (S.i >= 0 && S.rows[S.i] && S.ctl.P1476) collect();
    S.i = i; var r = S.rows[i]; setStatus('Loading…'); S.qid = r.qid; S.orig = null; S.vals = {}; S.el.res.innerHTML = ''; S.el.info.innerHTML = '';
    if (r.qid) {
      var e = (await getEnts([r.qid], 'labels|descriptions|aliases|claims'))[r.qid];
      if (!e || e.missing !== undefined) { S.qid = ''; S.el.info.appendChild(h('div', { class: 'ge-r e' }, r.qid + ' does not exist.')); }
      else {
        S.orig = e; S.vals = entityToVals(e); var dt = detectType(e);
        if (dt) S.type = dt; else { S.type = r.type === 'work' ? 'work' : 'edition'; S.el.info.appendChild(h('div', { class: 'ge-r w' }, 'Could not detect type from P31 = ' + (p31(e).join(', ') || 'none') + '. Choose the type manually.')); }
        await ensureLabels(p31(e));
        S.el.info.appendChild(h('div', { class: 'ge-r i' }, 'Loaded ' + r.qid + ' · P31: ' + p31(e).map(function (q) { return (L(q).label || q) + ' (' + q + ')'; }).join(', ')));
      }
    } else S.type = r.type === 'work' ? 'work' : 'edition';
    var n = Object.keys(r.vals).length;
    Object.keys(r.vals).forEach(function (k) { S.vals[k] = JSON.parse(JSON.stringify(r.vals[k])); });
    if (r.qid && n) S.el.info.appendChild(h('div', { class: 'ge-r w' }, 'Sheet values (' + n + ' fields) applied over the existing item – review the diff before saving.'));
    if (r.type === 'both') S.el.info.appendChild(h('div', { class: 'ge-r i' }, 'Row marked “both”: use “Save + create linked work” to create both items.'));
    S.vals.meta = r.meta || {};
    var ids = []; Object.keys(S.vals).forEach(function (k) { if (Array.isArray(S.vals[k])) S.vals[k].forEach(function (x) { if (x && x.id) ids.push(x.id); }); });
    await ensureLabels(ids.concat(S.qid ? [S.qid] : []));
    renderNav(); renderForm(); setStatus('');
    if (S.orig) runValidation();
  } catch (e) { fail(e); }
}

/* ----- validation ----- */
async function validate(type, v, orig, qid) {
  var R = [], add = function (l, m) { R.push({ l: l, m: m }); };
  var g = function (p) { return (v[p] || []).filter(function (x) { return x && (x.id || x.text || (typeof x === 'string' && x.trim())); }); };
  var tt = (v.P1476 || [''])[0] || '', tl = v.P1476_lang;
  if (!tt.trim()) add('e', 'Title (P1476) is empty.');
  if (!tl) add('e', 'Title language code missing.'); else if (!/^[a-z]{2,3}(-[a-z0-9]+)*$/i.test(tl)) add('e', 'Invalid title language code “' + tl + '”.');
  else if (ML.test(tt) && tl !== 'ml') add('w', 'Title is Malayalam script but language code is “' + tl + '”.');
  if (g('P1680').length && !v.P1680_lang) add('e', 'Subtitle (P1680) needs a language code.');
  F.forEach(function (f) { if (f.dt === 'item' && applies(f, type)) g(f.pid).forEach(function (x) { if (!x.id) add('e', f.name + ' (' + f.pid + '): “' + x.text + '” is not linked – search it or use ＋ new.'); }); });
  if (!g('P50').length && !g('P98').length && !g('P655').length) add('w', 'No author (P50), editor (P98) or translator (P655).');
  if (!g('P407').length) add('w', 'Language (P407) missing.');
  var lm = { ml: Q.ml, en: Q.en };
  if (lm[tl] && g('P407').length && !g('P407').some(function (x) { return x.id === lm[tl]; })) add('w', 'P407 does not include the title language (' + tl + ').');
  if (!g('P495').length) add('w', 'Country of origin (P495) missing.');
  ['P571', 'P577'].forEach(function (p) {
    if (!applies(FB[p], type)) return;
    g(p).forEach(function (s) {
      if (!dateOk(s)) add('e', FB[p].name + ' (' + p + '): “' + s + '” is not YYYY / YYYY-MM / YYYY-MM-DD.');
      else if (+s.slice(0, 4) > new Date().getFullYear()) add('e', FB[p].name + ' is in the future.');
      else if (+s.slice(0, 4) < 1000) add('w', FB[p].name + ' year < 1000 – check.');
    });
  });
  var intOk = function (s) { return /^\d+$/.test(s) && +s > 0; };
  if (type === 'edition') {
    if (!g('P629').length) add('w', 'No work linked (P629) – use “Save + create linked work” or 🔎 find existing.');
    if (!g('P577').length) add('w', 'Publication date (P577) missing.');
    if (!g('P123').length) add('w', 'Publisher (P123) missing.');
    if (!g('P291').length) add('i', 'Place of publication (P291) missing.');
    g('P393').forEach(function (s) { if (!/^\d+$/.test(s)) add('w', 'Edition number “' + s + '” – use plain numbers (1, 2, 3).'); });
    ['P1104', 'P2635'].forEach(function (p) { g(p).forEach(function (s) { if (!intOk(s)) add('e', FB[p].name + ': “' + s + '” must be a positive whole number.'); }); });
    g('P957').forEach(function (s) { if (!isbn10ok(s)) add('e', 'ISBN-10 “' + s + '” fails checksum/format.'); else if (!/-/.test(s)) add('w', 'ISBN-10 should be written with hyphens.'); });
    g('P212').forEach(function (s) { if (!isbn13ok(s)) add('e', 'ISBN-13 “' + s + '” fails checksum/format.'); else if (!/-/.test(s)) add('w', 'ISBN-13 should be written with hyphens.'); });
    if (g('P957').length && g('P212').length && isbn10ok(g('P957')[0]) && isbn13ok(g('P212')[0]) && toIsbn13(g('P957')[0]).replace(/-/g, '') !== g('P212')[0].replace(/-/g, '')) add('e', 'ISBN-10 and ISBN-13 do not match each other.');
    if (g('P957').length && !g('P212').length && isbn10ok(g('P957')[0])) add('i', 'ISBN-13 can be derived: ' + toIsbn13(g('P957')[0]) + ' (use the “ISBN-10 → 13” button).');
    g('P243').forEach(function (s) { if (!/^\d+$/.test(s)) add('e', 'OCLC number must be digits only.'); });
    g('P648').forEach(function (s) { if (!/^OL\d+[MWA]$/.test(s)) add('e', 'Open Library ID “' + s + '” should look like OL123M / OL123W.'); });
    g('P953').concat(g('P1957')).forEach(function (s) { if (!/^https?:\/\/\S+$/.test(s)) add('e', 'URL “' + s + '” is not valid.'); });
    g('P1957').forEach(function (s) { if (!/wikisource\.org/.test(s)) add('w', 'P1957 should be a Wikisource URL.'); });
    g('P996').forEach(function (s) { if (!/\.(pdf|djvu|tiff?)$/i.test(s)) add('w', 'Commons file “' + s + '” usually is .pdf/.djvu/.tif.'); });
  } else {
    if (!g('P7937').length) add('w', 'Form of creative work (P7937) missing – e.g. novel, poetry.');
    if (!g('P747').length) add('i', 'No edition linked yet (P747).');
    if (g('P629').length) add('w', 'Work items should not carry P629.');
    if (g('P571').length && g('P577').length && g('P571')[0].slice(0, 4) > g('P577')[0].slice(0, 4)) add('w', 'Inception is later than publication date.');
  }
  // linked-item checks
  var ids = []; F.forEach(function (f) { if (f.dt === 'item' && applies(f, type)) g(f.pid).forEach(function (x) { if (x.id) ids.push(x.id); }); });
  var ents = await getEnts(ids, 'labels|descriptions|claims'), nm = function (i) { return (L(i).label || i) + ' (' + i + ')'; };
  g('P50').concat(g('P98'), g('P655')).forEach(function (x) { var e = ents[x.id]; if (e && e.missing === undefined && p31(e).indexOf(Q.human) < 0) add('w', nm(x.id) + ' is not an instance of human (Q5).'); });
  ids.forEach(function (i) { if (!ents[i] || ents[i].missing !== undefined) add('e', i + ' does not exist.'); });
  g('P629').forEach(function (x) {
    var e = ents[x.id]; if (!e || e.missing !== undefined) return;
    if (p31(e).indexOf(Q.work) < 0) add('e', 'P629 target ' + nm(x.id) + ' is not tagged written work (Q47461344).');
    if (qid && cids(e, 'P747').indexOf(qid) < 0) add('i', nm(x.id) + ' has no P747 back-link to this edition (will be added on save).');
    var wa = cids(e, 'P50'), ea = g('P50').map(function (z) { return z.id; });
    if (wa.length && ea.length && wa.slice().sort().join() !== ea.slice().sort().join()) add('w', 'Authors differ from the linked work ' + nm(x.id) + '.');
    var wy = ((e.claims.P577 || [])[0] || {}).mainsnak; wy = wy && wy.datavalue && fmtTime(wy.datavalue.value).slice(0, 4);
    if (wy && g('P577').length && g('P577')[0].slice(0, 4) < wy) add('w', 'Edition is dated before the work’s first publication (' + wy + ').');
  });
  g('P747').forEach(function (x) {
    var e = ents[x.id]; if (!e || e.missing !== undefined) return;
    if (p31(e).indexOf(Q.edition) < 0 && p31(e).indexOf(Q.translation) < 0) add('w', 'P747 target ' + nm(x.id) + ' is not an edition (Q3331189).');
    if (qid && cids(e, 'P629').indexOf(qid) < 0) add('i', nm(x.id) + ' has no P629 link to this work (will be added on save).');
  });
  if (!R.length) add('o', 'No problems found.');
  return R;
}
async function runValidation() {
  try {
    collect(); setStatus('Checking…'); var R = await validate(S.type, S.vals, S.orig, S.qid); S.lastR = R; setStatus('');
    var box = S.el.res; box.innerHTML = '';
    var c = { e: 0, w: 0, i: 0 }; R.forEach(function (r) { if (c[r.l] !== undefined) c[r.l]++; });
    box.appendChild(h('div', {}, h('b', {}, '❌ ' + c.e + '  ⚠ ' + c.w + '  ℹ ' + c.i)));
    R.sort(function (a, b) { return 'ewio'.indexOf(a.l) - 'ewio'.indexOf(b.l); }).forEach(function (r) { box.appendChild(h('div', { class: 'ge-r ' + r.l }, r.m)); });
    return R;
  } catch (e) { fail(e); return [{ l: 'e', m: 'check failed' }]; }
}

/* ----- find counterpart ----- */
async function findCounterpart() {
  try {
    collect(); var t = (S.vals.P1476 || [''])[0].trim(); if (!t) return toast('Enter a title first', true);
    setStatus('Searching…'); var want = S.type === 'edition' ? [Q.work] : [Q.edition, Q.translation], langs = uniq([S.vals.P1476_lang || 'ml', 'ml', 'en']);
    var rs = await Promise.all(langs.map(function (l) { return aget({ action: 'wbsearchentities', search: t, language: l, uselang: 'en', type: 'item', limit: 15 }).then(function (r) { return r.search || []; }, function () { return []; }); }));
    var ids = uniq([].concat.apply([], rs).map(function (x) { return x.id; })), ents = await getEnts(ids, 'labels|descriptions|claims'); setStatus('');
    var hit = ids.filter(function (i) { return ents[i] && ents[i].claims && p31(ents[i]).some(function (q) { return want.indexOf(q) > -1; }); });
    var box = S.el.res; box.innerHTML = ''; box.appendChild(h('b', {}, 'Existing ' + (S.type === 'edition' ? 'work' : 'edition') + ' items matching “' + t + '”:'));
    if (!hit.length) box.appendChild(h('div', { class: 'ge-r i' }, 'None found – safe to create a new one.'));
    hit.forEach(function (i) {
      var e = ents[i], au = cids(e, 'P50').map(function (q) { return L(q).label || q; }).join(', ');
      box.appendChild(h('div', { class: 'ge-r o' }, [h('a', { href: '/wiki/' + i, target: '_blank' }, (L(i).label || i) + ' (' + i + ')'), ' ' + (L(i).desc || '') + (au ? ' · ' + au : '') + ' ',
        h('button', { class: 'ge-btn', onclick: function () {
          if (S.type === 'edition') setVal('P629', [{ id: i }]); else setVal('P747', (S.vals.P747 || []).concat([{ id: i }]).filter(function (x, k, a) { return a.findIndex(function (y) { return y.id === x.id; }) === k; }));
          ensureLabels([i]).then(function () { S.ctl[S.type === 'edition' ? 'P629' : 'P747'].set(S.vals[S.type === 'edition' ? 'P629' : 'P747']); }); } }, 'Use')]));
    });
  } catch (e) { fail(e); }
}

/* ----- save ----- */
async function preflight(skipP629) {
  var R = await runValidation(), errs = R.filter(function (r) { return r.l === 'e'; });
  if (errs.length) { toast(errs.length + ' error(s) – fix them first.', true); return false; } return true;
}
function opts() { return { remove: S.el.optRemove.checked, over: S.el.optOver.checked }; }
async function afterSave(qid) {
  S.qid = qid; var e = (await getEnts([qid], 'labels|descriptions|aliases|claims'))[qid]; S.orig = e;
  var row = S.rows[S.i]; row.qid = qid; row.status = '✔'; S.el.log.appendChild(h('div', {}, [new Date().toLocaleTimeString() + ' ', h('a', { href: '/wiki/' + qid, target: '_blank' }, qid), ' ' + S.type + ' – ' + ((S.vals.P1476 || [''])[0])]));
  S.log = (S.log || []).concat([[S.i + 1, S.type, qid, (S.vals.P1476 || [''])[0]]]);
  renderNav();
}
async function crossLinks(qid) {
  var msgs = [];
  var jobs = S.type === 'edition' ? (S.vals.P629 || []).map(function (x) { return [x.id, 'P747']; }) : (S.vals.P747 || []).map(function (x) { return [x.id, 'P629']; });
  for (var k = 0; k < jobs.length; k++) {
    if (!jobs[k][0]) continue; var r = await ensureLink(jobs[k][0], jobs[k][1], qid);
    if (r === 'added') msgs.push('linked ' + jobs[k][0]); if (r === 'conflict') toast(jobs[k][0] + ' already points to a different work (P629) – left unchanged.', true);
  }
  return msgs;
}
async function doSave() {
  try {
    if (!(await preflight())) return;
    setStatus('Saving…'); var qid = await saveItem(S.type, S.vals, S.orig, S.qid, opts()); var m = await crossLinks(qid); await afterSave(qid); await runValidation();
    toast('Saved ' + qid + (m.length ? ' · ' + m.join(', ') : '')); setStatus('');
    if (S.el.optNext.checked) go(1);
  } catch (e) { fail(e); }
}
async function doSaveBoth() {
  try {
    collect();
    if (S.type === 'edition') {
      if ((S.vals.P629 || []).length) return toast('This edition already has a work (P629).', true);
      if (!(await preflight())) return;
      var wv = deriveWork(S.vals); await ensureLabels((wv.P50 || []).map(function (x) { return x.id; }));
      if (!confirm('Create a new WORK item first?\n\nTitle: ' + wv.P1476[0] + '\nDescription: ' + (autoDescs('work', wv).en || '') + '\nThen this edition will be saved and both cross-linked.')) return;
      setStatus('Creating work…'); var wq = await saveItem('work', wv, null, '', opts());
      S.vals.P629 = [{ id: wq }]; await ensureLabels([wq]); S.ctl.P629.set(S.vals.P629);
      var eq = await saveItem('edition', S.vals, S.orig, S.qid, opts()); await ensureLink(wq, 'P747', eq); await afterSave(eq);
      toast('Created work ' + wq + ' and saved edition ' + eq);
    } else {
      if (!(await preflight())) return;
      var ev = deriveEdition(S.vals, 'Q0');
      if (!confirm('Create a new EDITION item for this work?\n\nTitle: ' + ev.P1476[0] + (ev.P577 ? '\nPublication date copied: ' + ev.P577[0] : '') + '\nReview publisher/ISBN/pages afterwards.')) return;
      setStatus('Saving work…'); var wq2 = await saveItem('work', S.vals, S.orig, S.qid, opts()); await afterSave(wq2);
      var ev2 = deriveEdition(S.vals, wq2); var eq2 = await saveItem('edition', ev2, null, '', opts()); await ensureLink(wq2, 'P747', eq2);
      var ok2 = await getEnts([wq2], 'claims'); S.orig = ok2[wq2]; setVal('P747', (S.vals.P747 || []).concat([{ id: eq2 }])); await ensureLabels([eq2]); S.ctl.P747.set(S.vals.P747);
      toast('Saved work ' + wq2 + ' and created edition ' + eq2);
      S.el.log.appendChild(h('div', {}, [h('a', { href: '/wiki/' + eq2, target: '_blank' }, eq2), ' edition (generated)']));
    }
    setStatus(''); await runValidation();
  } catch (e) { fail(e); }
}

/* ----- create person / publisher / printer ----- */
function sel(opts_, val) { var s = h('select', {}, opts_.map(function (o) { return h('option', { value: o[0], selected: o[0] === val }, o[1]); })); return s; }
function openCreate(role, name, cb) {
  var ov = h('div', { class: 'ge-ov ge-ov2' }), box = h('div', { class: 'ge-box ge-small' }); ov.appendChild(box);
  var kind = sel([['author', 'Person – author'], ['editor', 'Person – editor'], ['translator', 'Person – translator'], ['publisher', 'Person – publisher'], ['printer', 'Person – printer'], ['house', 'Publishing house (organisation)'], ['press', 'Printing press (organisation)']], role);
  var ml = h('input', { class: 'ge-in', value: ML.test(name) ? name : '' }), en = h('input', { class: 'ge-in', value: ML.test(name) ? '' : name });
  var aml = h('input', { class: 'ge-in', placeholder: 'a|b' }), aen = h('input', { class: 'ge-in', placeholder: 'a|b' });
  var gender = sel([[Q.male, 'male'], [Q.female, 'female']], Q.male), ctry = sel([[Q.india, 'India'], [Q.raj, 'British Raj']], Q.india);
  var region = h('input', { class: 'ge-in', value: 'Kerala, India', list: 'ge-regions' });
  var dml = h('input', { class: 'ge-in' }), den = h('input', { class: 'ge-in' }), dup = h('div');
  var isOrg = function () { return kind.value === 'house' || kind.value === 'press'; };
  function refresh() { var d = descFor(kind.value, gender.value, region.value); den.value = d.en; dml.value = d.ml; gender.disabled = isOrg(); if (isOrg()) ctry.value = Q.india; }
  [kind, gender, region].forEach(function (c) { c.addEventListener('change', refresh); }); region.addEventListener('input', refresh); refresh();
  var row = function (l, c) { return h('div', { class: 'ge-row' }, [h('div', { class: 'ge-lab' }, l), h('div', { class: 'ge-ctl' }, c)]); };
  async function create() {
    try {
      var lab = {}, ds = {}, al = {}; if (ml.value.trim()) lab.ml = { language: 'ml', value: ml.value.trim() }; if (en.value.trim()) lab.en = { language: 'en', value: en.value.trim() };
      if (!Object.keys(lab).length) return toast('Give at least one label', true);
      if (dml.value.trim()) ds.ml = { language: 'ml', value: dml.value.trim() }; if (den.value.trim()) ds.en = { language: 'en', value: den.value.trim() };
      [['ml', aml], ['en', aen]].forEach(function (p) { var a = p[1].value.split('|').map(function (s) { return s.trim(); }).filter(Boolean); if (a.length) al[p[0]] = a.map(function (s) { return { language: p[0], value: s }; }); });
      var cl = [], P = function (pid, q) { return mkClaim({ pid: pid, dt: 'item' }, { id: q }); };
      if (isOrg()) { cl.push(P('P31', Q[kind.value])); cl.push(P('P17', ctry.value)); } else { cl.push(P('P31', Q.human)); cl.push(P('P21', gender.value)); cl.push(P('P27', ctry.value)); }
      var names = [en.value.trim(), ml.value.trim()].filter(Boolean), found = [];
      for (var k = 0; k < names.length; k++) { var r = await aget({ action: 'wbsearchentities', search: names[k], language: ML.test(names[k]) ? 'ml' : 'en', uselang: 'en', type: 'item', limit: 5 }); found = found.concat(r.search || []); }
      var ex = found.filter(function (x) { return names.indexOf(x.label) > -1; });
      if (ex.length && !confirm('Possible duplicates already exist:\n' + ex.map(function (x) { return x.id + ' – ' + x.label + ' – ' + (x.description || ''); }).join('\n') + '\n\nCreate a new item anyway?')) return;
      var r2 = await apost({ action: 'wbeditentity', new: 'item', data: JSON.stringify({ labels: lab, descriptions: ds, aliases: al, claims: cl }), summary: 'Creating ' + kind.value + ' item: ' + names[0] + SUF });
      toast('Created ' + r2.entity.id); LC[r2.entity.id] = { label: en.value.trim() || ml.value.trim(), ml: ml.value.trim(), en: en.value.trim(), desc: den.value }; ov.remove(); cb(r2.entity.id);
    } catch (e) { fail(e); }
  }
  box.appendChild(h('h3', {}, 'Create new item'));
  [row('Type', kind), row('Label (ml)', ml), row('Label (en)', en), row('Also known as (ml)', aml), row('Also known as (en)', aen), row('Gender (P21)', gender), row('Citizenship / country', ctry), row('Region', region),
   row('Description (ml)', dml), row('Description (en)', den)].forEach(function (r) { box.appendChild(r); });
  box.appendChild(h('div', {}, [h('button', { class: 'ge-btn g', onclick: create }, 'Create item'), h('button', { class: 'ge-btn', onclick: function () { ov.remove(); } }, 'Cancel')]));
  document.body.appendChild(ov);
}

/* ----- batch quality report ----- */
async function batchQC() {
  var rows = S.rows.filter(function (r) { return r.qid; }); if (!rows.length) return toast('No QIDs in the loaded rows.', true);
  var ov = h('div', { class: 'ge-ov ge-ov2' }), box = h('div', { class: 'ge-box ge-small', style: 'width:min(1000px,96vw)' }), tb = h('tbody'), prog = h('div'), out = [['qid', 'type', 'label', 'errors', 'warnings', 'details']];
  box.appendChild(h('h3', {}, 'Batch quality report')); box.appendChild(prog); box.appendChild(h('table', { class: 'ge-tbl' }, [h('thead', {}, h('tr', {}, ['QID', 'Type', 'Label', '❌', '⚠', 'Details'].map(function (x) { return h('th', {}, x); }))), tb]));
  box.appendChild(h('p', {}, [h('button', { class: 'ge-btn', onclick: function () { dl('grandham-qc-report.csv', out.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n')); } }, '⬇ Download CSV'), h('button', { class: 'ge-btn', onclick: function () { ov.remove(); } }, 'Close')]));
  document.body.appendChild(ov); ov.appendChild(box);
  for (var i = 0; i < rows.length; i++) {
    prog.textContent = 'Checking ' + (i + 1) + ' / ' + rows.length + '…';
    try {
      var e = (await getEnts([rows[i].qid], 'labels|descriptions|claims'))[rows[i].qid], type, R;
      if (!e || e.missing !== undefined) R = [{ l: 'e', m: 'Item does not exist' }], type = '?';
      else { type = detectType(e); if (!type) { R = [{ l: 'e', m: 'Cannot detect type; P31 = ' + p31(e).join(',') }]; type = '?'; } else { var v = entityToVals(e); await ensureLabels(p31(e)); R = await validate(type, v, e, rows[i].qid); } }
      var er = R.filter(function (r) { return r.l === 'e'; }), wr = R.filter(function (r) { return r.l === 'w'; }), det = R.filter(function (r) { return r.l !== 'o'; }).map(function (r) { return r.m; }).join(' ¦ ');
      tb.appendChild(h('tr', {}, [h('td', {}, h('a', { href: '/wiki/' + rows[i].qid, target: '_blank' }, rows[i].qid)), h('td', {}, type), h('td', {}, L(rows[i].qid).label || ''), h('td', {}, String(er.length)), h('td', {}, String(wr.length)), h('td', {}, det || '✔')]));
      out.push([rows[i].qid, type, L(rows[i].qid).label || '', er.length, wr.length, det]);
    } catch (x) { tb.appendChild(h('tr', {}, h('td', { colspan: 6 }, rows[i].qid + ': ' + x.message))); }
  }
  prog.textContent = 'Done – ' + rows.length + ' item(s) checked.';
}

/* ----- main panel ----- */
function buildUI() {
  var dl_ = h('datalist', { id: 'ge-langs' }, ['ml', 'en', 'sa', 'ta', 'hi', 'kn', 'te', 'ar', 'fr', 'de'].map(function (x) { return h('option', { value: x }); }));
  var rg = h('datalist', { id: 'ge-regions' }, Object.keys(REG).map(function (x) { return h('option', { value: x }); }));
  var ta = h('textarea', { class: 'ge-ta', placeholder: 'Paste a list of QIDs (one per line) or a CSV/TSV with a header row…' });
  var file = h('input', { type: 'file', accept: '.csv,.tsv,.txt', onchange: function () { var f = file.files[0]; if (!f) return; var fr = new FileReader(); fr.onload = function () { ta.value = fr.result; load(); }; fr.readAsText(f, 'UTF-8'); } });
  function load() { try { S.rows = ingest(ta.value); S.i = -1; toast(S.rows.length + ' row(s) loaded'); loadRow(0); } catch (e) { fail(e); } }
  function newItem(type) { S.rows = [{ qid: '', type: type, vals: {}, meta: {}, status: '' }]; S.i = -1; loadRow(0); }
  S.el.status = h('span', { style: 'margin-left:8px;color:#b32424' }); S.el.nav = h('div', { class: 'ge-nav' }); S.el.info = h('div'); S.el.form = h('div'); S.el.res = h('div'); S.el.log = h('div');
  S.el.optRemove = h('input', { type: 'checkbox' }); S.el.optOver = h('input', { type: 'checkbox' }); S.el.optNext = h('input', { type: 'checkbox' });
  var load_ = h('details', { open: true, class: 'ge-det' }, [h('summary', {}, '1 · Input (QID list or CSV/TSV master sheet)'), ta, h('div', {}, [file,
    h('button', { class: 'ge-btn p', onclick: load }, 'Load rows'), h('button', { class: 'ge-btn', onclick: function () { newItem('work'); } }, '＋ blank work'), h('button', { class: 'ge-btn', onclick: function () { newItem('edition'); } }, '＋ blank edition'),
    h('button', { class: 'ge-btn', onclick: function () { dl('grandham-master-sample.csv', sampleCsv()); } }, '⬇ sample master CSV'), h('button', { class: 'ge-btn', onclick: batchQC }, '🧪 batch QC of all QIDs')])]);
  var acts = h('div', {}, [h('b', {}, 'Actions'), h('div', {}, [
    h('button', { class: 'ge-btn', onclick: runValidation }, '✔ Validate'), h('button', { class: 'ge-btn p', onclick: doSave }, '💾 Save to Wikidata'),
    h('button', { class: 'ge-btn g', onclick: doSaveBoth }, '⇄ Save + create linked counterpart'), h('button', { class: 'ge-btn', onclick: findCounterpart }, '🔎 Find existing work/edition'),
    h('button', { class: 'ge-btn', onclick: function () { collect(); var a = (S.vals.P957 || [])[0]; if (a && isbn10ok(a)) { setVal('P212', [toIsbn13(a)]); } else toast('Enter a valid ISBN-10 first', true); } }, 'ISBN-10 → 13'),
    h('button', { class: 'ge-btn', onclick: function () { dl('grandham-session-log.csv', ['row,type,qid,title'].concat((S.log || []).map(function (r) { return r.map(csvCell).join(','); })).join('\r\n')); } }, '⬇ session log')]),
    h('label', {}, [S.el.optRemove, ' remove values missing from form']), h('br'), h('label', {}, [S.el.optOver, ' overwrite existing labels/descriptions']), h('br'), h('label', {}, [S.el.optNext, ' auto-advance after save'])]);
  var box = h('div', { class: 'ge-box' }, [
    h('div', { class: 'ge-head' }, [h('b', {}, '📚 Grandham Editor'), h('small', {}, 'WikiProject Books · Sahya Digital Conservation Foundation · Wiki Librarians Network'), h('span', { class: 'ge-sp' }), S.el.status, h('button', { onclick: function () { S.el.ov.style.display = 'none'; } }, '✕ Close')]),
    h('div', { class: 'ge-body' }, [h('div', { class: 'ge-left' }, [load_, S.el.nav, S.el.info, S.el.form]), h('div', { class: 'ge-right' }, [acts, h('hr'), h('b', {}, 'Quality check'), S.el.res, h('hr'), h('b', {}, 'Saved this session'), S.el.log])])]);
  S.el.ov = h('div', { class: 'ge-ov', style: 'display:none' }, box); document.body.appendChild(S.el.ov); document.body.appendChild(dl_); document.body.appendChild(rg);
}
function openEditor(qid) {
  if (!S.el.ov) buildUI(); S.el.ov.style.display = 'flex';
  if (qid) { S.rows = [{ qid: qid, type: '', vals: {}, meta: {}, status: '' }]; S.i = -1; loadRow(0); }
}
mw.util.addPortletLink('p-tb', '#', 'Grandham Editor', 't-grandham', 'Open Grandham Book Editor (#mlwsBookEditor)').addEventListener('click', function (e) {
  e.preventDefault(); var pn = mw.config.get('wgPageName'); openEditor(/^Q\d+$/.test(pn) ? pn : null);
});
});

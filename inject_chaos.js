'use strict';
// INJECTION CHAOS — the block that reaches the storyteller, hammered.
//
// chaos_test.js fuzzes the STORE: the journal, the ledger page, the snippet
// layers, the pointers. It does not touch the other half of the system — the
// functions that turn all of that into the text actually injected into the chat
// context on EVERY generation, reading the same settings that chaos punches to
// 0 / -1 / NaN / Infinity / null / '' / [] / {}. That was a coverage hole in a
// hot path: a card that blows its cap eats the context budget, a poisoned
// string writes the literal word "undefined" into the story's memory, and a
// record-only leak hands the model a spec for the character the PLAYER controls.
//
//   node inject_chaos.js
//   INJ_RUNS=20000 node inject_chaos.js       # longer soak
//   INJ_SEED=123   node inject_chaos.js       # reproduce a reported failure
//
// Deterministic: a failure prints the seed that produced it.

const fs = require('fs');
const src = fs.readFileSync(__dirname + '/index.js', 'utf8');
const lines = src.split('\n');

function extractTopLevel(name) {
    const headerRe = new RegExp('^(?:async function|function|const|let|var)\\s+' + name + '\\b');
    let start = -1;
    for (let i = 0; i < lines.length; i++) if (headerRe.test(lines[i])) { start = i; break; }
    if (start === -1) throw new Error('Could not find declaration: ' + name);
    const stopRe = /^(?:async function|function|const|let|var)\s+\w|^\/\//;
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) if (stopRe.test(lines[i])) { end = i; break; }
    return lines.slice(start, end).join('\n');
}

// The dependency closure of the five entry points under test.
const NAMES = [
    '_ESC_RE', '_escapeRegex', '_LEDGER_LABEL_RE', 'stripLeadingLabel', '_lev', '_normName',
    'resolveLedgerKey', 'escapeHtml', 'subst', 'getAssistantTurns', 'buildPassageFromRange',
    'stripMetaBlocks', '_ambiguousTokens', '_characterWeight', 'characterAliases',
    'wordPresentInText', '_parsePresenceMarkers', '_stripPresenceNoise',
    '_personaSplit', 'resolveMcName', '_arbiterMcName', 'isMcLedgerKey',
    'getLedgerPins', '_selectRoster', '_composeRoster', 'computeLedgerCast',
    'formatLedgerEntry', 'buildCharacterBlock', 'serializeLedgerForScribe',
    'buildMemoryDump', '_FB_STOP', '_fbTokens', '_fbScore', '_fbDateLabel', 'buildFlashbackBlock',
];

const _dsI = src.indexOf('const defaultSettings');
let _dsB = src.indexOf('{', _dsI), _dsD = 0, _dsJ = _dsB;
for (;; _dsJ++) {
    if (src[_dsJ] === '{') _dsD++;
    else if (src[_dsJ] === '}') _dsD--;
    if (_dsD === 0) break;
}
let _dsEnd = _dsJ + 1;
while (_dsEnd < src.length && src[_dsEnd] !== ';') _dsEnd++;
const DEFAULTS_SRC = src.slice(_dsI, _dsEnd + 1) + '\n';
if (!/^const defaultSettings/.test(DEFAULTS_SRC) || !/\)\s*;\s*$/.test(DEFAULTS_SRC.trim())) {
    throw new Error('could not extract defaultSettings cleanly');
}

const body = NAMES.map(extractTopLevel).join('\n\n');
const sandbox = DEFAULTS_SRC + `
let __settings = {}, __store = { ledger: {} }, __chat = [], _rosterTick = 0;
function getSettings(){ return __settings; }
function getChatStore(){ return __store; }
function log(){}
const document = { createElement(){ let _v=''; return { set textContent(x){ _v=String(x); }, get innerHTML(){ return _v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); } }; } };
const SillyTavern = { getContext(){ return { chat: __chat, name1: __settings.__name1 }; } };
${body}
return {
  __setSettings:(v)=>{ __settings=v; }, __setStore:(v)=>{ __store=v; }, __setChat:(v)=>{ __chat=v; },
  formatLedgerEntry, computeLedgerCast, buildCharacterBlock, buildFlashbackBlock, serializeLedgerForScribe,
};
`;
const L = new Function(sandbox)();

// ── deterministic RNG ────────────────────────────────────────────────────────
let SEED = Number(process.env.INJ_SEED || (Math.random() * 4294967295 >>> 0));
const SEED0 = SEED;
let seed = SEED;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function pick(a) { return a[ri(0, a.length - 1)]; }

const ABSURD = [0, -1, 1, NaN, Infinity, -Infinity, null, undefined, '', '5', [], {}, 1e9, 0.5];
const NUM_KEYS = ['ledgerMaxActive', 'ledgerActiveWindow', 'ledgerMaxCharsPerChar', 'ledgerRosterMax',
    'ledgerMentionMax', 'ledgerMentionWindow', 'verbatimTurns', 'flashbackMaxChars',
    'flashbackMinScore', 'flashbackMaxScenes', 'ledgerCompactMaxChars'];
const BOOL_KEYS = ['ledgerEnabled', 'ledgerInjectRoster', 'ledgerRosterRotate', 'ledgerMcRecordOnly',
    'flashbackEnabled', 'injectLedger', 'ledgerShowThreads'];

function punched() {
    const s = {};
    for (const k of NUM_KEYS) s[k] = pick(ABSURD);
    for (const k of BOOL_KEYS) s[k] = pick([true, false, null, undefined, 0, 1, 'yes']);
    // keep the bodies REACHABLE most of the time — a suite that mostly exercises
    // early returns proves nothing about the code that actually runs.
    if (rnd() < 0.85) { s.ledgerEnabled = true; s.injectLedger = true; }
    if (rnd() < 0.85) s.flashbackEnabled = true;
    s.__name1 = pick(['LO', 'Jovan', 'User', '', null]);
    return s;
}

const NAMES_POOL = ['Claire', 'Jovan Argent', "O'Brien", 'Silas', 'Stella Vance', 'Renn'];
function makeLedger() {
    const led = {};
    for (let i = 0, n = ri(0, NAMES_POOL.length); i < n; i++) {
        led[NAMES_POOL[i]] = {
            core:    rnd() < 0.8 ? 'guarded and clipped under pressure '.repeat(ri(1, 40)) : pick([null, '', undefined, 123, {}]),
            state:   rnd() < 0.8 ? 'standing in the rain furious '.repeat(ri(1, 30))      : pick([null, '', undefined, []]),
            arc:     rnd() < 0.7 ? 'trust rebuilding after the docks '.repeat(ri(1, 25))  : pick([null, '', undefined]),
            threads: rnd() < 0.7 ? Array.from({ length: ri(0, 6) }, (_, j) => 'open thread ' + j) : pick([null, 'notarray', [], undefined, [null, '', 5]]),
            updatedAt: pick([Date.now(), 0, NaN, null, undefined, -5]),
        };
    }
    return led;
}
function makeChat(len) { const o = []; for (let i = 0; i < len; i++) o.push({ is_user: i % 2 === 0, is_system: false, name: i % 2 === 0 ? 'LO' : 'Claire', mes: rnd() < 0.9 ? ('turn ' + i + ' Claire looked at Jovan Argent. ').repeat(ri(1, 5)) : pick(['', null, undefined]), extra: {} }); return o; }

// A literal "undefined" / "NaN" / "[object Object]" in the injected block is
// memory corruption the user can read in their own story.
const POISON = /\bundefined\b|\bNaN\b|\[object Object\]/;

const findings = [];
function note(what, detail) {
    const key = what + ' :: ' + detail;
    if (!findings.some(f => f.key === key)) findings.push({ key, what, detail });
}

const RUNS = Number(process.env.INJ_RUNS || 4000);
const cov = { card: 0, cast: 0, block: 0, flashback: 0, scribe: 0 };

for (let iter = 0; iter < RUNS; iter++) {
    const s = punched();
    const led = makeLedger();
    const chat = makeChat(ri(0, 30));
    const layers = [[], [], []];
    let t = 0;
    while (t < chat.length && rnd() < 0.85) {
        const a = t, b = Math.min(chat.length - 1, t + ri(1, 4));
        layers[0].push({
            text: 'Claire confronted Jovan Argent about the ledger ' + a,
            turnRange: pick([[a, b], [a, b], null, [b, a], [-1, b], [a, 1e9]]),
            detail: rnd() < 0.4 ? 'detail ' + a : undefined,
        });
        t = b + 1;
    }
    if (layers[0].length > 2 && rnd() < 0.4) {
        const moved = layers[0].splice(0, ri(1, 2));
        layers[1].push({ text: 'meta summary', turnRange: moved[0].turnRange });
    }
    L.__setSettings(s);
    L.__setStore({ ledger: led, layers, ledgerPins: pick([[], ['Claire'], null, undefined]) });
    L.__setChat(chat);

    for (const nm of Object.keys(led)) {
        // ── the card itself ──
        let out;
        try { out = L.formatLedgerEntry(nm, led[nm], pick(ABSURD)); }
        catch (e) { note('formatLedgerEntry THREW', e.message); continue; }
        if (out != null && typeof out !== 'string') { note('formatLedgerEntry returned a non-string', typeof out); continue; }
        if (typeof out === 'string' && out) {
            cov.card++;
            if (POISON.test(out)) note('formatLedgerEntry POISONED the card', out.match(POISON)[0] + ' | ' + out.slice(0, 90));
        }

        // ── the cap is a budget, not a suggestion ──
        for (const cap of [80, 200, 1000, 0, -1, NaN, Infinity, null, undefined, '']) {
            let c;
            try { c = L.formatLedgerEntry(nm, led[nm], cap); }
            catch (e) { note('formatLedgerEntry THREW on a punched cap', String(cap) + ' :: ' + e.message); continue; }
            if (typeof c !== 'string') continue;
            const numeric = (typeof cap === 'number' && isFinite(cap) && cap > 0);
            if (numeric && c.length > cap + 200) note('formatLedgerEntry BLEW its cap', 'cap=' + cap + ' got=' + c.length);
            if (!numeric && c.length > 200000) note('formatLedgerEntry unbounded on a non-numeric cap', 'cap=' + String(cap) + ' got=' + c.length);
        }

        // ── THE PLAYER-CHARACTER LAW ──
        // record-only carries state/threads ONLY. Nature and Arc are the player's
        // to write; a spec for them is a script for choices the model does not own.
        let ro;
        try { ro = L.formatLedgerEntry(nm, led[nm], 100000, true); }
        catch (e) { note('formatLedgerEntry THREW in record-only mode', e.message); continue; }
        if (typeof ro === 'string' && ro) {
            const core = (typeof led[nm].core === 'string') ? led[nm].core.trim() : '';
            const arc = (typeof led[nm].arc === 'string') ? led[nm].arc.trim() : '';
            if (core.length > 12 && ro.includes(core.slice(0, 12))) note("record-only card LEAKED the player character's core", ro.slice(0, 120));
            if (arc.length > 12 && ro.includes(arc.slice(0, 12))) note("record-only card LEAKED the player character's arc", ro.slice(0, 120));
        }
    }

    // ── who gets injected ──
    let cast;
    try { cast = L.computeLedgerCast(led, s, 'claire looked at jovan argent', [], ri(0, 5), chat.map(m => String(m.mes || '').toLowerCase())); }
    catch (e) { note('computeLedgerCast THREW', e.message); }
    if (cast) {
        if (!Array.isArray(cast.shown)) note('computeLedgerCast .shown is not an array', typeof cast.shown);
        else {
            if (cast.shown.length) cov.cast++;
            const seen = new Set();
            for (const x of cast.shown) {
                const n = x && x.name;
                if (n && seen.has(n)) note('computeLedgerCast listed the same character twice on screen', n);
                if (n) seen.add(n);
            }
            if (Array.isArray(cast.roster)) {
                for (const r of cast.roster) {
                    const n = (r && r.name) ? r.name : r;
                    if (n && seen.has(n)) note('a character is BOTH on-screen and in the roster', String(n));
                }
            }
        }
    }

    // ── what actually reaches the model ──
    let blk;
    try { blk = L.buildCharacterBlock(); }
    catch (e) { note('buildCharacterBlock THREW', e.message); }
    if (blk !== undefined) {
        if (typeof blk !== 'string') note('buildCharacterBlock returned a non-string', typeof blk);
        else if (blk) {
            cov.block++;
            if (POISON.test(blk)) note('buildCharacterBlock POISONED the context', blk.match(POISON)[0] + ' | ' + blk.slice(0, 110));
            for (const nm of Object.keys(led)) {
                const hits = blk.split('\n').filter(l => { const q = l.trim(); return q.startsWith(nm + ':') || q.startsWith(nm + ' \u2014'); }).length;
                if (hits > 1) note('a character appears TWICE in the injected block', nm + ' x' + hits);
            }
        }
    }

    let fb;
    try { fb = L.buildFlashbackBlock(); }
    catch (e) { note('buildFlashbackBlock THREW', e.message); }
    if (typeof fb === 'string' && fb) {
        cov.flashback++;
        if (POISON.test(fb)) note('buildFlashbackBlock POISONED the context', fb.match(POISON)[0] + ' | ' + fb.slice(0, 110));
    }

    let ser;
    try { ser = L.serializeLedgerForScribe(led, pick(ABSURD)); }
    catch (e) { note('serializeLedgerForScribe THREW', e.message); }
    if (typeof ser === 'string' && ser.length > 30) {
        cov.scribe++;
        if (POISON.test(ser)) note('serializeLedgerForScribe POISONED the scribe context', ser.match(POISON)[0] + ' | ' + ser.slice(0, 110));
    }
}

console.log(`\nseed ${SEED0} — ${RUNS} randomised injection assemblies`);
console.log(`exercised: ${cov.card} cards, ${cov.cast} casts, ${cov.block} character blocks, ${cov.flashback} flashbacks, ${cov.scribe} scribe dumps`);
// A suite that mostly hits early returns proves nothing about the code that runs.
const thin = [];
if (cov.card < RUNS * 0.5) thin.push('cards');
if (cov.block < RUNS * 0.2) thin.push('character blocks');
if (cov.flashback < RUNS * 0.02) thin.push('flashbacks');
if (cov.scribe < RUNS * 0.5) thin.push('scribe dumps');
if (thin.length) {
    console.log(`\nCOVERAGE TOO THIN (${thin.join(', ')}) — the run mostly hit early returns and proves nothing.`);
    process.exit(1);
}
if (findings.length) {
    console.log(`\nFINDINGS (${findings.length} distinct) — reproduce with INJ_SEED=${SEED0}:\n`);
    for (const f of findings) console.log('  \u2022 ' + f.what + '\n      ' + f.detail + '\n');
    process.exit(1);
}
console.log(`
Invariants held through every randomised assembly:
  \u2022 no assembly function throws on any punched setting
  \u2022 no card, block, flashback or scribe dump contains "undefined" / "NaN" / "[object Object]"
  \u2022 a per-character cap is a budget, not a suggestion
  \u2022 THE PLAYER'S CHARACTER IS A RECORD: record-only cards never carry core or arc
  \u2022 nobody is listed twice, and nobody is both on screen and in the roster`);
console.log('INJECTION CHAOS PASSED \u2713');

'use strict';
// Proof harness for the Character Ledger. Extracts the REAL functions from
// index.js (line-based top-level extraction — no reimplementation) and exercises
// them with stubs for getSettings/getChatStore/SillyTavern. Fails loudly.

const fs = require('fs');
const src = fs.readFileSync(__dirname + '/index.js', 'utf8');
const lines = src.split('\n');

// Extract a top-level `function NAME(` or `const NAME` declaration by grabbing
// lines from its header until the next top-level declaration/comment. All target
// functions are column-0 declarations separated by comments, so this sidesteps
// brace/regex/template-literal counting entirely.
function extractTopLevel(name) {
    const headerRe = new RegExp('^(?:async function|function|const|let|var)\\s+' + name + '\\b');
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
        if (headerRe.test(lines[i])) { start = i; break; }
    }
    if (start === -1) throw new Error('Could not find declaration: ' + name);
    const stopRe = /^(?:async function|function|const|let|var)\s+\w|^\/\//;
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
        if (stopRe.test(lines[i])) { end = i; break; }
    }
    return lines.slice(start, end).join('\n');
}

const SRC_FULL = require('fs').readFileSync(__dirname + '/index.js', 'utf8');
const names = ['stripMetaBlocks', 'buildPassageFromRange', '_ledgerDroppingPast', '_editRewindDecision', '_ledgerMissingCore', '_missingCoreNotice', '_synthesizeCheckpoint', 'computeLedgerCast', 'reindexAfterDeletion', '_computeLiveLedgerRange', '_NOTES_SOFT_CAP', '_NOTES_KEEP_TAIL', '_NOTES_CANON_V', '_journalNow', '_canonNotesAgainst', '_canonicalizeLedgerNotes', 'foldLedgerNotes', 'ledgerHistoryFor', '_histOpen', '_historyHtml', 'escapeHtml', 'notesCover', 'ensureLedgerNotes', 'wipeLedgerData', 'appendLedgerNotes', 'rewindLedgerFromNotes', 'compactLedgerNotes', 'stripLeadingLabel', '_ledgerAuditTargets', '_pickEvidenceIndices', 'buildLedgerAuditEvidence', '_ambiguousTokens', '_characterWeight', '_ESC_RE', '_escapeRegex', 'characterAliases', 'wordPresentInText', '_parsePresenceMarkers', '_stripPresenceNoise', '_FB_STOP', '_fbTokens', '_fbScore', '_fbDateLabel', 'buildFlashbackBlock', 'buildMemoryDump', 'getAssistantTurns', '_arcTrajectory', '_arcSnapScore', '_arcRegressionCandidates', '_arcHistoryPacket', '_shrinkVerdict', '_stashSources', 'subst', '_personaSplit', '_identityNote', '_healPersonaEntry', '_arbiterMcName', 'resolveMcName', '_acceptLearnedMc', 'isMcLedgerKey', '_renameEvidence', '_renameLedgerKeySpace', 'renameLedgerCharacter',
    'formatLedgerEntry', 'buildCharacterBlock', 'serializeLedgerForScribe', '_noteLabel',
    'resolveLedgerKey', '_LEDGER_LABEL_RE', 'stripLeadingLabel', 'mergeLedgerDeltas', 'subst', '_storeHasContent', '_computeLiveLedgerRange', '_selectRoster', '_composeRoster', 'getLedgerPins', '_pickCheckpoint', '_computeReplayChunks', '_selectCheckpointKeeps', '_contiguousRanges', '_selectStorageEvictions',
    'normalizeContinuityOutput', '_continuitySig', 'mergeContinuityFlags', 'reconcileSnippetFlags', '_findSnippetByTurnRange', '_findSnippetsCovering', '_baseNotesFromPage', 'adoptExternalLedgerEdits', '_notesFromDeltas', '_swapStagedLedgerIn', '_pinNeedle', '_findPinSource', '_pinAlive', '_syncNotepadUi', '_lastAssistantAt', '_tpMark', 'buildTransplantExport', 'parseTransplant', 'storeFieldsFromTransplant', '_exportTailBatches', '_locateSnippetForOp', '_applyInverseOp', '_lev', '_normName',
    'truncateLedgerToTurn', 'clampStoreToLength',
    'RETRY_CONFIG', 'isRetryableError', '_tpThreads',
    'recomputeSummarizedUpTo', '_snipSig', '_resolveSnipRow',
    '_selectNudgeFlags', '_fixVerdict', '_turnHasCoverage', '_uncoveredTurnsIn', '_ckptDue',
    '_turnSig', '_CKPT_DRIFT_WINDOW', '_relocateCheckpoint'];

const body = names.map(extractTopLevel).join('\n\n');

// v5.109.0: the extracted functions now read defaults from ONE place
// (defaultSettings) instead of copying the literals inline, so the sandbox must
// supply the REAL object from index.js — a stub here would prove nothing.
const _dsI = src.indexOf('const defaultSettings');
let _dsB = src.indexOf('{', _dsI), _dsD = 0, _dsJ = _dsB;
for (;; _dsJ++) {
    if (src[_dsJ] === '{') _dsD++;
    else if (src[_dsJ] === '}') _dsD--;
    if (_dsD === 0) break;
}
// The declaration is `Object.freeze({...})`, so brace-matching stops one char
// short of the closing paren — walk to the real statement terminator.
let _dsEnd = _dsJ + 1;
while (_dsEnd < src.length && src[_dsEnd] !== ';') _dsEnd++;
const DEFAULTS_SRC = src.slice(_dsI, _dsEnd + 1) + '\n';
if (!/^const defaultSettings/.test(DEFAULTS_SRC) || !/\)\s*;\s*$/.test(DEFAULTS_SRC.trim() + '')) {
    throw new Error('could not extract defaultSettings cleanly');
}

const sandbox = DEFAULTS_SRC + `
let __settings = {};
let __store = { ledger: {} };
let __chat = [];
let _rosterTick = 0;
function getSettings(){ return __settings; }
function getChatStore(){ return __store; }
function log(){}
class ConnectionError extends Error {
  constructor(message, { retryable = false, status = null } = {}) { super(message); this.name = 'ConnectionError'; this.retryable = retryable; this.status = status; }
}
const document = { createElement(){ let _v = ''; return { set textContent(x){ _v = String(x); }, get innerHTML(){ return _v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); } }; } };
function toastr_noop(){}
let __ctxExtra = {};
const SillyTavern = { getContext(){ return Object.assign({ chat: __chat }, __ctxExtra); } };
function setCtxExtra(o){ __ctxExtra = o || {}; }
let __dom = {};   // selector -> { val, text, present }
function __resetDom(present){ __dom = {}; for (const k of (present||[])) __dom[k] = { val: '', text: '', present: true }; }
function $(sel){
    const d = __dom[sel] || (__dom[sel] = { val: '', text: '', present: false });
    return {
        length: d.present ? 1 : 0,
        val(v){ if (v === undefined) return d.val; d.val = String(v); return this; },
        text(v){ if (v === undefined) return d.text; d.text = String(v); return this; },
    };
}
${body}
return {
  __setSettings: (v)=>{ __settings = v; },
  __setStore:    (v)=>{ __store = v; },
  __setCtxExtra: (v)=>{ __ctxExtra = v || {}; },
  __setChat:     (v)=>{ __chat = v; },
  __resetDom, __dom: () => __dom,
  stripMetaBlocks, buildPassageFromRange, _ledgerDroppingPast, _editRewindDecision, _ledgerMissingCore, _missingCoreNotice, _synthesizeCheckpoint, computeLedgerCast, reindexAfterDeletion, _computeLiveLedgerRange, foldLedgerNotes, ledgerHistoryFor, _historyHtml, _histOpen, notesCover, ensureLedgerNotes, appendLedgerNotes, rewindLedgerFromNotes, compactLedgerNotes, _ledgerAuditTargets, _pickEvidenceIndices, buildLedgerAuditEvidence, _ambiguousTokens, _characterWeight,
  _escapeRegex, characterAliases, wordPresentInText, _parsePresenceMarkers, _stripPresenceNoise, _fbTokens, _fbScore, _fbDateLabel, buildFlashbackBlock, _arcTrajectory, _arcSnapScore, _arcRegressionCandidates, _arcHistoryPacket, _shrinkVerdict, _stashSources, subst, _healPersonaEntry, resolveMcName, _acceptLearnedMc, isMcLedgerKey, _renameEvidence, _renameLedgerKeySpace, renameLedgerCharacter, formatLedgerEntry,
  buildCharacterBlock, serializeLedgerForScribe, resolveLedgerKey, mergeLedgerDeltas, _noteLabel,
  subst, _storeHasContent, _computeLiveLedgerRange, _selectRoster, _composeRoster, _pickCheckpoint, _computeReplayChunks, _selectCheckpointKeeps, _contiguousRanges, _selectStorageEvictions,
  normalizeContinuityOutput, _continuitySig, mergeContinuityFlags, reconcileSnippetFlags, _findSnippetByTurnRange, _findSnippetsCovering,
  _baseNotesFromPage, adoptExternalLedgerEdits, _notesFromDeltas, _swapStagedLedgerIn,
  _journalNow, _canonNotesAgainst, _canonicalizeLedgerNotes, wipeLedgerData,
  _pinNeedle, _findPinSource, _pinAlive, _syncNotepadUi, _lastAssistantAt,
  _tpMark, buildTransplantExport, parseTransplant, storeFieldsFromTransplant, _exportTailBatches,
  _locateSnippetForOp, _applyInverseOp, _lev, _normName,
  truncateLedgerToTurn, clampStoreToLength, isRetryableError, RETRY_CONFIG, ConnectionError, _tpThreads,
  recomputeSummarizedUpTo, _snipSig, _resolveSnipRow,
  _selectNudgeFlags, _fixVerdict, _turnHasCoverage, _uncoveredTurnsIn, _ckptDue,
  _turnSig, _relocateCheckpoint, _CKPT_DRIFT_WINDOW,
};
`;
const L = new Function(sandbox)();

// ── tiny assert framework ──
let pass = 0, fail = 0;
const fails = [];
function ok(cond, msg) { if (cond) { pass++; } else { fail++; fails.push(msg); console.log('  ✗ ' + msg); } }
function _S(v){ return v || {}; }
function eq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), msg + `  [got ${JSON.stringify(a)} want ${JSON.stringify(b)}]`); }
function section(t) { console.log('\n== ' + t + ' =='); }

const defaultSettings = {
    ledgerEnabled: true, ledgerActiveWindow: 12, ledgerMaxActive: 6,
    ledgerMaxCharsPerChar: 600, ledgerContextMaxChars: 6000,
    ledgerInjectTemplate: '\n\n<characters>\nCanon:\n{{characters}}\n</characters>\n',
};
function freshStore(ledger) { L.__setStore({ ledger: ledger || {} }); return () => (new Function('return 0'))(); }
function getLedger() { return JSON.parse(JSON.stringify(currentStore().ledger)); }
let _store;
function currentStore() { return _store; }
function setStore(ledger) { _store = { ledger: ledger || {} }; L.__setStore(_store); }

// ─────────────────────────────────────────────────────────────────────
section('resolveLedgerKey');
{
    const led = { 'Mara': {}, 'Stella Vermillion': {} };
    eq(L.resolveLedgerKey(led, 'Mara'), 'Mara', 'exact match');
    eq(L.resolveLedgerKey(led, 'mara'), 'Mara', 'case-insensitive match resolves to existing key');
    eq(L.resolveLedgerKey(led, 'MARA'), 'Mara', 'uppercase resolves');
    eq(L.resolveLedgerKey(led, 'Alexia'), 'Alexia', 'no match returns input unchanged');
    eq(L.resolveLedgerKey(led, 'stella vermillion'), 'Stella Vermillion', 'multi-word case-insensitive');
}

// ─────────────────────────────────────────────────────────────────────
section('mergeLedgerDeltas — partial-field merge semantics');
{
    setStore({});
    let n = L.mergeLedgerDeltas([{ name: 'Mara', core: 'terse; never shouts; deflects with sarcasm', state: 'flustered', threads: ['wrong-name slip unaddressed'] }]);
    eq(n, 1, 'fresh insert reports 1 changed');
    let m = currentStore().ledger.Mara;
    eq(m.core, 'terse; never shouts; deflects with sarcasm', 'core stored');
    eq(m.state, 'flustered', 'state stored');
    eq(m.threads, ['wrong-name slip unaddressed'], 'threads stored');
    ok(typeof m.updatedAt === 'number' && m.updatedAt > 0, 'updatedAt stamped');

    // Omitted field kept; present field replaced.
    L.mergeLedgerDeltas([{ name: 'Mara', state: 'calmer, guard back up' }]);
    m = currentStore().ledger.Mara;
    eq(m.core, 'terse; never shouts; deflects with sarcasm', 'core UNCHANGED when omitted');
    eq(m.state, 'calmer, guard back up', 'state REPLACED when present');
    eq(m.threads, ['wrong-name slip unaddressed'], 'threads UNCHANGED when omitted');

    // threads present replaces the whole list.
    L.mergeLedgerDeltas([{ name: 'Mara', threads: ['owes MC an apology', 'suspicious of Alexia'] }]);
    eq(currentStore().ledger.Mara.threads, ['owes MC an apology', 'suspicious of Alexia'], 'threads REPLACED (full list) when present');

    // threads:[] clears.
    L.mergeLedgerDeltas([{ name: 'Mara', threads: [] }]);
    eq(currentStore().ledger.Mara.threads, [], 'threads:[] CLEARS the list');
    eq(currentStore().ledger.Mara.core, 'terse; never shouts; deflects with sarcasm', 'core survives a threads-only clear');

    // arc update.
    L.mergeLedgerDeltas([{ name: 'Mara', arc: 'thawing toward MC despite herself' }]);
    eq(currentStore().ledger.Mara.arc, 'thawing toward MC despite herself', 'arc set independently');
}

section('mergeLedgerDeltas — case-insensitive key (no duplicate entries)');
{
    setStore({ 'Mara': { core: 'x', updatedAt: 1 } });
    L.mergeLedgerDeltas([{ name: 'mara', state: 'y' }]);
    eq(Object.keys(currentStore().ledger), ['Mara'], 'lowercase delta updates existing key, no split');
    eq(currentStore().ledger.Mara.state, 'y', 'state applied to canonical key');
    eq(currentStore().ledger.Mara.core, 'x', 'core preserved on canonical key');
}

section('mergeLedgerDeltas — malformed / empty rejected');
{
    setStore({ 'Keep': { core: 'safe', updatedAt: 5 } });
    const before = getLedger();
    let n = L.mergeLedgerDeltas([null, undefined, {}, 42, 'str', [], { name: '' }, { name: '   ' }, { core: 'no name' }, { name: 'Bob', core: '   ', state: '' }]);
    eq(n, 0, 'no valid deltas → 0 changed');
    eq(currentStore().ledger, before, 'ledger byte-identical after all-garbage merge');
    ok(!('Bob' in currentStore().ledger), 'character with only whitespace fields not created');
    // non-array input
    eq(L.mergeLedgerDeltas(null), 0, 'null input → 0');
    eq(L.mergeLedgerDeltas({ name: 'X' }), 0, 'non-array input → 0');
}

section('mergeLedgerDeltas — threads sanitised');
{
    setStore({});
    L.mergeLedgerDeltas([{ name: 'Cid', threads: ['ok', '', '   ', 42, null, undefined, 'two', '  trim me  '] }]);
    eq(currentStore().ledger.Cid.threads, ['ok', 'two', 'trim me'], 'threads filters non-strings/blanks and trims');
}

// ─────────────────────────────────────────────────────────────────────
section('characterAliases — given & surname tokens');
{
    eq(L.characterAliases('Mara'), ['Mara'], 'single token → just full');
    eq(L.characterAliases('Stella Vermillion'), ['Stella Vermillion', 'Stella', 'Vermillion'], 'first (given) + last (surname) both captured');
    eq(L.characterAliases('Alexia Valois'), ['Alexia Valois', 'Alexia', 'Valois'], 'two-token name');
    eq(L.characterAliases('Jo Vo'), ['Jo Vo'], 'tokens <=2 chars excluded (only full kept)');
    eq(L.characterAliases('Honami Ichinose'), ['Honami Ichinose', 'Honami', 'Ichinose'], 'romaji name');
    eq(L.characterAliases('  '), [], 'blank → empty');
    // 3-token: first + last, middle skipped if short
    eq(L.characterAliases('Alexia von Valois'), ['Alexia von Valois', 'Alexia', 'Valois'], '3-token uses first+last, short middle skipped');
}

section('wordPresentInText — whole-word, no substrings');
{
    ok(L.wordPresentInText('stella walked into room 313', 'stella'), 'matches present given name');
    ok(!L.wordPresentInText('the constellation shimmered', 'stella'), 'NO substring match (stella in constellation)');
    ok(L.wordPresentInText('"vermillion, report," she said', 'vermillion'), 'matches with adjacent punctuation');
    ok(!L.wordPresentInText('he announced the plan', 'ann'), 'NO substring (ann in announced)');
    ok(L.wordPresentInText('stella vermillion arrived', 'stella vermillion'), 'multi-word phrase match');
    ok(!L.wordPresentInText('stella arrived', 'stella vermillion'), 'phrase absent when only given name present');
    ok(!L.wordPresentInText('anything', 'a'), 'needle <2 chars → false');
}

// ─────────────────────────────────────────────────────────────────────
section('formatLedgerEntry — format, order, periods');
{
    const e = { core: 'terse; never shouts', state: 'flustered', threads: ['a', 'b'], arc: 'warming' };
    eq(L.formatLedgerEntry('Mara', e, 600), 'Mara — Nature: terse; never shouts. Now: flustered. Open: a; b. Arc: warming.', 'full entry, correct order & single periods');
    eq(L.formatLedgerEntry('Bob', { core: 'stoic' }, 600), 'Bob — Nature: stoic.', 'partial (core only)');
    eq(L.formatLedgerEntry('X', {}, 600), '', 'empty entry → empty string');
    eq(L.formatLedgerEntry('X', { threads: [] }, 600), '', 'only empty threads → empty string');
    eq(L.formatLedgerEntry('X', { core: 'a', threads: [] }, 600), 'X — Nature: a.', 'empty threads produces no Open segment');
    // double-period avoidance
    eq(L.formatLedgerEntry('Y', { core: 'ends with period.', state: 'also.' }, 600), 'Y — Nature: ends with period. Now: also.', 'trailing periods in fields do not double up');
    // whitespace normalisation
    eq(L.formatLedgerEntry('Z', { core: 'multi\n  line\ttext' }, 600), 'Z — Nature: multi line text.', 'internal whitespace collapsed');
}

section('formatLedgerEntry — truncation trims Arc first, respects cap');
{
    const e = {
        core: 'CORE_' + 'x'.repeat(40),
        state: 'STATE_' + 'y'.repeat(40),
        threads: ['THREAD_' + 'z'.repeat(30)],
        arc: 'ARC_' + 'w'.repeat(200),
    };
    const cap = 140;
    const out = L.formatLedgerEntry('Nm', e, cap);
    ok(out.length <= cap, `output within cap (${out.length} <= ${cap})`);
    ok(out.endsWith('…'), 'truncated output ends with ellipsis');
    ok(out.includes('Nature:'), 'Nature (highest priority) retained under truncation');
    ok(!out.includes('w'.repeat(200)), 'Arc (lowest priority) is the field cut');
}

// ─────────────────────────────────────────────────────────────────────
section('serializeLedgerForScribe — ordering, budget, empty');
{
    eq(L.serializeLedgerForScribe({}, 6000), '(empty — no characters recorded yet)', 'empty ledger message');
    eq(L.serializeLedgerForScribe(null, 6000), '(empty — no characters recorded yet)', 'null ledger message');
    const led = {
        'Old': { core: 'a', updatedAt: 1 },
        'New': { core: 'b', updatedAt: 100 },
        'Mid': { core: 'c', updatedAt: 50 },
    };
    const out = L.serializeLedgerForScribe(led, 6000);
    const order = ['New', 'Mid', 'Old'].map(n => out.indexOf(n));
    ok(order[0] < order[1] && order[1] < order[2] && order[0] !== -1, 'most-recently-updated first');
    // budget: tiny budget keeps at least the newest and notes omissions
    const tiny = L.serializeLedgerForScribe(led, 12);
    ok(tiny.includes('New'), 'newest kept even under tiny budget');
    ok(/omitted for brevity/.test(tiny), 'omission notice present when truncated by budget');
}

// ─────────────────────────────────────────────────────────────────────
section('buildCharacterBlock — active-cast detection & caps (end-to-end injection)');
{
    L.__setSettings(Object.assign({}, defaultSettings, { ledgerInjectRoster: false }));
    setStore({
        'Stella Vermillion': { core: 'fiery; proud', state: 'annoyed', threads: ['rivalry with MC'], updatedAt: 30 },
        'Alexia Valois': { core: 'analytical; cool', state: 'curious', updatedAt: 20 },
        'Ghost McAbsent': { core: 'never here', state: 'offscreen', updatedAt: 99 },
    });
    // Recent chat mentions Stella (given) and Valois (surname), NOT the ghost.
    L.__setChat([
        { mes: 'The corridor was quiet.' },
        { mes: 'Stella crossed her arms as Valois studied the board.' },
        { mes: 'MC hesitated.' },
    ]);
    const block = L.buildCharacterBlock();
    ok(block.includes('Stella Vermillion'), 'active character (given-name hit) injected');
    ok(block.includes('Alexia Valois'), 'active character (surname hit) injected');
    ok(!block.includes('Ghost McAbsent'), 'off-screen character NOT injected (even though most-recently-updated)');
    ok(block.includes('<characters>'), 'wrapped in template');
    ok(block.includes('rivalry with MC'), 'threads rendered in injection');

    // maxActive cap
    const s2 = Object.assign({}, defaultSettings, { ledgerMaxActive: 1, ledgerInjectRoster: false });
    L.__setSettings(s2);
    const capped = L.buildCharacterBlock();
    const hasStella = capped.includes('Stella'), hasAlexia = capped.includes('Alexia');
    // v5.71.0: maxActive caps FULL entries, not existence. Exactly one full entry
    // (only full entries carry the "Nature:" field), but BOTH on-screen characters
    // still reach the storyteller — the other as a compact entry. The old assertion
    // measured the block text and so encoded the bug: a character in the room
    // vanishing entirely once the cap was reached.
    ok((capped.match(/Nature:/g) || []).length === 1, 'maxActive=1 gives exactly one FULL entry');
    ok(hasStella && hasAlexia, 'but BOTH on-screen characters still reach the storyteller — nobody in the room is erased by the cap');
    ok(capped.includes('Also present in this scene'), 'the overflow character arrives under the compact framing');

    // disabled → empty
    L.__setSettings(Object.assign({}, defaultSettings, { ledgerEnabled: false }));
    eq(L.buildCharacterBlock(), '', 'ledgerEnabled=false → empty block');

    // a ledger character OFF-screen → roster keeps them present (identity only)
    L.__setSettings(Object.assign({}, defaultSettings));
    setStore({ 'Stella': { core: 'proud knight; blunt but loyal', state: 'anxious and pacing', updatedAt: 3 } });
    L.__setChat([{ mes: 'nobody named here at all' }]);
    {
        const b = L.buildCharacterBlock();
        ok(b.includes('Stella'), 'off-screen ledger character still injected via roster');
        ok(b.includes('Other people in this world'), 'roster header present for off-screen cast');
        // Reversed in v5.70.0: withholding an off-screen character's state told the
        // storyteller they exist but not where — so the world outside the scene went
        // dark. Their last recorded state is where the story left them.
        ok(b.includes('anxious'), 'roster carries the off-screen state — the world keeps existing between scenes');
    }

    // roster OFF + no active cast → empty
    L.__setSettings(Object.assign({}, defaultSettings, { ledgerInjectRoster: false }));
    setStore({ 'Stella': { core: 'x', updatedAt: 1 } });
    L.__setChat([{ mes: 'nobody named here at all' }]);
    eq(L.buildCharacterBlock(), '', 'roster off + no on-screen character → empty block');

    // empty ledger → empty
    setStore({});
    L.__setChat([{ mes: 'Stella here' }]);
    eq(L.buildCharacterBlock(), '', 'empty ledger → empty block');
}

section('buildCharacterBlock — the tsundere scenario (regression for the reported bug)');
{
    // Mira is flustered with an unresolved wrong-name thread and a core that
    // forbids outbursts. As long as she is on screen, her anchor must inject.
    L.__setSettings(Object.assign({}, defaultSettings));
    setStore({
        'Mira': {
            core: 'cynical, guarded tsundere; masks embarrassment with clipped sarcasm; NEVER raises her voice',
            state: 'still rattled after MC called her the wrong name; overcompensating with extra bite',
            threads: ['wrong-name slip unaddressed — waiting to see if MC notices'],
            updatedAt: 10,
        },
    });
    L.__setChat([{ mes: 'Mira looked away, jaw tight.' }, { mes: 'MC said something.' }]);
    const b = L.buildCharacterBlock();
    ok(b.includes('NEVER raises her voice'), 'behavioral anchor (no-outburst core) present in injection');
    ok(b.includes('still rattled'), 'volatile state persists into the injection');
    ok(b.includes('wrong-name slip unaddressed'), 'open thread kept alive until story resolves it');
}

// ─────────────────────────────────────────────────────────────────────
section('_computeLiveLedgerRange — live-pass window');
{
    eq(L._computeLiveLedgerRange(-1, -1, 5), [0, 5], 'fresh: cover turns 0..latest');
    eq(L._computeLiveLedgerRange(-1, 5, 5), null, 'caught up: nothing new');
    eq(L._computeLiveLedgerRange(-1, 3, 6), [4, 6], 'advance: only new turns since pointer');
    eq(L._computeLiveLedgerRange(10, 3, 15), [11, 15], 'skips summarized turns (start = summarizedUpTo+1)');
    eq(L._computeLiveLedgerRange(10, 12, 15), [13, 15], 'pointer ahead of summarized: continue from pointer');
    eq(L._computeLiveLedgerRange(2, 99, 5), [3, 5], 'stale-high pointer (post-deletion) resyncs to summarized+1');
    eq(L._computeLiveLedgerRange(2, 99, 1), null, 'stale-high pointer, chat shorter than summarized: nothing');
    eq(L._computeLiveLedgerRange(-1, -1, -1), null, 'no turns yet');
}

// ─────────────────────────────────────────────────────────────────────
section('buildCharacterBlock — roster (off-screen cast never vanishes)');
{
    L.__setSettings(Object.assign({}, defaultSettings));
    setStore({
        'Mira': { core: 'guarded tsundere; clipped sarcasm', state: 'flustered', updatedAt: 30 },
        'Professor Halden': { core: 'stern academy mentor; speaks in measured warnings', state: 'absent from the room', updatedAt: 5 },
        'Kai': { core: 'reckless rival; goads everyone', state: 'went home early', updatedAt: 8 },
    });
    L.__setChat([{ mes: 'Mira glared across the courtyard.' }]);
    const b = L.buildCharacterBlock();
    ok(b.includes('flustered'), 'on-screen character gets a FULL card (volatile state present)');
    ok(b.includes('Professor Halden'), 'off-screen professor kept alive in the roster');
    ok(b.includes('Kai'), 'off-screen rival kept alive in the roster');
    // v5.70.0 reverses this deliberately: a roster line that carried only a name and
    // a personality fragment told the storyteller a person EXISTS but not where they
    // are, so the world stopped existing outside the current scene. Their last
    // recorded state is where the story left them — carrying it invents nothing.
    ok(b.includes('last seen'), 'roster entries carry the last-known state, so the off-screen world stays alive');
    ok(/last seen \(turn \d+\)/.test(b) || !/_t/.test(JSON.stringify(b)), 'and stamp it with the turn, so staleness is visible rather than implied');
    ok(b.indexOf('Mira') < b.indexOf('Other people in this world'), 'active full cards come before the roster');
    // roster respects the cap
    L.__setSettings(Object.assign({}, defaultSettings, { ledgerRosterMax: 1 }));
    const b2 = L.buildCharacterBlock();
    const inRoster = (b2.match(/;/g) || []).length;
    ok(b2.includes('Other people in this world'), 'roster still present at cap=1');
}

// ─────────────────────────────────────────────────────────────────────
section('_selectRoster — capped rotating roster');
{
    const cast = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];   // most-recent first
    eq(L._selectRoster(['A', 'B', 'C'], 6, 0), ['A', 'B', 'C'], 'cast <= cap: show everyone (no rotation)');
    eq(L._selectRoster([], 6, 0), [], 'empty cast → empty');
    eq(L._selectRoster(['A', 'B'], 0, 5), [], 'cap 0 → empty');
    // cast > cap: warm = ceil(cap/2) anchored, cold rotates
    eq(L._selectRoster(cast, 6, 0), ['A', 'B', 'C', 'D', 'E', 'F'], 'tick 0: warm A,B,C + cold D,E,F');
    eq(L._selectRoster(cast, 6, 1), ['A', 'B', 'C', 'E', 'F', 'G'], 'tick 1: cold window advances to E,F,G');
    eq(L._selectRoster(cast, 6, 2), ['A', 'B', 'C', 'F', 'G', 'H'], 'tick 2: cold window advances to F,G,H');
    const t0 = L._selectRoster(cast, 6, 0), t1 = L._selectRoster(cast, 6, 1), t2 = L._selectRoster(cast, 6, 2);
    ok(['A', 'B', 'C'].every(n => t0.includes(n) && t1.includes(n) && t2.includes(n)), 'warm (recent) anchored every tick');
    ok(new Set(t1).size === t1.length, 'no duplicate entries in a pick');
    const seen = new Set();
    for (let k = 0; k < 5; k++) L._selectRoster(cast, 6, k).forEach(n => seen.add(n));
    ok(['D', 'E', 'F', 'G', 'H'].every(n => seen.has(n)), 'all cold characters cycle through within a full rotation');
    // tick wraps cleanly (no crash / stable set) at large tick
    eq(L._selectRoster(cast, 6, 5), L._selectRoster(cast, 6, 0), 'tick wraps at coldPool length (5) back to start');
}

// ─────────────────────────────────────────────────────────────────────
section('_composeRoster — pins: always present, uncapped, no rotation, no dup');
{
    const cast = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];   // off-screen, most-recent first
    eq(L._composeRoster(cast, [], 6, 0, true), L._selectRoster(cast, 6, 0), 'no pins: identical to plain rotation');
    // pin a cold character rotation would NOT pick at tick 0 → still present, and first
    const r = L._composeRoster(cast, ['H'], 6, 0, true);
    ok(r.includes('H'), 'pinned cold character present even when rotation would skip it');
    ok(r[0] === 'H', 'pinned characters listed first');
    ok(new Set(r).size === r.length, 'no duplicate entries');
    // pin a character rotation WOULD also pick (D at tick 0) → appears exactly once
    const r2 = L._composeRoster(cast, ['D'], 6, 0, true);
    ok(r2.filter(n => n === 'D').length === 1, 'pinned + rotation-picked character appears exactly once (no dup)');
    // pins are uncapped: three pins under a cap of 2 → all three still present
    const r3 = L._composeRoster(cast, ['F', 'G', 'H'], 2, 0, true);
    ok(['F', 'G', 'H'].every(n => r3.includes(n)), 'all pins present even when they exceed the cap');
    // rotation still runs over the NON-pinned remainder alongside pins
    ok(r3.length > 3, 'non-pinned rotation slots still filled alongside pins');
    // a pin for someone NOT off-screen (on-screen/absent) never appears in the roster
    ok(!L._composeRoster(['A', 'B'], ['Zed'], 6, 0, true).includes('Zed'), 'pin for an on-screen/absent character does not surface in the roster (no redundancy with full cards)');
    // case-insensitive pin match against the ledger name
    ok(L._composeRoster(['Akane', 'Bob'], ['akane'], 6, 0, true).includes('Akane'), 'pin matches ledger name case-insensitively');
}

// ─────────────────────────────────────────────────────────────────────
section('_pickCheckpoint — nearest snapshot at/before target');
{
    const cks = [{ atTurn: 0 }, { atTurn: 5 }, { atTurn: 10 }, { atTurn: 15 }];
    eq(L._pickCheckpoint(cks, 12) && L._pickCheckpoint(cks, 12).atTurn, 10, 'newest checkpoint <= target');
    eq(L._pickCheckpoint(cks, 15) && L._pickCheckpoint(cks, 15).atTurn, 15, 'exact match allowed');
    eq(L._pickCheckpoint(cks, 100) && L._pickCheckpoint(cks, 100).atTurn, 15, 'clamps to newest when target is beyond all');
    eq(L._pickCheckpoint(cks, 3) && L._pickCheckpoint(cks, 3).atTurn, 0, 'earliest when target is low');
    eq(L._pickCheckpoint(cks, -1), null, 'nothing at/before a negative target');
    eq(L._pickCheckpoint([], 10), null, 'empty list -> null');
    eq(L._pickCheckpoint([{ atTurn: 10 }, { atTurn: 2 }, { atTurn: 7 }], 8).atTurn, 7, 'unsorted list handled');
}

// ─────────────────────────────────────────────────────────────────────
section('mergeLedgerDeltas — explicit target isolation (staging rebuilds)');
{
    const a = {}, b = {};
    eq(L.mergeLedgerDeltas([{ name: 'Asari', core: 'calm strategist', state: 'wary' }], a), 1, 'merge into explicit target A');
    eq(L.mergeLedgerDeltas([{ name: 'Asari', core: 'furious', threads: ['find the mole'] }], b), 1, 'merge into explicit target B');
    eq(a['Asari'].core, 'calm strategist', 'target A holds its own value');
    eq(b['Asari'].core, 'furious', 'target B holds its own value — zero cross-talk');
    ok(!a['Asari'].threads, 'A never received B\'s threads');
    eq(b['Asari'].threads.length, 1, 'B kept its threads');
    // staging semantics: repeated merges into the same target evolve it in place
    L.mergeLedgerDeltas([{ name: 'Asari', state: 'resolved' }], b);
    eq(b['Asari'].state, 'resolved', 'later chunk replaces the field on the same target');
    eq(b['Asari'].core, 'furious', 'untouched fields survive later chunks');
}

// ─────────────────────────────────────────────────────────────────────
section('_selectStorageEvictions — bounded checkpoint/backup footprint');
{
    const E = (key, bytes, at) => ({ key, bytes, at });
    eq(L._selectStorageEvictions([E('a',100,1),E('b',100,2)], 500).length, 0, 'under budget -> evict nothing');
    eq(JSON.stringify(L._selectStorageEvictions([E('old',300,1),E('mid',300,2),E('new',300,3)], 600)), JSON.stringify(['old']), 'oldest evicted first, stops at budget');
    eq(JSON.stringify(L._selectStorageEvictions([E('old',300,1),E('mid',300,2),E('new',300,3)], 300)), JSON.stringify(['old','mid']), 'evicts as many as needed');
    eq(JSON.stringify(L._selectStorageEvictions([E('nots',200,0),E('dated',200,5)], 250)), JSON.stringify(['nots']), 'missing timestamp counts as oldest');
    // per-group protection: an idle chat's newest snapshots survive pressure from active chats
    const G = (key, bytes, at, group) => ({ key, bytes, at, group });
    const idle = [G('i1',100,1,'chatA'),G('i2',100,2,'chatA'),G('i3',100,3,'chatA')];
    const busy = [G('b1',100,10,'chatB'),G('b2',100,11,'chatB'),G('b3',100,12,'chatB'),G('b4',100,13,'chatB')];
    const evicted = new Set(L._selectStorageEvictions([...idle, ...busy], 400, 2));
    ok(!evicted.has('i2') && !evicted.has('i3'), 'idle chat keeps its 2 newest snapshots despite being globally oldest');
    ok(evicted.has('i1'), 'idle chat\'s excess-beyond-floor is still evictable');
    ok(!evicted.has('b3') && !evicted.has('b4'), 'busy chat keeps its 2 newest too');
    // floor can force staying over budget — protection wins over budget
    const tight = L._selectStorageEvictions([...idle, ...busy], 100, 2);
    ok(!tight.includes('i2') && !tight.includes('i3') && !tight.includes('b3') && !tight.includes('b4'), 'protected entries never evicted even when budget cannot be met');
    eq(L._selectStorageEvictions([], 100).length, 0, 'empty -> empty');
    // never evicts more than necessary: after eviction the survivors fit
    const mix = [E('a',400,4),E('b',400,1),E('c',400,3),E('d',400,2)];
    const gone = new Set(L._selectStorageEvictions(mix, 900));
    const left = mix.filter(e => !gone.has(e.key)).reduce((n,e)=>n+e.bytes,0);
    ok(left <= 900 && left + 400 > 900, 'evicts exactly enough (survivors fit; one fewer eviction would not)');
    ok(gone.has('b') && gone.has('d'), 'the two oldest were the ones evicted');
}

// ─────────────────────────────────────────────────────────────────────
section('_contiguousRanges — O(runs) hide/unhide batching');
{
    eq(JSON.stringify(L._contiguousRanges([0,1,2,3])), JSON.stringify([[0,3]]), 'one contiguous run');
    eq(JSON.stringify(L._contiguousRanges([5,6,9,10,11,20])), JSON.stringify([[5,6],[9,11],[20,20]]), 'gaps split runs; singleton kept');
    eq(JSON.stringify(L._contiguousRanges([3,1,2,1,0])), JSON.stringify([[0,3]]), 'unsorted + duplicate input normalized');
    eq(L._contiguousRanges([]).length, 0, 'empty -> empty');
    eq(JSON.stringify(L._contiguousRanges([-2,-1,0,1])), JSON.stringify([[0,1]]), 'negative indices filtered out');
    eq(JSON.stringify(L._contiguousRanges([7])), JSON.stringify([[7,7]]), 'single index -> single-point range');
    // a 280-message unghost collapses to ONE call instead of 280 chat-file writes
    const big = []; for (let i = 0; i <= 279; i++) big.push(i);
    eq(JSON.stringify(L._contiguousRanges(big)), JSON.stringify([[0,279]]), '280 messages -> 1 range call');
    // every input index is covered by exactly one range, nothing extra
    const scattered = [0,1,4,5,6,9,50,51,52,53,99];
    const rs = L._contiguousRanges(scattered);
    const covered = new Set(); for (const [a,b] of rs) for (let i=a;i<=b;i++) covered.add(i);
    ok(scattered.every(i => covered.has(i)) && covered.size === scattered.length, 'ranges cover exactly the input set');
}

// ─────────────────────────────────────────────────────────────────────
section('_computeReplayChunks — bounded background rewind batches');
{
    eq(JSON.stringify(L._computeReplayChunks(287, 292, 3)), JSON.stringify([[288, 290], [291, 292]]), 'delta split into summarizer-sized chunks');
    eq(JSON.stringify(L._computeReplayChunks(290, 292, 5)), JSON.stringify([[291, 292]]), 'small delta -> single chunk');
    eq(L._computeReplayChunks(292, 292, 5).length, 0, 'empty span -> no chunks');
    eq(L._computeReplayChunks(293, 292, 5).length, 0, 'inverted span -> no chunks');
    const big = L._computeReplayChunks(-1, 291, 3);   // full 292-turn replay
    eq(big.length, Math.ceil(292 / 3), 'full-history replay is fully chunked');
    eq(JSON.stringify(big[0]), JSON.stringify([0, 2]), 'first chunk starts at fromExclusive+1');
    eq(big[big.length - 1][1], 291, 'last chunk ends exactly at target');
    ok(big.every(([a, b]) => b - a + 1 <= 3 && a <= b), 'every chunk within step and well-formed');
    // contiguity: no turn skipped, none doubled
    ok(big.every((c, i) => i === 0 || c[0] === big[i - 1][1] + 1), 'chunks are contiguous');
    eq(L._computeReplayChunks(0, 10, 0).length, Math.ceil(10 / 1), 'step 0 clamps to 1');
    eq(L._computeReplayChunks(null, 10, 3).length, 0, 'non-numeric input -> no chunks');
}

// ─────────────────────────────────────────────────────────────────────
section('_selectCheckpointKeeps — dense recent + thinned tail');
{
    const turns = []; for (let t = 5; t <= 290; t += 5) turns.push(t);   // 58 checkpoints, cadence 5
    const keeps = L._selectCheckpointKeeps(turns, 16, 25);
    for (let t = 215; t <= 290; t += 5) ok(keeps.has(t), `dense window keeps turn ${t}`);
    ok(keeps.size > 16, 'tail is thinned, not dropped');
    ok(keeps.size <= 16 + Math.ceil(215 / 25) + 1, 'tail stays sparse (roughly one per bucket)');
    // every old turn (past the first bucket) is within one bucket of a kept checkpoint
    // -> a deep branch rewinds from a nearby snapshot instead of full-rebuilding
    for (let target = 25; target <= 290; target += 5) {
        const nearest = Math.max(...[...keeps].filter(t => t <= target), -1);
        ok(nearest >= 0 && target - nearest < 30, `branch to ${target} finds a checkpoint within a bucket (got ${nearest})`);
    }
    // below the first bucket's kept snapshot there's nothing to restore — but the
    // fallback rebuild there covers at most a bucket's worth of turns, which is cheap
    ok(Math.min(...keeps) <= 25, 'oldest kept checkpoint sits inside the first bucket');
    eq([...L._selectCheckpointKeeps([10, 20, 30], 16, 25)].length, 3, 'fewer than keepRecent -> all kept');
    const hard = L._selectCheckpointKeeps(turns, 8, 0);
    eq(hard.size, 8, 'sparseEvery 0 -> hard prune, tail dropped (quota path)');
    ok(hard.has(290) && hard.has(255), 'hard prune keeps the newest');
    eq(L._selectCheckpointKeeps([], 16, 25).size, 0, 'empty -> empty');
}

// ─────────────────────────────────────────────────────────────────────
section('Continuity — normalizeContinuityOutput');
{
    eq(L.normalizeContinuityOutput('NONE').length, 0, 'NONE -> empty');
    eq(L.normalizeContinuityOutput('').length, 0, 'empty -> empty');
    const a = L.normalizeContinuityOutput('[{"issue":"Alexia on train","fix":"she is at the academy","kind":"continuity"}]');
    eq(a.length, 1, 'one flag parsed');
    eq(a[0].kind, 'continuity', 'kind preserved');
    const b = L.normalizeContinuityOutput('```json\n[{"issue":"x","fix":"y","kind":"drift"}]\n```');
    eq(b.length, 1, 'fenced json parsed');
    eq(b[0].kind, 'drift', 'drift kind preserved');
    const c = L.normalizeContinuityOutput('here you go [{"issue":"z","fix":"w"}] thanks');
    eq(c.length, 1, 'salvaged array from surrounding noise');
    eq(c[0].kind, 'continuity', 'kind defaults to continuity');
    const d = L.normalizeContinuityOutput('{"issue":"solo","fix":"obj"}');
    eq(d.length, 1, 'single object coerced to array');
    eq(L.normalizeContinuityOutput('[{"kind":"drift"}]').length, 0, 'object with no issue/fix dropped');
}

// ─────────────────────────────────────────────────────────────────────
section('Continuity — where classification (snippet vs source)');
{
    const w = L.normalizeContinuityOutput('[{"issue":"i1","fix":"f1","kind":"drift"},{"issue":"i2","fix":"f2","kind":"continuity","where":"source"},{"issue":"i3","fix":"f3","kind":"continuity"},{"issue":"i4","fix":"f4","kind":"continuity","where":"snippet"}]');
    eq(w.length, 4, 'four parsed');
    eq(w[0].where, 'snippet', 'drift defaults to where=snippet (always snippet-level)');
    eq(w[1].where, 'source', 'explicit where=source preserved');
    eq(w[2].where, 'source', 'continuity w/o where defaults to source (conservative — no snippet auto-edit)');
    eq(w[3].where, 'snippet', 'explicit where=snippet preserved for a continuity flag');
    // merge carries where onto the stored flag
    const store = { continuityFlags: [], continuityDismissed: [] };
    L.mergeContinuityFlags(store, [3, 5], [{ issue: 'X', fix: 'x', kind: 'continuity', where: 'source' }]);
    eq(store.continuityFlags[0].where, 'source', 'stored flag keeps where');
}

// ─────────────────────────────────────────────────────────────────────
section('Continuity — _continuitySig + mergeContinuityFlags');
{
    eq(L._continuitySig({ issue: 'Alexia On  TRAIN', kind: 'continuity' }),
       L._continuitySig({ issue: 'alexia on train', kind: 'continuity' }),
       'sig normalizes case + whitespace');
    ok(L._continuitySig({ issue: 'x', kind: 'drift' }) !== L._continuitySig({ issue: 'x', kind: 'continuity' }),
       'sig distinguishes kind');
    eq(L._continuitySig({ kind: 'drift' }), '', 'no issue -> empty sig');
    const store = { continuityFlags: [], continuityDismissed: [] };
    eq(L.mergeContinuityFlags(store, [3, 5], [{ issue: 'A', fix: 'a', kind: 'continuity' }]), 1, 'adds a new flag');
    eq(L.mergeContinuityFlags(store, [3, 5], [{ issue: 'A', fix: 'a', kind: 'continuity' }]), 0, 'dedups an identical open flag');
    eq(store.continuityFlags.length, 1, 'only one flag stored');
    store.continuityDismissed.push(L._continuitySig({ issue: 'B', kind: 'continuity' }));
    eq(L.mergeContinuityFlags(store, [1, 2], [{ issue: 'B', fix: 'b', kind: 'continuity' }]), 0, 'skips a dismissed sig');
    eq(L.mergeContinuityFlags(store, [6, 7], [{ issue: 'C', fix: 'c', kind: 'drift' }]), 1, 'adds a genuinely different flag');
    eq(store.continuityFlags.length, 2, 'two flags total');
    ok(store.continuityFlags[0].id && store.continuityFlags[0].status === 'open' && store.continuityFlags[0].turnRange[0] === 3,
       'stored flag has id, open status, and turnRange');
}

// ─────────────────────────────────────────────────────────────────────
section('Continuity — reconcileSnippetFlags (re-check clears fixed, keeps valid)');
{
    const store = { continuityFlags: [], continuityDismissed: [] };
    L.mergeContinuityFlags(store, [3, 5], [{ issue: 'A', fix: 'a', kind: 'continuity' }, { issue: 'B', fix: 'b', kind: 'drift' }]);
    eq(store.continuityFlags.length, 2, 'two flags to start');
    const idA = store.continuityFlags.find(f => f.issue === 'A').id;
    // fresh pass still reports A only -> B cleared, A kept without churn, nothing new
    const r = L.reconcileSnippetFlags(store, [3, 5], [{ issue: 'A', fix: 'a', kind: 'continuity' }]);
    eq(r.cleared, 1, 'B (no longer reported) cleared');
    eq(r.added, 0, 'A already open -> not re-added');
    eq(store.continuityFlags.length, 1, 'only A remains');
    eq(store.continuityFlags[0].id, idA, 'A kept its id (no churn)');
    // fresh pass reports nothing -> A cleared (issue fixed)
    const r2 = L.reconcileSnippetFlags(store, [3, 5], []);
    eq(r2.cleared, 1, 'A cleared when the fresh pass is clean');
    eq(store.continuityFlags.length, 0, 'snippet now flag-free');
    // reconcile only touches the matching turnRange
    L.mergeContinuityFlags(store, [10, 12], [{ issue: 'Z', fix: 'z', kind: 'continuity' }]);
    const r3 = L.reconcileSnippetFlags(store, [3, 5], []);
    eq(r3.cleared, 0, 'a different snippet\'s flags are untouched');
    eq(store.continuityFlags.length, 1, 'Z on [10,12] preserved');
    // a dismissed issue is never (re-)added by a reconcile (real dismiss = flag removed + sig recorded)
    const store2 = { continuityFlags: [], continuityDismissed: [L._continuitySig({ issue: 'Z', kind: 'continuity' })] };
    const r4 = L.reconcileSnippetFlags(store2, [10, 12], [{ issue: 'Z', fix: 'z', kind: 'continuity' }]);
    eq(r4.added, 0, 'dismissed Z not added even though re-reported');
    eq(store2.continuityFlags.length, 0, 'dismissed Z stays gone');
}

// ─────────────────────
section('Continuity — _findSnippetByTurnRange');
{
    const store = {
        layers: [
            [{ turnRange: [0, 2], text: 'a' }, { turnRange: [3, 5], text: 'b' }],
            [{ turnRange: [6, 10], text: 'c' }],
        ],
    };
    eq(L._findSnippetByTurnRange(store, [3, 5]).snippet.text, 'b', 'finds snippet in layer 0');
    eq(L._findSnippetByTurnRange(store, [6, 10]).snippet.text, 'c', 'finds snippet in a higher layer');
    eq(L._findSnippetByTurnRange(store, [3, 4]), null, 'no exact match -> null');
    eq(L._findSnippetByTurnRange(store, null), null, 'null turnRange -> null');
    eq(L._findSnippetByTurnRange({}, [0, 2]), null, 'no layers -> null');
}

// ─────────────────────
section('Continuity — _findSnippetsCovering (which snippet owns an edited message)');
{
    const store = {
        layers: [
            [{ turnRange: [0, 2], text: 'a' }, { turnRange: [3, 5], text: 'b' }],
            [{ turnRange: [6, 10], text: 'c' }],
        ],
    };
    eq(L._findSnippetsCovering(store, 4).length, 1, 'index 4 -> one snippet');
    eq(L._findSnippetsCovering(store, 4)[0].text, 'b', 'index 4 is inside [3,5]');
    eq(L._findSnippetsCovering(store, 3)[0].text, 'b', 'range inclusive at the start');
    eq(L._findSnippetsCovering(store, 8)[0].text, 'c', 'index 8 is inside [6,10]');
    eq(L._findSnippetsCovering(store, 99).length, 0, 'beyond all snippets -> none (recent verbatim, ignored)');
    eq(L._findSnippetsCovering({}, 1).length, 0, 'no layers -> none');
}

// ─────────────────────────────────────────────────────────────────────
section('subst — $-sequence safety (regression: String.replace(token, string) corrupts $)');
{
    const tpl = 'A {{X}} B';
    eq(L.subst(tpl, '{{X}}', '$$'), 'A $$ B', 'literal $$ preserved');
    eq(L.subst(tpl, '{{X}}', '$&'), 'A $& B', 'literal $& preserved (not the matched token)');
    eq(L.subst(tpl, '{{X}}', '$`'), 'A $` B', 'literal $backtick preserved (not the prefix)');
    eq(L.subst(tpl, '{{X}}', "$'"), "A $' B", 'literal $prime preserved (not the suffix)');
    eq(L.subst(tpl, '{{X}}', 'they paid $500, maybe $$'), 'A they paid $500, maybe $$ B', 'money/prose with $ preserved intact');
    eq(L.subst(tpl, '{{X}}', null), 'A  B', 'null value -> empty, no throw');
    eq(L.subst(tpl, '{{X}}', 42), 'A 42 B', 'non-string value coerced to string');
    eq(L.subst(null, '{{X}}', 'z'), '', 'null template -> empty string');
    // Sanity: prove the OLD plain-string path WAS broken, so a regression back to it fails here.
    ok('A {{X}} B'.replace('{{X}}', '$$') !== 'A $$ B', 'sanity: plain String.replace DID corrupt $$ (the bug this fixes)');
    ok('A {{X}} B'.replace('{{X}}', '$`') !== 'A $` B', 'sanity: plain String.replace DID corrupt $backtick');
}

// ─────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────
section('_storeHasContent — backup/recovery gating');
{
    ok(L._storeHasContent(null) === false, 'null -> no content');
    ok(L._storeHasContent(undefined) === false, 'undefined -> no content');
    ok(L._storeHasContent({}) === false, 'empty object -> no content');
    ok(L._storeHasContent({ layers: [], ledger: {}, notepad: '', pins: [] }) === false, 'fully-empty store -> no content');
    ok(L._storeHasContent({ layers: [[]] }) === false, 'empty layer array -> no content');
    ok(L._storeHasContent({ layers: [[{ text: 'x' }]] }) === true, 'a snippet -> has content');
    ok(L._storeHasContent({ ledger: { Emilia: { core: 'x' } } }) === true, 'a ledger entry -> has content');
    ok(L._storeHasContent({ notepad: '  hi  ' }) === true, 'non-empty notepad -> has content');
    ok(L._storeHasContent({ notepad: '    ' }) === false, 'whitespace-only notepad -> no content');
    ok(L._storeHasContent({ pins: [{ id: 'p1' }] }) === true, 'a pin -> has content');
    ok(L._storeHasContent({ ledger: [] }) === false, 'ledger as array (malformed) -> no content');
}

// ─── stripMetaBlocks: planned-intent meta must never become memory fact ───
section('stripMetaBlocks / buildPassageFromRange input hygiene');
L.__setSettings({ inputStripTags: ['plot_momentum', 'watchlist', 'edits'], inputStripHeaders: ['PLOT MOMENTUM', 'WATCHLIST'] });
{
    const prose = 'Stella raised one finger. Honami froze, toast halfway to her mouth.';
    const tagged = prose + '\n<plot_momentum>\nBoard notice arrives in three days; Silas runs cheat-or-prodigy bets.\n</plot_momentum>';
    const out = L.stripMetaBlocks(tagged);
    ok(out.includes('Stella raised one finger'), 'prose survives tag strip');
    ok(!out.includes('Board notice'), 'tag block content removed');

    const fenced = prose + '\n```watchlist\nAlaric | cold satisfaction | spin the narrative\n```';
    ok(!L.stripMetaBlocks(fenced).includes('Alaric |'), 'matching code fence removed');

    const headered = prose + '\n\n[WATCHLIST — active agendas]\nAlaric | ensure assessment confirms fraud narrative\nSilas | monetize gossip\n\nShe finally bit the toast.';
    const h = L.stripMetaBlocks(headered);
    ok(!h.includes('fraud narrative') && !h.includes('monetize gossip'), 'bracket-header section removed to blank line');
    ok(h.includes('She finally bit the toast'), 'prose after the blank line survives');

    const headerAtEnd = prose + '\n\nPLOT MOMENTUM: pending\nThe duel fallout compounds tomorrow.';
    ok(!L.stripMetaBlocks(headerAtEnd).includes('compounds tomorrow'), 'header block at end-of-text removed');

    const marked = 'The hall emptied. [EPISODE_END]';
    ok(L.stripMetaBlocks(marked) === 'The hall emptied.', 'EPISODE_END marker removed');

    const commented = 'He bowed. <!-- director: escalate next scene --> She did not.';
    const c = L.stripMetaBlocks(commented);
    ok(!c.includes('escalate') && c.includes('He bowed.') && c.includes('She did not.'), 'HTML comment removed, prose intact');

    const mathy = 'He whispered: 2<3, always. <b>Bold claim.</b>';
    ok(L.stripMetaBlocks(mathy) === mathy, 'non-configured tags and inequalities untouched');

    const edits = 'Sure.\n<edits>[{"id":5,"find":"x","replace":"y"}]</edits>';
    ok(L.stripMetaBlocks(edits) === 'Sure.', 'copilot edits block removed');
}
{
    const chat = [
        { is_user: true, mes: 'I check the notice board.' },
        { is_user: false, name: 'Narrator', mes: '<plot_momentum>Planned: expulsion threat</plot_momentum>' },
        { is_user: false, name: 'Narrator', mes: 'The board is bare.\n<watchlist>Silas | bets</watchlist>' },
    ];
    const passage = L.buildPassageFromRange(chat, 0, 2);
    ok(passage.includes('Player: I check the notice board.'), 'passage keeps player line');
    ok(!passage.includes('expulsion threat'), 'pure-meta message contributes nothing');
    ok(passage.split('\n').length === 2, 'pure-meta message skipped entirely (no empty speaker line)');
    ok(passage.includes('Narrator: The board is bare.'), 'mixed message keeps its prose');
    ok(!passage.includes('Silas | bets'), 'mixed message sheds its meta');
}

// ─── ledger currency: edit/swipe policy, decontamination, stamping, tiered GC ───
section('ledger currency — edits, swipes, rewind hygiene');
{
    ok(L._editRewindDecision(50, 40, 10) === 'ignore', 'edit past live pointer -> ignore (live pass ingests it)');
    ok(L._editRewindDecision(38, 40, 10) === 'rewind', 'recent edit within depth -> rewind');
    ok(L._editRewindDecision(40, 40, 10) === 'rewind', 'edit AT the live pointer -> rewind');
    ok(L._editRewindDecision(20, 40, 10) === 'deep', 'deep edit -> no re-derivation (canon-correction)');
    ok(L._editRewindDecision(38, 40, 0) === 'ignore', 'depth 0 disables the feature');
    ok(L._editRewindDecision(5, -1, 10) === 'ignore', 'no ledger yet -> ignore');
}
{
    const led = {
        Stella:  { core: 'x', _t: 35 },
        Silas:   { core: 'y', _t: 78 },
        Honami:  { core: 'z' },            // legacy, unstamped
    };
    const served = L._ledgerDroppingPast(led, 40);
    ok('Stella' in served, 'entry shaped before the target survives');
    ok(!('Silas' in served), 'entry shaped past the target dropped from serving copy');
    ok('Honami' in served, 'unstamped legacy entry kept (cannot judge)');
    ok(Object.keys(L._ledgerDroppingPast(null, 10)).length === 0, 'null ledger -> empty object');
}
{
    const tgt = {};
    L.mergeLedgerDeltas([{ name: 'Stella', state: 'furious' }], tgt, 41);
    ok(tgt.Stella && tgt.Stella._t === 41, 'merge stamps touched entry with the shaping turn');
    L.mergeLedgerDeltas([{ name: 'Stella', state: 'calm' }], tgt);
    ok(tgt.Stella._t === 41, 'merge without a turn leaves the stamp untouched');
}
{
    const mk = (key, at, tiered, group) => ({ key, at, tiered, group, bytes: 100 });
    const entries = [
        mk('ck::A::5', 5, true, 'ck::A'), mk('ck::A::30', 30, true, 'ck::A'),
        mk('ck::A::76', 76, true, 'ck::A'), mk('ck::A::80', 80, true, 'ck::A'),
        mk('ck::A::84', 84, true, 'ck::A'), mk('ck::A::88', 88, true, 'ck::A'),
        mk('bak::B::1', 1000, false, 'bak::B'), mk('bak::B::2', 2000, false, 'bak::B'),
    ];
    const evict = new Set(L._selectStorageEvictions(entries, 1, 4, 25));   // impossible budget: evict all unprotected
    ok(!evict.has('ck::A::88') && !evict.has('ck::A::84') && !evict.has('ck::A::80') && !evict.has('ck::A::76'), 'tiered: newest 4 checkpoints protected');
    ok(!evict.has('ck::A::5') && !evict.has('ck::A::30'), 'tiered: sparse far-back anchors protected (branch rewind targets)');
    ok(!evict.has('bak::B::2'), 'non-tiered group: newest protected');
    const evictOld = new Set(L._selectStorageEvictions(entries, 1, 4));   // legacy 3-arg call: old newest-only behavior
    ok(evictOld.has('ck::A::5'), 'backward compat: without sparseEvery, far-back anchors are not specially protected');
}

// ─── missing-core self-heal ───
section('missing-core detection + establish-order');
{
    const led = {
        Claire: { state: 'in the infirmary', arc: 'converging', threads: ['statement'] },   // the reported hole
        Jovan:  { core: 'guarded, deliberate; speaks plainly', state: 'cornered' },
        Aldith: { core: '   ', state: 'observing' },                                        // whitespace core = hole
        Renn:   { core: 'dutiful scribe' },
    };
    const missing = L._ledgerMissingCore(led);
    ok(missing.length === 2 && missing[0] === 'Aldith' && missing[1] === 'Claire', 'detects coreless + whitespace-core entries, sorted');
    ok(L._ledgerMissingCore({}).length === 0 && L._ledgerMissingCore(null).length === 0, 'empty/null ledger -> none');
    const notice = L._missingCoreNotice(missing);
    ok(notice.includes('Aldith, Claire') && notice.includes('establish their FULL core now'), 'notice names the holes and orders establishment');
    ok(notice.includes('do not wait for a "new trait"'), 'notice overrides the only-on-new-trait rule');
    ok(L._missingCoreNotice([]) === '', 'no holes -> no notice');
    const many = L._missingCoreNotice(['A','B','C','D','E','F','G','H','I','J']);
    ok(many.includes('(+2 more)') && !many.includes(' I,') && !many.includes('J.'), 'notice caps at 8 names');
}

// ─── dense checkpoint retention: delete-one cost = only the turns after it ───
section('every-turn checkpoints — retention shape');
{
    // Every ledgered turn 1..40 saved a checkpoint; retention keeps 16 recent dense + sparse anchors.
    const turns = Array.from({ length: 40 }, (_, i) => i + 1);
    const keeps = L._selectCheckpointKeeps(turns, 16, 25);
    for (let t2 = 25; t2 <= 40; t2++) ok(keeps.has(t2), `dense window: turn ${t2} has an exact restore point`);
    ok(keeps.has(25), 'sparse anchor at 25 retained for deep rewinds');
    ok(!keeps.has(12) || keeps.size <= 18, 'mid-history non-anchor turns pruned (storage capped)');
    // The practical claim: deleting message at turn N in the dense window finds a
    // checkpoint at exactly N-1 — replay = head - N turns only, zero cadence tax.
    const head = 40;
    for (const delAt of [40, 38, 30, 26]) {
        const target = delAt - 1;
        const nearest = Math.max(...[...keeps].filter(x => x <= target));
        ok(nearest === target, `delete at ${delAt}: nearest checkpoint is exactly ${target} (replay ${head - delAt} turn(s), was up to ${head - delAt + 4} with cadence 5)`);
    }
}

// ─── synthesized restore points (no snapshot that far back) ───
section('checkpoint synthesis from entry stamps');
{
    const led = { A: { core: 'x', _t: 20 }, B: { core: 'y', _t: 45 }, C: { core: 'legacy' } };
    const s1 = L._synthesizeCheckpoint(led, 30);
    ok(s1 && s1.synthetic === true && s1.atTurn === 30, 'synth: produces a synthetic snapshot at the ceiling');
    ok('A' in s1.ledger && !('B' in s1.ledger), 'synth: drops entries shaped past the ceiling, keeps earlier ones');
    ok('C' in s1.ledger, 'synth: unstamped legacy entry kept in a stamp-active ledger');
    ok(L._synthesizeCheckpoint({ C: { core: 'legacy' } }, 30) === null, 'synth: declines on an all-legacy ledger (no lineage to trust)');
    ok(L._synthesizeCheckpoint(led, -1) === null && L._synthesizeCheckpoint(null, 5) === null, 'synth: invalid inputs -> null');
}
ok(!SRC_FULL.includes('_lastCkptTurn'), 'global checkpoint cursor fully removed (per-chat store cursor everywhere)');

// ─── ledger eras: clear must never be resurrect-able ───
section('ledger eras + rebuild stamping (source contracts)');
ok(SRC_FULL.includes("era: (store.ledgerEra | 0)"), 'save: snapshots stamped with the chat store era');
ok(SRC_FULL.includes("((v.era | 0) !== (store.ledgerEra | 0))) continue;"), 'list: snapshots from other eras invisible to this chat');
ok(SRC_FULL.includes("store.ledgerEra = (store.ledgerEra | 0) + 1;"), 'clear: bumps the era (old snapshots retired, branches keep theirs)');
ok(SRC_FULL.includes("wipeLedgerData(store);\n        _ledgerQueue = [];\n        _ledgerGen++;") , 'clear: invalidates in-flight jobs and staged rebuilds — staging journal included (via wipeLedgerData)');
ok(SRC_FULL.includes("mergeLedgerDeltas(deltas, undefined, b.endIdx)"), 'backfill: merges stamped with chunk end turn');
ok(SRC_FULL.includes("sn.turnRange[1] === 'number') ? sn.turnRange[1] : undefined"), 'snippet path: merges stamped with scene end turn');
ok(SRC_FULL.includes('head snapshot: the very next edit/deletion restores instantly'), 'backfill completion: explicit head checkpoint');

// ─── live-pass busy retry + manual update ───
section('live pass: busy self-retry + Update now (source contracts)');
ok(SRC_FULL.includes("return 'busy';"), 'live pass: busy is a distinct tri-state, not a silent false');
ok(SRC_FULL.includes("else if (r === 'busy') _armLiveRetry();"), 'cadence gate: busy skips arm a self-retry');
ok(SRC_FULL.includes("const _LIVE_RETRY_MAX = 300;"), 'live retry patience outlasts any real model call (was 8 tries / 32s — shorter than one call on a phone)');
ok(SRC_FULL.includes("if (r === false) { _liveRetryLeft = 0; return; }   // nothing left to ingest"), 'live retry stops immediately when there is nothing to ingest (cannot spin)');
ok(/if \(--_liveRetryLeft > 0\) _armLiveRetry\(\);/.test(SRC_FULL), 'live retry keeps re-arming while the channel is busy');
ok(SRC_FULL.includes('_summarizeRetryLeft = 300;'), 'summarize retry never abandons a pending summarization');
ok(SRC_FULL.includes('_auditRetryLeft = 200;'), 'audit retry outlasts a slow model call');
ok(SRC_FULL.includes('_turnsSinceLive = 0;   // cadence is per-chat'), 'live cadence counter reset per chat');
ok(/_clearLiveRetry\(\);\s*\n\s*_clearAuditRetry\(\);/.test(SRC_FULL), 'retry: live + audit retries both cleared on chat change');
ok(SRC_FULL.includes("#sc_ledger_now"), 'Update-now button wired');
const H = require('fs').readFileSync(__dirname + '/settings.html', 'utf8');
ok(H.includes('id="sc_ledger_now"'), 'Update-now button present in settings UI');

// ─── Update-now visibility loop (source contracts) ───
section('manual pass feedback + failure surfacing');
ok(SRC_FULL.includes("queueLiveLedgerUpdate({ manual: true })"), 'button: passes manual flag');
ok(SRC_FULL.includes("staging: _staging, manual });"), 'job: carries the manual flag');
ok(SRC_FULL.includes("refreshed through turn ${job.liveEnd}"), 'manual success: completion toast with turn');
ok(SRC_FULL.includes("no character changes to record"), 'manual no-change: honest toast');
ok(SRC_FULL.includes("the pointer stayed put so nothing is skipped"), 'manual failure: surfaced with reason + retry hint');
ok(SRC_FULL.includes("_liveFailStreak === 3"), 'auto failures: streak breaker reports after 3 in a row');
ok(SRC_FULL.includes("if (job.live) _liveFailStreak = 0;"), 'streak resets on any successful live pass');
ok(SRC_FULL.includes("failures will be reported"), 'manual replay path: catch-up announced');

// ─── discard self-heal + surgical gen bump ───
section('stale-result discards heal themselves');
ok(SRC_FULL.includes("re-deriving automatically.');"), 'gen-mismatch discard: logged as self-healing');
ok(SRC_FULL.includes("That read was discarded — the chat changed (edit/delete/swipe) while it ran"), 'manual discard: user told why');
ok(SRC_FULL.includes("if (job.live) _armLiveRetry();"), 'discard: live retry armed — pointer catches up with no tap');
ok(SRC_FULL.includes("if (D > _liPre) _genStale = false;"), 'single delete above the live pointer: no gen bump, completed passes survive (judged against the PRE-deletion pointer)');
ok(SRC_FULL.includes("if (_genStale) _ledgerGen++;"), 'gen bump is conditional, not unconditional');

// ─── computeLedgerCast: the single injection-selection truth ───
section('computeLedgerCast — panel mirrors injection by construction');
{
    const mkE = (u) => ({ core: 'x', updatedAt: u });
    const led = { Jovan: mkE(50), Claire: mkE(40), Stella: mkE(30), Silas: mkE(20), Renn: mkE(10), Emilia: mkE(5) };
    const s = { ledgerMaxActive: 2, ledgerInjectRoster: true, ledgerRosterMax: 2, ledgerRosterRotate: false };
    const recent = 'jovan glanced at claire while stella watched'.toLowerCase();
    const cast = L.computeLedgerCast(led, s, recent, [], 0);
    ok(cast.shown.length === 2 && cast.shown[0].name === 'Jovan' && cast.shown[1].name === 'Claire', 'on-screen full entries: recency order, capped');
    ok(cast.roster.length === 2, 'roster: capped slice of the off-screen');
    // v5.71.0: on-screen overflow no longer falls to a bare roster line — it gets a
    // COMPACT entry. A person standing in the scene is never reduced to a name.
    ok(cast.compact.some(x => x.name === 'Stella'), 'on-screen overflow (Stella, beyond maxActive) gets a COMPACT entry, not a bare name');
    ok(!cast.roster.includes('Stella'), 'and is not demoted to the off-screen roster while she is in the room');
    ok(!cast.out.includes('Stella'), 'nobody on screen can land in "not injected"');
    ok(cast.out.every(n => !cast.roster.includes(n)), 'out and roster never overlap');
    ok(!cast.out.includes('Jovan') && !cast.out.includes('Claire'), 'injected never in out');
    const pinned = L.computeLedgerCast(led, s, recent, ['Emilia'], 0);
    ok(pinned.roster.includes('Emilia'), 'pins ride the roster ahead of rotation');
    const noRoster = L.computeLedgerCast(led, { ...s, ledgerInjectRoster: false }, recent, [], 0);
    ok(noRoster.roster.length === 0, 'roster off: no off-screen identity lines');
    ok(noRoster.shown.concat(noRoster.compact).some(x => x.name === 'Stella'), 'roster off still never drops someone who is on screen');
    const empty = L.computeLedgerCast({}, s, recent, [], 0);
    ok(empty.shown.length === 0 && empty.roster.length === 0 && empty.out.length === 0, 'empty ledger -> empty cast');
}

ok(SRC_FULL.split(/computeLedgerCast\(ledger, s, recentLower, getLedgerPins\(\), _rosterTick, /).length >= 4, 'panel + injection + audit all call the SAME selector with the same inputs incl. the per-message window — no duplicated selection logic');
ok(SRC_FULL.includes('Injected this turn:'), 'panel header states the injection count');
ok(SRC_FULL.includes('not injected this turn'), 'non-injected entries say so explicitly');

// ─── ledger self-audit ───
section('ledger self-audit — targets, evidence, scope');
{
    const mk = (a) => (a === undefined ? { core: 'x' } : { core: 'x', _a: a });
    const led = { Jovan: mk(30), Claire: mk(), Stella: mk(10), Silas: mk(25), Renn: mk(5) };
    const t1 = L._ledgerAuditTargets(led, ['Jovan'], 3);
    ok(t1[0] === 'Jovan', 'targets: injected characters audited first (their errors are live)');
    ok(t1[1] === 'Claire', 'targets: never-audited entry next (_a absent = -1)');
    ok(t1[2] === 'Renn', 'targets: then least-recently-audited');
    ok(L._ledgerAuditTargets(led, [], 2).length === 2, 'targets: capped per run');
    ok(L._ledgerAuditTargets({}, [], 4).length === 0, 'targets: empty ledger -> none');
    const t2 = L._ledgerAuditTargets(led, ['Jovan'], 3);
    ok(JSON.stringify(t1) === JSON.stringify(t2), 'targets: deterministic for identical input');
}
{
    L.__setSettings({ inputStripTags: ['plot_momentum'], inputStripHeaders: [] });
    const chat = [
        { is_user: true, mes: 'I greet Claire at the gate.' },
        { is_user: false, name: 'Narrator', mes: 'Silas counts coins, alone.' },
        { is_user: false, name: 'Narrator', mes: 'Claire studies the notice.\n<plot_momentum>PLANNED: Board summons Claire</plot_momentum>' },
        { is_user: false, name: 'Narrator', mes: 'Rain on the quad.' },
    ];
    const ci = L._pickEvidenceIndices(chat, 'Claire', 6);
    ok(JSON.stringify(ci) === '[0,2]', 'evidence: finds every message featuring the character');
    ok(JSON.stringify(L._pickEvidenceIndices(chat, 'Claire', 1)) === '[2]', 'evidence: keeps only the most recent K appearances');
    ok(L._pickEvidenceIndices(chat, 'Emilia', 6).length === 0, 'evidence: absent character -> no appearances');

    const ev = L.buildLedgerAuditEvidence(chat, ['Claire', 'Silas'], 6, 9000);
    ok(ev.includes('#0 Player: I greet Claire') && ev.includes('#1 Narrator: Silas counts coins'), 'evidence: unions the audited characters\' appearances');
    ok(ev.indexOf('#0') < ev.indexOf('#1') && ev.indexOf('#1') < ev.indexOf('#2'), 'evidence: chronological order');
    ok(!ev.includes('PLANNED: Board summons'), 'evidence: planner meta stripped — plans are not events the audit can confirm');
    ok(!ev.includes('Rain on the quad'), 'evidence: messages without the audited cast excluded');

    // Budget pressure (the cap floors at 500, so exercise it with real-sized messages).
    const big = [
        { is_user: false, name: 'N', mes: 'Claire waited. ' + 'a'.repeat(400) },
        { is_user: false, name: 'N', mes: 'Claire moved. ' + 'b'.repeat(400) },
    ];
    const tight = L.buildLedgerAuditEvidence(big, ['Claire'], 6, 500);
    ok(tight.includes('b'.repeat(400)) && !tight.includes('a'.repeat(400)), 'evidence: under budget pressure the NEWEST evidence wins');
    ok(L.buildLedgerAuditEvidence(big, ['Claire'], 6, 99999).includes('a'.repeat(400)), 'evidence: with budget, older appearances included too');
}
ok(SRC_FULL.includes('const inScope = deltas.filter'), 'audit: corrections outside the audited set are ignored (scope guard)');
ok(SRC_FULL.includes("ledger[key]._a = stampAt"), 'audit: every audited entry stamped so the round-robin advances');
ok(SRC_FULL.includes("if (_ledgerGen !== startGen)") && SRC_FULL.includes("if (_chatEpoch !== startEpoch) { log('Ledger audit"), 'audit: epoch + generation guards before landing');
ok(SRC_FULL.includes('absence is not contradiction'), 'audit prompt: never strips long-standing traits the window merely omits');
ok(SRC_FULL.includes('KNOWLEDGE THE CHARACTER NEVER RECEIVED'), 'audit prompt: epistemic-leak check');
ok(SRC_FULL.includes('PLANNED, NOT PLAYED'), 'audit prompt: planned-but-unplayed check');
ok(SRC_FULL.includes('INFERENCE HARDENED INTO FACT'), 'audit prompt: inference-as-certainty check');
ok(SRC_FULL.includes('LEAVE IT ALONE'), 'audit prompt: unjudgeable claims are left alone');
ok(SRC_FULL.includes('maybeAuditLedger();'), 'audit: wired into the per-turn cadence');

section('audit corrections land at the entry\'s own turn — _t is never falsified');
{
    // The old behavior stamped every correction at liveIdx ("now"). _t is what the
    // roster reads as "last seen (turn N)" and what _ledgerDroppingPast /
    // _synthesizeCheckpoint judge by — so auditing an off-screen character told the
    // storyteller they were "last seen" NOW, and a branch below the audit turn
    // dropped their entire entry despite legitimate older history. Corrections now
    // merge per-entry at the entry's existing _t (evidence is drawn solely from the
    // character's own past appearances, so old _t is the temporally honest stamp).
    const store = {
        ledgerLiveIdx: 200, ledgerNotesFrom: 0,
        ledger: { 'Stella': { core: 'sharp, guarded', state: 'left for the capital with unproven intent', arc: 'wary of Jovan', _t: 90, updatedAt: 4 } },
        ledgerNotes: [ { t: 90, name: 'Stella', at: 4, core: 'sharp, guarded', state: 'left for the capital with unproven intent', arc: 'wary of Jovan' } ],
    };
    L.__setStore(store);
    // Simulate exactly what auditLedgerEntries now does with a correction.
    const d = { name: 'Stella', state: 'left for the capital' };
    const k = L.resolveLedgerKey(store.ledger, d.name);
    const at = (store.ledger[k] && typeof store.ledger[k]._t === 'number') ? store.ledger[k]._t : 200;
    const changed = L.mergeLedgerDeltas([d], undefined, at);
    eq(changed, 1, 'the correction lands');
    eq(store.ledger['Stella']._t, 90, "the entry's last-shaped turn is preserved — the audit is not a story event");
    ok(store.ledger['Stella'].state === 'left for the capital', 'the corrected content is live');
    ok(store.ledgerNotes.some(n => n.t === 90 && n.state === 'left for the capital'), 'the correction is journaled AT the entry\'s own turn');
    const kept = L._ledgerDroppingPast(store.ledger, 150);
    ok(kept['Stella'] !== undefined, 'a branch below the audit turn KEEPS the entry (old behavior dropped it entirely)');
    const rewound = L.foldLedgerNotes(store.ledgerNotes, 150);
    ok(rewound['Stella'] && rewound['Stella'].state === 'left for the capital', 'a fold-rewind below the audit turn keeps the correction (it re-describes turn-90 truth)');
    // Witness: the old single-batch merge at liveIdx fails all three.
    const w = { ledgerLiveIdx: 200, ledgerNotesFrom: 0,
        ledger: { 'Stella': { core: 'sharp, guarded', state: 'left for the capital with unproven intent', _t: 90, updatedAt: 4 } },
        ledgerNotes: [ { t: 90, name: 'Stella', at: 4, core: 'sharp, guarded', state: 'left for the capital with unproven intent' } ] };
    L.__setStore(w);
    L.mergeLedgerDeltas([{ name: 'Stella', state: 'left for the capital' }], undefined, 200);
    eq(w.ledger['Stella']._t, 200, 'witness: the old stamp claimed an absent character was shaped NOW');
    ok(L._ledgerDroppingPast(w.ledger, 150)['Stella'] === undefined, 'witness: and a branch to 150 dropped her whole entry');
}
ok(/const at = \(ledger\[k\] && typeof ledger\[k\]\._t === 'number'\) \? ledger\[k\]\._t : liveIdx;/.test(SRC_FULL), 'audit: corrections merged per-entry at the entry\'s own _t');
ok(!SRC_FULL.includes('mergeLedgerDeltas(fresh, undefined, liveIdx)'), 'audit: the batch merge that stamped every correction at "now" is gone');

// ─── audit must never cost speed or safety ───
section('audit concurrency: exclusive scribe channel, freshness first');
ok(SRC_FULL.includes("if (_llmChannelBusy()) { setTimeout(() => { processLedgerQueue(); }, 2000); return; }"), 'scribe queue defers while ANY pass holds the channel (jobs kept, not dropped)');
ok(/queueLiveLedgerUpdate[\s\S]{0,400}_llmChannelBusy\(\) \|\| _ledgerQueue\.length > 0\) return 'busy';/.test(SRC_FULL), 'live pass yields to ANY pass holding the LLM channel');
ok(SRC_FULL.includes("if (_turns.length && _computeLiveLedgerRange(store.summarizedUpTo, store.ledgerLiveIdx, _turns[_turns.length - 1].index)) return 'busy';"), 'audit yields: never runs while story is un-ingested');
ok(SRC_FULL.includes("if (s.ledgerLiveUpdate !== false) {"), 'yield skipped when the live pass is off (pointer would lag forever)');
ok(SRC_FULL.includes('const seenRev = new Map();'), 'audit snapshots each entry revision before thinking');
ok(SRC_FULL.includes('seenRev.get(k) === rev;'), 'stale corrections dropped — newer state never clobbered by an older audit');
ok(SRC_FULL.includes('for (const d of fresh) {'), 'only fresh corrections merge (per-entry, at each entry\'s own turn)');

// ─── deep audit: event coverage + per-chat lifecycle ───
section('deep audit — event wiring, timer lifecycle, reset coverage');
ok(/if \(event_types\.MESSAGE_SWIPED\) eventSource\.on\(event_types\.MESSAGE_SWIPED, onMessageSwiped\);\s*\n\s*\/\/[^\n]*\n(\s*\/\/[^\n]*\n)*\s*if \(event_types\.MESSAGE_UPDATED\)/.test(SRC_FULL), 'MESSAGE_UPDATED registered unconditionally — no longer shadowed by an else-if on SWIPED');
ok(!/else if \(event_types\.MESSAGE_UPDATED\)/.test(SRC_FULL), 'the else-if that hid programmatic edits is gone');
ok(SRC_FULL.includes('clearTimeout(_ledgerEditTimer);          // same class'), 'chat change clears the armed ledger edit-rewind (would rewind the WRONG chat)');
ok(/_ledgerEditTimer = null;\s*\n\s*_ledgerEditMin = Infinity;/.test(SRC_FULL), 'chat change resets the coalesced edit floor with the timer');
ok(SRC_FULL.includes('if (_chatEpoch !== _epochAtArm) { _ledgerEditMin = Infinity; return; }'), 'edit debounce carries an epoch belt — fires only for the chat that armed it');
for (const k of ['ledgerEditRewindDepth', 'ledgerAuditEnabled', 'ledgerAuditEveryTurns', 'ledgerAuditMaxPerRun', 'ledgerAuditEvidenceMsgs', 'ledgerAuditEvidenceChars', 'ledgerAuditSystemPrompt', 'ledgerAuditUserPrompt']) {
    ok(SRC_FULL.includes(`s.${k} = defaultSettings.${k};`), `reset-to-defaults covers ${k}`);
}
// Internal bookkeeping must never reach the model.
{
    const line = L.formatLedgerEntry('Claire', { core: 'guarded', state: 'waiting', arc: 'a', threads: ['t'], _t: 41, _a: 38, updatedAt: 123 }, 600);
    ok(!line.includes('_t') && !line.includes('_a') && !line.includes('41') && !line.includes('updatedAt'), 'injection text carries no internal stamps (_t/_a/updatedAt)');
    ok(line.startsWith('Claire — Nature: guarded'), 'injection text is the character, nothing else');
}

// ─── shared surnames: siblings must not mark each other on screen ───
section('ambiguous name tokens — the sibling false-positive');
{
    const cast = ['Jovan Argent', 'Claire Argent', 'Stella Marchetti', 'Silas'];
    const amb = L._ambiguousTokens(cast);
    ok(amb.has('argent'), 'shared surname detected as ambiguous');
    ok(!amb.has('jovan') && !amb.has('claire'), 'distinct given names stay usable');
    ok(!amb.has('marchetti'), 'unshared surname stays usable');
    ok(L._ambiguousTokens(['Stella', 'Silas']).size === 0, 'single-token names contribute no ambiguity');
    ok(L._ambiguousTokens([]).size === 0 && L._ambiguousTokens(null).size === 0, 'empty/null cast -> no ambiguity');

    const cl = L.characterAliases('Claire Argent', amb);
    ok(cl.includes('Claire Argent') && cl.includes('Claire'), 'full name and given name remain aliases');
    ok(!cl.includes('Argent'), 'ambiguous surname dropped as a standalone alias');
    ok(L.characterAliases('Claire Argent').includes('Argent'), 'without an ambiguity set, behaviour is unchanged (backward compatible)');
    ok(L.characterAliases('Stella Marchetti', amb).includes('Marchetti'), 'unshared surname still matches');
    ok(JSON.stringify(L.characterAliases('Silas', amb)) === '["Silas"]', 'single-token name unaffected');
}
{
    const led = {
        'Jovan Argent':  { core: 'a', updatedAt: 3 },
        'Claire Argent': { core: 'b', updatedAt: 2 },
        'Stella Marchetti': { core: 'c', updatedAt: 1 },
    };
    const s = { ledgerMaxActive: 6, ledgerInjectRoster: true, ledgerRosterMax: 12, ledgerRosterRotate: false };
    const only = L.computeLedgerCast(led, s, 'jovan argent stepped onto the platform.', [], 0).shown.map(x => x.name);
    ok(only.includes('Jovan Argent'), 'the sibling who IS on screen is injected');
    ok(!only.includes('Claire Argent'), 'THE BUG: the absent sibling is no longer marked on screen by a shared surname');

    const byGiven = L.computeLedgerCast(led, s, 'claire studied the notice board.', [], 0).shown.map(x => x.name);
    ok(byGiven.includes('Claire Argent') && !byGiven.includes('Jovan Argent'), 'each sibling still detected by their own given name');

    const byFull = L.computeLedgerCast(led, s, 'claire argent said nothing.', [], 0).shown.map(x => x.name);
    ok(byFull.includes('Claire Argent'), 'full name still detects');

    const bySurname = L.computeLedgerCast(led, s, 'marchetti raised a hand.', [], 0).shown.map(x => x.name);
    ok(bySurname.includes('Stella Marchetti'), 'an UNSHARED surname still detects — the fix is surgical, not blanket');

    const both = L.computeLedgerCast(led, s, 'jovan and claire argued in the hall.', [], 0).shown.map(x => x.name);
    ok(both.includes('Jovan Argent') && both.includes('Claire Argent'), 'both siblings detected when both are named');
}
{
    // Audit evidence must not treat a sibling's scenes as this character's evidence,
    // or the auditor would "verify" Claire against text she never appeared in.
    const chat = [
        { is_user: false, name: 'N', mes: 'Jovan Argent stepped onto the platform.' },
        { is_user: false, name: 'N', mes: 'Claire waited by the arch.' },
    ];
    const amb = L._ambiguousTokens(['Jovan Argent', 'Claire Argent']);
    ok(JSON.stringify(L._pickEvidenceIndices(chat, 'Claire Argent', 6, amb)) === '[1]', "evidence: only Claire's own scenes");
    ok(JSON.stringify(L._pickEvidenceIndices(chat, 'Jovan Argent', 6, amb)) === '[0]', "evidence: only Jovan's own scenes");
    ok(L._pickEvidenceIndices(chat, 'Claire Argent', 6).length === 2, 'without the ambiguity set the old over-match is reproducible (regression witness)');
}

// ─── THE gate that was missing: this file must parse as an ES MODULE ───
// SillyTavern loads index.js as an ES module. `node --check index.js` parses it as
// CommonJS and silently ACCEPTS duplicate top-level `let` declarations — which is how
// a redeclared _auditActive shipped in v5.58.0 and left the extension unloadable
// through v5.60.0. The suite now proves the real parse on every run.
section('module integrity');
{
    const { execFileSync } = require('child_process');
    const os = require('os');
    const path = require('path');
    const tmp = path.join(os.tmpdir(), 'sc_esm_gate_' + process.pid + '.mjs');
    let esmOk = true, esmErr = '';
    try {
        require('fs').writeFileSync(tmp, SRC_FULL);
        execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
    } catch (e) {
        esmOk = false;
        esmErr = String((e && e.stderr) || (e && e.message) || '').split('\n').map(x => x.trim()).filter(Boolean).find(x => /Error/.test(x)) || 'parse failed';
    } finally { try { require('fs').unlinkSync(tmp); } catch (_) {} }
    ok(esmOk, 'index.js parses as an ES MODULE (the way SillyTavern loads it)' + (esmOk ? '' : ' — ' + esmErr));
}
ok(/function _llmChannelBusy\(\)[\s\S]{0,400}isSummarizing \|\| _ledgerActive \|\| _auditActive \|\| _ledgerAuditActive \|\| _continuityActive \|\| _editRecheckActive/.test(SRC_FULL), 'one channel predicate covers every LLM pass');
ok(!/let _auditActive[\s\S]*let _auditActive/.test(SRC_FULL), 'the sister auditor and the ledger auditor no longer share a flag name');
ok(SRC_FULL.includes('let _ledgerAuditActive = false;'), 'ledger audit owns a distinct flag');
ok(/processContinuityQueue\(\) \{\s*\n\s*if \(_continuityActive\) return;\s*\n\s*if \(_llmChannelBusy\(\)\)/.test(SRC_FULL), 'continuity queue joins the exclusive channel');
ok(/processAuditQueue\(\) \{\s*\n\s*if \(_auditActive\) return;\s*\n\s*if \(_llmChannelBusy\(\)\)/.test(SRC_FULL), 'sister auditor joins the exclusive channel');
ok(SRC_FULL.includes("if (_chatEpoch !== _epoch) { log('edit-recheck: chat switched — abandoning the remaining snippet(s).'); break; }"), 'edit re-check stops spending LLM calls on a chat that is gone');

// ─── per-turn notes: the ledger's own history ───
section('ledger notes — fold, rewind by reading fewer notes, history');
{
    // Claire's real shape: Nature written once and never touched again, Now moving
    // constantly, Arc moving occasionally, threads replaced wholesale.
    const notes = [
        { t: 12, name: 'Claire Argent', at: 1, core: 'guarded, precise; grips her wrist when tense', state: 'in the corridor' },
        { t: 30, name: 'Claire Argent', at: 2, state: 'at the gallery rail', arc: 'protective older sister', threads: ['get Jovan out before the crowd forms'] },
        { t: 47, name: 'Claire Argent', at: 3, state: 'waiting by the arch', threads: ['shape the statement', 'tell him about Ivar'] },
        { t: 47, name: 'Jovan Argent', at: 4, core: 'deliberate, plain-spoken', state: 'on the platform' },
    ];
    const now = L.foldLedgerNotes(notes, Infinity);
    ok(now['Claire Argent'].core === 'guarded, precise; grips her wrist when tense', 'Nature survives from turn 12 — never rewritten, still true');
    ok(now['Claire Argent'].state === 'waiting by the arch', 'Now takes the newest note');
    ok(now['Claire Argent'].arc === 'protective older sister', 'Arc keeps turn 30 (nothing moved it since)');
    ok(JSON.stringify(now['Claire Argent'].threads) === '["shape the statement","tell him about Ivar"]', 'threads replaced wholesale by the newest list');
    ok(now['Claire Argent']._t === 47, 'entry stamped with the last turn that touched it');
    ok(!!now['Jovan Argent'], 'every character folds independently');

    // THE branch case, per field.
    const at20 = L.foldLedgerNotes(notes, 20);
    ok(at20['Claire Argent'].core.startsWith('guarded'), 'branch to 20: Nature from turn 12 still hers');
    ok(at20['Claire Argent'].state === 'in the corridor', 'branch to 20: Now reverts to turn 12 exactly');
    ok(at20['Claire Argent'].arc === undefined, 'branch to 20: Arc had not been written yet — correctly absent');
    ok(!at20['Jovan Argent'], 'branch to 20: a character not yet seen does not exist');
    const at35 = L.foldLedgerNotes(notes, 35);
    ok(at35['Claire Argent'].state === 'at the gallery rail' && at35['Claire Argent'].arc === 'protective older sister', 'branch to 35: exactly turn 30 state, per field');
    ok(JSON.stringify(L.foldLedgerNotes(notes, 100)) === JSON.stringify(L.foldLedgerNotes(notes, Infinity)), 'folding past the end == folding everything');
    ok(Object.keys(L.foldLedgerNotes([], 50)).length === 0 && Object.keys(L.foldLedgerNotes(null, 50)).length === 0, 'empty/null notes -> empty page');

    const hist = L.ledgerHistoryFor(notes, 'Claire Argent');
    ok(hist.length === 3 && hist[0].t === 12 && hist[2].t === 47, "the wiki view: a character's own timeline, oldest first");
    ok(L.ledgerHistoryFor(notes, 'Nobody').length === 0, 'history of an unknown character is empty');
}
{
    // Rewind by reading fewer notes — the reported turn-100 -> turn-50 case.
    const store = { ledger: {}, ledgerLiveIdx: 100, ledgerNotesFrom: 0, ledgerNotes: [] };
    for (let i = 1; i <= 100; i++) store.ledgerNotes.push({ t: i, name: 'Claire Argent', at: i, state: 'scene ' + i });
    store.ledgerNotes.push({ t: 4, name: 'Claire Argent', at: 0, core: 'guarded, precise' });
    L.__setStore(store);
    ok(L.notesCover(store, 50) === true, 'notes reach back to turn 50');
    ok(L.rewindLedgerFromNotes(50) === true, 'rewind to 50 succeeds with ZERO model calls');
    ok(store.ledger['Claire Argent'].state === 'scene 50', 'the page is exactly what it was at turn 50');
    ok(store.ledger['Claire Argent'].core === 'guarded, precise', 'Nature written at turn 4 survives the rewind');
    ok(store.ledgerLiveIdx === 50, 'the pointer follows the rewind');
    ok(store.ledgerNotes.every(n => n.t <= 50), 'notes past the branch point are dropped');
    ok(store.ledgerRebuild === null && store.ledgerStaging === null, 'no rebuild is scheduled — there is nothing to rebuild');
}
{
    // Legacy chat: notes only become authoritative from their base.
    const store = { ledger: { Stella: { core: 'brash', updatedAt: 5 } }, ledgerLiveIdx: 80 };
    L.__setStore(store);
    L.ensureLedgerNotes(store);
    ok(store.ledgerNotesFrom === 80, 'an existing page is adopted as a base note at the current pointer');
    ok(store.ledgerNotes.length === 1 && store.ledgerNotes[0].base === true && store.ledgerNotes[0].core === 'brash', 'the base note carries the page verbatim — no history lost');
    ok(L.notesCover(store, 90) === true, 'rewinds above the base fold exactly');
    ok(L.notesCover(store, 40) === false, 'rewinds below the base honestly decline — the old path handles them');
    ok(L.rewindLedgerFromNotes(40) === false, 'declining is explicit, never a wrong answer');
    const fresh = { ledger: {}, ledgerLiveIdx: -1 };
    L.ensureLedgerNotes(fresh);
    ok(fresh.ledgerNotesFrom === 0, 'a NEW chat bases at turn 0 — exactly foldable forever');
}
{
    // Appending: only what the scribe actually said gets recorded.
    const store = { ledger: {}, ledgerLiveIdx: -1 };
    L.__setStore(store);
    L.ensureLedgerNotes(store);
    L.mergeLedgerDeltas([{ name: 'Claire Argent', core: 'guarded', state: 'corridor' }], undefined, 12);
    L.mergeLedgerDeltas([{ name: 'Claire Argent', state: 'the arch' }], undefined, 47);
    ok(store.ledgerNotes.length === 2, 'one note per scribe reply per character');
    ok(store.ledgerNotes[1].state === 'the arch' && store.ledgerNotes[1].core === undefined, 'the note holds ONLY the changed field — that is why it is small');
    ok(store.ledger['Claire Argent'].core === 'guarded', 'the materialized page keeps the unchanged Nature');
    ok(JSON.stringify(L.foldLedgerNotes(store.ledgerNotes, Infinity)['Claire Argent'].state) === '"the arch"', 'fold(notes) reproduces the live page');
    const staged = {};
    const n0 = store.ledgerNotes.length;
    L.mergeLedgerDeltas([{ name: 'Claire Argent', state: 'staged only' }], staged, 48);
    ok(store.ledgerNotes.length === n0, 'a STAGED merge writes no notes (it is not the live timeline)');
}
{
    // Growth is bounded without losing truth.
    const store = { ledger: {}, ledgerLiveIdx: 2000, ledgerNotesFrom: 0, ledgerNotes: [] };
    for (let i = 1; i <= 1600; i++) store.ledgerNotes.push({ t: i, name: 'Claire Argent', at: i, state: 's' + i });
    L.__setStore(store);
    L.compactLedgerNotes(store);
    ok(store.ledgerNotes.length < 1600, 'over the cap, old notes compact into a base');
    ok(store.ledgerNotesFrom === 2000 - 300, 'exact history is retained for the recent tail');
    ok(L.foldLedgerNotes(store.ledgerNotes, Infinity)['Claire Argent'].state === 's1600', 'compaction preserves the current page exactly');
}

// ─── the wiki view ───
section('per-character history view');
{
    const store = {
        ledgerNotesFrom: 0,
        ledgerNotes: [
            { t: 12, name: 'Claire Argent', at: 1, core: 'guarded, precise', state: 'in the corridor' },
            { t: 30, name: 'Claire Argent', at: 2, state: 'at the gallery rail', arc: 'protective older sister' },
            { t: 47, name: 'Claire Argent', at: 3, threads: ['shape the statement'] },
            { t: 47, name: 'Jovan Argent', at: 4, state: 'on the platform' },
        ],
    };
    const h = L._historyHtml(store, 'Claire Argent');
    ok(h.includes('turn 12') && h.includes('turn 30') && h.includes('turn 47'), 'history lists every turn that changed them');
    ok(!h.includes('on the platform'), "another character's notes never appear in this history");
    ok(h.indexOf('turn 12') < h.indexOf('turn 30') && h.indexOf('turn 30') < h.indexOf('turn 47'), 'oldest first — a development timeline, not a dump');
    ok(h.includes('Nature') && h.includes('guarded, precise'), 'the turn a trait was established is visible');
    ok((h.match(/Nature/g) || []).length === 1, 'Nature appears once — at the turn it was written, not repeated forever');
    ok(h.includes('Exact history kept from turn 0'), 'the view states how far back it is authoritative');
    const empty = L._historyHtml({ ledgerNotes: [], ledgerNotesFrom: 0 }, 'Nobody');
    ok(empty.includes('No recorded history yet'), 'a character with no notes says so plainly');
    ok(L._historyHtml({}, 'Claire Argent').includes('No recorded history') || L._historyHtml({}, 'Claire Argent').includes('unavailable'), 'a malformed store never throws');
    const based = L._historyHtml({ ledgerNotesFrom: 80, ledgerNotes: [{ t: 80, name: 'Stella', at: 1, base: true, core: 'brash' }] }, 'Stella');
    ok(based.includes('carried over'), 'a migrated base note is labelled as carried over, not as a turn that happened');
}
ok(SRC_FULL.includes("$(document).on('click', '.sc-ledger-hist'"), 'history toggle is wired to the card button');

ok(/_llmChannelBusy\(\)[\s\S]{0,300}_autoRecallBusy/.test(SRC_FULL), 'verbatim recall is enrolled in the exclusive channel (it calls callSummarizer too)');
ok(!/let _recallRemaining=0; let _lastRecallText=''; let _autoRecallBusy=false;/.test(SRC_FULL), 'the recall flag no longer sits below the predicate that reads it (TDZ)');
ok(SRC_FULL.indexOf('let _autoRecallBusy = false;') > 0 && SRC_FULL.indexOf('let _autoRecallBusy = false;') < SRC_FULL.indexOf('function _llmChannelBusy'), 'recall flag is DECLARED BEFORE the predicate that reads it — no temporal dead zone');
ok(SRC_FULL.includes("if (_llmChannelBusy()) {\n        if (opts.silent) { log('auto-recall: channel busy — skipping this turn.'); return; }"), 'auto-recall skips a busy channel; manual recall explains itself');
ok(SRC_FULL.includes("if(s.recallAuto && s.enabled && !_llmChannelBusy()){"), 'the auto-recall trigger checks the channel, not just its own flag');

// ─── deleting one message: the notes ARE the rewind ───
section('single deletion — notes reindexed, page refolded, no replay');
{
    const store = {
        ledgerLiveIdx: 9, summarizedUpTo: -1, layers: [], ledgerNotesFrom: 0,
        ledger: {},
        ledgerNotes: [
            { t: 3, name: 'Claire Argent', at: 1, core: 'guarded', state: 'corridor' },
            { t: 5, name: 'Claire Argent', at: 2, state: 'the arch' },        // this turn gets deleted
            { t: 7, name: 'Claire Argent', at: 3, threads: ['statement'] },
        ],
    };
    L.__setStore(store);
    L.reindexAfterDeletion(store, 5);
    ok(!store.ledgerNotes.some(n => n.t === 5), "the deleted turn's own note is gone with it");
    ok(store.ledgerNotes.some(n => n.t === 6 && Array.isArray(n.threads)), 'later notes shifted down by one — still aligned with the chat');
    ok(store.ledgerNotes.some(n => n.t === 3 && n.core === 'guarded'), 'earlier notes untouched');
    ok(store.ledgerLiveIdx === 8, 'the live pointer shifted with them');
    ok(store.ledger['Claire Argent'].state === 'corridor', 'THE REWIND: Now reverted to before the deleted turn — instantly, with no model call');
    ok(store.ledger['Claire Argent'].core === 'guarded', 'unrelated fields survive the deletion');
    ok(JSON.stringify(store.ledger['Claire Argent'].threads) === '["statement"]', 'a later turn\'s contribution survives');
}
{
    // Deleting a turn the ledger never read must change nothing but indices.
    const store = {
        ledgerLiveIdx: 4, summarizedUpTo: -1, layers: [], ledgerNotesFrom: 0, ledger: {},
        ledgerNotes: [{ t: 3, name: 'Stella', at: 1, core: 'brash', state: 'in the hall' }],
    };
    L.__setStore(store);
    L.reindexAfterDeletion(store, 9);
    ok(store.ledger['Stella'] && store.ledger['Stella'].state === 'in the hall', 'deleting an un-read turn leaves the page intact');
    ok(store.ledgerNotes[0].t === 3 && store.ledgerLiveIdx === 4, 'nothing shifts below the deletion point');
}
{
    // A base note is a snapshot of everything up to its turn, not a record OF it.
    const store = {
        ledgerLiveIdx: 8, summarizedUpTo: -1, layers: [], ledgerNotesFrom: 5, ledger: {},
        ledgerNotes: [{ t: 5, name: 'Silas', at: 1, base: true, core: 'showman' }],
    };
    L.__setStore(store);
    L.reindexAfterDeletion(store, 5);
    ok(store.ledgerNotes.length === 1 && store.ledgerNotes[0].t === 4, 'a base note shifts instead of vanishing — carried-over history is never lost');
    ok(store.ledger['Silas'] && store.ledger['Silas'].core === 'showman', 'and its content survives');
}
ok(SRC_FULL.includes("} else if (!_bulkTrim && newLen > 0) {"), 'a single deletion is handled, not skipped');
ok(!SRC_FULL.includes('deletion (delta === 1) skips this and stays INSTANT'), 'the obsolete "skip the rewind" rationale is gone');

// ─── clearing the ledger must survive the next deletion ───
// v5.98.0 regression: every clear path wiped only the PAGE. The journal stayed
// authoritative from its base turn, so the very next single-message deletion
// ran reindexAfterDeletion → notesCover → foldLedgerNotes and re-materialized
// the entire "cleared" cast. wipeLedgerData kills page + journal + pointer
// together (and retires the era so old checkpoints can't restore either).
section('wipeLedgerData — a clear that no deletion can undo');
{
    const store = {
        ledgerLiveIdx: 40, summarizedUpTo: 30, layers: [], ledgerNotesFrom: 0, ledgerEra: 2,
        ledger: { 'Claire Argent': { core: 'guarded', state: 'the arch', updatedAt: 5 } },
        ledgerNotes: [
            { t: 3, name: 'Claire Argent', at: 1, core: 'guarded' },
            { t: 20, name: 'Claire Argent', at: 2, state: 'the arch' },
        ],
        ledgerStaging: { x: 1 }, ledgerStagingNotes: [{ t: 1, name: 'Z' }], ledgerRebuild: { y: 2 }, _ckptLast: 12,
    };
    L.__setStore(store);
    L.wipeLedgerData(store);
    ok(Object.keys(store.ledger).length === 0, 'the page is empty');
    ok(Array.isArray(store.ledgerNotes) && store.ledgerNotes.length === 0, 'the journal is empty too — nothing left to fold back');
    ok(store.ledgerNotesFrom === undefined, 'the journal base is ABSENT, so notesCover answers "no journal"');
    ok(store.ledgerLiveIdx === -1, 'the live pointer restarts from scratch');
    ok(store.ledgerEra === 3, 'the era advanced — old checkpoints are retired');
    ok(store.ledgerStaging === null && store.ledgerStagingNotes === null && store.ledgerRebuild === null && store._ckptLast === -1, 'staging/rebuild/checkpoint state of the old ledger is gone');
    // The kill shot: the live pass advances the pointer past the journal's old
    // base (exactly what a few new turns do), and THEN a message is deleted.
    // With the journal dead, the refold has nothing to draw on.
    store.ledgerLiveIdx = 25;
    L.reindexAfterDeletion(store, 10);
    ok(Object.keys(store.ledger).length === 0, 'KILL SHOT: a deletion after the clear does NOT resurrect the ledger');
    ok(!L.notesCover(store, store.ledgerLiveIdx), 'notesCover cannot vouch for a journal that no longer exists');
}
{
    // The three clear paths must all go through the one primitive — a hand-rolled
    // subset is exactly how the bug shipped. Structural guard, not behavior.
    const clearBtn = /#sc_ledger_clear[\s\S]{0,900}?wipeLedgerData\(store\)/.test(SRC_FULL);
    const slashClear = /name: 'sc-clear'[\s\S]{0,900}?wipeLedgerData\(store\)/.test(SRC_FULL);
    const clearAll = /#sc_clear_all[\s\S]{0,1200}?wipeLedgerData\(store\)/.test(SRC_FULL);
    ok(clearBtn, '#sc_ledger_clear routes through wipeLedgerData');
    ok(slashClear, '/sc-clear routes through wipeLedgerData');
    ok(clearAll, '#sc_clear_all routes through wipeLedgerData');
    ok(!/store\.ledger = \{\};\s*\n\s*store\.ledgerLiveIdx = -1;/.test(SRC_FULL), 'no hand-rolled page+pointer wipe survives outside the primitive');
}

// ─── v5.98.0: one cancel token, loop-owned mutex, epoch-guarded foreground ───
section('concurrency discipline — cancel token, loop-owned mutex, epoch guards');
{
    ok(SRC_FULL.includes('while (!cancelled && !_summarizeCancelRequested)'), 'catch-up loop honors the shared cancel token');
    ok(/async function runCatchup[\s\S]{0,2200}?const startEpoch = _chatEpoch;/.test(SRC_FULL), 'runCatchup captures the chat epoch before driving');
    ok(/while \(!cancelled && !_summarizeCancelRequested\) \{[\s\S]{0,1100}?if \(_chatEpoch !== startEpoch\)/.test(SRC_FULL), 'runCatchup checks the epoch EVERY iteration — a chat switch can never be summarized/ghosted');
    const abortBody = (SRC_FULL.match(/function abortSummarization\(\) \{[\s\S]*?\n\}/) || [''])[0];
    ok(abortBody.length > 0 && !/isSummarizing =/.test(abortBody), 'abortSummarization never releases a mutex it does not own');
    ok(abortBody.includes('_summarizeCancelRequested = true;'), 'abort raises the shared cancel token');
    // Body-scoped, not window-scoped: the previous form allowed 500 characters
    // between the header and the call, so it measured COMMENT LENGTH and failed
    // the moment a comment above the call grew. What it means is 'the call is in
    // this function', so that is what it now asserts.
    {
        const _i = SRC_FULL.indexOf('function onChatChanged() {');
        const _j = SRC_FULL.indexOf('\nfunction onGenerationStarted(', _i);
        const _body = (_i >= 0 && _j > _i) ? SRC_FULL.slice(_i, _j) : '';
        ok(_body.includes('abortSummarization();'), 'chat change aborts in-flight work for the old chat');
        ok(_body.indexOf('abortSummarization();') < _body.indexOf('setTimeout('), 'and aborts BEFORE it schedules the new chat\'s repair');
    }
    ok((SRC_FULL.match(/_acquireSummarize\(\)/g) || []).length >= 13, 'every driver goes through the single acquire helper (12 call sites + the definition)');
    const noHelpers = SRC_FULL
        .replace('let isSummarizing = false;', '')
        .replace(/function _acquireSummarize\(\) \{[\s\S]*?\n\}/, '')
        .replace(/function _releaseSummarize\(\) \{[^\n]*\n?/, '');
    ok(!/isSummarizing = (true|false);/.test(noHelpers), 'no direct isSummarizing assignment survives outside the helpers (loop-owned release)');
    ok((SRC_FULL.match(/a chat switch mid-call must not write into a detached store/g) || []).length >= 2, 'snippet and detail redos are epoch-guarded');
    ok((SRC_FULL.match(/Chat changed — export aborted\./g) || []).length >= 2, 'both export passes are epoch-guarded');

    // The preset-toggle mute is legacy-only (verified against ST release:
    // modern generateRaw never assembles the preset). Muting unconditionally
    // was pure downside — it gutted any main Generate landing in the window.
    ok(SRC_FULL.includes('if (isDefaultMode && _defaultModeNeedsToggleMute()) _mutePromptToggles();'), 'the toggle mute is gated on LEGACY generateRaw — modern ST is never muted');
    ok(/generateRaw\.length > 1/.test(SRC_FULL), 'legacy detection uses the generateRaw signature');
    ok(/function onGenerationStarted\(\) \{\s*\n\s*\/\/ Belt-and-suspenders[\s\S]{0,300}?_unmutePromptToggles\(\);/.test(SRC_FULL), 'GENERATION_STARTED synchronously restores a muted preset');
    ok(SRC_FULL.includes("window.addEventListener('beforeunload', _unmutePromptToggles)"), 'a tab close cannot strand a muted preset');
    ok(/if \(isDefaultMode\) _unmutePromptToggles\(\);/.test(SRC_FULL), 'callSummarizer releases the hold in finally');

    // H5: branch repair must reach DEEP layers — a merged meta-summary has no
    // journal to rewind it with, so only the drop discipline protects the branch.
    ok(/for \(let li = 1; li < store\.layers\.length; li\+\+\) \{[\s\S]{0,500}?narrating the abandoned timeline/.test(SRC_FULL), 'branch repair drops deep-layer snippets that reach the branch (not just Layer 0)');
    ok(/i > store\.summarizedUpTo \|\| !_isCovered\(i\)/.test(SRC_FULL), 'the orphan un-ghost rescues turns left uncovered by dropped deep snippets');

    // H3: "hiding visuals off" must never mean "still sent to the model" — no ST
    // prompt event can identify our messages, so exclusion is ALWAYS the native
    // is_system mechanism; the setting only toggles CSS.
    ok(!SRC_FULL.includes('metadata only (hiding disabled)'), 'H3: ghostMessagesUpTo never skips the hide (the old metadata-only lie)');
    ok(SRC_FULL.includes('body class\n    // `sc-ghost-visual-off`') || SRC_FULL.includes('sc-ghost-visual-off` (style.css) is what neutralizes'), 'H3: visuals are neutralized via the sc-ghost-visual-off class, not by skipping exclusion');
    ok(SRC_FULL.includes('function _syncGhostVisualClass()'), 'H3: the visual-off body class is synced from settings');

    // v5.98.0 LOW sweep guards
    ok(!/function repairGhostingForRange\(|function debugVisibleTurns\(|function getVisibleAssistantTurns\(/.test(SRC_FULL), 'L1: dead functions are gone');
    ok(SRC_FULL.includes('extensionSettings[MODULE_NAME][key] = structuredClone(defaultSettings[key]);'), 'L4: settings migration deep-clones defaults (shallow freeze aliases otherwise)');
    ok(/for \(const pattern of s\.stripPatterns\) \{\s*\n\s*if \(!pattern\) continue;/.test(SRC_FULL), "L5: an empty strip pattern can't infinite-loop cleanSummarizerOutput");
    ok(SRC_FULL.includes('_recallSlot={pos:') && /const slot=_recallSlot\|\|/.test(SRC_FULL), 'L8: recall clears the slot it ACTUALLY wrote to, not the current settings');
    ok(!SRC_FULL.includes('Summaryception-Personal-Bruce'), 'L9: no hardcoded personal fallback path');
    const CONN = fs.readFileSync(__dirname + '/connectionutil.js', 'utf8');
    ok(!/temperature: 0\.[38],/.test(CONN.replace(/_temperature: (0\.3|0\.8)/, '')), 'L2: hardcoded per-mode temperatures replaced by the override-aware path');
    ok((CONN.match(/\.\.\.\(signal \? \{ signal \} : \{\}\)/g) || []).length >= 4, 'L3: the abort signal reaches every fetch');

    // C8: the two version strings must never drift apart again
    const manifestVer = JSON.parse(fs.readFileSync(__dirname + '/manifest.json', 'utf8')).version;
    const scVer = (SRC_FULL.match(/const SC_VERSION = '([^']+)'/) || [])[1];
    ok(scVer === manifestVer, `version sync: SC_VERSION (${scVer}) === manifest.json (${manifestVer})`);

    // v5.98.0 MEDIUM wave
    ok(/store\.summarizedUpTo = recomputeSummarizedUpTo\(\);/.test(SRC_FULL), 'M1: snippet delete uses recomputeSummarizedUpTo — no more Math.max(...[]) = -Infinity → JSON null');
    ok(/A deleted Layer-0 snippet leaves its turns hidden AND unsummarized/.test(SRC_FULL), 'M1: deleting an L0 snippet returns its turns to verbatim');
    ok(SRC_FULL.includes('const toMerge = layer.slice(0, _b.perPromotion);'), 'M2: promotion merges from a COPY — sources stay in the layer for the whole flight');
    // This used to name the OLD spelling (`s.snippetsPerPromotion`). Once v5.111.0
    // clamped that read the searched-for string could never appear again, so the
    // assertion passed forever no matter what the code did — a false green that
    // only the negative test exposed. Test the INVARIANT, not a spelling: inside
    // maybePromoteLayer, no cut off the FRONT of the layer may happen before the
    // model call. (The accepted-merge removal below it is `splice(at, 1)`.)
    {
        const _pi = SRC_FULL.indexOf('async function maybePromoteLayer(layerIndex) {');
        const _pj = SRC_FULL.indexOf('// ─── Character Ledger: injection block', _pi);
        const _pb2 = SRC_FULL.slice(_pi, _pj);
        const _cut = _pb2.indexOf('layer.splice(0,');
        const _call = _pb2.indexOf('await callSummarizer');
        ok(_call > 0, 'M2: the promotion model call is where we think it is');
        ok(_cut === -1 || _cut > _call, 'M2: no splice-out before the LLM call survives');
    }
    ok((SRC_FULL.match(/summarizedUpTo = Math\.max\(store\.summarizedUpTo, endIdx\);/g) || []).length >= 2, 'M3: both batch paths fail forward past empty passages');
    ok(SRC_FULL.includes("throw new ConnectionError('Empty response from summarizer', { retryable: true });"), 'M5: cleaned-to-empty model output is retryable, as the log always claimed');
}
{
    // M4 behavioral: a content-less audit stamp must not falsify updatedAt.
    const notes = [
        { t: 3, name: 'Irene', at: 100, core: 'flint' },
        { t: 9, name: 'Irene', at: 999, a: 9 },   // pure audit stamp — written later, carries no content
    ];
    const page = L.foldLedgerNotes(notes, Infinity);
    ok(page['Irene'].updatedAt === 100, 'M4: a content-less audit stamp does NOT bump updatedAt (roster recency stays honest)');
    ok(page['Irene']._a === 9 && page['Irene']._t === 9, 'M4: the stamp itself still rides the fold (audit freshness + turn stamp intact)');
    const page2 = L.foldLedgerNotes([...notes, { t: 11, name: 'Irene', at: 1000, state: 'at the rail' }], Infinity);
    ok(page2['Irene'].updatedAt === 1000, 'M4: a CONTENT note still advances updatedAt');
}

// ─── the freshness indicator must agree with the reader ───
section('freshness indicator — no phantom backlog');
{
    // The reported screenshot: summarization has read far past the live pointer, so
    // NOTHING is unread — the old indicator computed latest-ledgerLiveIdx anyway.
    ok(L._computeLiveLedgerRange(95, 73, 95) === null, 'the reader says: nothing unread when summarizedUpTo covers the latest turn');
    ok(L._computeLiveLedgerRange(-1, 73, 95)[0] === 74, 'and says [74,95] when only the live pointer is behind');
    ok(L._computeLiveLedgerRange(90, 73, 95)[0] === 91, 'the watermark is max(summarizedUpTo, ledgerLiveIdx) — not the pointer alone');
    ok(L._computeLiveLedgerRange(-1, 999, 95) !== null, 'a pointer past the chat end resyncs rather than reporting negative work');
    ok(SRC_FULL.includes('const _range = _computeLiveLedgerRange(store.summarizedUpTo, store.ledgerLiveIdx, _latest);'), 'the panel asks the reader instead of reinventing the rule');
    ok(SRC_FULL.includes("const _behind = _range ? _turns.filter(t => t.index >= _range[0]).length : 0;"), 'it counts real assistant TURNS, not a message-index difference');
    ok(!SRC_FULL.includes('const _behind = (_latest >= 0 && _li < _latest) ? (_latest - _li) : 0;'), 'the index-arithmetic version that produced the phantom backlog is gone');
}

// ─── presence earns the slot (the "best friend went off page" death spiral) ───
section('full-entry slots go to who is IN THE SCENE');
{
    const mk = (u) => ({ core: 'x', updatedAt: u });
    // Lucien is standing right there in the newest message, but the scribe last wrote
    // about him 20 turns ago, so his updatedAt is ancient.
    const led = { Lucien: mk(10), Alexia: mk(90), Stella: mk(80), Silas: mk(70), Honami: mk(60), Emilia: mk(50), Claire: mk(40) };
    const s = { ledgerMaxActive: 6, ledgerInjectRoster: true, ledgerRosterMax: 12, ledgerRosterRotate: false };
    const msgs = [
        'alexia stella silas honami emilia claire all watched from the rail.',
        'lucien stepped up beside him for the duel.',
    ];
    const cast = L.computeLedgerCast(led, s, msgs.join('\n'), [], 0, msgs);
    const shown = cast.shown.map(x => x.name);
    ok(shown[0] === 'Lucien', 'THE FIX: the character in the NEWEST message ranks first, however stale his entry');
    ok(shown.includes('Lucien'), 'the best friend standing in the duel gets a FULL entry');
    ok(!cast.roster.includes('Lucien'), 'he is not demoted to a bare roster line');
    ok(cast.shown.length === 6, 'the cap still holds');
    // Regression witness: without the per-message window the OLD behaviour returns,
    // so this test cannot pass for free.
    const oldWay = L.computeLedgerCast(led, s, msgs.join('\n'), [], 0);
    ok(oldWay.shown.map(x => x.name)[0] === 'Alexia', 'witness: ranking by updatedAt put the freshest-WRITTEN first');
    ok(!oldWay.shown.map(x => x.name).includes('Lucien'), 'witness: and cut the friend who was actually present — the reported bug');
    const tie = L.computeLedgerCast({ Ayla: mk(5), Bram: mk(9) }, { ledgerMaxActive: 1, ledgerInjectRoster: false }, 'ayla and bram are here', [], 0, ['ayla and bram are here']);
    ok(tie.shown[0].name === 'Bram', 'equal presence -> the more recently updated wins (no arbitrary order)');
}
ok(SRC_FULL.includes('active.sort((a, b) => (b.seen - a.seen) || (b.u - a.u));'), 'presence outranks write-recency in the selector');
ok(SRC_FULL.includes('A character PRESENT in the passage must never be left describing an EARLIER scene'), 'the scribe is told a present character may not rot in an old scene');

// ─── the roster is a live map, not a guest list ───
section('roster carries the off-screen world');
{
    const led = {
        'Jovan Argent': { core: 'deliberate', state: 'in the duel ring', updatedAt: 99, _t: 158 },
        'Silas':        { core: 'showman who monetises gossip; never fights fair', state: 'east yard, taking bets on the duel, ledger open', updatedAt: 50, _t: 138 },
        'Honami':       { core: 'gentle, easily flustered', updatedAt: 40, _t: 130 },
    };
    const s = { ledgerMaxActive: 1, ledgerInjectRoster: true, ledgerRosterMax: 12, ledgerRosterRotate: false, ledgerMaxCharsPerChar: 600 };
    const msgs = ['jovan argent raised his blade. the others were elsewhere.'];   // Silas/Honami genuinely off screen
    L.__setSettings(s);
    const cast = L.computeLedgerCast(led, s, msgs.join('\n'), [], 0, msgs);
    ok(cast.roster.includes('Silas'), 'precondition: Silas is on the roster this turn');
    const block = L.buildCharacterBlock(led, s, msgs.join('\n'), [], 0, msgs);
    void block;
}
ok(SRC_FULL.includes("if (state) s += ' | last seen'"), 'roster lines carry the last-known state');
ok(SRC_FULL.includes("that is still where they are and what they are doing"), 'the framing tells the storyteller last-seen means still-there, not a guess');
ok(SRC_FULL.includes("const state = _clip(entry && entry.state, 90);"), 'the state is clipped so a full roster stays cheap');

// ─── nobody on screen is ever reduced to a name ───
section('anti-bias: the cap bounds cost, not existence');
{
    const mk = (u) => ({ core: 'x', state: 'doing something', updatedAt: u });
    const led = { A1: mk(9), B2: mk(8), C3: mk(7), D4: mk(6), E5: mk(5), F6: mk(4), Claire: mk(3), Headmaster: mk(2) };
    const s = { ledgerMaxActive: 6, ledgerInjectRoster: true, ledgerRosterMax: 12, ledgerRosterRotate: false };
    const msgs = ['a1 b2 c3 d4 e5 f6 claire headmaster are all in the hall together.'];
    const cast = L.computeLedgerCast(led, s, msgs[0], [], 0, msgs);
    ok(cast.shown.length === 6, 'the cap still bounds the expensive full entries');
    ok(cast.compact.length === 2, 'the two beyond the cap get compact entries');
    const injected = cast.shown.concat(cast.compact).map(x => x.name);
    ok(injected.includes('Claire') && injected.includes('Headmaster'), 'THE FIX: the sister and the headmaster are in the room, so they are injected');
    ok(cast.out.length === 0, 'nobody present is left out entirely');
    ok(cast.roster.length === 0, 'and nobody present is demoted to the off-screen roster');
    // Pins are the only signal of IMPORTANCE the system has — the user's own.
    const pinned = L.computeLedgerCast(led, s, msgs[0], ['Claire'], 0, msgs);
    ok(pinned.shown.map(x => x.name).includes('Claire'), 'a pinned character on screen takes a FULL slot ahead of the recency race');
}
ok(SRC_FULL.includes("Also present in this scene"), 'the compact tier reaches the storyteller with its own framing');
ok(SRC_FULL.includes('res.compact = active;   // on screen but past the cap'), 'overflow becomes compact, never nothing');
ok(SRC_FULL.includes('function _characterWeight(entry, pinned)'), 'importance is DERIVED from the story, not hand-annotated');
ok(/res\.shown = active\.slice\(\)\.sort\(\(a, b\) => \(b\.w - a\.w\)/.test(SRC_FULL), 'full slots go by the story\'s investment first, then presence, then recency');

// ─── importance is derived from the story, never annotated by hand ───
section('_characterWeight — the ledger knows who matters');
{
    const sister = { core: 'guarded, precise; grips her wrist when tense; never raises her voice; addresses him by name only', arc: 'protective older sister who has tracked his capability from the periphery for two years; tabled a debrief with "how much are you hiding?"', threads: ['shape the statement', 'tell him about Ivar', 'the tabled debrief'] };
    const classmate = { core: 'loud', state: 'in the hall' };
    ok(L._characterWeight(sister) > L._characterWeight(classmate), 'a sister with history and open threads outweighs a classmate who spoke once');
    ok(L._characterWeight({}) === 0 && L._characterWeight(null) === 0, 'an empty entry weighs nothing');
    const arcOnly = { arc: 'they fought once' };
    const threadOnly = { threads: ['a debt'] };
    ok(L._characterWeight(arcOnly) > 0 && L._characterWeight(threadOnly) > 0, 'arc alone and threads alone both count');
    ok(L._characterWeight(arcOnly) > L._characterWeight(threadOnly), 'a relationship outranks a single loose end');
    const deep = { arc: 'x'.repeat(600) };
    ok(L._characterWeight(deep) <= 100 + 30, 'depth is capped — a long arc cannot drown everything else');
    ok(L._characterWeight(classmate, true) > L._characterWeight(sister), 'an explicit pin still overrides — it is now the heaviest vote, not the only one');
}
{
    // The reported failure, end to end: the sister loses her slot to whoever twitched last.
    const mk = (u) => ({ core: 'x', state: 's', updatedAt: u });
    const led = {
        Claire: { core: 'guarded, precise; never raises her voice', arc: 'protective older sister, two years of watching him', threads: ['the statement', 'Ivar'], updatedAt: 1 },
        Headmaster: { core: 'weighs institutions before people', arc: 'holds Jovan\'s file and has not acted on it', threads: ['the pending review'], updatedAt: 2 },
        C1: mk(90), C2: mk(89), C3: mk(88), C4: mk(87), C5: mk(86), C6: mk(85),
    };
    const s = { ledgerMaxActive: 6, ledgerInjectRoster: true, ledgerRosterMax: 12, ledgerRosterRotate: false };
    const msgs = ['c1 c2 c3 c4 c5 c6 claire headmaster all crowded the east yard.'];
    const cast = L.computeLedgerCast(led, s, msgs[0], [], 0, msgs);
    const full = cast.shown.map(x => x.name);
    ok(full.includes('Claire'), 'THE FIX: the sister holds a FULL slot with zero pins, on the story\'s own evidence');
    ok(full.includes('Headmaster'), 'so does the headmaster — arc and an open thread outrank six fresher nobodies');
    ok(cast.compact.length === 2, 'the displaced extras drop to compact — still present, never erased');
    ok(cast.out.length === 0, 'and nobody in the room is dropped');
}

// ─── THE INVARIANT: the page is never staler than its own history ───
section('THE SWAP — staged page installs WITH its journal (production-shaped state only)');
{
    // v5.73's test fed the fix a hand-fabricated `ledgerRebuild.upTo` — a field
    // production NEVER writes (the only fields are target/staging/attempts) — and
    // hand-simulated the swap. In production the anchor was always -1, so every
    // old note out-folded the rebuild and the "fix" restored the stale content it
    // existed to replace. These tests drive the REAL _swapStagedLedgerIn with the
    // exact state production produces. First: the journaled path.
    const store = {
        ledgerLiveIdx: 134, ledgerNotesFrom: 0,
        ledger: { 'Alaric Sterling': { core: 'formal, institutional', state: 'STALE pre-rebuild state', _t: 100, updatedAt: 1 } },
        ledgerNotes: [
            { t: 100, name: 'Alaric Sterling', at: 1, core: 'formal, institutional', state: 'STALE pre-rebuild state' },
        ],
        ledgerStaging: { 'Alaric Sterling': { core: 'formal, institutional', state: "at the dais, Emilia's right shoulder", _t: 134, updatedAt: 3 } },
        ledgerStagingNotes: [
            { t: 100, name: 'Alaric Sterling', at: 2, core: 'formal, institutional', state: 'at the training yard' },
            { t: 134, name: 'Alaric Sterling', at: 3, state: "at the dais, Emilia's right shoulder" },
        ],
        ledgerRebuild: { target: 134, staging: true },   // the ONLY fields production writes
    };
    L.__setStore(store);
    ok(L._swapStagedLedgerIn(store) === true, 'swap reports success on a non-empty staged page');
    ok(store.ledger['Alaric Sterling'].state === "at the dais, Emilia's right shoulder", 'the rebuilt truth is live');
    eq(store.ledgerNotesFrom, 0, 'a journaled rebuild covers from turn 0 — every rewind is an exact fold');
    ok(store.ledgerStaging === null && store.ledgerStagingNotes === null, 'staging page and journal are consumed by the swap');
    const folded = L.foldLedgerNotes(store.ledgerNotes, Infinity);
    ok(JSON.stringify(folded) === JSON.stringify(store.ledger), 'THE INVARIANT: page == fold(notes) immediately after the swap');
    // The kill shot for the old bug: the first fold AFTER the swap. Deleting one
    // message refolds the page from the journal — under the old swap that painted
    // the pre-rebuild ledger straight back. Now the fold IS the rebuilt truth.
    L.reindexAfterDeletion(store, 120);
    ok(store.ledger['Alaric Sterling'].state === "at the dais, Emilia's right shoulder", 'KILL SHOT: a post-swap deletion refold keeps the REBUILT state (old swap resurrected the stale one)');
    // And a branch rewind below the swap point folds the rebuilt timeline, not the abandoned one.
    ok(L.rewindLedgerFromNotes(110) === true, 'rewind below the swap is an exact fold (journal covers from 0)');
    ok(store.ledger['Alaric Sterling'].state === 'at the training yard', 'the rewind lands on the REBUILT turn-100 read, not the pre-rebuild note at the same turn');
}
{
    // Witness that the OLD swap fails exactly this scenario: page := staging with
    // the journal untouched, then one deletion refold.
    const store = {
        ledgerLiveIdx: 134, ledgerNotesFrom: 0,
        ledger: {},
        ledgerNotes: [ { t: 100, name: 'Alaric Sterling', at: 1, state: 'STALE pre-rebuild state' } ],
        ledgerStaging: { 'Alaric Sterling': { state: 'REBUILT state', _t: 134, updatedAt: 3 } },
    };
    L.__setStore(store);
    store.ledger = store.ledgerStaging;   // the old blind assignment
    store.ledgerStaging = null;
    // Adoption journals the rebuilt page at tNow — so the first REWIND below tNow
    // filters that note out and the fold resurrects the pre-rebuild ledger.
    L.rewindLedgerFromNotes(110);
    ok(store.ledger['Alaric Sterling'].state === 'STALE pre-rebuild state', 'witness: under the old blind assignment, the first rewind resurrects the pre-rebuild ledger — the rebuild self-undoes');
}
{
    // Fallback path: a rebuild resumed from before the staging journal existed
    // (ledgerStagingNotes absent). Per-entry base notes at each entry's own _t —
    // "last seen" survives the swap; folds are exact from the swap point only.
    const store = {
        ledgerLiveIdx: 134, ledgerNotesFrom: 0,
        ledger: {},
        ledgerNotes: [ { t: 100, name: 'Stella', at: 1, state: 'STALE' } ],
        ledgerStaging: {
            'Stella':  { core: 'sharp, guarded', state: 'in the library annex', _t: 90,  updatedAt: 5 },
            'Honami':  { core: 'gentle mediator', state: 'walking the east yard', _t: 134, updatedAt: 6 },
        },
        ledgerRebuild: { target: 134, staging: true },
    };
    L.__setStore(store);
    ok(L._swapStagedLedgerIn(store) === true, 'fallback swap succeeds without a staging journal');
    eq(store.ledger['Stella']._t, 90, "fallback preserves each entry's own last-shaped turn through the fold (roster \"last seen\" stays true)");
    eq(store.ledger['Honami']._t, 134, 'and the current character keeps hers');
    eq(store.ledgerNotesFrom, 134, 'fallback journal is stamps, not history — exact folds start at the swap point');
    ok(L.rewindLedgerFromNotes(110) === false, 'a rewind below the swap point correctly declines the fold (checkpoints own that region) instead of fabricating history');
    ok(JSON.stringify(L.foldLedgerNotes(store.ledgerNotes, Infinity)) === JSON.stringify(store.ledger), 'invariant holds on the fallback path too');
}
{
    // v5.74's guarantee THROUGH the swap: a copilot edit made to the LIVE page
    // while the rebuild ran is adopted and survives, journaled on top.
    const store = {
        ledgerLiveIdx: 134, ledgerNotesFrom: 0,
        ledger: { 'Silas': { core: 'quiet observer', state: 'copilot-corrected: at the gates', _t: 100, updatedAt: 9 } },
        ledgerNotes: [ { t: 100, name: 'Silas', at: 1, core: 'quiet observer', state: 'in the library' } ],
        ledgerStaging: { 'Silas': { core: 'quiet observer', state: 'in the library', _t: 100, updatedAt: 2 } },
        ledgerStagingNotes: [ { t: 100, name: 'Silas', at: 2, core: 'quiet observer', state: 'in the library' } ],
        ledgerRebuild: { target: 134, staging: true },
    };
    L.__setStore(store);
    L._swapStagedLedgerIn(store);
    ok(store.ledger['Silas'].state === 'copilot-corrected: at the gates', 'an external live-page edit made during the rebuild survives the swap');
    ok(store.ledgerNotes.some(n => n.ext && n.state === 'copilot-corrected: at the gates' && n.t <= 134), 'and is journaled (clamped to the swap pointer) so later folds keep it');
}
{
    // THE GUARD: a rebuild RESUMED from persisted pre-journal state reaches the
    // swap with the old journal NOT covering the pointer (notesFrom far past
    // liveIdx — the bulk-trim / legacy-resume shape). There, fold(oldNotes) is
    // not the served baseline, so a page-vs-fold diff cannot isolate edits: a
    // page-only entry is indistinguishable from abandoned-timeline residue.
    // Adoption must be SKIPPED — journaling that "diff" at t<=upTo would embed
    // the doomed page in the rebuilt journal, and every later fold would honor it.
    const store = {
        ledgerLiveIdx: 5, ledgerNotesFrom: 99,
        ledger: {
            'Claire Argent': { core: 'STALE core from the abandoned timeline', state: 'STALE state', updatedAt: 1 },
            'Ghost of the old timeline': { core: 'exists only on the doomed page', state: 'never journaled', updatedAt: 1 },
        },
        ledgerNotes: [ { t: 99, name: 'Claire Argent', at: 1, base: true, core: 'STALE core from the abandoned timeline', state: 'STALE state' } ],
        ledgerStaging:      { 'Claire Argent': { core: 'rebuilt: grey-eyed sentinel', state: 'on the platform', _t: 5, updatedAt: 7 } },
        ledgerStagingNotes: [ { t: 1, name: 'Claire Argent', at: 7, core: 'rebuilt: grey-eyed sentinel', state: 'waiting by the arch' },
                              { t: 5, name: 'Claire Argent', at: 8, state: 'on the platform' } ],
        ledgerRebuild: { target: 5, staging: true },
    };
    L.__setStore(store);
    ok(L._swapStagedLedgerIn(store) === true, 'the uncovered-journal swap still installs the staged page');
    ok(!('Ghost of the old timeline' in store.ledger), 'THE GUARD: nothing from the doomed page is adopted when the old journal cannot vouch for it');
    ok(store.ledgerNotes.every(n => !String(n.core || '').includes('STALE') && !String(n.state || '').includes('STALE') && n.name !== 'Ghost of the old timeline'), 'the rebuilt journal contains not one note from the abandoned timeline');
    eq(store.ledger['Claire Argent'].state, 'on the platform', 'the rebuilt truth is what serves');
    ok(JSON.stringify(L.foldLedgerNotes(store.ledgerNotes, Infinity)) === JSON.stringify(store.ledger), 'invariant page == fold(notes) holds through the guarded swap');
}
ok(!/ledgerRebuild\.(upTo|endIdx|cursor)/.test(SRC_FULL), 'the dead-field rebase is gone — nothing reads ledgerRebuild.upTo/.endIdx/.cursor (fields nothing ever wrote)');
ok(!SRC_FULL.includes('_st.ledger = _st.ledgerStaging;'), 'the in-session blind assignment is gone — the swap goes through _swapStagedLedgerIn');
ok((SRC_FULL.match(/_swapStagedLedgerIn\(/g) || []).length >= 3, 'both swap sites (in-session + reload race) call the one real swap function');
ok(SRC_FULL.includes('ledgerStagingNotes.push'), 'staging chunks journal their reads as they land');
ok(/staging branch|Re-base the old journal/.test(SRC_FULL) && SRC_FULL.includes('cur.ledgerNotes = _baseNotesFromPage(cur.ledger, effTarget);'), 'rebuild start: the old journal is RE-BASED to the serving page, not trimmed — swap-time adoption sees only genuine external edits');
ok(!SRC_FULL.includes('cur.ledgerNotes = cur.ledgerNotes.filter(n => n && typeof n.t === \'number\' && n.t <= targetTurn);'), 'the bare trim that made the whole stale ledger look like external work is gone');
ok(!SRC_FULL.includes('a staged rebuild writes its own notes on swap'), 'the comment that claimed a thing the code never did is gone');


// ─── EXTERNAL EDITS ARE JOURNAL TRUTH: page ↔ notes reconciliation ───
section('tombstones — a deletion is journaled; folds cannot resurrect');
{
    const notes = [
        { t: 5, name: 'Silas', at: 1, core: 'quiet observer', state: 'in the library' },
        { t: 9, name: 'Silas', at: 2, gone: true },
    ];
    const page = L.foldLedgerNotes(notes, Infinity);
    ok(!('Silas' in page), 'fold honors a tombstone: the deleted character stays deleted');
    notes.push({ t: 14, name: 'Silas', at: 3, core: 'returned, changed', state: 'at the gates' });
    const page2 = L.foldLedgerNotes(notes, Infinity);
    ok(page2['Silas'] && page2['Silas'].core === 'returned, changed', 'a LATER note lawfully re-introduces the character');
    ok(page2['Silas'].state === 'at the gates', 'and the re-introduction carries only post-tombstone facts');
    const rewound = L.foldLedgerNotes(notes, 7);
    ok(rewound['Silas'] && rewound['Silas'].state === 'in the library', 'rewinding BELOW the tombstone brings them back — deletion is an event in time, not an erasure of history');
}
ok(SRC_FULL.includes("store.ledgerNotes.push({ t: _journalNow(store), name, at: Date.now(), gone: true });"), 'panel delete writes the tombstone (page-only deletes resurrected on the next fold)');

// ─── ONE KEY SPACE: page and journal agree, so a fold decides nothing ───
section('journal key space — the page decides the key once, the fold obeys it');
{
    // v5.93.0 and earlier: the journal recorded the SCRIBE'S name while the page
    // recorded the key it resolved that name to, and foldLedgerNotes re-ran the fuzzy
    // resolver to bridge the gap — against a HALF-BUILT page. Two page keys could
    // collapse onto one fold key; adoptExternalLedgerEdits then wrote its note under
    // the page key, the fold aliased it away, and the SAME difference was adopted
    // again on the next fold. The history filled with identical rows all stamped the
    // same turn, and it grew without bound.
    const store = {
        ledgerLiveIdx: 1, ledgerNotesFrom: 0, ledgerNotesCanon: 1,
        ledger: {
            'Ichigo': { core: 'short-form dossier', state: 'on the roof', _t: 1, updatedAt: 1 },
            'Ichigo Kurosaki': { core: 'long-form dossier', state: 'in the shop', _t: 1, updatedAt: 2 },
        },
        ledgerNotes: [
            { t: 1, name: 'Ichigo', at: 100, core: 'short-form dossier', state: 'on the roof' },
        ],
    };
    L.__setStore(store);
    const fold0 = L.foldLedgerNotes(store.ledgerNotes, Infinity);
    ok(Object.keys(fold0).length === 1 && 'Ichigo' in fold0, 'the fold keys EXACTLY on the note name — a short form is never re-aliased onto a long one mid-fold');

    const counts = [];
    for (let i = 0; i < 6; i++) counts.push(L.adoptExternalLedgerEdits(store));
    ok(counts[0] === 1, 'the one genuinely unjournaled page entry is adopted once (got ' + counts[0] + ')');
    ok(counts.slice(1).every(c => c === 0), 'and never again — adoption CONVERGES [' + counts.join(',') + ']');
    ok(store.ledgerNotes.length === 2, 'the journal stops growing (got ' + store.ledgerNotes.length + ' notes)');
    ok(L.ledgerHistoryFor(store.ledgerNotes, 'Ichigo').length === 1, 'one history row for the short form, not a stack of identical ones');
    ok(L.ledgerHistoryFor(store.ledgerNotes, 'Ichigo Kurosaki').length === 1, 'one history row for the long form');
    const foldN = L.foldLedgerNotes(store.ledgerNotes, Infinity);
    eq(Object.keys(foldN).sort(), Object.keys(store.ledger).sort(), 'page == fold(notes): same key space, exactly');
}

section('deleting one character cannot touch another');
{
    // The reported trigger. Three characters share a given name; deleting the third
    // used to make the short/long match unambiguous, so the fold merged two page keys
    // into one and the tombstone — fuzzy-resolved too — took the merged entry with it.
    const store = {
        ledgerLiveIdx: 1, ledgerNotesFrom: 0, ledgerNotesCanon: 1,
        ledger: {
            'Rose': { core: 'short', _t: 1, updatedAt: 1 },
            'Rose Otoribashi': { core: 'long', _t: 1, updatedAt: 2 },
            'Rose Hitsugaya': { core: 'third', _t: 1, updatedAt: 3 },
        },
        ledgerNotes: [
            { t: 1, name: 'Rose', at: 100, core: 'short' },
            { t: 1, name: 'Rose Otoribashi', at: 101, core: 'long' },
            { t: 1, name: 'Rose Hitsugaya', at: 102, core: 'third' },
        ],
    };
    L.__setStore(store);
    // exactly what the panel's delete handler does
    L.ensureLedgerNotes(store);
    delete store.ledger['Rose Hitsugaya'];
    store.ledgerNotes.push({ t: L._journalNow(store), name: 'Rose Hitsugaya', at: Date.now(), gone: true });

    const fold = L.foldLedgerNotes(store.ledgerNotes, Infinity);
    eq(Object.keys(fold).sort(), ['Rose', 'Rose Otoribashi'], 'the tombstone removes EXACTLY the deleted character');
    eq(Object.keys(fold).sort(), Object.keys(store.ledger).sort(), 'and the page still equals the fold');
    const grew = [];
    for (let i = 0; i < 6; i++) grew.push(L.adoptExternalLedgerEdits(store));
    ok(grew.every(c => c === 0), 'nothing is adopted after the deletion — no runaway [' + grew.join(',') + ']');
    ok(L.ledgerHistoryFor(store.ledgerNotes, 'Rose').length === 1, "the survivor's history is not duplicated by the deletion");
}

section('_journalNow — a statement about NOW outranks every existing note');
{
    const st = { ledgerLiveIdx: 4, ledgerNotes: [{ t: 11, name: 'A', at: 1 }, { t: 7, name: 'B', at: 2 }] };
    ok(L._journalNow(st) === 11, 'the horizon is the newest note, not the live pointer (got ' + L._journalNow(st) + ')');
    ok(L._journalNow({ ledgerLiveIdx: 30, ledgerNotes: [{ t: 2, name: 'A', at: 1 }] }) === 30, 'the live pointer wins when it is ahead');
    ok(L._journalNow({}) === 0, 'an empty store is turn 0');
    ok(L._journalNow(st, 99) === 99, 'an explicit floor is respected');
    ok(L._journalNow(st, undefined, false) === 11, 'withLive=false ignores the live pointer (staged rebuild) but still clears the notes');
    // The regression this guards: a tombstone stamped at the LIVE pointer while a
    // note sits at a higher turn sorts first, and the character quietly undeletes.
    const notes = [{ t: 11, name: 'A', at: 1, core: 'still here' }];
    notes.push({ t: 4, name: 'A', at: 2, gone: true });
    ok('A' in L.foldLedgerNotes(notes, Infinity), 'proof of the failure mode: a tombstone stamped too low does NOT delete');
    const notes2 = [{ t: 11, name: 'A', at: 1, core: 'still here' }];
    notes2.push({ t: L._journalNow({ ledgerLiveIdx: 4, ledgerNotes: notes2 }), name: 'A', at: 2, gone: true });
    ok(!('A' in L.foldLedgerNotes(notes2, Infinity)), 'stamped at the horizon, the deletion holds');
}

section('the journal records the DECISION, not the scribe\u2019s text');
{
    const store = {
        ledger: { 'Alexia Valois': { core: 'proud duelist', _t: 3 } },
        ledgerNotes: [{ t: 3, name: 'Alexia Valois', at: 1, core: 'proud duelist' }],
        ledgerNotesFrom: 0, ledgerNotesCanon: 1, ledgerLiveIdx: 3,
    };
    L.__setStore(store);
    L.__setSettings(Object.assign({}, defaultSettings));
    // The scribe says the short form; the page files it under the long key it already has.
    L.mergeLedgerDeltas([{ name: 'Alexia', state: 'nursing a bruised ego' }], undefined, 4);
    eq(Object.keys(store.ledger), ['Alexia Valois'], 'the page keeps ONE entry');
    eq(store.ledgerNotes.map(n => n.name), ['Alexia Valois', 'Alexia Valois'], 'and the new note is journaled under the RESOLVED key, not "Alexia"');
    eq(store.ledgerNotes[1].state, 'nursing a bruised ego', 'carrying the field that actually landed');
    eq(Object.keys(L.foldLedgerNotes(store.ledgerNotes, Infinity)), ['Alexia Valois'], 'so the fold reproduces the page with no resolving of its own');

    // Contaminated fields are dropped from the page — they must not survive in the note.
    const store2 = {
        ledger: { 'Kira': { core: 'A'.repeat(60), _t: 1 } },
        ledgerNotes: [], ledgerNotesFrom: 0, ledgerNotesCanon: 1, ledgerLiveIdx: 1,
    };
    L.__setStore(store2);
    L.mergeLedgerDeltas([{ name: 'Shuhei', core: 'A'.repeat(60), state: 'his own state' }], undefined, 2);
    ok(store2.ledger['Shuhei'] && store2.ledger['Shuhei'].core === undefined, 'the copied core never reaches the page');
    const note = store2.ledgerNotes.find(n => n.name === 'Shuhei');
    ok(note && note.core === undefined, 'and the journal does not smuggle it back in on the next fold');
    ok(note && note.state === 'his own state', 'the legitimate field is journaled');

    // A delta filed under the player's handle is redirected on the page — and journaled redirected.
    const store3 = { ledger: {}, ledgerNotes: [], ledgerNotesFrom: 0, ledgerNotesCanon: 1, ledgerLiveIdx: 1, mcName: 'Jovan' };
    L.__setStore(store3);
    L.__setCtxExtra({ name1: 'LO' });
    L.mergeLedgerDeltas([{ name: 'LO', state: 'issuing orders' }], undefined, 2);
    L.__setCtxExtra({});
    eq(Object.keys(store3.ledger), ['Jovan'], 'the persona handle is redirected to the protagonist on the page');
    eq(store3.ledgerNotes.map(n => n.name), ['Jovan'], 'and the journal records the redirect — no phantom persona resurrects at the next fold');

    // A staged merge journals nothing on the live journal, but reports what landed.
    const store4 = { ledger: {}, ledgerNotes: [], ledgerNotesFrom: 0, ledgerNotesCanon: 1 };
    L.__setStore(store4);
    const staging = { 'Renji Abarai': { core: 'loyal', _t: 1 } };
    const applied = [];
    L.mergeLedgerDeltas([{ name: 'Renji', state: 'on patrol' }], staging, 5, applied);
    eq(store4.ledgerNotes.length, 0, 'a staged merge never writes the LIVE journal');
    eq(applied.map(a => a.name), ['Renji Abarai'], 'but it reports the staging page\u2019s resolved key for the staging journal');
    eq(L._notesFromDeltas(applied, 5).map(n => n.name), ['Renji Abarai'], 'which _notesFromDeltas shapes into a canonical staging note');
}

section('legacy journals are migrated into the page\u2019s key space once');
{
    const store = {
        ledger: { 'Alexia Valois': { core: 'proud duelist' }, 'Mara': { core: 'terse' } },
        ledgerStaging: null, ledgerStagingNotes: null,
        ledgerNotes: [
            { t: 1, name: 'Alexia', at: 1, core: 'proud duelist' },
            { t: 2, name: 'alexia valois', at: 2, state: 'in the yard' },
            { t: 3, name: 'Mara', at: 3, core: 'terse' },
            { t: 4, name: 'Silas', at: 4, core: 'deleted long ago' },
        ],
    };
    const n = L._canonicalizeLedgerNotes(store);
    ok(n === 2, 'exactly the two divergent names are rewritten (got ' + n + ')');
    eq(store.ledgerNotes.map(x => x.name), ['Alexia Valois', 'Alexia Valois', 'Mara', 'Silas'], 'short form and case drift both resolve to the page key; a name the page does not know is left alone');
    ok(store.ledgerNotesCanon === 1, 'the store is stamped so the migration runs once');
    ok(L._canonicalizeLedgerNotes(store) === 0, 'and re-running it is a no-op');
    // WHY the stamp matters, beyond not re-scanning the journal on every getChatStore:
    // the page is a moving target. Delete a character and re-run an unstamped
    // migration, and that character's legacy notes resolve onto whoever is left.
    delete store.ledger['Mara'];
    store.ledger['Mara Vex'] = { core: 'a later arrival who happens to share the given name' };
    ok(L._canonicalizeLedgerNotes(store) === 0, 'a migration that already ran does NOT re-resolve against a page that has since changed');
    eq(store.ledgerNotes.map(x => x.name), ['Alexia Valois', 'Alexia Valois', 'Mara', 'Silas'], "and the departed character's history is not grafted onto a survivor");
    const fold = L.foldLedgerNotes(store.ledgerNotes, Infinity);
    ok(fold['Alexia Valois'] && fold['Alexia Valois'].state === 'in the yard', 'the migrated history folds into one dossier');
    ok(fold['Silas'] && fold['Silas'].core === 'deleted long ago', "a deleted character keeps its own history rather than being grafted onto a survivor");

    // An empty page is not an authority: nothing is rewritten against it, and the
    // one-shot migration is NOT burned on a store whose ledger has not loaded yet.
    const store2 = { ledger: {}, ledgerNotes: [{ t: 1, name: 'Alexia', at: 1 }] };
    ok(L._canonicalizeLedgerNotes(store2) === 0, 'an empty page rewrites nothing');
    ok(!store2.ledgerNotesCanon, 'and does not stamp the store — an unmaterialized page is an absence of an answer, not an answer');
    store2.ledger = { 'Alexia Valois': { core: 'proud duelist' } };
    ok(L._canonicalizeLedgerNotes(store2) === 1, 'the migration still runs once the page is there');
    eq(store2.ledgerNotes.map(x => x.name), ['Alexia Valois'], 'and lands the legacy name in the page\u2019s key space');
    // A store with no notes at all is trivially canonical and IS stamped.
    const store2b = { ledger: {}, ledgerNotes: [] };
    L._canonicalizeLedgerNotes(store2b);
    ok(store2b.ledgerNotesCanon === 1, 'a store with no journal is canonical by definition');
    // The staging journal is migrated against the staging page.
    const store3 = {
        ledger: {}, ledgerNotes: [],
        ledgerStaging: { 'Renji Abarai': { core: 'loyal' } },
        ledgerStagingNotes: [{ t: 1, name: 'Renji', at: 1, core: 'loyal' }],
    };
    L._canonicalizeLedgerNotes(store3);
    eq(store3.ledgerStagingNotes.map(x => x.name), ['Renji Abarai'], 'the staging journal is migrated too — the swap installs a canonical journal');
    ok(SRC_FULL.includes('_canonicalizeLedgerNotes(chatMetadata[MODULE_NAME]);'), 'and it runs from getChatStore — the one door every path goes through');
}

section('the fold no longer re-resolves anything');
{
    ok(!/const key = resolveLedgerKey\(out, n\.name\.trim\(\)\);/.test(SRC_FULL), 'foldLedgerNotes does not run the fuzzy resolver');
    ok(!/const fk = Object\.prototype\.hasOwnProperty\.call\(fold, name\) \? name : resolveLedgerKey\(fold, name\);/.test(SRC_FULL), 'adoptExternalLedgerEdits does not fuzzy-match page entries onto other characters\u2019 folded entries');
    ok(!/const pk = Object\.prototype\.hasOwnProperty\.call\(page, name\) \? name : resolveLedgerKey\(page, name\);/.test(SRC_FULL), 'and its deletion sweep is exact too');
    ok(SRC_FULL.includes('appendLedgerNotes(_applied, atTurn)'), 'the live journal is written from what landed, never from the raw deltas');
    ok(SRC_FULL.includes('_notesFromDeltas(_applied, job.liveEnd)'), 'the staging journal too');
    // Order independence: the same notes in any order fold to the same page.
    const notes = [
        { t: 1, name: 'Rose', at: 1, core: 'a' },
        { t: 1, name: 'Rose Otoribashi', at: 2, core: 'b' },
        { t: 2, name: 'Rose Hitsugaya', at: 3, core: 'c' },
    ];
    const a = L.foldLedgerNotes(notes, Infinity);
    const b = L.foldLedgerNotes(notes.slice().reverse(), Infinity);
    eq(Object.keys(a).sort(), Object.keys(b).sort(), 'folding is order-independent');
    const capped = L.foldLedgerNotes(notes, 1);
    eq(Object.keys(capped).sort(), ['Rose', 'Rose Otoribashi'], 'and a maxTurn cap changes WHICH notes are read, never how they are keyed');
}

section('adoptExternalLedgerEdits — copilot page edits survive every fold');
{
    // The reported class: the Chat Assistant fixes a wrong ledger state by writing
    // the PAGE. Nothing journals it. One message deletion later, the refold
    // silently reverts the fix. The reconciler adopts the diff as a note first.
    const store = {
        ledgerLiveIdx: 20, ledgerNotesFrom: 0,
        ledgerNotes: [
            { t: 10, name: 'Stella', at: 1, core: 'ambitious duelist', state: 'at the dorms' },
            { t: 18, name: 'Honami', at: 2, core: 'student council', state: 'in the courtyard' },
        ],
        ledger: null,
    };
    store.ledger = L.foldLedgerNotes(store.ledgerNotes, Infinity);
    // External (copilot) edit: correct Stella's state on the page only.
    store.ledger['Stella'].state = 'confined to the infirmary';
    const n1 = L.adoptExternalLedgerEdits(store);
    ok(n1 === 1, 'exactly the one divergent field is adopted (got ' + n1 + ')');
    const refold = L.foldLedgerNotes(store.ledgerNotes, Infinity);
    ok(refold['Stella'].state === 'confined to the infirmary', 'THE FIX: the copilot edit is journal truth — a refold keeps it');
    ok(refold['Stella'].core === 'ambitious duelist', 'untouched fields are untouched');
    ok(refold['Honami'].state === 'in the courtyard', 'other characters are untouched');
    ok(L.adoptExternalLedgerEdits(store) === 0, 'idempotent: page == fold(notes) adopts nothing');

    // Survives the real rewind path (which folds).
    L.__setStore(store);
    store.ledger = L.foldLedgerNotes(store.ledgerNotes, Infinity);
    store.ledger['Honami'].arc = 'suspects the masked fighter';
    ok(L.rewindLedgerFromNotes(20) === true, 'rewind path runs (notes cover the target)');
    ok(store.ledger['Honami'].arc === 'suspects the masked fighter', 'an external edit made just before a rewind survives it');

    // External NEW character (copilot structural replace can create one).
    store.ledger['Claire'] = { core: 'transfer student', state: 'unassigned dorm', threads: ['find the fight ring'] };
    const n2 = L.adoptExternalLedgerEdits(store);
    ok(n2 === 1, 'a page-only character is adopted whole');
    const refold2 = L.foldLedgerNotes(store.ledgerNotes, Infinity);
    ok(refold2['Claire'] && refold2['Claire'].core === 'transfer student' && refold2['Claire'].threads.length === 1, 'and folds back complete');

    // External deletion → tombstone.
    delete store.ledger['Stella'];
    const n3 = L.adoptExternalLedgerEdits(store);
    ok(n3 === 1, 'a page-side deletion is adopted as a tombstone');
    const refold3 = L.foldLedgerNotes(store.ledgerNotes, Infinity);
    ok(!('Stella' in refold3), 'and the fold keeps them deleted');

    // Audit stamps ride adoption too.
    store.ledger = L.foldLedgerNotes(store.ledgerNotes, Infinity);
    store.ledger['Honami']._a = 19;
    L.adoptExternalLedgerEdits(store);
    ok(L.foldLedgerNotes(store.ledgerNotes, Infinity)['Honami']._a === 19, 'an _a stamp diff is adopted (folds no longer force re-audits)');
}
{
    // Staged rebuild: _ledgerDroppingPast trims the SERVING page on purpose.
    // Those trims are temporary hygiene — they must NOT be adopted as deletions.
    const store = {
        ledgerLiveIdx: 3, ledgerNotesFrom: 0,
        ledgerRebuild: { target: 30, staging: true },
        ledgerNotes: [
            { t: 10, name: 'Alaric', at: 1, core: 'proctor', state: 'observing' },
            { t: 12, name: 'Emilia', at: 2, core: 'heiress', state: 'front row' },
        ],
        ledger: { 'Alaric': { core: 'proctor', state: 'observing', _t: 10 } },  // Emilia trimmed from the serving copy
    };
    const n = L.adoptExternalLedgerEdits(store);
    ok(n === 0, 'no tombstone is adopted for a rebuild-trimmed character');
    ok(L.foldLedgerNotes(store.ledgerNotes, Infinity)['Emilia'] !== undefined, 'Emilia survives in the journal for the rebuild to reconcile');
    store.ledger['Alaric'].state = 'called the match';
    ok(L.adoptExternalLedgerEdits(store) === 1, 'field edits are still adopted mid-rebuild');
}
{
    // Same-turn tie: an adopted note must beat the scribe note it corrects.
    const store = {
        ledgerLiveIdx: 7, ledgerNotesFrom: 0,
        ledgerNotes: [ { t: 7, name: 'Jovan', at: 100, state: 'in the training yard' } ],
        ledger: { 'Jovan': { state: 'slipping out the east gate' } },
    };
    L.adoptExternalLedgerEdits(store);
    ok(L.foldLedgerNotes(store.ledgerNotes, Infinity)['Jovan'].state === 'slipping out the east gate', 'the adoption outranks a same-turn scribe note (later timestamp wins the tie)');
}

section('_baseNotesFromPage — restarting the journal from a page is exact');
{
    const page = {
        'Alexia': { core: 'sharp-tongued', state: 'training', arc: 'rivalry', threads: ['beat Stella'], _a: 4, updatedAt: 111 },
        'Silas': { state: 'missing' },
    };
    const base = L._baseNotesFromPage(page, 9);
    ok(base.length === 2 && base.every(n => n.base === true && n.t === 9), 'one base note per entry, all at the restore turn');
    const fold = L.foldLedgerNotes(base, Infinity);
    ok(JSON.stringify(Object.keys(fold).sort()) === JSON.stringify(['Alexia', 'Silas']), 'fold(base) has exactly the page cast');
    ok(fold['Alexia'].core === 'sharp-tongued' && fold['Alexia'].threads[0] === 'beat Stella' && fold['Alexia']._a === 4, 'every field round-trips: the invariant page == fold(notes) is re-established');
}

section('journal hygiene — fallback rewinds cannot leave ghost notes');
ok(SRC_FULL.includes('_st0.ledgerNotes = [];'), 'turn-0 clear: the journal clears WITH the page (ghosts re-materialized the abandoned ledger)');
ok(SRC_FULL.includes('store.ledgerNotes = _baseNotesFromPage(store.ledger, ckpt.atTurn);'), 'checkpoint restore: the journal is rebased on the restored page');
ok(SRC_FULL.includes('cur.ledgerNotes = _baseNotesFromPage(cur.ledger, effTarget);') && SRC_FULL.includes('cur.ledgerNotesFrom = effTarget;'), 'staged rebuild entry: the journal is re-based to the serving page — a mid-rebuild fold reproduces the page by construction, and ghost notes cannot exist to paint back');
ok(SRC_FULL.includes("if (Array.isArray(st.ledgerNotes) && st.ledgerNotes.length > 0 && notesCover(st, upTo)) {"), 'rebuild swap: external page edits are adopted before the final fold — but ONLY when the old journal covers the swap horizon AND actually holds history to diff against (an uncovered or empty diff is the whole doomed page, not an edit)');
ok(SRC_FULL.includes('try { adoptExternalLedgerEdits(store); } catch (e)'), 'scribe merge: durable early adoption before new deltas land');
ok((SRC_FULL.match(/adoptExternalLedgerEdits\(store\);/g) || []).length >= 3, 'rewind, message-deletion refold, and merge all reconcile first');
ok(SRC_FULL.includes("store.ledgerNotes.push({ t: _t, name: key, at: Date.now(), a: stampAt });"), 'the audit stamp rides the journal (page-only stamps forced endless re-audits)');

section('deleting the turn that created a character removes them');
{
    // THE REPORTED BUG. A three-message chat: greeting, user, the AI's first reply.
    // The live pass reads turn 2 and writes the ledger. The user deletes message 2.
    // The character stayed. Two independent defects, both on this one path.
    const store = { ledger: {}, layers: [], summarizedUpTo: -1, ghostedIndices: [] };
    L.__setStore(store);
    L.__setSettings(Object.assign({}, defaultSettings));
    L.mergeLedgerDeltas([{ name: 'Rukia', core: 'sharp-tongued', state: 'on the roof' }], undefined, 2);
    store.ledgerLiveIdx = 2;   // processLedgerQueue advances the pointer AFTER the merge

    // (1) The journal must not contain a carried-over BASE snapshot of a page this
    //     very pass just wrote. Base notes survive turn-based dropping forever.
    ok(store.ledgerNotes.length === 1, 'the first pass journals ONE note, not a note plus an immortal base (got ' + store.ledgerNotes.length + ')');
    ok(!store.ledgerNotes.some(n => n.base), 'nothing this pass wrote is filed as pre-journal history');
    eq(store.ledgerNotes.map(n => n.t), [2], 'and it is stamped at the turn it actually came from, not turn 0');
    eq(Object.keys(L.foldLedgerNotes(store.ledgerNotes, 1)), [], 'so folding BELOW that turn produces an empty page — the character did not exist yet');

    // reindexAfterDeletion(store, 2), the single-deletion path
    const D = 2;
    store.ledgerLiveIdx -= 1;
    L.adoptExternalLedgerEdits(store);
    store.ledgerNotes = store.ledgerNotes
        .filter(n => !(n && typeof n.t === 'number' && n.t === D && !n.base))
        .map(n => (n && typeof n.t === 'number' && n.t >= D) ? Object.assign({}, n, { t: n.t - 1 }) : n);

    // (2) The journal is now EMPTY — which is the answer, not an absence of one.
    ok(store.ledgerNotes.length === 0, 'the deleted turn takes its note with it');
    ok(L.notesCover(store, store.ledgerLiveIdx) === true, 'an established journal that holds nothing still covers the horizon — it says "nothing survives"');
    store.ledger = L.foldLedgerNotes(store.ledgerNotes, Infinity);
    eq(Object.keys(store.ledger), [], 'THE FIX: deleting the only turn that ever mentioned her removes her from the ledger');
}

section('notesCover — absence is an unset floor, never an empty list');
{
    ok(L.notesCover({ ledgerNotes: [], ledgerNotesFrom: 0 }, 5) === true, 'established and empty: covered');
    ok(L.notesCover({ ledgerNotes: [] }, 5) === false, 'established but with no authoritative floor: not covered');
    ok(L.notesCover({ ledgerNotes: [{ t: 9, name: 'A', at: 1 }], ledgerNotesFrom: 7 }, 5) === false, 'a target below the floor is not covered');
    ok(L.notesCover({}, 5) === false, 'no journal at all: not covered');
}

section('the player\u2019s character is a RECORD, not a MODEL');
{
    // A psychological spec for a character the PLAYER controls is a script handed to
    // the storyteller for choices that are not its to make. The world still has to
    // remember where he is and what is open around him, so state and threads stay.
    const store = { ledger: {}, ledgerNotes: [], ledgerNotesFrom: 0, ledgerNotesCanon: 1, ledgerLiveIdx: 4, mcName: 'Jovan' };
    L.__setStore(store);
    L.__setSettings(Object.assign({}, defaultSettings));
    L.mergeLedgerDeltas([
        { name: 'Jovan', core: 'proud, hides grief behind bravado', state: 'bleeding from the left arm, in the east yard', arc: 'learning to trust', threads: ['has not told anyone about the mark'] },
        { name: 'Rukia', core: 'clipped when flustered', state: 'watching him', arc: 'warming to Jovan since the roof', threads: ['owes Jovan for the roof'] },
    ], undefined, 5);

    const j = store.ledger['Jovan'];
    ok(j && j.core === undefined, 'the protagonist gets no Nature \u2014 his temperament is the player\u2019s to write');
    ok(j && j.arc === undefined, 'and no Arc \u2014 his inner trajectory is not the record\u2019s to plot');
    eq(j.state, 'bleeding from the left arm, in the east yard', 'but his observable situation IS recorded \u2014 the world reacts to it');
    eq(j.threads, ['has not told anyone about the mark'], 'and what is open around him stays open');

    const r = store.ledger['Rukia'];
    ok(r.core && r.arc, 'a character the STORY controls keeps all four fields');
    eq(r.arc, 'warming to Jovan since the roof', 'including her arc TOWARD him \u2014 that is where the relationship actually lives, and it is hers');

    // the journal records the same decision, so a fold cannot paint the spec back
    const folded = L.foldLedgerNotes(store.ledgerNotes, Infinity);
    ok(folded['Jovan'] && folded['Jovan'].core === undefined && folded['Jovan'].arc === undefined, 'the journal never carries what the page refused \u2014 no fold resurrects it');

    // the auditor writes through the same function, so it cannot reintroduce them either
    L.mergeLedgerDeltas([{ name: 'Jovan', core: 'audited nature', arc: 'audited arc', state: 'still in the yard' }], undefined, 6);
    ok(store.ledger['Jovan'].core === undefined && store.ledger['Jovan'].arc === undefined, 'every writer passes through one guard \u2014 the auditor cannot reintroduce them');
    eq(store.ledger['Jovan'].state, 'still in the yard', 'while legitimate observations still land');

    // opt out: some players DO want their protagonist modelled
    L.__setSettings(Object.assign({}, defaultSettings, { ledgerMcRecordOnly: false }));
    L.mergeLedgerDeltas([{ name: 'Jovan', core: 'opted in' }], undefined, 7);
    eq(store.ledger['Jovan'].core, 'opted in', 'the quarantine is a setting, not a law of the universe');
    L.__setSettings(Object.assign({}, defaultSettings));
}

section('isMcLedgerKey \u2014 one matcher, the same resolver the ledger keys with');
{
    L.__setStore({ ledger: {}, mcName: 'Jovan Oda' });
    ok(L.isMcLedgerKey('Jovan Oda') === true, 'exact');
    ok(L.isMcLedgerKey('jovan oda') === true, 'case');
    ok(L.isMcLedgerKey('Jovan') === true, 'the short form the ledger may have filed him under');
    ok(L.isMcLedgerKey('Rukia') === false, 'someone else');
    ok(L.isMcLedgerKey('') === false, 'empty');
    L.__setStore({ ledger: {} });
    ok(L.isMcLedgerKey('Jovan') === false, 'with no protagonist resolved, nobody is quarantined');
}

section('injection \u2014 the storyteller never receives the protagonist\u2019s spec');
{
    const e = { core: 'proud, hides grief', state: 'in the east yard', arc: 'learning to trust', threads: ['the mark'] };
    eq(L.formatLedgerEntry('Jovan', e, 600, true), "Jovan (player's character \u2014 record only) \u2014 Now: in the east yard. Open: the mark.", 'Nature and Arc are withheld and the line says whose character it is');
    eq(L.formatLedgerEntry('Jovan', e, 600, false), 'Jovan \u2014 Nature: proud, hides grief. Now: in the east yard. Open: the mark. Arc: learning to trust.', 'the same entry unquarantined is unchanged \u2014 nothing else about formatting moved');
    eq(L.formatLedgerEntry('Jovan', { core: 'proud' }, 600, true), '', 'an entry that is ONLY a spec injects nothing at all');
    ok(L.formatLedgerEntry('Rukia', e, 600).includes('Nature:'), 'omitting the flag leaves every other character exactly as before');
}

section('the scribe is told, not just overruled');
{
    const rule = /THE PLAYER'S CHARACTER IS A RECORD, NOT A MODEL/g;
    ok((SRC_FULL.match(rule) || []).length === 2, 'both copies of the ledger prompt carry the rule (default preset and defaultSettings)');
    const raw = SRC_FULL.match(/ledgerSystemPrompt: \["([\s\S]*?)"\],/);
    ok(!!raw, 'the defaultSettings prompt is locatable');
    const live = JSON.parse('"' + raw[1] + '"');
    ok(live.includes("THE PLAYER'S CHARACTER IS A RECORD, NOT A MODEL"), 'and it survives into the RUNTIME string, correctly escaped');
    ok(live.includes('including their arc TOWARD the'), 'the rule keeps everyone else\u2019s arc toward the protagonist explicitly in scope');
}

section('copilot renames a character — the key space follows, history intact');
{
    // The copilot renames by page surgery (delete old key, add new key — the only
    // way to rename an object key). Through v5.96.0 that read as delete+create.
    const mk = () => {
        const st = { ledgerNotesCanon: 1, ledgerNotesFrom: 0, ledgerLiveIdx: 9, ledger: {}, ledgerPins: ['Rukia'], ledgerNotes: [
            { t: 2, name: 'Rukia', at: 1, core: 'clipped when flustered', state: 'on the roof' },
            { t: 5, name: 'Rukia', at: 2, state: 'in the shop', arc: 'warming since the roof' },
            { t: 9, name: 'Rukia', at: 3, state: 'watching Jovan' },
        ] };
        st.ledger = L.foldLedgerNotes(st.ledgerNotes, Infinity);
        return st;
    };

    // 1) pure rename, short → long
    let st = mk();
    L.__setStore(st); L.__setSettings(Object.assign({}, defaultSettings));
    const e = st.ledger['Rukia']; delete st.ledger['Rukia']; st.ledger['Rukia Kuchiki'] = e;
    const counts = [];
    for (let i = 0; i < 4; i++) counts.push(L.adoptExternalLedgerEdits(st));
    ok(counts.every(c => c === 0), 'a rename adopts ZERO notes — it is a re-key, not an edit [' + counts.join(',') + ']');
    eq(L.ledgerHistoryFor(st.ledgerNotes, 'Rukia Kuchiki').length, 3, 'her full history survives under the NEW name');
    eq(L.ledgerHistoryFor(st.ledgerNotes, 'Rukia').length, 0, 'and nothing is orphaned under the old one');
    ok(!st.ledgerNotes.some(n => n.gone), 'no tombstone — she was renamed, not deleted');
    eq(Object.keys(L.foldLedgerNotes(st.ledgerNotes, 6)), ['Rukia Kuchiki'], 'a rewind past the rename shows the SAME person under her CURRENT name — the rename survives rewinds and branches');
    eq(st.ledgerPins, ['Rukia Kuchiki'], 'a pinned character stays pinned through her own rename');

    // 2) rename + simultaneous field edit in the same copilot stroke
    st = mk();
    L.__setStore(st);
    const e2 = Object.assign({}, st.ledger['Rukia'], { state: 'corrected by the copilot' });
    delete st.ledger['Rukia']; st.ledger['Rukia Kuchiki'] = e2;
    const a2 = L.adoptExternalLedgerEdits(st);
    eq(a2, 1, 'the rename is a re-key and the EDIT is one adopted note — cores match, so the pairing holds');
    const f2 = L.foldLedgerNotes(st.ledgerNotes, Infinity);
    eq(f2['Rukia Kuchiki'].state, 'corrected by the copilot', 'the edited field lands under the new key');
    eq(L.ledgerHistoryFor(st.ledgerNotes, 'Rukia Kuchiki').length, 4, 'three re-keyed rows plus the one edit');

    // 3) cores present but DIFFERENT — a REPLACEMENT, deliberately not a rename
    st = mk();
    L.__setStore(st);
    delete st.ledger['Rukia'];
    st.ledger['Kaien'] = { core: 'an entirely different anchor', state: 'watching Jovan', _t: 9 };
    L.adoptExternalLedgerEdits(st);
    ok(st.ledgerNotes.some(n => n.gone && n.name === 'Rukia'), 'swapping the identity anchor AND the name is delete+create: the old character is tombstoned');
    eq(L.ledgerHistoryFor(st.ledgerNotes, 'Kaien').length, 1, 'and the new one starts fresh — rewriting who someone IS is not a rename');

    // 4) ambiguity — two new keys both matching the vanished one — is left alone
    st = mk();
    L.__setStore(st);
    const eA = st.ledger['Rukia']; delete st.ledger['Rukia'];
    st.ledger['Rukia Kuchiki'] = Object.assign({}, eA);
    st.ledger['Rukia Shiba'] = Object.assign({}, eA);
    L.adoptExternalLedgerEdits(st);
    eq(L.ledgerHistoryFor(st.ledgerNotes, 'Rukia Kuchiki').length + L.ledgerHistoryFor(st.ledgerNotes, 'Rukia Shiba').length, 2, 'ambiguous pairing re-keys NOTHING — a guess that re-keys the wrong person is worse than an orphaned history');
    ok(st.ledgerNotes.some(n => n.gone && n.name === 'Rukia'), 'the vanished key falls back to an honest tombstone');

    // 5) the protagonist's record-only entry (no core by design) renames on state evidence
    st = { ledgerNotesCanon: 1, ledgerNotesFrom: 0, ledgerLiveIdx: 5, mcName: 'Jovan', ledger: {}, ledgerNotes: [
        { t: 3, name: 'Jovan', at: 1, state: 'bleeding in the east yard', threads: ['the mark'] },
    ] };
    st.ledger = L.foldLedgerNotes(st.ledgerNotes, Infinity);
    L.__setStore(st);
    const ej = st.ledger['Jovan']; delete st.ledger['Jovan']; st.ledger['Jovan Oda'] = ej;
    L.adoptExternalLedgerEdits(st);
    eq(L.ledgerHistoryFor(st.ledgerNotes, 'Jovan Oda').length, 1, 'a record-only entry (no core) pairs on verbatim state');
    ok(L.isMcLedgerKey('Jovan Oda') === true, 'and the record-only quarantine follows him to the new key — the matcher resolves, it does not memorize');
}

section('_renameEvidence — identity, not similarity');
{
    ok(L._renameEvidence({ core: 'x' }, { core: 'x' }) === true, 'equal cores: same person');
    ok(L._renameEvidence({ core: 'x' }, { core: 'y' }) === false, 'different cores: replacement');
    ok(L._renameEvidence({ core: 'x' }, { state: 's' }) === false, 'core on one side only: not provably the same');
    ok(L._renameEvidence({ state: 's' }, { state: 's' }) === true, 'no cores: verbatim state carries it');
    ok(L._renameEvidence({ state: 's', arc: 'a' }, { state: 's', arc: 'b' }) === false, 'but any shared field that disagrees vetoes');
    ok(L._renameEvidence({ threads: ['t'] }, { threads: ['t'] }) === false, 'threads alone are not identity');
    ok(L._renameEvidence({}, {}) === false, 'no evidence, no pairing');
}

section('renameLedgerCharacter — the deliberate door for the copilot');
{
    const st = { ledger: { 'Rukia': { core: 'clipped', _t: 2 }, 'Renji': { core: 'loyal', _t: 2 } },
        ledgerNotes: [{ t: 2, name: 'Rukia', at: 1, core: 'clipped' }, { t: 2, name: 'Renji', at: 2, core: 'loyal' }],
        ledgerNotesFrom: 0, ledgerNotesCanon: 1, ledgerLiveIdx: 2, ledgerPins: [] };
    L.__setStore(st);
    const r1 = L.renameLedgerCharacter(st, 'Rukia', 'Rukia Kuchiki');
    ok(r1.ok === true && r1.from === 'Rukia' && r1.to === 'Rukia Kuchiki', 'renames by resolved key');
    ok('Rukia Kuchiki' in st.ledger && !('Rukia' in st.ledger), 'the page moves');
    eq(st.ledgerNotes.filter(n => n.name === 'Rukia Kuchiki').length, 1, 'the journal follows');
    const r2 = L.renameLedgerCharacter(st, 'Rukia Kuchiki', 'Renji');
    ok(r2.ok === false && /merge two people/.test(r2.reason), 'renaming ONTO another character is refused — that would merge two people');
    const r3 = L.renameLedgerCharacter(st, 'Nobody', 'Someone');
    ok(r3.ok === false && /no character/.test(r3.reason), 'renaming a character who does not exist is refused, stated plainly');
    const r4 = L.renameLedgerCharacter(st, 'rukia kuchiki', 'Rukia Kuchiki');
    ok(r4.ok === true, 'a case correction of the SAME character is allowed — that is not a merge');
    const st2 = { ledger: { 'Mara': { core: 'terse' } } };   // pre-notes chat
    const r5 = L.renameLedgerCharacter(st2, 'Mara', 'Mara Vex');
    ok(r5.ok === true && Array.isArray(st2.ledgerNotes), 'a pre-notes chat gets a journal first, so the rename has history to carry');
    ok(SRC_FULL.includes('renameCharacter: (from, to) =>'), 'exposed to the copilot at window.summaryceptionContinuity.renameCharacter');
    ok(SRC_FULL.includes('const r = renameLedgerCharacter(store, from, to);'), 'the API wrapper delegates to the tested function and only adds save/injection/render');
}

section('_renameLedgerKeySpace — every name-keyed structure moves together');
{
    const st = {
        ledger: { 'A': { core: 'x' } },
        ledgerStaging: { 'A': { core: 'x-staged' } },
        ledgerNotes: [{ t: 1, name: 'A', at: 1, core: 'x' }, { t: 3, name: 'A', at: 2, gone: true }, { t: 4, name: 'B', at: 3, core: 'other' }],
        ledgerStagingNotes: [{ t: 1, name: 'A', at: 1, core: 'x-staged' }],
        ledgerPins: ['a', 'B'],
    };
    ok(L._renameLedgerKeySpace(st, 'A', 'A Prime') === true, 'reports work done');
    ok('A Prime' in st.ledger && 'A Prime' in st.ledgerStaging, 'both pages move — a mid-rebuild rename cannot fork live from staging');
    eq(st.ledgerNotes.map(n => n.name), ['A Prime', 'A Prime', 'B'], 'live journal re-keyed, INCLUDING old tombstones — the timeline is preserved, only the label changes');
    eq(st.ledgerStagingNotes.map(n => n.name), ['A Prime'], 'staging journal re-keyed');
    eq(st.ledgerPins, ['A Prime', 'B'], 'pins follow case-insensitively; other pins untouched');
    ok(L._renameLedgerKeySpace(st, 'Nobody', 'X') === false, 'renaming nothing does nothing');
}

section('adoption guards — divergence is only adopted when it means intent');
{
    // Persisted pre-v5.73 clobber: the page saved STALER than its own journal
    // (_t proves it). Adoption must skip it so the fold repairs the bug instead
    // of freezing it as truth.
    const store = {
        ledgerLiveIdx: 134, ledgerNotesFrom: 0,
        ledgerNotes: [
            { t: 120, name: 'Alaric', at: 1, state: "at the official's mark" },
            { t: 134, name: 'Alaric', at: 2, state: "at the dais, Emilia's right shoulder" },
        ],
        ledger: { 'Alaric': { state: "at the official's mark", _t: 120 } },
    };
    ok(L.adoptExternalLedgerEdits(store) === 0, 'a provably-stale page entry (_t behind the journal) is NOT adopted');
    ok(L.foldLedgerNotes(store.ledgerNotes, Infinity)['Alaric'].state === "at the dais, Emilia's right shoulder", 'so the fold repairs the persisted clobber instead of freezing it');
    // A copilot edit never rewrites _t — equal stamps mean the divergence is intent.
    store.ledger = L.foldLedgerNotes(store.ledgerNotes, Infinity);
    store.ledger['Alaric'].state = 'escorted out by proctors';
    ok(L.adoptExternalLedgerEdits(store) === 1, 'equal _t + different text = a genuine external edit, adopted');
}
{
    // An empty page is a page that was never materialized, not a mass deletion.
    const store = {
        ledgerLiveIdx: 9, ledgerNotesFrom: 0, ledger: {},
        ledgerNotes: [{ t: 3, name: 'Claire', at: 1, core: 'guarded' }],
    };
    ok(L.adoptExternalLedgerEdits(store) === 0, 'an empty page adopts no tombstones');
    ok(L.foldLedgerNotes(store.ledgerNotes, Infinity)['Claire'] !== undefined, 'the journal cast is untouched');
}

section('pin provenance — a pin injects only while its text exists in THIS branch');
{
    // needle: the truncation ellipsis is display, not content
    eq(L._pinNeedle({ excerpt: 'She turned away\u2026' }), 'She turned away', 'needle strips the truncation ellipsis');
    eq(L._pinNeedle({ excerpt: 'plain' }), 'plain', 'needle passes plain excerpts through');
    eq(L._pinNeedle(null), '', 'needle: null pin is empty');

    const chat = [
        { mes: 'Claire waited by the arch.' },
        { mes: 'Jovan stepped onto the platform. Claire did not move.' },
        { mes: 'She said: "You came back." Claire did not move.' },
    ];
    // newest-first: a repeated quote resolves to its LATEST occurrence
    eq(L._findPinSource({ excerpt: 'Claire did not move.' }, chat), 2, 'find: repeated quote resolves newest-first');
    eq(L._findPinSource({ excerpt: 'by the arch' }, chat), 0, 'find: substring anywhere in the message');
    eq(L._findPinSource({ excerpt: 'never written' }, chat), -1, 'find: absent text is -1');
    eq(L._findPinSource({ excerpt: 'Jovan stepped onto the platform. Claire d\u2026' }, chat), 1, 'find: truncated pin matches its source as a prefix');

    // alive: cached index still valid — no rescan, srcIdx untouched
    const p1 = { excerpt: 'by the arch', srcIdx: 0 };
    ok(L._pinAlive(p1, chat) === true && p1.srcIdx === 0, 'alive: valid cache hits without rescan');

    // alive: a deletion shifted the source — rescan adopts the new index
    const p2 = { excerpt: 'You came back.', srcIdx: 2 };
    const shifted = [chat[0], chat[2]];   // message 1 deleted
    ok(L._pinAlive(p2, shifted) === true && p2.srcIdx === 1, 'alive: shifted source is re-found and the cache updated');

    // alive: BRANCHED AWAY — the reported bug: the pin must stop injecting
    const p3 = { excerpt: 'You came back.', srcIdx: 2 };
    const branched = [chat[0], chat[1]];   // branch below the pinned turn
    ok(L._pinAlive(p3, branched) === false && p3.srcIdx === -1, 'THE BUG: a pin from a branched-away turn is orphaned, not injected');

    // alive: the branch comes back (or another branch contains the text) — self-revives
    ok(L._pinAlive(p3, chat) === true && p3.srcIdx === 2, 'orphan self-revives when the text exists again');

    // alive: free pin (selection was never chat text) injects unconditionally
    ok(L._pinAlive({ excerpt: 'anything', srcIdx: null }, []) === true, 'free pin (srcIdx null) is timeline-independent');

    // alive: legacy pin (no srcIdx) resolves lazily — found adopts, missing orphans
    const legacyFound = { excerpt: 'by the arch' };
    ok(L._pinAlive(legacyFound, chat) === true && legacyFound.srcIdx === 0, 'legacy pin lazily adopts its source index');
    const legacyGone = { excerpt: 'from a dead timeline' };
    ok(L._pinAlive(legacyGone, chat) === false && legacyGone.srcIdx === -1, 'legacy pin whose text is gone is orphaned — the leak is closed for old data too');

    // wiring: injection gates on liveness; creation stamps provenance; panel shows the same truth
    ok(SRC_FULL.includes("if(!_pinAlive(p, chat)) continue;"), 'buildPinnedBlock: dead pins are excluded from injection');
    ok(SRC_FULL.includes("srcIdx: (_src >= 0 ? _src : null)"), 'addPin: provenance stamped at creation — the only moment free-vs-quote is knowable');
    ok(SRC_FULL.includes("const alive=_pinAlive(p, chat);"), 'renderPins: the panel judges liveness with the SAME function the injection uses');
}

section('resolved receipts — trimmed with the timeline they belong to');
{
    ok(/turnRange: Array\.isArray\(f\.turnRange\) \? f\.turnRange\.slice\(\) : undefined/.test(SRC_FULL), 'Resolve stamps the receipt with the flag turn range');
    ok(/turnRange: Array\.isArray\(flag\.turnRange\) \? flag\.turnRange\.slice\(\) : undefined/.test(SRC_FULL), 'Apply stamps the receipt with the flag turn range');
    ok(SRC_FULL.includes('r && (!Array.isArray(r.turnRange) || r.turnRange[1] < chatLength));'), 'branch repair trims receipts about turns the branch abandoned');
    ok(SRC_FULL.includes('store.continuityResolved.filter(r => r && (!Array.isArray(r.turnRange) || r.turnRange[1] <= max));'), 'bulk-delete clamp trims receipts past the new end');
}

section('deleting the newest read turn — the guard compares D to the timeline D belongs to');
{
    // The reported bug: delete AI turn 51 (pointer 51) on a legacy chat -> nothing;
    // then editing user turn 50 shows the checkpoint-49 rewind the deletion owed.
    // Cause: the guard read the pointer AFTER reindexAfterDeletion decremented it,
    // then compared the PRE-deletion index D against it — false for D == liveIdx
    // and only there: the most common deletion in roleplay skipped the rewind.
    ok(/_liPre = \(typeof store\.ledgerLiveIdx === 'number'\) \? store\.ledgerLiveIdx : -1;\s*\n\s*reindexAfterDeletion\(store, D\);/.test(SRC_FULL), 'the pre-deletion pointer is captured BEFORE reindexAfterDeletion decrements it');
    ok(SRC_FULL.includes('if (D > _liPre) _genStale = false;'), 'in-flight invalidation judges D against the pre-deletion pointer');
    ok(SRC_FULL.includes('if (!notesCover(store, _liNow) && D >= 0 && D <= _liPre) {'), 'the legacy rewind judges coverage NOW but readness THEN — D == liveIdx now rewinds');
    ok(!/const _li = \(typeof store\.ledgerLiveIdx === 'number'\) \? store\.ledgerLiveIdx : -1;\s*\n\s*if \(D > _li\)/.test(SRC_FULL), 'the post-decrement read that created the one-turn blind spot is gone');

    // And the second half: a rebuild's finish line must be a turn a scribe pass can
    // reach. targetTurn = a trailing USER message made liveEnd >= target unreachable.
    ok(typeof L._lastAssistantAt === 'function', '_lastAssistantAt is top-level and extracted');
    const chat = [
        { is_user: true,  mes: 'I speak.' },
        { is_user: false, mes: 'She answers.' },
        { is_user: true,  mes: 'I press on.' },
        { is_user: false, is_system: true, mes: 'sys' },
    ];
    eq(L._lastAssistantAt(chat, 3), 1, 'a trailing user/system tail clamps to the last real assistant turn');
    eq(L._lastAssistantAt(chat, 1), 1, 'an assistant target is its own clamp');
    eq(L._lastAssistantAt(chat, 0), -1, 'before the first reply there is nothing to read');
    eq(L._lastAssistantAt([], 5), -1, 'empty chat');
    const ghost = [{ is_user: false, is_system: true, extra: { sc_ghosted: true }, mes: 'ghosted reply' }];
    eq(L._lastAssistantAt(ghost, 0), 0, 'our own ghosted replies still count as read turns');
    ok(SRC_FULL.includes('const effTarget = _lastAssistantAt((SillyTavern.getContext() || {}).chat, targetTurn);'), 'the staged rebuild clamps its target once, at entry');
    ok(SRC_FULL.includes('jobs = queueLedgerRebuild(effTarget);') && SRC_FULL.includes('jobs = queueLedgerReplay(cur.ledgerLiveIdx, effTarget, { staging: true });'), 'both queue paths aim at the clamped target');
    ok(SRC_FULL.includes('cur.ledgerNotesFrom = effTarget;'), 'the rebase anchors at the clamped target so swap-time adoption coverage holds');
    ok(SRC_FULL.includes("toastr.success(`Ledger rewound to turn ${targetTurn} — before the story's first reply"), 'a rewind below the first reply installs the true (empty) state instead of freezing the stale page');
}

section('memory transplant — export, survive an external editor, import into a fresh chat');
{
    const store = {
        notepad: 'Marcroft canon:\nthe arch faces east.',
        ledger: {
            'Stella Voss': { core: 'Duelist.\nSecond seat.', state: 'At the arch', arc: 'Softening', threads: 'Owes Jovan', _t: 134 },
            'Honami "Quote" Rei': { core: 'Archivist', state: 'Library', _t: 90 },
        },
        layers: [
            [ { text: 'Jovan arrived at Marcroft.', turnRange: [0, 4], detail: 'Rain. Claire waited.' },
              { text: 'The duel with Stella ended in a draw.', turnRange: [5, 9] } ],
            [ { text: 'Season one: arrival and first rivalries.', turnRange: [0, 9] } ],
        ],
        pins: [ { id: 'p1', mesId: 7, srcIdx: 7, excerpt: 'You came back.', label: 'the promise' } ],
        continuityFlags: [ { issue: 'Silas in two places', fix: 'pick one', kind: 'continuity', turnRange: [40, 44] } ],
    };
    const md = L.buildTransplantExport(store, { exportedAt: 'T', turns: 52, scVersion: 'test' });
    ok(md.includes('<!-- SC-TRANSPLANT {"v":1,"exportedAt":"T","turns":52,"scVersion":"test"} -->'), 'export: header marker carries meta');
    ok(md.includes('{"name":"Honami \"Quote\" Rei","t":90}'.replace('\"Quote\"', '\\"Quote\\"')), 'export: names with quotes survive via JSON payload');
    ok(md.includes('Silas in two places'), 'export: open flags ride along informationally');

    // round-trip: parse the untouched export
    const p1 = L.parseTransplant(md);
    eq(p1.notepad, 'Marcroft canon:\nthe arch faces east.', 'round-trip: notepad exact, newline kept');
    eq(Object.keys(p1.ledger).length, 2, 'round-trip: both characters');
    eq(p1.ledger['Stella Voss'].core, 'Duelist.\nSecond seat.', 'round-trip: multi-line CORE survives');
    eq(p1.ledger['Honami "Quote" Rei'].state, 'Library', 'round-trip: quoted name resolves');
    eq(p1.snippets.length, 3, 'round-trip: snippets across layers, story order');
    eq(p1.snippets[0].detail, 'Rain. Claire waited.', 'round-trip: detail sub-block');
    eq(p1.pins.length, 1, 'round-trip: pin');
    ok(!md.includes('undefined'), 'export never prints undefined');

    // survive the auditor: CRLF, edited text, a deleted block, an ADDED block,
    // and a block whose closer the AI ate — the likeliest mutilations.
    let edited = md.replace(/\n/g, '\r\n')
        .replace('The duel with Stella ended in a draw.', 'The duel with Stella ended in her narrow win.')
        .replace(/<!-- SC-PIN[\s\S]*?\/SC-PIN -->\r\n/, '')
        .replace('## PINNED QUOTES', '<!-- SC-SNIPPET {"turns":"?"} -->\r\nA quiet week passed at the academy.\r\n<!-- /SC-SNIPPET -->\r\n\r\n## PINNED QUOTES');
    edited = edited.replace('<!-- /SC-NOTEPAD -->\r\n', '');   // eaten closer
    const p2 = L.parseTransplant(edited);
    ok(p2.notepad.startsWith('Marcroft canon:') && !p2.notepad.includes('SC-LEDGER'), 'tolerance: a missing closer ends at the next opener, not at EOF');
    ok(p2.snippets.some(s => s.text.includes('her narrow win')), 'tolerance: edited snippet text comes through');
    eq(p2.snippets.length, 4, 'tolerance: the added snippet is picked up');
    eq(p2.pins.length, 0, 'tolerance: a deleted block is a deleted item');

    // fresh-chat semantics
    const f = L.storeFieldsFromTransplant(p2, 0);
    ok(Object.values(f.ledger).every(e => e._t === 0), 'import: ledger re-bases to state-as-of-now');
    eq(f.ledgerNotes.length, 2, 'import: one base note per character — page == fold(notes) from the first instant');
    ok(f.ledgerNotes.every(n => n.base === true && n.t === 0) && f.ledgerNotesFrom === 0 && f.ledgerLiveIdx === 0, 'import: journal invariant holds at the base turn');
    ok(f.layers.length === 1 && f.layers[0].every(s => s.turnRange === null), 'import: snippets are layer-0 and RANGE-LESS — their turns lived in another chat');
    ok(f.layers[0].every(s => s.imported === true), 'import: snippets carry the imported stamp');
    ok(f.pins.every(pn => pn.srcIdx === null), 'import: pins are FREE pins — always injected, source text is in another chat by definition');

    // wiring: the import handler resets the machinery of the replaced memory
    ok(SRC_FULL.includes('store.ledgerEra = (store.ledgerEra | 0) + 1;   // checkpoints of the replaced ledger must never restore over the transplant'), 'import: era bump retires old checkpoints');
    ok(/sc_tp_import[\s\S]*?continuityFlags = \[\]/.test(SRC_FULL), 'import: stale continuity state cleared');
    ok(/sc_tp_import[\s\S]*?recomputeSummarizedUpTo\(\);/.test(SRC_FULL), 'import: summarization cursor derives from range-less snippets (fresh)');
    ok(SRC_FULL.includes("fetch(new URL('MEMORY_AUDITOR.md', import.meta.url))"), 'the auditor brief ships with the extension and downloads from its own folder');
    // The brief's zero-loss compression contract (ENI 8.8 ported): the 8 ordered
    // techniques, each guardrailed, and a verification that tests SUBSTANCE, not
    // entry counts. A one-line "tighten wording" produces detail-losing mush.
    {
        const brief = require('fs').readFileSync(require('path').join(__dirname, 'MEMORY_AUDITOR.md'), 'utf8');
        ok(/SEQUENTIAL AGGREGATION[\s\S]*REFERENCE STRIPPING[\s\S]*DIALOGUE SURROUND[\s\S]*EMOTIONAL TEXTURE[\s\S]*SPATIAL\/STAGING[\s\S]*CAUSAL CHAIN NOTATION[\s\S]*REDUNDANT RESTATEMENT[\s\S]*NOTATION COMPRESSION/.test(brief), 'brief: all 8 compression techniques, in the ENI order');
        ok((brief.match(/Guardrail:/g) || []).length >= 6, 'brief: the techniques carry their guardrails — the KEEP conditions ship with the CUT permissions');
        ok(brief.includes('4-Question Test'), 'brief: every sentence faces the 4-question test before it dies');
        ok(brief.includes('ZERO-LOSS VERIFICATION') && brief.includes('"same entry count"\nis the WRONG test'.replace('\n', String.fromCharCode(10))), 'brief: verification tests substance, not counts');
        ok(brief.includes('zero loss wins'), 'brief: on conflict, zero loss beats smaller');
        ok(brief.includes('marker lines are untouchable'), 'brief: compression can never eat the import markers');
        // Token-discipline contract (the user runs this on paid models):
        ok(brief.includes('memory_transplant_edited.md'), 'brief: delivery is a downloadable FILE, named, importable as-is');
        ok(brief.includes('printing it into chat as well is pure token waste'), 'brief: file delivery excludes the chat copy');
        ok(brief.includes('CONTINUED'), 'brief: forced code-block splits have a zero-commentary continuation protocol');
        ok(/a partial file\s+silently deletes whatever it omits/.test(brief), 'brief: COMPLETE is explained by consequence, not just asserted');
        ok(brief.includes('One change, one file.'), 'brief: no re-delivery of unchanged files');
        ok(brief.includes('ON RECEIPT'), 'brief: a bare transplant gets a five-line receipt, not an unrequested audit');
        ok(brief.includes('REPORT ONLY: no file changes, NO file delivery'), 'brief: *audit never ships a file');
        ok(brief.includes('never echo the received file back'), 'brief: the input is never mirrored');
    }
}

section('export tail — the transplant covers the verbatim window, the session stays untouched');
{
    const U = (m) => ({ is_user: true, mes: m });
    const A = (m) => ({ is_user: false, mes: m });
    const chat = [U('u0'), A('a1'), U('u2'), A('a3'), U('u4'), A('a5'), U('u6'), A('a7'), U('u8')];

    // nothing summarized yet: passages tile the WHOLE chat with no gaps
    let b = L._exportTailBatches(chat, -1, 2);
    eq(JSON.stringify(b), JSON.stringify([{ passageStart: 0, endIdx: 3 }, { passageStart: 4, endIdx: 7 }]), 'from scratch: batches of 2 assistant turns, passages contiguous (user turns never skipped)');

    // partially summarized (the reported shape: verbatim window unexported before the fix)
    b = L._exportTailBatches(chat, 3, 2);
    eq(JSON.stringify(b), JSON.stringify([{ passageStart: 4, endIdx: 7 }]), 'tail only: starts right after summarizedUpTo');

    // trailing user message: covered by the last batch's passage end? No — passage
    // ends at the last ASSISTANT turn, same as live summarization; a trailing user
    // message is unread by design (it enters with the next reply).
    b = L._exportTailBatches(chat, 5, 5);
    eq(JSON.stringify(b), JSON.stringify([{ passageStart: 6, endIdx: 7 }]), 'trailing user turn stays outside the passage — identical to live behavior');

    eq(L._exportTailBatches(chat, 7, 3).length, 0, 'fully covered: no ephemeral pass, export is instant');
    eq(L._exportTailBatches([], -1, 3).length, 0, 'empty chat');
    b = L._exportTailBatches(chat, -1, 0);
    ok(b.length === 1 && b[0].passageStart === 0 && b[0].endIdx === 7, 'nonsense batch size falls back to the default (5), never an infinite loop');

    // wiring: the export pass is EPHEMERAL by construction
    const h = SRC_FULL.split("#sc_tp_export")[1].split("#sc_tp_brief")[0];
    ok(h.includes('_exportTailBatches(chat, store.summarizedUpTo,'), 'export: tail computed from the real cursor');
    ok(!/store\.layers\[0\]\.push|store\.summarizedUpTo\s*=|ghostMessagesUpTo|saveChatStore/.test(h), 'export: NO store mutation — no push, no cursor advance, no ghosting, no save (a 9-turn verbatim window is still 9 after)');
    ok(/Object\.assign\(\{\}, store,\s*\{ layers:/.test(h), 'export: fresh snippets ride a COPIED view, never the store');
    ok(h.includes('export aborted so you never get a file missing its newest chapter'), 'export: a failed batch aborts loudly — no half-true file that LOOKS complete');
    ok(h.includes('if (_llmChannelBusy())') && h.includes('if (!_acquireSummarize())') && h.includes('finally { _releaseSummarize();'), 'export: takes and releases the summarizer channel like every other pass');

    // v5.83.0: the ledger gets the same guarantee — ephemerally, into a clone
    ok(h.includes('_exportTailBatches(chat, lp,'), 'export: ledger catch-up batches from the LIVE POINTER (the stale-wave root: pointer legally behind the chat)');
    ok(h.includes('structuredClone(store.ledger || {})'), 'export: the scribe writes a CLONE, never the store');
    ok(h.includes('serializeLedgerForScribe(clone,'), 'export: successive batches compound on the clone (batch N sees batch N-1)');
    ok(h.includes('mergeLedgerDeltas(deltas, clone, b.endIdx)'), 'export: clone-targeted merge — journaling skipped by design, session untouched');
    ok(h.includes('ledgerView ? { ledger: ledgerView } : {}'), 'export: the caught-up ledger rides the view');
    ok(h.includes('export aborted so you never audit dossiers missing their newest chapter'), 'export: a failed scribe batch aborts loudly — no half-current ledger that LOOKS complete');
}

section('continuity editor — content is the identity: Apply and Undo never write blind');
{
    const S = (t, d) => { const o = { text: t }; if (d) o.detail = d; return o; };
    const mk = () => ({ layers: [ [S('alpha'), S('bravo', 'detail-b'), S('charlie')], [S('season one')] ], notepad: 'canon' });

    // happy path: id still true
    let st = mk();
    let hit = L._locateSnippetForOp(st, { op: 'edit_snippet', expect: 'bravo', layer: 0, idx: 1 });
    ok(hit && hit.obj === st.layers[0][1] && hit.idx === 1, 'locate: fast path hits when the reviewed content is still at the id');

    // THE APPLY-ALL SHIFT: an earlier delete moved every later index — the old
    // code re-resolving by id would edit the WRONG snippet; content rescues.
    st = mk();
    st.layers[0].splice(0, 1);   // 'alpha' deleted; 'bravo' now idx 0, 'charlie' idx 1
    hit = L._locateSnippetForOp(st, { op: 'edit_snippet', expect: 'charlie', layer: 0, idx: 2 });
    ok(hit && hit.obj.text === 'charlie' && hit.idx === 1, 'locate: index shift is rescued by content — the edit lands on WHAT WAS REVIEWED');

    // THE PROMOTION SPLICE: reviewed snippet left layer 0 entirely (merged away)
    st = mk();
    st.layers[0].splice(1, 1);   // 'bravo' promoted/merged out of existence
    ok(L._locateSnippetForOp(st, { op: 'edit_snippet', expect: 'bravo', layer: 0, idx: 1 }) === null, 'locate: content gone → null → the card refuses instead of writing a dead object under a green toast');

    // ambiguity refuses
    st = mk(); st.layers[1].push(S('bravo'));
    ok(L._locateSnippetForOp(st, { op: 'edit_snippet', expect: 'bravo' }) === null, 'locate: two identical candidates → refuse, never guess');

    // detail ops match on the DETAIL field
    st = mk();
    hit = L._locateSnippetForOp(st, { op: 'edit_detail', expect: 'detail-b', layer: 0, idx: 1 });
    ok(hit && hit.obj.text === 'bravo', 'locate: detail ops key on the detail field');

    // ── inverses ──
    // undo an edit: find what we wrote, restore what was there
    st = mk(); st.layers[0][1].text = 'bravo EDITED';
    ok(L._applyInverseOp(st, { kind: 'restore', field: 'text', was: 'bravo', now: 'bravo EDITED', layer: 0, idx: 1 }) === true && st.layers[0][1].text === 'bravo', 'inverse: edit restored by content');
    // CAS skip: the value changed AGAIN after the edit — blind restore would overwrite newer truth
    st = mk(); st.layers[0][1].text = 'bravo EDITED TWICE';
    ok(L._applyInverseOp(st, { kind: 'restore', field: 'text', was: 'bravo', now: 'bravo EDITED', layer: 0, idx: 1 }) === false && st.layers[0][1].text === 'bravo EDITED TWICE', 'inverse: changed-again target is SKIPPED, newer truth survives');
    // undo a delete: the exact object returns, detail and all
    st = mk(); const gone = st.layers[0].splice(1, 1)[0];
    ok(L._applyInverseOp(st, { kind: 'insert', layer: 0, idx: 1, obj: gone }) === true && st.layers[0][1].detail === 'detail-b', 'inverse: deleted snippet re-inserted at its place with its detail intact');
    // undo delete_detail: empty `was` deletes the field rather than writing ''
    st = mk(); delete st.layers[0][1].detail; st.layers[0][1].detail = 'temp';
    ok(L._applyInverseOp(st, { kind: 'restore', field: 'detail', was: '', now: 'temp', layer: 0, idx: 1 }) === true && !('detail' in st.layers[0][1]), 'inverse: restoring an empty detail removes the field');
    // notepad CAS both ways
    st = mk(); st.notepad = 'edited';
    ok(L._applyInverseOp(st, { kind: 'notepad', was: 'canon', now: 'edited' }) === true && st.notepad === 'canon', 'inverse: notepad restored');
    st = mk(); st.notepad = 'edited then hand-tweaked';
    ok(L._applyInverseOp(st, { kind: 'notepad', was: 'canon', now: 'edited' }) === false && st.notepad === 'edited then hand-tweaked', 'inverse: hand-tweaked notepad is not clobbered');

    // wiring: the snapshot machinery is dead; Apply refuses empties; undo log is chat-scoped
    ok(!SRC_FULL.includes('_editorUndoSnapshot') && !SRC_FULL.includes('snapshotMemory'), 'the wholesale snapshot (which deleted post-review summaries and left their turns permanently ghosted) is GONE');
    ok(SRC_FULL.includes("if (pend.op === 'edit_snippet' && !newVal) return 'empty';"), 'a blank snippet edit refuses — the silent success-toast no-op is dead');
    ok(SRC_FULL.includes('_editorUndoOps = [];                     // inverse ops reference the OLD chat'), 'chat switch clears the undo log');
    ok(/for \(let i = _editorUndoOps\.length - 1; i >= 0; i--\)/.test(SRC_FULL), 'undo replays inverses LIFO');
    ok(SRC_FULL.includes("else toastr.warning(`${n} applied; ${stale} card"), 'apply-all reports refused cards and keeps them visible');

    // Continuity Apply carries the same mid-flight discipline as the queues:
    // identity AND content verified after the fixer's await, or the rewrite dies.
    ok(/callContinuityFixer[\s\S]{0,900}still\.snippet !== sn \|\| sn\.text !== before/.test(SRC_FULL), 'continuity Apply: a snippet edited or moved during the fixer call is never overwritten with a stale rewrite');

    // v5.83.0 prompt patches: anchor+tag pairs must both exist so the surgical
    // patch lands on stock prompts and then no-ops (idempotence by tag absence).
    ok(SRC_FULL.includes("their state and choices follow from their own perspective, not the reader's.") && SRC_FULL.includes('This applies to threads doubly'), 'ledger prompt patch: the epistemic law reaches THREADS by name');
    ok(SRC_FULL.includes('Omit if no temporal marker appears.') && SRC_FULL.includes('The marker must fit THIS passage'), 'summarizer prompt patch: temporal prefixes span the passage, end day stated');
    ok(SRC_FULL.includes('patchSummarizerPrompt(); } catch (_) {}'), 'summarizer patch runs at load next to the ledger patch');
}

section('ledger key resolution — the fragmentation audit, replayed against the resolver');
{
    // The external audit found 9 blocks for 3 characters. Every variant it listed,
    // as a resolver case — plus the safety cases that must NOT merge.
    const led = {
        'Rose Ōtoribashi': {}, 'Kiyone Kotetsu': {}, 'Sentarō Kotsubaki': {},
        'Madarame': {}, 'Jovan': {},
    };
    eq(L.resolveLedgerKey(led, 'Rose Ōtoribash'), 'Rose Ōtoribashi', 'truncated surname resolves (distance 1)');
    eq(L.resolveLedgerKey(led, 'Rose Otoribashi'), 'Rose Ōtoribashi', 'diacritic drift resolves (normalized exact)');
    eq(L.resolveLedgerKey(led, 'Rose'), 'Rose Ōtoribashi', 'short form resolves (existing stage 3)');
    eq(L.resolveLedgerKey(led, 'Kiyone Kotetsi'), 'Kiyone Kotetsu', 'surname typo resolves (distance 1)');
    eq(L.resolveLedgerKey(led, 'Kiyone Kotsubaki'), 'Kiyone Kotetsu', "CROSSED surname (another character's) resolves to the unique given-name match");
    eq(L.resolveLedgerKey(led, 'Madarome'), 'Madarame', 'single-token typo resolves (distance 1)');
    // safety: never merge two real people
    eq(L.resolveLedgerKey(led, 'Sentarō Kotsubaki'), 'Sentarō Kotsubaki', 'the REAL owner of the crossed surname resolves to himself');
    eq(L.resolveLedgerKey(led, 'Kiyone Aoyama'), 'Kiyone Aoyama', 'a surname unknown to the ledger stays a NEW entry — could be a different Kiyone');
    eq(L.resolveLedgerKey(led, 'Jovana'), 'Jovan', 'near single-token still within distance for short names');
    eq(L.resolveLedgerKey({ 'Kiyone Kotetsu': {}, 'Kiyone Aoyama': {} }, 'Kiyone Kotsubaki'), 'Kiyone Kotsubaki', 'TWO Kiyones → given-name no longer unique → new entry, never a guess');
    eq(L.resolveLedgerKey({ 'Mara': {}, 'Marta': {} }, 'Marra'), 'Marra', 'two near candidates at equal distance → ambiguous → new entry');
    ok(typeof L._lev === 'function' && L._lev('Kotetsu', 'Kotetsi', 2) === 1 && L._lev('abc', 'xyz', 2) === 3, '_lev: distance + cap overflow');
    eq(L._normName('  Ōtori—bashi!  '), 'otoribashi', '_normName strips diacritics, punctuation, spacing');
    eq(L.resolveLedgerKey({ 'A': {} }, 'B'), 'B', 'REGRESSION (caught by the guard test crashing): names under 4 chars never distance-merge');
    eq(L.resolveLedgerKey({ 'Ana': {} }, 'Anna'), 'Anna', '3-char existing key: still no distance merge below the floor');
}

section('ledger contamination guard — a dossier can no longer wear another character\'s skin');
{
    const led = {
        'Shunsui': { core: 'S'.repeat(30) + ' aristocratic ease as governance, the lazy man drawn over iron', arc: 'A'.repeat(50), threads: ['what Mayuri offered Jovan — Nanao ordered to find out', 'the dais debt'] },
    };
    // the audited failure: Mayuri arrives wearing Shunsui's CORE/ARC/THREADS verbatim, own STATE
    const deltas = [{ name: 'Mayuri', core: led['Shunsui'].core, arc: led['Shunsui'].arc, threads: led['Shunsui'].threads.slice(), state: 'examination chamber, crush-before-burn' }];
    const n = L.mergeLedgerDeltas(deltas, led, 100);
    ok(n === 1 && led['Mayuri'], 'the delta still merges (state is legitimate)');
    ok(led['Mayuri'].state === 'examination chamber, crush-before-burn', 'his own STATE lands');
    ok(!led['Mayuri'].core && !led['Mayuri'].arc && !led['Mayuri'].threads, "THE AUDIT'S C1: copied CORE, ARC, and THREADS are dropped at the door");
    ok(led['Shunsui'].core.includes('aristocratic ease'), 'the true owner is untouched');

    // same-batch contamination: two names, one text, no pre-existing entry
    const led2 = {};
    L.mergeLedgerDeltas([
        { name: 'Aoi', core: 'C'.repeat(60) },
        { name: 'Ren', core: 'C'.repeat(60), state: 'at the gate' },
    ], led2, 5);
    ok(led2['Aoi'].core && !led2['Ren'].core && led2['Ren'].state === 'at the gate', 'same-batch verbatim copy: first writer keeps it, second is dropped, rest of the delta lives');

    // guards must NOT fire on short or legitimately-shared text
    const led3 = { 'A': { state: 'at the courtyard' } };
    L.mergeLedgerDeltas([{ name: 'B', state: 'at the courtyard', core: 'a genuinely distinct person with their own long identity text here' }], led3, 5);
    ok(led3['B'].state === 'at the courtyard' && led3['B'].core, 'short shared STATE is fine; distinct core merges; no false positive');
}

section('notepad — one document, two views (panel + full-screen editor)');
{
    // _syncNotepadUi being EXTRACTED is itself the guard: extraction only finds
    // TOP-LEVEL declarations, and this function shipped its first draft nested
    // inside getChatStore() — parse-green, ReferenceError at every call site.
    ok(typeof L._syncNotepadUi === 'function', '_syncNotepadUi is top-level (a nested draft was parse-green and runtime-dead)');

    // editor open: both views receive the write
    L.__resetDom(['#sc_notepad', '#sc_notepad_fs_text', '#sc_notepad_fs_count']);
    L._syncNotepadUi('Marcroft canon: the arch faces east');
    let d = L.__dom();
    ok(d['#sc_notepad'].val === 'Marcroft canon: the arch faces east', 'programmatic write lands in the panel textarea');
    ok(d['#sc_notepad_fs_text'].val === 'Marcroft canon: the arch faces east', 'and in the open full-screen editor');
    ok(d['#sc_notepad_fs_count'].text === '35 ch', 'and the editor char count follows');

    // editor closed: panel only, no phantom writes
    L.__resetDom(['#sc_notepad']);
    L._syncNotepadUi('solo');
    d = L.__dom();
    ok(d['#sc_notepad'].val === 'solo' && (d['#sc_notepad_fs_text'].val === ''), 'with the editor closed only the panel is written');

    ok(L._syncNotepadUi(null) === undefined && L.__dom()['#sc_notepad'].val === '', 'null clears rather than printing "null"');

    // wiring contracts — every programmatic notepad writer goes through the one sync point
    // Exactly two direct writes may exist: inside the sync point itself, and the
    // full-screen editor's keystroke path — which deliberately writes THROUGH the
    // panel via .trigger('input') so store/save/injection stay one pipeline.
    {
        const writes = (SRC_FULL.match(/\$\('#sc_notepad'\)\.val\([^)]+\)/g) || []);
        ok(writes.length === 2 && SRC_FULL.includes("$('#sc_notepad').val(v).trigger('input')"), 'no stray direct #sc_notepad writes bypass the sync point (only the sync point + the editor keystroke pipeline)');
    }
    ok((SRC_FULL.match(/_syncNotepadUi\(/g) || []).length >= 5, 'all four programmatic writers + definition use the sync point');
    ok(SRC_FULL.includes("$('#sc_notepad').val(v).trigger('input');"), 'the full-screen editor writes THROUGH the panel input pipeline — one store path');
    ok(SRC_FULL.includes('window._closeNotepadFs === '.slice(0, 24)) && /onChatChanged\(\) \{\n    try \{ if \(typeof window/.test(SRC_FULL), 'a chat switch closes an open editor — its text belongs to the chat being left');
    ok(SRC_FULL.includes("if (e.key === 'Escape' && $('#sc_notepad_fs').length) _closeNotepadFs();"), 'Escape closes the editor');
}


// ─── structured presence markers: mention is not presence ───
section('presence markers — the watchlist cast is never "in the scene"');
{
    const mkE = (u) => ({ core: 'core text', state: 'doing something', updatedAt: u });
    const led = {
        'Jovan': mkE(60), 'Alexia Valois': mkE(50), 'Honami': mkE(40), 'Miranda': mkE(35),
        'Silas Blackwood': mkE(30), 'Ivar Var Emrys': mkE(20), 'Ghost': mkE(10), 'Renn': mkE(5),
    };
    const s = { ledgerMaxActive: 6, ledgerInjectRoster: true, ledgerRosterMax: 6, ledgerRosterRotate: true };
    const older = 'renn waved once.\n[ist: renn | cheerful | here]\n[acw: silas blackwood | his desk | grey]';
    const newest = 'jovan set his spoon down. alexia stared down the table. honami poured the tea. everyone discussed silas and his headache.\n' +
        '{pulse}\n[ist: alexia valois | flayed-proud | agenda: terms]\n[ist: honami ichinose | glowing | agenda: table]\n[ist: miranda var emrys | feasting | agenda: letters]\n{/pulse}\n' +
        '{watchlist}\n[acw: silas blackwood | his desk, fifth draft | grey]\n[acw: ivar var emrys | emrys academy | waiting]\n{/watchlist}';
    const msgs = [older, newest];
    const cast = L.computeLedgerCast(led, s, msgs.join('\n'), [], 0, msgs);
    const present = cast.shown.concat(cast.compact).map(x => x.name);
    ok(!present.includes('Silas Blackwood'), 'ACW character mentioned in the prose of every message is still NOT injected as present');
    ok(!present.includes('Ivar Var Emrys'), 'second ACW character barred too');
    const carried = (n) => cast.roster.includes(n) || (cast.recalled || []).some(x => x.name === n);
    ok(carried('Silas Blackwood') && carried('Ivar Var Emrys'), 'barred watchlist cast is always carried off-screen — roster line, or a recalled full page when the prose mentions them (the stronger guarantee)');
    ok(present.includes('Alexia Valois'), 'IST capture "alexia valois" matches the full-name ledger key');
    ok(present.includes('Honami'), 'IST capture "honami ichinose" matches the given-name ledger key via aliases');
    ok(present.includes('Jovan'), 'a character unlisted by the markers but in the prose still falls back to name-in-text presence');
    ok(present.includes('Miranda'), 'listed in IST but silent in the prose: present anyway — the attendance sheet is the appearance');
    ok(!present.includes('Renn'), "an OLDER message's IST line does not grant presence — the newest attendance sheet rules, and stale marker lines are stripped from the prose scan");
    ok(!present.includes('Ghost'), 'a character in neither markers nor prose is not present');
    ok(carried('Renn'), 'a tracked character who left the scene stays carried off-screen — roster or recalled, never erased, never present');
    ok(cast.out.every(n => !present.includes(n)), 'present and out never overlap under markers');

    // NEGATIVE GUARD — reintroduce the bug and watch the old behavior return: with
    // markers disabled, the same input makes the watchlist character "present".
    const off = L.computeLedgerCast(led, { ...s, ledgerPresenceMarkers: false }, msgs.join('\n'), [], 0, msgs);
    const offPresent = off.shown.concat(off.compact).map(x => x.name);
    ok(offPresent.includes('Silas Blackwood'), 'guard proven: disabling markers resurrects the false-presence bug, so the bar is what blocks it');

    // On beats off: if the attendance sheet says they are in the room, they are.
    const both = 'stella grinned.\n[ist: stella vermillion | smug]\n[acw: stella vermillion | also listed here by mistake]';
    const castBoth = L.computeLedgerCast({ 'Stella': mkE(9) }, s, both, [], 0, [both]);
    ok(castBoth.shown.some(x => x.name === 'Stella'), 'a name in both lists counts as ON screen — on beats off');

    // Fallback identity: a chat with no markers behaves byte-identically, feature on or off.
    const plainMsgs = ['jovan and claire argued in the hall.', 'stella watched from the door.'];
    const plainLed = { 'Jovan': mkE(3), 'Claire': mkE(2), 'Stella': mkE(1), 'Emilia': mkE(0) };
    const a = L.computeLedgerCast(plainLed, s, plainMsgs.join('\n'), [], 0, plainMsgs);
    const b = L.computeLedgerCast(plainLed, { ...s, ledgerPresenceMarkers: false }, plainMsgs.join('\n'), [], 0, plainMsgs);
    ok(JSON.stringify(a) === JSON.stringify(b), 'no markers in the window -> identical cast with the feature on or off (zero regression for plain chats)');

    // A malformed user pattern never breaks the cast — it just disables marker mode.
    const bad = L.computeLedgerCast(plainLed, { ...s, ledgerPresenceOnPattern: '([unclosed' }, plainMsgs.join('\n'), [], 0, plainMsgs);
    ok(JSON.stringify(bad) === JSON.stringify(b), 'invalid regex in settings: no throw, silent fallback to legacy detection');

    // A ledger character sharing a surname with a TRACKED (older-sheet) character
    // must not be barred by that collision — ambiguity covers the tracked set too.
    const sur = 'elyse spoke softly.\n[ist: mara sterling | calm]';
    const surOld = '[acw: alaric sterling | far end | glacial]';
    const surCast = L.computeLedgerCast({ 'Elyse Sterling': mkE(4), 'Alaric Sterling': mkE(3), 'Mara Sterling': mkE(2) }, s, surOld + '\n' + sur, [], 0, [surOld, sur]);
    const surPresent = surCast.shown.concat(surCast.compact).map(x => x.name);
    ok(surPresent.includes('Elyse Sterling'), 'untracked character with a surname shared across sheets is matched by prose, not mis-barred');
    ok(!surPresent.includes('Alaric Sterling'), 'while the genuinely tracked sibling stays barred');

    // Parser unit checks.
    const pm = L._parsePresenceMarkers(msgs, s);
    ok(pm.found && pm.msgIdx === 1, 'parser picks the NEWEST message with an in-scene capture');
    ok(pm.on.length === 3 && pm.on[0] === 'alexia valois', 'parser captures every IST name from that message');
    ok(pm.off.length === 2 && pm.off.includes('ivar var emrys'), 'parser captures every ACW name from the same message');
    ok(L._parsePresenceMarkers(plainMsgs, s).found === false, 'no markers -> found:false');
    ok(L._parsePresenceMarkers(msgs, { ...s, ledgerPresenceMarkers: false }).found === false, 'feature off -> parser inert');
    const stripped = L._stripPresenceNoise(newest, pm);
    ok(!/\[ist:/.test(stripped) && !/\[acw:/.test(stripped), 'noise strip removes the marker lines from the prose view');
    ok(/jovan set his spoon down/.test(stripped), 'and keeps the story text');
}


// ─── mention recall: the story names them, their page rides along ───
section('mention recall — full page on prose mention, framed off-screen');
{
    const mkE = (u, extra) => Object.assign({ core: 'core of ' + u, state: 'state of ' + u, updatedAt: u }, extra || {});
    const s = { ledgerMaxActive: 6, ledgerInjectRoster: true, ledgerRosterMax: 8, ledgerRosterRotate: true };
    const led = {
        'Jovan': mkE(60), 'Alexia Valois': mkE(50),
        'Silas Blackwood': mkE(30, { threads: ['letter home', 'the debt'], arc: 'souring' }),
        'Ivar Var Emrys': mkE(20), 'Ghost': mkE(10),
    };
    const newest = 'jovan glanced at alexia. everyone was discussing silas and his headache.\n' +
        '[ist: jovan | calm]\n[ist: alexia valois | sharp]\n' +
        '[acw: silas blackwood | his desk | grey]\n[acw: ivar var emrys | emrys academy | waiting]';
    const msgs = ['an earlier scene with nobody named.', newest];
    const cast = L.computeLedgerCast(led, s, msgs.join('\n'), [], 0, msgs);
    const present = cast.shown.concat(cast.compact).map(x => x.name);
    const recalled = (cast.recalled || []).map(x => x.name);
    ok(recalled.includes('Silas Blackwood'), 'ACW character named in the newest PROSE gets a recalled page');
    ok(!present.includes('Silas Blackwood'), 'recall never promotes to present — the bar holds');
    ok(!recalled.includes('Ivar Var Emrys'), 'ACW character whose name appears ONLY in status lines is not "mentioned" — the story has to say the name');
    ok(cast.roster.includes('Ivar Var Emrys'), 'unmentioned watchlist character keeps the roster line');
    ok(!cast.roster.includes('Silas Blackwood'), "a recalled character's roster line is replaced by the full page for the turn");
    ok(!recalled.includes('Ghost'), 'off-screen and unmentioned: not recalled');
    ok(cast.out.every(n => !recalled.includes(n)), 'recalled never lands in "not injected"');

    // The mention window is the current exchange, not the whole active window.
    const staleMsgs = ['everyone was discussing silas.', 'a scene.', 'another scene.', 'the newest scene, nobody named here.\n[ist: jovan | calm]\n[acw: silas blackwood | desk]'];
    const stale = L.computeLedgerCast(led, { ...s, ledgerMentionWindow: 2 }, staleMsgs.join('\n'), [], 0, staleMsgs);
    ok(!(stale.recalled || []).map(x => x.name).includes('Silas Blackwood'), 'a mention older than the window has lapsed — back to the roster line');

    // Weight ranks the capped slots.
    const many = {
        'Anna': mkE(5, { threads: ['a', 'b', 'c'], arc: 'x', bond: 'y' }), 'Bea': mkE(4), 'Cara': mkE(3), 'Dora': mkE(2),
        'Jovan': mkE(60),
    };
    const mm = 'jovan thought about anna, bea, cara and dora.\n[ist: jovan | calm]\n[acw: anna | away]\n[acw: bea | away]\n[acw: cara | away]\n[acw: dora | away]';
    const capped = L.computeLedgerCast(many, { ...s, ledgerMentionMax: 1 }, mm, [], 0, [mm]);
    const cr = (capped.recalled || []).map(x => x.name);
    ok(cr.length === 1 && cr[0] === 'Anna', 'recall cap respected and story-investment weight decides who wins the slot');

    // Toggle off: no recalls, watchlist keeps roster guarantee.
    const off = L.computeLedgerCast(led, { ...s, ledgerMentionRecall: false }, msgs.join('\n'), [], 0, msgs);
    ok((off.recalled || []).length === 0 && off.roster.includes('Silas Blackwood'), 'feature off: no recalled pages, roster line intact');

    // Legacy chats: a prose mention already grants presence, so the tier is empty.
    const plainMsgs = ['jovan and claire argued in the hall.'];
    const plain = L.computeLedgerCast({ 'Jovan': mkE(2), 'Claire': mkE(1) }, s, plainMsgs.join('\n'), [], 0, plainMsgs);
    ok((plain.recalled || []).length === 0, 'no markers: mention = presence, recall tier naturally empty — plain chats unchanged');
}

section('mention recall — end-to-end injection framing');
{
    L.__setSettings(Object.assign({}, defaultSettings, { ledgerInjectRoster: true, ledgerRosterMax: 8 }));
    setStore({
        'Jovan': { core: 'steady', state: 'at lunch', updatedAt: 9 },
        'Silas Blackwood': { core: 'proud, wounded', state: 'skipping lunch, writing home', threads: ['the letter'], updatedAt: 5 },
    });
    L.__setChat([
        { mes: 'Jovan wondered what Silas would write home.\n[IST: Jovan | calm]\n[ACW: Silas Blackwood | his desk | grey]' },
    ]);
    const block = L.buildCharacterBlock();
    ok(block.includes('Just mentioned, not in the scene'), 'recalled section carries the explicit off-screen framing');
    ok(block.includes('Silas Blackwood') && block.includes('proud, wounded'), "the mentioned character's FULL page is injected, not a bare line");
    const framingAt = block.indexOf('Just mentioned');
    const alsoPresentAt = block.indexOf('Also present');
    ok(alsoPresentAt === -1 || block.slice(alsoPresentAt, framingAt === -1 ? undefined : framingAt).indexOf('Silas') === -1, 'and never as present');
    const rosterAt = block.indexOf('Other people in this world');
    ok(framingAt !== -1 && (rosterAt === -1 || framingAt < rosterAt), 'recalled section sits above the roster');
}


// ─── flashbacks: the exact words, dated, with zero model calls ───
section('flashback — keyword-ranked verbatim recall');
{
    // Query tokenizer drops stopwords and noise, keeps the distinctive vocabulary.
    const tk = L._fbTokens('The princess and the TEACUP at the refectory table.');
    ok(tk.includes('princess') && tk.includes('teacup') && tk.includes('refectory'), 'tokenizer keeps distinctive words');
    ok(!tk.includes('the') && !tk.includes('and') && !tk.includes('at'), 'tokenizer drops stopwords');
    ok(new Set(tk).size === tk.length, 'tokens deduped');

    // Ranking: the snippet sharing the query's rare terms wins; name boost decides ties.
    const snips = [
        { text: 'Jovan and Alexia argued about the rematch terms on the platform.', a: 0, b: 3 },
        { text: 'Honami served lunch and the weather was mild.', a: 4, b: 7 },
        { text: 'Thibault shouted about hospitality in the yard.', a: 8, b: 11 },
    ];
    const q = L._fbTokens('alexia rematch terms');
    const ranked = L._fbScore(q, snips, new Set(['alexia', 'jovan']), 3).sort((x, y) => y.score - x.score);
    ok(ranked[0].sn.a === 0, 'the scene sharing the query vocabulary ranks first');
    ok(ranked[0].score > ranked[1].score, 'and scores strictly higher than an unrelated scene');
    const noHit = L._fbScore(L._fbTokens('dragons volcano prophecy'), snips, new Set(), 3);
    ok(noHit.every(r => r.score === 0), 'a query sharing nothing scores zero — the floor keeps silence');
    const boosted = L._fbScore(L._fbTokens('alexia'), snips, new Set(['alexia']), 5);
    const plain = L._fbScore(L._fbTokens('alexia'), snips, new Set(), 5);
    ok(boosted[0].score > plain[0].score, 'ledger names outrank common words (name boost applied)');

    // Date labelling reads the scene header; falls back to distance.
    const sFb = { flashbackDatePattern: '^\\[[^\\]]*?\\u2014\\s*([^|\\]]+)' };
    const withHeader = '[Refectory, Marcroft Academy \u2014 Tideday, Seedfall 8, 1024 AM | 12:16 | bright]\nJovan set his spoon down.';
    const lbl = L._fbDateLabel(withHeader, sFb, 10, 20, 61);
    ok(/Tideday, Seedfall 8, 1024 AM/.test(lbl), 'in-story date extracted from the scene header');
    ok(/40 messages earlier/.test(lbl), 'and paired with distance from now');
    ok(/messages earlier/.test(L._fbDateLabel('No header here at all.', sFb, 10, 20, 61)), 'no header -> distance-only label');
    ok(typeof L._fbDateLabel('x', { flashbackDatePattern: '([unclosed' }, 1, 2, 9) === 'string', 'invalid date regex never throws');
}

section('flashback — end-to-end injection');
{
    const mkChat = (n) => {
        const c = [];
        for (let i = 0; i < n; i++) c.push({ mes: 'filler turn ' + i, is_user: i % 2 === 0 });
        return c;
    };
    const chat = mkChat(40);
    chat[4] = { mes: '[Platform 3, Marcroft \u2014 Duskday, Seedfall 1, 1024 AM | 07:40]\n"When I beat you, I want it to mean something," Alexia said, and threw the sword.' };
    chat[5] = { mes: 'Jovan said nothing.' };
    chat[38] = { mes: 'Alexia mentioned the thrown sword and what she said about it meaning something.', is_user: true };
    L.__setChat(chat);
    L.__setSettings(Object.assign({}, defaultSettings, { verbatimTurns: 4, flashbackMax: 2, flashbackMinScore: 1 }));
    L.__setStore({
        ledger: { 'Alexia Valois': { core: 'proud', updatedAt: 1 } },
        layers: [[
            { text: 'Alexia threw the sword on the platform and said beating him must mean something.', turnRange: [4, 5] },
            { text: 'Honami arranged the lunch table and poured tea for everyone.', turnRange: [8, 9] },
        ]],
    });
    const block = L.buildFlashbackBlock();
    ok(block.includes('<recalled_scenes>'), 'flashback block emitted when an old scene matches');
    ok(block.includes('I want it to mean something'), 'the ORIGINAL words are quoted verbatim, not the summary');
    ok(block.includes('Duskday, Seedfall 1, 1024 AM'), 'the flashback carries its in-story date');
    ok(block.includes('past events, already over'), 'framed as past so it is never replayed as the present scene');
    ok(!block.includes('Honami arranged the lunch table'), 'irrelevant scenes are not injected');

    // Silence when nothing is relevant — a wrong memory is worse than none.
    L.__setChat(chat.slice(0, 38).concat([{ mes: 'The weather turned cold and nothing else happened.', is_user: true }]));
    ok(L.buildFlashbackBlock() === '', 'no relevant scene -> nothing injected');

    // Toggle off.
    L.__setChat(chat);
    L.__setSettings(Object.assign({}, defaultSettings, { verbatimTurns: 4, flashbackEnabled: false, flashbackMinScore: 1 }));
    ok(L.buildFlashbackBlock() === '', 'feature off -> nothing injected');

    // Never quote what is already verbatim in context.
    L.__setSettings(Object.assign({}, defaultSettings, { verbatimTurns: 40, flashbackMinScore: 1 }));
    ok(L.buildFlashbackBlock() === '', 'a scene still inside the verbatim window is never re-quoted');

    // No snippets at all (fresh chat) -> silent, no throw.
    L.__setSettings(Object.assign({}, defaultSettings, { verbatimTurns: 4, flashbackMinScore: 1 }));
    L.__setStore({ ledger: {}, layers: [[]] });
    ok(L.buildFlashbackBlock() === '', 'no memory snippets yet -> silent');
}


// ─── relationship regression: the auditor stops being blind to history ───
section('relationship regression — arc history + snap detection');
{
    const N = (t, name, arc) => ({ t, name, arc, at: t });
    const grown = [
        N(10, 'Honami', 'Wary of him; polite distance.'),
        N(40, 'Honami', 'Wary of him; polite distance. Warmed after the exam — she defends him now.'),
        N(70, 'Honami', 'Wary of him; polite distance. Warmed after the exam — she defends him now. Trusts him with the table.'),
    ];
    const snapped = grown.concat([N(100, 'Honami', 'A classmate she barely knows; keeps her distance.')]);

    const tGrown = L._arcTrajectory(grown, 'Honami');
    ok(tGrown.length === 3 && tGrown[0].t === 10, 'trajectory = every recorded arc version, oldest first');
    ok(L._arcTrajectory(grown.concat([N(80, 'Honami', 'Wary of him; polite distance. Warmed after the exam — she defends him now. Trusts him with the table.')]), 'Honami').length === 3, 'an unchanged re-record is not a new version');
    ok(L._arcTrajectory(grown, 'Nobody').length === 0, 'unknown character -> empty trajectory');
    ok(L._arcTrajectory(null, 'Honami').length === 0, 'no notes -> empty trajectory, no throw');

    ok(L._arcSnapScore(tGrown) === 0, 'pure accretion (the old text still stands inside the new) scores ZERO — growth is not a snap');
    ok(L._arcSnapScore(L._arcTrajectory(snapped, 'Honami')) > 0.45, 'a wholesale rewrite of an established arc scores as a snap');
    ok(L._arcSnapScore([]) === 0 && L._arcSnapScore([{ t: 1, arc: 'x' }]) === 0, 'fewer than two versions cannot snap');
    ok(L._arcSnapScore([{ t: 1, arc: 'cold' }, { t: 2, arc: 'warm' }]) === 0, 'very short arcs are not read into (noise floor)');

    const cands = L._arcRegressionCandidates(snapped, ['Honami'], 0.45);
    ok(cands.includes('Honami'), 'snapped character becomes an audit candidate');
    ok(L._arcRegressionCandidates(grown, ['Honami'], 0.45).length === 0, 'a character who only grew is NOT flagged — no false alarm on healthy development');

    const two = snapped.concat([
        N(10, 'Silas', 'Rivalrous but respectful.'),
        N(60, 'Silas', 'Rivalrous but respectful, and increasingly resentful.'),
    ]);
    ok(L._arcRegressionCandidates(two, ['Silas', 'Honami'], 0.45)[0] === 'Honami', 'candidates ordered worst-snap first');

    const many = [];
    for (let i = 1; i <= 12; i++) many.push(N(i * 10, 'Honami', 'version ' + i + ' of a relationship that keeps being rewritten wholesale ' + 'x'.repeat(i)));
    const packet = L._arcHistoryPacket(many, ['Honami'], 4);
    ok(packet.includes('[turn 10]'), 'the OLDEST established version always survives the cap — it is the claim the current page must answer to');
    ok(packet.includes('[turn 120]'), 'and the newest version is present');
    ok((packet.match(/\[turn /g) || []).length === 4, 'the cap is respected; the middle is what gets dropped');
    ok(L._arcHistoryPacket(grown, ['Nobody'], 6) === '', 'no history -> empty packet, nothing injected into the audit');

    const led = { Honami: { core: 'x', _a: 999 }, Alexia: { core: 'x', _a: 0 }, Silas: { core: 'x', _a: 1 } };
    ok(L._ledgerAuditTargets(led, [], 1, ['Honami'])[0] === 'Honami', 'a snapped relationship jumps the audit queue even when freshly audited');
    ok(L._ledgerAuditTargets(led, [], 1, [])[0] === 'Alexia', 'with nothing snapped, the existing least-recently-audited order is untouched');

    // The doctrine reaches the model, and the history reaches the packet.
    ok(SRC_FULL.includes('RELATIONSHIP REGRESSION'), 'the auditor prompt carries the regression clause');
    ok(SRC_FULL.includes('<relationship_history>'), 'arc history is appended to the audit context');
    ok(SRC_FULL.includes('_arcRegressionCandidates(store.ledgerNotes'), 'candidates are computed from the notes journal at audit time');
}


// ─── shrink guard: promotion can no longer destroy its sources silently ───
section('shrink guard — lossy merges are caught, warned, and reversible');
{
    const s = { shrinkMinRatio: 0.12, shrinkMinChars: 120 };
    const big = 5000;
    ok(_S(L._shrinkVerdict(big, 2000, s)).thin === false, 'healthy compression (40% kept) is NOT flagged — compression is the point of promotion');
    ok(_S(L._shrinkVerdict(big, 900, s)).thin === false, 'ordinary strong compression (18%) is still fine');
    ok(_S(L._shrinkVerdict(big, 200, s)).thin === true, 'a collapse (4% kept) IS flagged');
    ok(_S(L._shrinkVerdict(800, 100, s)).thin === true, 'ratio passes (12.5%) but the absolute char floor does not — still flagged, so a small source set cannot slip through on ratio alone');
    ok(_S(L._shrinkVerdict(300, 20, s)).thin === false, 'a tiny source set is never flagged — no volume to lose, flagging it would be noise');
    ok(_S(L._shrinkVerdict(0, 0, s)).ratio === 1, 'empty source cannot divide by zero');
    const v = _S(L._shrinkVerdict(1000, 100, s));
    ok(Math.abs(v.ratio - 0.1) < 1e-9, 'ratio is reported for the warning text');

    // The stash keeps the originals recoverable, bounded so it cannot kill the quota.
    const stash = L._stashSources(['alpha scene text', 'beta scene text'], 4000);
    ok(stash.includes('alpha scene text') && stash.includes('beta scene text'), 'stash preserves every source snippet verbatim');
    const capped = L._stashSources(['x'.repeat(9000)], 500);
    ok(capped.length <= 540 && /stash truncated/.test(capped), 'stash is bounded — an unbounded one would trade silent loss for quota death');
    ok(L._stashSources(['a'], 0) === '' && L._stashSources(null, 4000) === '', 'stash disabled or absent -> empty, no throw');

    // Wiring contracts: the guard actually sits on the destructive path.
    ok(SRC_FULL.includes('let metaSummary = await callSummarizer(storyTxt, contextStr);'), 'the merge result is mutable so a stricter retry can replace it');
    ok(SRC_FULL.includes('if (retry.length > metaSummary.length) { metaSummary = retry; shrink = v2; }'), 'a retry is only taken when it survives MORE of the sources');
    ok(SRC_FULL.includes('merged.thinMerge ='), 'a thin merge is recorded on the snippet, never accepted silently');
    ok(SRC_FULL.includes('if (stash) merged.thinSources = stash;'), 'and the originals ride along so the loss is reversible');
    ok(SRC_FULL.includes('sc-thin-restore'), 'the Memory panel offers a one-click restore');
    ok(SRC_FULL.includes("sn.text = sn.thinSources;"), 'restore puts the original snippets back into the memory');
    ok(/sc-thin-restore[\s\S]{0,900}await saveChatStore\(\)/.test(SRC_FULL), 'restore persists through saveChatStore — the one real persistence path (a saveChatDebounced call here is a ReferenceError; this extension never imports it)');
    ok(!/saveChatDebounced/.test(SRC_FULL), 'saveChatDebounced is never referenced anywhere — it is not imported in this extension');
}


// ─── identity: the player and their protagonist are one participant ───
section('persona/MC identity — the record stops inventing a second person');
{
    // THE BUG AT THE BOTTOM: token substitution replaced only the FIRST match, so
    // every later {{player_name}} reached the model as literal placeholder text.
    const tpl = 'track {{player_name}} and how they address {{player_name}} and {{player_name}} again';
    const done = L.subst(tpl, '{{player_name}}', 'Jovan');
    ok(!done.includes('{{player_name}}'), 'EVERY occurrence is substituted — a single leftover placeholder is what forced the scribe to guess who the player character is');
    ok((done.match(/Jovan/g) || []).length === 3, 'all three sites carry the real name');
    ok(L.subst('a $& b {{x}}', '{{x}}', '$&') === 'a $& b $&', 'the value is inserted literally — no $-pattern interpretation');
    ok(L.subst(null, '{{x}}', 'y') === '' && L.subst('none here', '{{x}}', 'y') === 'none here', 'null template and absent token are safe');

    // The system prompt — where the arc/core RULES live — must carry the name too.
    ok(/const sysPrompt = subst\(opts\.systemPrompt \|\| s\.summarizerSystemPrompt, '\{\{player_name\}\}', getPlayerName\(\)\)/.test(SRC_FULL), 'the SYSTEM prompt is substituted, not just the user prompt');
    ok(SRC_FULL.includes('_identityNote()'), 'and the identity note rides on every pass');
    ok(SRC_FULL.includes('_coverageNote()'), 'and the fiction-coverage note rides on every pass — a utility model with no frame for explicit material refuses or sanitizes, and a sanitized summary silently amputates canon');
    ok(SRC_FULL.includes('+ _identityNote() + _coverageNote()'), 'both ride at the single callSummarizer chokepoint, so all eight passes get them');

    // The injection voice belongs to WHOEVER the player is — never a hardcoded
    // name, and never the role-words "User"/"Player" (ST's unset defaults),
    // which read as corpo to a defensive storyteller persona.
    L.__setCtxExtra({ name1: 'Jovan' });
    ok(L._noteLabel() === "Jovan's note", 'the note speaks with the player\'s own persona name');
    for (const unset of ['User', 'user', 'USER', 'Player', 'player', '', '   ']) {
        L.__setCtxExtra({ name1: unset });
        ok(L._noteLabel() === "Author's note", `unset/role-word persona "${unset}" falls back to the author's note, never a role-word`);
    }
    L.__setCtxExtra({});
    ok(SRC_FULL.includes("_noteLabel() + ' \\u2014 my running reference for our story:"), 'one umbrella line establishes the source once — section headers stay short, and no name is baked into a stored template');
    ok(!SRC_FULL.includes('<continuity_corrections>'), 'the snake_case machine tag is gone — the record fixes ride as plain first-person prose under the umbrella');
    ok(SRC_FULL.includes("injectionTemplate: [\n        '[Story memory continuation") && SRC_FULL.includes("sisterInjectTemplate: [\n") && SRC_FULL.includes("ledgerInjectTemplate: [\n"), 'both prior shipped forms of all three chat-facing templates are in PRIOR_PROMPT_DEFAULTS, so existing installs auto-upgrade');
    ok(!/"Bruce's note — our story so far/.test(SRC_FULL.split('PRIOR_PROMPT_DEFAULTS')[0]), 'no hardcoded player name remains in the shipped defaults');
    ok(/never describe a relationship, interaction, or absence of interaction BETWEEN/.test(SRC_FULL), 'the note forbids exactly the "never interacted with" category error');

    // Folding a phantom persona entry into the protagonist.
    const led = {
        'LO': { core: 'director handle', arc: 'Jovan has never interacted with LO directly.', threads: ['phantom thread'], updatedAt: 5 },
        'Jovan': { core: 'steady, unhurried', state: 'at lunch', updatedAt: 9 },
        'Alexia': { core: 'proud', arc: 'Wary of Jovan.', updatedAt: 7 },
    };
    const h = L._healPersonaEntry(led, 'LO', 'Jovan');
    ok(h.folded === true, 'the phantom persona entry is folded away');
    ok(!Object.prototype.hasOwnProperty.call(led, 'LO'), 'and no longer exists in the record');
    ok(led['Jovan'].core === 'steady, unhurried', "the protagonist's own observed text is never overwritten by the phantom's");
    ok(led['Jovan'].arc === 'Jovan has never interacted with LO directly.', 'an EMPTY protagonist field does adopt the phantom\'s content — nothing observed is discarded');
    ok(led['Jovan'].updatedAt === 9, 'newest timestamp wins');
    ok(h.suspect.includes('Jovan'), 'text still naming the persona as a third party is flagged for re-derivation, not rewritten by string surgery');
    ok(!h.suspect.includes('Alexia'), 'an entry that merely mentions the protagonist is not flagged');

    // Mis-keyed record with no protagonist entry: rename, never discard.
    const only = { 'LO': { core: 'hard-won observation', updatedAt: 3 } };
    ok(L._healPersonaEntry(only, 'LO', 'Jovan').folded === true && only['Jovan'].core === 'hard-won observation' && !only['LO'], 'when there is no protagonist entry the phantom is RENAMED, so observation is preserved');

    // Word-boundary safety: a real character whose name contains the handle stays.
    const near = { 'Lorenzo': { core: 'Lorenzo keeps his distance from Jovan.', updatedAt: 1 }, 'Jovan': { core: 'x', updatedAt: 2 } };
    const hn = L._healPersonaEntry(near, 'LO', 'Jovan');
    ok(!!near['Lorenzo'] && hn.folded === false, 'a character whose name merely CONTAINS the handle is untouched');
    ok(!hn.suspect.includes('Lorenzo'), "the handle appearing INSIDE a longer word ('Lorenzo' contains 'LO') is not a mention — word boundaries, not substring");

    // No split configured -> nothing happens at all.
    const plain = { 'Jovan': { core: 'x', updatedAt: 1 } };
    const before = JSON.stringify(plain);
    const hp = L._healPersonaEntry(plain, '', 'Jovan');
    ok(JSON.stringify(plain) === before && hp.folded === false, 'no persona split -> the record is untouched');
    ok(L._healPersonaEntry(plain, 'Jovan', 'Jovan').folded === false, 'persona identical to the MC name is not a split');

    // The code-level bar exists so the fix does not depend on the model obeying.
    ok(SRC_FULL.includes("rawName = _sp.mc;"), 'a delta filed under the persona handle is REDIRECTED to the protagonist, not dropped');
    ok(SRC_FULL.includes('_healPersonaEntry(ledger, sp.persona, sp.mc)'), 'existing chats heal automatically on the next merge — no manual step');
}


// ─── autonomous identity: nobody should have to fill in a field ───
section('MC name — resolved automatically, override only to correct');
{
    const setCtx = (o) => L.__setCtxExtra(o);
    // Layer order is by AUTHORITY: human > sibling extension > self-learned > label.
    L.__setStore({ ledger: {}, mcName: 'Manual Name', mcLearned: 'Learned Name' });
    setCtx({ name1: 'LO', name2: 'Narrator', chatMetadata: { arbiter: { mcName: 'Arbiter Name' } } });
    ok(L.resolveMcName() === 'Manual Name', 'an explicit human answer outranks everything');

    L.__setStore({ ledger: {}, mcLearned: 'Learned Name' });
    ok(L.resolveMcName() === 'Arbiter Name', "a sibling extension's learned name is used with NO user action — same chat, same universe");

    setCtx({ name1: 'LO', name2: 'Narrator', chatMetadata: {} });
    ok(L.resolveMcName() === 'Learned Name', 'without Arbiter, this extension uses what it learned itself');

    L.__setStore({ ledger: {} });
    ok(L.resolveMcName() === '', 'nothing known yet -> empty, and getPlayerName falls back to the persona label as before');

    // Arbiter reader is defensive: absent/garbage metadata never throws.
    setCtx({ name1: 'LO', chatMetadata: null });
    ok(L.resolveMcName() === '', 'missing chat metadata is safe');
    setCtx({ name1: 'LO', chatMetadata: { arbiter: { mcName: '   ' } } });
    ok(L.resolveMcName() === '', 'blank sibling value is ignored');

    // What the scribe reports is filtered before it is trusted.
    ok(L._acceptLearnedMc('Jovan Oda', 'LO', 'Narrator') === 'Jovan Oda', 'a real story name is accepted');
    ok(L._acceptLearnedMc('  Jovan   Oda  ', 'LO', 'Narrator') === 'Jovan Oda', 'whitespace is normalised');
    ok(L._acceptLearnedMc('LO', 'LO', 'Narrator') === '', 'the persona label is rejected — that is the bug, not the answer');
    ok(L._acceptLearnedMc('lo', 'LO', 'Narrator') === '', 'and case-insensitively so');
    ok(L._acceptLearnedMc('Marcroft Chronicle', 'LO', 'Marcroft Chronicle') === '', 'the CARD name is rejected — the storyteller card is not the player (fixture uses a name no other rule would catch)');
    ok(L._acceptLearnedMc('Player', 'LO', 'Narrator') === '' && L._acceptLearnedMc('MC', 'LO', 'N') === '', 'placeholder words are rejected');
    ok(L._acceptLearnedMc('{{user}}', 'LO', 'N') === '', 'an unexpanded macro is rejected');
    ok(L._acceptLearnedMc('', 'LO', 'N') === '' && L._acceptLearnedMc('J', 'LO', 'N') === '', 'empty and one-character answers are rejected');
    ok(L._acceptLearnedMc('x'.repeat(200), 'LO', 'N').length === 60, 'absurd length is clamped');

    // Wiring contracts.
    ok(SRC_FULL.includes('is_player_character'), 'the scribe is asked to mark the player character on the entry it already writes — no extra model call');
    ok(SRC_FULL.includes('if (!resolveMcName())'), 'learning only ever FILLS an unknown name; it can never overwrite a working setup');
    ok(SRC_FULL.includes("chatMetadata.arbiter.mcName") || SRC_FULL.includes("chatMetadata && chatMetadata.arbiter"), 'the sibling extension is read directly');
    ok(!/must be set|please set the/i.test(SRC_FULL.slice(SRC_FULL.indexOf('function resolveMcName'), SRC_FULL.indexOf('function resolveMcName') + 1200)), 'the resolver never demands user input');
}


// ─── v5.99.0: a shorter chat can never leave live notes about turns it dropped ──
// The journal is turn-indexed and every fold reads ALL of it, so a single note past
// the chat end repaints the abandoned timeline over the page at the next routine
// deletion. Until v5.99.0 the ONLY function that dropped such notes was
// rewindLedgerFromNotes, reachable only through tryAutoRewindLedger — which returns
// on its first line when `ledgerAutoRewind` is off. One user-facing toggle therefore
// decided whether dead notes were ever cleaned at all.
{
    section('truncation hygiene — dead notes never survive a shorter chat');

    // Case A: the journal covers the survivors -> exact fold, no model call.
    {
        const store = {
            summarizedUpTo: 30, ledgerLiveIdx: 30, _ckptLast: 29, ledgerNotesFrom: 0,
            ledgerNotes: [
                { t: 2,  name: 'Rukia',    core: 'shinigami',      at: 1 },
                { t: 25, name: 'Malachar', core: 'the hollow king', at: 2 },
            ],
            layers: [], ghostedIndices: [], continuityFlags: [],
        };
        L.__setStore(store);
        const verdict = L.truncateLedgerToTurn(store, 10);
        ok(verdict === 'exact', 'a covered journal truncates to an EXACT fold');
        ok(!store.ledgerNotes.some(n => n.t > 10), 'no note survives past the last turn');
        ok(!Object.prototype.hasOwnProperty.call(store.ledger, 'Malachar'), 'a character recorded only on the dropped turns is gone from the page');
        ok(Object.prototype.hasOwnProperty.call(store.ledger, 'Rukia'), 'and one recorded on a surviving turn is kept');
        ok(store.ledgerLiveIdx === 10 && store._ckptLast === 10, 'both turn cursors are clamped to the new end');
        ok(L.truncateLedgerToTurn(store, 10) === false, 'truncating again is a no-op — idempotent');
    }

    // The resurrection itself: trim, then delete one more message (which refolds).
    {
        const store = {
            summarizedUpTo: 30, ledgerLiveIdx: 30, ledgerNotesFrom: 0,
            ledgerNotes: [
                { t: 2,  name: 'Rukia',    core: 'shinigami',      at: 1 },
                { t: 25, name: 'Malachar', core: 'the hollow king', at: 2 },
            ],
            layers: [], ghostedIndices: [], continuityFlags: [],
        };
        L.__setStore(store);
        L.clampStoreToLength(store, 11);   // bulk trim, auto-rewind irrelevant
        L.reindexAfterDeletion(store, 5);  // a later single deletion refolds the journal
        ok(!Object.prototype.hasOwnProperty.call(store.ledger || {}, 'Malachar'),
            'the abandoned timeline cannot come back through a later deletion refold');
    }

    // Case B: the journal's own base turn is gone. Dead notes still go — but the
    // page is NOT touched and coverage is NOT manufactured. notesCover saying "no"
    // is the signal that routes tryAutoRewindLedger to a checkpoint / synthesized
    // restore point / staged rebuild, and a page that may be entirely abandoned-
    // timeline content is exactly what that path exists to replace. An earlier
    // draft re-based the journal off that page here: the stale page then vouched
    // for itself, notesCover flipped true, and the rebuild never ran.
    {
        const store = {
            summarizedUpTo: 400, ledgerLiveIdx: 400, ledgerNotesFrom: 100,
            ledger: { 'Malachar': { core: 'STALE — from the abandoned timeline' } },
            ledgerNotes: [{ t: 250, name: 'Malachar', core: 'STALE — from the abandoned timeline', at: 2 }],
            layers: [], ghostedIndices: [],
        };
        L.__setStore(store);
        const verdict = L.truncateLedgerToTurn(store, 10);
        ok(verdict === 'trimmed', 'a journal that cannot cover the survivors reports a trim, never an exact rewind');
        ok(store.ledgerNotes.length === 0, 'its dead notes are gone all the same');
        ok(store.ledgerNotesFrom === 100, 'and it does NOT lower its base turn to fake coverage');
        ok(L.notesCover(store, 10) === false, 'KILL SHOT: coverage stays false — the signal that routes to the rebuild is intact');
        ok(String(store.ledger['Malachar'].core).includes('STALE'), 'the page is left untouched for the rewind path to replace');
    }

    // The staging journal is the same structure and gets the same treatment.
    {
        const store = {
            ledgerLiveIdx: 30, ledgerNotesFrom: 0,
            ledgerNotes: [{ t: 2, name: 'Rukia', core: 'c', at: 1 }],
            ledgerStagingNotes: [{ t: 2, name: 'Rukia', core: 'c', at: 1 }, { t: 28, name: 'Ghost', core: 'g', at: 2 }],
        };
        L.__setStore(store);
        L.truncateLedgerToTurn(store, 10);
        ok(!store.ledgerStagingNotes.some(n => n.t > 10), 'the staging journal is trimmed with the live one');
    }

    // A pre-notes chat has no journal to trim and must not be invented one.
    {
        const store = { ledgerLiveIdx: 30, _ckptLast: 30, ledger: { 'Rukia': { core: 'c' } } };
        L.__setStore(store);
        ok(L.truncateLedgerToTurn(store, 10) === false, 'a chat with no journal reports no truncation');
        ok(store.ledgerNotes === undefined, 'and no journal is fabricated for it');
        ok(store.ledgerLiveIdx === 10 && store._ckptLast === 10, 'its pointers are still clamped — that part is unconditional');
    }

    // STRUCTURAL: the hygiene must not sit behind the auto-rewind opt-out again.
    ok(/function clampStoreToLength[\s\S]{0,1200}?truncateLedgerToTurn\(store, max\)/.test(SRC_FULL),
        'clampStoreToLength delegates journal + pointer hygiene to the one primitive');
    ok(/truncateLedgerToTurn\(store, chatLength - 1\)/.test(SRC_FULL),
        'branch repair truncates the journal ITSELF, before the rewind strategy it may decline');
    {
        const i = SRC_FULL.indexOf('async function tryAutoRewindLedger');
        const j = SRC_FULL.indexOf('truncateLedgerToTurn', i);
        const k = SRC_FULL.indexOf('\nfunction queueLedgerUpdate', i);
        ok(i > 0 && (j === -1 || j > k), 'the primitive is NOT called from inside tryAutoRewindLedger — hygiene must not inherit its opt-out');
    }
}

// ─── v5.99.0: resolved receipts shift with the flags they came from ────────────
{
    section('continuity receipts — reindexed like everything else turn-indexed');
    const store = {
        summarizedUpTo: 20, ledgerLiveIdx: 20, layers: [], ghostedIndices: [],
        continuityFlags:    [{ turnRange: [10, 12], issue: 'x' }],
        continuityResolved: [{ turnRange: [10, 12], issue: 'x' }, { turnRange: [3, 3], issue: 'dies' }],
    };
    L.__setStore(store);
    L.reindexAfterDeletion(store, 3);
    ok(JSON.stringify(store.continuityResolved[0].turnRange) === JSON.stringify(store.continuityFlags[0].turnRange),
        'a receipt shifts by exactly what its flag shifted by');
    ok(store.continuityResolved.length === 1, 'a receipt whose only turn was deleted is dropped, not left pointing at a stranger');
    ok(store.continuityResolved.every(r => !Array.isArray(r.turnRange) || r.turnRange[0] <= r.turnRange[1]), 'no inverted range survives');
}

// ─── v5.99.0: every driver that writes after a model call is epoch-guarded ─────
// abortSummarization() covers a chat switch DURING a call. It cannot cover one that
// arrives after the call resolved — and the summarization drivers keep writing for a
// long time after that: a /hide per contiguous range (each a full chat-file write
// against whatever chat is loaded NOW) and a whole second model round-trip for
// promotion. These three were the last drivers in the file relying on the abort alone.
{
    section('chat-switch law — no driver writes a result across an epoch bump');
    const fnBody = (name) => {
        const i = SRC_FULL.indexOf('async function ' + name + '(');
        if (i < 0) return '';
        const j = SRC_FULL.indexOf('\nasync function ', i + 10);
        const k = SRC_FULL.indexOf('\nfunction ', i + 10);
        const end = Math.min(j < 0 ? SRC_FULL.length : j, k < 0 ? SRC_FULL.length : k);
        return SRC_FULL.slice(i, end);
    };
    for (const name of ['summarizeOneBatch', 'summarizeOneBatchFromTurns', 'maybePromoteLayer', 'ghostMessagesUpTo']) {
        const body = fnBody(name);
        ok(body.length > 0, `${name} is locatable in the source`);
        ok(/const (startEpoch|_ghostEpoch) = _chatEpoch;/.test(body), `${name} captures the epoch before its first await`);
        ok(/_chatEpoch !== (startEpoch|_ghostEpoch)/.test(body), `${name} checks the epoch again after it`);
    }
    // The guard must sit BEFORE the write it protects, not after.
    const sob = fnBody('summarizeOneBatch');
    ok(sob.indexOf('_chatEpoch !== startEpoch') < sob.indexOf('store.layers[0].push'),
        'summarizeOneBatch checks the epoch BEFORE pushing the snippet');
    const mpl = fnBody('maybePromoteLayer');
    {
        // Anchored on the SHRINK RETRY, not on the function start. The retry is a
        // second model round-trip, so a guard placed only before it proves nothing
        // about the window that actually precedes the splice. (The earlier form
        // asked whether ANY check came before the loop — the top-of-function one
        // always did, so deleting the real guard left the assertion green.)
        const _retry = mpl.indexOf('const retry = await callSummarizer(');
        const _splice = mpl.indexOf('for (const sn of toMerge) {');
        const _guard = mpl.indexOf('_chatEpoch !== startEpoch', _retry);
        ok(_retry > 0 && _splice > _retry, 'maybePromoteLayer: shrink retry and splice are both locatable, in that order');
        ok(_guard > _retry && _guard < _splice,
            'maybePromoteLayer re-checks AFTER the shrink retry and BEFORE the irreversible splice');
    }
    const gmu = fnBody('ghostMessagesUpTo');
    ok(gmu.indexOf('_chatEpoch !== _ghostEpoch') < gmu.indexOf('executeSlashCommandsWithOptions'),
        'ghostMessagesUpTo checks the epoch inside the /hide loop, before each write');
}


// ─── v5.99.0: errors WE author carry an explicit retryable flag ───────────────
// isRetryableError falls back to substring-matching the message, and its list
// contains 'timeout'. The 120s ceiling this extension imposes on itself rejected
// with 'Request timed out after 120s' — 'timed out', not 'timeout' — so the ONE
// timeout the extension generates was the one it classified as fatal: zero retries,
// batch dead, while the toast claimed all retries were exhausted. A 120s ceiling is
// routine for a slow local model on a long promotion merge.
{
    section('retry classification — the self-imposed timeout is retryable');
    const own = new L.ConnectionError('Request timed out after 120s', { retryable: true });
    ok(L.isRetryableError(own) === true, 'KILL SHOT: the extension\u2019s own 120s timeout retries');
    ok(own.name === 'ConnectionError' && own.retryable === true, 'it carries the flag rather than depending on its own wording');
    // The flag must WIN over the substring table, in both directions.
    ok(L.isRetryableError(new L.ConnectionError('deleted profile', { retryable: false })) === false,
        'and an explicitly non-retryable ConnectionError is still never retried');
    // Errors we RECEIVE still go through the substring table — unchanged.
    ok(L.isRetryableError(new Error('Upstream timeout')) === true, 'a provider error mentioning a timeout still retries');
    ok(L.isRetryableError(Object.assign(new Error('x'), { status: 429 })) === true, 'a 429 still retries');
    ok(L.isRetryableError(Object.assign(new Error('x'), { name: 'AbortError' })) === false, 'an abort is never retried');
    // Structural: the timeout rejection must not go back to a bare Error.
    ok(/reject\(new ConnectionError\('Request timed out after 120s', \{ retryable: true \}\)\)/.test(SRC_FULL),
        'the timeout rejection is a flagged ConnectionError, not a bare Error');
}

// ─── v5.99.0: eviction order is by KIND first, because `at` has two units ─────
// A checkpoint's `at` is a turn number; a backup's is epoch milliseconds. Sorting
// them together never compared age — every turn number sorts below every timestamp.
{
    section('storage eviction — ranked by kind, not by two incompatible units');
    const mk = (key, at, rank, group, bytes) => ({ key, at, rank, group, bytes, tiered: rank === 0 });
    // A backup from 1970 (at=1) against a checkpoint at turn 900. Raw `at` would
    // evict the backup first; rank must still send the checkpoint first.
    const entries = [
        mk('sc_ledgerckpt::A::900', 900, 0, 'sc_ledgerckpt::A', 50000),
        mk('summaryception_bak::i:old', 1, 1, 'summaryception_bak', 50000),
    ];
    const ev = L._selectStorageEvictions(entries, 60000, 0, 0);
    ok(ev.length === 1, 'exactly one entry is evicted to get under budget');
    ok(ev[0].indexOf('sc_ledgerckpt') === 0,
        'KILL SHOT: the re-derivable checkpoint goes first even though its `at` is numerically larger');
    // Within a kind the unit IS consistent, so oldest-first must still hold.
    const sameKind = [
        mk('sc_ledgerckpt::A::30', 30, 0, 'sc_ledgerckpt::A', 50000),
        mk('sc_ledgerckpt::A::10', 10, 0, 'sc_ledgerckpt::A', 50000),
    ];
    const ev2 = L._selectStorageEvictions(sameKind, 60000, 0, 0);
    ok(ev2.length === 1 && ev2[0].endsWith('::10'), 'within one kind, the oldest still goes first');
    // An unranked entry must never be evicted ahead of something known re-derivable.
    const mixed = [
        { key: 'unknown::x', at: 1, bytes: 50000, group: 'u' },
        mk('sc_ledgerckpt::A::5', 5, 0, 'sc_ledgerckpt::A', 50000),
    ];
    const ev3 = L._selectStorageEvictions(mixed, 60000, 0, 0);
    ok(ev3.length === 1 && ev3[0].indexOf('sc_ledgerckpt') === 0, 'an unranked entry sorts last, not first');
    // The producer must actually stamp the rank, or the comparator is inert.
    ok(/rank: isCkpt \? 0 : 1/.test(SRC_FULL), 'gcLocalStorageBudget stamps the rank it sorts by');
}

// ─── v5.99.0: the checkpoint cursor follows a deletion, like the pointer it is
// compared against (maybeCheckpointLedger: idx < _ckptLast + CKPT_EVERY, CKPT_EVERY 1)
{
    section('checkpoint cursor — never left above the pointer it gates on');
    const store = { summarizedUpTo: 20, ledgerLiveIdx: 20, _ckptLast: 20, layers: [], ghostedIndices: [] };
    L.__setStore(store);
    L.reindexAfterDeletion(store, 5);
    ok(store.ledgerLiveIdx === 19, 'the live pointer follows the deletion');
    ok(store._ckptLast === 19, 'and so does the checkpoint cursor — no free blackout turn per deletion');
    ok(store._ckptLast <= store.ledgerLiveIdx, 'the cursor is never left above the pointer');
    // A cursor BELOW the deletion describes a turn that did not move.
    const s2 = { summarizedUpTo: 20, ledgerLiveIdx: 20, _ckptLast: 2, layers: [], ghostedIndices: [] };
    L.__setStore(s2);
    L.reindexAfterDeletion(s2, 5);
    ok(s2._ckptLast === 2, 'a cursor before the deletion point does not move');
}


// ─── v5.99.0: threads survive a transplant ────────────────────────────────────
// threads is an ARRAY everywhere. The export wrote String(e.threads) — a comma-join
// of a field whose members routinely contain commas — and the import copied the
// joined STRING straight into entry.threads, where every consumer gates on
// Array.isArray. The flagship field arrived in the new chat as dead text that no
// fold, no scribe and no injection ever read: silently emptied by the one feature
// built to carry it.
{
    section('transplant — the one non-string field round-trips');
    const store = {
        notepad: '', layers: [[]], pins: [], continuityFlags: [],
        ledger: { 'Claire Argent': {
            core: 'guarded, dry', state: 'waiting by the arch', arc: 'warming, slowly',
            threads: ['owes Jovan an answer about the letter',
                      'has not admitted she waited, and she waited a long time'],
            _t: 12, updatedAt: 1 } },
    };
    L.__setStore(store);
    const doc = L.buildTransplantExport(store, {});
    const back = L.storeFieldsFromTransplant(L.parseTransplant(doc), 0);
    const e = back.ledger['Claire Argent'];
    ok(Array.isArray(e.threads), 'KILL SHOT: threads come back as an ARRAY, not a joined string');
    ok(e.threads.length === 2, 'both threads survive — the count is not collapsed');
    ok(e.threads[1].indexOf('waited, and she waited') >= 0,
        'a thread containing a COMMA is not split at it (the old encoding could not express this)');
    ok(L.formatLedgerEntry('Claire Argent', e, 600).indexOf('Open:') >= 0,
        'and the Open: line therefore reaches the storyteller');
    // page == fold(notes) must hold from the first instant in the new chat.
    const bn = (back.ledgerNotes || []).find(n => n.name === 'Claire Argent');
    ok(bn && Array.isArray(bn.threads) && bn.threads.length === 2,
        'the base note carries the same array — page and journal agree on arrival');

    // The importer is a trust boundary: a hand-edited or AI-rewritten document
    // must never be able to put a non-array in that slot.
    ok(Array.isArray(L._tpThreads('- a\n- b')) && L._tpThreads('- a\n- b').length === 2, 'bulleted lines parse to two threads');
    ok(L._tpThreads('\u2022 a\n* b').length === 2, 'bullet and asterisk markers are accepted too');
    ok(L._tpThreads('one line, with a comma').length === 1,
        'a legacy single-line value becomes ONE thread — never comma-split, which would invent boundaries');
    ok(L._tpThreads(['  x  ', '', 42, null, 'y']).length === 2, 'junk members are dropped, survivors trimmed');
    // Array.isArray FIRST: reading .length off a non-array THROWS, which crashes the
    // harness instead of failing this assertion — and a guard that cannot be
    // attributed to its own bug is not a guard.
    ok(Array.isArray(L._tpThreads(undefined)) && Array.isArray(L._tpThreads(null)) && Array.isArray(L._tpThreads(7))
        && L._tpThreads(undefined).length === 0 && L._tpThreads(null).length === 0 && L._tpThreads(7).length === 0,
        'anything else yields an empty array, never a non-array');
    ok(L.storeFieldsFromTransplant({ ledger: { X: { core: 'c', threads: 'solo' } } }, 0).ledger.X.threads.length === 1,
        'a document with a raw string threads field is coerced at import');
    // Structural: the export must not go back to String(array).
    ok(!/THREADS: ' \+ String\(e\.threads/.test(SRC_FULL), 'the export never comma-joins the array again');
}


// ─── v5.102.0: the pointer helper RETURNS what it computes ────────────────────
// The snippet-browser delete handler is written `store.summarizedUpTo =
// recomputeSummarizedUpTo()`. While the helper returned undefined, that assignment
// OVERWROTE the correct value it had just computed — so deleting one snippet from
// the Memory panel set the pointer to undefined, and nothing recovered: every
// eligibility test (`t.index > undefined`) is false, so summarization found zero
// turns forever; the "repair ghosting" branch (`t.index <= undefined`) ghosted
// nothing either; passageStart computed to NaN; every downstream guard is
// `typeof === 'number'` and skipped it; and JSON.stringify DROPS undefined, so the
// key vanished from the saved metadata. One click ended summarization for that chat.
{
    section('summarizedUpTo — the helper returns a number, always');
    const store = { layers: [[{ text: 'a', turnRange: [0, 3] }, { text: 'b', turnRange: [4, 7] }]], summarizedUpTo: 7 };
    L.__setStore(store);
    store.layers[0].splice(1, 1);
    store.summarizedUpTo = L.recomputeSummarizedUpTo();   // verbatim, as the handler does it
    ok(typeof store.summarizedUpTo === 'number',
        'KILL SHOT: assigning FROM the helper leaves a number, not undefined');
    ok(store.summarizedUpTo === 3, 'and the number is the max surviving Layer-0 range end');
    ok(store.summarizedUpTo > -1 ? [{ index: 4 }].filter(t => t.index > store.summarizedUpTo).length === 1 : false,
        'so the eligibility filter still finds turns to summarize');
    // Empty / range-less must answer -1, never -Infinity (which JSON saves as null).
    L.__setStore({ layers: [[]] });
    ok(L.recomputeSummarizedUpTo() === -1, 'an empty Layer 0 answers -1');
    L.__setStore({ layers: [[{ text: 'x' }]] });
    ok(L.recomputeSummarizedUpTo() === -1, 'a Layer 0 of range-less snippets answers -1, not -Infinity');
    ok(JSON.parse(JSON.stringify({ v: L.recomputeSummarizedUpTo() })).v === -1, 'and -1 survives a save round-trip');
    // Structural: getChatStore repairs a chat already broken in the field, where the
    // key is now ABSENT from the saved metadata and no guard can see the damage.
    ok(/typeof chatMetadata\[MODULE_NAME\]\.summarizedUpTo !== 'number'/.test(SRC_FULL),
        'getChatStore repairs a non-numeric summarizedUpTo — chats already damaged recover on load');
}

// ─── v5.102.0: a snippet's POSITION is not its identity ───────────────────────
// The browser renders data-layer/data-idx, but a background promotion splices
// snippetsPerPromotion entries off the FRONT of Layer 0 (branch repair filters whole
// layers), so every rendered index below the splice shifts. A click then resolved to
// a DIFFERENT snippet — and .sc-snippet-delete does layer.splice(idx, 1), destroying
// the wrong scene's summary while the row on screen survived.
{
    section('snippet browser — a row resolves by content, not by position');
    const mk = (t) => ({ text: t, turnRange: [0, 1] });
    const store = { layers: [[mk('scene one'), mk('scene two'), mk('scene three')]] };
    L.__setStore(store);
    const sigTwo = L._snipSig(store.layers[0][1]);

    // Nothing moved: the rendered position is honoured.
    let r = L._resolveSnipRow(0, 1, sigTwo);
    ok(r && r.idx === 1 && r.sn.text === 'scene two', 'an unshifted row resolves at its rendered position');

    // A promotion spliced the front entry away AFTER the render.
    store.layers[0].shift();
    r = L._resolveSnipRow(0, 1, sigTwo);
    ok(r && r.sn.text === 'scene two',
        'KILL SHOT: after a promotion shifted the layer, the row still resolves to the snippet it DEPICTS');
    ok(r.idx === 0, 'and it reports the TRUE index, so a splice removes the right one');

    // Gone entirely -> refuse, never guess.
    L.__setStore({ layers: [[mk('scene one'), mk('scene three')]] });
    ok(L._resolveSnipRow(0, 1, sigTwo) === null, 'a row whose snippet no longer exists resolves to null');
    // Ambiguity only ARISES when the rendered position does not match: a hit AT the
    // rendered position is the row the user clicked, duplicate elsewhere or not, and
    // acting on it is correct rather than a guess. The refusal is for the search path.
    L.__setStore({ layers: [[mk('scene two'), mk('scene two')]] });
    ok((L._resolveSnipRow(0, 0, sigTwo) || {}).idx === 0,
        'a duplicate elsewhere does not disturb a row that matches where it was rendered');
    L.__setStore({ layers: [[mk('scene two'), mk('other'), mk('scene two')]] });
    ok(L._resolveSnipRow(0, 1, sigTwo) === null,
        'but when the position misses and the search finds TWO candidates, it refuses rather than guessing');
    // No signature (a row rendered before this existed) -> positional, as before.
    L.__setStore({ layers: [[mk('a'), mk('b')]] });
    r = L._resolveSnipRow(0, 1, undefined);
    ok(r && r.sn.text === 'b', 'a signature-less legacy row falls back to the position it always used');
    ok(L._resolveSnipRow(9, 0, undefined) === null && L._resolveSnipRow(0, 99, undefined) === null,
        'a missing layer or out-of-range index resolves to null rather than throwing');
    // Signature must actually distinguish content.
    ok(L._snipSig(mk('scene one')) !== L._snipSig(mk('scene two')), 'the signature distinguishes different text');
    ok(L._snipSig(mk('same')) === L._snipSig(mk('same')), 'and is stable for identical text');

    // Structural: every handler that indexes into a layer must go through the resolver.
    {
        const i = SRC_FULL.indexOf('function updateSnippetBrowser() {');
        const j = SRC_FULL.indexOf('\nfunction escapeHtml', i);
        const body = SRC_FULL.slice(i, j);
        const sels = ['.sc-snippet-text', '.sc-thin-restore', '.sc-snippet-redo', '.sc-snippet-delete',
                      '.sc-detail-text', '.sc-detail-redo', '.sc-detail-delete', '.sc-detail-ledger'];
        for (const sel of sels) {
            const k = body.indexOf(`$('${sel}')`);
            ok(k > 0 && /_resolveSnipRow\(/.test(body.slice(k, k + 700)), `${sel} resolves through _resolveSnipRow`);
        }
        ok((body.match(/data-sig="\$\{_snipSig\(sn\)\}"/g) || []).length >= 5,
            'every rendered row carries the signature the resolver needs');
    }
}


// ─── v5.103.0: no turn is ever both hidden and unsummarized ───────────────────
// summarizedUpTo is a scalar high-water mark; deleting a snippet from the MIDDLE of
// Layer 0 leaves a hole BELOW it that the scalar cannot express. The delete handler
// correctly returned those turns to verbatim — and the next summarization pass hid
// them again, because ghostMessagesUpTo ghosted everything up to a bound derived
// from that same mark. Not verbatim, not summarized: gone from the model's view,
// silently, with no trigger that would ever rescue them.
{
    section('ghosting requires coverage — a deleted snippet cannot open a memory hole');
    const store = { layers: [[
        { text: 's0', turnRange: [0, 3] },
        { text: 's1', turnRange: [4, 7] },
        { text: 's2', turnRange: [8, 11] },
    ]], summarizedUpTo: 11 };
    L.__setStore(store);
    ok(L._turnHasCoverage(store, 5) === true, 'a narrated turn has coverage');
    ok(L._turnHasCoverage(store, 40) === false, 'an unnarrated turn does not');
    // Delete the MIDDLE snippet — the position that leaves the mark above the hole.
    store.layers[0].splice(1, 1);
    store.summarizedUpTo = L.recomputeSummarizedUpTo();
    ok(store.summarizedUpTo === 11, 'the mark stays at 11: only a head deletion lowers it');
    for (const i of [4, 5, 6, 7]) {
        ok(L._turnHasCoverage(store, i) === false, `turn ${i} is now narrated by nothing`);
    }
    ok(L._turnHasCoverage(store, 2) === true && L._turnHasCoverage(store, 9) === true,
        'the surviving snippets still cover their own turns');
    // KILL SHOT: those turns are BELOW the mark, so the old rule would hide them.
    const wouldGhostOld = [4, 5, 6, 7].filter(i => i <= store.summarizedUpTo);
    const wouldGhostNow = [4, 5, 6, 7].filter(i => i <= store.summarizedUpTo && L._turnHasCoverage(store, i));
    ok(wouldGhostOld.length === 4 && wouldGhostNow.length === 0,
        'KILL SHOT: below the mark yet uncovered — the old rule hid all four, the coverage rule hides none');
    // The delete handler must rescue exactly those, at ANY layer depth.
    ok(JSON.stringify(L._uncoveredTurnsIn(store, 4, 7, 12)) === JSON.stringify([4, 5, 6, 7]),
        'the orphan rescue finds exactly the turns the deletion stranded');
    ok(L._uncoveredTurnsIn(store, 0, 3, 12).length === 0, 'and nothing that is still narrated');
    ok(L._uncoveredTurnsIn(store, 8, 20, 12).length === 0, 'and never past the end of the chat');
    // A deep-layer snippet is the ONLY thing narrating turns whose L0 sources were
    // promoted away, so the rescue must not be Layer-0-only.
    const deepOnly = { layers: [[], [{ text: 'meta', turnRange: [0, 9] }]] };
    L.__setStore(deepOnly);
    ok(L._turnHasCoverage(deepOnly, 5) === true, 'a promoted meta-summary provides coverage on its own');
    ok(/if \(!_turnHasCoverage\(store, i\)\) continue;/.test(SRC_FULL), 'ghostMessagesUpTo enforces it');
    ok(/_uncoveredTurnsIn\(store, removedSn\.turnRange\[0\]/.test(SRC_FULL), 'the delete handler rescues by coverage, not by depth');
    ok(!/layerIdx === 0 && removedSn && removedSn\.turnRange/.test(SRC_FULL), 'the Layer-0-only condition is gone');
    // Anchored on the GUARD, not on the identifier: asserting that `_okToDelete`
    // merely appears somewhere left the assertion green when the branch that acts on
    // it was neutered, which the negative test correctly called decorative.
    ok(/if \(!_okToDelete\) return;/.test(SRC_FULL), 'and the delete is confirmed first, with its consequence stated');
}

// ─── v5.103.0: the auditor's findings actually REACH the storyteller ──────────
// The nudge delivered the OLDEST `cap` open flags from an append-ordered array.
// Source-level flags can never be auto-fixed (applyContinuityFix refuses anything
// but where==='snippet', deliberately), so they never leave `open` — and after `cap`
// of them the block was frozen: every later finding was discovered, flagged, and
// never delivered again. The survivors were then re-injected on every generation
// forever, re-opening facts the story had long settled.
{
    section('continuity nudge — newest first, and it retires');
    const mk = (id, where, createdAt, nudged) => ({ id, status: 'open', fix: 'fix ' + id, where, createdAt, nudged });
    const flags = [];
    for (let i = 1; i <= 6; i++) flags.push(mk(i, 'source', i, 0));      // unfixable, arrived first
    for (let i = 7; i <= 12; i++) flags.push(mk(i, 'snippet', i, 0));    // newer, fixable
    let sel = L._selectNudgeFlags(flags, 6, 12).map(f => f.id);
    ok(sel.length === 6, 'the cap is respected');
    ok(sel.includes(12) && sel.includes(11),
        'KILL SHOT: the newest findings are delivered — six unfixable originals can no longer starve them');
    ok(!sel.includes(1), 'and the oldest no longer holds a slot by seniority alone');
    // Retirement frees the slot rather than holding it forever.
    const old = mk(99, 'source', 99, 12);
    ok(L._selectNudgeFlags([old], 6, 12).length === 0, 'a flag delivered up to the limit is retired from injection');
    ok(L._selectNudgeFlags([old], 6, 0).length === 1, 'a limit of 0 means never retire');
    ok(L._selectNudgeFlags([mk(1, 'source', 1, 11)], 6, 12).length === 1, 'one delivery short of the limit still goes out');
    // Only actionable, open flags.
    ok(L._selectNudgeFlags([{ status: 'resolved', fix: 'x', createdAt: 1 }], 6, 12).length === 0, 'a resolved flag is never delivered');
    ok(L._selectNudgeFlags([{ status: 'open', fix: '   ', createdAt: 1 }], 6, 12).length === 0, 'a flag with no usable fix is never delivered');
    ok(L._selectNudgeFlags(null, 6, 12).length === 0 && L._selectNudgeFlags([null], 6, 12).length === 0, 'junk input yields an empty selection');
    // The counter must be per-GENERATION, not per injection rebuild.
    ok(/function onGenerationStarted[\s\S]{0,2000}?_selectNudgeFlags/.test(SRC_FULL),
        'deliveries are counted in onGenerationStarted (fires once per turn), not in updateInjection');
    ok(/const open = _selectNudgeFlags\(store\.continuityFlags, cap, s\.continuityNudgeDeliveries\)/.test(SRC_FULL),
        'and the assembler selects through the same function, so the count matches what was sent');
}

// ─── v5.103.0: an auto-applied rewrite is sanity-checked ──────────────────────
// A correction targets one claim; it is not a re-summarization. Nothing checked the
// fixer's output, and with autoFix ON there is no human in the loop — a gist, a
// refusal, or a truncated fragment silently replaced a full scene summary, no undo.
{
    section('continuity fixer — a botched rewrite is refused, not written');
    const s = { continuityFixMinRatio: 0.5 };
    ok(L._fixVerdict(1000, 980, s).ok === true, 'a real correction keeps nearly all of the snippet');
    ok(L._fixVerdict(1000, 40, s).ok === false, 'KILL SHOT: a one-line gist replacing a full snippet is refused');
    ok(L._fixVerdict(1000, 0, s).ok === false, 'empty output is refused');
    ok(L._fixVerdict(1000, 499, s).ok === false && L._fixVerdict(1000, 500, s).ok === true, 'the ratio boundary is exact');
    ok(L._fixVerdict(150, 20, s).ok === true, 'a short snippet is not judged by ratio — there is no volume to measure');
    ok(L._fixVerdict(150, 0, s).ok === false, 'but empty is refused at any size');
    ok(L._fixVerdict(1000, 400, {}).ok === false, 'the default ratio (0.5) applies when unset');
    // Same correction: the verdict must actually be COMPUTED from the two lengths.
    // Testing for `if (!_v.ok)` alone passed when _v was replaced by a literal.
    ok(/const _v = _fixVerdict\(before\.length, corrected\.length, getSettings\(\)\);/.test(SRC_FULL)
        && /if \(!_v\.ok\) \{/.test(SRC_FULL) && /flag stays open/.test(SRC_FULL),
        'a refused rewrite leaves the snippet untouched and the flag open');
}

// ─── v5.103.0: the autonomous path is ON by default ──────────────────────────
{
    section('autonomy defaults — the guard is armed out of the box');
    const dflt = SRC_FULL.slice(SRC_FULL.indexOf('const defaultSettings'), SRC_FULL.indexOf('// ─── Prompt Presets'));
    ok(/continuityEnabled: true/.test(dflt), 'the continuity auditor runs');
    ok(/continuityNudge: true/.test(dflt), 'its findings are delivered to the storyteller');
    ok(/continuityAutoFix: true/.test(dflt), 'and snippet-level fixes are applied automatically');
    ok(/continuityNudgeDeliveries: 12/.test(dflt), 'deliveries are bounded so new findings always get a slot');
    ok(/continuityFixMinRatio: 0\.5/.test(dflt), 'and an auto-rewrite must keep at least half the snippet');
    ok(/ledgerAuditEnabled: true/.test(dflt) && /ledgerAuditEveryTurns: 12/.test(dflt), 'the ledger auditor was already armed');
}


// ─── v5.104.0: a fossil checkpoint cursor cannot block checkpointing ──────────
// _ckptLast and ledgerLiveIdx are a coupled pair, and only some writers know it:
// FIVE sites move the pointer DOWN (both rewind clears, the fold path, the
// pre-first-reply install, the transplant import) and leave the cursor where it was.
// A cursor above the pointer describes a turn the chat no longer has, and with
// CKPT_EVERY at 1 the old `idx < last + CKPT_EVERY` was not a delay but a permanent
// STOP — checkpoints are the fallback for every rewind the journal cannot cover, so
// losing them silently degrades recovery. Patching five writers leaves a sixth to be
// missed; the cursor has exactly ONE reader, so the rule lives there.
// Found by chaos_test.js, not by reading: seed 3006130615, run 0, nine random ops.
{
    section('checkpoint cadence — the cursor is a throttle, never a wall');
    ok(L._ckptDue(-999, 0, 1) === true, 'a fresh chat checkpoints its first ledgered turn');
    ok(L._ckptDue(5, 5, 1) === false, 'the same turn is not checkpointed twice');
    ok(L._ckptDue(5, 6, 1) === true, 'the next turn is due at cadence 1');
    ok(L._ckptDue(5, 9, 5) === false && L._ckptDue(5, 10, 5) === true, 'a wider cadence is honoured exactly');
    // THE BUG: a rewind moved the pointer to 24 and left the cursor at 25.
    ok(L._ckptDue(25, 24, 1) === true,
        'KILL SHOT: a cursor ABOVE the pointer is a fossil from a rewind — it re-arms instead of blocking forever');
    ok(L._ckptDue(500, 3, 1) === true, 'and a wildly stale cursor after a deep trim re-arms too');
    // Junk must not be read as a throttle either.
    ok(L._ckptDue(undefined, 0, 1) === true && L._ckptDue(null, 0, 1) === true && L._ckptDue(NaN, 0, 1) === true,
        'a missing or NaN cursor never blocks');
    ok(L._ckptDue(0, -1, 1) === false && L._ckptDue(0, NaN, 1) === false, 'an invalid pointer never triggers a checkpoint');
    // The DISCRIMINATING case: with a step of 0, `idx >= last + step` is true for the
    // SAME turn, so every call would re-checkpoint the turn already checkpointed —
    // an unbounded write loop into localStorage. `-999, 4, 0` passes either way and
    // proved nothing, which the negative test correctly called decorative.
    ok(L._ckptDue(5, 5, 0) === false, 'a zero cadence falls back to 1 — the same turn is never re-checkpointed');
    ok(L._ckptDue(5, 5, NaN) === false && L._ckptDue(5, 5, -3) === false, 'NaN and negative cadences fall back too');
    ok(L._ckptDue(5, 6, 0) === true, 'and the next turn is still due');
    // Structural: the reader must go through it.
    ok(/if \(!_ckptDue\(st\._ckptLast, idx, CKPT_EVERY\)\) return;/.test(SRC_FULL),
        'maybeCheckpointLedger asks _ckptDue rather than comparing raw');
}


// ─── v5.105.0: a checkpoint's label is checked against the turn it claims ─────
// A checkpoint's label is an INDEX, and indices are not stable: deleting message D
// shifts everything above it down, so a snapshot labelled turn 40 describes turn 39
// afterwards. Nothing re-keyed those labels — they live in localStorage and
// _chatSig hashes only the first message and first assistant message, so a mid-chat
// deletion changes neither key nor label. A restore then set ledgerLiveIdx one turn
// HIGH and the replay skipped that turn's content entirely. This shipped as a
// documented "known limitation" in v5.100.0–v5.104.0; it is a defect, and it is closed.
{
    section('checkpoint labels — validated against the turn, not trusted');
    const mk = (name, mes, isUser) => ({ name, mes, is_user: !!isUser });
    const chat = [];
    for (let i = 0; i < 12; i++) chat.push(mk(i % 2 ? 'Narrator' : 'Player', 'message number ' + i, i % 2 === 0));

    ok(L._turnSig(chat, 5) === L._turnSig(chat, 5), 'a turn fingerprint is stable');
    ok(L._turnSig(chat, 5) !== L._turnSig(chat, 6), 'and distinguishes different turns');
    ok(L._turnSig(chat, 99) === null && L._turnSig(chat, -1) === null && L._turnSig(null, 0) === null,
        'an out-of-range or absent turn has no fingerprint');
    // Speaker matters, not just text: an identical line from the other side is a different turn.
    const twin = [mk('Player', 'same words', true), mk('Narrator', 'same words', false)];
    ok(L._turnSig(twin, 0) !== L._turnSig(twin, 1), 'the same words from a different speaker fingerprint differently');

    // Nothing moved.
    const sig8 = L._turnSig(chat, 8);
    ok(L._relocateCheckpoint(chat, 8, sig8) === 8, 'an undisturbed label is returned unchanged');

    // THE BUG: one message deleted below the checkpoint.
    const after = chat.slice(); after.splice(3, 1);
    ok(L._relocateCheckpoint(after, 8, sig8) === 7,
        'KILL SHOT: after a deletion below it, the label resolves to the turn it actually describes');
    // Several deletions accumulate.
    const after3 = chat.slice(); after3.splice(1, 3);
    ok(L._relocateCheckpoint(after3, 8, sig8) === 5, 'and it tracks several deletions, not just one');

    // Its turn is gone entirely -> refuse, so a WRONG label can never be restored.
    const gone = chat.slice(); gone.splice(8, 1);
    ok(L._relocateCheckpoint(gone, 8, sig8) === -1, 'a snapshot whose own turn was deleted is refused, not guessed');
    ok(L._relocateCheckpoint(chat.slice(0, 4), 8, sig8) === -1, 'and so is one past the end of a trimmed chat');

    // Ambiguity -> refuse. Two identical turns cannot decide which is meant.
    const dup = [mk('Narrator', 'identical'), mk('Player', 'x', true), mk('Narrator', 'identical')];
    ok(L._relocateCheckpoint(dup, 2, L._turnSig(dup, 2)) === 2, 'an exact hit at the label wins even with a duplicate below');
    const dupShift = [mk('Narrator', 'identical'), mk('Narrator', 'identical'), mk('Player', 'z', true)];
    ok(L._relocateCheckpoint(dupShift, 2, L._turnSig(dupShift, 0)) === -1,
        'two candidates below a missed label is ambiguous — refused rather than guessed');

    // Legacy snapshots carry no fingerprint and must behave exactly as before.
    ok(L._relocateCheckpoint(chat, 8, null) === 8 && L._relocateCheckpoint(chat, 8, undefined) === 8,
        'a pre-v5.105.0 snapshot keeps its label — no regression for existing checkpoints');
    ok(L._relocateCheckpoint(chat, -1, sig8) === -1, 'a nonsense label is refused');

    // Bounded: the scan never walks the whole chat.
    ok(typeof L._CKPT_DRIFT_WINDOW === 'number' && L._CKPT_DRIFT_WINDOW > 0, 'the drift search is bounded');
    const far = chat.slice(); far.splice(0, 1);
    ok(L._relocateCheckpoint(far, 8 + L._CKPT_DRIFT_WINDOW + 5, sig8) === -1, 'a label beyond the window is refused rather than scanned forever');

    // Wiring: saved with a fingerprint, corrected at the ONE door every consumer uses.
    ok(/tsig: _tsig/.test(SRC_FULL), 'saveLedgerCheckpoint stamps the turn fingerprint');
    ok(/const _true = _relocateCheckpoint\(_chatNow, v\.atTurn, v\.tsig\);/.test(SRC_FULL),
        'listLedgerCheckpoints corrects the label for every consumer');
    ok(/if \(_true < 0\) continue;/.test(SRC_FULL), 'and drops a snapshot whose turn no longer exists');
}


// ─── v5.108.0: ONE exclusive channel, enforced at the lock ───────────────────
// Six entry points had drifted into a hand-rolled subset of the channel check.
// The rule now lives at the single place the flag is set, and this section keeps
// it there — structurally, so a new pass cannot reopen the hole by omission.
section('exclusive LLM channel — the lock enforces it, not the callers');
{
    // The load banner is one line of PROSE that names these identifiers on
    // purpose. Scan code, not the changelog printed at startup.
    const SRC_CODE = SRC_FULL.split('\n').filter(l => l.indexOf('Summaryception v') === -1).join('\n');
    // 1. THE ROOT: the only setter of isSummarizing checks the WHOLE channel.
    const _acq = SRC_FULL.slice(SRC_FULL.indexOf('function _acquireSummarize()'));
    const _acqBody = _acq.slice(0, _acq.indexOf('\n}') + 2);
    ok(/if \(_llmChannelBusy\(\)\) return false;/.test(_acqBody),
        'the lock refuses when ANY pass holds the channel, not just when isSummarizing');
    ok(!/if \(isSummarizing\) return false;/.test(_acqBody),
        'the lock no longer checks only its own flag');
    ok(_acqBody.indexOf('_llmChannelBusy()') < _acqBody.indexOf('isSummarizing = true'),
        'and it checks BEFORE it sets — same discipline every other flag setter follows');

    // 2. THE CONTRACT: the answer is load-bearing at every call site. A bare
    //    `_acquireSummarize();` throws the mutex away and is what let five
    //    entry points run concurrently for real.
    const _bare = (SRC_CODE.match(/(?<!function )(?<!!)_acquireSummarize\(\);/g) || []);
    if (_bare.length) console.log('    bare _acquireSummarize() calls found: ' + _bare.length);
    ok(_bare.length === 0, 'no call site discards the lock result');
    const _guarded = (SRC_CODE.match(/if \(!_acquireSummarize\(\)\)/g) || []).length;
    ok(_guarded >= 12, 'every acquire is in a refusal-honouring guard');
    ok(_guarded === (SRC_CODE.match(/(?<!function )_acquireSummarize\(\)/g) || []).length,
        'guarded call count equals total call count — nothing acquires unguarded');

    // 3. NO HAND-ROLLED SUBSETS. isSummarizing is one of seven flags; reading it
    //    as a busy-check is the bug. Outside the helpers and the predicate it must
    //    not be read at all.
    const _isRefs = (SRC_CODE.split('\n')
        .filter(l => /\bisSummarizing\b/.test(l))
        .filter(l => !/^\s*\/\//.test(l))
        .filter(l => !/let isSummarizing = false;/.test(l))
        .filter(l => !/isSummarizing = (true|false);/.test(l))
        .filter(l => !/return isSummarizing \|\| _ledgerActive/.test(l))
        .filter(l => !/\/\/.*isSummarizing/.test(l)));
    if (_isRefs.length) console.log('    offending isSummarizing reads: ' + _isRefs.map(l => l.trim().slice(0, 70)).join(' | '));
    ok(_isRefs.length === 0, 'isSummarizing is read ONLY by _llmChannelBusy() — no hand-rolled subset survives');

    // 4. THE PREDICATE IS COMPLETE: every module-level channel flag is in it.
    const _flags = (SRC_FULL.match(/^let (_\w*(?:Active|Busy))\b/gm) || [])
        .map(l => l.replace(/^let /, ''));
    const _pred = SRC_FULL.slice(SRC_FULL.indexOf('function _llmChannelBusy()'));
    const _predBody = _pred.slice(0, _pred.indexOf('\n}'));
    for (const f of _flags) ok(_predBody.includes(f), 'channel predicate covers ' + f);

    // 5. THE CO-WRITER IS A MEMBER. It sends the entire memory dump — the largest
    //    call here — and used to hold no flag at all, so every other pass saw an
    //    idle channel for its whole duration.
    const _ed = SRC_FULL.slice(SRC_FULL.indexOf('async function runContinuityEditorReview()'));
    const _edBody = _ed.slice(0, _ed.indexOf('\nfunction renderEditorReview'));
    ok(/if \(!_acquireSummarize\(\)\)/.test(_edBody), 'Co-Writer takes the channel before its pass');
    ok(/_releaseSummarize\(\);/.test(_edBody), 'Co-Writer releases it in finally');
    ok(_edBody.indexOf('_acquireSummarize()') < _edBody.indexOf('await callSummarizer'),
        'and it takes it BEFORE the call, not after');

    // 6. DESTRUCTION IS GATED BEFORE IT DESTROYS. Rebuild-all un-ghosts and clears
    //    every snippet before it ever reaches the lock; refusing at the lock would
    //    wipe the memory and rebuild nothing.
    const _rb = SRC_FULL.slice(SRC_FULL.indexOf("'#sc_rebuild_snippets'"));
    const _rbBody = _rb.slice(0, _rb.indexOf('\n    });'));
    ok(_rbBody.indexOf('_llmChannelBusy()') >= 0 &&
       _rbBody.indexOf('_llmChannelBusy()') < _rbBody.indexOf('store.layers.length = 0;'),
        'rebuild-all checks the channel BEFORE it clears the snippets');

    // 7. STOP TELLS THE TRUTH. A background pass holds its own flag and
    //    currentAbortController is nulled between batches, so the old subset check
    //    reported "Nothing is running." over a running queue.
    ok(SRC_FULL.includes('if (!_llmChannelBusy() && !currentAbortController) {'),
        'the Stop button asks the channel, not one flag');
}


// ─── v5.109.0: a default has exactly ONE home ────────────────────────────────
// An inline `?? 600` is a COPY of a default, and copies drift: ledgerMaxCharsPerChar
// was raised to 1000 while three call sites kept falling back to the old 600, and
// verbatimTurns read `?? 10` in one place and `?? 9` in another against a real
// default of 9. These are live, not decorative: getSettings() fills only MISSING
// keys (Object.hasOwn), so a key present but set to undefined — exactly what the
// v5.102.0 void-assignment bug produced — reaches the fallback and gets the stale
// number silently.
section('settings defaults — single-sourced, no inline copies');
{
    const _dI = SRC_FULL.indexOf('const defaultSettings');
    let _dB = SRC_FULL.indexOf('{', _dI), _dD = 0, _dJ = _dB;
    for (;; _dJ++) {
        if (SRC_FULL[_dJ] === '{') _dD++;
        else if (SRC_FULL[_dJ] === '}') _dD--;
        if (_dD === 0) break;
    }
    const _declared = {};
    for (const m of SRC_FULL.slice(_dB, _dJ + 1).matchAll(/^ {4}([A-Za-z_$][\w$]*)\s*:\s*(-?\d+(?:\.\d+)?)\s*,/gm)) {
        _declared[m[1]] = m[2];
    }
    ok(Object.keys(_declared).length > 20, 'the numeric defaults were actually parsed (' + Object.keys(_declared).length + ')');

    const _after = SRC_FULL.slice(_dJ + 1);
    const _copies = [];
    for (const m of _after.matchAll(/\bs\.([A-Za-z_$][\w$]*)\s*\?\?\s*(-?\d+(?:\.\d+)?)/g)) {
        if (Object.prototype.hasOwnProperty.call(_declared, m[1])) _copies.push(m[1] + ' ?? ' + m[2]);
    }
    if (_copies.length) console.log('    inline copies of a default found: ' + _copies.join(', '));
    ok(_copies.length === 0, 'no call site copies a numeric default inline — every fallback names defaultSettings');

    // And the single source is actually reachable where it is used.
    ok(/^const defaultSettings = Object\.freeze\(\{/m.test(SRC_FULL), 'defaultSettings is one frozen module-level object');
    ok((SRC_FULL.match(/\?\? defaultSettings\./g) || []).length >= 55,
        'the fallbacks read through that object (' + (SRC_FULL.match(/\?\? defaultSettings\./g) || []).length + ' sites)');

    // v5.110.0: the same defect wearing a different shape. `const cap = capChars
    // || 600;` is a PARAMETER fallback, so the `s.KEY ?? N` scan above cannot see
    // it — and 600 is the OLD ledgerMaxCharsPerChar, stale since it was raised to
    // 1000. Every caller passes a cap today, so it was unreachable; the next one
    // who omits it would have got a budget 40% under the user's setting.
    // Matching against the CURRENT default values would be decorative: 600 is a
    // STALE value that no default holds any more, which is exactly the case worth
    // catching. So the rule is stricter and needs no lookup — a parameter fallback
    // may not be a magic number at all. Name defaultSettings.<key> or a named const.
    const _paramCopies = [];
    for (const m of _after.matchAll(/\b(?:const|let|var)\s+\w+\s*=\s*\w+\s*\|\|\s*(-?\d{2,}(?:\.\d+)?)\s*;/g)) {
        _paramCopies.push(m[0].trim());
    }
    if (_paramCopies.length) console.log('    magic numeric parameter fallbacks: ' + _paramCopies.join(' | '));
    ok(_paramCopies.length === 0, 'no parameter fallback is a magic number — it names its source');

    // The two that had already drifted, pinned by value so a future edit that
    // re-hardcodes them fails here rather than in someone's chat.
    eq(_declared.verbatimTurns, '9', 'verbatimTurns default is 9 (one site read 10)');
    eq(_declared.ledgerMaxCharsPerChar, '1000', 'ledgerMaxCharsPerChar default is 1000 (three sites read 600)');
}


// ─── v5.111.0: promotion cannot run away ─────────────────────────────────────
// Promotion is the one irreversible thing here — it destroys the sources and
// keeps a merge. It read snippetsPerLayer / snippetsPerPromotion / maxLayers RAW
// and trusted all three to be sane positive integers. With snippetsPerLayer
// negative it recursed forever on an emptied layer, sending an EMPTY passage to
// the model each time and writing whatever came back into memory as canon.
section('promotion — bounded, and never merges nothing');
{
    const _i = SRC_FULL.indexOf('async function maybePromoteLayer(layerIndex) {');
    const _j = SRC_FULL.indexOf('// ─── Character Ledger: injection block', _i);
    const _body = SRC_FULL.slice(_i, _j);
    ok(_i > 0 && _j > _i, 'maybePromoteLayer located');

    ok(/const _b = _promoteBounds\(s\);/.test(_body), 'the three settings are clamped once, at the top');
    const _raw = ['s.snippetsPerLayer', 's.snippetsPerPromotion', 's.maxLayers'].filter(k => _body.includes(k));
    if (_raw.length) console.log('    raw setting reads still inside the function: ' + _raw.join(', '));
    ok(_raw.length === 0, 'and nothing inside reads them raw again — every comparison is against a real integer');

    ok(/if \(!Array\.isArray\(layer\) \|\| layer\.length === 0\) return;/.test(_body),
        'an empty layer is never promoted — the re-entry that fed the runaway is closed');
    ok(/if \(toMerge\.length < 2\) return;/.test(_body),
        'a merge of fewer than two snippets is refused — an empty passage to the model is a hallucination generator');
    ok(_body.indexOf('if (toMerge.length < 2) return;') < _body.indexOf('await callSummarizer'),
        'and it is refused BEFORE the model call, not after paying for it');

    // The clamp itself: absurd in, sane out.
    const _pb = new Function('defaultSettings', SRC_FULL.slice(SRC_FULL.indexOf('function _promoteBounds')).slice(0, SRC_FULL.slice(SRC_FULL.indexOf('function _promoteBounds')).indexOf('\n}') + 2) + '\nreturn _promoteBounds;')(
        { snippetsPerLayer: 100, snippetsPerPromotion: 2, maxLayers: 9 });
    // The label must NOT carry the result: negative_test.mjs matches failures by
    // NAME, and a label that changes when the bug is reintroduced is unmatchable.
    // (Nor the input: JSON.stringify turns both NaN and null into "null".)
    const _absurd = [0, -1, NaN, Infinity, null, undefined, '', [], {}, -1e9];
    const _badPerLayer = [], _badPerPromo = [], _badDepth = [];
    for (const bad of _absurd) {
        const b = _pb({ snippetsPerLayer: bad, snippetsPerPromotion: bad, maxLayers: bad });
        if (!(Number.isInteger(b.perLayer) && b.perLayer >= 1)) _badPerLayer.push(String(bad) + '->' + b.perLayer);
        if (!(Number.isInteger(b.perPromotion) && b.perPromotion >= 2)) _badPerPromo.push(String(bad) + '->' + b.perPromotion);
        if (!(Number.isInteger(b.maxLayers) && b.maxLayers >= 1)) _badDepth.push(String(bad) + '->' + b.maxLayers);
    }
    if (_badPerLayer.length) console.log('    perLayer escaped the clamp: ' + _badPerLayer.join(', '));
    if (_badPerPromo.length) console.log('    perPromotion escaped the clamp: ' + _badPerPromo.join(', '));
    if (_badDepth.length) console.log('    maxLayers escaped the clamp: ' + _badDepth.join(', '));
    ok(_badPerLayer.length === 0, 'perLayer survives every absurd input as an integer >= 1');
    ok(_badPerPromo.length === 0, 'perPromotion survives every absurd input as an integer >= 2');
    ok(_badDepth.length === 0, 'maxLayers survives every absurd input as an integer >= 1');
    const good = _pb({ snippetsPerLayer: 12, snippetsPerPromotion: 5, maxLayers: 4 });
    eq(good.perLayer, 12, 'a legitimate value passes through untouched');
    eq(good.perPromotion, 5, 'and so does a legitimate promotion size');
    eq(good.maxLayers, 4, 'and a legitimate depth');
}


// ─── v5.113.0: the memory block sits at the top of the chat ──────────────────
// Verified against SillyTavern's own source, not assumed: MAX_INJECTION_DEPTH is
// 10000, both the chat-completion and text-completion paths loop i = 0..maxDepth
// and splice into a NEWEST-FIRST array, and Array.splice CLAMPS an over-large
// index to the end (only negatives wrap). So a depth larger than the chat lands
// in the oldest slot — the top, right after the system instructions.
section('injection depth — top of chat, and never above ST\u2019s ceiling');
{
    const _iI = SRC_FULL.indexOf('function _injectionDepth(s) {');
    const _iBody = SRC_FULL.slice(_iI, SRC_FULL.indexOf('\n}', _iI) + 2);
    ok(_iI > 0, '_injectionDepth exists');
    const _dep = new Function('defaultSettings',
        'const ST_MAX_INJECTION_DEPTH = 10000;\n' + _iBody + '\nreturn _injectionDepth;')({ injectionDepth: 9999 });

    eq(_dep({ injectionDepth: 9999 }), 9999, 'the shipped depth passes through');
    eq(_dep({ injectionDepth: 4 }), 4, 'a deliberate shallow depth is honoured');
    eq(_dep({ injectionDepth: 0 }), 0, 'zero is a legal depth (the very newest slot)');
    // ABOVE ST's ceiling the injection is not "deep", it is GONE: ST only emits
    // prompts at depths its loop actually visits.
    eq(_dep({ injectionDepth: 10000 }), 9999, 'ST\u2019s ceiling itself is clamped below');
    eq(_dep({ injectionDepth: 99999 }), 9999, 'an over-typed depth is clamped, never silently un-injected');
    for (const bad of [-1, NaN, Infinity, null, undefined, '', [], {}]) {
        const v = _dep({ injectionDepth: bad });
        ok(Number.isInteger(v) && v >= 0 && v < 10000, 'absurd depth yields a usable one');
    }

    // The default itself, and that the ONE reader is the clamp.
    ok(/^\s{4}injectionDepth: 9999,/m.test(SRC_FULL), 'the shipped default is 9999 — the top of the chat');
    ok(SRC_FULL.includes('const dep  = _injectionDepth(s);'), 'updateInjection reads the depth through the clamp');
    ok(!/const dep\s+= \(s\.injectionDepth \?\?/.test(SRC_FULL), 'and nowhere reads it raw');
    ok(SRC_FULL.includes('const ST_MAX_INJECTION_DEPTH = 10000;'), 'ST\u2019s ceiling is named, not a magic number');

    // Raising a shipped default reaches NOBODY: getSettings() fills missing keys
    // only, so an existing install keeps its stored 4 forever without this.
    ok(/function migrateInjectionDepth\(\)/.test(SRC_FULL), 'a one-time migration carries existing installs off the old default');
    ok(SRC_FULL.includes('if (s.injectionDepth === 4) s.injectionDepth = defaultSettings.injectionDepth;'), 'it upgrades exactly the old shipped value, nothing else');
    ok(SRC_FULL.includes('if (s.depthMigratedToTop) return;'), 'and runs once, so a later deliberate 4 is never overwritten');
    ok(SRC_FULL.includes('try { migrateInjectionDepth(); } catch (_) {}'), 'wired at init');

    // The control has to be able to express it.
    ok(/<input type="number" id="sc_injection_depth" min="0" max="9999"/.test(H),
        'the settings control reaches 9999 (a 0-9999 range slider is unusable on a phone)');
    ok(!/id="sc_injection_depth"[^>]*type="range"/.test(H), 'it is not a range slider capped at 20 any more');
}

console.log('\n────────────────────────────────────────');
console.log(`RESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) { 
console.log('\nFAILURES:'); fails.forEach(f => console.log('  - ' + f)); process.exit(1); }
console.log('ALL CHARACTER-LEDGER ASSERTIONS PASS ✓');

// dom_test.mjs — REAL-DOM smoke gate (jsdom + real jQuery).
// The stub-based gates prove logic; they cannot prove that UI wiring survives a
// real DOM (event delegation, element construction, inline styles, focus). This
// harness slices the SHIPPED handler blocks verbatim out of index.js and runs
// them under jsdom, so "green" means the exact production code opened, edited,
// mirrored, saved, and closed a real overlay. Run: node dom_test.mjs
// Deps are dev-only (npm install --no-save --no-bin-links jsdom jquery).
// A missing-deps run must NOT report green: the gate FAILS (exit 1) unless
// DOM_TEST_ALLOW_SKIP=1 is set explicitly. (The old "SKIP with exit 0" made a
// never-run gate indistinguishable from a passed one — on filesystems without
// symlink support the install itself silently failed and the gate stayed
// "green" forever. Use --no-bin-links there.)

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// jQuery's entry throws at import time without a window; the CJS export is the
// FACTORY when no global window exists. So: jsdom first, then require('jquery')
// and hand it the jsdom window.
const require = createRequire(import.meta.url);
let JSDOM, jqueryFactory;
try {
    ({ JSDOM } = await import('jsdom'));
    jqueryFactory = require('jquery/factory').jQueryFactory;   // the windowless entry — plain 'jquery' throws without a global window
} catch (e) {
    const missing = /Cannot find (package|module)/.test(String(e && e.message));
    if (missing && process.env.DOM_TEST_ALLOW_SKIP === '1') {
        console.log('dom_test: jsdom/jquery not installed — SKIP (explicitly allowed via DOM_TEST_ALLOW_SKIP=1)');
        process.exit(0);
    }
    console.error('dom_test: ' + (missing
        ? 'FAIL — jsdom/jquery not installed. Enable this gate with: npm install --no-save --no-bin-links jsdom jquery (or set DOM_TEST_ALLOW_SKIP=1 to skip explicitly)'
        : 'DEP LOAD FAILED — ' + (e && e.message)));
    process.exit(1);
}

let pass = 0, fail = 0; const fails = [];
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; fails.push(m); console.log('  ✗ ' + m); } };

const SRC = readFileSync(new URL('./index.js', import.meta.url), 'utf8');

// slice a verbatim block out of index.js between two unique markers
function slice(fromMarker, toMarker) {
    const a = SRC.indexOf(fromMarker);
    const b = SRC.indexOf(toMarker, a);
    if (a === -1 || b === -1) throw new Error('marker not found: ' + (a === -1 ? fromMarker : toMarker));
    return SRC.slice(a, b);
}

const dom = new JSDOM('<!doctype html><html><body>'
    + '<div id="panel"><textarea id="sc_notepad"></textarea>'
    + '<button type="button" id="sc_notepad_fullscreen">⛶</button></div>'
    + '</body></html>', { pretendToBeVisual: true });
const { window } = dom;
const $ = jqueryFactory(window);

// ── stubs for the block's outer dependencies (state-bearing, assertable) ──
const store = { notepad: 'Marcroft canon: the arch faces east.' };
let saved = 0, injected = 0;
const sandboxGlobals = {
    $, window, document: window.document,
    getChatStore: () => store,
    saveChatStore: async () => { saved++; },
    updateInjection: () => { injected++; },
};

// the shipped blocks, verbatim
const notepadInputBlock = slice("$(document).on('input', '#sc_notepad', function () {", "// ── Notepad full-screen editor ──");
const fsBlock = slice("$(document).on('click', '#sc_notepad_fullscreen', function () {", "// ── Detail Auditor (sister) ──");
const syncFn = slice('function _syncNotepadUi(v) {', 'function getChatStore() {');

const runner = new Function(...Object.keys(sandboxGlobals), notepadInputBlock + '\n' + fsBlock + '\n' + syncFn + '\nreturn { _syncNotepadUi };');
const exportsObj = runner(...Object.values(sandboxGlobals));

console.log('== full-screen notepad: the SHIPPED wiring, in a real DOM ==');

// open
$('#sc_notepad').val(store.notepad);
$('#sc_notepad_fullscreen').trigger('click');
ok($('#sc_notepad_fs').length === 1, 'click opens the overlay');
ok($('#sc_notepad_fs_text').val() === store.notepad, 'editor seeds from the store');
ok($('#sc_notepad_fs_count').text() === store.notepad.length + ' ch', 'char count seeds');
const ovEl = $('#sc_notepad_fs')[0];
ok(ovEl.style.position === 'fixed' && ovEl.style.zIndex === '2147483000', 'SELF-CONTAINED: geometry set by direct JS assignment — no stylesheet, no string parsing to disagree about');
ok(/^\d+px$/.test(ovEl.style.width) && /^\d+px$/.test(ovEl.style.height) && parseInt(ovEl.style.height, 10) === window.innerHeight, 'MEASURED PIXELS: height taken from the live viewport, not from percentage units');
ok(ovEl.style.flexDirection === 'column', 'column layout assigned');
ok($('#sc_notepad_fs_text')[0].style.flex === '1 1 auto', 'textarea fills the measured screen');
ok(typeof window._scNotepadFsFit === 'function', 'a live re-fit is registered for viewport/keyboard changes');
{
    // the keyboard scenario: viewport shrinks → the overlay must follow
    const h0 = parseInt(ovEl.style.height, 10);
    Object.defineProperty(window, 'innerHeight', { value: h0 - 300, configurable: true });
    window._scNotepadFsFit();
    ok(parseInt(ovEl.style.height, 10) === h0 - 300, 'KEYBOARD-PROOF: viewport change re-fits the overlay to measured pixels');
    Object.defineProperty(window, 'innerHeight', { value: h0, configurable: true });
    window._scNotepadFsFit();
}

// second click: no duplicate
$('#sc_notepad_fullscreen').trigger('click');
ok($('#sc_notepad_fs').length === 1, 'double-open guarded');

// type in the editor → one pipeline: panel, store, save, injection, count
$('#sc_notepad_fs_text').val('Marcroft canon: the arch faces WEST.').trigger('input');
ok($('#sc_notepad').val() === 'Marcroft canon: the arch faces WEST.', 'keystrokes flow through the panel textarea');
ok(store.notepad === 'Marcroft canon: the arch faces WEST.', 'the store is written by the ONE pipeline');
ok(saved > 0 && injected > 0, 'save + injection refresh fired');
ok($('#sc_notepad_fs_count').text() === '36 ch', 'count follows typing');

// programmatic write while open → both views (callers set the store, THEN sync the views)
store.notepad = 'replaced by import';
exportsObj._syncNotepadUi('replaced by import');
ok($('#sc_notepad').val() === 'replaced by import' && $('#sc_notepad_fs_text').val() === 'replaced by import', 'programmatic sync updates both views');

// close paths
$('#sc_notepad_fs_close').trigger('click');
ok($('#sc_notepad_fs').length === 0, '✕ closes');
$('#sc_notepad_fullscreen').trigger('click');
$('#sc_notepad_fs_min').trigger('click');
ok($('#sc_notepad_fs').length === 0, '⤡ Default closes');
$('#sc_notepad_fullscreen').trigger('click');
$(window.document).trigger($.Event('keydown', { key: 'Escape' }));
ok($('#sc_notepad_fs').length === 0, 'Escape closes');
ok(window._scNotepadFsFit === undefined, 'close unbinds the viewport listeners — no leak, no ghost re-fits');
ok(store.notepad === 'replaced by import', 'closing never discards — the store holds the last text');

// ─────────────────────────────────────────────────────────────────────────────
// v5.117.0: the saved-provider panel — SHIPPED markup (settings.html) against
// SHIPPED wiring (index.js), in a real DOM. The transport side is proven in
// connection_test.mjs; this gate proves the panel that drives it: switching,
// adding, deleting, per-field edits, and that the dropdown the user sees is
// the provider the resolver will actually send to.

console.log('\n== saved OpenAI providers: SHIPPED markup + SHIPPED wiring, real DOM ==');

const { resolveOpenAIProvider, makeOpenAIProvider, THINKING_MODES } = await import('./connectionutil.js');

const HTML_SRC = readFileSync(new URL('./settings.html', import.meta.url), 'utf8');
{
    const a = HTML_SRC.indexOf('<!-- ── OpenAI Compatible Sub-panel ── -->');
    const b = HTML_SRC.indexOf('<!-- Connection Status Indicator -->', a);
    if (a === -1 || b === -1) throw new Error('settings.html: provider panel markers not found');
    window.document.body.insertAdjacentHTML('beforeend', HTML_SRC.slice(a, b));
}

const providerBlock = slice('function _openaiProviderEls() {', 'function populateOllamaModelDropdown');

const settings = {
    openaiProviders: [],
    openaiActiveProviderId: '',
    openaiUrl: '', openaiKey: '', openaiModel: '', openaiMaxTokens: 0,
};
let providerSaves = 0;
const providerSandbox = {
    document: window.document,
    window,
    getSettings: () => settings,
    saveSettings: () => { providerSaves++; },
    resolveOpenAIProvider, makeOpenAIProvider, THINKING_MODES,   // the REAL transport pieces
    toastr: { info: () => {}, success: () => {}, warning: () => {}, error: () => {} },
    confirm: () => true,   // the user means it
};
const providerRunner = new Function(...Object.keys(providerSandbox),
    providerBlock + '\nreturn { initOpenAIProviderUI, renderOpenAIProviderUI };');
const providerUI = providerRunner(...Object.values(providerSandbox));

const el = (id) => window.document.getElementById(id);
const type = (id, v) => { const e = el(id); e.value = v; e.dispatchEvent(new window.Event('input', { bubbles: true })); };
const choose = (id, v) => { const e = el(id); e.value = v; e.dispatchEvent(new window.Event('change', { bubbles: true })); };
const click = (id) => el(id).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

providerUI.initOpenAIProviderUI();

// fresh install: a placeholder, empty fields, and the full thinking-mode list
ok(el('summaryception_openai_provider').options.length === 1 && el('summaryception_openai_provider').options[0].value === '', 'fresh install shows the placeholder, not a ghost provider');
ok(el('summaryception_openai_thinking_mode').options.length === THINKING_MODES.length, 'the thinking dropdown is fed by THINKING_MODES (' + THINKING_MODES.length + ' options)');

// first keystroke creates Provider 1 — no "Add" ceremony
type('summaryception_openai_url', 'https://openrouter.ai/api/v1');
ok(settings.openaiProviders.length === 1, 'typing a URL saves Provider 1');
ok(settings.openaiProviders[0].url === 'https://openrouter.ai/api/v1', 'the URL landed on the provider');
ok(settings.openaiActiveProviderId === settings.openaiProviders[0].id, 'and it is the active one');
type('summaryception_openai_model', 'deepseek/deepseek-chat');
type('summaryception_openai_provider_name', 'OpenRouter');
choose('summaryception_openai_thinking_mode', 'prompt');
ok(settings.openaiProviders[0].thinkingMode === 'prompt', 'choosing a no-thinking strategy writes it to the provider');
ok(el('summaryception_openai_provider').options[0].textContent === 'OpenRouter', 'the dropdown label follows the name while typing');

// add a second provider; the switch must swap every field
click('summaryception_openai_provider_add');
ok(settings.openaiProviders.length === 2 && settings.openaiActiveProviderId === settings.openaiProviders[1].id, 'Add creates provider 2 and makes it active');
ok(el('summaryception_openai_url').value === '', 'the fields show the NEW provider, not the old one\u2019s leftovers');
type('summaryception_openai_url', 'http://localhost:1234/v1');
type('summaryception_openai_model', 'qwen3-8b');
choose('summaryception_openai_thinking_mode', 'template_kwargs');
choose('summaryception_openai_provider', settings.openaiProviders[0].id);
ok(el('summaryception_openai_url').value === 'https://openrouter.ai/api/v1' && el('summaryception_openai_model').value === 'deepseek/deepseek-chat', 'switching back restores provider 1\u2019s fields verbatim');
ok(el('summaryception_openai_thinking_mode').value === 'prompt', 'and its thinking strategy comes back with it');
choose('summaryception_openai_provider', settings.openaiProviders[1].id);
ok(el('summaryception_openai_url').value === 'http://localhost:1234/v1', 'switching forward shows provider 2');

// what the user sees selected IS what the next request uses
ok(resolveOpenAIProvider(settings).id === el('summaryception_openai_provider').value, 'dropdown and resolver agree on the active provider');

// delete the active one: the survivor becomes active, pointer self-heals
click('summaryception_openai_provider_delete');
ok(settings.openaiProviders.length === 1 && settings.openaiProviders[0].url === 'https://openrouter.ai/api/v1', 'delete removes exactly the selected provider');
ok(settings.openaiActiveProviderId === settings.openaiProviders[0].id, 'the active pointer moves to the survivor, never dangles');
ok(el('summaryception_openai_provider').value === settings.openaiProviders[0].id && el('summaryception_openai_url').value === 'https://openrouter.ai/api/v1', 'and the panel re-renders the survivor');

// a dangling id from a hand-edit self-heals on render
settings.openaiActiveProviderId = 'ghost-id';
providerUI.renderOpenAIProviderUI();
ok(settings.openaiActiveProviderId === settings.openaiProviders[0].id, 'a dangling active id is repaired by render, so the panel never lies about what will be called');
ok(providerSaves > 0, 'every one of these paths persisted');

// ─────────────────────────────────────────────────────────────────────────────
// v5.118.0: the continuity panel — a source-level finding must have a REAL
// in-extension action (the disabled "Copilot / message" dead end is gone), the
// Fix message binding must reach applyMessageFix holding the channel, and a
// resolved entry with a backup must offer Undo. SHIPPED renderer + SHIPPED
// bindings, real DOM.

console.log('\n== continuity panel: source findings are actionable, resolved fixes are undoable ==');

window.document.body.insertAdjacentHTML('beforeend', '<div id="sc_continuity_view"></div>');

const cfBlocks = [
    slice('function _resolvedLogHtml(resolved) {', 'function renderContinuity() {'),
    slice('function renderContinuity() {', '// Which characters have their history expanded'),
    slice('function escapeHtml(text) {', '// ─── Continuity Editor'),
    slice("$(document).on('click', '#sc_continuity_view .sc-cf-apply'", "$(document).on('change', '#sc_continuity_enabled'"),
].join('\n');

const cfStore = {
    continuityFlags: [{
        id: 'cf_dom', status: 'open', where: 'source', kind: 'continuity', turnRange: [6, 11],
        issue: 'The passage contradicts the record.', fix: 'Align the message with the record.', createdAt: 1, nudged: 0,
    }],
    continuityResolved: [],
};
const cfSettings = { continuityNudge: true, continuityNudgeDeliveries: 12 };
const cfCalls = { fix: [], undo: [] };
const cfSandbox = {
    $, window, document: window.document,
    getChatStore: () => cfStore,
    getSettings: () => cfSettings,
    applyContinuityFix: async () => false,
    applyMessageFix: async (id) => { cfCalls.fix.push(id); return { ok: true, edited: 1 }; },
    undoMessageFix: async (bid) => { cfCalls.undo.push(bid); return true; },
    dismissContinuityFlag: async () => true,
    _llmChannelBusy: () => false,
    _acquireSummarize: () => true,
    _releaseSummarize: () => {},
    toastr: { info: () => {}, success: () => {}, warning: () => {}, error: () => {} },
};
const cfRunner = new Function(...Object.keys(cfSandbox), cfBlocks + '\nreturn { renderContinuity };');
const renderContinuityNow = cfRunner(...Object.values(cfSandbox)).renderContinuity;
renderContinuityNow();

{
    const btn = window.document.querySelector('#sc_continuity_view .sc-cf-fixmsg');
    ok(btn !== null, 'a source-level finding gets a "Fix message" button');
    ok(btn && !btn.disabled, 'and it is ENABLED — the disabled copilot dead-end is gone');
    ok(window.document.querySelector('#sc_continuity_view .sc-cf-copilot') === null, 'no disabled Copilot button is rendered anymore');
    ok((window.document.querySelector('#sc_continuity_view').textContent || '').includes('delivered 0/12'), 'the delivery counter renders');
}
{
    cfStore.continuityFlags[0].msgFixTried = true;
    renderContinuityNow();
    ok((window.document.querySelector('#sc_continuity_view').textContent || '').includes('auto-fix tried'), 'a refused auto-attempt says so on the card');
    delete cfStore.continuityFlags[0].msgFixTried;
}
{
    // click Fix message — the binding must call applyMessageFix with the flag id
    window.document.querySelector('#sc_continuity_view .sc-cf-fixmsg').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    ok(cfCalls.fix.length === 1 && cfCalls.fix[0] === 'cf_dom', 'the Fix message binding reaches applyMessageFix with the flag id');
}
{
    cfStore.continuityFlags = [];
    cfStore.continuityResolved = [{ fix: 'He reads the reply first.', applied: true, msgFix: true, backupId: 'mf_dom1', resolvedAt: 1 }];
    renderContinuityNow();
    const undoBtn = window.document.querySelector('#sc_continuity_view .sc-cf-undo');
    ok(undoBtn !== null, 'a message-level resolution offers Undo in the resolved list');
    undoBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    ok(cfCalls.undo.length === 1 && cfCalls.undo[0] === 'mf_dom1', 'Undo reaches undoMessageFix with the backup id');
}
{
    cfStore.continuityFlags = [{ id: 'cf_snip', status: 'open', where: 'snippet', kind: 'drift', turnRange: [0, 2], issue: 'x', fix: 'y', createdAt: 1 }];
    renderContinuityNow();
    ok(window.document.querySelector('#sc_continuity_view .sc-cf-apply') !== null, 'snippet-level findings keep their Apply button');
}

// ─────────────────────────────────────────────────────────────────────────────
// v5.120.0: the ledger panel may never CLAIM an injection a gate has turned off.
// The shipped renderLedger, real DOM, both gates exercised.

console.log('\n== ledger panel: "Injected this turn" tells the truth when a gate is off ==');

window.document.body.insertAdjacentHTML('beforeend', '<div id="sc_ledger_view"></div>');

const lgBlocks = [
    slice('function _ledgerInjectionOn(s) {', 'function buildCharacterBlock() {'),
    slice('function escapeHtml(text) {', '// ─── Continuity Editor'),
    slice('function renderLedger() {', "// A snippet's POSITION is not its identity"),
].join('\n');

const lgStore = {
    ledger: { 'Jovan Wells': { core: 'guarded', state: 'seated at The Perch', threads: ['the wager'], arc: 'thawing', updatedAt: 1 } },
    summarizedUpTo: 33, ledgerLiveIdx: 33,
};
const lgSandbox = {
    $, window, document: window.document,
    getChatStore: () => lgStore,
    SillyTavern: { getContext: () => ({ chat: [] }) },
    getSettings: () => lgSandbox.__settings,
    __settings: {},
    defaultSettings: { ledgerActiveWindow: 12 },
    renderContinuity: () => {},
    computeLedgerCast: () => ({ shown: [{ name: 'Jovan Wells' }], compact: [], recalled: [], roster: [] }),
    getLedgerPins: () => [],
    _rosterTick: 0,
    _chatHeadTurn: () => 33,
    getAssistantTurns: () => [{ index: 33 }],
    _computeLiveLedgerRange: () => null,
    _stateAsOf: () => ({ label: 'Now' }),
    _historyHtml: () => '',
    _histOpen: new Set(),
    _ledgerActive: false, _ledgerAuditActive: false, _ledgerQueue: [], _liveRetryTimer: null,
    _ledgerOrder: [],
    log: () => {},
};
const lgRunner = new Function(...Object.keys(lgSandbox), lgBlocks + '\nreturn { renderLedger };');
const renderLedgerNow = lgRunner(...Object.values(lgSandbox)).renderLedger;
const lgText = () => (window.document.getElementById('sc_ledger_view').textContent || '');

lgSandbox.__settings = {};
renderLedgerNow();
ok(lgText().includes('💉 Injected this turn:'), 'gate open: the panel claims injection');
ok((window.document.querySelector('#sc_ledger_view .sc-ledger-badge') || {}).textContent?.includes('💉'), 'gate open: the 💉 badge renders');

lgSandbox.__settings = { ledgerEnabled: false };
renderLedgerNow();
ok(lgText().includes('⛔ Not injected — the ledger is OFF'), 'KILL SHOT: disabled ledger — the panel SAYS it is not injected');
ok(!lgText().includes('💉 Injected this turn:'), 'and the count line is gone');
ok(!Array.from(window.document.querySelectorAll('#sc_ledger_view .sc-ledger-badge')).some(b => (b.textContent || '').includes('💉')), 'and no 💉 badge survives on any card');

lgSandbox.__settings = { ledgerEnabled: true, injectLedger: false };
renderLedgerNow();
ok(lgText().includes('Injection Contents'), 'injection-only off: the panel names the right toggle');
ok(!lgText().includes('💉 Injected this turn:'), 'and again no false count');

console.log('\n────────────────────────────────────────');
console.log(`RESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.log('\nFAILURES:'); fails.forEach(f => console.log('  - ' + f)); process.exit(1); }
console.log('REAL-DOM WIRING OK ✓');

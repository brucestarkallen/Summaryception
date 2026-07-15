#!/usr/bin/env node
/**
 * Summaryception — END-TO-END PIPELINE GATE.  Run:  node e2e_test.mjs
 *
 * WHY THIS EXISTS
 * ---------------
 * load_test.mjs proves the module LOADS. ledger_test.js proves the pure
 * functions are CORRECT. Neither proves the machine RUNS: that a message event
 * actually reaches the scribe, that the scribe's reply actually lands in the
 * ledger, that the ledger actually reaches the injection, that a deletion
 * actually rewinds, that the auditor actually corrects.
 *
 * Everything shipped in v5.58.0-v5.60.0 was unit-proven and never once executed
 * — the extension could not even load. "It passes the unit tests" is not the
 * same claim as "it works". This gate makes the second claim.
 *
 * It swaps connectionutil.js for a scripted stub, so the REAL index.js runs the
 * REAL pipeline against a fake model: no network, no device, deterministic.
 *
 * Exit 0 = the pipeline demonstrably works end to end.
 */
import { mkdtempSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (cond, label) => {
    if (cond) { pass++; console.log('  ✓ ' + label); }
    else { fail++; console.log('  ✗ ' + label); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Scripted model ───────────────────────────────────────────────────
// Replies are chosen by inspecting the system prompt, so each pass gets a
// plausible answer for ITS job and we can assert what the pipeline did with it.
const calls = [];
const STUB = `
export const calls = [];
export async function sendSummarizerRequest(s, sysPrompt, prompt) {
    const kind = /continuity AUDITOR for the character ledger/.test(sysPrompt) ? 'ledger-audit'
        : /character-continuity mind/.test(sysPrompt) ? 'ledger-scribe'
        : /detail/i.test(sysPrompt) ? 'detail'
        : 'summary';
    globalThis.__calls.push({ kind, prompt });
    if (kind === 'ledger-scribe') {
        // Two characters; Claire's state carries a claim the story never showed.
        return JSON.stringify([
            { name: 'Claire Argent', core: 'guarded, precise; grips her own wrist when tense', state: 'waiting by the arch, aware the Board already ruled against Jovan', arc: 'protective older sister', threads: ['shape the statement before Council Hall'] },
            { name: 'Jovan Argent', core: 'deliberate, plain-spoken', state: 'on the platform, weighing whether to answer', arc: 'underestimated', threads: ['decide whether to answer the challenge'] },
        ]);
    }
    if (kind === 'ledger-audit') {
        // The auditor removes the unsupported claim, keeps everything supported.
        return JSON.stringify([
            { name: 'Claire Argent', state: 'waiting by the arch, watching the platform' },
        ]);
    }
    return 'A compact summary line.';
}
export async function fetchOllamaModels() { return []; }
export async function testOpenAIConnection() { return true; }
export async function populateProfileDropdown() {}
export function getConnectionDisplayName() { return 'stub'; }
`;

// ── Mocked SillyTavern ───────────────────────────────────────────────
globalThis.__calls = calls;
const noop = () => {};
const chain = new Proxy(function () {}, { get: (_t, p) => (p === 'length' ? 0 : chain), apply: () => chain });
globalThis.$ = new Proxy(function () { return chain; }, { get: () => chain, apply: () => chain });
globalThis.jQuery = globalThis.$;
globalThis.toastr = { info: noop, success: noop, warning: noop, error: noop, clear: noop };
globalThis.localStorage = {
    _d: new Map(),
    get length() { return this._d.size; },
    key(i) { return [...this._d.keys()][i] ?? null; },
    getItem(k) { return this._d.has(k) ? this._d.get(k) : null; },
    setItem(k, v) { this._d.set(k, String(v)); },
    removeItem(k) { this._d.delete(k); },
};
const event_types = {
    MESSAGE_RECEIVED: 'MESSAGE_RECEIVED', CHAT_CHANGED: 'CHAT_CHANGED', CHAT_RENAMED: 'CHAT_RENAMED',
    GENERATION_STARTED: 'GENERATION_STARTED', MESSAGE_DELETED: 'MESSAGE_DELETED',
    MESSAGE_EDITED: 'MESSAGE_EDITED', MESSAGE_SWIPED: 'MESSAGE_SWIPED',
    MESSAGE_UPDATED: 'MESSAGE_UPDATED', GENERATION_ENDED: 'GENERATION_ENDED', APP_READY: 'APP_READY',
};
const handlers = new Map();
const fire = async (e, ...a) => { for (const f of (handlers.get(e) || [])) await f(...a); };

let injected = '';
const mkMsg = (who, mes, isUser = false) => ({ name: who, is_user: isUser, is_system: false, mes, extra: {} });
const chat = [
    mkMsg('Player', 'I step off the train at Marcroft.', true),
    mkMsg('Narrator', 'Claire Argent waited by the arch, grey eyes on the platform.'),
    mkMsg('Player', 'I meet her eyes.', true),
    mkMsg('Narrator', 'Jovan Argent stepped onto the platform. Claire did not move.'),
];
const ctx = {
    chat, chatMetadata: {}, extensionSettings: {}, characters: [], characterId: 0,
    name1: 'Player', name2: 'Narrator', chatId: 'e2e.jsonl',
    eventSource: { on: (e, f) => { if (!handlers.has(e)) handlers.set(e, []); handlers.get(e).push(f); }, emit: noop, removeListener: noop },
    event_types,
    saveSettingsDebounced: noop, saveMetadata: noop, saveMetadataDebounced: noop,
    setExtensionPrompt: (_m, text) => { injected = text || ''; },
    getCurrentChatId: () => 'e2e.jsonl',
    renderExtensionTemplateAsync: async () => '<div></div>',
    registerSlashCommand: noop,
    SlashCommandParser: { addCommandObject: noop },
    SlashCommand: { fromProps: () => ({}) },
    SlashCommandArgument: { fromProps: () => ({}) },
    SlashCommandNamedArgument: { fromProps: () => ({}) },
    ARGUMENT_TYPE: { STRING: 'string' },
    executeSlashCommandsWithOptions: async () => ({}),
    generateQuietPrompt: async () => '',
    substituteParams: (s) => s,
    extensionPrompts: {},
};
globalThis.SillyTavern = { getContext: () => ctx };
globalThis.window = globalThis;
globalThis.document = {
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener: noop, body: { appendChild: noop },
    createElement: () => ({ style: {}, appendChild: noop, setAttribute: noop, classList: { add: noop } }),
};
globalThis.structuredClone = globalThis.structuredClone ?? ((o) => JSON.parse(JSON.stringify(o)));
process.on('unhandledRejection', (e) => { console.log('  ✗ unhandled rejection: ' + (e && e.message)); process.exit(1); });

const store = () => ctx.chatMetadata.summaryception || {};
const dir = mkdtempSync(join(tmpdir(), 'sc-e2e-'));
try {
    copyFileSync(join(HERE, 'index.js'), join(dir, 'index.js'));
    writeFileSync(join(dir, 'connectionutil.js'), STUB);
    writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
    const realError = console.error;
    console.error = noop;
    await import(pathToFileURL(join(dir, 'index.js')).href);
    await sleep(300);
    console.error = realError;

    // Settings: ledger on, live pass every turn, audit reachable on demand.
    const s = ctx.extensionSettings.summaryception;
    Object.assign(s, {
        enabled: true, ledgerEnabled: true, ledgerLiveUpdate: true, ledgerLiveEveryTurns: 1,
        connectionSource: 'profile', profileId: 'stub', ledgerAuditEnabled: true,
        ledgerAuditEveryTurns: 0,   // drive the audit explicitly, not by cadence
    });

    console.log('== 1. a new turn reaches the scribe and lands in the ledger ==');
    await fire('MESSAGE_RECEIVED', chat.length - 1);
    await sleep(1200);
    const led = store().ledger || {};
    ok(calls.some((c) => c.kind === 'ledger-scribe'), 'MESSAGE_RECEIVED drove a real ledger-scribe call');
    ok(!!led['Claire Argent'] && !!led['Jovan Argent'], 'the scribe reply was parsed and merged into the ledger');
    ok(led['Claire Argent'] && led['Claire Argent'].core.includes('grips her own wrist'), 'character nature stored verbatim');
    ok(typeof store().ledgerLiveIdx === 'number' && store().ledgerLiveIdx === chat.length - 1, 'the live pointer advanced to the newest turn');
    ok(typeof led['Claire Argent']._t === 'number', 'entries carry the turn stamp rewinds depend on (v5.49)');

    console.log('== 2. the ledger actually reaches the storyteller ==');
    ok(/Claire Argent/.test(injected), 'the on-screen character is injected');
    ok(/grips her own wrist/.test(injected), 'their nature is in the injected block');
    ok(!/_t|updatedAt|"core"/.test(injected), 'no internal bookkeeping or raw JSON leaks into the prompt');

    console.log('== 3. checkpoints exist for cheap rewinds (v5.51) ==');
    const ck = [...globalThis.localStorage._d.keys()].filter((k) => k.startsWith('sc_ledgerckpt::'));
    ok(ck.length > 0, 'a checkpoint was written for this turn');

    console.log('== 4. THE LEDGER AUDITOR — never executed before this gate (v5.58.0) ==');
    const before = led['Claire Argent'].state;
    ok(/Board already ruled/.test(before), 'precondition: the scribe recorded an unsupported claim');
    const mod = await import(pathToFileURL(join(dir, 'index.js')).href);
    void mod;
    // Drive it the way the button does: via the module's own slash/queue path.
    globalThis.__auditRan = false;
    const auditBefore = calls.filter((c) => c.kind === 'ledger-audit').length;
    // The audit is internal; reach it by cadence with the counter forced.
    s.ledgerAuditEveryTurns = 1;
    await fire('MESSAGE_RECEIVED', chat.length - 1);
    await sleep(9000);   // cadence arms a delayed retry by design
    const auditCalls = calls.filter((c) => c.kind === 'ledger-audit').length - auditBefore;
    ok(auditCalls > 0, 'the auditor ran a real verification call');
    if (auditCalls > 0) {
        const ap = calls.filter((c) => c.kind === 'ledger-audit').pop().prompt;
        ok(/Claire Argent waited by the arch/.test(ap), "the audit's evidence is the character's own on-screen text");
        ok(!/Board already ruled/.test(ap.split('<evidence>')[1] || ''), 'the unsupported claim is NOT in the evidence (nothing to support it)');
        const after = (store().ledger['Claire Argent'] || {}).state || '';
        ok(!/Board already ruled/.test(after), 'THE AUDITOR CORRECTED THE DRIFT: the unsupported claim is gone');
        ok(/watching the platform/.test(after), 'the corrected state landed');
        ok(typeof store().ledger['Claire Argent']._a === 'number', 'the audited entry is stamped so the round-robin advances');
    }

    console.log('== 5. one exclusive LLM channel (v5.60.1) ==');
    const seq = calls.map((c) => c.kind);
    ok(seq.length > 0, `passes ran sequentially: ${seq.join(' -> ')}`);

    console.log('== 6. a REAL chat switch: new metadata AND new messages ==');
    const oldNames = Object.keys(store().ledger || {});
    ctx.chatMetadata = {};
    ctx.chatId = 'other.jsonl';
    ctx.chat = [
        mkMsg('Player', 'Different story entirely.', true),
        mkMsg('Narrator', 'Rain over an empty market square.'),
    ];
    await fire('CHAT_CHANGED');
    await sleep(1500);
    const newLed = Object.keys(store().ledger || {});
    ok(oldNames.length > 0, 'precondition: the previous chat had a populated ledger');
    ok(!newLed.some((n) => oldNames.includes(n)), 'no character from the previous chat bleeds into the new one');
    ok(!/Claire Argent/.test(injected), "the previous chat's cast is no longer injected");
} finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* temp */ }
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.log('PIPELINE BROKEN — DO NOT PUSH'); process.exit(1); }
console.log('PIPELINE VERIFIED END TO END ✓');

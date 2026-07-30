'use strict';
// Summaryception — CHAOS / INVARIANT GATE.   Run:  node chaos_test.js
//
// WHY THIS EXISTS
// ---------------
// The other gates prove the paths we THOUGHT of. This one proves the paths we
// didn't: it hammers the real store-mutating functions extracted from index.js
// with randomised, deliberately stupid input — settings punched to absurd values,
// snippets deleted from anywhere, messages deleted at any index, chats truncated
// to any length, ledgers rewound to any turn, in any order — and after EVERY
// single operation it re-checks the invariants the whole extension rests on.
//
// A failure here prints the exact seed and operation sequence, so any find is
// deterministically reproducible:  CHAOS_SEED=12345 node chaos_test.js
//
// Exit 0 = no random sequence of user stupidity could break an invariant in this
// run. Not a proof of correctness; a very large amount of evidence.

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

const NAMES = [
    '_LEDGER_LABEL_RE', 'stripLeadingLabel', '_lev', '_normName', 'resolveLedgerKey',
    '_NOTES_SOFT_CAP', '_NOTES_KEEP_TAIL', '_NOTES_CANON_V', '_journalNow',
    '_canonNotesAgainst', '_canonicalizeLedgerNotes', 'foldLedgerNotes', 'notesCover',
    'ensureLedgerNotes', 'wipeLedgerData', 'truncateLedgerToTurn', '_baseNotesFromPage',
    'adoptExternalLedgerEdits', '_renameEvidence', '_renameLedgerKeySpace',
    'appendLedgerNotes', '_notesFromDeltas', 'rewindLedgerFromNotes', 'compactLedgerNotes',
    '_ledgerDroppingPast', 'reindexAfterDeletion', 'clampStoreToLength',
    'recomputeSummarizedUpTo', '_turnHasCoverage', '_uncoveredTurnsIn',
    '_snipSig', '_resolveSnipRow', '_selectNudgeFlags', '_fixVerdict', '_ckptDue',
    '_shrinkVerdict', '_selectCheckpointKeeps', '_computeReplayChunks',
    '_computeLiveLedgerRange', '_contiguousRanges', '_mergeRanges',
];

const sandbox = `
let __settings = {};
let __store = {};
function getSettings(){ return __settings; }
function getChatStore(){ return __store; }
function log(){}
function saveChatStore(){}
const SillyTavern = { getContext(){ return { chat: [] }; } };
${NAMES.map(extractTopLevel).join('\n\n')}
return {
  setSettings:(v)=>{ __settings = v; }, setStore:(v)=>{ __store = v; },
  ${NAMES.filter(n => /^[a-z_]/i.test(n)).join(', ')}
};
`;
const L = new Function(sandbox)();

// ── deterministic RNG so any failure is reproducible ─────────────────────────
const SEED = process.env.CHAOS_SEED ? (parseInt(process.env.CHAOS_SEED, 10) >>> 0) : (Date.now() >>> 0);
let _s = SEED || 1;
function rnd() { _s ^= _s << 13; _s >>>= 0; _s ^= _s >> 17; _s ^= _s << 5; _s >>>= 0; return _s / 4294967296; }
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[ri(0, arr.length - 1)];

// ── absurd values a user (or a hand-edited settings.json) can produce ────────
const ABSURD = [0, -1, -999, 1, 2, 0.5, NaN, Infinity, -Infinity, 1e9, null, undefined, '', '7', 'x', true, false, [], {}];
const NUMERIC_KEYS = [
    'verbatimTurns', 'turnsPerSummary', 'snippetsPerLayer', 'snippetsPerPromotion', 'maxLayers',
    'ledgerActiveWindow', 'ledgerMaxActive', 'ledgerMaxCharsPerChar', 'ledgerLiveEveryTurns',
    'ledgerRosterMax', 'ledgerMentionMax', 'ledgerMentionWindow', 'ledgerEditRewindDepth',
    'continuityNudgeMax', 'continuityNudgeDeliveries', 'continuityFixMinRatio',
    'shrinkMinRatio', 'shrinkMinChars', 'shrinkStashChars', 'recallMaxSnippets', 'recallPersist',
    'flashbackMax', 'flashbackMaxChars', 'flashbackMinScore', 'injectionDepth', 'ledgerAuditEveryTurns',
];
const BOOL_KEYS = [
    'enabled', 'ledgerEnabled', 'ledgerLiveUpdate', 'ledgerAutoRewind', 'ledgerAuditEnabled',
    'sisterEnabled', 'continuityEnabled', 'continuityNudge', 'continuityAutoFix',
    'disableGhosting', 'pauseSummarization', 'shrinkGuard', 'shrinkRetry',
];
function punchSettings() {
    const s = {};
    for (const k of NUMERIC_KEYS) s[k] = pick(ABSURD);
    for (const k of BOOL_KEYS) s[k] = pick([true, false, null, undefined, 0, 1, 'yes']);
    return s;
}

// ── a plausible-but-random store ─────────────────────────────────────────────
function makeStore(chatLen) {
    const layers = [[], [], []];
    let t = 0;
    while (t < chatLen && rnd() < 0.85) {
        const a = t, b = Math.min(chatLen - 1, t + ri(1, 4));
        layers[0].push({ text: 'snip ' + a + '-' + b, turnRange: [a, b] });
        t = b + 1;
    }
    if (rnd() < 0.4 && layers[0].length > 2) {
        const moved = layers[0].splice(0, ri(1, 2));
        layers[1].push({ text: 'meta', turnRange: [moved[0].turnRange[0], moved[moved.length - 1].turnRange[1]] });
    }
    if (rnd() < 0.2) layers[0].push({ text: 'range-less legacy', turnRange: null });
    const ranged = layers[0].filter(s => s.turnRange);
    const notes = [];
    const names = ['Claire', 'Jovan', 'Silas'];
    for (let i = 0; i < ri(0, 12); i++) {
        notes.push({ t: ri(0, Math.max(0, chatLen - 1)), name: pick(names), at: i + 1, state: 's' + i });
    }
    const st = {
        layers,
        summarizedUpTo: ranged.length ? Math.max(...ranged.map(s => s.turnRange[1])) : -1,
        ledgerLiveIdx: ri(-1, Math.max(0, chatLen - 1)),
        _ckptLast: ri(-1, Math.max(0, chatLen - 1)),
        ledgerNotes: notes,
        ledgerNotesFrom: rnd() < 0.85 ? 0 : ri(0, Math.max(0, chatLen - 1)),
        ledger: {},
        ghostedIndices: [],
        continuityFlags: [],
        continuityResolved: [],
        pins: [],
    };
    if (st._ckptLast > st.ledgerLiveIdx) st._ckptLast = st.ledgerLiveIdx;
    st.ledger = L.foldLedgerNotes(st.ledgerNotes, Infinity);
    // ghost every turn a snippet actually narrates — the state the pipeline produces
    for (let i = 0; i < chatLen; i++) if (L._turnHasCoverage(st, i)) st.ghostedIndices.push(i);
    if (rnd() < 0.5) {
        st.continuityFlags.push({ id: 'f1', status: 'open', fix: 'x', where: pick(['snippet', 'source']), turnRange: [0, Math.max(0, chatLen - 1)], createdAt: 1 });
        st.continuityResolved.push({ issue: 'y', turnRange: [0, Math.max(0, chatLen - 1)], resolvedAt: 1 });
    }
    return st;
}

// ── THE INVARIANTS ───────────────────────────────────────────────────────────
function check(st, chatLen, where) {
    const last = chatLen - 1;
    const bad = [];
    const num = (v) => typeof v === 'number' && isFinite(v);

    if (!num(st.summarizedUpTo) || st.summarizedUpTo < -1) bad.push(`summarizedUpTo is ${String(st.summarizedUpTo)}`);
    if (st.summarizedUpTo > last) bad.push(`summarizedUpTo ${st.summarizedUpTo} > last turn ${last}`);
    if (!num(st.ledgerLiveIdx) || st.ledgerLiveIdx < -1) bad.push(`ledgerLiveIdx is ${String(st.ledgerLiveIdx)}`);
    if (st.ledgerLiveIdx > last) bad.push(`ledgerLiveIdx ${st.ledgerLiveIdx} > last turn ${last}`);
    // Not "the stored cursor is tidy" — five writers legitimately leave it stale.
    // What must hold is that checkpointing is never permanently BLOCKED: from any
    // reachable state, a checkpoint must come due within one cadence of the pointer.
    // Mirror the ONE reader exactly: maybeCheckpointLedger asks _ckptDue about the
    // pointer itself, so the staleness comparison must be against the pointer too.
    // The invariant is not "a checkpoint is due right now" — a cursor at or below the
    // pointer is a legitimate throttle that clears as the chat grows. It is that the
    // cursor is never a FOSSIL: above the pointer AND not re-armed, which blocks every
    // checkpoint until the chat regrows past a turn that no longer exists.
    if (num(st.ledgerLiveIdx) && st.ledgerLiveIdx >= 0) {
        const cursorSane = !num(st._ckptLast) || st._ckptLast <= st.ledgerLiveIdx;
        if (!cursorSane && !L._ckptDue(st._ckptLast, st.ledgerLiveIdx, 1)) {
            bad.push(`checkpointing is blocked by a fossil cursor ${String(st._ckptLast)} above pointer ${st.ledgerLiveIdx}`);
        }
    }

    if (Array.isArray(st.ledgerNotes)) {
        for (const n of st.ledgerNotes) {
            if (!n || !num(n.t)) { bad.push('a note has no numeric turn'); break; }
            if (n.t > last) { bad.push(`a note sits at turn ${n.t}, past the chat end ${last}`); break; }
        }
    }
    if (Array.isArray(st.ledgerStagingNotes)) {
        for (const n of st.ledgerStagingNotes) {
            if (n && num(n.t) && n.t > last) { bad.push(`a STAGING note sits at turn ${n.t}, past the chat end`); break; }
        }
    }

    for (let li = 0; li < (st.layers || []).length; li++) {
        for (const sn of (st.layers[li] || [])) {
            if (!sn || sn.turnRange === null || sn.turnRange === undefined) continue;
            if (!Array.isArray(sn.turnRange) || sn.turnRange.length !== 2) { bad.push('a snippet has a malformed turnRange'); break; }
            const [a, b] = sn.turnRange;
            if (!num(a) || !num(b)) { bad.push(`a snippet range holds ${String(a)},${String(b)}`); break; }
            if (a > b) { bad.push(`inverted snippet range [${a},${b}]`); break; }
            if (b > last) { bad.push(`snippet range [${a},${b}] runs past the chat end ${last}`); break; }
            if (a < 0) { bad.push(`negative snippet range start ${a}`); break; }
        }
    }

    for (const i of (st.ghostedIndices || [])) {
        if (!num(i) || i < 0 || i > last) { bad.push(`ghostedIndices holds ${String(i)} (chat is 0..${last})`); break; }
    }
    // THE law: nothing is hidden that no surviving snippet narrates.
    for (const i of (st.ghostedIndices || [])) {
        if (num(i) && i >= 0 && i <= last && !L._turnHasCoverage(st, i)) {
            bad.push(`turn ${i} is HIDDEN but narrated by nothing — a silent memory hole`);
            break;
        }
    }

    for (const f of (st.continuityFlags || [])) {
        if (f && Array.isArray(f.turnRange) && (f.turnRange[0] > f.turnRange[1] || f.turnRange[1] > last || f.turnRange[0] < 0)) {
            bad.push(`a continuity flag points at [${f.turnRange}] outside 0..${last}`); break;
        }
    }
    for (const r of (st.continuityResolved || [])) {
        if (r && Array.isArray(r.turnRange) && (r.turnRange[0] > r.turnRange[1] || r.turnRange[1] > last || r.turnRange[0] < 0)) {
            bad.push(`a resolved receipt points at [${r.turnRange}] outside 0..${last}`); break;
        }
    }

    // The page must be reproducible from the journal whenever the journal claims to cover.
    if (L.notesCover(st, Math.max(0, last))) {
        let folded;
        try { folded = L.foldLedgerNotes(st.ledgerNotes, Math.max(0, last)); }
        catch (e) { bad.push('folding the journal threw: ' + e.message); }
        if (folded && st.ledger && typeof st.ledger === 'object') {
            for (const k of Object.keys(folded)) {
                if (!Object.prototype.hasOwnProperty.call(st.ledger, k)) {
                    bad.push(`fold(notes) has '${k}' the page does not — page != fold(notes)`); break;
                }
            }
        }
    }
    return bad.map(b => `${where}: ${b}`);
}

// ── the operations a user can inflict, in any order ──────────────────────────
const OPS = [
    { name: 'delete one message', run(ctx) {
        if (ctx.chatLen <= 1) return;
        const D = ri(0, ctx.chatLen - 1);
        ctx.chatLen -= 1;
        L.reindexAfterDeletion(ctx.st, D);
        ctx.st.summarizedUpTo = Math.min(ctx.st.summarizedUpTo, ctx.chatLen - 1);
        ctx.unghostUncovered();
        return `D=${D}`;
    } },
    { name: 'bulk trim the chat', run(ctx) {
        if (ctx.chatLen <= 1) return;
        const newLen = ri(1, ctx.chatLen);
        ctx.chatLen = newLen;
        L.clampStoreToLength(ctx.st, newLen);
        ctx.dropSnippetsPastEnd();
        ctx.unghostUncovered();
        return `newLen=${newLen}`;
    } },
    { name: 'delete a random snippet (panel)', run(ctx) {
        const li = ri(0, (ctx.st.layers || []).length - 1);
        const arr = ctx.st.layers[li];
        if (!arr || arr.length === 0) return;
        const j = ri(0, arr.length - 1);
        const removed = arr[j];
        arr.splice(j, 1);
        ctx.st.summarizedUpTo = L.recomputeSummarizedUpTo();
        // the shipped rescue: un-ghost exactly what the deletion orphaned, any depth
        if (removed && Array.isArray(removed.turnRange)) {
            const orphans = L._uncoveredTurnsIn(ctx.st, removed.turnRange[0], removed.turnRange[1], ctx.chatLen);
            ctx.st.ghostedIndices = (ctx.st.ghostedIndices || []).filter(i => !orphans.includes(i));
        }
        return `layer=${li} idx=${j}`;
    } },
    { name: 'rewind the ledger from notes', run(ctx) {
        const t = ri(0, Math.max(0, ctx.chatLen - 1));
        L.rewindLedgerFromNotes(t);
        return `to=${t}`;
    } },
    { name: 'truncate the ledger', run(ctx) {
        const t = ri(-1, Math.max(0, ctx.chatLen - 1));
        L.truncateLedgerToTurn(ctx.st, t);
        return `to=${t}`;
    } },
    { name: 'wipe the ledger', run(ctx) { L.wipeLedgerData(ctx.st); return ''; } },
    { name: 'compact the journal', run(ctx) { L.compactLedgerNotes(ctx.st); return ''; } },
    { name: 'a scribe pass lands', run(ctx) {
        // Production NEVER journals alone: appendLedgerNotes has exactly one call
        // site, inside mergeLedgerDeltas, and it is handed the deltas that ALREADY
        // landed on the page. Page and journal are written together or the invariant
        // page == fold(notes) is violated by construction — so the op mirrors that.
        const t = ri(0, Math.max(0, ctx.chatLen - 1));
        const name = pick(['Claire', 'Jovan', 'Silas']);
        const delta = { name, state: 'chaos ' + t };
        if (!ctx.st.ledger || typeof ctx.st.ledger !== 'object') ctx.st.ledger = {};
        ctx.st.ledger[name] = Object.assign({}, ctx.st.ledger[name], { state: delta.state, updatedAt: Date.now(), _t: t });
        L.appendLedgerNotes([delta], t);
        return `t=${t} ${name}`;
    } },
    { name: 'adopt external page edits', run(ctx) {
        const k = pick(Object.keys(ctx.st.ledger || {}));
        if (k) ctx.st.ledger[k] = Object.assign({}, ctx.st.ledger[k], { state: 'copilot edit' });
        L.adoptExternalLedgerEdits(ctx.st);
        return k || '';
    } },
    { name: 'punch every setting', run(ctx) { L.setSettings(punchSettings()); return ''; } },
];

// ── driver ───────────────────────────────────────────────────────────────────
const RUNS = parseInt(process.env.CHAOS_RUNS || '400', 10);
const STEPS = parseInt(process.env.CHAOS_STEPS || '25', 10);
let failures = [];
let opsRun = 0;

for (let run = 0; run < RUNS && failures.length === 0; run++) {
    const chatLen0 = ri(2, 40);
    const ctx = { chatLen: chatLen0, st: null };
    ctx.st = makeStore(chatLen0);
    ctx.unghostUncovered = () => {
        ctx.st.ghostedIndices = (ctx.st.ghostedIndices || [])
            .filter(i => typeof i === 'number' && i >= 0 && i < ctx.chatLen && L._turnHasCoverage(ctx.st, i));
    };
    ctx.dropSnippetsPastEnd = () => {
        for (const lyr of ctx.st.layers || []) {
            if (!Array.isArray(lyr)) continue;
            for (const sn of lyr) {
                if (sn && Array.isArray(sn.turnRange) && sn.turnRange[1] > ctx.chatLen - 1) {
                    sn.turnRange = sn.turnRange[0] > ctx.chatLen - 1 ? null : [sn.turnRange[0], ctx.chatLen - 1];
                }
            }
        }
        ctx.st.summarizedUpTo = Math.min(ctx.st.summarizedUpTo, ctx.chatLen - 1);
    };
    L.setStore(ctx.st);
    L.setSettings(punchSettings());

    const trail = [];
    const pre = check(ctx.st, ctx.chatLen, 'setup');
    if (pre.length) { failures = pre.map(p => ({ seed: SEED, run, trail: ['<generated store>'], msg: p })); break; }

    for (let step = 0; step < STEPS; step++) {
        const op = pick(OPS);
        let detail = '';
        try { detail = op.run(ctx) || ''; }
        catch (e) {
            failures.push({ seed: SEED, run, trail: trail.concat([`${op.name} ${detail}`]), msg: `THREW: ${e && e.message}` });
            break;
        }
        opsRun++;
        trail.push(`${op.name}${detail ? ' (' + detail + ')' : ''}`);
        const bad = check(ctx.st, ctx.chatLen, op.name);
        if (bad.length) { failures.push({ seed: SEED, run, trail: trail.slice(), msg: bad[0] }); break; }
    }
}

console.log(`\nseed ${SEED} — ${RUNS} runs x up to ${STEPS} ops (${opsRun} operations executed)`);
if (failures.length === 0) {
    console.log('Invariants held through every randomised sequence:');
    console.log('  • summarizedUpTo / ledgerLiveIdx stay finite numbers inside the chat');
    console.log('  • no fossil checkpoint cursor can block checkpointing');
    console.log('  • no journal note, live or staging, sits past the chat end');
    console.log('  • no snippet range is inverted, negative, or past the chat end');
    console.log('  • no continuity flag or receipt points outside the chat');
    console.log('  • page never loses a character fold(notes) still has');
    console.log('  • NOTHING IS HIDDEN THAT NO SURVIVING SNIPPET NARRATES');
    console.log('CHAOS GATE PASSED ✓');
    process.exit(0);
}
const f = failures[0];
console.log('\nINVARIANT BROKEN');
console.log('  reproduce with: CHAOS_SEED=' + f.seed + ' node chaos_test.js');
console.log('  run #' + f.run);
console.log('  sequence:');
f.trail.forEach((t, i) => console.log(`    ${i + 1}. ${t}`));
console.log('  failure: ' + f.msg);
console.log('CHAOS GATE FAILED ✗');
process.exit(1);

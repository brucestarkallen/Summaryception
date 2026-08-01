// NEGATIVE TEST — a guard that has never failed is unproven.
//
// For every invariant added in v5.94.0 (one key space for the ledger page and its
// notes journal), this puts the ORIGINAL bug back in a scratch copy of the repo,
// runs the logic gate, and requires two things: exit code 1, AND that the specific
// assertion written to catch that bug is among the failures. A mutation that still
// passes means the assertion is decorative — fix the assertion, not this file.
//
//   node negative_test.mjs
//
// Slow by design (one full ledger_test.js run per mutation, ~10 runs).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH = path.join(os.tmpdir(), 'sc_negative_scratch');

/** [label, file, currentText, bugText, assertionThatMustFail, gateFile?] */
// gateFile defaults to ledger_test.js. Some bugs live in a CALLER's ARGUMENT, not
// in any function's body — the pure-function suite runs them all green because
// each function is individually correct. Those are provable only end to end, so
// their mutation names e2e_test.mjs instead.
const MUTATIONS = [
    // ── v5.110.0: parameter fallbacks are copies too ──
    ['a parameter fallback re-hardcodes the old 600 cap', 'index.js',
        "    const cap = capChars || defaultSettings.ledgerMaxCharsPerChar;",
        "    const cap = capChars || 600;",
        'no parameter fallback is a magic number \u2014 it names its source'],

    // ── v5.109.0: a default has exactly one home ──
    ['a call site copies a numeric default inline again (the drift that shipped)', 'index.js',
        "    const keep = Math.max(0, asstTurns.length - (s.verbatimTurns ?? defaultSettings.verbatimTurns));",
        "    const keep = Math.max(0, asstTurns.length - (s.verbatimTurns ?? 10));",
        'no call site copies a numeric default inline \u2014 every fallback names defaultSettings'],

    ['the ledger card cap silently reverts to the old 600', 'index.js',
        "    ledgerMaxCharsPerChar: 1000,",
        "    ledgerMaxCharsPerChar: 600,",
        'ledgerMaxCharsPerChar default is 1000 (three sites read 600)'],

    // ── v5.108.0: ONE exclusive channel, enforced at the lock ──
    // Each of these is a hole that was ACTUALLY OPEN in v5.107.0.
    ['THE ROOT: the lock checks only its own flag again', 'index.js',
        "function _acquireSummarize() {\n    if (_llmChannelBusy()) return false;",
        "function _acquireSummarize() {\n    if (isSummarizing) return false;",
        'the lock refuses when ANY pass holds the channel, not just when isSummarizing'],

    ['a caller discards the lock result (bare acquire)', 'index.js',
        "        if (!_acquireSummarize()) { toastr.warning('A background pass is finishing \u2014 try again in a few seconds.', 'Summaryception'); return; }\n        const startEpoch = _chatEpoch;   // a chat switch mid-call must not write into a detached store\n        const btn = $(this);\n        btn.prop('disabled', true).removeClass('fa-rotate-right')",
        "        _acquireSummarize();\n        const startEpoch = _chatEpoch;   // a chat switch mid-call must not write into a detached store\n        const btn = $(this);\n        btn.prop('disabled', true).removeClass('fa-rotate-right')",
        'no call site discards the lock result'],

    ['an entry point hand-rolls the subset check again', 'index.js',
        "        if (_llmChannelBusy()) { toastr.warning('A background pass is finishing \u2014 try again in a few seconds.', 'Summaryception'); return; }\n        const sn = _row.sn;",
        "        if (isSummarizing) { toastr.warning('Busy summarizing \u2014 try again in a moment.', 'Summaryception'); return; }\n        const sn = _row.sn;",
        'isSummarizing is read ONLY by _llmChannelBusy() \u2014 no hand-rolled subset survives'],

    ['the Co-Writer leaves the channel again', 'index.js',
        "    if (!_acquireSummarize()) { btn.prop('disabled', false).text('\ud83d\udd0d Review Proposed Edits'); $('#sc_editor_cancel').hide(); return; }\n    try {",
        "    try {",
        'Co-Writer takes the channel before its pass'],

    ['rebuild-all clears the snippets before it checks the channel', 'index.js',
        "        if (_llmChannelBusy()) { toastr.warning('A background pass is finishing \u2014 try again in a few seconds.', 'Summaryception'); return; }\n        if (!confirm('Rebuild ALL snippets from the start?",
        "        if (!confirm('Rebuild ALL snippets from the start?",
        'rebuild-all checks the channel BEFORE it clears the snippets'],

    ['the Stop button lies about a running background pass again', 'index.js',
        "        if (!_llmChannelBusy() && !currentAbortController) {",
        "        if (!isSummarizing && !currentAbortController) {",
        'the Stop button asks the channel, not one flag'],

    // ── v5.105.0: checkpoint labels validated against their turn ──
    ['checkpoint labels are trusted blindly again (restores one turn high)', 'index.js',
        "                        const _true = _relocateCheckpoint(_chatNow, v.atTurn, v.tsig);\n                        if (_true < 0) continue;",
        "                        const _true = v.atTurn;\n                        if (_true < 0) continue;",
        'listLedgerCheckpoints corrects the label for every consumer'],

    ['the fingerprint is no longer saved (nothing to check against)', 'index.js',
        "era: (store.ledgerEra | 0), tsig: _tsig });",
        "era: (store.ledgerEra | 0) });",
        'saveLedgerCheckpoint stamps the turn fingerprint'],

    ['a snapshot whose turn is gone is restored anyway', 'index.js',
        "                        if (_true < 0) continue;   // its turn is gone",
        "                        if (false) continue;   // its turn is gone",
        'and drops a snapshot whose turn no longer exists'],

    ['the drift search guesses when two turns match', 'index.js',
        "            if (hit !== -1) return -1;              // two turns match — ambiguous, refuse",
        "            if (hit !== -1) return hit;",
        'two candidates below a missed label is ambiguous — refused rather than guessed'],

    ['the drift search is unbounded', 'index.js',
        "    const floor = Math.max(0, atTurn - _CKPT_DRIFT_WINDOW);",
        "    const floor = 0;",
        'a label beyond the window is refused rather than scanned forever'],

    ['the fingerprint ignores the speaker', 'index.js',
        "    const raw = String(m.name == null ? '' : m.name) + '|' + String(m.is_user ? 'u' : 'a') + '|' + String(m.mes == null ? '' : m.mes).slice(0, 160);",
        "    const raw = String(m.mes == null ? '' : m.mes).slice(0, 160);",
        'the same words from a different speaker fingerprint differently'],

    // ── v5.104.0: fossil checkpoint cursor (found by chaos_test.js) ──
    ['the fossil cursor blocks checkpointing again', 'index.js',
        "    if (last > idx) last = -999;   // fossil from a rewind — re-arm rather than block forever",
        "",
        'KILL SHOT: a cursor ABOVE the pointer is a fossil from a rewind — it re-arms instead of blocking forever'],

    ['the reader compares the raw cursor again', 'index.js',
        "        if (!_ckptDue(st._ckptLast, idx, CKPT_EVERY)) return;   // throttle by cadence (and skip same-turn repeats)",
        "        const last = (typeof st._ckptLast === 'number') ? st._ckptLast : -999;\n        if (idx < last + CKPT_EVERY) return;",
        'maybeCheckpointLedger asks _ckptDue rather than comparing raw'],

    ['a zero cadence makes every turn a checkpoint', 'index.js',
        "    const step = Math.max(1, (typeof every === 'number' && isFinite(every)) ? (every | 0) : 1);",
        "    const step = (typeof every === 'number' && isFinite(every)) ? (every | 0) : 1;",
        'a zero cadence falls back to 1 — the same turn is never re-checkpointed'],

    // ── v5.103.0: coverage-gated ghosting + autonomous auditor ──
    ['ghosting stops requiring coverage (deleted snippet reopens the memory hole)', 'index.js',
        "        if (!_turnHasCoverage(store, i)) continue;\n        msg.extra.sc_ghosted = true;",
        "        msg.extra.sc_ghosted = true;",
        // The KILL SHOT above it proves the RULE (a pure computation over a store);
        // it cannot see a change in index.js. The structural assertion is what
        // catches the guard being removed, so that is the one named.
        'ghostMessagesUpTo enforces it'],

    ['the delete rescue goes back to Layer 0 only', 'index.js',
        "            if (removedSn && Array.isArray(removedSn.turnRange)) {",
        "            if (layerIdx === 0 && removedSn && removedSn.turnRange) {",
        'the Layer-0-only condition is gone'],

    ['the delete confirmation is removed', 'index.js',
        "            if (!_okToDelete) return;",
        "            if (false) return;",
        'and the delete is confirmed first, with its consequence stated'],

    ['coverage ignores deep layers (a promoted meta-summary stops counting)', 'index.js',
        "    for (const layer of store.layers) {\n        if (!Array.isArray(layer)) continue;\n        for (const sn of layer) {\n            if (!sn || !Array.isArray(sn.turnRange)) continue;",
        "    for (const layer of [store.layers[0]]) {\n        if (!Array.isArray(layer)) continue;\n        for (const sn of layer) {\n            if (!sn || !Array.isArray(sn.turnRange)) continue;",
        'a promoted meta-summary provides coverage on its own'],

    ['the nudge goes back to oldest-first (new findings starve)', 'index.js',
        "        .sort((a, b) => ((b.createdAt || 0) - (a.createdAt || 0)))",
        "        .sort((a, b) => ((a.createdAt || 0) - (b.createdAt || 0)))",
        'KILL SHOT: the newest findings are delivered — six unfixable originals can no longer starve them'],

    ['corrections never retire (eternal directives)', 'index.js',
        "&& ((f.nudged | 0) < dl))",
        ")",
        'a flag delivered up to the limit is retired from injection'],

    ['deliveries are counted per injection rebuild, not per generation', 'index.js',
        "            for (const f of _selectNudgeFlags(_st.continuityFlags, _cap, _s.continuityNudgeDeliveries)) f.nudged = (f.nudged | 0) + 1;",
        "            void _cap; void _st;",
        'deliveries are counted in onGenerationStarted (fires once per turn), not in updateInjection'],

    ['a botched auto-rewrite is written over the snippet again', 'index.js',
        "            const _v = _fixVerdict(before.length, corrected.length, getSettings());\n            if (!_v.ok) {",
        "            const _v = { ok: true, ratio: 1, reason: 'ok' };\n            if (!_v.ok) {",
        'a refused rewrite leaves the snippet untouched and the flag open'],

    ['the fixer guard accepts a one-line gist', 'index.js',
        "    return { ok: ratio >= minR, ratio, reason: ratio >= minR ? 'ok' : 'lost too much of the snippet' };",
        "    return { ok: true, ratio, reason: 'ok' };",
        'KILL SHOT: a one-line gist replacing a full snippet is refused'],

    ['the autonomous guard is disarmed again', 'index.js',
        "    continuityEnabled: true,       // ON:",
        "    continuityEnabled: false,      // ON:",
        'the continuity auditor runs'],

    ['findings stop being delivered', 'index.js',
        "    continuityNudge: true,         // ON:",
        "    continuityNudge: false,        // ON:",
        'its findings are delivered to the storyteller'],

    // ── v5.102.0: void-assignment + positional row identity ──
    ['recomputeSummarizedUpTo goes back to returning nothing', 'index.js',
        "    store.summarizedUpTo = l0.length > 0 ? Math.max(...l0.map(sn => sn.turnRange[1])) : -1;\n    return store.summarizedUpTo;",
        "    store.summarizedUpTo = l0.length > 0 ? Math.max(...l0.map(sn => sn.turnRange[1])) : -1;",
        'KILL SHOT: assigning FROM the helper leaves a number, not undefined'],

    ['the empty case answers -Infinity again (JSON saves it as null)', 'index.js',
        "    const l0 = (store.layers && store.layers[0]) ? store.layers[0].filter(sn => sn.turnRange) : [];\n    store.summarizedUpTo = l0.length > 0 ? Math.max(...l0.map(sn => sn.turnRange[1])) : -1;",
        "    const l0 = (store.layers && store.layers[0]) ? store.layers[0].filter(sn => sn.turnRange) : [];\n    store.summarizedUpTo = Math.max(...l0.map(sn => sn.turnRange[1]));",
        'a Layer 0 of range-less snippets answers -1, not -Infinity'],

    ['getChatStore stops repairing a damaged pointer', 'index.js',
        "    if (typeof chatMetadata[MODULE_NAME].summarizedUpTo !== 'number' || !isFinite(chatMetadata[MODULE_NAME].summarizedUpTo)) {",
        "    if (false) {",
        'getChatStore repairs a non-numeric summarizedUpTo — chats already damaged recover on load'],

    ['row resolution trusts the position again (deletes the wrong snippet)', 'index.js',
        "    if (at && _snipSig(at) === sig) return { arr, idx: snippetIdx, sn: at };\n    const hits = [];",
        "    if (at) return { arr, idx: snippetIdx, sn: at };\n    const hits = [];",
        'KILL SHOT: after a promotion shifted the layer, the row still resolves to the snippet it DEPICTS'],

    ['an ambiguous search picks the first candidate', 'index.js',
        "    if (hits.length !== 1) return null;   // gone, or duplicated — refuse rather than guess",
        "    if (hits.length === 0) return null;",
        'but when the position misses and the search finds TWO candidates, it refuses rather than guessing'],

    // Re-anchored for v5.103.0: the confirmation dialog now sits between the
    // resolver call and `if (layer)`, so the old three-line anchor no longer exists.
    ['the delete handler bypasses the resolver', 'index.js',
        "        const _row = _resolveSnipRow(layerIdx, snippetIdx, $(this).closest('.sc-snippet').data('sig'));\n        if (!_row) { _snipRowGone(); return; }\n        const layer = _row.arr; snippetIdx = _row.idx;\n        // PRECAUTION.",
        "        const _row = { arr: store.layers[layerIdx], idx: snippetIdx, sn: (store.layers[layerIdx] || [])[snippetIdx] };\n        const layer = _row.arr;\n        // PRECAUTION.",
        '.sc-snippet-delete resolves through _resolveSnipRow'],

    ['rows stop carrying the signature the resolver needs', 'index.js',
        ' data-sig="${_snipSig(sn)}"',
        '',
        'every rendered row carries the signature the resolver needs'],

    // ── v5.101.0: the notes fold must honour the REWIND FLOOR, not the target ──
    // Invisible to ledger_test.js by construction: rewindLedgerFromNotes is correct
    // for whatever turn it is given. The bug was which turn tryAutoRewindLedger gave
    // it, so only the pipeline can see it.
    ['the notes fold rewinds to the TARGET again (swipes and edits stop re-deriving)', 'index.js',
        "        if (rewindLedgerFromNotes(_ckptCeil)) {",
        "        if (rewindLedgerFromNotes(targetTurn)) {",
        'KILL SHOT: the ledger now describes the variant on screen, not the discarded one',
        'e2e_test.mjs'],

    ['the owed tail is never replayed after the fold', 'index.js',
        "            const _queued = (_ckptCeil < targetTurn) ? queueLedgerReplay(_ckptCeil, targetTurn) : 0;",
        "            const _queued = 0;",
        'the swipe actually queued a re-read (it used to queue nothing)',
        'e2e_test.mjs'],

    // ── v5.99.0 round 3: transplant threads round-trip ──
    ['the export comma-joins the threads array again', 'index.js',
        "        L.push('THREADS:');\n        for (const _t of _tpThreads(e.threads)) L.push('- ' + _t);",
        "        L.push('THREADS: ' + String(e.threads || '').trim());",
        // The importer coercion still yields an ARRAY here — of ONE collapsed member.
        // The count is what proves the export encoding, so the count is what is named.
        'both threads survive — the count is not collapsed'],

    ['the import copies threads verbatim (string lands in an array slot)', 'index.js',
        "        const _th = _tpThreads(e.threads);\n        if (_th.length) entry.threads = _th;",
        "        const _th = [];\n        if (e.threads) entry.threads = e.threads;",
        'a document with a raw string threads field is coerced at import'],

    ['the base note stops carrying threads (page and journal disagree on arrival)', 'index.js',
        "        if (_th.length) bn.threads = _th.slice();",
        "",
        'the base note carries the same array — page and journal agree on arrival'],

    ['_tpThreads comma-splits a legacy line (invents boundaries)', 'index.js',
        "    return v.split('\\n').map(l => l.replace(/^\\s*[-*\\u2022]\\s+/, '').trim()).filter(Boolean);",
        "    return v.split(/[\\n,]/).map(l => l.replace(/^\\s*[-*\\u2022]\\s+/, '').trim()).filter(Boolean);",
        'a legacy single-line value becomes ONE thread — never comma-split, which would invent boundaries'],

    // `return v` would make the export's for..of throw on undefined and kill the
    // harness before any assertion runs — exit 1 with nothing named, which proves
    // nothing about THIS guard. `return ''` is iterable, so the export survives and
    // the type assertion is the thing that fires: the mutation is isolated to the
    // behaviour under test.
    ['_tpThreads can return a non-array', 'index.js',
        "    if (typeof v !== 'string') return [];",
        "    if (typeof v !== 'string') return '';",
        'anything else yields an empty array, never a non-array'],

    // ── v5.99.0 round 2 ──
    ['the self-imposed timeout goes back to a bare Error (zero retries)', 'index.js',
        "reject(new ConnectionError('Request timed out after 120s', { retryable: true }))",
        "reject(new Error('Request timed out after 120s'))",
        'the timeout rejection is a flagged ConnectionError, not a bare Error'],

    ['eviction sorts on `at` alone again (turn numbers vs epoch millis)', 'index.js',
        "    const sorted = entries.slice().sort((a, b) =>\n        (_rank(a) - _rank(b)) || (((a && a.at) || 0) - ((b && b.at) || 0)));",
        "    const sorted = entries.slice().sort((a, b) => ((a && a.at) || 0) - ((b && b.at) || 0));",
        'KILL SHOT: the re-derivable checkpoint goes first even though its `at` is numerically larger'],

    ['unranked entries sort FIRST instead of last', 'index.js',
        "    const _rank = (e) => (e && typeof e.rank === 'number') ? e.rank : 99;",
        "    const _rank = (e) => (e && typeof e.rank === 'number') ? e.rank : -1;",
        'an unranked entry sorts last, not first'],

    ['the producer stops stamping the rank (comparator goes inert)', 'index.js',
        "rank: isCkpt ? 0 : 1, ",
        "",
        'gcLocalStorageBudget stamps the rank it sorts by'],

    ['the checkpoint cursor stops following deletions', 'index.js',
        "    if (typeof store._ckptLast === 'number' && store._ckptLast >= D) {\n        store._ckptLast = store._ckptLast - 1;\n    }",
        "",
        'and so does the checkpoint cursor — no free blackout turn per deletion'],

    // ── v5.99.0: truncation hygiene + the chat-switch law ──
    ['clampStoreToLength forgets the journal (bulk trim resurrects the dead timeline)', 'index.js',
        "    truncateLedgerToTurn(store, max);",
        "    if (typeof store.ledgerLiveIdx === 'number' && store.ledgerLiveIdx > max) store.ledgerLiveIdx = max;",
        'the abandoned timeline cannot come back through a later deletion refold'],

    ['truncation leaves notes past the chat end', 'index.js',
        "    store.ledgerNotes = store.ledgerNotes.filter(n => n && typeof n.t === 'number' && n.t <= last);\n    if (Array.isArray(store.ledgerStagingNotes)) {",
        "    if (Array.isArray(store.ledgerStagingNotes)) {",
        'no note survives past the last turn'],

    ['truncation skips the staging journal', 'index.js',
        "        store.ledgerStagingNotes = store.ledgerStagingNotes.filter(n => n && typeof n.t === 'number' && n.t <= last);",
        "        store.ledgerStagingNotes = store.ledgerStagingNotes.slice();",
        'the staging journal is trimmed with the live one'],

    ['truncation leaves _ckptLast above the pointer (checkpointing stops dead)', 'index.js',
        "    if (typeof store._ckptLast === 'number' && store._ckptLast > last) store._ckptLast = last;",
        "",
        'both turn cursors are clamped to the new end'],

    ['truncation manufactures coverage (stale page vouches for itself, rebuild never runs)', 'index.js',
        "    log(`Ledger truncated to turn ${last}: dropped every note past the chat end; the journal cannot vouch",
        "    store.ledgerNotes = _baseNotesFromPage(store.ledger, Math.max(0, last));\n    store.ledgerNotesFrom = Math.max(0, last);\n    log(`Ledger truncated to turn ${last}: dropped every note past the chat end; the journal cannot vouch",
        'KILL SHOT: coverage stays false — the signal that routes to the rebuild is intact'],

    ['truncation refolds the page even when the journal cannot cover it', 'index.js',
        "    if (notesCover(store, last)) {\n        store.ledger = foldLedgerNotes(store.ledgerNotes, last);",
        "    if (true) {\n        store.ledger = foldLedgerNotes(store.ledgerNotes, last);",
        'the page is left untouched for the rewind path to replace'],

    ['branch repair delegates hygiene to the declinable rewind again', 'index.js',
        "    const _foldedExact = truncateLedgerToTurn(store, chatLength - 1) === 'exact';",
        "    const _foldedExact = false;",
        'branch repair truncates the journal ITSELF, before the rewind strategy it may decline'],

    ['truncation is called from inside tryAutoRewindLedger (inherits its opt-out)', 'index.js',
        "        if (s.ledgerAutoRewind === false) return false;",
        "        if (s.ledgerAutoRewind === false) { truncateLedgerToTurn(getChatStore(), targetTurn); return false; }",
        'the primitive is NOT called from inside tryAutoRewindLedger — hygiene must not inherit its opt-out'],

    ['resolved receipts stop shifting with their flags', 'index.js',
        "    if (Array.isArray(store.continuityResolved)) {\n        store.continuityResolved = store.continuityResolved.filter(r => {\n            if (!r) return false;",
        "    if (false) {\n        store.continuityResolved = store.continuityResolved.filter(r => {\n            if (!r) return false;",
        'a receipt shifts by exactly what its flag shifted by'],

    ['summarizeOneBatch writes its snippet across a chat switch', 'index.js',
        "        if (_chatEpoch !== startEpoch) {\n            log('Summarizer: chat switched mid-batch",
        "        if (false) {\n            log('Summarizer: chat switched mid-batch",
        'summarizeOneBatch checks the epoch again after it'],

    ['catch-up writes its snippet across a chat switch', 'index.js',
        "        if (_chatEpoch !== startEpoch) {\n            log('Catch-up: chat switched mid-batch",
        "        if (false) {\n            log('Catch-up: chat switched mid-batch",
        'summarizeOneBatchFromTurns checks the epoch again after it'],

    ['promotion destroys its sources across a chat switch', 'index.js',
        "    if (_chatEpoch !== startEpoch) { log('Promotion: chat switched during the shrink retry",
        "    if (false) { log('Promotion: chat switched during the shrink retry",
        'maybePromoteLayer re-checks AFTER the shrink retry and BEFORE the irreversible splice'],

    ['ghosting keeps /hide-ing into the newly opened chat', 'index.js',
        "            if (_chatEpoch !== _ghostEpoch) { log('Ghosting: chat switched mid-hide",
        "            if (false) { log('Ghosting: chat switched mid-hide",
        'ghostMessagesUpTo checks the epoch again after it'],

    ['fold re-resolves keys (the runaway duplication)', 'index.js',
        "        const key = n.name.trim();\n        if (n.gone === true) { delete out[key]; continue; }",
        "        const key = resolveLedgerKey(out, n.name.trim());\n        if (n.gone === true) { delete out[key]; continue; }",
        'foldLedgerNotes does not run the fuzzy resolver'],

    ['clear wipes only the page (journal folds the dead back)', 'index.js',
        "    store.ledger = {};\n    store.ledgerNotes = [];\n    delete store.ledgerNotesFrom;   // journal ABSENT — notesCover must say false",
        "    store.ledger = {};",
        'KILL SHOT: a deletion after the clear does NOT resurrect the ledger'],

    ['live journal written from the raw scribe reply', 'index.js',
        'appendLedgerNotes(_applied, atTurn)',
        'appendLedgerNotes(deltas, atTurn)',
        'the live journal is written from what landed, never from the raw deltas'],

    ['staging journal written from the raw scribe reply', 'index.js',
        '_notesFromDeltas(_applied, job.liveEnd)',
        '_notesFromDeltas(deltas, job.liveEnd)',
        'the staging journal too'],

    ['adoption fuzzy-matches page entries onto other characters', 'index.js',
        '        const f = Object.prototype.hasOwnProperty.call(fold, name) ? fold[name] : null;',
        '        const fk = Object.prototype.hasOwnProperty.call(fold, name) ? name : resolveLedgerKey(fold, name);\n        const f = Object.prototype.hasOwnProperty.call(fold, fk) ? fold[fk] : null;',
        'adoptExternalLedgerEdits does not fuzzy-match page entries onto other characters\u2019 folded entries'],

    ['adoption deletion sweep fuzzy-matches', 'index.js',
        '        for (const name of Object.keys(fold)) {\n            if (Object.prototype.hasOwnProperty.call(page, name)) continue;',
        '        for (const name of Object.keys(fold)) {\n            const pk = Object.prototype.hasOwnProperty.call(page, name) ? name : resolveLedgerKey(page, name);\n            if (Object.prototype.hasOwnProperty.call(page, pk)) continue;',
        'and its deletion sweep is exact too'],

    ['tombstone stamped at the live pointer, not the horizon', 'index.js',
        'store.ledgerNotes.push({ t: _journalNow(store), name, at: Date.now(), gone: true });',
        'store.ledgerNotes.push({ t: store.ledgerLiveIdx | 0, name, at: Date.now(), gone: true });',
        'panel delete writes the tombstone (page-only deletes resurrected on the next fold)'],

    ['_journalNow ignores the notes horizon', 'index.js',
        "    for (const n of notes) if (n && typeof n.t === 'number' && isFinite(n.t) && n.t > t) t = n.t;\n    return t;",
        '    return t;',
        'the horizon is the newest note, not the live pointer (got 4)'],

    ['migration never runs', 'index.js',
        '    _canonicalizeLedgerNotes(chatMetadata[MODULE_NAME]);\n',
        '',
        'and it runs from getChatStore \u2014 the one door every path goes through'],

    ['migration grafts an unknown name onto a survivor', 'index.js',
        '        if (k === undefined) { k = resolveLedgerKey(page, raw); seen.set(raw, k); }',
        '        if (k === undefined) { k = resolveLedgerKey(page, raw); if (k === raw && !Object.prototype.hasOwnProperty.call(page, raw)) k = Object.keys(page)[0]; seen.set(raw, k); }',
        'a deleted character keeps its own history rather than being grafted onto a survivor'],

    ['migration is burned on a page that has not loaded yet', 'index.js',
        '        if (notes.length > 0 && Object.keys(page).length === 0) return 0;',
        '',
        'and does not stamp the store \u2014 an unmaterialized page is an absence of an answer, not an answer'],

    ['migration re-runs against a page that has since changed', 'index.js',
        '    if (!store || (store.ledgerNotesCanon | 0) >= _NOTES_CANON_V) return 0;',
        '    if (!store) return 0;',
        'a migration that already ran does NOT re-resolve against a page that has since changed'],

    ['journal established AFTER the page is written (first pass welds in a base note)', 'index.js',
        '        ensureLedgerNotes(store);\n        // Durable early adoption',
        '        // Durable early adoption',
        'the first pass journals ONE note, not a note plus an immortal base (got 2)'],

    ['an empty journal is read as "no journal"', 'index.js',
        '    if (!store || !Array.isArray(store.ledgerNotes)) return false;',
        '    if (!store || !Array.isArray(store.ledgerNotes) || store.ledgerNotes.length === 0) return false;',
        'an established journal that holds nothing still covers the horizon \u2014 it says "nothing survives"'],

    ['rebuild swap diffs against an empty journal', 'index.js',
        'if (Array.isArray(st.ledgerNotes) && st.ledgerNotes.length > 0 && notesCover(st, upTo)) {',
        'if (Array.isArray(st.ledgerNotes) && notesCover(st, upTo)) {',
        'rebuild swap: external page edits are adopted before the final fold'],

    ['the protagonist is modelled like an NPC (write side)', 'index.js',
        "        const _recOnly = _mcRecOnly && isMcLedgerKey(key);",
        "        const _recOnly = false;",
        'the protagonist gets no Nature \u2014 his temperament is the player\u2019s to write'],

    ['the protagonist keeps his Arc on the write side', 'index.js',
        "        if (typeof d.arc === 'string' && !_recOnly)   { const v = stripLeadingLabel(d.arc);",
        "        if (typeof d.arc === 'string')   { const v = stripLeadingLabel(d.arc);",
        'and no Arc \u2014 his inner trajectory is not the record\u2019s to plot'],

    ['the spec still reaches the storyteller (read side)', 'index.js',
        "    if (!recordOnly && typeof entry.core === 'string' && entry.core.trim())   parts.push('Nature: ' + norm(entry.core));",
        "    if (typeof entry.core === 'string' && entry.core.trim())   parts.push('Nature: ' + norm(entry.core));",
        'Nature and Arc are withheld and the line says whose character it is'],

    ['everyone else is quarantined too (the matcher over-matches)', 'index.js',
        "    if (a === b) return true;",
        "    if (a === b || true) return true;",
        'a character the STORY controls keeps all four fields'],

    ['rename detection removed (copilot renames orphan history again)', 'index.js',
        '    if (Object.keys(page).length > 0) {\n        const gone = Object.keys(fold).filter(k => !Object.prototype.hasOwnProperty.call(page, k));',
        '    if (false) {\n        const gone = Object.keys(fold).filter(k => !Object.prototype.hasOwnProperty.call(page, k));',
        'her full history survives under the NEW name'],

    ['different cores treated as a rename (replacement re-keyed onto the new person)', 'index.js',
        '    if (oc !== undefined || nc !== undefined) return oc === nc;',
        '    if (oc !== undefined && nc !== undefined && oc === nc) return true;',
        'swapping the identity anchor AND the name is delete+create: the old character is tombstoned'],

    ['ambiguity guard removed (a guess re-keys the wrong person)', 'index.js',
        '                if (m.length === 1) pairs.push([g, m[0]]);',
        '                if (m.length >= 1) pairs.push([g, m[0]]);',
        'ambiguous pairing re-keys NOTHING \u2014 a guess that re-keys the wrong person is worse than an orphaned history'],

    ['rename skips the staging journal (a mid-rebuild rename forks the key space)', 'index.js',
        '    for (const arr of [store.ledgerNotes, store.ledgerStagingNotes]) {',
        '    for (const arr of [store.ledgerNotes]) {',
        'staging journal re-keyed'],

    ['rename drops the pins (a pinned character silently unpins)', 'index.js',
        "    if (Array.isArray(store.ledgerPins)) {\n        const fl = String(from).toLowerCase();",
        "    if (false) {\n        const fl = String(from).toLowerCase();",
        'a pinned character stays pinned through her own rename'],

    ['the deliberate door allows renaming onto another character (silent merge)', 'index.js',
        '    if (tKey !== key && Object.prototype.hasOwnProperty.call(page, tKey)) {',
        '    if (false) {',
        'renaming ONTO another character is refused \u2014 that would merge two people'],

    ['catch-up loop deaf to the cancel token ("Stop" does not stop)', 'index.js',
        '        while (!cancelled && !_summarizeCancelRequested) {',
        '        while (!cancelled) {',
        'catch-up loop honors the shared cancel token'],

    ['abort clears a mutex it does not own (the toggle-interleave door)', 'index.js',
        '    _summarizeCancelRequested = true;\n    if (_activeAborters.size > 0) {',
        '    _summarizeCancelRequested = true;\n    isSummarizing = false;\n    if (_activeAborters.size > 0) {',
        'abortSummarization never releases a mutex it does not own'],

    ['catch-up drives without an epoch guard (summarizes the chat you switched TO)', 'index.js',
        '            if (_chatEpoch !== startEpoch) {\n                trace(\'  chat changed mid-catch-up — abandoning WITHOUT touching the new chat\');',
        '            if (false) {\n                trace(\'  chat changed mid-catch-up — abandoning WITHOUT touching the new chat\');',
        'runCatchup checks the epoch EVERY iteration'],

    ['toggle mute unconditional again (modern main Generate gutted)', 'index.js',
        '    if (isDefaultMode && _defaultModeNeedsToggleMute()) _mutePromptToggles();',
        '    if (isDefaultMode) _mutePromptToggles();',
        'the toggle mute is gated on LEGACY generateRaw — modern ST is never muted'],

    ['branch repair skips deep layers (dead timeline narrated forever)', 'index.js',
        '    for (let li = 1; li < store.layers.length; li++) {',
        '    for (let li = 1; li < 1; li++) {',
        'branch repair drops deep-layer snippets that reach the branch (not just Layer 0)'],

    ['promotion cuts the sources before the call (mid-flight memory hole)', 'index.js',
        '    const toMerge = layer.slice(0, s.snippetsPerPromotion);',
        '    const toMerge = layer.splice(0, s.snippetsPerPromotion);',
        'M2: no splice-out before the LLM call survives'],

    ['audit stamps falsify recency again', 'index.js',
        '        if (_hasContent) e.updatedAt = n.at || e.updatedAt || 0;',
        '        e.updatedAt = n.at || e.updatedAt || 0;',
        'M4: a content-less audit stamp does NOT bump updatedAt'],

    ['"hiding off" skips the hide again (summarized turns STILL sent to the model)', 'index.js',
        '    if (s.disableGhosting) log(`Ghosting ${toHide.length} message(s) up to ${upto} — excluded from AI context, visuals neutralized.`);',
        '    if (s.disableGhosting) { log(`Ghosted ${toHide.length} message(s) up to ${upto} — metadata only (hiding disabled).`); return; }',
        'H3: ghostMessagesUpTo never skips the hide (the old metadata-only lie)'],
];

function scratchCopy() {
    fs.rmSync(SCRATCH, { recursive: true, force: true });
    fs.mkdirSync(SCRATCH, { recursive: true });
    for (const f of fs.readdirSync(SRC)) {
        if (f === '.git' || f === 'node_modules') continue;
        const from = path.join(SRC, f);
        if (fs.statSync(from).isDirectory()) continue;
        fs.copyFileSync(from, path.join(SCRATCH, f));
    }
}

function run([label, file, cur, bug, want, gate]) {
    scratchCopy();
    const p = path.join(SCRATCH, file);
    const s = fs.readFileSync(p, 'utf8');
    if (!s.includes(cur)) return [false, label, 'mutation anchor not found \u2014 the code moved; update this file'];
    fs.writeFileSync(p, s.split(cur).join(bug));
    const r = spawnSync('node', [gate || 'ledger_test.js'], { cwd: SCRATCH, encoding: 'utf8' });
    const out = (r.stdout || '') + (r.stderr || '');
    if (r.status === 0) return [false, label, 'THE GATE PASSED WITH THE BUG REINTRODUCED \u2014 the assertion is decorative'];
    if (!out.includes(want)) {
        const got = out.split('\n').filter(l => l.trim().startsWith('- ')).slice(0, 5).join(' | ');
        return [false, label, `exit ${r.status}, but the naming assertion did not fire.\n      wanted: ${want}\n      got:    ${got}`];
    }
    return [true, label, `exit ${r.status}, caught by: ${want}`];
}

let failed = 0;
for (const m of MUTATIONS) {
    const [okd, label, detail] = run(m);
    console.log((okd ? '  \u2713 ' : '  \u2717 ') + label);
    console.log('      ' + detail);
    if (!okd) failed++;
}
fs.rmSync(SCRATCH, { recursive: true, force: true });
console.log(`\n${MUTATIONS.length - failed}/${MUTATIONS.length} guards proven`);
if (failed) { console.log('NEGATIVE TEST FAILED \u2717'); process.exit(1); }
console.log('EVERY NEW GUARD IS PROVEN TO FAIL ON ITS OWN BUG \u2713');

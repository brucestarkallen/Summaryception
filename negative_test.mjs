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

/** [label, file, currentText, bugText, assertionThatMustFail] */
const MUTATIONS = [
    ['fold re-resolves keys (the runaway duplication)', 'index.js',
        "        const key = n.name.trim();\n        if (n.gone === true) { delete out[key]; continue; }",
        "        const key = resolveLedgerKey(out, n.name.trim());\n        if (n.gone === true) { delete out[key]; continue; }",
        'foldLedgerNotes does not run the fuzzy resolver'],

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

function run([label, file, cur, bug, want]) {
    scratchCopy();
    const p = path.join(SCRATCH, file);
    const s = fs.readFileSync(p, 'utf8');
    if (!s.includes(cur)) return [false, label, 'mutation anchor not found \u2014 the code moved; update this file'];
    fs.writeFileSync(p, s.split(cur).join(bug));
    const r = spawnSync('node', ['ledger_test.js'], { cwd: SCRATCH, encoding: 'utf8' });
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

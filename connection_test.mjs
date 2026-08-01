// CONNECTION GATE — the transport layer had no tests at all.
//
// connectionutil.js is where the model's words enter this extension. Everything
// downstream — snippets, ledger, details, continuity — is built out of whatever
// this file returns, so a parser that quietly drops the tail of a stream, or
// mistakes a working provider for a broken one, corrupts memory in a way no
// other gate can see. It is also the one file no gate touched.
//
//   node connection_test.mjs
//
// Drives the REAL sendSummarizerRequest against a scripted fetch: no network.

import { sendSummarizerRequest } from './connectionutil.js';

let pass = 0, fail = 0;
const fails = [];
function ok(cond, label) { if (cond) { pass++; console.log('  \u2713 ' + label); } else { fail++; fails.push(label); console.log('  \u2717 ' + label); } }
function eq(a, b, label) { ok(a === b, label + (a === b ? '' : ` \u2014 got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`)); }
// A throw here is a FAILURE with a name, not a stack trace that kills the run:
// negative_test.mjs matches failures by name, so a crash proves nothing.
async function eqAwait(fn, want, label) {
    let got;
    try { got = await fn(); }
    catch (e) { ok(false, label + ' \u2014 threw: ' + (e && e.message)); return; }
    eq(got, want, label);
}
function section(t) { console.log('\n== ' + t + ' ==\n'); }

// ── a scripted response body ────────────────────────────────────────────────
const enc = new TextEncoder();
function streamOf(chunks) {
    let i = 0;
    return {
        getReader() {
            return {
                async read() {
                    if (i >= chunks.length) return { done: true, value: undefined };
                    return { done: false, value: enc.encode(chunks[i++]) };
                },
                releaseLock() {},
            };
        },
    };
}
function bytesOf(chunks) {   // raw byte chunks, for the split-character case
    let i = 0;
    return {
        getReader() {
            return {
                async read() {
                    if (i >= chunks.length) return { done: true, value: undefined };
                    return { done: false, value: chunks[i++] };
                },
                releaseLock() {},
            };
        },
    };
}

let lastInit = null;
function mockFetch(body, { ok: okFlag = true, status = 200, text = '' } = {}) {
    globalThis.fetch = async (url, init) => {
        lastInit = init;
        return { ok: okFlag, status, body, text: async () => text };
    };
}

globalThis.SillyTavern = { getContext: () => ({}) };

const SETTINGS = {
    connectionSource: 'openai',
    openaiUrl: 'https://example.invalid/v1',
    openaiKey: 'k',
    openaiModel: 'm',
    openaiMaxTokens: 0,
};
const send = () => sendSummarizerRequest(SETTINGS, 'sys', 'user');

// ─────────────────────────────────────────────────────────────────────────────
section('SSE: the ordinary case still works');
{
    mockFetch(streamOf([
        'data: {"choices":[{"delta":{"content":"Jovan "}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"drew the blade."}}]}\n\n',
        'data: [DONE]\n\n',
    ]));
    await eqAwait(() => send(), 'Jovan drew the blade.', 'deltas are concatenated in order');
}

section('SSE: the TAIL is not silently dropped');
{
    // No trailing newline on the final event. lines.pop() holds the last element
    // back unconditionally, so this line used to sit in `buffer` forever and the
    // last words of every such response were lost with no error anywhere.
    mockFetch(streamOf([
        'data: {"choices":[{"delta":{"content":"the vault "}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"was already open"}}]}',
    ]));
    await eqAwait(() => send(), 'the vault was already open', 'a final event with no trailing newline still lands');
}
{
    // {stream:true} is what makes this work: without it each decode() call
    // emits U+FFFD for the partial bytes and the text is corrupted on both sides
    // of the boundary. This pins that the streaming flag is actually used.
    const full = enc.encode('data: {"choices":[{"delta":{"content":"caf\u00e9 \u2014 closed"}}]}\n\n');
    // Cut INSIDE the em-dash's three bytes. Cutting at an arbitrary offset lands
    // in ASCII and exercises nothing — the first version of this test did exactly
    // that and passed with the flush deleted.
    const em = enc.encode('\u2014');
    let cut = -1;
    for (let i = 0; i + 2 < full.length; i++) {
        if (full[i] === em[0] && full[i + 1] === em[1] && full[i + 2] === em[2]) { cut = i + 1; break; }
    }
    if (cut < 0) throw new Error('test setup: could not find the multi-byte character to split');
    mockFetch(bytesOf([full.slice(0, cut), full.slice(cut)]));
    await eqAwait(() => send(), 'caf\u00e9 \u2014 closed', 'a multi-byte character split across a chunk boundary is reassembled');
}
{
    // Both at once: split character AND no trailing newline.
    const full = enc.encode('data: {"choices":[{"delta":{"content":"\u00e9\u00e9\u00e9 end"}}]}');
    const acc = enc.encode('\u00e9');
    let cut = -1;
    for (let i = 0; i + 1 < full.length; i++) {
        if (full[i] === acc[0] && full[i + 1] === acc[1]) { cut = i + 1; break; }
    }
    if (cut < 0) throw new Error('test setup: could not find the multi-byte character to split');
    mockFetch(bytesOf([full.slice(0, cut), full.slice(cut)]));
    await eqAwait(() => send(), '\u00e9\u00e9\u00e9 end', 'a split character AND a missing trailing newline together');
}

section('a provider that ignores stream:true is understood, not misdiagnosed');
{
    // This used to raise "empty response (streaming)" — RETRYABLE, so it burned
    // every retry and then failed the batch with a message pointing nowhere near
    // the cause. A perfectly working endpoint looked permanently broken.
    mockFetch(streamOf(['{"choices":[{"message":{"content":"a plain completion"}}]}']));
    await eqAwait(() => send(), 'a plain completion', 'a non-streamed chat completion is read');
}
{
    mockFetch(streamOf(['{"choices":[{"text":"legacy completion shape"}]}']));
    await eqAwait(() => send(), 'legacy completion shape', 'the legacy `text` shape is read too');
}
{
    globalThis.fetch = async () => ({ ok: true, status: 200, body: null, text: async () => '{"choices":[{"message":{"content":"buffered by a proxy"}}]}' });
    await eqAwait(() => send(), 'buffered by a proxy', 'a body with no stream at all falls back to the whole text');
}

section('reasoning models: content wins, reasoning is the safety net');
{
    mockFetch(streamOf([
        'data: {"choices":[{"delta":{"reasoning_content":"let me think..."}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"the answer"}}]}\n\n',
    ]));
    await eqAwait(() => send(), 'the answer', 'reasoning never pollutes a reply that has real content');
}
{
    mockFetch(streamOf(['data: {"choices":[{"delta":{"reasoning_content":"only scratchpad"}}]}\n\n']));
    await eqAwait(() => send(), 'only scratchpad', 'reasoning-only is returned rather than failing the batch');
}

section('genuine failures still fail');
{
    mockFetch(streamOf(['data: {"choices":[{"delta":{}}]}\n\n', 'data: [DONE]\n\n']));
    let threw = null;
    try { await send(); } catch (e) { threw = e; }
    ok(threw && /empty response/i.test(threw.message), 'a truly empty SSE stream still throws');
    ok(threw && threw.retryable === true, 'and is classified retryable');
}
{
    mockFetch(streamOf(['not json, not sse, just noise']));
    let threw = null;
    try { await send(); } catch (e) { threw = e; }
    ok(threw !== null, 'a body that is neither SSE nor a completion still throws');
}
{
    mockFetch(null, { ok: false, status: 401, text: 'bad key' });
    let threw = null;
    try { await send(); } catch (e) { threw = e; }
    ok(threw && threw.status === 401, '401 surfaces as 401');
    ok(threw && threw.retryable === false, 'and is NOT retried — a bad key never fixes itself');
}
{
    mockFetch(null, { ok: false, status: 500, text: 'boom' });
    let threw = null;
    try { await send(); } catch (e) { threw = e; }
    ok(threw && threw.retryable === true, '500 IS retried');
}
{
    mockFetch(null, { ok: false, status: 429, text: 'slow down' });
    let threw = null;
    try { await send(); } catch (e) { threw = e; }
    ok(threw && threw.retryable === true, '429 IS retried');
}

section('abort is an abort, not a CORS problem');
{
    // The proxied path used to catch the AbortError, log "CORS proxy failed",
    // fire a SECOND request that could only reject, and rethrow the user's own
    // Stop as a retryable connection error blaming their config.yaml.
    const local = { ...SETTINGS, openaiUrl: 'http://127.0.0.1:5001/v1' };
    const ac = new AbortController();
    let calls = 0;
    globalThis.fetch = async () => {
        calls++;
        const e = new Error('The operation was aborted.');
        e.name = 'AbortError';
        throw e;
    };
    ac.abort();
    let threw = null;
    try { await sendSummarizerRequest(local, 'sys', 'user', { signal: ac.signal }); } catch (e) { threw = e; }
    eq(calls, 1, 'an aborted proxied request is NOT retried directly (was 2 requests)');
    ok(threw && threw.name === 'AbortError', 'and the AbortError reaches the caller intact');
    ok(!(threw && threw.retryable === true), 'it is never dressed up as a retryable connection error');
}

section('the request itself');
{
    mockFetch(streamOf(['data: {"choices":[{"delta":{"content":"x"}}]}\n\n']));
    await send();
    const b = JSON.parse(lastInit.body);
    eq(b.messages.length, 2, 'system + user, as two messages');
    eq(b.messages[0].role, 'system', 'system first');
    eq(b.messages[1].content, 'user', 'user prompt carried verbatim');
    ok(!('max_tokens' in b), 'max_tokens omitted when unset (never caps the provider by accident)');
    eq(lastInit.headers.Authorization, 'Bearer k', 'the key is sent');
}
{
    mockFetch(streamOf(['data: {"choices":[{"delta":{"content":"x"}}]}\n\n']));
    await sendSummarizerRequest({ ...SETTINGS, openaiMaxTokens: 512 }, 'sys', 'user');
    eq(JSON.parse(lastInit.body).max_tokens, 512, 'max_tokens sent when set');
}

console.log('\n────────────────────────────────────────');
console.log(`RESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.log('\nFAILURES:'); fails.forEach(f => console.log('  - ' + f)); process.exit(1); }
console.log('CONNECTION LAYER OK \u2713');

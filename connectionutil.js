/**
 * Summaryception Connection Utility
 *
 * Routes summarization requests through one of four backends:
 *   - default:  SillyTavern's generateRaw() (active connection)
 *   - profile:  ST Connection Profile via ConnectionManagerRequestService
 *   - ollama:   Ollama instance (via ST CORS proxy to avoid browser CORS issues)
 *   - openai:   OpenAI-compatible endpoint (via ST CORS proxy, streaming supported)
 *
 * CORS Note: Ollama and OpenAI modes route through ST's /proxy/ endpoint
 * (proxiedUrl below) to avoid browser CORS restrictions. Requires
 * enableCorsProxy: true in config.yaml OR the target server must have
 * permissive CORS headers.
 *
 * AGPL-3.0
 */

const MODULE_NAME = '[Summaryception][Connection]';

// ─── Custom Error Class ──────────────────────────────────────────────

/**
 * Error class for connection errors with explicit retryable flag.
 * The retry logic in callSummarizer checks for this to avoid
 * burning through retries on errors that will never succeed
 * (e.g. missing config, auth failures, deleted profiles).
 */
class ConnectionError extends Error {
    constructor(message, { retryable = false, status = null } = {}) {
        super(message);
        this.name = 'ConnectionError';
        this.retryable = retryable;
        this.status = status;
    }
}

export { ConnectionError };

// ─── CORS Proxy Helper ───────────────────────────────────────────────

/**
 * Wrap a URL through SillyTavern's CORS proxy if needed.
 * @param {string} url - The target URL
 * @param {boolean} useProxy - Whether to attempt proxying
 * @returns {string} - The (possibly proxied) URL
 */
// An AbortError arrives with name 'AbortError' in browsers and as a DOMException
// elsewhere; some polyfills only set the signal. Ask both.
function _isAbort(err, signal) {
    if (signal && signal.aborted) return true;
    const n = err && (err.name || '');
    return n === 'AbortError' || /\baborted?\b/i.test(String((err && err.message) || ''));
}

function proxiedUrl(url, useProxy = true) {
    if (!useProxy) return url;
    return `/proxy/${url}`;
}

/**
 * Get standard request headers including ST's CSRF token if available.
 * Required when routing through ST's /proxy/ endpoint.
 * @returns {object}
 */
function getProxyHeaders() {
    try {
        const ctx = SillyTavern.getContext();
        if (typeof ctx.getRequestHeaders === 'function') {
            return ctx.getRequestHeaders();
        }
    } catch (e) { /* fallback */ }
    return { 'Content-Type': 'application/json' };
}

// ─── Main Entry Point ────────────────────────────────────────────────

/**
 * Send a summarization request using the configured connection.
 * @param {object} settings - The extension settings containing connection config
 * @param {string} systemPrompt - The system prompt
 * @param {string} userPrompt - The user prompt
 * @returns {Promise<string>} - The generated response text
 * @throws {ConnectionError|Error} - If the request fails
 */
export async function sendSummarizerRequest(settings, systemPrompt, userPrompt, { signal } = {}) {
    const source = settings.connectionSource || 'default';
    // null = mode default (0.3 Ollama / 0.8 OpenAI-compatible); a number overrides
    const tempOverride = (typeof settings.summarizerTemperature === 'number') ? settings.summarizerTemperature : null;

    switch (source) {
        case 'profile':
            return await sendViaProfile(settings.connectionProfileId, systemPrompt, userPrompt, settings.debugMode);
        case 'ollama':
            return await sendViaOllama(settings.ollamaUrl, settings.ollamaModel, systemPrompt, userPrompt, tempOverride, signal);
        case 'openai':
            return await sendViaOpenAI(settings.openaiUrl, settings.openaiKey, settings.openaiModel, systemPrompt, userPrompt, settings.openaiMaxTokens, tempOverride, signal);
        case 'default':
        default:
            return await sendViaDefault(systemPrompt, userPrompt, settings.summarizerResponseLength);
    }
}

// ─── Mode 1: Default (generateRaw) ──────────────────────────────────

/**
 * Uses ST's built-in generateRaw(), which routes through the active connection.
 */
async function sendViaDefault(systemPrompt, userPrompt, responseLength) {
    const { generateRaw } = SillyTavern.getContext();

    if (!generateRaw) {
        throw new ConnectionError(
            'generateRaw is not available in the current SillyTavern context.',
            { retryable: false }
        );
    }

    // ST refactored generateRaw from positional args to an object param
    // in PR #4277 (July 2025). We need to support both signatures.
    //
    // New (July 2025+): generateRaw({ prompt, systemPrompt, responseLength })
    // Old (pre-July 2025): generateRaw(prompt, systemPrompt)
    //
    // Detection: the new signature destructures an object, so if we check
    // the function's length (expected positional params), 0 or 1 means
    // object-style, 2+ means positional-style.

    let result;

    if (generateRaw.length <= 1) {
        // Modern ST: object-based params
        const options = {
            systemPrompt: systemPrompt,
            prompt: userPrompt,
        };

        if (responseLength && responseLength > 0) {
            options.responseLength = responseLength;
        }

        result = await generateRaw(options);
    } else {
        // Legacy ST: positional args — generateRaw(prompt, systemPrompt)
        // Note: legacy signature does not support responseLength override
        console.warn(
            '[Summaryception] Detected legacy generateRaw (positional args). ' +
            'Consider updating SillyTavern to July 2025+ for full feature support.'
        );
        result = await generateRaw(userPrompt, systemPrompt);
    }

    if (!result || typeof result !== 'string') {
        throw new ConnectionError(
            'generateRaw returned an empty or invalid response.',
            { retryable: true }
        );
    }

    return result;
}

// ─── Mode 2: Connection Profile ──────────────────────────────────────

/**
 * Uses ST's ConnectionManagerRequestService to send a request via a saved profile.
 * Requires SillyTavern with PR #3603 merged (March 2025+).
 * Full API key support requires staging with Issue #5348 fix (March 30, 2026+).
 *
 * IMPORTANT: sendRequest() expects messages as an array of {role, content} objects,
 * NOT as a generateRaw()-style options object. Passing {systemPrompt, prompt} as
 * the second argument causes the entire object to be stuffed into the message
 * content field, resulting in "Invalid input" / validation errors from the API.
 */
async function sendViaProfile(profileId, systemPrompt, userPrompt, debug) {
    if (!profileId) {
        throw new ConnectionError(
            'No Connection Profile selected. Please select one in Summaryception settings.',
            { retryable: false }
        );
    }

    const context = SillyTavern.getContext();
    const service = context.ConnectionManagerRequestService;

    if (!service) {
        throw new ConnectionError(
            'ConnectionManagerRequestService is not available. ' +
            'Your SillyTavern version may be too old. Requires ST with PR #3603 (March 2025+).',
                                  { retryable: false }
        );
    }

    if (typeof service.sendRequest !== 'function') {
        throw new ConnectionError(
            'ConnectionManagerRequestService.sendRequest() is not available. ' +
            'Please update SillyTavern to the latest staging version.',
            { retryable: false }
        );
    }

    try {
        // Build messages as proper {role, content} objects.
        // sendRequest expects: sendRequest(profileId, messages, options?)
        // where messages is a string OR an array of {role, content} objects.
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ];

        const raw = await service.sendRequest(profileId, messages, {
            ignoreInstruct: true,
        });

        // Debug: log what we actually got back (gated — this dumped the ENTIRE model response to console on every single profile call)
        if (debug) console.log('[Summaryception][Connection] Profile sendRequest returned:', typeof raw, raw);

        // Handle various possible return types
        let result;
        if (typeof raw === 'string') {
            result = raw;
        } else if (raw?.content) {
            result = raw.content;
        } else if (raw?.message?.content) {
            result = raw.message.content;
        } else if (raw?.choices?.[0]?.message?.content) {
            result = raw.choices[0].message.content;
        } else if (raw?.data) {
            result = typeof raw.data === 'string' ? raw.data : JSON.stringify(raw.data);
        } else if (raw && typeof raw === 'object') {
            const str = JSON.stringify(raw);
            console.warn('[Summaryception][Connection] Unexpected return type from sendRequest:', str.substring(0, 500));
            throw new ConnectionError(
                `Connection Profile returned unexpected type: ${typeof raw}. ` +
                `Preview: ${str.substring(0, 200)}. ` +
                `Please report this on the Summaryception GitHub.`,
                { retryable: false }
            );
        } else {
            throw new ConnectionError(
                'Connection Profile returned an empty or invalid response.',
                { retryable: true }
            );
        }

        if (!result || !result.trim()) {
            throw new ConnectionError(
                'Connection Profile returned an empty response.',
                { retryable: true }
            );
        }

        return result;

    } catch (error) {
        if (error instanceof ConnectionError) throw error;

        const msg = error?.message || String(error);
        const status = error?.status || error?.response?.status;

        if (status === 401 || msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
            throw new ConnectionError(
                `Connection Profile auth failed (401). This is likely the API key switching bug ` +
                `(ST Issue #5348). Update SillyTavern to staging (March 30, 2026+) to fix this. ` +
                `Original error: ${msg}`,
                { retryable: false, status: 401 }
            );
        }

        if (msg.includes('not found') || msg.includes('profile')) {
            throw new ConnectionError(
                `Connection Profile "${profileId}" not found. It may have been deleted. ` +
                `Please re-select a profile in Summaryception settings.`,
                { retryable: false, status: 404 }
            );
        }

        throw new ConnectionError(
            `Connection Profile request failed: ${msg}`,
            { retryable: true, status: status }
        );
    }
}

// ─── Mode 3: Ollama (Local) ─────────────────────────────────────────

/**
 * Send a request to a local Ollama instance using /api/chat.
 * Routes through ST's CORS proxy to avoid browser CORS restrictions.
 */
async function sendViaOllama(url, model, systemPrompt, userPrompt, temperatureOverride = null, signal = null) {
    const _temperature = (typeof temperatureOverride === 'number') ? temperatureOverride : 0.3;
    if (!url) {
        throw new ConnectionError(
            'Ollama URL is not configured. Please set it in Summaryception settings.',
            { retryable: false }
        );
    }
    if (!model) {
        throw new ConnectionError(
            'Ollama model is not selected. Please select one in Summaryception settings.',
            { retryable: false }
        );
    }

    const baseUrl = url.replace(/\/+$/, '');
    const targetUrl = `${baseUrl}/api/chat`;

    let response;
    try {
        response = await fetch(proxiedUrl(targetUrl), {
            method: 'POST',
            headers: {
                ...getProxyHeaders(),
                               'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                stream: false,
                options: {
                    temperature: _temperature,
                },
            }),
            ...(signal ? { signal } : {}),
        });
    } catch (proxyError) {
        // An abort is not a proxy failure. Retrying it fires a second request that
        // is guaranteed to reject, logs a warning blaming the user's CORS setup,
        // and dresses the user's own Stop as a retryable connection error.
        if (_isAbort(proxyError, signal)) throw proxyError;
        console.warn(`${MODULE_NAME} CORS proxy failed, trying direct:`, proxyError.message);
        try {
            response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    stream: false,
                    options: { temperature: _temperature },
                }),
                ...(signal ? { signal } : {}),
            });
        } catch (directError) {
            throw new ConnectionError(
                `Failed to connect to Ollama at ${baseUrl}. ` +
                `CORS proxy error: ${proxyError.message}. Direct error: ${directError.message}. ` +
                `Make sure enableCorsProxy is set to true in config.yaml, or set OLLAMA_ORIGINS=* on your Ollama instance.`,
                { retryable: true }
            );
        }
    }

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new ConnectionError(
            `Ollama request failed (${response.status}): ${errorText}`,
                                  { retryable: response.status >= 500, status: response.status }
        );
    }

    const data = await response.json();

    if (!data?.message?.content) {
        throw new ConnectionError(
            'Ollama returned an empty or invalid response.',
            { retryable: true }
        );
    }

    return data.message.content;
}

/**
 * Fetch available models from an Ollama instance.
 * @param {string} url - The Ollama base URL
 * @returns {Promise<Array<{name: string, size: number, modified_at: string}>>}
 */
export async function fetchOllamaModels(url) {
    if (!url) {
        throw new Error('Ollama URL is not configured.');
    }

    const baseUrl = url.replace(/\/+$/, '');
    const targetUrl = `${baseUrl}/api/tags`;

    let response;
    try {
        response = await fetch(proxiedUrl(targetUrl), {
            method: 'GET',
            headers: getProxyHeaders(),
        });
    } catch (proxyError) {
        console.warn(`${MODULE_NAME} CORS proxy failed for model list, trying direct:`, proxyError.message);
        try {
            response = await fetch(targetUrl, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (directError) {
            throw new Error(
                `Failed to connect to Ollama at ${baseUrl}. ` +
                `Enable the CORS proxy in config.yaml (enableCorsProxy: true) or set OLLAMA_ORIGINS=* on your Ollama instance. ` +
                `Proxy error: ${proxyError.message}. Direct error: ${directError.message}`
            );
        }
    }

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to fetch Ollama models (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data?.models || !Array.isArray(data.models)) {
        throw new Error('Unexpected response format from Ollama /api/tags.');
    }

    return data.models;
}

// ─── Mode 4: OpenAI Compatible (Streaming) ──────────────────────────

/**
 * Send a request to any OpenAI-compatible endpoint using streaming.
 * Streaming avoids the non-streaming token ceiling (4096 on many providers)
 * and allows reasoning models to complete their full thinking + output.
 *
 * Routes through ST's CORS proxy for local endpoints.
 * Cloud endpoints skip the proxy since they have CORS headers.
 */
// A plain (non-SSE) chat-completion body, from a provider that ignored
// `stream: true`. Returns the text, or '' if this is not one.
function _parseNonStreamed(text) {
    if (!text || typeof text !== 'string') return '';
    try {
        const j = JSON.parse(text);
        const c = j?.choices?.[0];
        const out = c?.message?.content ?? c?.text ?? j?.content;
        if (typeof out === 'string' && out.trim()) return out;
        const r = c?.message?.reasoning_content ?? c?.message?.reasoning;
        if (typeof r === 'string' && r.trim()) return r;
    } catch (_) { /* not JSON — not a completion body */ }
    return '';
}

async function sendViaOpenAI(url, apiKey, model, systemPrompt, userPrompt, maxTokens, temperatureOverride = null, signal = null) {
    if (!url) {
        throw new ConnectionError(
            'OpenAI Compatible URL is not configured. Please set it in Summaryception settings.',
            { retryable: false }
        );
    }
    if (!model) {
        throw new ConnectionError(
            'OpenAI Compatible model name is not set. Please enter one in Summaryception settings.',
            { retryable: false }
        );
    }

    const baseUrl = url.replace(/\/+$/, '');

    // Build the endpoint URL
    let endpoint = baseUrl;
    if (!endpoint.endsWith('/chat/completions')) {
        if (endpoint.endsWith('/v1')) {
            endpoint += '/chat/completions';
        } else if (!endpoint.includes('/chat/completions')) {
            endpoint += '/v1/chat/completions';
        }
    }

    // Decide whether to use CORS proxy
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?/i.test(endpoint);

    const headers = {
        'Content-Type': 'application/json',
    };
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Use maxTokens from settings, default to 0 (no limit / provider default)
    const tokenLimit = maxTokens && maxTokens > 0 ? maxTokens : undefined;

    const requestBody = {
        model: model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        temperature: (typeof temperatureOverride === 'number') ? temperatureOverride : 0.8,
        stream: true,
    };

    // Only include max_tokens if explicitly set
    if (tokenLimit) {
        requestBody.max_tokens = tokenLimit;
    }

    const body = JSON.stringify(requestBody);

    let response;
    if (isLocal) {
        try {
            response = await fetch(proxiedUrl(endpoint), {
                method: 'POST',
                headers: { ...getProxyHeaders(), ...headers },
                                   body: body,
                ...(signal ? { signal } : {}),
            });
        } catch (proxyError) {
            if (_isAbort(proxyError, signal)) throw proxyError;   // the user pressed Stop — not a CORS problem
            console.warn(`${MODULE_NAME} CORS proxy failed for OpenAI endpoint, trying direct:`, proxyError.message);
            try {
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: headers,
                    body: body,
                    ...(signal ? { signal } : {}),
                });
            } catch (directError) {
                throw new ConnectionError(
                    `Failed to connect to ${baseUrl}. ` +
                    `Enable the CORS proxy in config.yaml (enableCorsProxy: true). ` +
                    `Proxy error: ${proxyError.message}. Direct error: ${directError.message}`,
                    { retryable: true }
                );
            }
        }
    } else {
        try {
            response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: body,
                ...(signal ? { signal } : {}),
            });
        } catch (fetchError) {
            throw new ConnectionError(
                `Failed to connect to ${baseUrl}: ${fetchError.message}`,
                { retryable: true }
            );
        }
    }

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        if (response.status === 401) {
            throw new ConnectionError(
                'OpenAI Compatible endpoint returned 401 Unauthorized. Check your API key.',
                { retryable: false, status: 401 }
            );
        }
        if (response.status === 403) {
            throw new ConnectionError(
                `OpenAI Compatible endpoint returned 403 Forbidden: ${errorText}`,
                { retryable: false, status: 403 }
            );
        }
        throw new ConnectionError(
            `OpenAI Compatible request failed (${response.status}): ${errorText}`,
                                  { retryable: response.status >= 500 || response.status === 429, status: response.status }
        );
    }

    // ─── Stream reading ──────────────────────────────────────────
    // Read SSE chunks and assemble the full response content.
    if (!response.body || typeof response.body.getReader !== 'function') {
        // No readable stream at all (a proxy that buffers, or a polyfill).
        // Fall back to reading the whole body and parsing it as one response.
        const whole = await response.text().catch(() => '');
        const once = _parseNonStreamed(whole);
        if (once) return once;
        throw new ConnectionError(
            'OpenAI Compatible endpoint returned a body that is neither a stream nor a chat completion.',
            { retryable: true }
        );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';
    let sawSse = false;           // did ANY line arrive in SSE framing?
    let raw = '';                 // the whole body, kept for the non-streaming fallback

    // One line -> content. Providers differ on where the text lives: OpenAI puts
    // it in delta.content, several reasoning models (DeepSeek/GLM/Qwen family)
    // stream delta.reasoning_content alongside it, and a few echo the finished
    // message as message.content on the last event. Take whichever is present;
    // reasoning is only used when NOTHING else ever arrives, so a normal reply is
    // never polluted by the model's scratchpad.
    let reasoning = '';
    const eat = (line) => {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) return;
        sawSse = true;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') return;
        try {
            const parsed = JSON.parse(data);
            const c = parsed.choices?.[0];
            const delta = c?.delta?.content ?? c?.message?.content ?? c?.text;
            if (typeof delta === 'string' && delta) fullContent += delta;
            const r = c?.delta?.reasoning_content ?? c?.delta?.reasoning;
            if (typeof r === 'string' && r) reasoning += r;
        } catch (e) {
            // Skip unparseable chunks (comments, keep-alive, etc.)
        }
    };

    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            raw += chunk;
            buffer += chunk;
            const lines = buffer.split('\n');
            // Keep the last potentially incomplete line in the buffer
            buffer = lines.pop() || '';
            for (const line of lines) eat(line);
        }
        // FLUSH THE BUFFER. A final `data:` line with no trailing newline never
        // left `buffer`, because lines.pop() unconditionally holds the last
        // element back — so the last words of every such response were dropped
        // with no error anywhere. A summariser losing the tail of its own summary
        // corrupts memory quietly.
        //
        // The decoder flush below is hygiene, NOT a data-loss fix: {stream:true}
        // already reassembles a character split across a chunk boundary on the
        // next decode. It matters only for a stream that ENDS mid-character —
        // i.e. a truncated response — where it yields U+FFFD instead of nothing.
        const tail = decoder.decode();
        if (tail) { raw += tail; buffer += tail; }
        if (buffer) eat(buffer);
    } finally {
        try { reader.releaseLock(); } catch (_) { /* already released */ }
    }

    if (!fullContent.trim() && !sawSse) {
        // The provider ignored `stream: true` and answered with a plain chat
        // completion. That used to surface as "empty response (streaming)" —
        // retryable, so it burned every retry and then failed the batch, with a
        // message that pointed nowhere near the cause.
        const once = _parseNonStreamed(raw);
        if (once) return once;
    }

    if (!fullContent.trim() && reasoning.trim()) {
        // Reasoning arrived but no content did. Better the model's own words than
        // a failed batch — cleanSummarizerOutput strips think-blocks downstream.
        return reasoning;
    }

    if (!fullContent.trim()) {
        throw new ConnectionError(
            'OpenAI Compatible endpoint returned an empty response (streaming).',
                                  { retryable: true }
        );
    }

    return fullContent;
}

/**
 * Test the connection to an OpenAI-compatible endpoint.
 * @param {string} url
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function testOpenAIConnection(url, apiKey, model) {
    try {
        const result = await sendViaOpenAI(
            url,
            apiKey,
            model || 'test',
            'You are a test assistant.',
            'Respond with exactly: CONNECTION_OK',
            100 // small token limit for test
        );
        return {
            success: true,
            message: `Connection successful! Response: "${result.substring(0, 100)}"`,
        };
    } catch (error) {
        return {
            success: false,
            message: `Connection failed: ${error.message}`,
        };
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Populate a <select> element with connection profiles using ST's built-in handler.
 * @param {HTMLSelectElement} selectElement - The dropdown to populate
 * @param {string} currentValue - The currently selected profile ID
 * @returns {boolean} - Whether population succeeded
 */
export function populateProfileDropdown(selectElement, currentValue) {
    try {
        const context = SillyTavern.getContext();
        const service = context.ConnectionManagerRequestService;

        if (service && typeof service.handleDropdown === 'function') {
            service.handleDropdown(selectElement);
            if (currentValue) {
                selectElement.value = currentValue;
            }
            return true;
        }

        console.warn(`${MODULE_NAME} handleDropdown not available.`);
        return false;
    } catch (error) {
        console.error(`${MODULE_NAME} Error populating profile dropdown:`, error);
        return false;
    }
}

/**
 * Get a human-readable name for the current connection source.
 * @param {object} settings
 * @returns {string}
 */
export function getConnectionDisplayName(settings) {
    switch (settings.connectionSource) {
        case 'default':
            return 'Default (Main API)';
        case 'profile':
            return `Profile: ${settings.connectionProfileId || '(none)'}`;
        case 'ollama':
            return `Ollama: ${settings.ollamaModel || '(no model)'}`;
        case 'openai':
            return `OpenAI: ${settings.openaiModel || '(no model)'}`;
        default:
            return 'Default (Main API)';
    }
}
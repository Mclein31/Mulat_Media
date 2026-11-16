const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const vm = require('node:vm');
const { Pool } = require('pg');

test('newsroom API q filter is parameterized, length-capped, wildcard-escaped, and approved-only', async t => {
  const { generateKeyPair, exportJWK, SignJWT } = await import('jose');
  const { publicKey, privateKey } = await generateKeyPair('EdDSA');
  const jwk = { ...await exportJWK(publicKey), kid: 'search-key', alg: 'EdDSA', use: 'sig' };
  const server = http.createServer((_, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());

  const origin = `http://127.0.0.1:${server.address().port}`;
  const origBase = process.env.NEON_AUTH_BASE_URL;
  const origJwks = process.env.NEON_AUTH_JWKS_URL;
  const origDb = process.env.DATABASE_URL;
  process.env.NEON_AUTH_BASE_URL = `${origin}/neondb/auth`;
  process.env.NEON_AUTH_JWKS_URL = `${origin}/jwks`;
  process.env.DATABASE_URL = 'postgresql://test:dummy@localhost/test';

  let currentUser = { id: 'writer-1', email: 'maxenebaggao24@gmail.com', emailVerified: true, banned: false };
  const queries = [];
  const oldQuery = Pool.prototype.query;
  const oldConnect = Pool.prototype.connect;
  Pool.prototype.query = async (sql, params = []) => {
    if (sql.includes('FROM neon_auth')) return { rows: [currentUser] };
    queries.push({ sql, params });
    return { rows: [] };
  };
  Pool.prototype.connect = async () => ({ query: Pool.prototype.query, release() {} });
  t.after(() => {
    Pool.prototype.query = oldQuery;
    Pool.prototype.connect = oldConnect;
    if (origBase === undefined) delete process.env.NEON_AUTH_BASE_URL; else process.env.NEON_AUTH_BASE_URL = origBase;
    if (origJwks === undefined) delete process.env.NEON_AUTH_JWKS_URL; else process.env.NEON_AUTH_JWKS_URL = origJwks;
    if (origDb === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = origDb;
  });

  const handler = require('../api/newsroom.js');
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'EdDSA', kid: 'search-key' })
    .setSubject('writer-1')
    .setIssuer(origin)
    .setAudience(origin)
    .setExpirationTime('5m')
    .sign(privateKey);

  async function getArticles(query = {}, auth = null) {
    const req = {
      method: 'GET',
      query: { resource: 'articles', ...query },
      headers: auth ? { authorization: `Bearer ${auth}` } : {}
    };
    const res = {
      code: 200,
      setHeader() {},
      status(code) { this.code = code; return this; },
      json(data) { this.data = data; return this; }
    };
    await handler(req, res);
    return res;
  }

  // Anonymous search escapes LIKE wildcards and never interpolates q into SQL
  const anon = await getArticles({ q: "  50%_\\'; DROP TABLE articles;--  " });
  assert.equal(anon.code, 200);
  const anonQuery = queries.at(-1);
  assert.match(anonQuery.sql, /status='approved'/);
  assert.match(anonQuery.sql, /\(title ILIKE \$1 ESCAPE '\\' OR excerpt ILIKE \$1 ESCAPE '\\' OR author_name ILIKE \$1 ESCAPE '\\'\)/);
  assert.doesNotMatch(anonQuery.sql, /DROP TABLE/);
  assert.deepEqual(anonQuery.params, ["%50\\%\\_\\\\'; DROP TABLE articles;--%"]);

  // Signed-in writer cannot search pending drafts
  const writerRes = await getArticles({ q: 'campus' }, token);
  assert.equal(writerRes.code, 200);
  const writerQuery = queries.at(-1);
  assert.match(writerQuery.sql, /\(status='approved' OR author_id=\$1\) AND status='approved'/);
  assert.deepEqual(writerQuery.params, ['writer-1', '%campus%']);

  // Signed-in editor still gets approved-only results when using q
  currentUser = { id: 'eic-1', email: 'jiangmee.lee@gmail.com', emailVerified: true, banned: false };
  const editorRes = await getArticles({ q: 'editorial' }, token);
  assert.equal(editorRes.code, 200);
  const editorQuery = queries.at(-1);
  assert.match(editorQuery.sql, /WHERE status='approved' AND \(title ILIKE \$1/);
  assert.deepEqual(editorQuery.params, ['%editorial%']);

  // Cannot combine q with non-public scopes
  for (const scope of ['pending', 'all', 'mine']) {
    const blocked = await getArticles({ q: 'editorial', scope }, token);
    assert.equal(blocked.code, 400);
  }

  // Length cap and type validation
  assert.equal((await getArticles({ q: ['a', 'b'] })).code, 400);
  assert.equal((await getArticles({ q: 'x'.repeat(101) })).code, 400);
  assert.equal((await getArticles({ q: ' '.repeat(501) })).code, 400);
  assert.equal((await getArticles({ q: 'x'.repeat(100) })).code, 200);

  // Whitespace-only q applies no LIKE clause
  const blankRes = await getArticles({ q: '   ' });
  assert.equal(blankRes.code, 200);
  assert.doesNotMatch(queries.at(-1).sql, /ILIKE/);
});

test('browser client searchArticles queries /api/newsroom unauthenticated and forwards AbortSignal', async t => {
  const { createAuthClient } = await import('@neondatabase/auth');
  const { BetterAuthVanillaAdapter } = await import('@neondatabase/auth/vanilla/adapters');
  const calls = [];
  const originalFetch = globalThis.fetch;
  const mockFetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify({
      articles: [{
        id: 5, category: 'opinion', category_name: 'Opinion', tag: 'Column',
        title: 'Press Freedom', excerpt: 'Why it matters.', body: ['Body'],
        image: null, read_time: '3 min read', author_name: 'Jang Mee B. Lee',
        author_id: 'eic', status: 'approved', created_at: '2026-11-01T00:00:00Z'
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  globalThis.fetch = mockFetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  const source = fs.readFileSync(path.join(__dirname, '../assets/js/backend-client.source.js'), 'utf8')
    .replace(/^import .*;\n/gm, '');
  const context = {
    createAuthClient, BetterAuthVanillaAdapter, fetch: mockFetch, URLSearchParams, URL,
    window: { addEventListener() {}, location: { origin: 'https://mulat-media.vercel.app' } }, console
  };
  vm.runInNewContext(source, context);

  const controller = new AbortController();
  const items = await context.window.MulatSupabase.searchArticles('Press', { signal: controller.signal });
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Press Freedom');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/newsroom?resource=articles&q=Press');
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.equal(calls[0].options.signal, controller.signal);
});

test('articles.html search UI handles debounce, loading, results, no-results, error, clear and Escape', async () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'articles.html'), 'utf8');
  assert.match(html, /role="search"/);
  assert.match(html, /<label for="articleSearchInput"/);
  assert.match(html, /id="articleSearchInput"[^>]*maxlength="100"/);
  assert.match(html, /id="articleSearchStatus"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /MulatNewsroom\.initArticleSearch\(\)/);

  const elements = new Map();
  function el(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        id, hidden: false, value: '', textContent: '', innerHTML: '', className: '',
        attrs: {}, handlers: {}, focused: false,
        addEventListener(type, fn) {
          this.handlers[type] = this.handlers[type] || [];
          this.handlers[type].push(fn);
        },
        dispatch(type, evt = {}) {
          for (const fn of this.handlers[type] || []) fn(evt);
        },
        setAttribute(k, v) { this.attrs[k] = String(v); },
        getAttribute(k) { return this.attrs[k] ?? null; },
        focus() { this.focused = true; }
      });
    }
    return elements.get(id);
  }
  el('articleSearchClear').hidden = true;
  el('articleSearchStatus').hidden = true;
  el('articleSearchResults').hidden = true;

  let pendingResolve;
  let pendingReject;
  const searchCalls = [];
  const window = {
    MulatSupabase: {
      getCurrentMember: async () => null,
      searchArticles: (query, opts) => {
        searchCalls.push({ query, signal: opts && opts.signal });
        return new Promise((resolve, reject) => {
          pendingResolve = resolve;
          pendingReject = reject;
        });
      }
    }
  };
  const document = {
    body: { getAttribute: () => '' },
    getElementById: el,
    addEventListener() {}
  };

  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/newsroom.js'), 'utf8'), {
    window, document, AbortController, setTimeout, clearTimeout, console
  });

  window.MulatNewsroom.initArticleSearch();
  const input = el('articleSearchInput');
  const clearBtn = el('articleSearchClear');
  const status = el('articleSearchStatus');
  const results = el('articleSearchResults');
  const grid = el('articleSearchGrid');

  // Typing rapidly debounces into a single query after ~250ms
  input.value = 'cam';
  input.dispatch('input');
  input.value = 'campus';
  input.dispatch('input');
  assert.equal(clearBtn.hidden, false);
  assert.equal(searchCalls.length, 0, 'debounce delays fetch');

  await new Promise(r => setTimeout(r, 290));
  assert.equal(searchCalls.length, 1);
  assert.equal(searchCalls[0].query, 'campus');
  assert.equal(status.hidden, false);
  assert.match(status.className, /is-loading/);
  assert.equal(results.getAttribute('aria-busy'), 'true');

  // Results state (verifies HTML escaping too)
  pendingResolve([{
    id: 9, category: 'campus-press', categoryName: 'Campus Press', tag: 'News',
    title: '<Script>Campus</Script> Voice', excerpt: 'Summary & details',
    author: 'Maxene Q. Baggao', date: 'November 15, 2026', readTime: '4 min read'
  }]);
  await new Promise(setImmediate);
  assert.equal(results.hidden, false);
  assert.equal(results.getAttribute('aria-busy'), 'false');
  assert.match(status.textContent, /1 published article found/);
  assert.match(grid.innerHTML, /&lt;Script&gt;Campus&lt;\/Script&gt; Voice/);
  assert.match(grid.innerHTML, /article\.html\?id=9/);

  // No-results state on immediate Enter submit
  el('articleSearchForm').dispatch('submit', { preventDefault() {} });
  assert.equal(searchCalls.length, 2);
  pendingResolve([]);
  await new Promise(setImmediate);
  assert.equal(results.hidden, true);
  assert.match(status.className, /is-empty/);
  assert.match(status.textContent, /No published articles matched/);

  // Error state
  el('articleSearchForm').dispatch('submit', { preventDefault() {} });
  pendingReject(new Error('Database unavailable.'));
  await new Promise(setImmediate);
  assert.equal(results.hidden, true);
  assert.match(status.className, /is-error/);
  assert.equal(status.textContent, 'Database unavailable.');

  // Escape clears to empty state
  let prevented = false;
  input.dispatch('keydown', { key: 'Escape', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(input.value, '');
  assert.equal(clearBtn.hidden, true);
  assert.equal(status.hidden, true);
  assert.equal(results.hidden, true);
  assert.equal(grid.innerHTML, '');

  // Clear button clears and restores focus to input
  input.value = 'sports';
  input.dispatch('input');
  clearBtn.dispatch('click');
  assert.equal(input.value, '');
  assert.equal(input.focused, true);
  assert.equal(clearBtn.hidden, true);
});

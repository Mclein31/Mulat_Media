const { test } = require('node:test');
const assert = require('node:assert/strict');
const proxy = require('../api/auth.js');

function response() {
  return {
    code: 200, headers: {}, data: undefined,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.code = code; return this; },
    json(data) { this.data = data; return this; },
    send(data) { this.data = data; return this; }
  };
}
function request(path, method = 'POST', body = {}) {
  return { query: { path }, method, body, headers: {} };
}

test('auth proxy restricts routes/methods and requires configuration before fetching', async t => {
  const originalFetch = globalThis.fetch;
  const originalBase = process.env.NEON_AUTH_BASE_URL;
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalBase === undefined) delete process.env.NEON_AUTH_BASE_URL;
    else process.env.NEON_AUTH_BASE_URL = originalBase;
  });
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('Unexpected fetch.'); };
  process.env.NEON_AUTH_BASE_URL = 'https://fixed-auth.example/neondb/auth';
  for (const path of [undefined, [], ['token'], 'sign-up/email', '../token', 'https://evil.example/token', '//evil.example/token', 'token?extra=1', 'admin/create-user']) {
    const res = response();
    await proxy(request(path), res);
    assert.equal(res.code, 404, `unknown path ${JSON.stringify(path)} must be denied`);
    assert.equal(res.headers['cache-control'], 'no-store');
  }
  for (const method of ['PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']) {
    const res = response(); await proxy(request('token', method), res);
    assert.equal(res.code, 405);
  }
  delete process.env.NEON_AUTH_BASE_URL;
  const res = response(); await proxy(request('token', 'GET'), res);
  assert.equal(res.code, 503);
  assert.equal(calls, 0);
});

test('auth proxy uses only configured upstream and forwards required request/cookie state', async t => {
  const originalFetch = globalThis.fetch;
  const originalBase = process.env.NEON_AUTH_BASE_URL;
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalBase === undefined) delete process.env.NEON_AUTH_BASE_URL;
    else process.env.NEON_AUTH_BASE_URL = originalBase;
  });
  process.env.NEON_AUTH_BASE_URL = 'https://fixed-auth.example/neondb/auth/';
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url: String(url), options };
    const headers = new Headers({
      'Content-Type': 'application/json', 'set-auth-jwt': 'test-jwt',
      'Location': 'https://do-not-forward.example/', 'X-Upstream-Secret': 'do-not-forward'
    });
    headers.append('Set-Cookie', '__Secure-neon.session_token=signed; Domain=.fixed-auth.example; Path=/; HttpOnly; Secure; SameSite=None');
    headers.append('Set-Cookie', 'neon.session_data=cached; Domain=fixed-auth.example; Path=/; Max-Age=300; Secure');
    return new Response(JSON.stringify({ user: { id: 'staff' } }), { status: 201, headers });
  };
  const req = request('sign-in/email', 'POST', { email: 'staff@example.test', password: ' preserve spaces ' });
  req.headers = {
    cookie: 'neon.session_token=old', 'content-type': 'application/json',
    origin: 'https://publication.example', referer: 'https://publication.example/login.html',
    'user-agent': 'test-browser', host: 'evil.example', authorization: 'Bearer do-not-forward',
    'x-forwarded-host': 'evil.example'
  };
  const res = response(); await proxy(req, res);
  assert.equal(captured.url, 'https://fixed-auth.example/neondb/auth/sign-in/email');
  assert.equal(captured.options.redirect, 'manual');
  assert.ok(captured.options.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(captured.options.body), req.body);
  for (const name of ['cookie', 'content-type', 'origin', 'referer', 'user-agent']) assert.equal(captured.options.headers[name], req.headers[name]);
  for (const name of ['host', 'authorization', 'x-forwarded-host']) assert.equal(captured.options.headers[name], undefined);
  assert.equal(res.code, 201);
  assert.deepEqual(JSON.parse(res.data.toString()), { user: { id: 'staff' } });
  assert.equal(res.headers['set-auth-jwt'], 'test-jwt');
  assert.equal(res.headers['content-type'], 'application/json');
  assert.equal(res.headers.location, undefined);
  assert.equal(res.headers['x-upstream-secret'], undefined);
  assert.equal(res.headers['set-cookie'].length, 2);
  for (const cookie of res.headers['set-cookie']) {
    assert.doesNotMatch(cookie, /;\s*domain=/i);
    assert.match(cookie, /Path=\//);
    assert.match(cookie, /Secure/);
  }
  assert.match(res.headers['set-cookie'][0], /HttpOnly/);
  assert.match(res.headers['set-cookie'][0], /SameSite=None/);
});

test('auth proxy preserves raw bodies, upstream errors, empty responses and handles fetch failures', async t => {
  const originalFetch = globalThis.fetch;
  const originalBase = process.env.NEON_AUTH_BASE_URL;
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalBase === undefined) delete process.env.NEON_AUTH_BASE_URL;
    else process.env.NEON_AUTH_BASE_URL = originalBase;
  });
  process.env.NEON_AUTH_BASE_URL = 'https://fixed-auth.example/neondb/auth';
  let captured;
  globalThis.fetch = async (_, options) => {
    captured = options;
    return new Response('{"error":"Invalid credentials"}', { status: 401, headers: { 'Content-Type': 'application/json' } });
  };
  const raw = '{"email":"staff@example.test","password":"secret"}';
  let res = response(); await proxy(request('sign-in/email', 'POST', raw), res);
  assert.equal(captured.body, raw);
  assert.equal(res.code, 401);
  assert.equal(res.data.toString(), '{"error":"Invalid credentials"}');
  globalThis.fetch = async (_, options) => { captured = options; return new Response(null, { status: 204 }); };
  res = response(); await proxy(request('get-session', 'GET', { ignored: true }), res);
  assert.equal(captured.body, undefined);
  assert.equal(res.code, 204);
  assert.equal(res.data.length, 0);
  globalThis.fetch = async () => { throw new Error('sensitive upstream connection detail'); };
  res = response(); await proxy(request('token', 'GET'), res);
  assert.equal(res.code, 502);
  assert.doesNotMatch(JSON.stringify(res.data), /sensitive/);
  assert.match(res.data.error, /unavailable/);
});

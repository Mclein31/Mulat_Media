const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('email client enforces eligibility and verification using the actual Neon SDK', async t => {
  const { createAuthClient } = await import('@neondatabase/auth');
  const { BetterAuthVanillaAdapter } = await import('@neondatabase/auth/vanilla/adapters');
  const calls = [];
  const originalFetch = globalThis.fetch;
  let verified = false;
  let sessionActive = false;
  const staffEmail = 'staff@example.test';
  const user = () => ({ id: 'staff-id', email: staffEmail, emailVerified: verified, name: 'Staff' });
  const mockFetch = async (url, options = {}) => {
    const parsed = new URL(String(url), 'https://publication.example.test');
    calls.push({ url: parsed, options });
    let data;
    let status = 200;
    const resource = parsed.searchParams.get('resource');
    if (resource === 'config') data = { authUrl: '/api/auth' };
    else if (resource === 'eligibility') {
      const { email } = JSON.parse(options.body);
      status = email === staffEmail ? 200 : 403;
      data = status === 200 ? { name: 'Canonical Staff' } : { error: 'Access denied.' };
    } else if (resource === 'member') data = { member: { id: 'staff-id', name: 'Canonical Staff', isEic: false } };
    else if (resource === 'articles') data = { article: { id: '1', author_id: 'staff-id', status: 'pending', created_at: '2026-01-01' } };
    else if (parsed.pathname.startsWith('/api/auth/')) {
      assert.equal(parsed.origin, 'https://publication.example.test', 'auth stays on the publication origin');
      if (parsed.pathname.endsWith('/sign-in/email')) { sessionActive = true; data = { token: 'opaque-session', user: user() }; }
      else if (parsed.pathname.endsWith('/get-session')) data = sessionActive ? { session: { id: 'session-id', token: 'opaque-session' }, user: user() } : null;
      else if (parsed.pathname.endsWith('/sign-out')) { sessionActive = false; data = { success: true }; }
      else if (parsed.pathname.endsWith('/token')) data = { token: 'signed-jwt' };
      else if (parsed.pathname.endsWith('/email-otp/verify-email')) {
        verified = true;
        data = { status: true, token: null, user: user() };
      } else data = { status: true };
    } else throw new Error(`Unexpected request: ${parsed}`);
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  };
  globalThis.fetch = mockFetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const source = fs.readFileSync(path.join(__dirname, '../assets/js/backend-client.source.js'), 'utf8')
    .replace(/^import .*;\n/gm, '');
  const context = {
    createAuthClient, BetterAuthVanillaAdapter, fetch: mockFetch, URLSearchParams, URL,
    window: { addEventListener() {}, location: { origin: 'https://publication.example.test' } }, console
  };
  vm.runInNewContext(source, context);
  const client = context.window.MulatSupabase;

  assert.equal(client.signUpMember, undefined, 'account creation is not exposed to the browser');
  assert.equal((await client.signInMember('outsider@example.test', 'password')).ok, false);
  assert.equal(calls.some(call => call.url.pathname.startsWith('/api/auth/')), false,
    'ineligible users never reach the SDK signin calls');

  assert.equal((await client.signInMember(' STAFF@EXAMPLE.TEST ', ' preserved spaces ')).needsVerification, true);
  const signinCall = calls.find(call => call.url.pathname.endsWith('/sign-in/email'));
  const signinBody = JSON.parse(signinCall.options.body);
  assert.equal(signinBody.email, staffEmail);
  assert.equal(signinBody.password, ' preserved spaces ');
  assert.equal(calls.some(call => call.url.searchParams.get('resource') === 'member'), false,
    'unverified sign-in does not attempt editorial access');
  assert.equal((await client.sendVerificationCode(staffEmail)).ok, true);
  const otpSend = calls.find(call => call.url.pathname.endsWith('/email-otp/send-verification-otp'));
  assert.equal(JSON.parse(otpSend.options.body).type, 'email-verification');
  assert.equal((await client.verifyMemberEmail(staffEmail, '123456')).ok, true);
  const otpVerify = calls.find(call => call.url.pathname.endsWith('/email-otp/verify-email'));
  assert.equal(JSON.parse(otpVerify.options.body).otp, '123456');
  const signedIn = await client.signInMember(staffEmail, ' preserved spaces ');
  assert.equal(signedIn.ok, true, JSON.stringify(signedIn));
  assert.equal((await client.getCurrentMember()).id, 'staff-id', 'verified session restores for account loading');
  const memberCall = calls.find(call => call.url.searchParams.get('resource') === 'member');
  assert.equal(memberCall.options.headers.Authorization, 'Bearer signed-jwt');

  assert.equal((await client.changeMemberPassword('new-password', ' preserved spaces ')).ok, true);
  const passwordCall = calls.find(call => call.url.pathname.endsWith('/change-password'));
  assert.equal(JSON.parse(passwordCall.options.body).currentPassword, ' preserved spaces ');
  assert.equal(JSON.parse(passwordCall.options.body).revokeOtherSessions, true);
  assert.equal((await client.getCurrentMember()).id, 'staff-id', 'current session survives password change');
  await client.publishArticle({ title: 'Story' }, { id: 'spoofed-author', isEic: true });
  const articleCall = calls.find(call => call.url.searchParams.get('resource') === 'articles');
  assert.equal(JSON.parse(articleCall.options.body).author_id, undefined);
  assert.equal(JSON.parse(articleCall.options.body).isEic, undefined);
  await client.signOutMember();
  assert.equal(await client.getCurrentMember(), null, 'sign-out clears the cached session');
  const signedInAgain = await client.signInMember(staffEmail, 'new-password');
  assert.equal(signedInAgain.ok, true, 'sign-in restores protected access after sign-out');
  assert.equal(calls.some(call => call.url.hostname !== 'publication.example.test'), false, 'browser never calls a remote auth host');
  for (const call of calls.filter(call => call.url.pathname.startsWith('/api/auth/'))) {
    assert.equal(call.options.credentials, 'include', `${call.url.pathname}: session cookie required`);
    assert.equal(new Headers(call.options.headers).has('X-Force-Fetch'), false,
      'SDK removes its internal cache-bypass header before the CORS request');
  }
});

test('staff sign-in opens password settings and password updates show busy and result states', async () => {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      id, hidden: false, value: '', style: {}, textContent: '', innerHTML: '', className: '',
      handlers: {}, attributes: {}, disabled: false,
      addEventListener(type, handler) { this.handlers[type] = handler; },
      setAttribute(name, value) { this.attributes[name] = value; },
      focus() { this.focused = true; },
      reset() { this.wasReset = true; },
      querySelectorAll() { return [element(`${id}-submit`)]; },
      querySelector() { return element(`${id}-submit`); }
    });
    return elements.get(id);
  }
  const html = fs.readFileSync(path.join(__dirname, '../login.html'), 'utf8');
  assert.doesNotMatch(html, /signupForm|showSignup|Create Account|Create your account/i);
  const location = { href: 'https://publication.example.test/login.html', search: '', origin: 'https://publication.example.test' };
  let signedIn = false;
  let passwordRequest;
  let finishPassword;
  const window = { location, MulatSupabase: {
    getCurrentMember: async () => signedIn ? { id: 'staff-id', name: 'Staff', isEic: false } : null,
    signInMember: async () => { signedIn = true; return { ok: true }; },
    changeMemberPassword: (...args) => {
      passwordRequest = args;
      return new Promise(resolve => { finishPassword = resolve; });
    }
  } };
  const document = {
    body: { getAttribute: () => '' },
    getElementById: element,
    addEventListener() {}
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/newsroom.js'), 'utf8'), {
    window, document, URL, URLSearchParams, console
  });
  await window.MulatNewsroom.initLoginForm();
  element('memberEmail').value = 'staff@example.test';
  element('accessCode').value = 'initial-password';
  element('loginForm').handlers.submit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(location.href, 'https://publication.example.test/login.html', 'normal login stays on password settings');
  assert.equal(element('authForms').hidden, true);
  assert.equal(element('authCardTitle').textContent, 'Change Password');
  assert.equal(element('accountPanel').style.display, '');
  assert.equal(element('accessCode').value, '');

  const passwordForm = element('changePasswordForm');
  element('currentPassword').value = 'initial-password';
  element('newPassword').value = 'new-private-password';
  element('confirmPassword').value = 'mismatched';
  await passwordForm.handlers.submit({ preventDefault() {} });
  assert.equal(passwordRequest, undefined);
  assert.match(element('accountMsg').textContent, /match/);

  element('confirmPassword').value = 'new-private-password';
  const pending = passwordForm.handlers.submit({ preventDefault() {} });
  assert.equal(element('changePasswordForm-submit').disabled, true);
  assert.equal(passwordForm.attributes['aria-busy'], 'true');
  assert.equal(passwordRequest[0], 'new-private-password');
  assert.equal(passwordRequest[1], 'initial-password');
  finishPassword({ ok: true });
  await pending;
  assert.equal(element('changePasswordForm-submit').disabled, false);
  assert.equal(passwordForm.attributes['aria-busy'], 'false');
  assert.equal(passwordForm.wasReset, true);
  assert.match(element('accountMsg').textContent, /Password changed/);

  const failed = passwordForm.handlers.submit({ preventDefault() {} });
  finishPassword({ ok: false, error: 'Current password is incorrect.' });
  await failed;
  assert.equal(element('changePasswordForm-submit').disabled, false);
  assert.equal(element('accountMsg').textContent, 'Current password is incorrect.');
});

test('newsroom controls enforce editor-only acknowledgement and ordinary article ownership', async () => {
  let member = null;
  const window = { MulatSupabase: { getCurrentMember: async () => member } };
  const document = { addEventListener() {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/newsroom.js'), 'utf8'), {
    window, document, console
  });
  const newsroom = window.MulatNewsroom;
  const own = { authorId: 'writer', category: 'sports', status: 'pending' };
  const other = { authorId: 'other', category: 'sports', status: 'pending' };
  const acknowledgement = { authorId: 'writer', category: 'acknowledgement', status: 'pending' };
  member = { id: 'developer', isAdmin: true, isEic: false, canEditAcknowledgement: false };
  await newsroom.refreshMember();
  for (const method of ['canEditArticle', 'canDeleteArticle', 'canApproveArticle']) {
    assert.equal(newsroom[method](other), true, `developer may ${method} ordinary stories`);
    assert.equal(newsroom[method](acknowledgement), false, `developer may not ${method} acknowledgement`);
  }
  assert.equal(newsroom.canEditAcknowledgement(), false);
  member = { id: 'editor', isEic: true, isAdmin: false, canEditAcknowledgement: true };
  await newsroom.refreshMember();
  for (const method of ['canEditArticle', 'canDeleteArticle', 'canApproveArticle']) {
    assert.equal(newsroom[method](other), true);
    assert.equal(newsroom[method](acknowledgement), true);
  }
  assert.equal(newsroom.canEditAcknowledgement(), true);
  member = { id: 'writer', isEic: false, isAdmin: false, canEditAcknowledgement: false };
  await newsroom.refreshMember();
  assert.equal(newsroom.canEditArticle(own), true);
  assert.equal(newsroom.canDeleteArticle(own), true);
  assert.equal(newsroom.canEditArticle(other), false);
  assert.equal(newsroom.canDeleteArticle(other), false);
  assert.equal(newsroom.canApproveArticle(own), false);
  assert.equal(newsroom.canEditArticle(acknowledgement), false);
  assert.equal(newsroom.canDeleteArticle(acknowledgement), false);
  assert.equal(newsroom.canEditAcknowledgement(), false);
});

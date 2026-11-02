import { createAuthClient } from '@neondatabase/auth';
import { BetterAuthVanillaAdapter } from '@neondatabase/auth/vanilla/adapters';

// This compatibility name keeps existing publication pages working during migration.
// Credentials and editorial authorization live on the server, never in this bundle.
let authPromise;
async function authClient() {
  if (!authPromise) {
    authPromise = fetch('/api/newsroom?resource=config').then(async response => {
      const config = await response.json();
      if (!response.ok || !config.authUrl) throw new Error(config.error || 'Sign-in is not configured yet.');
      return createAuthClient(new URL(config.authUrl, window.location.origin).href, {
        adapter: BetterAuthVanillaAdapter({ fetchOptions: { credentials: 'include' } })
      });
    }).catch(error => { authPromise = null; throw error; });
  }
  return authPromise;
}
async function request(resource, { method = 'GET', query = {}, body, authenticated = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authenticated) {
    const auth = await authClient();
    const session = await auth.getSession();
    if (session.error) throw new Error(session.error.message);
    if (session.data?.user) {
      // Neon SDK 0.6 caches /token as a session; force this request to get a JWT.
      // The adapter removes this internal header before sending the request.
      const token = await auth.token({ fetchOptions: { headers: { 'X-Force-Fetch': 'true' } } });
      if (token.error || !token.data?.token) throw new Error(token.error?.message || 'Please sign in again.');
      headers.Authorization = `Bearer ${token.data.token}`;
    }
  }
  const params = new URLSearchParams({ resource, ...query });
  const response = await fetch(`/api/newsroom?${params}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}
function resultError(error) { return { ok: false, error: error.message || 'Please try again.' }; }
function checkResult(result) {
  if (result.error) throw new Error(result.error.message || 'Authentication failed.');
  return result.data;
}
const normalizeEmail = email => String(email || '').trim().toLowerCase();
async function eligibility(email) {
  return request('eligibility', { method: 'POST', body: { email }, authenticated: false });
}
async function signInMember(email, password) {
  try {
    email = normalizeEmail(email);
    await eligibility(email);
    const auth = await authClient();
    const result = await auth.signIn.email({ email, password });
    if (result.error) {
      if (result.error.code === 'EMAIL_NOT_VERIFIED') return { ok: false, needsVerification: true, email, error: 'Verify your email before signing in.' };
      checkResult(result);
    }
    if (!result.data?.user?.emailVerified) return { ok: false, needsVerification: true, email, error: 'Verify your email before signing in.' };
    await request('member');
    return { ok: true };
  } catch (error) { return resultError(error); }
}
async function sendVerificationCode(email) {
  try {
    email = normalizeEmail(email);
    await eligibility(email);
    const auth = await authClient();
    checkResult(await auth.emailOtp.sendVerificationOtp({ email, type: 'email-verification' }));
    return { ok: true };
  } catch (error) { return resultError(error); }
}
async function verifyMemberEmail(email, otp) {
  try {
    const auth = await authClient();
    checkResult(await auth.emailOtp.verifyEmail({ email: normalizeEmail(email), otp }));
    return { ok: true };
  } catch (error) { return resultError(error); }
}
async function signOutMember() { checkResult(await (await authClient()).signOut()); }
async function getCurrentMember() {
  const auth = await authClient();
  const session = await auth.getSession();
  if (session.error) throw new Error(session.error.message);
  if (!session.data?.user) return null;
  return (await request('member')).member;
}
async function changeMemberPassword(newPassword, currentPassword) {
  try {
    checkResult(await (await authClient()).changePassword({ newPassword, currentPassword, revokeOtherSessions: true }));
    return { ok: true };
  } catch (error) { return resultError(error); }
}
function rowToArticle(row) {
  if (!row) return null;
  return {
    id: row.id, category: row.category, categoryName: row.category_name, tag: row.tag,
    title: row.title, excerpt: row.excerpt, body: row.body || [], image: row.image,
    readTime: row.read_time, author: row.author_name, authorId: row.author_id,
    status: row.status, reviewedAt: row.reviewed_at, reviewedBy: row.reviewed_by,
    date: new Date(row.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  };
}
function articleFields(fields) {
  const keys = { category: 'category', categoryName: 'category_name', tag: 'tag', title: 'title', excerpt: 'excerpt', body: 'body', image: 'image', readTime: 'read_time', status: 'status' };
  return Object.fromEntries(Object.entries(keys).filter(([key]) => fields[key] !== undefined).map(([key, column]) => [column, fields[key]]));
}
async function articles(query, authenticated = true) {
  const result = await request('articles', { query, authenticated });
  return (result.articles || []).map(rowToArticle);
}
async function mutateArticle(method, id, fields) {
  try {
    const result = await request('articles', { method, query: id == null ? {} : { id }, body: fields });
    const article = rowToArticle(result.article);
    return { ok: true, article, status: article?.status };
  } catch (error) { return resultError(error); }
}
async function uploadArticlePhoto(file) {
  try {
    const signed = await request('upload', { method: 'POST', body: { name: file.name, type: file.type, size: file.size } });
    const uploaded = await fetch(signed.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
    if (!uploaded.ok) throw new Error('Photo upload failed. Please try again.');
    return { ok: true, url: signed.url };
  } catch (error) { return resultError(error); }
}
window.MulatSupabase = {
  signInMember, sendVerificationCode, verifyMemberEmail, signOutMember,
  getCurrentMember, changeMemberPassword,
  onMemberChange(callback) { window.addEventListener('focus', () => getCurrentMember().then(callback).catch(() => callback(null))); },
  fetchArticlesForCategory: category => articles({ category }, false),
  fetchArticleById: async id => {
    const published = (await articles({ id }, false))[0];
    if (published) return published;
    try { return (await articles({ id }))[0] || null; } catch { return null; }
  },
  fetchPendingArticles: () => articles({ scope: 'pending' }),
  fetchMemberSubmissions: () => articles({ scope: 'mine' }),
  fetchAllArticles: () => articles({ scope: 'all' }),
  publishArticle: fields => mutateArticle('POST', null, articleFields(fields)),
  approveArticleRemote: id => mutateArticle('PATCH', id, { status: 'approved' }),
  updateArticleRemote: (id, fields) => mutateArticle('PATCH', id, articleFields(fields)),
  deleteArticleRemote: id => mutateArticle('DELETE', id),
  uploadArticlePhoto
};

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Writable } = require('node:stream');
const { Pool } = require('pg');
const feedHandler = require('../api/feed.js');

function mockResponse() {
  const chunks = [];
  const res = new Writable({
    write(chunk, _enc, done) {
      chunks.push(Buffer.from(chunk));
      done();
    }
  });
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = (name, value) => { res.headers[name.toLowerCase()] = value; };
  Object.defineProperty(res, 'body', {
    get: () => (chunks.length ? Buffer.concat(chunks).toString('utf8') : undefined)
  });
  return res;
}

test('RSS feed enforces GET/HEAD, requires DATABASE_URL, and hides DB errors', async t => {
  const originalDbUrl = process.env.DATABASE_URL;
  const originalQuery = Pool.prototype.query;
  t.after(() => {
    Pool.prototype.query = originalQuery;
    if (originalDbUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDbUrl;
  });

  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const res = mockResponse();
    await feedHandler({ method, headers: {} }, res);
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.allow, 'GET, HEAD');
    assert.equal(res.headers['cache-control'], 'no-store');
  }

  delete process.env.DATABASE_URL;
  const unconfigured = mockResponse();
  await feedHandler({ method: 'GET', headers: {} }, unconfigured);
  assert.equal(unconfigured.statusCode, 503);
  assert.equal(unconfigured.headers['cache-control'], 'no-store');

  process.env.DATABASE_URL = 'postgresql://test:dummy@localhost/test';
  Pool.prototype.query = async () => { throw new Error('secret-db-connection-error'); };
  const failed = mockResponse();
  await feedHandler({ method: 'GET', headers: {} }, failed);
  assert.equal(failed.statusCode, 500);
  assert.equal(failed.headers['cache-control'], 'no-store');
  assert.doesNotMatch(failed.body, /secret-db-connection-error/);
});

test('RSS feed queries approved articles and outputs valid escaped RSS 2.0 XML', async t => {
  const originalDbUrl = process.env.DATABASE_URL;
  const originalQuery = Pool.prototype.query;
  t.after(() => {
    Pool.prototype.query = originalQuery;
    if (originalDbUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDbUrl;
  });

  process.env.DATABASE_URL = 'postgresql://test:dummy@localhost/test';
  let capturedSql = '';
  Pool.prototype.query = async sql => {
    capturedSql = sql;
    return {
      rows: [
        {
          id: 42,
          category: 'news-current-affairs',
          category_name: 'News & Current Affairs',
          tag: 'Campus <Alert>',
          title: 'Students\' Forum "Live" & Updates\x07',
          excerpt: 'Summary with <tags> & "quotes".',
          author_name: 'Jang Mee B. Lee',
          created_at: '2026-11-10T08:00:00.000Z'
        }
      ]
    };
  };

  const res = mockResponse();
  await feedHandler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.match(capturedSql, /status\s*=\s*'approved'/);
  assert.equal(res.headers['content-type'], 'application/rss+xml; charset=utf-8');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.match(res.headers['cache-control'], /^public,/);

  assert.match(res.body, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(res.body, /<rss version="2\.0"/);
  assert.match(res.body, /<atom:link href="https:\/\/mulat-media\.vercel\.app\/feed\.xml" rel="self" type="application\/rss\+xml" \/>/);
  assert.match(res.body, /<link>https:\/\/mulat-media\.vercel\.app\/article\.html\?id=42<\/link>/);
  assert.match(res.body, /<guid isPermaLink="true">https:\/\/mulat-media\.vercel\.app\/article\.html\?id=42<\/guid>/);
  assert.match(res.body, /<title>Students&apos; Forum &quot;Live&quot; &amp; Updates<\/title>/);
  assert.match(res.body, /<description>Summary with &lt;tags&gt; &amp; &quot;quotes&quot;\.<\/description>/);
  assert.match(res.body, /<category>News &amp; Current Affairs<\/category>/);
  assert.match(res.body, /<category>Campus &lt;Alert&gt;<\/category>/);
  assert.match(res.body, /<dc:creator>Jang Mee B\. Lee<\/dc:creator>/);
  assert.doesNotMatch(res.body, /\x07/);

  const headRes = mockResponse();
  await feedHandler({ method: 'HEAD', headers: {} }, headRes);
  assert.equal(headRes.statusCode, 200);
  assert.equal(headRes.headers['content-type'], 'application/rss+xml; charset=utf-8');
  assert.equal(headRes.body, undefined);
});

test('vercel.json routes /feed.xml and public HTML pages declare RSS alternate links', () => {
  const root = path.join(__dirname, '..');
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.ok(
    vercel.rewrites.some(r => r.source === '/feed.xml' && r.destination === '/api/feed'),
    'vercel.json must rewrite /feed.xml to /api/feed'
  );

  const rootPages = [
    'index.html', 'articles.html', 'article.html', 'about.html', 'mission.html',
    'vision.html', 'core-values.html', 'members.html', 'acknowledgement.html', 'special-features.html'
  ];
  for (const file of rootPages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(html, /<link rel="alternate" type="application\/rss\+xml" title="Mulat Media RSS Feed" href="feed\.xml">/, file);
  }

  for (const dir of ['articles', 'members']) {
    for (const file of fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith('.html'))) {
      const html = fs.readFileSync(path.join(root, dir, file), 'utf8');
      assert.match(html, /<link rel="alternate" type="application\/rss\+xml" title="Mulat Media RSS Feed" href="\.\.\/feed\.xml">/, `${dir}/${file}`);
    }
  }
});

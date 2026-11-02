const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Readable, Writable } = require('node:stream');
const { S3Client, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const media = require('../api/media.js');
const CACHE = 'public,max-age=3600,s-maxage=86400,stale-while-revalidate=86400';

function response() {
  const chunks = [];
  const res = new Writable({
    write(chunk, encoding, done) {
      res.headersSent = true;
      chunks.push(Buffer.from(chunk));
      done();
    }
  });
  res.statusCode = 200;
  res.headers = {};
  res.headersSent = false;
  res.setHeader = (name, value) => { res.headers[name.toLowerCase()] = value; };
  Object.defineProperty(res, 'body', { get: () => chunks.length ? Buffer.concat(chunks) : undefined });
  return res;
}
function request(path = 'article-photos/staff/photo.jpg', method = 'GET', headers = {}) {
  return { query: { path }, method, headers };
}
function setup(t, send) {
  const keys = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const originalSend = S3Client.prototype.send;
  process.env.R2_ACCOUNT_ID = 'a'.repeat(32);
  process.env.R2_ACCESS_KEY_ID = 'server-key';
  process.env.R2_SECRET_ACCESS_KEY = 'server-secret';
  process.env.R2_BUCKET_NAME = 'fixed-media-bucket';
  S3Client.prototype.send = send;
  t.after(() => {
    S3Client.prototype.send = originalSend;
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });
}
function image(type = 'image/jpeg', bytes = Buffer.from('image-bytes')) {
  return { ContentType: type, ContentLength: bytes.length, ETag: '"abc123"', Body: Readable.from([bytes]) };
}

test('media restricts methods and image key namespace without querying storage', async t => {
  let calls = 0;
  setup(t, async () => { calls++; throw new Error('Unexpected storage request.'); });
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
    const res = response(); await media(request(undefined, method), res);
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.allow, 'GET, HEAD');
  }
  for (const key of [null, [], ['article-photos/photo.jpg'], 'private/photo.jpg', 'https://evil.example/photo.jpg', 'article-photos/../private.jpg', 'article-photos/%2e%2e/private.jpg', 'article-photos/a%2fb.jpg', 'article-photos//photo.jpg', 'article-photos/a\\photo.jpg', 'article-photos/photo.svg', 'article-photos/photo.html', 'article-photos/photo.jpg?url=evil', 'article-photos/photo\r\n.jpg']) {
    const res = response(); await media(request(key), res);
    assert.equal(res.statusCode, 404, JSON.stringify(key));
    assert.equal(res.headers['cache-control'], 'no-store');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
  }
  assert.equal(calls, 0);
});

test('media serves supported images only from the configured bucket and returns cache metadata', async t => {
  const calls = [];
  setup(t, async function (command, options) {
    calls.push({ command, options });
    const config = await this.config.endpoint();
    assert.equal(config.hostname, `${'a'.repeat(32)}.r2.cloudflarestorage.com`);
    return image();
  });
  const req = request();
  req.query.bucket = 'attacker-bucket';
  req.query.url = 'https://attacker.example/image.jpg';
  const res = response(); await media(req, res);
  assert.equal(res.statusCode, 200);
  assert.ok(calls[0].command instanceof GetObjectCommand);
  assert.equal(calls[0].command.input.Bucket, 'fixed-media-bucket');
  assert.equal(calls[0].command.input.Key, 'article-photos/staff/photo.jpg');
  assert.ok(calls[0].options.abortSignal instanceof AbortSignal);
  assert.equal(res.body.toString(), 'image-bytes');
  assert.equal(res.headers['cache-control'], CACHE);
  assert.equal(res.headers.etag, '"abc123"');
  assert.equal(res.headers['content-type'], 'image/jpeg');
  assert.equal(res.headers['content-length'], 11);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  for (const type of ['image/png', 'image/webp', 'image/gif']) {
    S3Client.prototype.send = async () => image(type);
    const typed = response(); await media(request(), typed);
    assert.equal(typed.headers['content-type'], type);
  }
});

test('large supported images stream before the full object has been read', async t => {
  const res = response();
  const chunk = Buffer.alloc(1024 * 1024, 1);
  const body = Readable.from((async function* () {
    yield chunk;
    await new Promise(setImmediate);
    assert.equal(res.headersSent, true, 'response starts before the remaining five MB arrive');
    for (let index = 0; index < 5; index++) yield chunk;
  })());
  setup(t, async () => ({ ContentType: 'image/jpeg', ContentLength: chunk.length * 6, Body: body }));
  await media(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, chunk.length * 6);
  assert.equal(res.headers['content-length'], chunk.length * 6);
});

test('HEAD loads metadata without a body and conditional ETags return 304', async t => {
  let command;
  setup(t, async input => {
    command = input;
    return { ContentType: 'image/png', ContentLength: 15, ETag: '"abc123"' };
  });
  const head = response(); await media(request('article-photos/photo.png', 'HEAD'), head);
  assert.ok(command instanceof HeadObjectCommand);
  assert.equal(head.statusCode, 200);
  assert.equal(head.headers['content-length'], 15);
  assert.equal(head.body, undefined);

  for (const match of ['"abc123"', 'W/"abc123"', '"other", W/"abc123"', '*']) {
    const object = image();
    S3Client.prototype.send = async () => object;
    const conditional = response(); await media(request(undefined, 'GET', { 'if-none-match': match }), conditional);
    assert.equal(conditional.statusCode, 304);
    assert.equal(conditional.body, undefined);
    assert.equal(conditional.headers['cache-control'], CACHE);
    assert.equal(conditional.headers.etag, '"abc123"');
    assert.equal(object.Body.destroyed, true, 'unused R2 body closes on 304');
  }
});

test('unsafe types, oversized objects and malformed metadata are not cached', async t => {
  setup(t, async () => image());
  const cases = [
    { object: image('text/html'), status: 415 },
    { object: image('image/svg+xml'), status: 415 },
    { object: { ...image(), ContentLength: 10 * 1024 * 1024 + 1 }, status: 415 },
    { object: { ...image(), ContentLength: undefined }, status: 415 },
    { object: { ...image(), ContentLength: 0 }, status: 415 }

  ];
  for (const { object, status } of cases) {
    S3Client.prototype.send = async () => object;
    const res = response(); await media(request(), res);
    assert.equal(res.statusCode, status);
    assert.equal(res.headers['cache-control'], 'no-store');
    assert.doesNotMatch(String(res.body), /server-secret|server-key|private-stream-error/);
    assert.equal(object.Body.destroyed, true);
  }
});

test('stream failures terminate responses instead of appending error data', async t => {
  setup(t, async () => image());
  for (const object of [
    { ...image(), ContentLength: 2 },
    { ...image(), ContentLength: 99 },
    { ...image(), Body: Readable.from((async function* () { yield Buffer.from('part'); throw new Error('private-stream-error'); })()) }
  ]) {
    S3Client.prototype.send = async () => object;
    const res = response(); await media(request(), res);
    assert.equal(res.destroyed, true);
    assert.equal(object.Body.destroyed, true);
    assert.doesNotMatch(String(res.body), /server-secret|private-stream-error|Photo could not be loaded/);
  }
});

test('missing objects and configuration errors use safe responses, including empty HEAD errors', async t => {
  setup(t, async () => { throw Object.assign(new Error('server-secret'), { name: 'NoSuchKey' }); });
  const missing = response(); await media(request(), missing);
  assert.equal(missing.statusCode, 404);
  assert.equal(JSON.parse(missing.body.toString()).error, 'Photo not found.');
  const missingHead = response(); await media(request(undefined, 'HEAD'), missingHead);
  assert.equal(missingHead.statusCode, 404);
  assert.equal(missingHead.body, undefined);
  S3Client.prototype.send = async () => { throw new Error('server-secret'); };
  const unavailable = response(); await media(request(), unavailable);
  assert.equal(unavailable.statusCode, 502);
  assert.doesNotMatch(unavailable.body.toString(), /server-secret/);
  delete process.env.R2_SECRET_ACCESS_KEY;
  const config = response(); await media(request(), config);
  assert.equal(config.statusCode, 503);
  assert.equal(config.headers['cache-control'], 'no-store');
});

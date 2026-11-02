const { S3Client, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const CACHE = 'public,max-age=3600,s-maxage=86400,stale-while-revalidate=86400';
let storage;
let storageConfig;

function configuredStorage() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env;
  if (!R2_ACCOUNT_ID || !/^[a-f0-9]{32}$/i.test(R2_ACCOUNT_ID) || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    throw Object.assign(new Error('Photo storage is not configured.'), { status: 503 });
  }
  const config = JSON.stringify([R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME]);
  if (config !== storageConfig) {
    if (storage) storage.destroy();
    storage = new S3Client({
      region: 'auto', maxAttempts: 2,
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY }
    });
    storageConfig = config;
  }
  return { client: storage, bucket: R2_BUCKET_NAME };
}

function safeKey(value) {
  if (typeof value !== 'string' || value.length > 1024 || !value.startsWith('article-photos/')) return null;
  const segments = value.split('/');
  if (segments.length < 2 || segments.some(segment => !/^[a-zA-Z0-9_-][a-zA-Z0-9._-]{0,254}$/.test(segment) || segment.includes('..'))) return null;
  if (!/\.(?:jpe?g|png|webp|gif)$/i.test(segments.at(-1))) return null;
  return value;
}

function etagMatches(header, etag) {
  if (typeof header !== 'string') return false;
  return header.split(',').some(value => value.trim() === '*' || (etag && value.trim().replace(/^W\//, '') === etag));
}

function closeBody(body) {
  if (body && typeof body.destroy === 'function') body.destroy();
}

module.exports = async function media(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const headOnly = req.method === 'HEAD';
  function error(status, message) {
    res.statusCode = status;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(headOnly ? undefined : JSON.stringify({ error: message }));
  }
  if (req.method !== 'GET' && !headOnly) {
    res.setHeader('Allow', 'GET, HEAD');
    return error(405, 'Method not allowed.');
  }
  const query = req.query || Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
  const key = safeKey(query.path);
  if (!key) return error(404, 'Photo not found.');
  let object;
  try {
    const { client, bucket } = configuredStorage();
    const Command = headOnly ? HeadObjectCommand : GetObjectCommand;
    const signal = AbortSignal.timeout(15000);
    object = await client.send(new Command({ Bucket: bucket, Key: key }), { abortSignal: signal });
    const type = String(object.ContentType || '').split(';')[0].trim().toLowerCase();
    const length = object.ContentLength;
    if (!IMAGE_TYPES.has(type) || !Number.isSafeInteger(length) || length < 1 || length > MAX_BYTES) {
      closeBody(object.Body);
      return error(415, 'Photo format or size is not supported.');
    }
    const etag = typeof object.ETag === 'string' && /^"[a-zA-Z0-9._-]{1,200}"$/.test(object.ETag) ? object.ETag : null;
    // A conditional response still validates that this is a supported image.
    if (etagMatches(req.headers?.['if-none-match'], etag)) {
      closeBody(object.Body);
      res.statusCode = 304;
      res.setHeader('Cache-Control', CACHE);
      if (etag) res.setHeader('ETag', etag);
      return res.end();
    }
    if (!headOnly && (!object.Body || typeof object.Body[Symbol.asyncIterator] !== 'function')) throw new Error('Missing photo body.');
    res.statusCode = 200;
    res.setHeader('Cache-Control', CACHE);
    res.setHeader('Content-Type', type);
    res.setHeader('Content-Length', length);
    if (etag) res.setHeader('ETag', etag);
    if (headOnly) return res.end();
    let received = 0;
    const limit = new Transform({
      transform(chunk, encoding, done) {
        received += chunk.length;
        if (received > MAX_BYTES || received > length) return done(new Error('Invalid photo length.'));
        done(null, chunk);
      },
      flush(done) { done(received === length ? null : new Error('Incomplete photo.')); }
    });
    // Stream instead of buffering so larger images stay within Vercel's response limits.
    await pipeline(object.Body, limit, res, { signal });
  } catch (cause) {
    closeBody(object?.Body);
    // A failed stream must terminate rather than append JSON to a partial image.
    if (res.headersSent || res.destroyed) {
      if (!res.destroyed) res.destroy();
      return;
    }
    if (cause.status === 503) return error(503, 'Photo storage is not configured.');
    if (cause.name === 'NoSuchKey' || cause.name === 'NotFound' || cause.$metadata?.httpStatusCode === 404) return error(404, 'Photo not found.');
    return error(502, 'Photo could not be loaded.');
  }
};

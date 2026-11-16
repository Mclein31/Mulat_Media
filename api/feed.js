const { Pool } = require('pg');
const { attachDatabasePool } = require('@vercel/functions');

const DEFAULT_SITE_URL = 'https://mulat-media.vercel.app';
const FEED_CACHE = 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600';
const MAX_ITEMS = 50;

let pool;
function db() {
  if (!process.env.DATABASE_URL) {
    throw Object.assign(new Error('Feed is not configured.'), { status: 503 });
  }
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
    attachDatabasePool(pool);
  }
  return pool;
}

function resolveSiteUrl() {
  const raw = process.env.SITE_URL;
  if (raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.origin;
      }
    } catch {}
  }
  return DEFAULT_SITE_URL;
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatRfc822(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toUTCString();
}

function renderItem(row, siteUrl) {
  const articleUrl = `${siteUrl}/article.html?id=${encodeURIComponent(row.id)}`;
  const pubDate = formatRfc822(row.created_at);
  const categories = [];
  if (row.category_name) categories.push(row.category_name);
  if (row.tag && row.tag !== row.category_name) categories.push(row.tag);

  const lines = [
    '    <item>',
    `      <title>${escapeXml(row.title)}</title>`,
    `      <link>${escapeXml(articleUrl)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(articleUrl)}</guid>`,
    pubDate ? `      <pubDate>${escapeXml(pubDate)}</pubDate>` : null,
    row.author_name ? `      <dc:creator>${escapeXml(row.author_name)}</dc:creator>` : null,
    ...categories.map(c => `      <category>${escapeXml(c)}</category>`),
    `      <description>${escapeXml(row.excerpt)}</description>`,
    '    </item>'
  ].filter(Boolean);

  return lines.join('\n');
}

function buildRssXml(rows, siteUrl) {
  const latest = rows.length ? formatRfc822(rows[0].created_at) : null;
  const lastBuildDate = latest || new Date().toUTCString();
  const itemsXml = rows.map(row => renderItem(row, siteUrl)).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    '    <title>Mulat Media</title>',
    `    <link>${escapeXml(siteUrl)}/</link>`,
    '    <description>Stories That Inform. Voices That Matter. Independent student journalism publication.</description>',
    '    <language>en-us</language>',
    `    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(siteUrl)}/feed.xml" rel="self" type="application/rss+xml" />`,
    itemsXml,
    '  </channel>',
    '</rss>',
    ''
  ].filter(Boolean).join('\n');
}

async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const headOnly = req.method === 'HEAD';

  function sendError(status, message) {
    res.statusCode = status;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(headOnly ? undefined : JSON.stringify({ error: message }));
  }

  if (req.method !== 'GET' && !headOnly) {
    res.setHeader('Allow', 'GET, HEAD');
    return sendError(405, 'Method not allowed.');
  }

  try {
    const { rows } = await db().query(
      "SELECT id, category, category_name, tag, title, excerpt, author_name, created_at FROM public.articles WHERE status='approved' ORDER BY created_at DESC LIMIT $1",
      [MAX_ITEMS]
    );
    const xml = buildRssXml(rows, resolveSiteUrl());
    res.statusCode = 200;
    res.setHeader('Cache-Control', FEED_CACHE);
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    return res.end(headOnly ? undefined : xml);
  } catch (error) {
    if (error.status === 503) return sendError(503, error.message);
    return sendError(500, 'Feed could not be generated.');
  }
}

module.exports = handler;
module.exports.buildRssXml = buildRssXml;
module.exports.escapeXml = escapeXml;

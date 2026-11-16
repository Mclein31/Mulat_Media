const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function makeElement(id, getScrollY) {
  const listeners = {};
  const classes = new Set();
  const attrs = {};
  return {
    id,
    hidden: false,
    href: '',
    src: '',
    alt: '',
    textContent: '',
    innerHTML: '',
    offsetHeight: 0,
    style: {},
    classList: {
      add(c) { classes.add(c); },
      remove(c) { classes.delete(c); },
      contains(c) { return classes.has(c); }
    },
    setAttribute(name, value) { attrs[name] = String(value); },
    getAttribute(name) { return attrs[name] ?? null; },
    addEventListener(type, fn) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    },
    removeEventListener(type, fn) {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter(f => f !== fn);
    },
    dispatch(type) {
      for (const fn of listeners[type] || []) fn();
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getBoundingClientRect() {
      const y = getScrollY ? getScrollY() : 0;
      return { top: 400 - y, bottom: 400 + this.offsetHeight - y, height: this.offsetHeight };
    }
  };
}

function loadArticlePage({ article, scrollHeight = 2200, bodyHeight = 900, clipboardSpy }) {
  const elements = new Map();
  let windowRef;
  const getEl = id => {
    if (!elements.has(id)) elements.set(id, makeElement(id, () => (windowRef ? windowRef.scrollY : 0)));
    return elements.get(id);
  };
  getEl('articleBody').offsetHeight = bodyHeight;
  getEl('articleShare').hidden = true;
  getEl('readingProgress').hidden = true;

  const winListeners = {};
  const window = {
    location: {
      href: `https://mulat-media.vercel.app/article.html?id=${article ? article.id : ''}&extra=1`,
      search: article ? `?id=${article.id}` : ''
    },
    innerHeight: 800,
    scrollY: 0,
    addEventListener(type, fn) {
      winListeners[type] = winListeners[type] || [];
      winListeners[type].push(fn);
    },
    removeEventListener(type, fn) {
      if (!winListeners[type]) return;
      winListeners[type] = winListeners[type].filter(f => f !== fn);
    },
    dispatch(type) {
      for (const fn of winListeners[type] || []) fn();
    },
    MulatNewsroom: {
      ensureMember: async () => {},
      getMember: () => null,
      isJangMee: () => false,
      getArticleById: async () => article,
      getArticlesForCategory: async () => [],
      canEditArticle: () => false,
      canDeleteArticle: () => false,
      canApproveArticle: () => false
    }
  };
  windowRef = window;
  const document = {
    title: '',
    documentElement: { clientHeight: 800, scrollHeight },
    getElementById: getEl,
    querySelector: () => null
  };
  const navigator = {
    clipboard: clipboardSpy
      ? { writeText: clipboardSpy }
      : undefined
  };

  const code = fs.readFileSync(path.join(__dirname, '../assets/js/article-page.js'), 'utf8');
  vm.runInNewContext(code, {
    window, document, navigator, URL, URLSearchParams, setTimeout, clearTimeout, console
  });

  return { window, elements, getEl };
}

test('article.html and articles.css include accessible share buttons, progress bar, and reduced-motion rules', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'article.html'), 'utf8');
  assert.match(html, /id="readingProgress"[^>]*role="progressbar"/);
  assert.match(html, /aria-label="Article reading progress"/);
  assert.match(html, /aria-valuemin="0"/);
  assert.match(html, /aria-valuemax="100"/);
  assert.match(html, /id="articleShare"[^>]*aria-label="Share this article"/);
  assert.match(html, /id="shareFacebook"[^>]*rel="noopener noreferrer"/);
  assert.match(html, /id="shareX"[^>]*rel="noopener noreferrer"/);
  assert.match(html, /id="shareLinkedIn"[^>]*rel="noopener noreferrer"/);
  assert.match(html, /id="shareCopyLink"/);
  assert.match(html, /id="articleShareStatus"[^>]*aria-live="polite"/);
  assert.doesNotMatch(html, /connect\.facebook\.net|platform\.twitter\.com|platform\.linkedin\.com/);

  const css = fs.readFileSync(path.join(root, 'articles.css'), 'utf8');
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /\.reading-progress-bar/);
  assert.match(css, /\.article-share-btn/);
});

test('share buttons populate intent URLs, copy canonical link, and stay hidden when article is unavailable', async () => {
  let copied = '';
  const published = {
    id: 17,
    category: 'opinion',
    categoryName: 'Opinion',
    tag: 'Editorial',
    title: 'Student Voices & Campus Press',
    excerpt: 'Summary',
    body: ['Paragraph one.'],
    status: 'approved',
    author: 'Jang Mee B. Lee',
    date: 'November 16, 2026'
  };

  const { window, getEl } = loadArticlePage({
    article: published,
    clipboardSpy: async text => { copied = text; }
  });
  await window.MulatArticlePage.render();

  assert.equal(getEl('articleShare').hidden, false);
  const canonical = encodeURIComponent('https://mulat-media.vercel.app/article.html?id=17');
  assert.equal(getEl('shareFacebook').href, `https://www.facebook.com/sharer/sharer.php?u=${canonical}`);
  assert.equal(getEl('shareX').href, `https://x.com/intent/tweet?url=${canonical}&text=${encodeURIComponent(published.title)}`);
  assert.equal(getEl('shareLinkedIn').href, `https://www.linkedin.com/sharing/share-offsite/?url=${canonical}`);

  await getEl('shareCopyLink').onclick();
  assert.equal(copied, 'https://mulat-media.vercel.app/article.html?id=17');
  assert.equal(getEl('shareCopyLabel').textContent, 'Copied!');
  assert.equal(getEl('shareCopyLink').classList.contains('is-copied'), true);
  assert.match(getEl('articleShareStatus').textContent, /copied/i);

  const notFound = loadArticlePage({ article: null });
  await notFound.window.MulatArticlePage.render();
  assert.equal(notFound.getEl('articleShare').hidden, true);
  assert.equal(notFound.getEl('readingProgress').hidden, true);
});

test('reading progress bar shows only on long articles and updates ARIA progress on scroll', async () => {
  const baseArticle = {
    id: 21,
    category: 'campus-press',
    categoryName: 'Campus Press',
    tag: 'Feature',
    title: 'Long Feature',
    excerpt: 'Summary',
    body: ['Paragraph'],
    status: 'approved'
  };

  const shortPage = loadArticlePage({ article: baseArticle, scrollHeight: 900, bodyHeight: 220 });
  await shortPage.window.MulatArticlePage.render();
  assert.equal(shortPage.getEl('readingProgress').hidden, true);

  const longPage = loadArticlePage({ article: baseArticle, scrollHeight: 2200, bodyHeight: 900 });
  await longPage.window.MulatArticlePage.render();
  const progress = longPage.getEl('readingProgress');
  const bar = longPage.getEl('readingProgressBar');
  assert.equal(progress.hidden, false);
  assert.equal(progress.getAttribute('aria-valuenow'), '0');
  assert.equal(bar.style.transform, 'scaleX(0.0000)');

  longPage.window.scrollY = 350;
  longPage.window.dispatch('scroll');
  assert.equal(progress.getAttribute('aria-valuenow'), '50');
  assert.equal(bar.style.transform, 'scaleX(0.5000)');

  longPage.window.scrollY = 700;
  longPage.window.dispatch('scroll');
  assert.equal(progress.getAttribute('aria-valuenow'), '100');
  assert.equal(bar.style.transform, 'scaleX(1.0000)');
});

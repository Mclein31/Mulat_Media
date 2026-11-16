(function (global) {

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function getParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function categoryPath(slug) {
    if (slug === 'acknowledgement') return 'acknowledgement.html';
    if (slug === 'special-features') return 'special-features.html';
    return 'articles/' + slug + '.html';
  }

  var progressCleanup = null;
  var copyResetTimer = null;

  function hideExtras() {
    var share = document.getElementById('articleShare');
    if (share) share.hidden = true;
    var progress = document.getElementById('readingProgress');
    if (progress) progress.hidden = true;
    if (typeof progressCleanup === 'function') {
      progressCleanup();
      progressCleanup = null;
    }
  }

  function showNotFound(customMsg) {
    hideExtras();
    var content = document.getElementById('articleContent');
    if (content) content.hidden = true;
    var notFound = document.getElementById('articleNotFound');
    if (notFound) {
      notFound.hidden = false;
      if (customMsg) {
        var stmt = notFound.querySelector('.statement');
        if (stmt) stmt.textContent = customMsg;
      }
    }
  }

  async function copyText(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {}
    }
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return Boolean(ok);
    } catch (e) {
      return false;
    }
  }

  function initShareButtons(article, isPending) {
    var shareEl = document.getElementById('articleShare');
    if (!shareEl) return;
    if (isPending) {
      shareEl.hidden = true;
      return;
    }

    var baseHref = (window.location && window.location.href) ? window.location.href : 'https://mulat-media.vercel.app/';
    var shareUrl = new URL('article.html?id=' + encodeURIComponent(article.id), baseHref).href;
    var encodedUrl = encodeURIComponent(shareUrl);
    var encodedTitle = encodeURIComponent(article.title || 'Mulat Media');

    var fbLink = document.getElementById('shareFacebook');
    if (fbLink) fbLink.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodedUrl;

    var xLink = document.getElementById('shareX');
    if (xLink) xLink.href = 'https://x.com/intent/tweet?url=' + encodedUrl + '&text=' + encodedTitle;

    var liLink = document.getElementById('shareLinkedIn');
    if (liLink) liLink.href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodedUrl;

    var copyBtn = document.getElementById('shareCopyLink');
    var copyLabel = document.getElementById('shareCopyLabel');
    var statusEl = document.getElementById('articleShareStatus');

    if (copyBtn) {
      copyBtn.onclick = async function () {
        if (copyResetTimer) {
          clearTimeout(copyResetTimer);
          copyResetTimer = null;
        }
        var copied = await copyText(shareUrl);
        if (copied) {
          if (copyLabel) copyLabel.textContent = 'Copied!';
          copyBtn.classList.add('is-copied');
          if (statusEl) statusEl.textContent = 'Article link copied to clipboard.';
          copyResetTimer = setTimeout(function () {
            if (copyLabel) copyLabel.textContent = 'Copy Link';
            copyBtn.classList.remove('is-copied');
            if (statusEl) statusEl.textContent = '';
            copyResetTimer = null;
          }, 2500);
        } else if (statusEl) {
          statusEl.textContent = 'Could not copy link. Copy the URL from your address bar.';
        }
      };
    }

    shareEl.hidden = false;
  }

  function initReadingProgress(heroImg) {
    if (typeof progressCleanup === 'function') {
      progressCleanup();
      progressCleanup = null;
    }

    var progressEl = document.getElementById('readingProgress');
    var barEl = document.getElementById('readingProgressBar');
    var contentEl = document.getElementById('articleContent');
    var bodyEl = document.getElementById('articleBody');
    if (!progressEl || !barEl || !contentEl || !bodyEl) return;

    var LONG_BODY_MIN_HEIGHT = 480;
    var LONG_SCROLL_MIN_DISTANCE = 200;
    var rafId = null;
    var lastPct = -1;

    function update() {
      rafId = null;
      if (contentEl.hidden) {
        progressEl.hidden = true;
        return;
      }
      var docEl = document.documentElement;
      var viewportH = window.innerHeight || (docEl && docEl.clientHeight) || 800;
      var scrollHeight = docEl ? docEl.scrollHeight : 0;
      var maxDocScroll = Math.max(0, scrollHeight - viewportH);
      var bodyRect = bodyEl.getBoundingClientRect ? bodyEl.getBoundingClientRect() : { bottom: 0 };
      var bodyHeight = bodyEl.offsetHeight || bodyRect.height || 0;
      var scrollY = window.scrollY || window.pageYOffset || 0;
      var bodyBottomDoc = scrollY + bodyRect.bottom;
      var endY = Math.min(maxDocScroll, Math.max(0, bodyBottomDoc - viewportH * 0.75));
      var isLong = bodyHeight >= LONG_BODY_MIN_HEIGHT && endY >= LONG_SCROLL_MIN_DISTANCE;

      if (!isLong) {
        progressEl.hidden = true;
        barEl.style.transform = 'scaleX(0)';
        if (lastPct !== 0) {
          progressEl.setAttribute('aria-valuenow', '0');
          lastPct = 0;
        }
        return;
      }

      progressEl.hidden = false;
      var ratio = endY > 0 ? Math.min(1, Math.max(0, scrollY / endY)) : 0;
      var pct = Math.round(ratio * 100);
      barEl.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
      if (pct !== lastPct) {
        progressEl.setAttribute('aria-valuenow', String(pct));
        lastPct = pct;
      }
    }

    function scheduleUpdate() {
      if (rafId !== null) return;
      if (typeof window.requestAnimationFrame === 'function') {
        rafId = window.requestAnimationFrame(update);
      } else {
        update();
      }
    }

    if (typeof window.addEventListener === 'function') {
      window.addEventListener('scroll', scheduleUpdate, { passive: true });
      window.addEventListener('resize', scheduleUpdate, { passive: true });
    }
    if (heroImg && typeof heroImg.addEventListener === 'function') {
      heroImg.addEventListener('load', scheduleUpdate);
      heroImg.addEventListener('error', scheduleUpdate);
    }

    progressCleanup = function () {
      if (rafId !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (typeof window.removeEventListener === 'function') {
        window.removeEventListener('scroll', scheduleUpdate);
        window.removeEventListener('resize', scheduleUpdate);
      }
      if (heroImg && typeof heroImg.removeEventListener === 'function') {
        heroImg.removeEventListener('load', scheduleUpdate);
        heroImg.removeEventListener('error', scheduleUpdate);
      }
    };

    update();
  }

  async function render() {
    var id = getParam('id');
    if (!global.MulatNewsroom) {
      showNotFound();
      return;
    }
    await global.MulatNewsroom.ensureMember();
    var member = global.MulatNewsroom.getMember();
    var eic = global.MulatNewsroom.isJangMee();

    var article = id ? await global.MulatNewsroom.getArticleById(id) : null;

    if (!article) {
      showNotFound();
      return;
    }

    var isPending = article.status === 'pending';

    // Access control for pending stories:
    if (isPending && !member) {
      showNotFound('This story is currently undergoing editorial peer review by our Editor-in-Chief and has not been published yet.');
      return;
    }

    var isAuthor = member && article.authorId && article.authorId === member.id;

    if (isPending && !eic && !isAuthor) {
      showNotFound('This article is currently under peer review and is only visible to the author and Editor-in-Chief.');
      return;
    }

    var readTime = article.readTime || '';
    if (readTime && !/min read/.test(readTime)) readTime = readTime + ' min read';

    document.title = (isPending ? '[Draft] ' : '') + article.title + ' — MULAT MEDIA';
    var titleTag = document.getElementById('articleTitleTag');
    if (titleTag) titleTag.textContent = article.title + ' — MULAT MEDIA';

    var breadcrumb = document.getElementById('articleBreadcrumb');
    if (breadcrumb) {
      breadcrumb.innerHTML =
        '<a href="articles.html">Articles</a>' +
        '<span class="sep">/</span>' +
        '<a href="' + categoryPath(article.category) + '">' + escapeHtml(article.categoryName) + '</a>' +
        '<span class="sep">/</span>' +
        '<span class="current">' + escapeHtml(article.title) + '</span>';
    }

    var tabs = document.getElementById('articleCategoryTabs');
    if (tabs) {
      Array.prototype.forEach.call(tabs.querySelectorAll('a'), function (a) {
        a.classList.remove('active');
        if (a.getAttribute('href') === categoryPath(article.category)) {
          a.classList.add('active');
        }
      });
    }

    // Render EIC or Author peer-review banner if pending
    var headerWrap = document.querySelector('.article-header .wrap');
    if (headerWrap) {
      var existingBanner = document.getElementById('articleReviewBanner');
      if (existingBanner) existingBanner.remove();

      if (isPending) {
        var banner = document.createElement('div');
        banner.id = 'articleReviewBanner';
        banner.className = 'review-banner';

        if (global.MulatNewsroom.canApproveArticle(article)) {
          banner.innerHTML =
            '<div class="review-banner-content">' +
            '  <div class="review-banner-badge">&#9203; AWAITING YOUR REVIEW</div>' +
            '  <p class="review-banner-text">This story was submitted by <strong>' + escapeHtml(article.author || 'a newsroom member') + '</strong> for peer review. You can edit it or approve it to publish immediately to the website.</p>' +
            '  <div class="review-banner-actions">' +
            '    <button type="button" class="btn-approve" id="bannerApproveBtn">&#10003; Approve &amp; Publish</button>' +
            '    <a href="' + global.MulatNewsroom.editPageFor(article.category) + '?edit=' + encodeURIComponent(article.id) + '" class="btn-sm">Edit Story</a>' +
            '  </div>' +
            '</div>';
        } else if (isAuthor) {
          banner.innerHTML =
            '<div class="review-banner-content">' +
            '  <div class="review-banner-badge">&#9203; PENDING PEER REVIEW</div>' +
            '  <p class="review-banner-text">Your story has been submitted and is awaiting review and verification by <strong>Jang Mee B. Lee (Editor-in-Chief)</strong> before it goes live on the website.</p>' +
            '  <div class="review-banner-actions">' +
            '    <a href="' + global.MulatNewsroom.editPageFor(article.category) + '?edit=' + encodeURIComponent(article.id) + '" class="btn-sm">Edit Draft</a>' +
            '  </div>' +
            '</div>';
        }
        headerWrap.insertBefore(banner, headerWrap.firstChild);

        var bannerApproveBtn = document.getElementById('bannerApproveBtn');
        if (bannerApproveBtn) {
          bannerApproveBtn.addEventListener('click', async function () {
            bannerApproveBtn.disabled = true;
            bannerApproveBtn.textContent = 'Approving & Publishing…';
            var res = await global.MulatNewsroom.approveArticle(article.id);
            if (res.ok) {
              window.location.reload();
            } else {
              window.alert(res.error || 'Approval failed.');
              bannerApproveBtn.disabled = false;
              bannerApproveBtn.textContent = 'Approve & Publish';
            }
          });
        }
      }
    }

    var tagEl = document.getElementById('articleTag');
    if (tagEl) tagEl.textContent = article.tag || article.categoryName;

    var titleEl = document.getElementById('articleTitle');
    if (titleEl) titleEl.textContent = article.title;

    var bylineEl = document.getElementById('articleByline');
    if (bylineEl) {
      bylineEl.innerHTML =
        'By ' + escapeHtml(article.author || 'Mulat Media Newsroom') +
        ' &middot; ' + escapeHtml(article.date || '') +
        (readTime ? ' &middot; ' + escapeHtml(readTime) : '');
    }

    var hero = document.getElementById('articleHero');
    var heroImg = document.getElementById('articleHeroImg');
    if (article.image && hero && heroImg) {
      heroImg.src = article.image;
      heroImg.alt = article.title;
      hero.hidden = false;
      heroImg.onerror = function () { hero.hidden = true; };
    }

    var bodyEl = document.getElementById('articleBodyText');
    if (bodyEl) {
      var paragraphs = (article.body && article.body.length) ? article.body : [article.excerpt || ''];
      bodyEl.innerHTML = paragraphs.map(function (p) {
        return '<p>' + escapeHtml(p) + '</p>';
      }).join('');
    }

    initShareButtons(article, isPending);

    var moreSection = document.getElementById('articleMoreSection');
    var moreGrid = document.getElementById('articleMoreGrid');
    var moreLabel = document.getElementById('articleMoreLabel');
    if (moreSection && moreGrid && global.MulatNewsroom && !isPending) {
      var categoryArticles = await global.MulatNewsroom.getArticlesForCategory(article.category);
      var more = categoryArticles
        .filter(function (a) { return String(a.id) !== String(article.id); })
        .slice(0, 3);
      if (more.length) {
        moreLabel.textContent = 'More From ' + article.categoryName;
        moreGrid.innerHTML = more.map(function (a) {
          var media = a.image
            ? '<img src="' + escapeHtml(a.image) + '" alt="' + escapeHtml(a.title) + '">'
            : '';
          return (
            '<div class="story-card">' +
            '  <div class="story-card-media">' + media + '</div>' +
            '  <span class="tag">' + escapeHtml(a.tag) + '</span>' +
            '  <h3>' + escapeHtml(a.title) + '</h3>' +
            '  <p>' + escapeHtml(a.excerpt) + '</p>' +
            '  <a href="article.html?id=' + encodeURIComponent(a.id) + '" class="read-more">Continue Reading &rarr;</a>' +
            '</div>'
          );
        }).join('');
        moreSection.hidden = false;
      }
    }

    var crosslink = document.getElementById('articleCrosslink');
    var backBtn = document.getElementById('articleBackToCategory');
    if (crosslink && backBtn) {
      backBtn.href = categoryPath(article.category);
      backBtn.textContent = 'Back to ' + article.categoryName;
      crosslink.hidden = false;
    }

    var ownerActions = document.getElementById('articleOwnerActions');
    var editLink = document.getElementById('articleEditLink');
    var deleteBtn = document.getElementById('articleDeleteBtn');

    var canEdit = global.MulatNewsroom && global.MulatNewsroom.canEditArticle(article);
    var canDelete = global.MulatNewsroom && global.MulatNewsroom.canDeleteArticle(article);

    if (ownerActions && (canEdit || canDelete)) {
      ownerActions.hidden = false;
      if (editLink) {
        editLink.hidden = !canEdit;
        editLink.href = global.MulatNewsroom.editPageFor(article.category) + '?edit=' + encodeURIComponent(article.id);
      }
      if (deleteBtn) {
        deleteBtn.hidden = !canDelete;
        deleteBtn.addEventListener('click', async function () {
          if (!window.confirm('Delete "' + article.title + '"? This can\'t be undone.')) return;
          var result = await global.MulatNewsroom.deleteArticle(article.id);
          if (result.ok) {
            window.location.href = isPending ? 'review-queue.html' : categoryPath(article.category);
          } else {
            window.alert(result.error || 'You do not have permission to delete this.');
          }
        });
      }
    }

    initReadingProgress(heroImg);
  }

  global.MulatArticlePage = { render: render };

})(window);

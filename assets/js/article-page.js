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

  function showNotFound(customMsg) {
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

    var isAuthor = member && (
      (article.authorId && member.id && article.authorId === member.id) ||
      (article.author && article.author.trim().toLowerCase() === member.name.trim().toLowerCase())
    );

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

        if (eic) {
          banner.innerHTML =
            '<div class="review-banner-content">' +
            '  <div class="review-banner-badge">&#9203; AWAITING YOUR VERIFICATION (EIC)</div>' +
            '  <p class="review-banner-text">This story was submitted by <strong>' + escapeHtml(article.author || 'a newsroom member') + '</strong> for peer review. As Editor-in-Chief, you can edit it or approve it to publish immediately to the website.</p>' +
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
  }

  global.MulatArticlePage = { render: render };

})(window);

(function (global) {

  var MEMBERS = [
    'Jang Mee B. Lee',
    'Maxene Q. Baggao',
    'Kaizen C. Rodriguez',
    'Kyla Rex Jaime',
    'Macy Ollagangi',
    'Mharielle B. Binondo',
    'Zildjian Faith F. Toledo'
  ];

  var CATEGORIES = [
    { slug: 'opinion', name: 'Opinion', desc: 'Editorials, columns, and reader perspectives.' },
    { slug: 'news-current-affairs', name: 'News and Current Affairs', desc: 'Breaking news and ongoing coverage.' },
    { slug: 'entertainment', name: 'Entertainment', desc: 'Pop culture, media, and reviews.' },
    { slug: 'metrostyle', name: 'Metrostyle', desc: 'Lifestyle, fashion, and city culture.' },
    { slug: 'sports', name: 'Sports', desc: 'Game coverage and athlete features.' },
    { slug: 'campus-press', name: 'Campus Press', desc: 'School events, clubs, and student life.' }
  ];

  function prefix() {
    return document.body.getAttribute('data-prefix') || '';
  }

  function editPageFor(category) {
    if (category === 'acknowledgement') return 'submit-acknowledgement.html';
    if (category === 'special-features') return 'submit-special-feature.html';
    return 'submit-article.html';
  }

  function currentPageForRedirect() {
    var path = window.location.pathname;
    var marker = '/articles/';
    var idx = path.indexOf(marker);
    if (idx !== -1) return 'articles/' + path.slice(idx + marker.length);
    marker = '/members/';
    idx = path.indexOf(marker);
    if (idx !== -1) return 'members/' + path.slice(idx + marker.length);
    var parts = path.split('/');
    return parts[parts.length - 1] || 'index.html';
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function hasSupabase() {
    if (!global.MulatSupabase) {
      console.error('MulatSupabase is not loaded — check that supabase-client.js is included before newsroom.js.');
      return false;
    }
    return true;
  }

  var cachedMember = null;
  var memberPromise = null;

  function refreshMember() {
    if (!hasSupabase()) {
      cachedMember = null;
      memberPromise = Promise.resolve(null);
      return memberPromise;
    }
    memberPromise = global.MulatSupabase.getCurrentMember().then(function (m) {
      cachedMember = m;
      return m;
    }).catch(function () {
      cachedMember = null;
      return null;
    });
    return memberPromise;
  }

  function ensureMember() {
    if (!memberPromise) return refreshMember();
    return memberPromise;
  }

  function getMember() {
    return cachedMember;
  }

  async function signOutAndRedirect(targetPath) {
    if (hasSupabase()) {
      try { await global.MulatSupabase.signOutMember(); } catch (e) {}
    }
    window.location.href = targetPath;
  }

  // Jang Mee B. Lee is the Editor-in-Chief (EIC)
  function isJangMee() {
    if (!cachedMember) return false;
    return !!cachedMember.isEic || !!cachedMember.canEditAcknowledgement || cachedMember.name === 'Jang Mee B. Lee';
  }

  // Jang Mee can edit ALL articles. Members can ONLY edit their own work.
  function canEditArticle(article) {
    if (!cachedMember) return false;
    if (isJangMee()) return true;
    if (!article) return false;
    if (article.category === 'acknowledgement') return false;
    if (article.authorId && cachedMember.id && article.authorId === cachedMember.id) return true;
    if (article.author && cachedMember.name && article.author.trim().toLowerCase() === cachedMember.name.trim().toLowerCase()) return true;
    return false;
  }

  // Jang Mee can delete ALL articles. Members can ONLY delete their own work.
  function canDeleteArticle(article) {
    if (!cachedMember) return false;
    if (isJangMee()) return true;
    if (!article) return false;
    if (article.category === 'acknowledgement') return false;
    if (article.authorId && cachedMember.id && article.authorId === cachedMember.id) return true;
    if (article.author && cachedMember.name && article.author.trim().toLowerCase() === cachedMember.name.trim().toLowerCase()) return true;
    return false;
  }

  // Only Jang Mee (EIC) can approve pending articles
  function canApproveArticle(article) {
    if (!cachedMember) return false;
    return isJangMee() && (!article || article.status === 'pending');
  }

  function canManageArticle(article) {
    return canEditArticle(article) || canDeleteArticle(article);
  }

  async function getArticlesForCategory(slug) {
    if (!hasSupabase()) return [];
    return await global.MulatSupabase.fetchArticlesForCategory(slug);
  }

  async function getArticleById(id) {
    if (!hasSupabase()) return null;
    return await global.MulatSupabase.fetchArticleById(id);
  }

  async function addArticle(fields) {
    if (!hasSupabase()) return { ok: false, error: 'Not connected to the database.' };
    if (!cachedMember) return { ok: false, error: 'You need to be signed in to publish.' };
    return await global.MulatSupabase.publishArticle(fields, cachedMember);
  }

  async function updateArticle(id, fields) {
    if (!hasSupabase()) return { ok: false, error: 'Not connected to the database.' };
    return await global.MulatSupabase.updateArticleRemote(id, fields);
  }

  async function deleteArticle(id) {
    if (!hasSupabase()) return { ok: false, error: 'Not connected to the database.' };
    return await global.MulatSupabase.deleteArticleRemote(id);
  }

  async function approveArticle(id) {
    if (!hasSupabase()) return { ok: false, error: 'Not connected to the database.' };
    if (!isJangMee()) return { ok: false, error: 'Only Jang Mee (Editor-in-Chief) can approve articles.' };
    return await global.MulatSupabase.approveArticleRemote(id, cachedMember);
  }

  async function renderAuthCta(containerId, options) {
    var el = document.getElementById(containerId || 'authCta');
    if (!el) return;
    var p = prefix();
    await ensureMember();
    var member = getMember();
    options = options || {};
    var addPage = options.addPage || 'submit-article.html';
    var addLabel = options.addLabel || '+ Add Article';
    var canAdd = options.canAdd !== false;

    if (member) {
      var eic = isJangMee();
      var addHtml = canAdd
        ? '<a href="' + p + addPage + '" class="btn-sm">' + escapeHtml(addLabel) + '</a>'
        : '';
      
      var queueLabel = eic ? 'Review Queue' : 'My Submissions';
      var queueHtml = '<a href="' + p + 'review-queue.html" class="btn-sm btn-queue" id="newsroomQueueBtn">' + 
        escapeHtml(queueLabel) + 
        (eic ? ' <span class="badge-count" id="headerPendingCount" style="display:none;"></span>' : '') + 
        '</a>';

      var roleBadge = eic ? '<span class="role-pill">EIC</span>' : '';

      el.innerHTML =
        '<span class="member-badge">Signed in as <strong>' + escapeHtml(member.name) + '</strong> ' + roleBadge + '</span>' +
        queueHtml +
        addHtml +
        '<a href="#" class="logout-link" id="newsroomLogoutLink">Log out</a>';

      var logoutLink = document.getElementById('newsroomLogoutLink');
      if (logoutLink) {
        logoutLink.addEventListener('click', function (e) {
          e.preventDefault();
          signOutAndRedirect(p + 'articles.html');
        });
      }

      // Check pending count for EIC
      if (eic && hasSupabase()) {
        global.MulatSupabase.fetchPendingArticles().then(function (pending) {
          var countEl = document.getElementById('headerPendingCount');
          if (countEl && pending && pending.length > 0) {
            countEl.textContent = String(pending.length);
            countEl.style.display = 'inline-block';
          }
        }).catch(function () {});
      }
    } else {
      var redirectTarget = currentPageForRedirect();
      el.innerHTML = '<a href="' + p + 'login.html?redirect=' + encodeURIComponent(redirectTarget) + '" class="btn-sm">Newsroom Login</a>';
    }
  }

  /* ---------- login page ---------- */
  async function initLoginForm() {
    var form = document.getElementById('loginForm');
    if (!form) return;
    var p = prefix();
    var select = document.getElementById('memberSelect');
    var passwordInput = document.getElementById('accessCode');
    var msg = document.getElementById('loginMsg');

    var redirectParam = new URLSearchParams(window.location.search).get('redirect');
    if (redirectParam && (/^https?:\/\//i.test(redirectParam) || redirectParam.indexOf('//') === 0)) {
      redirectParam = null;
    }
    var redirectTarget = p + (redirectParam || 'articles.html');

    MEMBERS.forEach(function (name) {
      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name + (name === 'Jang Mee B. Lee' ? ' (Editor-in-Chief)' : '');
      select.appendChild(opt);
    });

    await ensureMember();
    if (getMember()) {
      if (redirectParam) {
        window.location.href = redirectTarget;
        return;
      }
      initAccountPanel(p);
      return;
    }

    if (!hasSupabase()) {
      showMsg(msg, 'Sign-in isn\'t connected yet — check the Supabase setup in supabase-client.js.', 'error');
      return;
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var name = select.value;
      var password = (passwordInput.value || '').trim();

      if (!name) {
        showMsg(msg, 'Please select your name.', 'error');
        return;
      }
      if (!password) {
        showMsg(msg, 'Please enter your password.', 'error');
        return;
      }

      showMsg(msg, 'Signing in…', 'success');
      var result = await global.MulatSupabase.signInMember(name, password);
      if (!result.ok) {
        showMsg(msg, result.error || 'That password is incorrect. Check with your editor.', 'error');
        return;
      }

      showMsg(msg, 'Welcome back, ' + name + '. Redirecting…', 'success');
      setTimeout(function () {
        window.location.href = redirectTarget;
      }, 500);
    });
  }

  /* ---------- account panel (change password / log out) ---------- */
  function initAccountPanel(p) {
    var loginForm = document.getElementById('loginForm');
    var panel = document.getElementById('accountPanel');
    if (!panel) return;
    if (loginForm) loginForm.style.display = 'none';
    panel.style.display = '';

    var member = getMember();
    var signedInAs = document.getElementById('accountSignedInAs');
    if (signedInAs && member) {
      var roleText = isJangMee() ? ' (Editor-in-Chief)' : '';
      signedInAs.innerHTML = 'Signed in as <strong>' + escapeHtml(member.name) + '</strong>' + roleText + '.';
    }

    var logoutLink = document.getElementById('accountLogoutLink');
    if (logoutLink) {
      logoutLink.addEventListener('click', function (e) {
        e.preventDefault();
        signOutAndRedirect(p + 'articles.html');
      });
    }

    var form = document.getElementById('changePasswordForm');
    var newPasswordInput = document.getElementById('newPassword');
    var confirmPasswordInput = document.getElementById('confirmPassword');
    var msg = document.getElementById('accountMsg');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var newPassword = newPasswordInput.value || '';
      var confirmPassword = confirmPasswordInput.value || '';

      if (newPassword.length < 6) {
        showMsg(msg, 'Password must be at least 6 characters.', 'error');
        return;
      }
      if (newPassword !== confirmPassword) {
        showMsg(msg, 'Passwords don\'t match.', 'error');
        return;
      }
      if (!hasSupabase()) {
        showMsg(msg, 'Not connected to the database.', 'error');
        return;
      }

      showMsg(msg, 'Updating password…', 'success');
      var result = await global.MulatSupabase.changeMemberPassword(newPassword);
      if (!result.ok) {
        showMsg(msg, result.error || 'Could not update your password.', 'error');
        return;
      }

      form.reset();
      showMsg(msg, 'Password updated.', 'success');
    });
  }

  function initCategoryPicker(config) {
    config = config || {};
    var trigger = document.getElementById('categoryModalTrigger');
    var triggerText = document.getElementById('categoryModalTriggerText');
    var hiddenInput = document.getElementById('articleCategory');
    var overlay = document.getElementById('categoryModalOverlay');
    var closeBtn = document.getElementById('categoryModalClose');
    var list = document.getElementById('categoryModalList');
    if (!trigger || !triggerText || !hiddenInput || !overlay || !list) return null;

    var options = config.options || [];

    function renderList() {
      list.innerHTML = options.map(function (o) {
        var active = hiddenInput.value === o.slug;
        return (
          '<button type="button" class="category-modal-option' + (active ? ' active' : '') + '" data-slug="' + escapeHtml(o.slug) + '">' +
          '<span class="category-modal-option-name">' + escapeHtml(o.name) + '</span>' +
          (o.desc ? '<span class="category-modal-option-desc">' + escapeHtml(o.desc) + '</span>' : '') +
          '</button>'
        );
      }).join('');
    }

    function setValue(slug, name) {
      hiddenInput.value = slug || '';
      triggerText.textContent = slug ? (name || slug) : (config.placeholder || 'Select a section…');
      trigger.classList.toggle('placeholder', !slug);
    }

    function openModal() {
      renderList();
      overlay.hidden = false;
      document.body.classList.add('modal-open');
      trigger.setAttribute('aria-expanded', 'true');
      var focusTarget = list.querySelector('.category-modal-option.active') || list.querySelector('.category-modal-option');
      if (focusTarget) focusTarget.focus();
    }

    function closeModal() {
      overlay.hidden = true;
      document.body.classList.remove('modal-open');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus();
    }

    trigger.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !overlay.hidden) closeModal();
    });
    list.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.category-modal-option') : null;
      if (!btn) return;
      var slug = btn.getAttribute('data-slug');
      var opt = options.filter(function (o) { return o.slug === slug; })[0];
      setValue(slug, opt ? opt.name : slug);
      closeModal();
    });

    if (config.fixedCategory && options[0]) {
      setValue(options[0].slug, options[0].name);
    } else if (hiddenInput.value) {
      var pre = options.filter(function (o) { return o.slug === hiddenInput.value; })[0];
      setValue(hiddenInput.value, pre ? pre.name : hiddenInput.value);
    } else {
      setValue('', '');
    }

    return { setValue: setValue };
  }

  async function initSubmitFormCore(config) {
    config = config || {};
    var form = document.getElementById('articleForm');
    if (!form) return;
    var p = prefix();

    await ensureMember();
    var member = getMember();
    if (!member) {
      var loginRedirect = config.selfPage ? '?redirect=' + encodeURIComponent(config.selfPage) : '';
      window.location.href = p + 'login.html' + loginRedirect;
      return;
    }

    var eic = isJangMee();
    var who = document.getElementById('submitWho');
    if (who) {
      var roleText = eic ? ' (Editor-in-Chief)' : '';
      who.innerHTML = 'Posting as <strong>' + escapeHtml(member.name) + '</strong>' + roleText;
    }
    var logout = document.getElementById('submitLogout');
    if (logout) {
      logout.addEventListener('click', function (e) {
        e.preventDefault();
        signOutAndRedirect(p + (config.logoutRedirect || 'articles.html'));
      });
    }

    var msg = document.getElementById('submitMsg');

    var categoryField = document.getElementById('articleCategory');
    var categoryOptions = config.fixedCategory
      ? [{
          slug: config.fixedCategory,
          name: config.fixedCategoryName || config.fixedCategory,
          desc: config.fixedCategoryDesc || ''
        }]
      : CATEGORIES.map(function (c) {
          return { slug: c.slug, name: c.name, desc: c.desc || '' };
        });
    var categoryPicker = initCategoryPicker({
      options: categoryOptions,
      fixedCategory: config.fixedCategory,
      placeholder: 'Select a section…'
    });

    if (config.fixedCategory && typeof config.requirePermission === 'function' && !config.requirePermission()) {
      showMsg(msg, config.deniedMessage || 'You do not have permission to publish here.', 'error');
      form.hidden = true;
      return;
    }

    var editId = new URLSearchParams(window.location.search).get('edit');
    var editingArticle = editId ? await getArticleById(editId) : null;

    if (editId && !editingArticle) {
      showMsg(msg, 'That article could not be found — it may have already been removed.', 'error');
      form.hidden = true;
      return;
    } else if (editingArticle && config.fixedCategory && editingArticle.category !== config.fixedCategory) {
      showMsg(msg, 'That post isn\'t part of this section.', 'error');
      form.hidden = true;
      return;
    } else if (editingArticle && !canEditArticle(editingArticle)) {
      showMsg(msg, 'You can only edit your own work. Only the author or Jang Mee (Editor-in-Chief) can edit this story.', 'error');
      form.hidden = true;
      return;
    }

    var submitBtnText = document.getElementById('submitBtnText');
    var cardSub = document.getElementById('submitCardSub');

    if (editingArticle) {
      var eyebrow = document.getElementById('submitEyebrow');
      var pageTitle = document.getElementById('submitPageTitle');
      var statement = document.getElementById('submitStatement');
      var cardTitle = document.getElementById('submitCardTitle');
      var cancelBtn = document.getElementById('submitCancelBtn');
      if (eyebrow) eyebrow.textContent = 'Newsroom — Editing Story';
      if (pageTitle) pageTitle.textContent = 'Edit ' + (config.fixedCategoryName ? config.fixedCategoryName.replace(/s$/, '') : 'Article');
      if (statement) statement.textContent = '"Update the story below. Changes are saved right away."';
      if (cardTitle) cardTitle.textContent = 'Edit ' + (config.fixedCategoryName ? config.fixedCategoryName.replace(/s$/, '') : 'Article');
      if (cardSub) {
        if (editingArticle.status === 'pending') {
          cardSub.innerHTML = '<span class="status-badge pending">Pending EIC Review</span> Update this draft before Jang Mee reviews it for publication.';
        } else {
          cardSub.textContent = 'Changes replace the current version of this post for every reader.';
        }
      }
      if (submitBtnText) submitBtnText.textContent = 'Save Changes';
      if (cancelBtn) {
        cancelBtn.hidden = false;
        cancelBtn.addEventListener('click', function () {
          window.location.href = p + 'article.html?id=' + encodeURIComponent(editingArticle.id);
        });
      }

      document.getElementById('articleTitle').value = editingArticle.title || '';
      if (categoryPicker) {
        var editOpt = categoryOptions.filter(function (o) { return o.slug === editingArticle.category; })[0];
        categoryPicker.setValue(editingArticle.category, editOpt ? editOpt.name : editingArticle.category);
      } else if (categoryField) {
        categoryField.value = editingArticle.category || '';
      }
      document.getElementById('articleTag').value = editingArticle.tag || '';
      document.getElementById('articleExcerpt').value = editingArticle.excerpt || '';
      var bodyField = document.getElementById('articleBody');
      if (bodyField) {
        bodyField.value = (editingArticle.body && editingArticle.body.length)
          ? editingArticle.body.join('\n\n')
          : '';
      }
      var rtMatch = /(\d+)/.exec(editingArticle.readTime || '');
      document.getElementById('articleReadTime').value = rtMatch ? rtMatch[1] : '4';
    } else {
      // New article creation
      if (submitBtnText) {
        submitBtnText.textContent = eic 
          ? (config.fixedCategoryName ? 'Publish ' + config.fixedCategoryName.replace(/s$/, '') : 'Publish Article')
          : 'Submit for Peer Review';
      }
      if (cardSub && !eic) {
        cardSub.innerHTML = 'Stories submitted by newsroom members are sent to <strong>Jang Mee (Editor-in-Chief)</strong> for verification and peer review before appearing live on the website.';
      }
    }

    var MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    var pendingImageFile = null;

    var dropzone = document.getElementById('imageDropzone');
    var fileInput = document.getElementById('articleImageFile');
    var dzEmpty = document.getElementById('dropzoneEmpty');
    var dzPreview = document.getElementById('dropzonePreview');
    var dzPreviewImg = document.getElementById('dropzonePreviewImg');
    var dzRemove = document.getElementById('dropzoneRemove');
    var dzError = document.getElementById('dropzoneError');
    var urlInput = document.getElementById('articleImage');

    function showDzError(text) {
      if (!dzError) return;
      dzError.textContent = text;
      dzError.style.display = text ? 'block' : 'none';
    }

    function showPreview(src) {
      if (dzPreviewImg) dzPreviewImg.src = src;
      if (dzEmpty) dzEmpty.hidden = true;
      if (dzPreview) dzPreview.hidden = false;
      if (urlInput) urlInput.value = '';
    }

    function clearPreview() {
      pendingImageFile = null;
      if (dzPreviewImg) dzPreviewImg.src = '';
      if (dzPreview) dzPreview.hidden = true;
      if (dzEmpty) dzEmpty.hidden = false;
      if (fileInput) fileInput.value = '';
    }

    function handleFile(file) {
      showDzError('');
      if (!file) return;
      if (file.type.indexOf('image/') !== 0) {
        showDzError('That file isn\'t an image. Please choose a JPG, PNG, GIF, or WEBP.');
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        showDzError('That image is larger than 5MB. Please choose a smaller file.');
        return;
      }
      pendingImageFile = file;
      var reader = new FileReader();
      reader.onload = function (e) { showPreview(e.target.result); };
      reader.onerror = function () { showDzError('Could not read that file. Please try again.'); };
      reader.readAsDataURL(file);
    }

    if (editingArticle && editingArticle.image) {
      showPreview(editingArticle.image);
    }

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', function () { fileInput.click(); });
      dropzone.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
      });
      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
      });

      ['dragenter', 'dragover'].forEach(function (evt) {
        dropzone.addEventListener(evt, function (e) {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('dragover');
        });
      });
      ['dragleave', 'dragend'].forEach(function (evt) {
        dropzone.addEventListener(evt, function (e) {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('dragover');
        });
      });
      dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
        var files = e.dataTransfer && e.dataTransfer.files;
        if (files && files[0]) handleFile(files[0]);
      });
    }

    if (dzRemove) {
      dzRemove.addEventListener('click', function (e) {
        e.stopPropagation();
        clearPreview();
        showDzError('');
      });
    }

    if (urlInput) {
      urlInput.addEventListener('input', function () {
        if (urlInput.value.trim() && pendingImageFile) clearPreview();
      });
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      var title = document.getElementById('articleTitle').value.trim();
      var category = config.fixedCategory || (categoryField ? categoryField.value : '');
      var tag = document.getElementById('articleTag').value.trim();
      var readTime = document.getElementById('articleReadTime').value || '4';
      var excerpt = document.getElementById('articleExcerpt').value.trim();
      var bodyEl = document.getElementById('articleBody');
      var bodyRaw = bodyEl ? bodyEl.value.trim() : '';

      if (!title || !category || !tag || !excerpt) {
        showMsg(msg, 'Please fill in title, category, tag, and summary.', 'error');
        return;
      }

      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      var imageUrl = document.getElementById('articleImage').value.trim();
      if (pendingImageFile) {
        showMsg(msg, 'Uploading photo…', 'success');
        if (!hasSupabase()) {
          showMsg(msg, 'Not connected to the database.', 'error');
          if (submitBtn) submitBtn.disabled = false;
          return;
        }
        var uploadResult = await global.MulatSupabase.uploadArticlePhoto(pendingImageFile);
        if (!uploadResult.ok) {
          showMsg(msg, uploadResult.error || 'Photo upload failed. Please try again.', 'error');
          if (submitBtn) submitBtn.disabled = false;
          return;
        }
        imageUrl = uploadResult.url;
      } else if (!imageUrl && editingArticle) {
        imageUrl = editingArticle.image || '';
      }

      var catName = config.fixedCategory
        ? (config.fixedCategoryName || category)
        : (CATEGORIES.filter(function (c) { return c.slug === category; })[0] || {}).name || category;

      var bodyParas = bodyRaw
        ? bodyRaw.split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean)
        : [excerpt];

      if (editingArticle) {
        var updated = await updateArticle(editingArticle.id, {
          category: category,
          categoryName: catName,
          tag: tag,
          title: title,
          excerpt: excerpt,
          body: bodyParas,
          image: imageUrl,
          readTime: readTime + ' min read'
        });
        if (submitBtn) submitBtn.disabled = false;
        if (!updated.ok) {
          showMsg(msg, updated.error || 'You do not have permission to save changes to this post.', 'error');
          return;
        }
        showMsg(msg, 'Changes saved. Redirecting…', 'success');
        setTimeout(function () {
          window.location.href = p + 'article.html?id=' + encodeURIComponent(editingArticle.id);
        }, 600);
        return;
      }

      var published = await addArticle({
        category: category,
        categoryName: catName,
        tag: tag,
        title: title,
        excerpt: excerpt,
        body: bodyParas,
        image: imageUrl,
        readTime: readTime + ' min read'
      });

      if (submitBtn) submitBtn.disabled = false;
      if (!published.ok) {
        showMsg(msg, published.error || 'You do not have permission to publish to that section.', 'error');
        return;
      }

      form.reset();
      clearPreview();

      if (eic) {
        showMsg(msg, (config.fixedCategoryName ? config.fixedCategoryName : catName) + ' published successfully. Redirecting…', 'success');
        setTimeout(function () {
          window.location.href = p + (config.redirectPage || 'articles/' + category + '.html');
        }, 700);
      } else {
        showMsg(msg, 'Story submitted for peer review! Jang Mee (Editor-in-Chief) will review and verify your article before it appears on the website. Redirecting to your submissions…', 'success');
        setTimeout(function () {
          window.location.href = p + 'review-queue.html';
        }, 1200);
      }
    });
  }

  /* ---------- submit-article.html — general categories ---------- */
  function initSubmitForm() {
    return initSubmitFormCore({});
  }

  /* ---------- submit-acknowledgement.html — restricted editor only ---------- */
  function initSubmitAcknowledgementForm() {
    return initSubmitFormCore({
      fixedCategory: 'acknowledgement',
      fixedCategoryName: 'Acknowledgement',
      fixedCategoryDesc: 'Reminders and announcements from the newsroom.',
      requirePermission: isJangMee,
      deniedMessage: 'Only Jang Mee B. Lee (Editor-in-Chief) has permission to publish to Acknowledgement.',
      redirectPage: 'acknowledgement.html',
      selfPage: 'submit-acknowledgement.html',
      logoutRedirect: 'acknowledgement.html'
    });
  }

  /* ---------- submit-special-feature.html — essays & features ---------- */
  function initSubmitSpecialFeatureForm() {
    return initSubmitFormCore({
      fixedCategory: 'special-features',
      fixedCategoryName: 'Special Features',
      fixedCategoryDesc: 'Short essays and feature-style writing.',
      redirectPage: 'special-features.html',
      selfPage: 'submit-special-feature.html',
      logoutRedirect: 'special-features.html'
    });
  }

  function ownerActionsHtml(a, p) {
    var isPending = a.status === 'pending';
    return (
      '<div class="card-owner-actions" data-owner-actions ' +
      'data-category="' + escapeHtml(a.category) + '" ' +
      'data-author-id="' + escapeHtml(a.authorId || '') + '" ' +
      'data-author-name="' + escapeHtml(a.author || '') + '" ' +
      'data-status="' + escapeHtml(a.status || 'approved') + '" hidden>' +
      (isPending ? '<span class="status-badge pending">Pending EIC Review</span>' : '') +
      '  <a href="' + p + editPageFor(a.category) + '?edit=' + encodeURIComponent(a.id) + '" class="card-edit-link" data-action="edit">Edit</a>' +
      '  <button type="button" class="card-delete-btn" data-delete-id="' + escapeHtml(String(a.id)) + '" data-delete-title="' + escapeHtml(a.title) + '" data-action="delete">Delete</button>' +
      '</div>'
    );
  }

  function revealOwnerActions(root) {
    var scope = root || document;
    var member = getMember();
    var eic = isJangMee();
    Array.prototype.forEach.call(scope.querySelectorAll('[data-owner-actions]'), function (el) {
      if (!member) {
        el.hidden = true;
        return;
      }
      var category = el.getAttribute('data-category') || '';
      var authorId = el.getAttribute('data-author-id') || '';
      var authorName = el.getAttribute('data-author-name') || '';

      var isOwner = (authorId && member.id && authorId === member.id) ||
                    (authorName && authorName.trim().toLowerCase() === member.name.trim().toLowerCase());

      var canEdit = eic || (isOwner && category !== 'acknowledgement');
      var canDelete = eic || (isOwner && category !== 'acknowledgement');

      var editLink = el.querySelector('[data-action="edit"]');
      var deleteBtn = el.querySelector('[data-action="delete"]');

      if (editLink) editLink.hidden = !canEdit;
      if (deleteBtn) deleteBtn.hidden = !canDelete;

      el.hidden = !canEdit && !canDelete;
    });
  }

  function wireDeleteButtons(root, onDeleted) {
    var scope = root || document;
    Array.prototype.forEach.call(scope.querySelectorAll('.card-delete-btn'), function (btn) {
      btn.addEventListener('click', async function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!getMember()) return;
        var id = btn.getAttribute('data-delete-id');
        var title = btn.getAttribute('data-delete-title') || 'this article';
        if (!window.confirm('Delete "' + title + '"? This can\'t be undone.')) return;
        var result = await deleteArticle(id);
        if (result.ok) {
          if (typeof onDeleted === 'function') onDeleted(id);
        } else {
          window.alert(result.error || 'You do not have permission to delete this.');
        }
      });
    });
  }

  function metaLine(a) {
    var rt = a.readTime || '';
    if (rt && !/min read/.test(rt)) rt = rt + ' min read';
    if (a.author && a.author !== 'Mulat Media Newsroom') {
      return 'By ' + escapeHtml(a.author) + (a.date ? ' &middot; ' + escapeHtml(a.date) : '') + (rt ? ' &middot; ' + escapeHtml(rt) : '');
    }
    return escapeHtml(a.categoryName || '') + (rt ? ' &middot; ' + escapeHtml(rt) : '');
  }

  async function renderCategoryFeed(categorySlug) {
    var featureEl = document.getElementById('categoryFeature');
    var moreSection = document.getElementById('categoryMoreSection');
    var moreGrid = document.getElementById('moreFromCategoryGrid');
    var emptyNote = document.getElementById('categoryEmptyNote');
    if (!featureEl || !moreGrid) return;
    var p = prefix();

    await ensureMember();
    var items = await getArticlesForCategory(categorySlug);

    if (!items.length) {
      featureEl.innerHTML = '';
      if (moreSection) moreSection.hidden = true;
      if (emptyNote) emptyNote.hidden = false;
      return;
    }
    if (emptyNote) emptyNote.hidden = true;

    var featured = items.slice(0, 3);
    var rest = items.slice(3);
    var main = featured[0];
    var secondary = featured.slice(1);

    var mainMedia = main.image
      ? '<img src="' + escapeHtml(main.image) + '" alt="' + escapeHtml(main.title) + '" onerror="this.closest(\'figure\').hidden=true;">'
      : '';

    var featureHtml =
      '<article class="main-story">' +
      (mainMedia ? '<figure class="main-story-media">' + mainMedia + '</figure>' : '') +
      '  <span class="tag">' + escapeHtml(main.tag) + '</span>' +
      '  <h2>' + escapeHtml(main.title) + '</h2>' +
      '  <div class="meta">' + metaLine(main) + '</div>' +
      '  <p>' + escapeHtml(main.excerpt) + '</p>' +
      '  <a href="' + p + 'article.html?id=' + encodeURIComponent(main.id) + '" class="read-more">Continue Reading &rarr;</a>' +
      ownerActionsHtml(main, p) +
      '</article>' +
      '<div class="secondary-stories">' +
      secondary.map(function (a) {
        return (
          '<div class="story-card">' +
          '  <span class="tag">' + escapeHtml(a.tag) + '</span>' +
          '  <h3>' + escapeHtml(a.title) + '</h3>' +
          '  <p>' + escapeHtml(a.excerpt) + '</p>' +
          '  <div class="meta">' + metaLine(a) + '</div>' +
          '  <a href="' + p + 'article.html?id=' + encodeURIComponent(a.id) + '" class="read-more">Continue Reading &rarr;</a>' +
          ownerActionsHtml(a, p) +
          '</div>'
        );
      }).join('') +
      '</div>';

    featureEl.innerHTML = featureHtml;

    if (rest.length) {
      moreGrid.innerHTML = rest.map(function (a) {
        var media = a.image
          ? '<img src="' + escapeHtml(a.image) + '" alt="' + escapeHtml(a.title) + '" onerror="this.parentElement.innerHTML=\'<div class=&quot;no-image&quot;>' + escapeHtml(a.categoryName) + '</div>\'">'
          : '<div class="no-image">' + escapeHtml(a.categoryName) + '</div>';
        return (
          '<div class="story-card">' +
          '  <div class="story-card-media">' + media + '</div>' +
          '  <span class="tag">' + escapeHtml(a.tag) + '</span>' +
          '  <h3>' + escapeHtml(a.title) + '</h3>' +
          '  <p>' + escapeHtml(a.excerpt) + '</p>' +
          '  <div class="meta">' + metaLine(a) + '</div>' +
          '  <a href="' + p + 'article.html?id=' + encodeURIComponent(a.id) + '" class="read-more">Continue Reading &rarr;</a>' +
          ownerActionsHtml(a, p) +
          '</div>'
        );
      }).join('');
      if (moreSection) moreSection.hidden = false;
    } else {
      moreGrid.innerHTML = '';
      if (moreSection) moreSection.hidden = true;
    }

    revealOwnerActions(document);
    wireDeleteButtons(document, function () { renderCategoryFeed(categorySlug); });
  }

  function showMsg(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = 'form-msg show ' + type;
  }

  function initCategoryTabsScroll() {
    var outers = document.querySelectorAll('.tabs-scroll-outer');
    Array.prototype.forEach.call(outers, function (outer) {
      var scrollEl = outer.querySelector('.tabs-scroll');
      var wrapEl = outer.querySelector('.tabs-scroll-wrap');
      var prevBtn = outer.querySelector('.tabs-scroll-arrow.prev');
      var nextBtn = outer.querySelector('.tabs-scroll-arrow.next');
      if (!scrollEl) return;

      function update() {
        var overflowing = scrollEl.scrollWidth > scrollEl.clientWidth + 1;
        var atStart = scrollEl.scrollLeft <= 1;
        var atEnd = scrollEl.scrollLeft >= scrollEl.scrollWidth - scrollEl.clientWidth - 1;

        if (prevBtn) prevBtn.classList.toggle('is-visible', overflowing && !atStart);
        if (nextBtn) nextBtn.classList.toggle('is-visible', overflowing && !atEnd);
        if (wrapEl) {
          wrapEl.classList.toggle('can-scroll-left', overflowing && !atStart);
          wrapEl.classList.toggle('can-scroll-right', overflowing && !atEnd);
        }
      }

      if (prevBtn) {
        prevBtn.addEventListener('click', function () {
          scrollEl.scrollBy({ left: -160, behavior: 'smooth' });
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', function () {
          scrollEl.scrollBy({ left: 160, behavior: 'smooth' });
        });
      }

      scrollEl.addEventListener('scroll', update);
      window.addEventListener('resize', update);

      var activeTab = scrollEl.querySelector('a.active');
      if (activeTab) {
        var target = activeTab.offsetLeft - (scrollEl.clientWidth - activeTab.offsetWidth) / 2;
        scrollEl.scrollLeft = Math.max(0, target);
      }

      update();
    });
  }

  document.addEventListener('DOMContentLoaded', initCategoryTabsScroll);

  /* ---------- review-queue.html — EIC Verification & Member Submissions ---------- */
  async function initReviewQueuePage() {
    var p = prefix();
    await ensureMember();
    var member = getMember();

    if (!member) {
      window.location.href = p + 'login.html?redirect=review-queue.html';
      return;
    }

    var eic = isJangMee();
    var pageTitle = document.getElementById('queuePageTitle');
    var pageStatement = document.getElementById('queuePageStatement');
    var whoEl = document.getElementById('queueWho');
    var tabPending = document.getElementById('tabPending');
    var tabAll = document.getElementById('tabAll');
    var listContainer = document.getElementById('queueList');
    var emptyEl = document.getElementById('queueEmpty');
    var statsBar = document.getElementById('queueStats');

    if (whoEl) {
      var roleText = eic ? ' (Editor-in-Chief)' : '';
      whoEl.innerHTML = 'Signed in as <strong>' + escapeHtml(member.name) + '</strong>' + roleText;
    }

    if (pageTitle) {
      pageTitle.textContent = eic ? 'Editorial Review Queue' : 'My Submissions';
    }
    if (pageStatement) {
      pageStatement.textContent = eic
        ? '"Verify, edit, approve, or reject stories submitted by newsroom members before publishing."'
        : '"Track the peer review status of your articles and edit your submissions."';
    }

    var currentTab = 'pending';

    async function loadArticles() {
      listContainer.innerHTML = '<div class="queue-loading">Loading articles…</div>';
      var articles = [];
      if (eic) {
        if (currentTab === 'pending') {
          articles = await global.MulatSupabase.fetchPendingArticles();
        } else {
          articles = await global.MulatSupabase.fetchAllArticles();
        }
      } else {
        var mySubmissions = await global.MulatSupabase.fetchMemberSubmissions(member.id, member.name);
        if (currentTab === 'pending') {
          articles = mySubmissions.filter(function (a) { return a.status === 'pending'; });
        } else {
          articles = mySubmissions;
        }
      }

      renderList(articles);
    }

    function renderList(articles) {
      if (!articles || !articles.length) {
        listContainer.innerHTML = '';
        if (emptyEl) {
          emptyEl.hidden = false;
          emptyEl.textContent = currentTab === 'pending'
            ? (eic ? 'No articles currently awaiting review. All caught up!' : 'You have no pending submissions awaiting review.')
            : 'No articles found in this view.';
        }
        return;
      }

      if (emptyEl) emptyEl.hidden = true;

      listContainer.innerHTML = articles.map(function (a) {
        var isPending = a.status === 'pending';
        var statusBadge = isPending
          ? '<span class="status-badge pending">&#9203; Pending EIC Verification</span>'
          : '<span class="status-badge approved">&#10003; Published Live</span>';

        var mediaHtml = a.image
          ? '<div class="queue-card-thumb"><img src="' + escapeHtml(a.image) + '" alt=""></div>'
          : '<div class="queue-card-thumb placeholder"><span>' + escapeHtml(a.categoryName) + '</span></div>';

        var approveBtnHtml = (eic && isPending)
          ? '<button type="button" class="btn-approve" data-approve-id="' + escapeHtml(String(a.id)) + '">&#10003; Approve &amp; Publish</button>'
          : '';

        var canEditThis = canEditArticle(a);
        var canDeleteThis = canDeleteArticle(a);

        var editBtnHtml = canEditThis
          ? '<a href="' + p + editPageFor(a.category) + '?edit=' + encodeURIComponent(a.id) + '" class="btn-queue-action btn-edit">Edit</a>'
          : '';

        var deleteBtnHtml = canDeleteThis
          ? '<button type="button" class="btn-queue-action btn-delete" data-delete-id="' + escapeHtml(String(a.id)) + '" data-delete-title="' + escapeHtml(a.title) + '">Delete</button>'
          : '';

        return (
          '<div class="queue-card' + (isPending ? ' is-pending' : '') + '">' +
          mediaHtml +
          '<div class="queue-card-body">' +
          '  <div class="queue-card-header">' +
          '    <span class="tag">' + escapeHtml(a.tag || a.categoryName) + ' &middot; ' + escapeHtml(a.categoryName) + '</span>' +
          '    ' + statusBadge +
          '  </div>' +
          '  <h3 class="queue-card-title">' + escapeHtml(a.title) + '</h3>' +
          '  <div class="queue-card-meta">' + metaLine(a) + '</div>' +
          '  <p class="queue-card-excerpt">' + escapeHtml(a.excerpt) + '</p>' +
          '  <div class="queue-card-actions">' +
          '    <a href="' + p + 'article.html?id=' + encodeURIComponent(a.id) + '" class="btn-queue-action btn-preview">Preview Full Story &rarr;</a>' +
          approveBtnHtml +
          editBtnHtml +
          deleteBtnHtml +
          '  </div>' +
          '</div>' +
          '</div>'
        );
      }).join('');

      // Wire up approval buttons
      Array.prototype.forEach.call(listContainer.querySelectorAll('.btn-approve'), function (btn) {
        btn.addEventListener('click', async function (e) {
          e.preventDefault();
          var id = btn.getAttribute('data-approve-id');
          btn.disabled = true;
          btn.textContent = 'Approving…';
          var res = await approveArticle(id);
          if (res.ok) {
            loadArticles();
          } else {
            window.alert(res.error || 'Approval failed.');
            btn.disabled = false;
            btn.textContent = 'Approve & Publish';
          }
        });
      });

      // Wire up delete buttons
      wireDeleteButtons(listContainer, function () { loadArticles(); });
    }

    if (tabPending) {
      tabPending.addEventListener('click', function () {
        currentTab = 'pending';
        tabPending.classList.add('active');
        if (tabAll) tabAll.classList.remove('active');
        loadArticles();
      });
    }

    if (tabAll) {
      tabAll.addEventListener('click', function () {
        currentTab = 'all';
        tabAll.classList.add('active');
        if (tabPending) tabPending.classList.remove('active');
        loadArticles();
      });
    }

    loadArticles();
  }

  global.MulatNewsroom = {
    MEMBERS: MEMBERS,
    CATEGORIES: CATEGORIES,
    isJangMee: isJangMee,
    canManageArticle: canManageArticle,
    canEditArticle: canEditArticle,
    canDeleteArticle: canDeleteArticle,
    canApproveArticle: canApproveArticle,
    editPageFor: editPageFor,
    getMember: getMember,
    ensureMember: ensureMember,
    refreshMember: refreshMember,
    getArticlesForCategory: getArticlesForCategory,
    getArticleById: getArticleById,
    addArticle: addArticle,
    updateArticle: updateArticle,
    deleteArticle: deleteArticle,
    approveArticle: approveArticle,
    ownerActionsHtml: ownerActionsHtml,
    revealOwnerActions: revealOwnerActions,
    wireDeleteButtons: wireDeleteButtons,
    renderAuthCta: renderAuthCta,
    initLoginForm: initLoginForm,
    initSubmitForm: initSubmitForm,
    initSubmitAcknowledgementForm: initSubmitAcknowledgementForm,
    initSubmitSpecialFeatureForm: initSubmitSpecialFeatureForm,
    initReviewQueuePage: initReviewQueuePage,
    renderCategoryFeed: renderCategoryFeed,
    initCategoryTabsScroll: initCategoryTabsScroll
  };
})(window);

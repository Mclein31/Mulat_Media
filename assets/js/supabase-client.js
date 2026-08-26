(function (global) {

  var SUPABASE_URL = 'https://rjbkeadhidccpduedaqb.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_YoZ5tS4hJBfLBVQifhdeZA_cC3egO6P';

  if (!global.supabase) {
    console.error('Supabase library not found — add the CDN script tag before supabase-client.js.');
    return;
  }

  var client = global.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  var MEMBER_EMAILS = {
    'Jang Mee B. Lee': 'jangmee@mulatmedia.local',
    'Maxene Q. Baggao': 'maxene@mulatmedia.local',
    'Kaizen C. Rodriguez': 'kaizen@mulatmedia.local',
    'Kyla Rex Jaime': 'kyla@mulatmedia.local',
    'Macy Ollagangi': 'macy@mulatmedia.local',
    'Mharielle B. Binondo': 'mharielle@mulatmedia.local',
    'Zildjian Faith F. Toledo': 'zildjian@mulatmedia.local'
  };

  async function signInMember(name, password) {
    var email = MEMBER_EMAILS[name];
    if (!email) return { ok: false, error: 'Unrecognized member.' };
    var result = await client.auth.signInWithPassword({ email: email, password: password });
    if (result.error) return { ok: false, error: result.error.message };
    
    // Auto-ensure profile exists in profiles table
    if (result.data && result.data.user) {
      await ensureProfile(result.data.user, name);
    }
    return { ok: true };
  }

  async function signOutMember() {
    await client.auth.signOut();
  }

  async function ensureProfile(user, optionalName) {
    if (!user || !user.id) return;
    try {
      var name = optionalName || (user.user_metadata && user.user_metadata.name) || user.email;
      var isEic = (name === 'Jang Mee B. Lee' || user.email === 'jangmee@mulatmedia.local');
      await client.from('profiles').upsert({
        id: user.id,
        name: name,
        is_eic: isEic,
        can_edit_acknowledgement: isEic
      }, { onConflict: 'id' });
    } catch (e) {
      // Profile sync notice
    }
  }

  async function getCurrentMember() {
    try {
      var sessionResult = await client.auth.getSession();
      var session = sessionResult.data && sessionResult.data.session;
      if (!session) return null;

      var profileResult = await client
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      var profile = profileResult && profileResult.data;
      var name = (profile && profile.name) ||
                 (session.user.user_metadata && session.user.user_metadata.name) ||
                 session.user.email;

      var isEic = (profile && (!!profile.is_eic || !!profile.can_edit_acknowledgement)) ||
                  name === 'Jang Mee B. Lee' ||
                  session.user.email === 'jangmee@mulatmedia.local';

      return {
        id: session.user.id,
        name: name,
        isEic: isEic,
        canEditAcknowledgement: isEic || (profile && !!profile.can_edit_acknowledgement)
      };
    } catch (e) {
      console.error('Error fetching current member:', e);
      return null;
    }
  }

  function onMemberChange(cb) {
    client.auth.onAuthStateChange(function () {
      getCurrentMember().then(cb);
    });
  }

  // Lets a signed-in member set a new password for themselves.
  async function changeMemberPassword(newPassword) {
    if (!newPassword || newPassword.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }
    var result = await client.auth.updateUser({ password: newPassword });
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true };
  }

  function rowToArticle(row) {
    if (!row) return null;
    return {
      id: row.id,
      category: row.category,
      categoryName: row.category_name,
      tag: row.tag,
      title: row.title,
      excerpt: row.excerpt,
      body: row.body || [],
      image: row.image,
      readTime: row.read_time,
      author: row.author_name,
      authorId: row.author_id,
      status: row.status || 'approved',
      reviewedAt: row.reviewed_at,
      reviewedBy: row.reviewed_by,
      date: new Date(row.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    };
  }

  // Public category feed: returns approved articles only
  async function fetchArticlesForCategory(category) {
    try {
      var query = client
        .from('articles')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false });

      var result = await query;
      if (result.error) {
        console.error(result.error);
        return [];
      }
      return result.data
        .filter(function (r) { return !r.status || r.status === 'approved'; })
        .map(rowToArticle);
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async function fetchArticleById(id) {
    try {
      var result = await client
        .from('articles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (result.error || !result.data) return null;
      return rowToArticle(result.data);
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  // Fetch pending articles awaiting EIC review
  async function fetchPendingArticles() {
    try {
      var result = await client
        .from('articles')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (result.error) {
        console.error('fetchPendingArticles error:', result.error);
        return [];
      }
      return (result.data || []).map(rowToArticle);
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  // Fetch all submissions by a specific author
  async function fetchMemberSubmissions(memberId, memberName) {
    try {
      var all = [];
      if (memberId) {
        var idRes = await client
          .from('articles')
          .select('*')
          .eq('author_id', memberId)
          .order('created_at', { ascending: false });
        if (!idRes.error && idRes.data && idRes.data.length > 0) {
          all = idRes.data;
        }
      }

      if (all.length === 0 && memberName) {
        var nameRes = await client
          .from('articles')
          .select('*')
          .eq('author_name', memberName)
          .order('created_at', { ascending: false });
        if (!nameRes.error && nameRes.data && nameRes.data.length > 0) {
          all = nameRes.data;
        }
      }

      // Fallback: general query filtered client-side if RLS allows
      if (all.length === 0) {
        var generalRes = await client
          .from('articles')
          .select('*')
          .order('created_at', { ascending: false });
        if (!generalRes.error && generalRes.data) {
          all = generalRes.data.filter(function (a) {
            return (memberId && a.author_id === memberId) || 
                   (memberName && a.author_name && a.author_name.trim().toLowerCase() === memberName.trim().toLowerCase());
          });
        }
      }

      return all.map(rowToArticle);
    } catch (e) {
      console.error('fetchMemberSubmissions error:', e);
      return [];
    }
  }

  // Fetch all articles (both approved and pending) for EIC review management
  async function fetchAllArticles() {
    try {
      var result = await client
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });
      if (result.error) {
        console.error('fetchAllArticles error:', result.error);
        return [];
      }
      return (result.data || []).map(rowToArticle);
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  // Publish article: if Jang Mee (EIC) submits, status is 'approved'.
  // If other members submit, status is 'pending' for EIC peer review.
  async function publishArticle(fields, member) {
    try {
      var isEic = !!member.isEic || !!member.canEditAcknowledgement || member.name === 'Jang Mee B. Lee';
      var status = isEic ? 'approved' : 'pending';

      var payload = {
        category: fields.category,
        category_name: fields.categoryName,
        tag: fields.tag,
        title: fields.title,
        excerpt: fields.excerpt,
        body: fields.body,
        image: fields.image || null,
        read_time: fields.readTime,
        author_id: member.id,
        author_name: member.name,
        status: status
      };

      if (isEic) {
        payload.reviewed_at = new Date().toISOString();
        payload.reviewed_by = member.id;
      }

      var result = await client
        .from('articles')
        .insert(payload)
        .select();

      if (result.error) {
        console.error('publishArticle Supabase error:', result.error);
        return { ok: false, error: result.error.message };
      }

      var createdRow = (result.data && result.data.length) ? result.data[0] : payload;
      return { ok: true, article: rowToArticle(createdRow), status: status };
    } catch (e) {
      console.error('publishArticle exception:', e);
      return { ok: false, error: e.message || 'Error publishing article' };
    }
  }

  // Approve a pending article (EIC only)
  async function approveArticleRemote(id, reviewerMember) {
    try {
      var payload = {
        status: 'approved',
        reviewed_at: new Date().toISOString()
      };
      if (reviewerMember && reviewerMember.id) {
        payload.reviewed_by = reviewerMember.id;
      }

      var result = await client
        .from('articles')
        .update(payload)
        .eq('id', id)
        .select();

      if (result.error) {
        return { ok: false, error: result.error.message };
      }
      if (!result.data || !result.data.length) {
        return { ok: false, error: 'Could not approve article. Check database permissions.' };
      }
      return { ok: true, article: rowToArticle(result.data[0]) };
    } catch (e) {
      return { ok: false, error: e.message || 'Error approving article' };
    }
  }

  async function updateArticleRemote(id, fields) {
    try {
      var payload = {};
      if (fields.category !== undefined) payload.category = fields.category;
      if (fields.categoryName !== undefined) payload.category_name = fields.categoryName;
      if (fields.tag !== undefined) payload.tag = fields.tag;
      if (fields.title !== undefined) payload.title = fields.title;
      if (fields.excerpt !== undefined) payload.excerpt = fields.excerpt;
      if (fields.body !== undefined) payload.body = fields.body;
      if (fields.image !== undefined) payload.image = fields.image;
      if (fields.readTime !== undefined) payload.read_time = fields.readTime;
      if (fields.status !== undefined) payload.status = fields.status;

      var result = await client
        .from('articles')
        .update(payload)
        .eq('id', id)
        .select();
      if (result.error) return { ok: false, error: result.error.message };

      if (!result.data || !result.data.length) {
        return { ok: false, error: 'You do not have permission to edit this post.' };
      }
      return { ok: true, article: rowToArticle(result.data[0]) };
    } catch (e) {
      return { ok: false, error: e.message || 'Error updating article' };
    }
  }

  async function deleteArticleRemote(id) {
    try {
      var result = await client
        .from('articles')
        .delete()
        .eq('id', id)
        .select();
      if (result.error) return { ok: false, error: result.error.message };
      if (!result.data || !result.data.length) {
        return { ok: false, error: 'You do not have permission to delete this post.' };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Error deleting article' };
    }
  }

  async function uploadArticlePhoto(file) {
    try {
      var path = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      var uploadResult = await client.storage.from('article-photos').upload(path, file);
      if (uploadResult.error) {
        if (uploadResult.error.message && uploadResult.error.message.toLowerCase().includes('bucket not found')) {
          return {
            ok: false,
            error: 'Storage bucket "article-photos" not found in Supabase. Please run the SQL snippet to create the bucket or create a public bucket named "article-photos" under Storage in your Supabase dashboard.'
          };
        }
        return { ok: false, error: uploadResult.error.message };
      }
      var publicUrlResult = client.storage.from('article-photos').getPublicUrl(path);
      return { ok: true, url: publicUrlResult.data.publicUrl };
    } catch (e) {
      return { ok: false, error: e.message || 'Photo upload failed' };
    }
  }

  global.MulatSupabase = {
    client: client,
    signInMember: signInMember,
    signOutMember: signOutMember,
    getCurrentMember: getCurrentMember,
    onMemberChange: onMemberChange,
    changeMemberPassword: changeMemberPassword,
    fetchArticlesForCategory: fetchArticlesForCategory,
    fetchArticleById: fetchArticleById,
    fetchPendingArticles: fetchPendingArticles,
    fetchMemberSubmissions: fetchMemberSubmissions,
    fetchAllArticles: fetchAllArticles,
    publishArticle: publishArticle,
    approveArticleRemote: approveArticleRemote,
    updateArticleRemote: updateArticleRemote,
    deleteArticleRemote: deleteArticleRemote,
    uploadArticlePhoto: uploadArticlePhoto
    
  };

})(window);

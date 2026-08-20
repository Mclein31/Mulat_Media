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
    return { ok: true };
  }

  async function signOutMember() {
    await client.auth.signOut();
  }

  async function getCurrentMember() {
    var sessionResult = await client.auth.getSession();
    var session = sessionResult.data && sessionResult.data.session;
    if (!session) return null;

    var profileResult = await client
      .from('profiles')
      .select('name, can_edit_acknowledgement')
      .eq('id', session.user.id)
      .single();

    if (profileResult.error || !profileResult.data) return null;

    return {
      id: session.user.id,
      name: profileResult.data.name,
      canEditAcknowledgement: !!profileResult.data.can_edit_acknowledgement
    };
  }

  function onMemberChange(cb) {
    client.auth.onAuthStateChange(function () {
      getCurrentMember().then(cb);
    });
  }

  // Lets a signed-in member set a new password for themselves.
  // Supabase trusts the active session here — it doesn't ask for the
  // current password — so callers should re-verify it first (e.g. via
  // signInMember) if they want that extra confirmation step.
  // Returns { ok: true } or { ok: false, error }.
  async function changeMemberPassword(newPassword) {
    if (!newPassword || newPassword.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }
    var result = await client.auth.updateUser({ password: newPassword });
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true };
  }

  function rowToArticle(row) {
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
      date: new Date(row.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    };
  }

  async function fetchArticlesForCategory(category) {
    var result = await client
      .from('articles')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });
    if (result.error) {
      console.error(result.error);
      return [];
    }
    return result.data.map(rowToArticle);
  }

  async function fetchArticleById(id) {
    var result = await client
      .from('articles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (result.error || !result.data) return null;
    return rowToArticle(result.data);
  }

  async function publishArticle(fields, member) {
    var result = await client
      .from('articles')
      .insert({
        category: fields.category,
        category_name: fields.categoryName,
        tag: fields.tag,
        title: fields.title,
        excerpt: fields.excerpt,
        body: fields.body,
        image: fields.image || null,
        read_time: fields.readTime,
        author_id: member.id,
        author_name: member.name
      })
      .select()
      .single();
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true, article: rowToArticle(result.data) };
  }

  async function updateArticleRemote(id, fields) {
    var payload = {};
    if (fields.category !== undefined) payload.category = fields.category;
    if (fields.categoryName !== undefined) payload.category_name = fields.categoryName;
    if (fields.tag !== undefined) payload.tag = fields.tag;
    if (fields.title !== undefined) payload.title = fields.title;
    if (fields.excerpt !== undefined) payload.excerpt = fields.excerpt;
    if (fields.body !== undefined) payload.body = fields.body;
    if (fields.image !== undefined) payload.image = fields.image;
    if (fields.readTime !== undefined) payload.read_time = fields.readTime;

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
  }

  async function deleteArticleRemote(id) {
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
  }


  async function uploadArticlePhoto(file) {
    var path = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    var uploadResult = await client.storage.from('article-photos').upload(path, file);
    if (uploadResult.error) return { ok: false, error: uploadResult.error.message };
    var publicUrlResult = client.storage.from('article-photos').getPublicUrl(path);
    return { ok: true, url: publicUrlResult.data.publicUrl };
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
    publishArticle: publishArticle,
    updateArticleRemote: updateArticleRemote,
    deleteArticleRemote: deleteArticleRemote,
    uploadArticlePhoto: uploadArticlePhoto
  };

})(window);



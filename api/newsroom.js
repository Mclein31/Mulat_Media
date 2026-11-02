const { Pool } = require('pg');
const { attachDatabasePool } = require('@vercel/functions');
const { staffForEmail, memberForUser, canManage } = require('../lib/staff.cjs');
let pool;
function db() {
  if (!process.env.DATABASE_URL) throw Object.assign(new Error('Backend setup is not complete.'), {status:503});
  if (!pool) { pool = new Pool({connectionString:process.env.DATABASE_URL, max:5}); attachDatabasePool(pool); }
  return pool;
}
const httpError = (status, message) => Object.assign(new Error(message), {status});
let jwtTools;
async function identity(req) {
  const authorization = req.headers.authorization;
  if (!authorization) return null;
  const match = /^Bearer (\S+)$/.exec(authorization);
  if (!match) throw httpError(401,'Please sign in again.');
  if (!jwtTools) {
    const {createRemoteJWKSet, jwtVerify} = await import('jose');
    jwtTools = {jwtVerify, keys:createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL))};
  }
  let payload;
  try { ({payload} = await jwtTools.jwtVerify(match[1],jwtTools.keys,{issuer:new URL(process.env.NEON_AUTH_BASE_URL).origin,audience:new URL(process.env.NEON_AUTH_BASE_URL).origin,algorithms:['EdDSA']})); }
  catch { throw httpError(401,'Please sign in again.'); }
  // Read the authoritative account, including verification/revocation state.
  const {rows} = await db().query('SELECT id, email, "emailVerified", banned FROM neon_auth."user" WHERE id::text=$1',[payload.sub]);
  const user = rows[0];
  const member = user && !user.banned && memberForUser(user);
  if (!member) throw httpError(403,'A verified, approved staff email is required.');
  return member;
}
async function requireMember(req) {
  const member = await identity(req);
  if (!member) throw httpError(401,'Please sign in.');
  return member;
}
const editor = member => Boolean(member && (member.isEic || member.isAdmin));
const columns = ['category','category_name','tag','title','excerpt','body','image','read_time'];
const categories = new Set(['opinion','news-current-affairs','entertainment','metrostyle','sports','campus-press','special-features','acknowledgement']);
function fields(body, partial=false) {
  const result={};
  for (const key of columns) {
    if (body[key] === undefined && partial) continue;
    const value=body[key];
    if (key==='body') {
      if (!Array.isArray(value) || value.length>1000 || value.some(v=>typeof v!=='string' || v.length>100000)) throw httpError(400,'Invalid article body.');
    } else if ((key==='image'||key==='read_time') && (value===null||value===undefined)) {result[key]=null;continue;}
    else if (typeof value!=='string' || value.length>100000 || (!value.trim() && !['image','read_time'].includes(key))) throw httpError(400,`Invalid ${key}.`);
    if(key==='category'&&!categories.has(value)) throw httpError(400,'Invalid category.');
    if(key==='image'&&value&&!/^(https?:\/\/|(?:\.\.\/)*assets\/|\/api\/media\/article-photos\/)/.test(value)) throw httpError(400,'Invalid image URL.');
    result[key]=value;
  }
  return result;
}
async function syncProfile(member) {
  await db().query('INSERT INTO public.profiles(id,name,is_eic,can_edit_acknowledgement) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET name=excluded.name,is_eic=excluded.is_eic,can_edit_acknowledgement=excluded.can_edit_acknowledgement',[member.id,member.name,Boolean(member.isEic),Boolean(member.isEic)]);
}
async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  try {
    const q = req.query || Object.fromEntries(new URL(req.url,'http://localhost').searchParams);
    const resource=q.resource;
    const body = typeof req.body==='string' ? JSON.parse(req.body) : req.body || {};
    if (resource==='config' && req.method==='GET') {
      if (!process.env.NEON_AUTH_BASE_URL) throw httpError(503,'Account setup is not complete.');
      return res.json({authUrl:'/api/auth'});
    }
    if (resource==='eligibility' && req.method==='POST') {
      if(!staffForEmail(body.email)) throw httpError(403,'This email is not approved for newsroom access.');
      return res.json({ok:true});
    }
    if (resource==='member' && req.method==='GET') {
      const member=await requireMember(req); await syncProfile(member); return res.json({member});
    }
    if (resource==='upload' && req.method==='POST') {
      const member=await requireMember(req);
      const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
      if(!types[body.type]||!Number.isInteger(body.size)||body.size<1||body.size>10*1024*1024) throw httpError(400,'Use a JPG, PNG, WebP or GIF image up to 10 MB.');
      for(const key of ['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET_NAME']) if(!process.env[key]) throw httpError(503,'Photo storage setup is not complete.');
      const {S3Client,PutObjectCommand}=require('@aws-sdk/client-s3');
      const {getSignedUrl}=require('@aws-sdk/s3-request-presigner');
      const {randomUUID}=require('node:crypto');
      const key=`article-photos/${member.id}/${randomUUID()}.${types[body.type]}`;
      const storage=new S3Client({requestChecksumCalculation:'WHEN_REQUIRED',region:'auto',endpoint:`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY}});
      const uploadUrl=await getSignedUrl(storage,new PutObjectCommand({Bucket:process.env.R2_BUCKET_NAME,Key:key,ContentType:body.type,ContentLength:body.size}),{expiresIn:120});
      return res.json({uploadUrl,url:`/api/media/${key}`});
    }
    if(resource!=='articles') throw httpError(404,'Not found.');
    if(q.id!==undefined&&!/^\d+$/.test(String(q.id))) throw httpError(400,'Invalid article ID.');
    if(req.method==='GET') {
      const member=await identity(req);
      const params=[]; const clauses=[];
      const add=(sql,value)=>{params.push(value);clauses.push(sql.replace('?',`$${params.length}`));};
      if(!editor(member)) {
        if(member){params.push(member.id);clauses.push("(status='approved' OR author_id=$1)");}
        else clauses.push("status='approved'");
      }
      if(q.scope==='pending'||q.scope==='all') {
        if(!editor(member)) throw httpError(403,'Editor access is required.');
        if(q.scope==='pending') clauses.push("status='pending'");
      } else if(q.scope==='mine') {
        if(!member) throw httpError(401,'Please sign in.');
        add('author_id=?',member.id);
      }
      if(q.category) add('category=?',q.category);
      if(q.id) add('id=?',q.id);
      const {rows}=await db().query(`SELECT * FROM public.articles${clauses.length?' WHERE '+clauses.join(' AND '):''} ORDER BY created_at DESC`,params);
      return res.json({articles:rows});
    }
    const member=await requireMember(req);
    await syncProfile(member);
    if(req.method==='POST') {
      const data=fields(body);
      if(data.category==='acknowledgement'&&!member.isEic) throw httpError(403,'Editor access is required.');
      Object.assign(data,{author_id:member.id,author_name:member.name,status:editor(member)?'approved':'pending',reviewed_at:editor(member)?new Date():null,reviewed_by:editor(member)?member.id:null});
      const keys=Object.keys(data);
      const {rows}=await db().query(`INSERT INTO public.articles(${keys.join(',')}) VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,Object.values(data));
      return res.status(201).json({article:rows[0]});
    }
    if(!q.id) throw httpError(400,'Article ID required.');
    const connection=await db().connect();
    try {
      await connection.query('BEGIN');
      const {rows}=await connection.query('SELECT * FROM public.articles WHERE id=$1 FOR UPDATE',[q.id]);
      const row=rows[0];
      if(!row) throw httpError(404,'Article not found.');
      if(!canManage(member,row)) throw httpError(403,'You do not have permission to edit this post.');
      if(req.method==='DELETE') {
        await connection.query('DELETE FROM public.articles WHERE id=$1',[q.id]);
        await connection.query('COMMIT'); return res.json({ok:true});
      }
      if(req.method!=='PATCH') throw httpError(405,'Method not allowed.');
      const data=fields(body,true);
      if(data.category==='acknowledgement'&&!member.isEic) throw httpError(403,'Editor access is required.');
      if(body.status!==undefined && !['approved','pending'].includes(body.status)) throw httpError(400,'Invalid status.');
      if(!editor(member)) Object.assign(data,{status:'pending',reviewed_at:null,reviewed_by:null});
      else if(body.status!==undefined) Object.assign(data,{status:body.status,reviewed_at:body.status==='approved'?new Date():null,reviewed_by:body.status==='approved'?member.id:null});
      const keys=Object.keys(data);
      if(!keys.length) throw httpError(400,'No changes supplied.');
      const updated=await connection.query(`UPDATE public.articles SET ${keys.map((key,i)=>`${key}=$${i+1}`).join(',')} WHERE id=$${keys.length+1} RETURNING *`,[...Object.values(data),q.id]);
      await connection.query('COMMIT'); return res.json({article:updated.rows[0]});
    } catch(error) { await connection.query('ROLLBACK');throw error; }
    finally {connection.release();}
  } catch(error) {
    const status=error.status || 500;
    // Database errors may contain article contents; never return/log raw details.
    return res.status(status).json({error:status===500?'The newsroom could not complete this request.':error.message});
  }
}
module.exports=handler;

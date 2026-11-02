// Run with: node --env-file=.env.local scripts/migrate-backend.cjs
// Source is read-only. Target must be the dedicated Mulat Media project.
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {Client} = require('pg');
const {S3Client,PutObjectCommand,HeadObjectCommand,GetObjectCommand} = require('@aws-sdk/client-s3');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function canonical(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
async function main() {
  const sourceUrl=new URL(process.env.SUPABASE_DATABASE_URL);
  const targetUrl=new URL(process.env.DATABASE_URL_UNPOOLED);
  if(!sourceUrl.hostname.endsWith('.supabase.com')&&!sourceUrl.hostname.endsWith('.supabase.co')) throw Error('Unexpected source provider');
  if(!targetUrl.hostname.startsWith('ep-bold-surf-a1l9sces.')||!targetUrl.hostname.endsWith('.neon.tech')) throw Error('Target must be dedicated Mulat Media direct endpoint');
  if(process.env.R2_BUCKET_NAME!=='mulat-media') throw Error('Unexpected media bucket');
  const backup=path.resolve('.migration-backups',new Date().toISOString().replace(/[:.]/g,'-'));
  fs.mkdirSync(backup,{recursive:true,mode:0o700});
  const source=new Client({connectionString:sourceUrl.toString(),connectionTimeoutMillis:15000});
  const target=new Client({connectionString:targetUrl.toString(),connectionTimeoutMillis:15000});
  const r2=new S3Client({region:'auto',endpoint:`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY}});
  try {
    await source.connect();
    await source.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const tables=(await source.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows.map(r=>r.tablename);
    if(JSON.stringify(tables)!==JSON.stringify(['articles','profiles'])) throw Error('Unexpected source tables; review before import');
    const profiles=(await source.query('SELECT * FROM public.profiles ORDER BY id')).rows;
    const articles=(await source.query('SELECT * FROM public.articles ORDER BY id')).rows;
    const objects=(await source.query("SELECT name,metadata FROM storage.objects WHERE bucket_id='article-photos' ORDER BY name")).rows;
    await source.query('COMMIT');
    const snapshot={createdAt:new Date().toISOString(),profiles,articles,objects};
    fs.writeFileSync(path.join(backup,'source.json'),JSON.stringify(snapshot,null,2),{mode:0o600});
    const sourceRoot='https://rjbkeadhidccpduedaqb.supabase.co/storage/v1/object/public/article-photos/';
    const targetRoot=process.env.R2_PUBLIC_URL.replace(/\/$/,'')+'/article-photos/';
    const manifest=[];
    for(const object of objects) {
      const response=await fetch(sourceRoot+object.name.split('/').map(encodeURIComponent).join('/'));
      if(!response.ok) throw Error('Source photo download failed');
      const bytes=Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(path.join(backup,digest(Buffer.from(object.name))+'.bin'),bytes,{mode:0o600});
      manifest.push({name:object.name,bytes:bytes.length,sha256:digest(bytes),contentType:object.metadata?.mimetype||response.headers.get('content-type')||'application/octet-stream'});
    }
    fs.writeFileSync(path.join(backup,'media.json'),JSON.stringify(manifest,null,2),{mode:0o600});
    console.log(`Backup complete: ${profiles.length} profiles, ${articles.length} articles, ${objects.length} photos.`);
    for(const file of manifest) {
      const key='article-photos/'+file.name;
      const bytes=fs.readFileSync(path.join(backup,digest(Buffer.from(file.name))+'.bin'));
      let exists=false;
      try {await r2.send(new HeadObjectCommand({Bucket:process.env.R2_BUCKET_NAME,Key:key}));exists=true;} catch(e){if(e.$metadata?.httpStatusCode!==404)throw e;}
      if(exists) {
        const current=await r2.send(new GetObjectCommand({Bucket:process.env.R2_BUCKET_NAME,Key:key}));
        if(digest(Buffer.from(await current.Body.transformToByteArray()))!==file.sha256) throw Error('Existing R2 object differs; refusing overwrite');
      } else await r2.send(new PutObjectCommand({Bucket:process.env.R2_BUCKET_NAME,Key:key,Body:bytes,ContentType:file.contentType}));
      const publicResponse=await fetch(targetRoot+file.name.split('/').map(encodeURIComponent).join('/'));
      if(!publicResponse.ok||digest(Buffer.from(await publicResponse.arrayBuffer()))!==file.sha256) throw Error('Public photo integrity verification failed');
    }
    const rewrite=v=>typeof v==='string'?v.replaceAll(sourceRoot,targetRoot):Array.isArray(v)?v.map(rewrite):v;
    const migrated=articles.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,rewrite(v)])));
    await target.connect();
    await target.query('BEGIN');
    await target.query('LOCK TABLE public.profiles,public.articles IN ACCESS EXCLUSIVE MODE');
    for(const [table,rows] of [['profiles',profiles],['articles',migrated]]) {
      for(const row of rows) {
        const existing=(await target.query(`SELECT * FROM public.${table} WHERE id=$1`,[row.id])).rows[0];
        if(existing) {
          if(JSON.stringify(canonical(existing))!==JSON.stringify(canonical(row))) throw Error('Existing target row differs; refusing overwrite');
          continue;
        }
        const columns=Object.keys(row);
        const allowed=table==='profiles'?['id','name','is_eic','can_edit_acknowledgement','created_at']:['id','category','category_name','tag','title','excerpt','body','image','read_time','author_id','author_name','status','reviewed_at','reviewed_by','created_at'];
        if(columns.some(key=>!allowed.includes(key))) throw Error('Unexpected source columns');
        await target.query(`INSERT INTO public.${table} (${columns.join(',')}) ${table==='articles'?'OVERRIDING SYSTEM VALUE ':''}VALUES (${columns.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(row));
      }
    }
    if(migrated.length) await target.query("SELECT setval(pg_get_serial_sequence('public.articles','id'),(SELECT max(id) FROM public.articles),true)");
    const actualProfiles=(await target.query('SELECT * FROM public.profiles ORDER BY id')).rows;
    const actualArticles=(await target.query('SELECT * FROM public.articles ORDER BY id')).rows;
    for(const [expected,actual] of [[profiles,actualProfiles],[migrated,actualArticles]]) if(JSON.stringify(canonical(expected))!==JSON.stringify(canonical(actual))) throw Error('Target record verification failed');
    await target.query('COMMIT');
    fs.writeFileSync(path.join(backup,'result.json'),JSON.stringify({profiles:profiles.length,articles:articles.length,photos:manifest.length,verified:true},null,2),{mode:0o600});
    console.log('Neon rows and R2 photo bytes verified. Source unchanged. Backup: '+backup);
  } catch(error) {
    await target.query('ROLLBACK').catch(()=>{});
    // Driver errors can contain credentials; emit only safe migration messages.
    console.error(error.code||error.name, error.code?'Migration failed; source unchanged.':error.message);
    process.exitCode=1;
  } finally {await source.end().catch(()=>{});await target.end().catch(()=>{});r2.destroy();}
}
main();

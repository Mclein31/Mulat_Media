const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {Pool}=require('pg');
test('API enforces verified allowlist, roles, and author ownership',async t=>{
 const {generateKeyPair,exportJWK,SignJWT}=await import('jose');
 const {publicKey,privateKey}=await generateKeyPair('EdDSA');
 const jwk={...await exportJWK(publicKey),kid:'test-key',alg:'EdDSA',use:'sig'};
 const server=http.createServer((_,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({keys:[jwk]}));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>server.close());
 const origin=`http://127.0.0.1:${server.address().port}`;
 process.env.NEON_AUTH_BASE_URL=origin+'/neondb/auth';
 process.env.NEON_AUTH_JWKS_URL=origin+'/jwks';
 process.env.DATABASE_URL='postgresql://test:dummy@localhost/test';
 let user={id:'writer',email:'maxenebaggao24@gmail.com',emailVerified:true,banned:false};
 let article={id:'1',author_id:'other',category:'sports',status:'approved'};
 let lastInsert;let lastUpdate;
 const query=async(sql,params)=>{
  if(sql.includes('FROM neon_auth')) return {rows:[user]};
  if(sql.startsWith('INSERT INTO public.profiles')) return {rows:[]};
  if(sql.startsWith('INSERT INTO public.articles')) {lastInsert={sql,params};return {rows:[{id:'2',status:'pending'}]};}
  if(sql.startsWith('UPDATE public.articles')) {lastUpdate={sql,params};return {rows:[article]};}
  if(sql.includes('FOR UPDATE')) return {rows:[article]};
  if(sql.startsWith('SELECT * FROM public.articles')) {assert.ok(sql.includes("status='approved'"));return {rows:[]};}
  return {rows:[]};
 };
 const oldQuery=Pool.prototype.query,oldConnect=Pool.prototype.connect;
 Pool.prototype.query=query;Pool.prototype.connect=async()=>({query,release(){}});
 t.after(()=>{Pool.prototype.query=oldQuery;Pool.prototype.connect=oldConnect;});
 const handler=require('../api/newsroom.js');
 const token=await new SignJWT({}).setProtectedHeader({alg:'EdDSA',kid:'test-key'}).setSubject('writer').setIssuer(origin).setAudience(origin).setExpirationTime('5m').sign(privateKey);
 async function call(method,resource,body,auth=token,query={}) {
  const req={method,query:{resource,...query},body,headers:auth?{authorization:`Bearer ${auth}`}:{}};
  const res={code:200,setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
  await handler(req,res);return res;
 }
 assert.equal((await call('GET','member',null,null)).code,401);
 assert.equal((await call('GET','member',null,'forged')).code,401);
 assert.equal((await call('POST','eligibility',{email:'outsider@gmail.com'},null)).code,403);
 assert.equal((await call('POST','eligibility',{email:'mcleinonza0531@gmail.com'},null)).code,200);
 user.emailVerified=false;assert.equal((await call('GET','member')).code,403);
 user.emailVerified=true;user.email='outsider@gmail.com';assert.equal((await call('GET','member')).code,403);
 user.email='maxenebaggao24@gmail.com';user.banned=true;assert.equal((await call('GET','member')).code,403);user.banned=false;
 assert.equal((await call('GET','articles',null,null)).code,200);
 assert.equal((await call('GET','articles',null,token,{scope:'all'})).code,403);
 assert.equal((await call('PATCH','articles',{title:'Changed'},token,{id:'1'})).code,403);
 const body={category:'sports',category_name:'Sports',tag:'News',title:'Test',excerpt:'Summary',body:['Paragraph'],author_id:'victim',author_name:'Jang Mee B. Lee',status:'approved'};
 assert.equal((await call('POST','articles',body)).code,201);
 assert.ok(lastInsert.params.includes('writer'));assert.ok(lastInsert.params.includes('pending'));
 assert.ok(!lastInsert.params.includes('victim'));assert.ok(!lastInsert.params.includes('Jang Mee B. Lee'));
 assert.equal((await call('POST','articles',{...body,category:'acknowledgement'})).code,403);
 article.author_id='writer';assert.equal((await call('PATCH','articles',{title:'Edited',status:'approved'},token,{id:'1'})).code,200);
 assert.ok(lastUpdate.params.includes('pending'));assert.ok(!lastUpdate.params.includes('approved'));
 user.email='mcleinonza0531@gmail.com';const member=await call('GET','member');assert.equal(member.data.member.isAdmin,true);
 article.author_id='other';assert.equal((await call('PATCH','articles',{status:'approved'},token,{id:'1'})).code,200);
 assert.ok(lastUpdate.params.includes('approved'));
 article.category='acknowledgement';
 assert.equal((await call('PATCH','articles',{title:'Admin edit'},token,{id:'1'})).code,403);
 assert.equal((await call('DELETE','articles',null,token,{id:'1'})).code,403);
 assert.equal((await call('POST','articles',{...body,category:'acknowledgement'})).code,403);
 article.category='sports';
 assert.equal((await call('PATCH','articles',{category:'acknowledgement'},token,{id:'1'})).code,403);
 user.email='jiangmee.lee@gmail.com';article.category='acknowledgement';
 assert.equal((await call('PATCH','articles',{title:'Editor edit'},token,{id:'1'})).code,200);
 assert.equal((await call('POST','articles',{...body,category:'acknowledgement'})).code,201);
 Object.assign(process.env,{R2_ACCOUNT_ID:'test-account',R2_BUCKET_NAME:'test-bucket',R2_ACCESS_KEY_ID:'test-key',R2_SECRET_ACCESS_KEY:'test-secret',R2_PUBLIC_URL:'https://media.example.test'});
 assert.equal((await call('POST','upload',{name:'bad.svg',type:'image/svg+xml',size:10})).code,400);
 assert.equal((await call('POST','upload',{name:'big.png',type:'image/png',size:11*1024*1024})).code,400);
 const signed=await call('POST','upload',{name:'photo.png',type:'image/png',size:68});
 assert.equal(signed.code,200);
 assert.ok(![...new URL(signed.data.uploadUrl).searchParams.keys()].some(key=>key.startsWith('x-amz-checksum')),'browser uploads must not be signed with an empty-body checksum');
});

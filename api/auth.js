// Fixed-origin proxy keeps Auth cookies on the publication's own domain.
const routes = new Set([
  'sign-in/email', 'get-session', 'token', 'sign-out', 'change-password',
  'email-otp/send-verification-otp', 'email-otp/verify-email'
]);
module.exports = async function authProxy(req,res) {
  res.setHeader('Cache-Control','no-store');
  const route=req.query?.path;
  if(typeof route!=='string'||!routes.has(route)) return res.status(404).json({error:'Not found.'});
  if(!['GET','POST'].includes(req.method)) return res.status(405).json({error:'Method not allowed.'});
  if(!process.env.NEON_AUTH_BASE_URL) return res.status(503).json({error:'Account setup is not complete.'});
  try {
    const upstream=new URL(process.env.NEON_AUTH_BASE_URL.replace(/\/$/,'')+'/'+route);
    const headers={};
    for(const name of ['cookie','content-type','origin','referer','user-agent']) if(req.headers[name]) headers[name]=req.headers[name];
    // The fixed upstream validates Origin against its configured trusted domains.
    const body=req.method==='POST'?(typeof req.body==='string'?req.body:JSON.stringify(req.body||{})):undefined;
    const response=await fetch(upstream,{method:req.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(20000)});
    for(const name of ['content-type','set-auth-jwt']) if(response.headers.has(name)) res.setHeader(name,response.headers.get(name));
    const cookies=response.headers.getSetCookie();
    if(cookies.length) res.setHeader('Set-Cookie',cookies.map(cookie=>cookie.replace(/;\s*Domain=[^;]+/ig,'')));
    res.status(response.status);
    return res.send(Buffer.from(await response.arrayBuffer()));
  } catch {return res.status(502).json({error:'Sign-in service is unavailable. Please try again.'});}
};

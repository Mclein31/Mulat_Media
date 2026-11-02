const {execFileSync}=require('node:child_process');
const {readdirSync}=require('node:fs');
for(const dir of ['api','lib','scripts','tests','assets/js']) {
 for(const file of readdirSync(dir)) {
  if(/\.(?:js|cjs)$/.test(file)) execFileSync(process.execPath,['--check',`${dir}/${file}`],{stdio:'inherit'});
 }
}
console.log('JavaScript syntax checks passed.');

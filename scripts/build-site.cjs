const {cpSync,mkdirSync,readdirSync,rmSync}=require('node:fs');
rmSync('public',{recursive:true,force:true});mkdirSync('public');
for(const file of readdirSync('.')) if(/\.(html|css)$/.test(file)) cpSync(file,`public/${file}`);
for(const dir of ['assets','articles','members']) cpSync(dir,`public/${dir}`,{recursive:true,filter:path=>!path.endsWith('.source.js')});

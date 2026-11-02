const {test}=require('node:test');
const assert=require('node:assert/strict');
const {staffForEmail, memberForUser, canManage}=require('../lib/staff.cjs');
test('only the seven exact staff emails are allowed',()=>{
 for(const email of ['jiangmee.lee@gmail.com','maxenebaggao24@gmail.com','kaizenrodriguez97@gmail.com','kylarexieperez@gmail.com','macyollangangi1221@gmail.com','mhariellebinondo12@gmail.com','zildjiantoledo077@gmail.com']) assert.ok(staffForEmail(email));
 for(const email of ['attacker@gmail.com','jiangmee.lee+other@gmail.com','jiangmee.lee@gmail.com.evil','jangmee@mulatmedia.local',null]) assert.equal(staffForEmail(email),null);
 assert.equal(staffForEmail('  JIANGMEE.LEE@gmail.com ').isEic,true);
});
test('verified email is required, and a display name cannot grant access',()=>{
 assert.equal(memberForUser({id:'1',email:'jiangmee.lee@gmail.com',emailVerified:false}),null);
 assert.equal(memberForUser({id:'1',email:'evil@gmail.com',emailVerified:true,name:'Jang Mee B. Lee'}),null);
 const member=memberForUser({id:'1',email:'maxenebaggao24@gmail.com',emailVerified:true,name:'Jang Mee B. Lee'});
 assert.equal(member.isEic,false);
 assert.equal(member.name,'Maxene Q. Baggao');
});
test('writers manage only their own ordinary articles; editor manages all',()=>{
 const member={id:'writer',isEic:false};
 assert.equal(canManage(member,{author_id:'writer',category:'sports'}),true);
 assert.equal(canManage(member,{author_id:'other',category:'sports'}),false);
 assert.equal(canManage(member,{author_id:'writer',category:'acknowledgement'}),false);
 assert.equal(canManage({id:'editor',isEic:true},{author_id:'other',category:'acknowledgement'}),true);
});
test('developer admin has full management access through the verified allowlist',()=>{
 const admin=memberForUser({id:'dev',email:'mcleinonza0531@gmail.com',emailVerified:true});
 assert.equal(admin.isAdmin,true);assert.equal(admin.isEic,false);
 assert.equal(admin.canEditAcknowledgement,false);
 assert.equal(canManage(admin,{author_id:'other',category:'acknowledgement'}),false);
 assert.equal(canManage(admin,{author_id:'other',category:'sports'}),true);
 assert.equal(memberForUser({id:'dev',email:'mcleinonza0531@gmail.com',emailVerified:false}),null);
});

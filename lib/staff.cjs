// Server-owned identities. Never grant roles from a submitted display name.
const STAFF = new Map([
  ['mcleinonza0531@gmail.com', { name: 'McLein Jei G. Onza', isEic: false, isAdmin: true }],
  ['jiangmee.lee@gmail.com', { name: 'Jang Mee B. Lee', isEic: true }],
  ['maxenebaggao24@gmail.com', { name: 'Maxene Q. Baggao', isEic: false }],
  ['kaizenrodriguez97@gmail.com', { name: 'Kaizen C. Rodriguez', isEic: false }],
  ['kylarexieperez@gmail.com', { name: 'Kyla Rexie Perez Jaime', isEic: false }],
  ['macyollangangi1221@gmail.com', { name: 'Macy Ollagangi', isEic: false }],
  ['mhariellebinondo12@gmail.com', { name: 'Mharielle B. Binondo', isEic: false }],
  ['zildjiantoledo077@gmail.com', { name: 'Zildjian Faith F. Toledo', isEic: false }]
]);
function staffForEmail(email) {
  return typeof email === 'string' ? STAFF.get(email.trim().toLowerCase()) || null : null;
}
function memberForUser(user) {
  if (!user || user.emailVerified !== true) return null;
  const staff = staffForEmail(user.email);
  if (!staff) return null;
  return { id: user.id, email: user.email, ...staff, canEditAcknowledgement: Boolean(staff.isEic) };
}
function canManage(member, article) {
  if (article.category === 'acknowledgement') return Boolean(member && member.isEic);
  return Boolean(member && (member.isEic || member.isAdmin ||
    (article.author_id === member.id && article.category !== 'acknowledgement')));
}
module.exports = { staffForEmail, memberForUser, canManage };

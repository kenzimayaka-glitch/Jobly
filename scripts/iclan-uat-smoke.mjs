#!/usr/bin/env node
const base = (process.env.ICLAN_API_URL || 'https://test.api.eduklan.com').replace(/\/$/, '');
const username = process.env.ICLAN_USERNAME;
const password = process.env.ICLAN_PASSWORD;
if (!username || !password) { console.error('ICLAN_CREDENTIALS_NOT_CONFIGURED'); process.exit(2); }
const args = process.argv.slice(2);
const pay = args.includes('--pay');
const phone = process.env.ICLAN_UAT_PHONE;
const method = process.env.ICLAN_DEFAULT_PAYMENT_METHOD || 'MTN MoMo';
const amount = Number(process.env.ICLAN_UAT_AMOUNT || 1);
const externalId = globalThis.crypto?.randomUUID ? crypto.randomUUID() : `jobly-uat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
async function jsonPost(path, body, token) {
  const r = await fetch(`${base}${path}`, { method:'POST', headers:{'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {})}, body:JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return {r,j};
}
const auth = await jsonPost('/api/client/token', {username,password});
if (!auth.r.ok || auth.j?.type !== 'success' || !auth.j?.data?.token) { console.error(`TOKEN_FAILED HTTP_${auth.r.status}`); process.exit(3); }
console.log(`TOKEN_OK expires_in=${Number(auth.j.data.expires_in || 300)}s`);
if (!pay) { console.log('AUTH_ONLY_OK'); process.exit(0); }
if (!phone) { console.error('ICLAN_UAT_PHONE_REQUIRED_FOR_PAY'); process.exit(4); }
if (!Number.isInteger(amount) || amount <= 0) { console.error('ICLAN_UAT_AMOUNT_INVALID'); process.exit(5); }
const launch = await jsonPost('/api/test/make_payment', {payment_method:method, telephone:phone, amount:String(amount), external_id:externalId}, auth.j.data.token);
if (!launch.r.ok || launch.j?.type !== 'success' || launch.j?.data?.external_id !== externalId) { console.error(`MAKE_PAYMENT_FAILED HTTP_${launch.r.status}`); process.exit(6); }
console.log(`PAYMENT_LAUNCHED external_id=${externalId} method=${method} amount=${amount}`);
const verify = await jsonPost('/api/test/verify_payment', {external_id:externalId}, auth.j.data.token);
const status = String(verify.j?.data?.payment_status || 'PENDING').toUpperCase();
console.log(`VERIFY_RESULT status=${status}`);
if (!['SUCCESSFUL','FAILED','PENDING'].includes(status)) process.exit(7);

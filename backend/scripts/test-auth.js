const fetch = require('node-fetch');
async function run() {
  const base = process.env.API_URL || 'http://localhost:3000/api';
  const regRes = await fetch(`${base}/admin/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Admin Test', email: 'admin.test@example.com', password: 'Secret123!' })
  });
  const loginRes = await fetch(`${base}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin.test@example.com', password: 'Secret123!' })
  });
  const loginJson = await loginRes.json();
  if (!loginRes.ok) throw new Error('Login failed: ' + JSON.stringify(loginJson));
  const token = loginJson.token;
  const valRes = await fetch(`${base}/admin/validate-token`, { headers: { Authorization: `Bearer ${token}` } });
  const valJson = await valRes.json();
  if (!valRes.ok) throw new Error('Validate failed: ' + JSON.stringify(valJson));
  console.log('OK', { token: token.slice(0, 16) + '...', user: valJson.email, role: valJson.role, subjectType: valJson.subjectType });
}
run().catch((e) => { console.error(e); process.exit(1); });

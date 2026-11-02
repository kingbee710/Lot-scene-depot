// POST /api/applications -> membership application; always starts as 'pending'.
// No member is created as approved by this endpoint. Contact details are stored
// for the owner only and are never returned by any public endpoint.
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  const { handle, display_name, why, contact } = body || {};
  if (!handle || !display_name || !why) {
    return json({ error: 'Handle, display name, and why you want in are required.' }, 400);
  }
  if (!/^[A-Za-z0-9_.-]{2,30}$/.test(handle)) {
    return json({ error: 'Handle must be 2–30 letters, numbers, _ , . or -.' }, 400);
  }
  const existing = await env.DB.prepare(
    `SELECT id, status FROM members WHERE lower(handle) = lower(?)`
  ).bind(handle).first();
  if (existing) return json({ error: `That handle already exists (status: ${existing.status}). Pick a different handle, or contact the owner.` }, 409);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO members (id, handle, display_name, why, contact, status, role)
     VALUES (?, ?, ?, ?, ?, 'pending', 'member')`
  ).bind(id, handle, display_name, String(why).slice(0, 1000), contact ? String(contact).slice(0, 200) : null).run();
  return json({ ok: true, id, status: 'pending',
    message: 'Application received. WooKzZz must approve you as a member before you can post or comment.' }, 201);
}

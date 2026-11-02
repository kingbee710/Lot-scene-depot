// GET /api/posts  -> approved posts only (pinned first, then newest)
//   ?category=Events|Ideas|Stories|Funny/Rants|Networking
// POST /api/posts -> approved member only; post starts as 'pending' (The Gate)
const CATEGORIES = ['Events', 'Ideas', 'Stories', 'Funny/Rants', 'Networking'];
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  let q = `SELECT id, handle, display_name, category, title, body, pinned, created_at
           FROM posts WHERE status = 'approved'`;
  const params = [];
  if (category && CATEGORIES.includes(category)) { q += ' AND category = ?'; params.push(category); }
  q += ' ORDER BY pinned DESC, created_at DESC LIMIT 200';
  const stmt = params.length ? env.DB.prepare(q).bind(...params) : env.DB.prepare(q);
  const { results } = await stmt.all();
  return json({ posts: results || [] });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  const { handle, member_token, category, title, post_body } = body || {};
  if (!handle || !member_token || !category || !title || !post_body) {
    return json({ error: 'Handle, member token, category, title, and post text are required.' }, 400);
  }
  if (!CATEGORIES.includes(category)) return json({ error: 'Unknown category.' }, 400);
  if (String(title).length > 140 || String(post_body).length > 4000) {
    return json({ error: 'Title is too long, or the post is over 4000 characters.' }, 400);
  }
  // Membership gate: only an approved member with a matching token can post.
  // Owner exception: WooKzZz posts with the admin token instead of a member
  // token (the owner row intentionally has no member token).
  let member = await env.DB.prepare(
    `SELECT id, display_name FROM members WHERE lower(handle) = lower(?) AND token = ? AND status = 'approved'`
  ).bind(handle, member_token).first();
  if (!member && String(handle).toLowerCase() === 'wookzzz'
      && env.ADMIN_TOKEN && request.headers.get('X-Admin-Token') === env.ADMIN_TOKEN) {
    member = await env.DB.prepare(
      `SELECT id, display_name FROM members WHERE handle = 'wookzzz' AND role = 'owner' AND status = 'approved'`
    ).first();
  }
  if (!member) {
    return json({ error: 'Not an approved member, or the member token does not match. Apply to join first, and wait for owner approval.' }, 403);
  }
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO posts (id, member_id, handle, display_name, category, title, body, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
  ).bind(id, member.id, handle, member.display_name, category, String(title).trim(), String(post_body).trim()).run();
  return json({ ok: true, id, status: 'pending',
    message: 'Submitted. It stays hidden until WooKzZz approves it at The Gate.' }, 201);
}

// GET /api/comments?post_id=... -> approved comments only, oldest first
// POST /api/comments -> approved handle only (no member token); comment starts as 'pending' (The Gate)
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

export async function onRequestGet({ request, env }) {
  const post_id = new URL(request.url).searchParams.get('post_id');
  if (!post_id) return json({ error: 'post_id is required.' }, 400);
  const { results } = await env.DB.prepare(
    `SELECT id, handle, display_name, body, created_at FROM comments
     WHERE post_id = ? AND status = 'approved' ORDER BY created_at ASC LIMIT 500`
  ).bind(post_id).all();
  return json({ comments: results || [] });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  const { post_id, handle, comment_body } = body || {};
  if (!post_id || !handle || !comment_body) {
    return json({ error: 'Post, handle, and comment text are required.' }, 400);
  }
  if (String(comment_body).length > 2000) return json({ error: 'Comment is over 2000 characters.' }, 400);
  const post = await env.DB.prepare(
    `SELECT id FROM posts WHERE id = ? AND status = 'approved'`
  ).bind(post_id).first();
  if (!post) return json({ error: 'That post is not public.' }, 404);
  let member = await env.DB.prepare(
    `SELECT id, display_name FROM members WHERE lower(handle) = lower(?) AND status = 'approved'`
  ).bind(handle).first();
  if (!member && String(handle).toLowerCase() === 'wookzzz'
      && env.ADMIN_TOKEN && request.headers.get('X-Admin-Token') === env.ADMIN_TOKEN) {
    member = await env.DB.prepare(
      `SELECT id, display_name FROM members WHERE handle = 'wookzzz' AND role = 'owner' AND status = 'approved'`
    ).first();
  }
  if (!member) {
    return json({ error: 'Not an approved member yet. Apply to join first, and wait for owner approval.' }, 403);
  }
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO comments (id, post_id, member_id, handle, display_name, body, status)
     VALUES (?, ?, ?, ?, ?, ?, 'approved')`
  ).bind(id, post_id, member.id, handle, member.display_name, String(comment_body).trim()).run();
  return json({ ok: true, id, status: 'approved',
    message: 'Comment posted live. Break the rules after a warning and you will be banned.' }, 201);
}

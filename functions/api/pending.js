// GET /api/pending -> The Gate queue. Owner only.
// Requires header: X-Admin-Token: <ADMIN_TOKEN env var set in Cloudflare dashboard>.
// Contact details are included here ONLY because this endpoint is owner-only;
// they are never sent by any public endpoint.
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const isAdmin = (request, env) =>
  Boolean(env.ADMIN_TOKEN) && request.headers.get('X-Admin-Token') === env.ADMIN_TOKEN;

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: 'Owner access required.' }, 401);
  const members = await env.DB.prepare(
    `SELECT id, handle, display_name, why, contact, created_at FROM members
     WHERE status = 'pending' ORDER BY created_at ASC`
  ).all();
  const posts = await env.DB.prepare(
    `SELECT id, handle, display_name, category, title, body, created_at FROM posts
     WHERE status = 'pending' ORDER BY created_at ASC`
  ).all();
  const comments = await env.DB.prepare(
    `SELECT id, post_id, handle, display_name, body, created_at FROM comments
     WHERE status = 'pending' ORDER BY created_at ASC`
  ).all();
  return json({
    applications: members.results || [],
    posts: posts.results || [],
    comments: comments.results || [],
  });
}

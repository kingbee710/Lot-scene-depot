// POST /api/admin -> owner-only actions. Requires X-Admin-Token header.
// No secret is stored in this repo. The owner sets ADMIN_TOKEN as a
// Cloudflare Pages environment variable (see DEPLOY.md) and enters it in
// The Gate panel on the board page; the browser keeps it in localStorage only.
//
// Actions: approve_member, reject_member, approve_post, reject_post,
// approve_comment, reject_comment, pin_post, unpin_post, remove_member, takedown_post
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const isAdmin = (request, env) =>
  Boolean(env.ADMIN_TOKEN) && request.headers.get('X-Admin-Token') === env.ADMIN_TOKEN;

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: 'Owner access required.' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  const { action, id } = body || {};
  if (!action || !id) return json({ error: 'action and id are required.' }, 400);

  switch (action) {
    case 'approve_member': {
      // Simplified (Nov 2): one tap approves the handle. No member token to
      // copy or share — the approved handle can post right away, and every
      // post still waits at The Gate for post approval before going public.
      const r = await env.DB.prepare(
        `UPDATE members SET status = 'approved', token = NULL WHERE id = ? AND status = 'pending'`
      ).bind(id).run();
      if (!r.meta.changes) return json({ error: 'No pending member with that id.' }, 404);
      return json({ ok: true, note: 'Member approved. They can now post with just their handle; each post still needs post approval.' });
    }
    case 'reject_member':
      await env.DB.prepare(`UPDATE members SET status = 'rejected' WHERE id = ?`).bind(id).run();
      return json({ ok: true });
    case 'remove_member':
      await env.DB.prepare(`UPDATE members SET status = 'removed', token = NULL WHERE id = ?`).bind(id).run();
      return json({ ok: true });
    case 'approve_post':
      await env.DB.prepare(`UPDATE posts SET status = 'approved' WHERE id = ?`).bind(id).run();
      return json({ ok: true });
    case 'reject_post':
      await env.DB.prepare(`UPDATE posts SET status = 'rejected' WHERE id = ?`).bind(id).run();
      return json({ ok: true });
    case 'takedown_post':
      await env.DB.prepare(`UPDATE posts SET status = 'removed' WHERE id = ?`).bind(id).run();
      return json({ ok: true });
    case 'pin_post':
      await env.DB.prepare(`UPDATE posts SET pinned = 1 WHERE id = ?`).bind(id).run();
      return json({ ok: true });
    case 'unpin_post':
      await env.DB.prepare(`UPDATE posts SET pinned = 0 WHERE id = ?`).bind(id).run();
      return json({ ok: true });
    case 'approve_comment':
      await env.DB.prepare(`UPDATE comments SET status = 'approved' WHERE id = ?`).bind(id).run();
      return json({ ok: true });
    case 'reject_comment':
      await env.DB.prepare(`UPDATE comments SET status = 'rejected' WHERE id = ?`).bind(id).run();
      return json({ ok: true });
    default:
      return json({ error: 'Unknown action.' }, 400);
  }
}

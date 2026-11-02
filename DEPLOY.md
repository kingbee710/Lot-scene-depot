# Deploy the Community Board to lotscenedepot.com — manual steps

**Status: NOT live.** Nothing in this folder has been deployed, and no account
has been signed into. The assistant cannot sign into Cloudflare for the owner
(Google sign-in and the saved password both failed on Oct 31, 2026), so the
owner does these steps in his own browser, in the single-s
`lotscenedepot@gmail.com` Cloudflare account — never the double-s account.

## What this is

- A new page on the **existing** site: `https://lotscenedepot.com/board/`
- **No new domain, no DNS change, no nameserver change.**
- It does **not** replace or edit the shop, Vendors, or Story pages.
- Board backend: Cloudflare Pages Functions (`functions/api/`) + a Cloudflare
  D1 database. That backend is what makes member approval, post approval, and
  shared public posts actually work — a plain static upload alone cannot do that.

## Before you start — keep a safety copy

1. Keep a copy of the currently live site file (`index.html`, the 102-product
   version deployed Oct 31, 2026). Do not deploy without it.
2. Deploy to a **preview** first if Cloudflare offers one, and check the shop
   and story still load, before promoting anything to production.

## Step 1 — Create the D1 database

1. Sign into Cloudflare yourself (single-s `lotscenedepot@gmail.com` only).
2. Go to **Workers & Pages → D1** (or Storage → D1 in the current dashboard
   layout) and create a database named exactly: `lot-scene-board`
3. Open that database, go to its SQL/console area, and run the whole contents
   of `schema.sql` from this folder. That creates `members`, `posts`, and
   `comments`, and seeds only the owner profile: **WooKzZz (@wookzzz)**.
   There are no fake members, posts, or comments.

## Step 2 — Bind the database and set the owner token

1. Open the existing Pages project: **Workers & Pages → lot-scene-depot**.
2. **Settings → Functions → D1 database bindings** → Add binding:
   - Variable name: `DB`
   - Database: `lot-scene-board`
3. **Settings → Environment variables → Production** → Add a variable:
   - Name: `ADMIN_TOKEN`
   - Value: a long random string **you invent and never share with anyone**,
     e.g. 3–4 random words plus numbers. This is the only owner key.
     It is **not** written anywhere in this folder, and you must not send it
     to the assistant or put it in a post.
4. Save. (If the dashboard asks to redeploy for variables to take effect,
   that is part of Step 3.)

## Step 3 — Deploy the files together with the live site

This is the step to be careful about: a Pages deployment replaces the whole
project, so the board files must be deployed **together with** the current
live site file — never as a lone upload that would wipe the site.

Preferred route, if you are comfortable with a terminal:

```bash
# In a folder that contains BOTH the current live index.html
# (at the folder root) AND the board/ and functions/ folders from here:
npx wrangler pages deploy . --project-name lot-scene-depot
```

Dashboard route:

1. Make one folder containing:
   - `index.html` — the current live site file, unchanged, at the folder root
   - `board/` — from this project (contains `index.html`, served at `/board/`)
   - `functions/` — from this project (the API)
2. In the lot-scene-depot project, choose **Create deployment → Upload**,
   upload that whole folder, and deploy.
3. Wait for the deployment to finish, then open:
   - `https://lotscenedepot.com/` — shop/story must still load as before
   - `https://lotscenedepot.com/board/` — the board page must load, and it
     will say the backend is connected if D1 + Functions are bound correctly

If `/board/` says "backend not connected yet", the page itself deployed but
Step 1 or Step 2 is incomplete — check the D1 binding name (`DB`) and that
the schema ran, then redeploy.

## Step 4 — First use as owner (WooKzZz)

1. Open `https://lotscenedepot.com/board/` and scroll to **The Gate**.
2. Enter your `ADMIN_TOKEN` from Step 2. It is stored in your browser only.
3. Test with your own eyes before telling anyone: submit a test membership
   application from another browser/device if you can, approve it at The Gate,
   copy the member token it shows you, and use that token to submit a test
   post — then approve that post and check it appears publicly.
4. Delete any test posts/members you do not want, using The Gate.

## Step 5 — Link it from the front page (optional, separate edit)

This project deliberately does **not** edit the live front page, so the shop,
Vendors, and Story pages are untouched. To add a board link, add one button
next to Let's Shop / Vendors / Read the Story in the live `index.html`, e.g.:

```html
<a href="/board/">Community Board</a>
```

…then redeploy the same folder from Step 3. Do not add that button until
the board itself is verified working at `/board/`.

## How members post, in plain language

- A visitor applies (name/handle + why they want in). Nothing happens until
  WooKzZz approves them at The Gate.
- On approval, The Gate shows WooKzZz a private member token. WooKzZz shares
  that token privately with that member (message/email, outside the board).
  The member pastes it into the post/comment form. Without an approved handle
  + matching token, the API refuses the post/comment.
- Every post and comment then waits at The Gate again until WooKzZz approves
  it. Only approved posts and approved comments are ever returned by the
  public endpoints, so unapproved content is never visible to visitors.
- Owner controls at The Gate: approve/reject members, approve/reject posts
  and comments, pin/unpin posts, remove members (which also wipes their
  posting token), and take down posts.

## If something goes wrong

- Board page loads but posts do not: D1 binding or schema is missing —
  re-check Steps 1–2.
- The Gate says "Owner access required": the `ADMIN_TOKEN` in the dashboard
  does not match what was typed, or the variable was added after the last
  deploy — redeploy after adding it.
- Site shop/story breaks after deploy: roll back by redeploying the safety
  copy of the live `index.html` alone, exactly as it was deployed before,
  and do not retry the board deploy until the folder contents are checked.

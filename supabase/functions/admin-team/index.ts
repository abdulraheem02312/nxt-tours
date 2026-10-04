// admin-team: lets an OWNER manage who can use the admin panel.
// Actions (POST JSON { action, ... }), caller must send their login token (Authorization: Bearer <access token>):
//   list                          any admin: list team members
//   add    { email, role }        owner: create a login with a temporary password and give it a role
//   role   { userId, role }       owner: change someone's role
//   reset  { userId }             owner: give someone a new temporary password
//   remove { userId }             owner: remove someone's access and delete their login
// The last owner can never be demoted or removed, and owners can't remove themselves.

import { createClient } from "npm:@supabase/supabase-js@2";

const ROLES = ["owner", "editor", "reviewer"];
const env = (k: string) => (Deno.env.get(k) || "").trim();

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Readable but strong temporary password, e.g. "Nxt-K7mP-4qRt-9Zx2"
function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const pick = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => chars[b % chars.length]).join("");
  return "Nxt-" + pick(4) + "-" + pick(4) + "-" + pick(4);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { ok: false, error: "Method not allowed" });

  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

  // ---- Who is calling? ----
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await db.auth.getUser(token);
  if (userError || !userData?.user) return reply(401, { ok: false, error: "Please log in again." });
  const caller = userData.user;
  const { data: me } = await db.from("admin_users").select("role").eq("user_id", caller.id).maybeSingle();
  if (!me) return reply(403, { ok: false, error: "You don't have access to the admin panel." });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return reply(400, { ok: false, error: "Invalid request" });
  }
  const action = String(body.action || "");

  const team = async () => {
    const { data } = await db.from("admin_users").select("user_id, role, email, created_at").order("created_at");
    return data || [];
  };

  if (action === "list") return reply(200, { ok: true, team: await team(), me: { id: caller.id, role: me.role } });

  if (me.role !== "owner") return reply(403, { ok: false, error: "Only an owner can manage the team." });

  const owners = (await team()).filter((m) => m.role === "owner");
  const userId = String(body.userId || "");

  if (action === "add") {
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return reply(400, { ok: false, error: "Please enter a valid email." });
    if (!ROLES.includes(role)) return reply(400, { ok: false, error: "Please choose a role." });

    const password = tempPassword();
    let newId = "";
    const created = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { must_change_password: true } });
    if (created.data?.user) {
      newId = created.data.user.id;
    } else {
      // The login may already exist (for example someone who was removed earlier): reuse it with a fresh password
      const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users?.find((u) => (u.email || "").toLowerCase() === email);
      if (!existing) return reply(500, { ok: false, error: "Could not create the login." });
      const already = (await team()).find((m) => m.user_id === existing.id);
      if (already) return reply(400, { ok: false, error: "This person is already on the team." });
      await db.auth.admin.updateUserById(existing.id, { password, user_metadata: { must_change_password: true } });
      newId = existing.id;
    }
    const { error } = await db.from("admin_users").insert({ user_id: newId, role, email });
    if (error) return reply(500, { ok: false, error: "Could not save the role." });
    return reply(200, { ok: true, email, password, team: await team() });
  }

  const target = (await team()).find((m) => m.user_id === userId);
  if (!target) return reply(404, { ok: false, error: "Team member not found." });

  if (action === "role") {
    const role = String(body.role || "");
    if (!ROLES.includes(role)) return reply(400, { ok: false, error: "Please choose a role." });
    if (target.role === "owner" && role !== "owner" && owners.length <= 1) {
      return reply(400, { ok: false, error: "There must always be at least one owner." });
    }
    await db.from("admin_users").update({ role }).eq("user_id", userId);
    return reply(200, { ok: true, team: await team() });
  }

  if (action === "reset") {
    const password = tempPassword();
    const { error } = await db.auth.admin.updateUserById(userId, { password, user_metadata: { must_change_password: true } });
    if (error) return reply(500, { ok: false, error: "Could not reset the password." });
    return reply(200, { ok: true, email: target.email, password });
  }

  if (action === "remove") {
    if (userId === caller.id) return reply(400, { ok: false, error: "You can't remove yourself." });
    if (target.role === "owner" && owners.length <= 1) return reply(400, { ok: false, error: "There must always be at least one owner." });
    await db.from("admin_users").delete().eq("user_id", userId);
    await db.auth.admin.deleteUser(userId);
    return reply(200, { ok: true, team: await team() });
  }

  return reply(400, { ok: false, error: "Unknown action" });
});

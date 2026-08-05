// จัดการบัญชีเจ้าหน้าที่ (เชิญ / กำหนดบทบาท / ระงับ-คืนสิทธิ์ / รีเซ็ตรหัสผ่าน)
// เรียกได้เฉพาะผู้ใช้ที่ล็อกอินและมีบทบาท admin เท่านั้น
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { adminUsersSchema } from "../_shared/schemas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ROLES = ["admin", "manager", "caseworker", "viewer"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  // 1) ยืนยันตัวตนผู้เรียก
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userRes } = await userClient.auth.getUser();
  const caller = userRes?.user;
  if (!caller) return json({ error: "unauthorized" }, 401);

  const admin = createClient(url, service);

  // 2) ตรวจว่าเป็น admin ที่ยังใช้งานอยู่
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", caller.id);
  const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
  const { data: prof } = await admin.from("staff_profiles").select("status").eq("id", caller.id).maybeSingle();
  if (!isAdmin || (prof?.status ?? "active") !== "active") return json({ error: "forbidden" }, 403);

  let raw: unknown = {};
  try { raw = await req.json(); } catch { /* ignore */ }
  const parsed = adminUsersSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง", fields: parsed.error.flatten().fieldErrors }, 400);
  }
  const body = parsed.data as Record<string, string>;
  const action = body.action;

  try {
    if (action === "list") {
      const { data: profiles } = await admin
        .from("staff_profiles")
        .select("id, email, display_name, status, created_at")
        .order("created_at", { ascending: false });
      const { data: allRoles } = await admin.from("user_roles").select("user_id, role");
      const users = (profiles ?? []).map((p: Record<string, unknown>) => ({
        ...p,
        roles: (allRoles ?? []).filter((r: { user_id: string }) => r.user_id === p.id).map((r: { role: string }) => r.role),
      }));
      return json({ users });
    }

    if (action === "invite") {
      const email = (body.email || "").trim().toLowerCase();
      const role = body.role;
      const name = (body.display_name || "").trim().slice(0, 120);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "อีเมลไม่ถูกต้อง" }, 400);
      if (!ROLES.includes(role)) return json({ error: "บทบาทไม่ถูกต้อง" }, 400);

      const redirectTo = (body.redirect_to || "").startsWith("http") ? body.redirect_to : undefined;
      let userId: string | null = null;

      const { data: inv, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
      if (invErr) {
        // อาจมีบัญชีอยู่แล้ว — ค้นหาแทน
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found = list?.users?.find((u) => u.email?.toLowerCase() === email);
        if (!found) return json({ error: invErr.message }, 400);
        userId = found.id;
      } else {
        userId = inv?.user?.id ?? null;
      }
      if (!userId) return json({ error: "สร้างบัญชีไม่สำเร็จ" }, 400);

      await admin.from("staff_profiles").upsert({
        id: userId, email, display_name: name || email.split("@")[0], status: "active",
      });
      await admin.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
      return json({ ok: true, user_id: userId });
    }

    if (action === "set_role") {
      const userId = body.user_id;
      const role = body.role;
      if (!userId || !ROLES.includes(role)) return json({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
      if (userId === caller.id && role !== "admin") {
        return json({ error: "ไม่สามารถลดสิทธิ์ตนเองได้" }, 400);
      }
      await admin.from("user_roles").delete().eq("user_id", userId);
      const { error } = await admin.from("user_roles").insert({ user_id: userId, role });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "set_status") {
      const userId = body.user_id;
      const status = body.status;
      if (!userId || !["active", "suspended"].includes(status)) return json({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
      if (userId === caller.id) return json({ error: "ไม่สามารถระงับบัญชีตนเองได้" }, 400);
      const { error } = await admin.from("staff_profiles").update({
        status,
        suspended_at: status === "suspended" ? new Date().toISOString() : null,
        suspended_by: status === "suspended" ? caller.id : null,
      }).eq("id", userId);
      if (error) return json({ error: error.message }, 400);
      // ตัด session ที่ค้างอยู่ทันทีเมื่อระงับ
      if (status === "suspended") {
        try { await admin.auth.admin.signOut(userId, "global"); } catch { /* ignore */ }
      }
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const email = (body.email || "").trim().toLowerCase();
      const redirectTo = (body.redirect_to || "").startsWith("http") ? body.redirect_to : undefined;
      if (!email) return json({ error: "ต้องระบุอีเมล" }, 400);
      const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});

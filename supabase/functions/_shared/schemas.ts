// Server-side input validation (PDPA/compliance): every edge function validates its payload
// with Zod before touching data or forwarding anything to third parties.
import { z } from "https://esm.sh/zod@3.23.8";

export { z };

export const corsJson = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

/** Parse a JSON request body against a schema. Returns either data or a ready 400 Response. */
export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<{ data: z.infer<T>; error: null } | { data: null; error: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      data: null,
      error: new Response(JSON.stringify({ error: "invalid JSON body" }), { status: 400, headers: corsJson }),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    // never log the payload itself — it may contain case content
    console.error("validation failed:", Object.keys(parsed.error.flatten().fieldErrors).join(","));
    return {
      data: null,
      error: new Response(
        JSON.stringify({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง", fields: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: corsJson },
      ),
    };
  }
  return { data: parsed.data, error: null };
}

export const caseCode = z.string().trim().regex(/^[A-Z0-9-]{6,32}$/, "รหัสเคสไม่ถูกต้อง");
export const shortText = (max = 200) => z.string().max(max).optional().nullable();

export const analyzeCaseSchema = z.object({
  reporter: z.object({ name: z.string().max(200).optional() }).passthrough().optional().nullable(),
  victim: z.object({ name: z.string().max(200).optional() }).passthrough().optional().nullable(),
  profile: z
    .object({
      kp: shortText(80), gender: shortText(40), age: z.union([z.string().max(10), z.number()]).optional().nullable(),
      nationality: shortText(80), branch: shortText(80), incidentPlace: shortText(500),
      initialViolationTypes: z.array(z.string().max(120)).max(30).optional(),
    })
    .passthrough()
    .optional()
    .nullable(),
  answers: z
    .array(z.object({
      question: z.string().max(500).default(""),
      cat: z.string().max(80).default(""),
      transcript: z.string().max(20000).default(""),
    }))
    .max(50)
    .default([]),
  staffObs: z.array(z.string().max(5000)).max(50).default([]),
  hasViolation: z.boolean().nullable().optional(),
  violationDetails: z.array(z.string().max(300)).max(50).default([]),
  severity: z.enum(["green", "yellow", "red"]).nullable().optional(),
  extraFacts: z.string().max(10000).default(""),
});

export const notifyCaseSchema = z.union([
  z.object({
    case_code: caseCode,
    branch: z.string().max(60).nullable().optional(),
    level: z.string().max(20).nullable().optional(),
    kind: z.enum(["high_risk", "suicide_risk", "sla_warning"]).nullable().optional(),
    hours_remaining: z.number().int().min(0).max(24).nullable().optional(),
  }),
  z.object({ action: z.literal("sla_sweep") }),
]);

const uuid = z.string().uuid();
const role = z.enum(["admin", "manager", "caseworker", "viewer"]);

export const adminUsersSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list") }),
  z.object({
    action: z.literal("invite"),
    email: z.string().trim().toLowerCase().email("อีเมลไม่ถูกต้อง").max(255),
    role,
    display_name: z.string().max(120).optional().default(""),
    redirect_to: z.string().url().max(500).optional(),
  }),
  z.object({ action: z.literal("set_role"), user_id: uuid, role }),
  z.object({ action: z.literal("set_status"), user_id: uuid, status: z.enum(["active", "suspended"]) }),
  z.object({
    action: z.literal("reset_password"),
    email: z.string().trim().toLowerCase().email().max(255),
    redirect_to: z.string().url().max(500).optional(),
  }),
]);

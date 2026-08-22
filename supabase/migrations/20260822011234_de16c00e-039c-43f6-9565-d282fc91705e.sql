-- Public read-only directory of ACTIVE referral partners (safe, non-internal columns only).
-- Runs as view owner (bypasses RLS on referral_partners) so anonymous reporters can see
-- where their case will be connected. notes/email/address stay staff-only.
CREATE OR REPLACE VIEW public.referral_directory AS
SELECT id, name, org_type, province, district, phone, services
FROM public.referral_partners
WHERE active;

GRANT SELECT ON public.referral_directory TO anon, authenticated;

-- Seed national hotlines as always-available referral destinations (idempotent)
INSERT INTO public.referral_partners (name, org_type, province, phone, services, notes)
SELECT v.name, v.org_type, NULL, v.phone, v.services::jsonb, v.notes
FROM (VALUES
  ('สายด่วนคุ้มครองสตรีและครอบครัว 1300', 'hotline', '1300', '["คำปรึกษา","ความรุนแรงในครอบครัว","ส่งต่อ พมช."]', 'ศูนย์ช่วยเหลือสตรีและครอบครัว กรมกิจการสตรีและสถาบันครอบครัว'),
  ('สายด่วนสุขภาพจิต 1323', 'hotline', '1323', '["ปรึกษาสุขภาพจิต","วิกฤตการทำร้ายตนเอง"]', 'กรมสุขภาพจิต ให้บริการตลอด 24 ชม.'),
  ('สายด่วนคุ้มครองแรงงาน 1506', 'hotline', '1506', '["สิทธิแรงงาน","ค่าจ้างค้างจ่าย","ค้ามนุษย์ด้านแรงงาน"]', 'กรมสวัสดิการและคุ้มครองแรงงาน'),
  ('เหตุฉุกเฉินเหตุอาชญากรรม 191', 'police', '191', '["เหตุฉุกเฉิน","อันตรายต่อชีวิต"]', 'ตำรวจ — ใช้เมื่ออยู่ในอันตรายทันที')
) AS v(name, org_type, phone, services, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.referral_partners p WHERE p.phone = v.phone AND p.org_type = v.org_type
);
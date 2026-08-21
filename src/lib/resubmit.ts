/**
 * Re-send a case that only exists on this device (draft snapshot or failed submission).
 */
import { supabase } from '@/integrations/supabase/client';
import { summarizeScreening } from '@/components/screening/ScreeningTools';
import { getLocalCase, getLocalCaseBlobs, deleteLocalCase } from '@/lib/localCases';
import { uploadCaseMedia } from '@/lib/uploadMedia';

export function buildPayloadFromState(state: any) {
  const screeningResult = summarizeScreening(state?.screening);
  return {
    consent: 'true',
    severity: state?.severity ?? null,
    has_violation: state?.hasViolation ?? null,
    violation_types: state?.profile?.initialViolationTypes ?? [],
    violation_details: state?.violationDetails ?? [],
    special_tests: state?.specialTests ?? [],
    screening: screeningResult,
    suicide_risk: screeningResult.suicidalItem > 0,
    reporter: state?.reporter ?? {},
    victim: state?.victim ?? {},
    profile: state?.profile ?? {},
    answers: state?.answers ?? [],
    staff_observations: state?.staffObs ?? [],
    extra_facts: state?.extraFacts ?? '',
    ai_result: state?.aiResult ?? null,
    referrals: state?.referrals ?? [],
    referral_note: state?.referralNote ?? '',
    signature_staff: state?.signatureStaff ?? null,
    signature_staff_name: state?.signatureStaffName ?? '',
    signature_client: state?.signatureClient ?? null,
    audio_urls: [],
    photo_urls: [],
  } as any;
}

/** Uploads local media then calls submit_case. Returns the new case code. */
export async function resubmitLocalCase(id: string): Promise<string> {
  const rec = getLocalCase(id);
  if (!rec) throw new Error('ไม่พบข้อมูลเคสในเครื่อง');

  const payload = rec.payload ? { ...rec.payload } : buildPayloadFromState(rec.state);
  payload.consent = 'true';

  const { audio, photos } = await getLocalCaseBlobs(id);
  const folder = id;

  if (!payload.audio_urls?.length && audio.length) {
    const paths: { qIndex: number; path: string; question: string }[] = [];
    for (let i = 0; i < audio.length; i++) {
      const blob = audio[i];
      if (!blob) continue;
      const ext = (blob.type.split('/')[1] || 'webm').split(';')[0];
      const path = `cases/${folder}/q${i + 1}-${Date.now()}.${ext}`;
      const up = await uploadCaseMedia('audio', path, blob);
      if (!up) { console.warn('audio upload failed'); continue; }
      paths.push({ qIndex: i, path: up.path, question: payload.answers?.[i]?.question || '' });
    }
    payload.audio_urls = paths;
  }

  if (!payload.photo_urls?.length && photos.length) {
    const paths: { path: string; name: string }[] = [];
    for (let i = 0; i < photos.length; i++) {
      const ph = photos[i];
      if (!ph?.blob) continue;
      const ext = (ph.blob.type.split('/')[1] || 'jpg').split(';')[0];
      const path = `cases/${folder}/photo-${i + 1}-${Date.now()}.${ext}`;
      const up = await uploadCaseMedia('photo', path, ph.blob);
      if (!up) { console.warn('photo upload failed'); continue; }
      paths.push({ path: up.path, name: ph.name });
    }
    payload.photo_urls = paths;
  }

  const { data: code, error } = await supabase.rpc('submit_case' as any, { _payload: payload });
  if (error) throw error;
  if (!code) throw new Error('บันทึกเคสไม่สำเร็จ');

  await deleteLocalCase(id);
  return code as string;
}

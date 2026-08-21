/**
 * Upload intake media (audio/photos) through the validated upload-case-media
 * edge function. Direct storage uploads are staff-only; the public intake
 * form is anonymous, so files are proxied + validated server-side.
 */
import { supabase } from '@/integrations/supabase/client';

export async function uploadCaseMedia(
  kind: 'audio' | 'photo',
  path: string,
  blob: Blob,
): Promise<{ path: string } | null> {
  try {
    const fd = new FormData();
    fd.append('kind', kind);
    fd.append('path', path);
    fd.append('file', new File([blob], path.split('/').pop() || 'file', { type: blob.type }));
    const { data, error } = await supabase.functions.invoke('upload-case-media', { body: fd });
    if (error || !data?.path) {
      console.warn('media upload failed:', error || data);
      return null;
    }
    return { path: data.path as string };
  } catch (e) {
    console.warn('media upload failed:', e);
    return null;
  }
}

# Save everything to the backend during the conversation

## Goal
Stop losing reports. Every answer, voice clip and photo is saved to the backend while the person is still talking, not only when they press Send. Stored files are small and can be opened from each case.

## What changes for users
- **Reporter (/report, /intake):** each answer is saved automatically a few seconds after it is typed or recorded. If the phone dies or the page closes, the report can be resumed on the same device, and staff can already see it as a "draft".
- **Voice clips:** saved in a small voice format (Opus, about 24 kbps, around 180 KB per minute, much smaller than MP3). If a device can't record Opus (older iPhones), it records AAC/M4A instead. Both play in every modern browser.
- **Photos:** always converted to JPEG (longest side 1600 px, quality 0.8, location and camera data removed) before upload. This usually makes them 150 to 400 KB.
- **Staff case page:** a "Files" section lists every voice clip (with a player and transcript) and every photo (thumbnail, opens full size), and includes files from drafts.
- Quick Exit still wipes everything on the device. It does not delete what has already been sent.

## Steps
1. **Database migration** (protected by access rules)
   - New `case_drafts` table: draft id, secret resume token (stored hashed), answers (no names or ID numbers, per project rule), a list of media paths, language, last saved time, and a link to the case once it is submitted.
   - Anonymous access goes only through two functions, `save_case_draft` and `get_case_draft`, which need the token and are rate-limited. Direct access is blocked. Active staff can read drafts but never PII.
   - `submit_case` accepts an optional draft id. It moves the draft's media paths onto the case and marks the draft submitted.
   - Unsubmitted drafts are removed automatically after 30 days.
2. **Upload each file as soon as it is created.** Recorder and photo picker upload right away through the existing checked upload function to `cases/<draftId>/...`. If there's no signal, files wait on the device (current storage) and retry automatically when the connection returns.
3. **Smaller files.** The recorder picks `audio/webm;codecs=opus` at 24 kbps, falling back to `audio/mp4`. All photo inputs go through the JPEG converter. The upload function also accepts `audio/opus` and rejects anything over the size limit.
4. **Autosave.** Save text changes to the backend after a 3-second pause. A small status label shows "Saved" or "Saving..." (in 5 languages).
5. **Case files view** on the admin case page uses short-lived private links. Every view is logged to the access log.

## Not changed
Login, roles, alerts, reports and the page structure stay the same. Existing cases and files stay as they are. Old files are not converted.

## Technical notes
- Files: `src/lib/uploadMedia.ts`, `src/lib/exif.ts`, `src/components/VoiceRecorder.tsx`, `src/store/intake.ts`, a new `src/lib/draftSync.ts`, `Intake.tsx` and `SelfReport.tsx` (to connect autosave), the admin case detail files panel, `supabase/functions/upload-case-media`, and i18n keys.
- Draft id is a UUID kept in localStorage. The token is 32 random bytes and only its hash is stored.

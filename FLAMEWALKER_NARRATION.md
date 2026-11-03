# Flamewalker+ narration production workflow

## Current state

The premium lesson reader supports a reusable recorded audio file **per section**, with native browser audio playback and speed adjustment. The old browser text-to-speech voice is clearly labelled **Basic device read-aloud** as an optional accessibility fallback.

**Two Father Wound recordings have been uploaded to private storage:** `father-wound/section-1.mp3` and `father-wound/section-2.mp3`. These are editorial test recordings, not a complete narrated lesson. All three founding lessons remain in editorial review. Do not advertise professional narration as already generally available.

## Voice direction

Warm, steady, grounded American male narrator. Conversational rather than theatrical, with natural pauses and clear articulation. No movie-trailer shouting, spiritual superiority, or artificial emotional manipulation.

Voice-direction sample for *The Father Wound* opening:

https://www.aidocmaker.com/g0/audio?name=5a1106cbc8244526a23ff3a85e4c440c

Full Opening section voiceover (download and upload the complete MP3):

https://www.aidocmaker.com/g0/audio?name=bb6e694156f5427ab1cc9bd77d792d78

The linked AI Doc Maker copy also lives on the provider; the first two approved test MP3s are already stored privately in NBJB's audio bucket. AI Doc Maker's pricing says Starter/free voiceovers require attribution for commercial use and Standard/paid provides a commercial license without attribution. The site includes an attribution field when a recording plays; verify account terms and keep attribution until a different license is confirmed. Save an approved downloadable MP3 outside the provider; generated files may not be retained indefinitely.

## Preparing and publishing recordings

1. Review the lesson's authored text and chapter boundaries. The reading interface derives its chapter order using the `sectionize` function in `js/member-premium-lesson.js`.
2. Generate **one finalized audio recording per chapter**. Keep narration human, clear and faithful to the educational text. Use the approved deep voice as a reference.
3. Download the completed MP3 from the full audio link above. Rename it exactly `section-1.mp3`.
4. In Supabase Storage for project `plhbvtbvtxfzulsaxuim`, open **private** bucket `nbjb-premium-audio`, create a folder named `father-wound`, and upload the file as `father-wound/section-1.mp3`. Bucket is private (no public URL) and allows MPEG audio. Do not upload to a public GitHub repository.
5. The existing authenticated Edge Function `read-flamewalker-lesson` now supports a POST action `{ "action": "audio", "slug": "father-wound", "section": 1 }`. After validating the paid entitlement and lesson publication status (with editorial reviewer exception), it signs `father-wound/section-1.mp3` for 10 minutes and returns an ephemeral URL. Missing chapters return `{ "available": false }`.
6. The chapter player requests that signed URL on entry to each section and reads through HTML5 audio controls; the old device voice remains an opt-in fallback. Reopening a section refreshes the link.
7. Test using the nominated editorial test account first. The lessons remain unpublished; do not enable public sales until the course material and recording are approved.

## Licensing

Official references:
- https://www.aidocmaker.com/pricing
- https://www.aidocmaker.com/terms-of-service
- https://www.aidocmaker.com/docs/subscription-faq

Commercial voiceovers are advertised by AI Doc Maker. Attribution is required on the free tier; the paid Standard plan advertises commercial voiceovers without attribution. Confirm which subscription generated this file before finalizing the customer-facing credit. The website shows an attribution when a recording plays.

## Bulk recording installation (editorial-only)

An internal batch uploader is now available at:

**https://notbrokenjustburning.com/qa-premium-audio-batch.html**

- Sign in with the existing designated editorial reviewer account; ordinary accounts cannot authorize uploads.
- Choose **The Father Wound**, **The Mother Wound**, or **The Boy Who Learned to Stay Quiet**.
- Download as many completed AI Doc Maker MP3s as desired into a local folder. The provider currently exposes individual output links; this feature does **not** automate bulk voice generation or provider downloads.
- Select all the downloaded files together in the uploader. Filenames don't have to be renamed.
- Use **Assign consecutive pages** starting at the appropriate reading page, then listen to the local audio samples and review each expected heading and opening text. Correct wrong mappings in the dropdowns.
- Confirm the assignments, then choose **Upload verified batch**. The website requests short-lived, page-specific upload tokens from Supabase. The browser uploads up to three files at a time directly to the private `nbjb-premium-audio` bucket.
- Existing recordings cannot be silently replaced. For a known incorrect recording, review and remove that one file using the Supabase Dashboard, then upload the replacement using the batch uploader.
- Refresh the on-page inventory to verify results, then test the chapter player. All original draft lessons remain unpublished.

The upload authorization endpoint is `supabase/functions/premium-audio-admin/index.ts`. Its server-side user-ID check compares the verified authenticated UID with the `NBJB_SANDBOX_TEST_USER_ID` secret. It returns the signed upload tokens only to that one approved editor, and never hands out the service role key. The page automatically derives its chapter numbering from the same original lesson blocks and section boundaries as the reader.

## Cost discipline

Generate each finalized chapter once and reuse it for authorized plays. Hosting and bandwidth still cost money; monitor those costs. Do not generate personalized narration per button click without explicit user consent and a budget.

## Access and privacy

- The current lesson reader never exposes premium lesson bodies in static HTML.
- Do not embed audio in a publicly accessible GitHub Pages asset.
- Do not put transcription or private reflections inside audio manifests.
- The device speech fallback uses the reader's local browser voice and does not need third-party voice generation.
- Narration quality and rights require review before a paid launch.

## Optional fully automatic generation (draft integration, no provider spending by default)

The same private editorial studio now has a **Generate narration directly from your lesson** panel. It is designed to eliminate manually creating, downloading, renaming and uploading individual audio pages. Its backend source and UI must be reviewed, tested and deployed before this capability should be described as live.

- The server uses the original `flamewalker_premium_lessons.content.blocks` to derive the exact reading-page boundaries that the site reader uses. It does **not** accept lesson text from the browser.
- Page `N` becomes a new private `<slug>/section-N.mp3` after server-side access checks. Existing files are skipped and cannot be overwritten. The uploaded Father Wound pages 1 and 2 are not regenerated.
- Calls to ElevenLabs are **disabled** until two server-side Supabase Edge Function secrets are configured: `ELEVENLABS_API_KEY` and `NBJB_ELEVENLABS_VOICE_ID`. Neither may appear in the website, source code or browser. The user must separately authorize any provider plan or API billing. This integration does **not** invoke AI Doc Maker and will not automatically match its voice.
- Once configured, sign in as the exact editorial reviewer and choose the lesson. Start with a one-page test (default page 3). Listen to it in the premium reader and approve the narrator before extending the range to the entire lesson.
- A visible estimate uses the published **ElevenLabs Multilingual v2 $0.10/1,000 characters** reference rate, not a binding quote. Your subscription, included credits and any taxes can change the effective cost. The operator explicitly acknowledges provider charges for each selected range. No paid generation runs without that action.
- A selected range runs **sequentially**, keeps the browser tab open, never auto-retries a paid request, allows a stop after the current page, and reports a partial result. If an error occurs, verify storage before restarting because provider charges can be incurred before a Storage error.
- The selected voice must be one the NBJB operator is licensed to use commercially. Free-tier AI Doc Maker files may retain attribution obligations; ElevenLabs rights are governed by that separate subscription. No conversion of free-tier audio licensing is implied.
- Deploy the updated `premium-audio-admin` Edge Function **after** code review; a GitHub Pages deployment alone does not update Supabase server code.

### Validation before publishing

1. Check the editorial-only gate with a non-editor account, which must receive `editorial_access_required`.
2. Check the no-key setup: automatic generation must stay disabled and produce no provider charges.
3. Set up a licensed voice and API account only with explicit operator approval, generate **one** new page, listen for fidelity and compare its spoken text to page 3.
4. Refresh the private storage inventory; confirm pages 1 and 2 are unchanged and page 3 appears exactly once. Confirm paid/anonymous users cannot generate.
5. Deliberately request a duplicate page; ensure it is rejected without another paid synthesis request. Test stop, expired session, upload/provider errors, and a full range only after the first recording is accepted.

## Integration test status — 2026-11-03 UTC

- Page 3 of The Father Wound was submitted to the connected AI Doc Maker voice generator in the approved deep voice. The tool returned a **queued provider page**: `https://www.aidocmaker.com/g0/audio?name=d6ae36d088c94c8fa83c894690efd4d3`.
- The private Supabase ingestion worker was created and tested with a one-time database queue token. External GET of that URL returns **HTTP 200 text/html (AI Voice Generator page), not MP3 bytes**. The job is recorded as failed/blocked, and **the five-minute pg_cron retry job has been unscheduled** to prevent unnecessary requests.
- Existing `father-wound/section-1.mp3` and `section-2.mp3` remain unchanged. No third MP3 is in private Storage. The unpublished premium lesson remains unchanged.
- HeyGen's connected speech-only tool was inspected as a potential direct-audio source. Its public speech catalog suggested Starfish, but the free workspace's actual generation call returned HTTP 400: **'This workspace requires Orca for public voices. Select Orca or choose another voice.'** No HeyGen voice clip was produced, and no alternate engine request was retried.
- PR #104 remains a draft, not an approved one-click pipeline. The proposed ElevenLabs integration requires a separate approved voice and private provider key. Do not describe automated narration or automatic provider import as complete.
- **Next approval gate:** get authorization for one HeyGen Orca engine generation of Father Wound page 3, using a catalog voice, or connect an appropriate licensed TTS API. Verify that the resulting file URL directly serves audio bytes to Supabase before producing a large batch. Do not re-enable the paused retry job for the AI Doc Maker HTML landing page.

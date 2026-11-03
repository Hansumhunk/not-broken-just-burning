# Flamewalker+ narration production workflow

## Current state

The premium lesson reader supports a reusable recorded audio file **per section**, with native browser audio playback and speed adjustment. The old browser text-to-speech voice is clearly labelled **Basic device read-aloud** as an optional accessibility fallback.

**The full Opening section of The Father Wound has been generated, but not uploaded to private storage yet.** The three founding lessons remain in editorial review. Do not advertise professional narration as already available.

## Voice direction

Warm, steady, grounded American male narrator. Conversational rather than theatrical, with natural pauses and clear articulation. No movie-trailer shouting, spiritual superiority, or artificial emotional manipulation.

Voice-direction sample for *The Father Wound* opening:

https://www.aidocmaker.com/g0/audio?name=5a1106cbc8244526a23ff3a85e4c440c

Full Opening section voiceover (download and upload the complete MP3):

https://www.aidocmaker.com/g0/audio?name=bb6e694156f5427ab1cc9bd77d792d78

The recording currently lives on the provider, not in NBJB's private audio bucket. AI Doc Maker's pricing says Starter/free voiceovers require attribution for commercial use and Standard/paid provides a commercial license without attribution. The site includes an attribution field when a recording plays; verify account terms and keep attribution until a different license is confirmed. Save an approved downloadable MP3 outside the provider; generated files may not be retained indefinitely.

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

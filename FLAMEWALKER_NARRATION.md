# Flamewalker+ narration production workflow

## Current state

The premium lesson reader supports a reusable recorded audio file **per section**, with native browser audio playback and speed adjustment. The old browser text-to-speech voice is clearly labelled **Basic device read-aloud** as an optional accessibility fallback.

**No full-length premium audio has been attached yet.** The three founding lessons remain in editorial review. Do not advertise professional narration as already available.

## Voice direction

Warm, steady, grounded American male narrator. Conversational rather than theatrical, with natural pauses and clear articulation. No movie-trailer shouting, spiritual superiority, or artificial emotional manipulation.

First voice-direction sample for *The Father Wound* opening:

https://www.aidocmaker.com/g0/audio?name=5a1106cbc8244526a23ff3a85e4c440c

The sample is hosted by the voice-generation provider and is **not yet a production-ready media asset**. Check commercial distribution rights before publishing and obtain a reusable audio file from the provider.

## Preparing and publishing recordings

1. Review the lesson's authored text and chapter boundaries. The reading interface derives its chapter order using the `sectionize` function in `js/member-premium-lesson.js`.
2. Generate **one finalized audio recording per chapter**; choose a consistent voice and pace and check pronunciations, emotional tone, and reading quality.
3. Store the final assets in **private storage**, not in the public GitHub repository or the statically published HTML. Prefer private Supabase Storage with signed URLs. Avoid permanent publicly readable MP3 URLs for premium content.
4. Extend the authenticated lesson-read endpoint to return short-lived **signed audio URLs** for authorized lesson readers. The browser expects the optional `lesson.content.audio_tracks` map, keyed by **1-based section index**, with the format `{ "1": { "url": "https://...signed..." } }`. The client allows same-origin URLs or signed Supabase Storage URLs only.
5. Recheck membership and URL expiry when generating each authorized response. Confirm free accounts cannot obtain paid narration URLs, and recordings cannot be fetched without an authorized link.
6. After founder approval, attach the approved recordings, test mobile playback, seeking, pause/resume, speed and connection interruptions. Publish only when ready.

## Cost discipline

Generate each finalized chapter once and reuse it for authorized plays. Hosting and bandwidth still cost money; monitor those costs. Do not generate personalized narration per button click without explicit user consent and a budget.

## Access and privacy

- The current lesson reader never exposes premium lesson bodies in static HTML.
- Do not embed audio in a publicly accessible GitHub Pages asset.
- Do not put transcription or private reflections inside audio manifests.
- The device speech fallback uses the reader's local browser voice and does not need third-party voice generation.
- Narration quality and rights require review before a paid launch.

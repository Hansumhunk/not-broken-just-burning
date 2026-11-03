-- Private chapter recordings. No public upload/download policies are added:
-- the authenticated lesson Edge Function issues short-lived signed URLs only
-- after it independently confirms the user's entitlement.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('nbjb-premium-audio', 'nbjb-premium-audio', false, 26214400, ARRAY['audio/mpeg','audio/mp3']::text[])
ON CONFLICT (id) DO NOTHING;

-- Add amenities that came up when transcribing the cottage's real Airbnb
-- listing content: hammock and fire pit (OUTDOOR), self check-in / keyless
-- entry (SAFETY), and pets allowed (BASIC) had no existing row to check.
INSERT INTO "Amenity" (id, name, slug, category, icon, "isActive") VALUES
  (gen_random_uuid(), 'Hammock', 'hammock', 'OUTDOOR', 'hammock', true),
  (gen_random_uuid(), 'Fire Pit', 'fire-pit', 'OUTDOOR', 'fire-pit', true),
  (gen_random_uuid(), 'Self Check-in / Keyless Entry', 'self-check-in', 'SAFETY', 'keyless-entry', true),
  (gen_random_uuid(), 'Pets Allowed', 'pets-allowed', 'BASIC', 'pets-allowed', true)
ON CONFLICT (slug) DO NOTHING;

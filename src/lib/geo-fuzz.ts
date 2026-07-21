/**
 * Deterministically offsets a lat/lng pair by ~0.15-0.35 miles in a
 * pseudo-random (but stable) direction, seeded by a string (e.g. a listing
 * id) so the same input always fuzzes to the same displayed point rather
 * than jumping around on every render.
 *
 * For public, pre-booking map *markers* only — real Airbnb doesn't pin the
 * exact house until a reservation is confirmed, and our own data already
 * reflects that intent (Address.line1 defaults to "Exact address provided
 * after booking"). Never apply this to distance/direction calculations —
 * only to the visual pin — since fuzzing those would make "get directions"
 * links and drive-time estimates wrong.
 */
export function fuzzCoordinates(
  lat: number,
  lng: number,
  seed: string,
): { lat: number; lng: number } {
  const seededRandom = (salt: string) => {
    let hash = 0;
    const s = seed + salt;
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i);
      hash |= 0;
    }
    return (hash >>> 0) / 4294967295;
  };

  const angle = seededRandom("angle") * 2 * Math.PI;
  const distanceMiles = 0.15 + seededRandom("dist") * 0.2;

  const milesPerDegreeLat = 69.0;
  const milesPerDegreeLng = 69.0 * Math.cos((lat * Math.PI) / 180);

  return {
    lat: lat + (distanceMiles * Math.cos(angle)) / milesPerDegreeLat,
    lng: lng + (distanceMiles * Math.sin(angle)) / milesPerDegreeLng,
  };
}

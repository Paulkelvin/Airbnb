import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSquareClient, getSquareLocationId } from "@/lib/payments/square-client";

/**
 * TEMPORARY diagnostic route — asks Square directly which locations the
 * configured SQUARE_ACCESS_TOKEN can see, instead of guessing from env var
 * values we can't safely print. Admin-only. Delete once the
 * location_id-not-authorized investigation is resolved.
 */
export async function GET() {
  await requireAdmin();

  const configuredLocationId = getSquareLocationId();
  const configuredEnvironment = process.env.SQUARE_ENVIRONMENT ?? "(unset, defaults to sandbox)";
  const token = process.env.SQUARE_ACCESS_TOKEN ?? "";

  try {
    const client = createSquareClient();
    const response = await client.locations.list();

    const locations = (response.locations ?? []).map((loc) => ({
      id: loc.id,
      name: loc.name,
      status: loc.status,
      capabilities: loc.capabilities,
    }));

    return NextResponse.json({
      configuredEnvironment,
      configuredLocationId,
      tokenLast4: token.slice(-4),
      tokenPrefix: token.slice(0, 8),
      locationsVisibleToThisToken: locations,
      configuredLocationFoundInList: locations.some((l) => l.id === configuredLocationId),
    });
  } catch (err) {
    return NextResponse.json(
      {
        configuredEnvironment,
        configuredLocationId,
        tokenLast4: token.slice(-4),
        tokenPrefix: token.slice(0, 8),
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

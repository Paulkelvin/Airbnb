import { NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Admin-only: bulk-append photos to a listing's gallery. Mirrors the write
 * pattern of src/modules/cms/actions.ts (requireAdmin + friendly error
 * messages) but for the Prisma-backed listing Image table, which — unlike
 * Sanity content — has no admin GUI yet. */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    const message = err instanceof AuthError ? err.message : "Unable to verify your session.";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const body = await request.json();
  const { listingId, images } = body as {
    listingId: string;
    images: { url: string; altText?: string; category?: string }[];
  };

  if (!listingId || !Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: "listingId and images[] are required" }, { status: 400 });
  }

  const maxPosition = await prisma.image.aggregate({
    where: { listingId },
    _max: { position: true },
  });
  let nextPosition = (maxPosition._max.position ?? -1) + 1;

  const created = await prisma.$transaction(
    images.map((img) =>
      prisma.image.create({
        data: {
          listingId,
          url: img.url,
          altText: img.altText ?? null,
          category: img.category ?? null,
          position: nextPosition++,
        },
      }),
    ),
  );

  return NextResponse.json({ success: true, count: created.length });
}

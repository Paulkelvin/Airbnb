import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  const provided = request.nextUrl.searchParams.get("secret");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  let body: { _type?: string; slug?: { current?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const paths: string[] = [];

  if (body._type === "post") {
    paths.push("/blog");
    if (body.slug?.current) {
      paths.push(`/blog/${body.slug.current}`);
    }
    paths.push("/sitemap.xml");
  }

  if (body._type === "page") {
    if (body.slug?.current) {
      paths.push(`/${body.slug.current}`);
    }
  }

  if (body._type === "author" || body._type === "category") {
    paths.push("/blog");
  }

  for (const path of paths) {
    revalidatePath(path);
  }

  return NextResponse.json({ revalidated: true, paths });
}

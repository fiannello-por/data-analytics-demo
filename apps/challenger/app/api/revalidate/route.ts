import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tags: string[] = body?.tags;

    if (!Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { error: 'Request body must include a non-empty "tags" array' },
        { status: 400 },
      );
    }

    for (const tag of tags) {
      revalidateTag(tag);
    }

    return NextResponse.json({ revalidated: tags });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

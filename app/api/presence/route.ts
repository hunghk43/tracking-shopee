import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory presence store.
 * Đủ dùng cho nhóm nhỏ — reset khi server cold-start (Vercel serverless).
 * Key: user_id  Value: { email, last_seen: ISO string, page }
 */
export const presenceStore = new Map<string, {
  user_id: string;
  email: string;
  last_seen: string;
  page: string;
}>();

// POST /api/presence  body: { user_id, email, page? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.user_id || !body?.email) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { user_id, email, page = "/" } = body;

    if (typeof user_id !== "string" || user_id.length > 64) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    presenceStore.set(user_id, {
      user_id,
      email: String(email).slice(0, 100),
      last_seen: new Date().toISOString(),
      page: String(page).slice(0, 50),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// GET /api/presence?secret=xxx  — admin only
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || secret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const entries = Array.from(presenceStore.values()).map((p) => ({
    ...p,
    seconds_ago: Math.floor((now - new Date(p.last_seen).getTime()) / 1000),
  }));

  // Sắp xếp: mới nhất lên đầu
  entries.sort((a, b) => a.seconds_ago - b.seconds_ago);

  return NextResponse.json({ presence: entries });
}

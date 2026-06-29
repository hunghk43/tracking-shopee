import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import {
  dbListUser,
  dbGetStats,
  dbCountActive,
  dbAddTracking,
  dbUpdateStatus,
  dbMarkChecked,
} from "@/lib/db";
import { doTrack } from "@/lib/tracker";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

const MAX_TRACKINGS = 100;

// GET /api/trackings?user_id=xxx
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId || userId.length > 64)
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

  // Rate limit: 60 requests/phút per user
  const rl = checkRateLimit(`get:${userId}`, 60, 60_000);
  if (!rl.allowed)
    return NextResponse.json({ error: "Quá nhiều request, thử lại sau" }, { status: 429 });

  const sb = createServerSupabase();
  const trackings = await dbListUser(sb, userId);
  const stats = dbGetStats(trackings);

  return NextResponse.json({ trackings, stats });
}

// POST /api/trackings  body: { user_id, carrier, tracking_code, nickname? }
export async function POST(req: NextRequest) {
  // Rate limit: 10 lần thêm đơn/phút per IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(`add:${ip}`, 10, 60_000);
  if (!rl.allowed)
    return NextResponse.json({ error: "Quá nhiều request, thử lại sau 1 phút" }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { user_id, carrier, tracking_code, nickname } = body;
  if (!user_id || !carrier || !tracking_code) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (typeof user_id !== "string" || user_id.length > 64) {
    return NextResponse.json({ error: "Invalid user_id" }, { status: 400 });
  }

  // Validate carrier
  if (!["ghn", "spx"].includes(carrier)) {
    return NextResponse.json({ error: "Carrier không hợp lệ" }, { status: 400 });
  }

  const code = tracking_code.trim().toUpperCase();
  if (code.length < 5 || code.length > 40) {
    return NextResponse.json({ error: "Mã vận đơn không hợp lệ (5-40 ký tự)" }, { status: 400 });
  }

  const sb = createServerSupabase();

  // Kiểm tra giới hạn
  const count = await dbCountActive(sb, user_id);
  if (count >= MAX_TRACKINGS) {
    return NextResponse.json(
      { error: `Đã đạt giới hạn ${MAX_TRACKINGS} đơn. Hãy xóa bớt!` },
      { status: 429 }
    );
  }

  const result = await dbAddTracking(sb, user_id, carrier, code, nickname || null);

  if (result === "exists") {
    return NextResponse.json({ message: "exists", existed: true });
  }
  if (!result) {
    return NextResponse.json({ error: "Lỗi thêm đơn" }, { status: 500 });
  }

  const { realId, displayId } = result;

  // Tra cứu lần đầu
  const trackResult = await doTrack(carrier, code);
  if (trackResult.ok) {
    await dbUpdateStatus(
      sb,
      realId,
      trackResult.status!,
      trackResult.status_time || null,
      trackResult.is_delivered!
    );
  } else {
    await dbMarkChecked(sb, realId);
  }

  const trackings = await dbListUser(sb, user_id);
  const stats = dbGetStats(trackings);

  return NextResponse.json({
    message: "added",
    display_id: displayId,
    track_result: trackResult,
    trackings,
    stats,
  });
}

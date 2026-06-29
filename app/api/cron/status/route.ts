import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// GET /api/cron/status?user_id=xxx
// Trả về thông tin lần quét cuối + số đơn đang active
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

  const sb = createServerSupabase();

  // Lấy last_checked_at gần nhất của user
  const { data: lastChecked } = await sb
    .from("trackings")
    .select("last_checked_at")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .not("last_checked_at", "is", null)
    .order("last_checked_at", { ascending: false })
    .limit(1)
    .single();

  // Đếm đơn đang active cần theo dõi
  const { count: activeCount } = await sb
    .from("trackings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_archived", false)
    .eq("is_delivered", false);

  // Đếm đơn đã thay đổi trong 24h qua
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: updatedToday } = await sb
    .from("trackings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_archived", false)
    .gte("last_checked_at", since24h);

  return NextResponse.json({
    last_checked_at: lastChecked?.last_checked_at || null,
    active_count: activeCount || 0,
    updated_today: updatedToday || 0,
    interval_minutes: 5,
  });
}

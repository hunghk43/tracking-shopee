import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { dbGetStats } from "@/lib/db";
import type { Tracking } from "@/types";
import { presenceStore } from "@/app/api/presence/route";

// GET /api/admin/users?secret=xxx
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || secret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createServerSupabase();

  // Lấy tất cả users
  const { data: usersData, error: usersError } = await sb.auth.admin.listUsers();
  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  // Lấy tất cả trackings
  const { data: allTrackings, error: trackingsError } = await sb
    .from("trackings")
    .select("*")
    .order("created_at", { ascending: false });

  if (trackingsError) {
    return NextResponse.json({ error: trackingsError.message }, { status: 500 });
  }

  // Group trackings theo user_id
  const trackingsByUser = new Map<string, Tracking[]>();
  for (const t of (allTrackings as Tracking[]) || []) {
    if (!trackingsByUser.has(t.user_id)) trackingsByUser.set(t.user_id, []);
    trackingsByUser.get(t.user_id)!.push(t);
  }

  const now = Date.now();

  // Build user summary + merge presence
  const result = usersData.users.map((u) => {
    const userTrackings = trackingsByUser.get(u.id) || [];
    const active = userTrackings.filter((t) => !t.is_archived);
    const stats = dbGetStats(active);

    const lastActive = userTrackings
      .map((t) => t.last_checked_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

    // Presence
    const presence = presenceStore.get(u.id) ?? null;
    const secondsAgo = presence
      ? Math.floor((now - new Date(presence.last_seen).getTime()) / 1000)
      : null;

    // Online = ping trong vòng 90 giây (30s interval + buffer)
    const isOnline = secondsAgo !== null && secondsAgo <= 90;

    return {
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      trackings_active: active.length,
      trackings_total: userTrackings.length,
      stats,
      last_tracking_active: lastActive,
      trackings: userTrackings,
      // Presence fields
      is_online: isOnline,
      last_seen: presence?.last_seen ?? null,
      seconds_ago: secondsAgo,
    };
  });

  // Sắp xếp: online lên đầu → nhiều đơn nhất
  result.sort((a, b) => {
    if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
    return b.trackings_total - a.trackings_total;
  });

  const onlineCount = result.filter((u) => u.is_online).length;

  return NextResponse.json({
    users: result,
    total_users: usersData.users.length,
    online_count: onlineCount,
  });
}
